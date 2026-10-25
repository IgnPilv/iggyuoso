import { pitchToMidi, type Pitch } from './notes';

// Chord symbols over the sheet music (C, Am, G7, F♯dim...), named from the notes that sound
// together, like a lead sheet. Inversions are named by their root (C E G, E G C and G C E are all C).

/**
 * Pitch-class shapes above the root, and how each is written after the root's name. `plain`
 * shapes are only read from one hand's chord: across the hands a melody note usually makes them
 * by passing (C E G with an A on top is a C under a melody, not a C6).
 */
const SHAPES: { steps: number[]; suffix: string; plain?: boolean }[] = [
  { steps: [0, 4, 7], suffix: '' },
  { steps: [0, 3, 7], suffix: 'm' },
  { steps: [0, 4, 7, 10], suffix: '7' },
  { steps: [0, 4, 10], suffix: '7' }, // a seventh chord without its fifth
  { steps: [0, 3, 7, 10], suffix: 'm7' },
  { steps: [0, 4, 7, 11], suffix: 'maj7' },
  { steps: [0, 3, 6], suffix: 'dim' },
  { steps: [0, 3, 6, 9], suffix: 'dim7' },
  { steps: [0, 3, 6, 10], suffix: 'm7♭5' },
  { steps: [0, 4, 8], suffix: 'aug', plain: true },
  { steps: [0, 5, 7], suffix: 'sus4', plain: true },
  { steps: [0, 2, 7], suffix: 'sus2', plain: true },
  { steps: [0, 4, 7, 9], suffix: '6', plain: true },
];

const pc = (m: number) => ((m % 12) + 12) % 12;
const spell = (p: Pitch) => `${p.letter}${p.accidental === 1 ? '♯' : p.accidental === -1 ? '♭' : ''}`;

/**
 * The chord these notes make, or undefined when they are not one (fewer than three different
 * notes, or a shape that is not a chord above). Where a shape could have two roots (C6 or Am7,
 * Csus2 or Gsus4), the lowest note's reading wins. The root keeps the spelling it is written with.
 */
export function chordName(pitches: Pitch[]): string | undefined {
  return readChord(pitches)?.name;
}

/** The chord's name and every note of it (as pitch classes), present or not. */
function readChord(pitches: Pitch[], mixed = false): { name: string; pcs: Set<number> } | undefined {
  const pcs = [...new Set(pitches.map((p) => pc(pitchToMidi(p))))];
  if (pcs.length < 3) return undefined;
  const bass = [...pitches].sort((a, b) => pitchToMidi(a) - pitchToMidi(b))[0];
  const roots = [pc(pitchToMidi(bass)), ...pcs.filter((r) => r !== pc(pitchToMidi(bass)))];
  for (const root of roots) {
    const above = pcs.map((p) => pc(p - root)).sort((a, b) => a - b).join();
    const shape = SHAPES.find((s) => s.steps.join() === above && !(mixed && s.plain));
    if (shape) {
      const name = spell(pitches.find((p) => pc(pitchToMidi(p)) === root)!) + shape.suffix;
      return { name, pcs: new Set(SHAPES.filter((x) => x.suffix === shape.suffix).flatMap((x) => x.steps).map((st) => pc(root + st))) };
    }
  }
  return undefined;
}

export interface SymbolNote {
  pitches: Pitch[];
  /** Quarter beats. */
  beats?: number;
  /** Tied to the next note, which is then held, not played again. */
  tie?: boolean;
}

/**
 * Where a new chord starts in a piece written as one or two lines (beats from the start, as the
 * staff counts them) and its name. A chord is read from the notes struck at a beat with those still
 * held from before (so a held bass under a later chord counts), and with a lone bass note struck just
 * before (up to two beats) under a chord or nothing in the lowest line (bass then chord, as in a waltz);
 * failing that from the notes struck alone, then from each line alone (so a melody note off the
 * chord does not hide it). A name is written only where the chord changes, as on a lead sheet:
 * notes that all belong to the chord before (C7's E G B♭ after a C) are still that chord.
 */
export function chordSymbols(parts: { notes: SymbolNote[] }[]): { at: number; name: string }[] {
  const notes = parts.map((part) => {
    let at = 0;
    return part.notes.map((n, i) => {
      const held = i > 0 && !!part.notes[i - 1].tie && n.pitches.length > 0;
      const note = { at, end: at + (n.beats ?? 0), pitches: n.pitches, held };
      at = note.end;
      return note;
    });
  });
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  const onsets = [...new Set(notes.flat().filter((n) => n.pitches.length && !n.held).map((n) => n.at))].sort((a, b) => a - b);
  const bassLine = notes[notes.length - 1] ?? [];
  const out: { at: number; name: string }[] = [];
  let last = new Set<number>();
  for (const at of onsets) {
    const struck = notes.map((line) => line.filter((n) => !n.held && near(n.at, at)).flatMap((n) => n.pitches));
    const sounding = notes.flat().filter((n) => (n.at < at - 1e-6 || (n.held && near(n.at, at))) && n.end > at + 1e-6).flatMap((n) => n.pitches);
    const lowest = (ps: Pitch[]) => ps.reduce((a, b) => (pitchToMidi(b) < pitchToMidi(a) ? b : a));
    const before = bassLine.filter((n) => n.pitches.length && !n.held && n.at < at - 1e-6 && n.at >= at - 2 - 1e-6 && n.end <= at + 1e-6).pop();
    const now = struck[struck.length - 1];
    const bass = before?.pitches.length === 1 && now.length !== 1 && (!now.length || pitchToMidi(before.pitches[0]) < pitchToMidi(lowest(now))) ? before.pitches : [];
    // Ways to hear the beat, fullest first; `mixed` ones put notes of both hands (or held ones) together.
    const tries = [
      { notes: [...struck.flat(), ...sounding, ...bass], mixed: true },
      { notes: [...struck.flat(), ...sounding], mixed: true },
      { notes: [...struck.flat(), ...bass], mixed: true },
      { notes: struck.flat(), mixed: struck.filter((l) => l.length).length > 1 },
      ...struck.map((l, i) => ({ notes: i === struck.length - 1 ? [...l, ...bass] : l, mixed: i === struck.length - 1 && bass.length > 0 })),
      ...struck.map((l) => ({ notes: l, mixed: false })),
    ].filter((t) => readChord(t.notes, t.mixed));
    if (!tries.length) continue;
    // The bass decides: of the readings over the lowest note sounding, the one with fewest notes
    // (a melody note on top makes no new chord); with none, the fullest reading.
    const floor = Math.min(...tries[0].notes.map(pitchToMidi));
    const size = (t: (typeof tries)[number]) => new Set(t.notes.map((p) => pc(pitchToMidi(p)))).size;
    const onBass = tries.filter((t) => Math.min(...t.notes.map(pitchToMidi)) === floor);
    const best = onBass.length ? onBass.reduce((a, b) => (size(b) < size(a) ? b : a)) : tries[0];
    const found = best.notes;
    // Only notes of the chord before: still that chord. The chord before with a note added across
    // the hands (a melody's G♯ over a held A): still that chord too.
    const has = new Set(found.map((p) => pc(pitchToMidi(p))));
    if ([...has].every((p) => last.has(p))) continue;
    if (best.mixed && last.size && [...last].filter((p) => has.has(p)).length >= 3) continue;
    const chord = readChord(found, best.mixed)!;
    last = chord.pcs;
    if (chord.name !== out[out.length - 1]?.name) out.push({ at, name: chord.name });
  }
  return out;
}
