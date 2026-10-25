import { describe, expect, it } from 'vitest';
import { parseExercise } from '../src/modules/piano/content/load';
import type { TimedExercise } from '../src/modules/piano/content/types';
import { climb, LADDER_START, sliceBars, sliceMap, trickyBars } from '../src/modules/piano/engine/practice';
import { expectedNotes } from '../src/modules/piano/music/timeline';
import type { TimedResult } from '../src/modules/piano/scoring/timed';

const timed = (extra: Record<string, unknown>) =>
  parseExercise({ id: 't', kind: 'timed', hand: 'right', tempo: 60, meter: '4/4', ...extra }) as TimedExercise;

describe('tempo ladder', () => {
  it('reads tempoLadder', () => {
    expect(timed({ right: 'C4:w', tempoLadder: true }).ladder).toEqual([60, 70, 80, 90, 100]);
    expect(timed({ right: 'C4:w', tempoLadder: [50, 75] }).ladder).toEqual([50, 75, 100]);
    expect(timed({ right: 'C4:w' }).ladder).toBeUndefined();
    expect(() => timed({ right: 'C4:w', tempoLadder: [80, 60] })).toThrow(/rising/);
  });

  it('moves up after three clean takes and down after two fails in a row', () => {
    const rungs = [60, 80, 100];
    let s = LADDER_START;
    s = climb(rungs, s, 95).state;
    s = climb(rungs, s, 85).state; // a pass that is not clean: no step either way
    s = climb(rungs, s, 93).state;
    const up = climb(rungs, s, 99);
    expect(up.moved).toBe('up');
    expect(up.state).toEqual({ rung: 1, clean: 0, misses: 0 });
    s = climb(rungs, up.state, 40).state;
    s = climb(rungs, s, 70).state; // a pass resets the misses
    s = climb(rungs, s, 40).state;
    const down = climb(rungs, s, 50);
    expect(down.moved).toBe('down');
    expect(down.state.rung).toBe(0);
    // Never below the first rung or above the last.
    expect(climb(rungs, { rung: 0, clean: 0, misses: 1 }, 10).moved).toBeUndefined();
    expect(climb(rungs, { rung: 2, clean: 2, misses: 0 }, 100).moved).toBeUndefined();
  });
});

describe('looping bars', () => {
  const ex = timed({ pickup: 'q', right: 'G4:q | C5:q D5:q E5:h~ | E5:q F5:q G5:h | A5:h. ', fingers: '1 2 3 4 5 1 2' });

  it('cuts bars out as an exercise of their own', () => {
    const mid = sliceBars(ex, 2, 3);
    expect(mid.bars).toBe(2);
    expect(mid.pickup).toBe(0);
    // The tie into bar 3 starts a fresh note there, with the tied note's finger.
    expect(expectedNotes(mid).map((n) => [n.midi, n.beat, n.beats, n.finger])).toEqual([[76, 0, 1, 4], [77, 1, 1, 5], [79, 2, 2, 1], [81, 4, 3, 2]]);
    const start = sliceBars(ex, 0, 1);
    expect(start.pickup).toBe(1);
    // The tie out of the last bar is dropped.
    expect(expectedNotes(start).map((n) => [n.midi, n.beat, n.beats])).toEqual([[67, 3, 1], [72, 4, 1], [74, 5, 1], [76, 6, 2]]);
    expect(start.id).toBe('t#bars-1-2');
  });

  it('maps a slice back onto the whole sheet', () => {
    // Whole: right:0 G4 (upbeat), 1 C5, 2 D5, 3 E5 (tied on), 4 F5, 5 G5, 6 A5.
    const mid = sliceMap(ex, 2, sliceBars(ex, 2, 3));
    expect(mid.offset).toBe(8);
    // The fresh E5 from the tie is the tied note of bar 2.
    expect([...mid.keys]).toEqual([['right:0', 'right:3'], ['right:1', 'right:4'], ['right:2', 'right:5'], ['right:3', 'right:6']]);
    const start = sliceMap(ex, 0, sliceBars(ex, 0, 1));
    expect(start.offset).toBe(0);
    expect([...start.keys.values()]).toEqual(['right:0', 'right:1', 'right:2', 'right:3']);
  });

  it('cuts the pedal line with the bars', () => {
    const ped = timed({ right: 'C4:w | D4:w | E4:w', pedal: 'x:w | r:h x:h | x:w' });
    expect(sliceBars(ped, 1, 2).pedal).toEqual([{ down: false, beats: 2, bar: 0 }, { down: true, beats: 2, bar: 0 }, { down: true, beats: 4, bar: 1 }]);
  });

  it('finds the bars where mistakes cluster', () => {
    const notes = expectedNotes(ex);
    const take = (bad: number[], extrasAt: number[] = []): TimedResult => ({
      hands: [], together: null, score: 50, stars: 0, feedback: [],
      notes: notes.map((e, i) => ({ expected: e, outcome: bad.includes(i) ? 'miss' : 'hit', points: 1 })),
      extras: extrasAt.map((ms) => ({ played: { midi: 60, on: ms }, hand: 'right' })),
    });
    expect(trickyBars(take([]), ex, 1000)).toBeUndefined();
    expect(trickyBars(take([5]), ex, 1000)).toEqual([2, 2]);
    expect(trickyBars(take([4, 5, 2]), ex, 1000)).toEqual([1, 2]);
    // Two extra notes at 12.5 s (bar 4, counting the upbeat bar as bar 1) outweigh one miss.
    expect(trickyBars(take([1], [12500, 12600]), ex, 1000)).toEqual([3, 3]);
  });
});
