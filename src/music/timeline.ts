import type { TimedExercise } from '../content/types';
import { pitchToMidi, type Hand, type NoteToken } from './notes';

// Flattens a timed exercise into the notes each hand should play, in beats from the downbeat
// after the count-in. An upbeat (pickup) bar is padded at the front, so bar lines stay on whole
// bars; a tied note is one note held for both lengths.

export interface ExpectedNote {
  hand: Hand;
  /** Index of this note within its hand (rests not counted; a chord's notes share an index). */
  index: number;
  beat: number;
  beats: number;
  /** Written MIDI number (C4 = 60). */
  midi: number;
  finger?: number;
}

export function expectedNotes(ex: TimedExercise): ExpectedNote[] {
  const out: ExpectedNote[] = [];
  const add = (hand: Hand, tokens: NoteToken[] | undefined) => {
    if (!tokens) return;
    let beat = pickupOffset(ex);
    let index = 0;
    let held: ExpectedNote[] = []; // notes a tie carries into this token
    for (const t of tokens) {
      if (held.length) {
        for (const n of held) n.beats += t.beats;
      } else if (t.pitches.length) {
        const finger = ex.fingers[hand][index];
        held = t.pitches.map((p) => ({ hand, index, beat, beats: t.beats, midi: pitchToMidi(p), finger }));
        out.push(...held);
        index++;
      }
      if (!t.tie) held = [];
      beat += t.beats;
    }
  };
  add('right', ex.right);
  add('left', ex.left);
  return out.sort((a, b) => a.beat - b.beat || (a.hand === b.hand ? 0 : a.hand === 'left' ? -1 : 1));
}

/**
 * One stretch of pedal down, in beats like the notes. `change`: it follows another stretch
 * directly, so the pedal is lifted and pressed again at `beat` (legato pedal); otherwise it is
 * pressed from up. `lift`: the pedal goes up at its end (a rest or the end follows).
 */
export interface PedalSpan {
  beat: number;
  beats: number;
  change: boolean;
  lift: boolean;
}

export function expectedPedal(ex: TimedExercise): PedalSpan[] {
  if (!ex.pedal) return [];
  const out: PedalSpan[] = [];
  let beat = pickupOffset(ex);
  ex.pedal.forEach((t, i) => {
    if (t.down) out.push({ beat, beats: t.beats, change: !!ex.pedal![i - 1]?.down, lift: !ex.pedal![i + 1]?.down });
    beat += t.beats;
  });
  return out;
}

/** Silent beats before an upbeat, so that it ends on the first full bar's downbeat. */
export const pickupOffset = (ex: TimedExercise) => (ex.pickup ? ex.meter.quarters - ex.pickup : 0);
export const totalBeats = (ex: TimedExercise) => ex.bars * ex.meter.quarters;
/** Milliseconds per quarter beat at a tempo in quarter beats per minute. */
export const beatMs = (tempo: number) => 60000 / tempo;
