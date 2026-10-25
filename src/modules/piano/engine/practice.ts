import type { TimedExercise } from '../content/types';
import { isTieEnd, type Hand, type NoteToken } from '../music/notes';
import { expectedNotes } from '../music/timeline';
import type { TimedResult } from '../scoring/timed';

// Practice helpers for timed exercises: the tempo ladder and looping a few bars.

// ---------------------------------------------------------------- tempo ladder

/** Rungs (percent of the written tempo) for `tempoLadder: true`. */
export const DEFAULT_LADDER = [60, 70, 80, 90, 100];
export const LADDER = {
  /** A take at least this good is a clean take. */
  cleanScore: 92,
  /** Clean takes on a rung to move up. */
  cleanTakes: 3,
  /** Failed takes in a row (under ★) to move down. */
  missesDown: 2,
  failScore: 65,
} as const;

export interface LadderState {
  rung: number;
  /** Clean takes on this rung. */
  clean: number;
  /** Failed takes in a row on this rung. */
  misses: number;
}

export const LADDER_START: LadderState = { rung: 0, clean: 0, misses: 0 };

/** The ladder after a take on its current rung. */
export function climb(rungs: number[], s: LadderState, score: number): { state: LadderState; moved?: 'up' | 'down' } {
  const top = s.rung >= rungs.length - 1;
  if (score >= LADDER.cleanScore) {
    const clean = s.clean + 1;
    if (clean >= LADDER.cleanTakes && !top) return { state: { rung: s.rung + 1, clean: 0, misses: 0 }, moved: 'up' };
    return { state: { ...s, clean: Math.min(clean, LADDER.cleanTakes), misses: 0 } };
  }
  if (score < LADDER.failScore) {
    const misses = s.misses + 1;
    if (misses >= LADDER.missesDown && s.rung > 0) return { state: { rung: s.rung - 1, clean: 0, misses: 0 }, moved: 'down' };
    return { state: { ...s, misses } };
  }
  return { state: { ...s, misses: 0 } };
}

// ---------------------------------------------------------------- looping bars

/**
 * Bars `from` to `to` (0-based, inclusive) as an exercise of their own. A tie into the first bar
 * becomes a fresh note; a tie out of the last bar is dropped. Finger numbers follow the notes;
 * dynamics are left out.
 */
export function sliceBars(ex: TimedExercise, from: number, to: number): TimedExercise {
  const fingers: Record<Hand, number[]> = { right: [], left: [] };
  const cut = (hand: Hand, tokens: NoteToken[] | undefined) => {
    if (!tokens) return undefined;
    const out: NoteToken[] = [];
    let index = 0; // note number in the whole exercise
    tokens.forEach((t, i) => {
      const continues = isTieEnd(tokens, i);
      if (t.bar >= from && t.bar <= to) {
        const fresh = t.pitches.length > 0 && (!continues || tokens[i - 1].bar < from);
        const finger = ex.fingers[hand][continues ? index - 1 : index];
        if (fresh && finger !== undefined) fingers[hand].push(finger);
        const { tie, ...rest } = t;
        const keepTie = tie && tokens[i + 1].bar <= to;
        out.push({ ...rest, bar: t.bar - from, ...(keepTie ? { tie: true } : {}) });
      }
      if (t.pitches.length && !continues) index++;
    });
    return out;
  };
  return {
    ...ex,
    id: `${ex.id}#bars-${from + 1}-${to + 1}`,
    right: cut('right', ex.right),
    left: cut('left', ex.left),
    fingers,
    pedal: ex.pedal?.filter((t) => t.bar >= from && t.bar <= to).map((t) => ({ ...t, bar: t.bar - from })),
    bars: to - from + 1,
    pickup: from === 0 ? ex.pickup : 0,
    // A loop is for the notes; its marks could start or end inside a hairpin.
    dynamics: undefined,
  };
}

/**
 * For practising bars `from`.. of `whole` while its whole sheet stays in view: where the slice
 * starts in the whole exercise's beats, and, for each note of the slice ("right:0"), the same
 * note's staff key in the whole exercise. A note a tie carried into the slice maps to the note
 * it continues.
 */
export function sliceMap(whole: TimedExercise, from: number, slice: TimedExercise): { offset: number; keys: Map<string, string> } {
  const offset = from * whole.meter.quarters;
  const all = expectedNotes(whole);
  const keys = new Map<string, string>();
  for (const n of expectedNotes(slice)) {
    const at = n.beat + offset;
    const same = all.find((w) => w.hand === n.hand && w.midi === n.midi && Math.abs(w.beat - at) < 1e-6)
      ?? all.find((w) => w.hand === n.hand && w.midi === n.midi && w.beat < at && w.beat + w.beats > at);
    if (same) keys.set(`${n.hand}:${n.index}`, `${same.hand}:${same.index}`);
  }
  return { offset, keys };
}

/**
 * The one or two bars where a take's mistakes cluster (0-based, inclusive), or undefined for a
 * clean take or a one-bar exercise. `quarterMs` places extra notes in time.
 */
export function trickyBars(r: TimedResult, ex: TimedExercise, quarterMs: number): [number, number] | undefined {
  if (ex.bars < 2) return undefined;
  const q = ex.meter.quarters;
  const counts = new Array<number>(ex.bars).fill(0);
  const add = (beat: number) => {
    const bar = Math.min(ex.bars - 1, Math.max(0, Math.floor(beat / q + 1e-9)));
    counts[bar]++;
  };
  for (const n of r.notes) if (n.outcome !== 'hit' || n.shortHold) add(n.expected.beat);
  for (const x of r.extras) add(x.played.on / quarterMs);
  const worst = counts.indexOf(Math.max(...counts));
  if (counts[worst] === 0) return undefined;
  const before = worst > 0 ? counts[worst - 1] : 0;
  const after = worst < ex.bars - 1 ? counts[worst + 1] : 0;
  if (!before && !after) return [worst, worst];
  return after >= before ? [worst, worst + 1] : [worst - 1, worst];
}
