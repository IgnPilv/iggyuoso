import type { TimedExercise } from '../content/types';
import { pitchToMidi, type Hand, type NoteToken } from './notes';

// Flattens a timed exercise into the notes each hand should play, in beats from the downbeat
// after the count-in.

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
    let beat = 0;
    let index = 0;
    for (const t of tokens) {
      if (t.pitches.length) {
        const finger = ex.fingers[hand][index];
        for (const p of t.pitches) out.push({ hand, index, beat, beats: t.beats, midi: pitchToMidi(p), finger });
        index++;
      }
      beat += t.beats;
    }
  };
  add('right', ex.right);
  add('left', ex.left);
  return out.sort((a, b) => a.beat - b.beat || (a.hand === b.hand ? 0 : a.hand === 'left' ? -1 : 1));
}

export const totalBeats = (ex: TimedExercise) => ex.bars * ex.meter.quarters;
export const beatMs = (tempo: number) => 60000 / tempo;
