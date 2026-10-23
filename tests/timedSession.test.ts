import { describe, expect, it } from 'vitest';
import { calibrate, type Calibration } from '../src/calibration';
import { TimedSession } from '../src/engine/timedSession';
import { timed } from './helpers';

const cal = (lo: number, hi: number): Calibration => {
  const r = calibrate(lo, hi);
  if (!r.ok) throw new Error(r.error);
  return r.calibration;
};
const ex = timed('id: t\nkind: timed\nhand: right\ntempo: 60\nmeter: 4/4\ncountIn: 1\nright: "C4:q D4:q E4:h"');

describe('TimedSession', () => {
  const s = () => new TimedSession(ex, cal(21, 108), { tempo: 60, startAt: 1000, latencyMs: 40, mode: 'play' });

  it('puts the first downbeat after a bar of count-in', () => {
    const x = s();
    expect(x.t0).toBe(5000);
    expect(x.clicks(false).map((c) => c.time)).toEqual([1000, 2000, 3000, 4000]);
    expect(x.clicks(true)).toHaveLength(8);
    expect(x.guide().map((g) => g.time)).toEqual([5000, 6000, 7000]);
  });

  it('takes a short count-in ("3 4") or none, and the click: count-in / off settings', () => {
    const short = new TimedSession(ex, cal(21, 108), { tempo: 60, startAt: 1000, latencyMs: 0, mode: 'play', countIn: 'short' });
    expect(short.t0).toBe(3000);
    expect(short.clicks(false).map((c) => c.accent)).toEqual([false, false]);
    expect(short.position(1000)).toMatchObject({ phase: 'count-in', count: 3 });
    expect(short.position(2000)).toMatchObject({ phase: 'count-in', count: 4 });
    const none = new TimedSession(ex, cal(21, 108), { tempo: 60, startAt: 1000, latencyMs: 0, mode: 'play', countIn: 'none' });
    expect(none.t0).toBe(2000); // one silent beat to get ready
    expect(none.clicks(false)).toEqual([]);
    expect(none.position(1500).count).toBeUndefined();
    const six = timed('id: t\nkind: timed\nhand: right\ntempo: 60\nmeter: 6/8\nright: "C4:q. D4:q."');
    expect(new TimedSession(six, cal(21, 108), { tempo: 60, startAt: 0, latencyMs: 0, mode: 'play', countIn: 'short' }).clicks(false)).toHaveLength(1);
    const inner = timed('id: t\nkind: timed\nhand: right\ntempo: 60\nmeter: 4/4\nclick: count-in\nright: "C4:q D4:q E4:h"');
    expect(new TimedSession(inner, cal(21, 108), { tempo: 60, startAt: 0, latencyMs: 0, mode: 'play' }).clicks(true)).toHaveLength(4);
    const off = timed('id: t\nkind: tap\ntempo: 60\nmeter: 4/4\nclick: off\nrhythm: "x:q x:q x:h"');
    expect(new TimedSession(off, cal(21, 108), { tempo: 60, startAt: 0, latencyMs: 0, mode: 'play' }).clicks(true)).toEqual([]);
    expect(() => timed('id: t\nkind: timed\nhand: right\ntempo: 60\nmeter: 4/4\nclick: loud\nright: "C4:w"')).toThrow();
  });

  it('counts in and follows the music as the player hears it (shifted by latency)', () => {
    const x = s();
    expect(x.position(500).phase).toBe('waiting');
    expect(x.position(1040)).toMatchObject({ phase: 'count-in', count: 1 });
    expect(x.position(4040)).toMatchObject({ phase: 'count-in', count: 4 });
    expect(x.position(5040)).toMatchObject({ phase: 'playing', beat: 0 });
    expect(x.position(6540).beat).toBeCloseTo(1.5);
    expect(x.position(x.end).phase).toBe('done');
  });

  it('removes latency from key presses before scoring', () => {
    const x = s();
    x.noteOn(60, 5040); x.noteOff(60, 5900);
    x.noteOn(62, 6040);
    x.noteOn(64, 7040); x.noteOff(64, 8900);
    expect(x.played.map((p) => p.on)).toEqual([0, 1000, 2000]);
    expect(x.result().score).toBe(100);
  });

  it('maps keys through calibration on a shifted board', () => {
    const x = new TimedSession(ex, cal(33, 120), { tempo: 60, startAt: 0, latencyMs: 0, mode: 'play' });
    x.noteOn(72, x.t0);
    expect(x.played[0].midi).toBe(60);
  });

  it('records nothing in listen mode', () => {
    const x = new TimedSession(ex, cal(21, 108), { tempo: 60, startAt: 0, latencyMs: 0, mode: 'listen' });
    x.noteOn(60, x.t0);
    expect(x.played).toHaveLength(0);
  });

  it('tracks live note state for drawing', () => {
    const x = s();
    const [c, d] = x.expected;
    expect(x.liveState(c, -1)).toBe('coming');
    expect(x.liveState(c, 0.2)).toBe('now');
    x.noteOn(60, 5050);
    expect(x.liveState(c, 0.2)).toBe('hit');
    expect(x.liveState(d, 1.5)).toBe('missed');
  });

  it('judges each press as it happens', () => {
    const x = s();
    expect(x.noteOn(60, 1500)).toBeUndefined(); // count-in
    expect(x.noteOn(60, 5100)).toMatchObject({ kind: 'hit', offsetMs: 60 });
    expect(x.noteOn(64, 6040)).toMatchObject({ kind: 'wrong', expected: { midi: 62 } });
    expect(x.noteOn(72, 6540)).toMatchObject({ kind: 'extra' });
  });

  it('keeps a running score of the finished part only', () => {
    const x = s();
    expect(x.liveScore(5000).score).toBe(100);
    x.noteOn(60, 5040);
    expect(x.liveScore(5500)).toMatchObject({ hits: 1, missed: 0, score: 100 });
    expect(x.liveScore(6500)).toMatchObject({ hits: 1, missed: 1, score: 50 });
  });
});
