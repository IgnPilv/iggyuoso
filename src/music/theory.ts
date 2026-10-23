import { NoteParseError, parsePitch, parsePitchClass, pitchToMidi, type Letter } from './notes';

// Intervals, chords, scales, keys and degrees, as written MIDI numbers (C4 = 60). Used by the
// ear, quiz and build exercises. Spelling (C# vs Db) is not tracked; the keys are what count.

export const INTERVALS: Readonly<Record<string, { semitones: number; name: string }>> = {
  P1: { semitones: 0, name: 'unison' },
  m2: { semitones: 1, name: 'minor 2nd' },
  M2: { semitones: 2, name: 'major 2nd' },
  m3: { semitones: 3, name: 'minor 3rd' },
  M3: { semitones: 4, name: 'major 3rd' },
  P4: { semitones: 5, name: 'perfect 4th' },
  TT: { semitones: 6, name: 'tritone' },
  A4: { semitones: 6, name: 'augmented 4th' },
  d5: { semitones: 6, name: 'diminished 5th' },
  P5: { semitones: 7, name: 'perfect 5th' },
  m6: { semitones: 8, name: 'minor 6th' },
  M6: { semitones: 9, name: 'major 6th' },
  m7: { semitones: 10, name: 'minor 7th' },
  M7: { semitones: 11, name: 'major 7th' },
  P8: { semitones: 12, name: 'octave' },
};

export function interval(code: string) {
  const i = INTERVALS[code];
  if (!i) throw new NoteParseError(`"${code}" is not an interval (${Object.keys(INTERVALS).join(' ')})`);
  return i;
}

export const CHORD_QUALITIES: Readonly<Record<string, { steps: number[]; name: string; suffix: string }>> = {
  maj: { steps: [0, 4, 7], name: 'major', suffix: '' },
  min: { steps: [0, 3, 7], name: 'minor', suffix: 'm' },
  dim: { steps: [0, 3, 6], name: 'diminished', suffix: 'dim' },
  aug: { steps: [0, 4, 8], name: 'augmented', suffix: 'aug' },
  sus2: { steps: [0, 2, 7], name: 'sus2', suffix: 'sus2' },
  sus4: { steps: [0, 5, 7], name: 'sus4', suffix: 'sus4' },
  dom7: { steps: [0, 4, 7, 10], name: 'dominant 7th', suffix: '7' },
  maj7: { steps: [0, 4, 7, 11], name: 'major 7th', suffix: 'maj7' },
  min7: { steps: [0, 3, 7, 10], name: 'minor 7th', suffix: 'm7' },
};

export function chordQuality(q: string) {
  const c = CHORD_QUALITIES[q];
  if (!c) throw new NoteParseError(`"${q}" is not a chord quality (${Object.keys(CHORD_QUALITIES).join(' ')})`);
  return c;
}

/** "Cm" / "F#7" / "Bbmaj7" / "G" -> notes from the root in `octave` (root position). */
export function chordNotes(symbol: string, octave = 4): number[] {
  const m = /^([A-G](?:#|b)?)(.*)$/.exec(symbol.trim());
  const q = m && Object.entries(CHORD_QUALITIES).find(([, c]) => c.suffix === m[2]);
  if (!m || !q) throw new NoteParseError(`"${symbol}" is not a chord like C, Cm, Cdim, Caug, C7, Cmaj7 or Cm7`);
  const root = pitchToMidi(parsePitch(`${m[1]}${octave}`));
  return q[1].steps.map((s) => root + s);
}

export const SCALES: Readonly<Record<string, number[]>> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  'natural minor': [0, 2, 3, 5, 7, 8, 10],
  'harmonic minor': [0, 2, 3, 5, 7, 8, 11],
  'melodic minor': [0, 2, 3, 5, 7, 9, 11],
  'major pentatonic': [0, 2, 4, 7, 9],
  'minor pentatonic': [0, 3, 5, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

/** "C major" / "A harmonic minor": tonic in `octave` up to the tonic `octaves` higher. */
export function scaleNotes(name: string, octaves = 1, octave = 4): number[] {
  const m = /^([A-G](?:#|b)?)\s+(.+)$/.exec(name.trim());
  const steps = m && SCALES[m[2].toLowerCase()];
  if (!m || !steps) throw new NoteParseError(`"${name}" is not a scale like "C major" or "A harmonic minor"`);
  const tonic = pitchToMidi(parsePitch(`${m[1]}${octave}`));
  const out: number[] = [];
  for (let o = 0; o < octaves; o++) for (const s of steps) out.push(tonic + 12 * o + s);
  out.push(tonic + 12 * octaves);
  return out;
}

/** A key: "C" or "G" = major, "Am" = minor. */
export interface Key {
  tonicPc: number;
  minor: boolean;
  name: string;
}

export function parseKey(text: string): Key {
  const m = /^([A-G](?:#|b)?)(m)?$/.exec(text.trim());
  if (!m) throw new NoteParseError(`"${text}" is not a key like C, G, F# or Am`);
  return { tonicPc: parsePitchClass(m[1]), minor: !!m[2], name: `${m[1]} ${m[2] ? 'minor' : 'major'}` };
}

// ---------------------------------------------------------------- key signatures

const SHARP_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
const FLAT_KEYS = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
const SHARP_MINORS = ['A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#'];
const FLAT_MINORS = ['A', 'D', 'G', 'C', 'F', 'Bb', 'Eb', 'Ab'];
export const SHARP_ORDER: Letter[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
export const FLAT_ORDER: Letter[] = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

export interface KeySignature {
  /** Sharps (> 0) or flats (< 0), -7 to 7. */
  count: number;
  /** The accidental the signature gives each letter (0 for letters it leaves alone). */
  of: Record<Letter, -1 | 0 | 1>;
}

/** The signature of a key written like C, G, Bb, F#m or Am. */
export function keySignature(text: string): KeySignature {
  const m = /^([A-G](?:#|b)?)(m)?$/.exec(text.trim());
  if (!m) throw new NoteParseError(`"${text}" is not a key like C, G, Bb, F#m or Am`);
  const [sharps, flats] = m[2] ? [SHARP_MINORS, FLAT_MINORS] : [SHARP_KEYS, FLAT_KEYS];
  const count = sharps.includes(m[1]) ? sharps.indexOf(m[1]) : flats.includes(m[1]) ? -flats.indexOf(m[1]) : NaN;
  if (Number.isNaN(count)) throw new NoteParseError(`"${text}" has no key signature; use the usual spelling, such as Eb rather than D#`);
  const of = { C: 0, D: 0, E: 0, F: 0, G: 0, A: 0, B: 0 } as Record<Letter, -1 | 0 | 1>;
  (count > 0 ? SHARP_ORDER : FLAT_ORDER).slice(0, Math.abs(count)).forEach((l) => { of[l] = count > 0 ? 1 : -1; });
  return { count, of };
}

/** Tonic of a key as a written note in the octave of `ref` (C-based octave), e.g. G in octave 4 = G4. */
export function tonicIn(key: Key, octave = 4): number {
  return 12 * (octave + 1) + key.tonicPc;
}

/** Degree "1".."7", optionally with b or # ("b3", "#4"), as semitones above the tonic. */
export function degreeSemitones(key: Key, degree: string | number): number {
  const m = /^(b|#)?([1-7])$/.exec(String(degree).trim());
  if (!m) throw new NoteParseError(`"${degree}" is not a scale degree (1 to 7, optionally b3 or #4)`);
  const steps = SCALES[key.minor ? 'minor' : 'major'];
  return steps[Number(m[2]) - 1] + (m[1] === '#' ? 1 : m[1] === 'b' ? -1 : 0);
}

/**
 * A I-IV-V-I cadence to set the key: four chords around the tonic in octave 3/4, each with the
 * bass note an octave down.
 */
export function cadence(key: Key): number[][] {
  const t = tonicIn(key, 4) > 66 ? tonicIn(key, 3) : tonicIn(key, 4);
  const third = key.minor ? 3 : 4;
  const I = [t - 12, t, t + third, t + 7];
  const IV = [t - 7, t, t + 5, t + 5 + third]; // second inversion, close to I
  const V = [t - 5, t - 1, t + 2, t + 7]; // major V in both modes (raised 7th in minor)
  return [I, IV, V, I];
}

/**
 * The way home from a degree to the tonic along the scale: 2, 3 and 4 step down to 1; 5, 6 and 7
 * step up to the octave (as in functional ear training). Includes the starting note.
 */
export function resolution(key: Key, degreeMidi: number): number[] {
  const steps = SCALES[key.minor ? 'minor' : 'major'];
  const above = (((degreeMidi % 12) - key.tonicPc) % 12 + 12) % 12;
  const base = degreeMidi - above;
  if (above === 0) return [degreeMidi];
  const scale = [...steps.map((s) => base + s), base + 12];
  if (above >= 7) return [degreeMidi, ...scale.filter((n) => n > degreeMidi)];
  return [degreeMidi, ...scale.filter((n) => n < degreeMidi).reverse()];
}

export const COMPARE = ['higher', 'lower', 'same'] as const;
export type Compare = (typeof COMPARE)[number];
