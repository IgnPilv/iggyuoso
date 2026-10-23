import { describe, expect, it } from 'vitest';
import { calibrate } from '../src/calibration';
import { parseExercise } from '../src/content/load';
import type { TimedExercise } from '../src/content/types';
import { TimedSession } from '../src/engine/timedSession';
import { sliceBars } from '../src/engine/practice';
import { expectedDynamics } from '../src/music/timeline';
import { dynamicSpans, dynamicsMessages, scoreDynamics } from '../src/scoring/dynamics';
import type { PlayedNote } from '../src/scoring/timed';

const timed = (dynamics: string, right = 'C4:q D4:q E4:q F4:q | G4:q F4:q E4:q D4:q | C4:q D4:q E4:q F4:q | G4:w') =>
  parseExercise({ id: 'd', kind: 'timed', hand: 'right', tempo: 60, meter: '4/4', right, dynamics }) as TimedExercise;
const opts = { beatMs: 1000, windowMs: 350 };
/** Quarter notes on every beat of `bars` bars, each bar at its own velocity (or a function of the beat). */
const take = (vel: (beat: number) => number, beats: number): PlayedNote[] =>
  Array.from({ length: beats }, (_, b) => ({ midi: 60, on: b * 1000 + 10, off: b * 1000 + 900, velocity: vel(b) }));

describe('dynamics', () => {
  it('reads one mark per bar into spans', () => {
    const ex = timed('p | - | f | f');
    expect(ex.dynamics).toEqual(['p', '-', 'f', 'f']);
    expect(expectedDynamics(ex)).toEqual([
      { beat: 0, beats: 8, bars: [1, 2], level: 1 },
      { beat: 8, beats: 8, bars: [3, 4], level: 4 },
    ]);
    expect(dynamicSpans(['p', '<', 'f'], 4)[1]).toMatchObject({ hairpin: 1, level: 1, bars: [2, 2] });
    expect(timed('f | dim. | p | p').dynamics).toEqual(['f', '>', 'p', 'p']);
  });

  it('refuses marks that do not add up', () => {
    expect(() => timed('p | f | f')).toThrow(/3 bars/);
    expect(() => timed('loud | f | f | f')).toThrow(/unknown mark/);
    expect(() => timed('- | f | f | f')).toThrow(/level/);
    expect(() => timed('f | < | p | p')).toThrow(/louder/);
    expect(() => timed('p | p | p | <')).toThrow(/needs a level after/);
  });

  it('hears a clear change from p to f', () => {
    const spans = expectedDynamics(timed('p | p | f | f'));
    const good = scoreDynamics(spans, take((b) => (b < 8 ? 45 : 90), 16), opts);
    expect(good.measured).toBe(true);
    expect(good.score).toBe(100);
    expect(dynamicsMessages(good)).toEqual([]);
    // Only a little louder: partial credit, and the message says so.
    const small = scoreDynamics(spans, take((b) => (b < 8 ? 60 : 70), 16), opts);
    expect(small.score).toBeGreaterThan(0);
    expect(small.score).toBeLessThan(75);
    expect(dynamicsMessages(small)[0]).toMatch(/Bars 3–4 \(f\) were only a little louder than the p before/);
    // The wrong way round: nothing.
    const wrong = scoreDynamics(spans, take((b) => (b < 8 ? 90 : 60), 16), opts);
    expect(wrong.score).toBe(0);
    expect(dynamicsMessages(wrong)[0]).toMatch(/were not louder/);
  });

  it('wants a crescendo to grow through its bar', () => {
    const spans = expectedDynamics(timed('p | < | f | f'));
    const grows = scoreDynamics(spans, take((b) => (b < 4 ? 45 : b < 8 ? 45 + (b - 4) * 10 : 90), 16), opts);
    expect(grows.checks.map((c) => c.ok)).toEqual([true, true]);
    const flat = scoreDynamics(spans, take((b) => (b < 8 ? 45 : 90), 16), opts);
    const hairpin = flat.checks.find((c) => c.kind === 'hairpin')!;
    expect(hairpin.ok).toBe(false); // flat, then a jump onto the f: the change is heard, the growing is not
    expect(flat.checks.find((c) => c.kind === 'change')!.ok).toBe(true);
    const sudden = scoreDynamics(spans, take((b) => (b < 4 ? 45 : b < 8 ? 50 : 52), 16), opts);
    expect(sudden.checks.every((c) => !c.ok)).toBe(true);
    expect(dynamicsMessages(sudden).join(' ')).toMatch(/crescendo in bar 2 did not grow/);
  });

  it('does not score a keyboard that sends one strength for every key', () => {
    const spans = expectedDynamics(timed('p | p | f | f'));
    const r = scoreDynamics(spans, take(() => 80, 16), opts);
    expect(r.measured).toBe(false);
    expect(dynamicsMessages(r)[0]).toMatch(/same strength/);
  });

  it('counts for a fifth of the take, and not at all when it cannot be measured', () => {
    const c = calibrate(21, 108);
    if (!c.ok) throw new Error('calibration');
    const cal = c.calibration;
    const ex = timed('p | p | f | f');
    const run = (vel: (beat: number) => number) => {
      const s = new TimedSession(ex, cal, { tempo: 60, startAt: 0, latencyMs: 0, mode: 'play' });
      const notes = [60, 62, 64, 65, 67, 65, 64, 62, 60, 62, 64, 65, 67];
      notes.forEach((n, i) => {
        const beat = Math.min(i, 12);
        s.noteOn(n, s.t0 + beat * 1000, vel(beat));
        s.noteOff(n, s.t0 + beat * 1000 + (i === 12 ? 3900 : 900));
      });
      return s.result();
    };
    const flat = run(() => 70);
    expect(flat.dynamics?.measured).toBe(false);
    expect(flat.score).toBe(100);
    const wrong = run((b) => (b < 8 ? 90 : 50));
    expect(wrong.dynamics?.score).toBe(0);
    expect(wrong.score).toBe(80);
    expect(wrong.feedback.some((f) => f.habit === 'dynamics')).toBe(true);
    expect(run((b) => (b < 8 ? 40 : 95)).score).toBe(100);
  });

  it('leaves the marks out of a loop of bars', () => {
    expect(sliceBars(timed('p | < | f | f'), 1, 2).dynamics).toBeUndefined();
  });
});
