import { describe, expect, it } from 'vitest';
import { leanWords, Pulse, pulseStats, silentDrift, steadyWords, tapTempo } from '../src/modules/piano/engine/pulse';

const make = (o: Partial<ConstructorParameters<typeof Pulse>[0]> = {}) =>
  new Pulse({ tempo: 60, beatsPerBar: 4, sub: 1, startAt: 0, latencyMs: 0, ...o });

describe('Pulse', () => {
  it('starts after a bar of count-in', () => {
    expect(make().t0).toBe(4000);
    expect(make({ countInBars: 2, tempo: 120 }).t0).toBe(4000);
  });

  it('matches presses to the nearest beat, per hand', () => {
    const p = make();
    expect(p.press(60, 4030)).toMatchObject({ hand: 'right', offsetMs: 30, step: 0 });
    expect(p.press(48, 4950)).toMatchObject({ hand: 'left', offsetMs: -50, step: 1 });
  });

  it('takes latency off', () => {
    const p = make({ latencyMs: 20 });
    expect(p.press(60, 5020)?.offsetMs).toBe(0);
  });

  it('matches half beats when subdividing', () => {
    const p = make({ sub: 2 });
    expect(p.press(60, 4510)).toMatchObject({ step: 1, offsetMs: 10 });
  });

  it('ignores the count-in and later notes of a chord', () => {
    const p = make();
    expect(p.press(60, 2000)).toBeUndefined();
    expect(p.press(60, 4000)).toBeDefined();
    expect(p.press(64, 4030)).toBeUndefined();
    expect(p.press(48, 4030)).toBeDefined(); // the other hand is measured, not hidden
    expect(p.hits).toHaveLength(2);
  });

  it('marks silent bars and leaves their clicks out', () => {
    const p = make({ silent: { play: 1, rest: 1 } });
    expect([0, 1, 2, -1].map((b) => p.isSilent(b))).toEqual([false, true, false, false]);
    const clicks = p.clicks(-1, 12000);
    // count-in 0..3s, bar 0 at 4..7s, bar 1 silent, bar 2 at 12s
    expect(clicks.map((c) => c.time)).toEqual([0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 12000]);
    expect(clicks.filter((c) => c.accent).map((c) => c.time)).toEqual([0, 4000, 12000]);
    expect(p.press(60, 9000)?.silent).toBe(true);
  });

  it('does not repeat clicks across calls', () => {
    const p = make();
    const a = p.clicks(-1, 2500).map((c) => c.time);
    const b = p.clicks(2500, 4500).map((c) => c.time);
    expect([...a, ...b]).toEqual([0, 1000, 2000, 3000, 4000]);
  });
});

describe('pulse stats', () => {
  const hit = (offsetMs: number, silent = false) => ({ hand: 'right' as const, offsetMs, step: 0, silent });

  it('gives mean and spread', () => {
    expect(pulseStats([hit(10), hit(30)])).toEqual({ count: 2, mean: 20, spread: 10 });
    expect(pulseStats([])).toBeUndefined();
  });

  it('puts them in words', () => {
    expect(leanWords(8)).toBe('on the beat');
    expect(leanWords(-40)).toBe('40 ms early');
    expect(steadyWords(12)).toBe('rock steady');
    expect(steadyWords(70)).toBe('uneven');
  });

  it('finds rushing in the silent bars', () => {
    const hits = [hit(0), hit(5), hit(-5), hit(-40, true), hit(-50, true), hit(-60, true)];
    expect(silentDrift(hits)?.drift).toBe(-50);
    expect(silentDrift(hits)?.words).toMatch(/rushing/);
    expect(silentDrift(hits.slice(0, 4))).toBeUndefined();
  });

  it('works out a tapped tempo', () => {
    expect(tapTempo([0, 500, 1000, 1500])).toBe(120);
    expect(tapTempo([0, 500])).toBeUndefined();
  });
});
