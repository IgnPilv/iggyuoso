import { describe, expect, it } from 'vitest';
import { calibrate } from '../src/modules/piano/calibration';
import { parseExercise } from '../src/modules/piano/content/load';
import type { TimedExercise } from '../src/modules/piano/content/types';
import { TimedSession } from '../src/modules/piano/engine/timedSession';
import { decodePedal } from '../src/modules/piano/midi/input';
import { expectedPedal } from '../src/modules/piano/music/timeline';
import { scorePedal, type PedalPress } from '../src/modules/piano/scoring/pedal';

const timed = (extra: Record<string, unknown>) =>
  parseExercise({ id: 'p', kind: 'timed', hand: 'left', tempo: 60, meter: '4/4', left: 'C3:h G2:h | F2:h C3:h', ...extra }) as TimedExercise;
const opts = { beatMs: 1000, windowMs: 350, initialDown: false };
// Legato pedal on four half-note chords: x:h x:h | x:h x:h
const legato = expectedPedal(timed({ pedal: 'x:h x:h | x:h x:h' }));
const press = (down: boolean, at: number): PedalPress => ({ down, at });
/** A good legato take: down just after beat 0, then up/down just after each chord. */
const good = [press(true, 150), press(false, 2020), press(true, 2180), press(false, 4020), press(true, 4180), press(false, 6020), press(true, 6180)];

describe('pedal', () => {
  it('reads CC 64 on any channel, down from 64', () => {
    expect(decodePedal([0xb0, 64, 127], 3)).toEqual({ down: true, time: 3 });
    expect(decodePedal([0xb5, 64, 63], 3)).toEqual({ down: false, time: 3 });
    expect(decodePedal([0xb0, 7, 127], 3)).toBeUndefined();
    expect(decodePedal([0x90, 64, 127], 3)).toBeUndefined();
  });

  it('parses a pedal line in the bars of the notes', () => {
    expect(legato.map((s) => [s.beat, s.beats, s.change, s.lift])).toEqual([[0, 2, false, false], [2, 2, true, false], [4, 2, true, false], [6, 2, true, true]]);
    expect(expectedPedal(timed({ pedal: 'x:h r:h | x:w' })).map((s) => [s.beat, s.change, s.lift])).toEqual([[0, false, true], [4, false, true]]);
    expect(() => timed({ pedal: 'x:h x:h' })).toThrow(/pedal has 1 bars/);
    expect(() => timed({ pedal: 'x:h x:q | x:w' })).toThrow(/pedal bar 1/);
    expect(() => timed({ pedal: 'C4:h x:h | x:w' })).toThrow(/x:h/);
  });

  it('gives full marks for clean legato pedalling', () => {
    const r = scorePedal(legato, good, opts);
    expect(r.score).toBe(100);
    expect(r.counts).toEqual({});
  });

  it('names a change held through, a change made too early, a late press and an early lift', () => {
    const held = good.filter((p) => p.at !== 2020 && p.at !== 2180);
    expect(scorePedal(legato, held, opts).counts).toEqual({ held: 1 });
    const early = good.map((p) => (p.at === 2020 ? press(false, 1500) : p.at === 2180 ? press(true, 1650) : p));
    expect(scorePedal(legato, early, opts).counts).toEqual({ 'early-change': 1 });
    const late = good.map((p) => (p.at === 2180 ? press(true, 3200) : p));
    expect(scorePedal(legato, late, opts).counts).toEqual({ 'late-press': 1 });
    const lifted = [...good, press(false, 4900), press(true, 5500)].sort((a, b) => a.at - b.at);
    expect(scorePedal(legato, lifted, opts).counts).toEqual({ 'early-lift': 1 });
    expect(scorePedal(legato, [], opts).counts).toEqual({ missing: 4 });
    expect(scorePedal(legato, held, opts).score).toBe(88);
  });

  it('wants the pedal up before a rest', () => {
    const line = expectedPedal(timed({ pedal: 'x:h r:h | x:w' }));
    expect(scorePedal(line, [press(true, 100), press(false, 1950), press(true, 4100)], opts).score).toBe(100);
    expect(scorePedal(line, [press(true, 100), press(false, 3000), press(true, 4100)], opts).counts).toEqual({ 'late-lift': 1 });
  });

  it('counts the pedal in the take score', () => {
    const ex = timed({ pedal: 'x:h x:h | x:h x:h' });
    const cal = (() => { const r = calibrate(21, 108); if (!r.ok) throw new Error(); return r.calibration; })();
    const s = new TimedSession(ex, cal, { tempo: 60, startAt: 0, latencyMs: 0, mode: 'play' });
    // Notes all on time, pedal never pressed: 75% of 100 + 25% of 0.
    for (const [i, n] of [48, 43, 41, 48].entries()) {
      s.noteOn(n, s.t0 + i * 2000);
      s.noteOff(n, s.t0 + i * 2000 + 1900);
    }
    const r = s.result();
    expect(r.pedal?.score).toBe(0);
    expect(r.score).toBe(75);
    expect(r.feedback.some((f) => f.habit === 'pedal')).toBe(true);
  });
});
