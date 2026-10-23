import { isBlack, pitchClass, midiName } from './music/notes';

// The player presses the lowest white key, then the highest key. Keyboards often send MIDI
// numbers shifted by octaves, so middle C is worked out from the physical layout: it is the C
// nearest the middle of the keyboard (lower one on a tie, as on 61-key boards).

export interface Calibration {
  /** Device MIDI number of the lowest and highest key. */
  low: number;
  high: number;
  keyCount: number;
  /** Device MIDI number of middle C. */
  middleC: number;
  /** Add to a written MIDI number (C4 = 60) to get the device key. Always a multiple of 12. */
  offset: number;
}

export type CalibrationResult = { ok: true; calibration: Calibration; notes: string[] } | { ok: false; error: string };

const STANDARD_SIZES: Record<number, string> = {
  25: '25-key', 32: '32-key', 37: '37-key', 49: '49-key', 61: '61-key', 73: '73-key', 76: '76-key', 88: '88-key',
};

export function calibrate(lowWhite: number, high: number): CalibrationResult {
  if (isBlack(lowWhite)) return { ok: false, error: 'The first key should be the lowest white key. Please try again.' };
  if (high <= lowWhite) return { ok: false, error: 'The second key should be the highest key, to the right of the first one.' };
  // The lowest key may be black on some boards; the player only presses the lowest white key.
  const low = lowWhite;
  const keyCount = high - low + 1;
  if (keyCount < 13) return { ok: false, error: 'That range is less than an octave. Press the very lowest and very highest keys.' };
  const middleC = middleCFor(low, high);
  const notes: string[] = [];
  notes.push(STANDARD_SIZES[keyCount] ? `${STANDARD_SIZES[keyCount]} keyboard` : `${keyCount} keys`);
  if (middleC !== 60) notes.push(`Your keyboard sends middle C as MIDI ${middleC}; the app adjusts for that.`);
  return { ok: true, calibration: withMiddleC(low, high, middleC), notes };
}

export function middleCFor(low: number, high: number): number {
  const centre = (low + high) / 2;
  let best = -1;
  for (let m = low; m <= high; m++) {
    if (pitchClass(m) !== 0) continue;
    if (best < 0 || Math.abs(m - centre) < Math.abs(best - centre)) best = m;
  }
  if (best < 0) throw new Error('no C in range');
  return best;
}

export function withMiddleC(low: number, high: number, middleC: number): Calibration {
  return { low, high, keyCount: high - low + 1, middleC, offset: middleC - 60 };
}

/** Move middle C one octave up (+1) or down (-1), if that C is on the keyboard. */
export function shiftMiddleC(c: Calibration, octaves: number): Calibration {
  const m = c.middleC + 12 * octaves;
  if (m < c.low || m > c.high) return c;
  return withMiddleC(c.low, c.high, m);
}

export const toDevice = (c: Calibration, writtenMidi: number) => writtenMidi + c.offset;
export const toWritten = (c: Calibration, deviceMidi: number) => deviceMidi - c.offset;
export const inRange = (c: Calibration, deviceMidi: number) => deviceMidi >= c.low && deviceMidi <= c.high;
/** Name of a device key in the player's terms, e.g. "C4" for their middle C. */
export const keyName = (c: Calibration, deviceMidi: number) => midiName(toWritten(c, deviceMidi));

/**
 * The device keys to draw for an exercise that uses part of the keyboard: its keys padded by
 * `pad`, always with middle C in view and room around it for its label (so the C in the middle of
 * the picture is never mistaken for middle C), at least two octaves wide, starting and ending on
 * white keys, cut to the keyboard. No keys = the whole keyboard.
 */
export function keyWindow(c: Calibration, keys: number[], pad = 7): [number, number] {
  if (!keys.length) return [c.low, c.high];
  let lo = Math.min(...keys, c.middleC) - pad;
  let hi = Math.max(...keys, c.middleC) + pad;
  const short = 24 - (hi - lo);
  if (short > 0) {
    lo -= Math.floor(short / 2);
    hi += Math.ceil(short / 2);
  }
  while (isBlack(lo)) lo--;
  while (isBlack(hi)) hi++;
  return [Math.max(c.low, lo), Math.min(c.high, hi)];
}
