import { describe, expect, it } from 'vitest';
import { limitMs, multiplier, NoteRush, rushPool } from '../src/modules/piano/engine/noteRush';

describe('Note Rush', () => {
  it('draws white keys from the clef and level, never the same note twice running', () => {
    expect(rushPool('treble', 'position')).toEqual([60, 62, 64, 65, 67]);
    expect(rushPool('bass', 'position')).toEqual([48, 50, 52, 53, 55]);
    expect(rushPool('grand', 'position')).toHaveLength(10);
    const g = new NoteRush(rushPool('treble', 'ledger'));
    g.start(0);
    let prev = g.current;
    for (let i = 0; i < 200; i++) {
      g.press(g.current, i * 10 + 10);
      expect(g.current).not.toBe(prev);
      prev = g.current;
    }
  });

  it('scores a streak with a growing multiplier and a shrinking time, and resets it on a wrong key', () => {
    expect(multiplier(0)).toBe(1);
    expect(multiplier(5)).toBe(2);
    expect(multiplier(40)).toBe(5);
    expect(limitMs(0)).toBe(6000);
    expect(limitMs(100)).toBe(2000);
    const g = new NoteRush([60, 62]);
    g.start(0);
    for (let i = 0; i < 6; i++) expect(g.press(g.current, 100 * (i + 1))).toBe('hit');
    expect(g.score).toBe(5 * 10 + 20);
    expect(g.press(g.current === 60 ? 62 : 60, 700)).toBe('wrong');
    expect(g.streak).toBe(0);
    expect(g.bestStreak).toBe(6);
  });

  it('moves on when a note runs out, and ends after the round', () => {
    const g = new NoteRush([60, 62], () => 0, 10_000);
    g.start(0);
    const first = g.current;
    expect(g.tick(5999)).toBeUndefined();
    expect(g.tick(6000)).toBe('timeout');
    expect(g.current).not.toBe(first);
    expect(g.tick(10_000)).toBe('over');
    expect(g.press(g.current, 10_001)).toBe('ignored');
    const s = g.summary();
    expect(s).toMatchObject({ hits: 0, timeouts: 1, accuracy: 0, medianMs: 0 });
    expect(s.slowest[0]).toEqual({ name: 'C4', ms: 6000 });
  });

  it('sums up accuracy, the middle time and the slowest notes', () => {
    const g = new NoteRush([60, 62, 64], () => 0.99);
    g.start(0);
    g.press(g.current, 1000);
    g.press(g.current, 1500);
    g.press(g.current, 4500);
    g.press(70, 4600);
    const s = g.summary();
    expect(s.hits).toBe(3);
    expect(s.accuracy).toBe(75);
    expect(s.medianMs).toBe(1000);
    expect(s.slowest.map((x) => x.ms)).toEqual([...s.slowest.map((x) => x.ms)].sort((a, b) => b - a));
  });
});
