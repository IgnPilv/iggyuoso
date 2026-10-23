// Written pitches and note strings. "Written" MIDI numbers assume C4 = 60; the player's real key
// numbers come from calibration (see calibration.ts), never from these values directly.

export type Hand = 'right' | 'left';

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
export type Letter = (typeof LETTERS)[number];
const LETTER_PC: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const PC_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BLACK_PCS = new Set([1, 3, 6, 8, 10]);

export interface Pitch {
  letter: Letter;
  accidental: -1 | 0 | 1;
  octave: number;
}

export const DURATIONS: Record<string, number> = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25 };

export class NoteParseError extends Error {}

export function parsePitch(text: string): Pitch {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(text.trim());
  if (!m) throw new NoteParseError(`"${text}" is not a note like C4, F#3 or Bb2`);
  return {
    letter: m[1] as Letter,
    accidental: m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0,
    octave: Number(m[3]),
  };
}

/** Written MIDI number (C4 = 60). */
export function pitchToMidi(p: Pitch): number {
  return 12 * (p.octave + 1) + LETTER_PC[p.letter] + p.accidental;
}

export function parsePitchClass(text: string): number {
  const m = /^([A-G])(#|b)?$/.exec(text.trim());
  if (!m) throw new NoteParseError(`"${text}" is not a note letter like C or F#`);
  return (LETTER_PC[m[1] as Letter] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
}

export const pitchClass = (midi: number) => ((midi % 12) + 12) % 12;
export const isBlack = (midi: number) => BLACK_PCS.has(pitchClass(midi));
export const pcName = (pc: number) => PC_NAMES[pc];
/** Name of a written MIDI number, e.g. 60 -> "C4". */
export const midiName = (midi: number) => `${PC_NAMES[pitchClass(midi)]}${Math.floor(midi / 12) - 1}`;

/** Diatonic step index (C0 = 0, D0 = 1, ...); used to place notes on a staff. */
export function diatonicStep(p: Pitch): number {
  return p.octave * 7 + LETTERS.indexOf(p.letter);
}

export interface NoteToken {
  /** Empty for a rest; several for a chord ("C4+E4:q"). */
  pitches: Pitch[];
  /** Length in quarter beats. */
  beats: number;
  bar: number;
  /** The written value before dots and triplets (q = 1), for drawing the note. */
  value: number;
  dotted?: boolean;
  /** Part of a triplet (three in the time of two). */
  triplet?: boolean;
  /** Tied into the next note, which has the same pitches and is not played again. */
  tie?: boolean;
}

export interface Duration {
  beats: number;
  value: number;
  dotted: boolean;
  triplet: boolean;
}

/** Parse a duration: w h q e s, a dot adds half (h.), a 3 makes a triplet (e3 = a third of a beat). */
export function parseDuration(text: string): Duration {
  const m = /^([whqes])(\.)?(3)?$/.exec(text);
  if (!m || (m[2] && m[3])) throw new NoteParseError(`"${text}" is not a duration (w h q e s, dotted like h. or a triplet like e3)`);
  const value = DURATIONS[m[1]];
  const triplet = m[3] !== undefined;
  if (triplet && value > 1) throw new NoteParseError(`"${text}": triplets are q3, e3 or s3`);
  return { beats: m[2] ? value * 1.5 : triplet ? (value * 2) / 3 : value, value, dotted: !!m[2], triplet };
}

const samePitches = (a: Pitch[], b: Pitch[]) =>
  a.length === b.length && a.map(pitchToMidi).sort().join() === b.map(pitchToMidi).sort().join();

/** Parse a timed note string: "C4:q D4:q E4:h | r:w". A tie is "C4:h~ C4:q" (also across bars). */
export function parseTimedNotes(text: string): NoteToken[] {
  const out: NoteToken[] = [];
  text.split('|').forEach((barText, bar) => {
    for (const tok of barText.trim().split(/\s+/).filter(Boolean)) {
      const [head, dur, ...rest] = tok.split(':');
      if (dur === undefined || rest.length) throw new NoteParseError(`"${tok}" should look like C4:q or r:q`);
      const pitches = head === 'r' ? [] : head.split('+').map(parsePitch);
      const tie = dur.endsWith('~');
      if (tie && !pitches.length) throw new NoteParseError(`"${tok}": a rest cannot be tied`);
      const d = parseDuration(tie ? dur.slice(0, -1) : dur);
      out.push({
        pitches, beats: d.beats, bar, value: d.value,
        ...(d.dotted ? { dotted: true } : {}), ...(d.triplet ? { triplet: true } : {}), ...(tie ? { tie: true } : {}),
      });
    }
  });
  out.forEach((t, i) => {
    if (!t.tie) return;
    const next = out[i + 1];
    if (!next || !samePitches(t.pitches, next.pitches)) throw new NoteParseError('a tie (~) must be followed by the same note');
  });
  return out;
}

/** True for a token that only continues a tied note (it is not played again). */
export const isTieEnd = (tokens: NoteToken[], i: number) => i > 0 && !!tokens[i - 1].tie;

/** Bars of a timed note string, each as total quarter beats. */
export function barLengths(tokens: NoteToken[]): number[] {
  const bars: number[] = [];
  for (const t of tokens) bars[t.bar] = (bars[t.bar] ?? 0) + t.beats;
  return Array.from(bars, (b) => b ?? 0);
}

/** Parse an untimed list: "C4 D4 E4". */
export function parsePitchList(text: string): Pitch[] {
  return text.trim().split(/\s+/).filter(Boolean).map(parsePitch);
}

export function parseFingers(text: string | number | undefined): number[] {
  if (text === undefined) return [];
  return String(text)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((f) => {
      const n = Number(f);
      if (!Number.isInteger(n) || n < 1 || n > 5) throw new NoteParseError(`finger "${f}" must be 1 to 5`);
      return n;
    });
}

export interface Meter {
  beats: number;
  unit: number;
  /** Bar length in quarter beats. */
  quarters: number;
  /** Quarter beats per counted beat: the tempo counts these. 1.5 in 6/8, 9/8 and 12/8. */
  pulse: number;
}

export function parseMeter(text: string): Meter {
  const m = /^(\d+)\/(1|2|4|8|16)$/.exec(text.trim());
  if (!m) throw new NoteParseError(`"${text}" is not a meter like 4/4`);
  const beats = Number(m[1]);
  const unit = Number(m[2]);
  const compound = unit === 8 && beats > 3 && beats % 3 === 0;
  return { beats, unit, quarters: (beats * 4) / unit, pulse: compound ? 1.5 : 4 / unit };
}
