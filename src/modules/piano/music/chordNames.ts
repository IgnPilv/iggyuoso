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

/** A chord name said in words where that reads better (C major, A minor); others stay as written (G7, Bdim). */
export function chordWords(name: string): string {
  const m = /^([A-G][♯♭]?)(m?)$/.exec(name);
  return m ? `${m[1]} ${m[2] ? 'minor' : 'major'}` : name;
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
export function chordSymbols(parts: { notes: SymbolNote[] }[], bars?: SpanOptions): { at: number; name: string }[] {
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
  return bars && (notes.length > 1 || bars.left) ? withSpans(out, notes, bars) : out;
}

/** Where bars fall, for reading broken chords: a bar's length in quarter beats, and how far into its bar the first note is. */
export interface SpanOptions {
  barQuarters: number;
  /** Quarter beats from the start of the first bar to the first note (an upbeat's padding). */
  offset?: number;
  /** Quarter beats a beat lasts (1.5 in 6/8): a bar of an even number of beats is also read in halves. */
  pulse?: number;
  /** The only line is a left hand (with two lines the lower one is read). A lone right hand is a melody: never read as broken chords. */
  left?: boolean;
}

interface Placed { at: number; end: number; pitches: Pitch[]; held: boolean }

/**
 * Broken chords: the lowest line's notes struck one by one over a bar (an arpeggio, or a bass note
 * then its chord, oom-pah) are put together and named as one chord at the bar's first note. A bar of
 * an even number of beats is also read in halves, which win when a half is a chord and neither half
 * is the whole bar's chord (a chord change mid-bar, or a lead-in to the next bar), and always when
 * the halves share no note. Only a stretch whose notes are all notes of one chord counts,
 * so a melody or a stepping bass gives no name. Where a line strikes a full chord at once in that
 * stretch, the chords read beat by beat stand (only moved to its first note when they name the same chord).
 */
function withSpans(out: { at: number; name: string }[], lines: Placed[][], o: SpanOptions): { at: number; name: string }[] {
  const eps = 1e-6;
  const low = lines[lines.length - 1] ?? [];
  const struckIn = (a: number, b: number) => low.filter((n) => n.pitches.length && !n.held && n.at >= a - eps && n.at < b - eps);
  const end = Math.max(0, ...lines.flat().map((n) => n.end));
  const pulse = o.pulse ?? 1;
  const beats = Math.round(o.barQuarters / pulse);
  const halves = beats >= 2 && beats % 2 === 0;
  /** A chord from the line's notes over this stretch: struck one by one (two or more onsets), all of one chord. */
  const read = (a: number, b: number) => {
    const ns = struckIn(a, b);
    if (new Set(ns.map((n) => n.at)).size < 2) return undefined;
    const chord = readChord(ns.flatMap((n) => n.pitches), true);
    return chord ? { at: ns[0].at, name: chord.name } : undefined;
  };
  const found: { from: number; to: number; at: number; name: string }[] = [];
  for (let from = -(o.offset ?? 0); from < end - eps; from += o.barQuarters) {
    const to = from + o.barQuarters;
    const mid = from + (beats / 2) * pulse;
    const h1 = halves ? read(from, mid) : undefined;
    const h2 = halves ? read(mid, to) : undefined;
    // Halves with no note in common are two chords, never one: B F♯ then G D is B minor going to G,
    // not Gmaj7.
    const pcsIn = (a: number, b: number) => new Set(struckIn(a, b).flatMap((n) => n.pitches).map((p) => pc(pitchToMidi(p))));
    const apart = halves && ((x, y) => x.size > 0 && y.size > 0 && ![...x].some((p) => y.has(p)))(pcsIn(from, mid), pcsIn(mid, to));
    const whole = apart ? undefined : read(from, to);
    // The whole bar, unless a half is a chord and neither half is the whole bar's chord (then the
    // whole's extra notes lead on to the next chord: A C♯ E, then E G♯ is A, not Amaj7).
    if (whole && (!(h1 || h2) || h1?.name === whole.name || h2?.name === whole.name)) found.push({ from, to, ...whole });
    else for (const [h, a, b] of [[h1, from, mid], [h2, mid, to]] as const) if (h) found.push({ from: a, to: b, ...h });
  }
  let res = [...out];
  for (const f of found) {
    const inside = res.filter((c) => c.at >= f.from - eps && c.at < f.to - eps);
    const blocky = lines.some((line) => {
      const byAt = new Map<number, Set<number>>();
      for (const n of line) if (n.pitches.length && !n.held && n.at >= f.from - eps && n.at < f.to - eps) {
        const s = byAt.get(n.at) ?? new Set<number>();
        for (const p of n.pitches) s.add(pc(pitchToMidi(p)));
        byAt.set(n.at, s);
      }
      return [...byAt.values()].some((s) => s.size >= 3);
    });
    // A full chord struck at once in this stretch: the beat-by-beat reading stands, only moved to
    // the first bass note when it names the same chord (oom-pah: bass, then chord).
    if (blocky && (!inside.length || inside.some((c) => c.name !== f.name))) continue;
    res = [...res.filter((c) => !inside.includes(c)), { at: f.at, name: f.name }];
  }
  res.sort((a, b) => a.at - b.at);
  return res.filter((c, i) => c.name !== res[i - 1]?.name);
}

/**
 * The chord a hand has just broken up (live playing): the notes heard last, going back while they
 * still make one chord, within `windowMs` of now and with no gap of more than `gapMs`. Undefined
 * until three different notes of a chord have been heard. Returns the keys, newest last.
 */
export function brokenChord(heard: { midi: number; at: number }[], now: number, windowMs = 2500, gapMs = 1200): number[] | undefined {
  const pitch = (m: number): Pitch => ({ letter: 'CCDDEFFGGAAB'[pc(m)] as Pitch['letter'], accidental: [1, 3, 6, 8, 10].includes(pc(m)) ? 1 : 0, octave: Math.floor(m / 12) - 1 });
  let best: number[] | undefined;
  let next = now;
  const taken: number[] = [];
  for (let i = heard.length - 1; i >= 0; i--) {
    const n = heard[i];
    if (now - n.at > windowMs || next - n.at > gapMs) break;
    next = n.at;
    taken.unshift(n.midi);
    if (new Set(taken.map(pc)).size < 3) continue;
    if (readChord(taken.map(pitch))) best = [...taken];
    else if (best) break;
  }
  return best;
}
