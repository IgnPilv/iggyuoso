import { describe, expect, it } from 'vitest';
import { groupChords } from '../src/modules/piano/midi/chords';

describe('groupChords', () => {
  it('times near-simultaneous notes from the first one', () => {
    const g = groupChords([{ midi: 64, on: 1030 }, { midi: 60, on: 1000 }, { midi: 67, on: 1055 }, { midi: 72, on: 1200 }]);
    expect(g.map((n) => n.on)).toEqual([1000, 1000, 1000, 1200]);
  });

  it('does not chain a slow roll into one chord', () => {
    const g = groupChords([{ midi: 60, on: 0 }, { midi: 62, on: 70 }, { midi: 64, on: 140 }]);
    expect(g.map((n) => n.on)).toEqual([0, 70, 140]);
  });
});
