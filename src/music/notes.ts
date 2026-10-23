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

export const DURATIONS: Record<string, number> = { w: 4, h: 2, q: 1, e: 0.5 };

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
  beats: number;
  bar: number;
}

/** Parse a duration like q, h., e. Dotted adds half. */
export function parseDuration(text: string): number {
  const m = /^([whqe])(\.)?$/.exec(text);
  if (!m) throw new NoteParseError(`"${text}" is not a duration (w h q e, optionally dotted)`);
  const base = DURATIONS[m[1]];
  return m[2] ? base * 1.5 : base;
}

/** Parse a timed note string: "C4:q D4:q E4:h | r:w". */
export function parseTimedNotes(text: string): NoteToken[] {
  const out: NoteToken[] = [];
  text.split('|').forEach((barText, bar) => {
    for (const tok of barText.trim().split(/\s+/).filter(Boolean)) {
      const [head, dur, ...rest] = tok.split(':');
      if (dur === undefined || rest.length) throw new NoteParseError(`"${tok}" should look like C4:q or r:q`);
      const pitches = head === 'r' ? [] : head.split('+').map(parsePitch);
      out.push({ pitches, beats: parseDuration(dur), bar });
    }
  });
  return out;
}

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
}

export function parseMeter(text: string): Meter {
  const m = /^(\d+)\/(1|2|4|8|16)$/.exec(text.trim());
  if (!m) throw new NoteParseError(`"${text}" is not a meter like 4/4`);
  const beats = Number(m[1]);
  const unit = Number(m[2]);
  return { beats, unit, quarters: (beats * 4) / unit };
}
