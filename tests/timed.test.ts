import { describe, expect, it } from 'vitest';
import { expectedNotes } from '../src/music/timeline';
import { hitWindowMs, scoreTimed, timingPoints, type PlayedNote } from '../src/scoring/timed';
import { timed } from './helpers';

// At 60 bpm one beat is 1000 ms, which keeps the numbers readable.
const quarters = timed('id: t\nkind: timed\nhand: right\ntempo: 60\nmeter: 4/4\nright: "C4:q C4:q C4:q C4:q | C4:q C4:q C4:q C4:q"');
const opts = { tempo: 60, pitchMatch: 'exact' as const };
const perfect = (ms: number[], midi = 60): PlayedNote[] => ms.map((on) => ({ midi, on, off: on + 400 }));
const beats = (n: number, shift = (_i: number) => 0) => Array.from({ length: n }, (_, i) => i * 1000 + shift(i));

describe('timing points', () => {
  it('gives full points inside 50 ms and half at the window edge', () => {
    const w = hitWindowMs(60);
    expect(w).toBe(350);
    expect(timingPoints(-50, w)).toBe(1);
    expect(timingPoints(349.999, w)).toBeCloseTo(0.5, 3);
    expect(timingPoints(400, w)).toBe(0);
  });
});

describe('scoreTimed, one hand', () => {
  it('scores a clean run 100 with three stars', () => {
    const r = scoreTimed(expectedNotes(quarters), perfect(beats(8)), opts);
    expect(r.score).toBe(100);
    expect(r.stars).toBe(3);
    expect(r.feedback.map((f) => f.habit)).toEqual(['clean']);
  });

  it('notices a hand that is consistently early', () => {
    const r = scoreTimed(expectedNotes(quarters), perfect(beats(8, () => -90)), opts);
    expect(r.hands[0].meanOffsetMs).toBe(-90);
    expect(r.feedback[0]).toMatchObject({ hand: 'right', habit: 'early' });
  });

  it('notices rushing (getting earlier and earlier)', () => {
    const r = scoreTimed(expectedNotes(quarters), perfect(beats(8, (i) => -i * 25)), opts);
    expect(r.hands[0].driftMs).toBeLessThan(-80);
    expect(r.feedback.map((f) => f.habit)).toContain('rushing');
  });

  it('notices uneven beats', () => {
    const r = scoreTimed(expectedNotes(quarters), perfect(beats(8, (i) => (i % 2 ? 120 : -120))), opts);
    expect(r.feedback.map((f) => f.habit)).toContain('uneven');
    expect(r.feedback.map((f) => f.habit)).not.toContain('early');
  });

  it('counts misses, wrong notes and extras separately', () => {
    const played = perfect(beats(8)).filter((_, i) => i !== 2); // miss beat 3
    played[4] = { ...played[4], midi: 62 }; // wrong note on beat 6
    played.push({ midi: 60, on: 7500, off: 7600 }); // extra between beats
    const r = scoreTimed(expectedNotes(quarters), played, opts);
    expect(r.hands[0]).toMatchObject({ hits: 6, misses: 1, wrong: 1, extras: 1 });
    expect(r.score).toBe(Math.round((100 * (6 - 0.5)) / 8));
    expect(r.feedback.map((f) => f.habit)).toEqual(['missed', 'wrong-notes', 'extra-notes']);
  });

  it('accepts any octave with pitchMatch: pitchClass', () => {
    const r = scoreTimed(expectedNotes(quarters), perfect(beats(8), 48), { ...opts, pitchMatch: 'pitchClass' });
    expect(r.score).toBe(100);
  });

  it('flags long notes released too soon', () => {
    const ex = timed('id: t\nkind: timed\nhand: left\ntempo: 60\nmeter: 4/4\nleft: "C3:h C3:h | C3:w"');
    const r = scoreTimed(expectedNotes(ex), [
      { midi: 48, on: 0, off: 1900 },
      { midi: 48, on: 2000, off: 2600 }, // held 0.6 of 2 beats
      { midi: 48, on: 4000, off: 5000 }, // held 1 of 4 beats
    ], opts);
    expect(r.hands[0].shortHolds).toBe(2);
    expect(r.feedback[0]).toMatchObject({ hand: 'left', habit: 'short-holds' });
  });

  it('times a chord from its first note', () => {
    const ex = timed('id: t\nkind: timed\nhand: right\ntempo: 60\nmeter: 4/4\nright: "C4+E4+G4:w"');
    const r = scoreTimed(expectedNotes(ex), [
      { midi: 60, on: 10 }, { midi: 64, on: 40 }, { midi: 67, on: 65 },
    ], opts);
    expect(r.notes.map((n) => n.offsetMs)).toEqual([10, 10, 10]);
    expect(r.score).toBe(100);
  });
});

describe('scoreTimed, two hands', () => {
  const together = timed('id: t\nkind: timed\nhand: together\ntempo: 60\nmeter: 4/4\nright: "C4:q E4:q G4:q E4:q"\nleft: "C3:h G3:h"');

  it('scores each hand and says which one gave way', () => {
    const played: PlayedNote[] = [
      ...perfect([0, 1000, 2000, 3000]).map((p, i) => ({ ...p, midi: [60, 64, 67, 64][i] })),
      { midi: 48, on: 0, off: 1900 },
      { midi: 50, on: 2000, off: 3900 }, // wrong: D3 instead of G3
    ];
    const r = scoreTimed(expectedNotes(together), played, opts);
    const [right, left] = r.hands;
    expect(right).toMatchObject({ hand: 'right', score: 100 });
    expect(left).toMatchObject({ hand: 'left', score: 50, wrong: 1 });
    expect(r.feedback[0]).toMatchObject({ hand: 'left', habit: 'weaker-hand' });
  });

  it('measures how far apart the hands land on shared beats', () => {
    const played: PlayedNote[] = [
      ...perfect([0, 1000, 2000, 3000]).map((p, i) => ({ ...p, midi: [60, 64, 67, 64][i] })),
      { midi: 48, on: 80, off: 1900 },
      { midi: 55, on: 2080, off: 3900 },
    ];
    const r = scoreTimed(expectedNotes(together), played, opts);
    expect(r.together).toEqual({ sharedBeats: 2, meanGapMs: 80 });
    expect(r.feedback.map((f) => f.habit)).toContain('hands-apart');
  });

  it('keeps both hands apart when they share middle C (taking turns)', () => {
    const turns = timed('id: t\nkind: timed\nhand: alternating\ntempo: 60\nmeter: 4/4\nright: "C4:w | r:w"\nleft: "r:w | C4:w"');
    const r = scoreTimed(expectedNotes(turns), [{ midi: 60, on: 0 }, { midi: 60, on: 4000 }], opts);
    expect(r.hands.map((h) => h.score)).toEqual([100, 100]);
    expect(r.together).toBeNull();
  });

  it('blames an extra note on the nearest hand, else by side of middle C', () => {
    const r = scoreTimed(expectedNotes(together), [{ midi: 40, on: 1500 }], opts);
    expect(r.extras[0].hand).toBe('left');
  });
});

describe('scoreTimed, small gaps between hands', () => {
  const both = timed('id: t\nkind: timed\nhand: together\ntempo: 60\nmeter: 4/4\nright: "C4:w"\nleft: "C3:w"');
  for (const gap of [30, 55, 59, 61]) {
    it(`sees a ${gap} ms gap between the hands`, () => {
      const r = scoreTimed(expectedNotes(both), [{ midi: 48, on: 0 }, { midi: 60, on: gap }], opts);
      expect(r.together).toEqual({ sharedBeats: 1, meanGapMs: gap });
      expect(r.notes.find((n) => n.expected.hand === 'right')!.offsetMs).toBe(gap);
      expect(r.notes.find((n) => n.expected.hand === 'left')!.offsetMs).toBe(0);
    });
  }
});

describe('scoreTimed, count-in', () => {
  it('ignores presses during the count-in', () => {
    const r = scoreTimed(expectedNotes(quarters), [{ midi: 60, on: -2000 }, { midi: 60, on: -1000 }, ...perfect(beats(8))], opts);
    expect(r.extras).toHaveLength(0);
    expect(r.score).toBe(100);
  });
});

describe('fingering', () => {
  it('attaches each hand its own finger numbers', () => {
    const ex = timed('id: t\nkind: timed\ntempo: 60\nmeter: 4/4\nright: "C4:h D4:h"\nleft: "C3:w"\nrightFingers: "1 2"\nleftFingers: "5"');
    expect(expectedNotes(ex).map((e) => `${e.hand}:${e.finger}`)).toEqual(['left:5', 'right:1', 'right:2']);
  });
});
