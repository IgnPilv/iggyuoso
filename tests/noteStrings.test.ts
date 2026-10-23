import { describe, expect, it } from 'vitest';
import { calibrate } from '../src/calibration';
import { TimedSession } from '../src/engine/timedSession';
import { parseMeter, parseTimedNotes } from '../src/music/notes';
import { expectedNotes, totalBeats } from '../src/music/timeline';
import { parseExercise } from '../src/content/load';
import type { TimedExercise } from '../src/content/types';

const timed = (extra: Record<string, unknown>) =>
  parseExercise({ id: 't', kind: 'timed', hand: 'right', tempo: 60, meter: '4/4', ...extra }) as TimedExercise;
const cal = (() => { const r = calibrate(21, 108); if (!r.ok) throw new Error(); return r.calibration; })();

describe('richer note strings', () => {
  it('reads sixteenths and triplets', () => {
    const t = parseTimedNotes('C4:s E4:e. F4:e3 G4:e3 A4:e3 B4:q3 C5:q3 D5:q3');
    expect(t.map((x) => x.beats).reduce((a, b) => a + b)).toBeCloseTo(4);
    expect(t[0].value).toBe(0.25);
    expect(t[1]).toMatchObject({ value: 0.5, dotted: true, beats: 0.75 });
    expect(t[2]).toMatchObject({ value: 0.5, triplet: true });
    expect(t[2].beats).toBeCloseTo(1 / 3);
    expect(() => parseTimedNotes('C4:h3')).toThrow();
    expect(() => parseTimedNotes('C4:q.3')).toThrow();
    // Bars of triplets add up despite rounding.
    expect(() => timed({ right: 'C4:e3 D4:e3 E4:e3 F4:e3 G4:e3 A4:e3 B4:h' })).not.toThrow();
  });

  it('holds a tied note as one note, across a bar line too', () => {
    const ex = timed({ right: 'C4:q D4:q E4:h~ | E4:q F4:q G4:h', fingers: '1 2 3 4 5' });
    const notes = expectedNotes(ex);
    expect(notes.map((n) => [n.midi, n.beat, n.beats])).toEqual([[60, 0, 1], [62, 1, 1], [64, 2, 3], [65, 5, 1], [67, 6, 2]]);
    expect(notes.map((n) => n.finger)).toEqual([1, 2, 3, 4, 5]);
    expect(() => parseTimedNotes('C4:q~ D4:q')).toThrow(/same note/);
    expect(() => parseTimedNotes('C4:q~')).toThrow();
    expect(() => parseTimedNotes('r:q~ r:q')).toThrow();
    expect(parseTimedNotes('C4+E4:h~ E4+C4:h')[0].tie).toBe(true);
  });

  it('starts an upbeat so that it leads into the first downbeat', () => {
    const ex = timed({ pickup: 'q', right: 'G4:q | C5:q D5:q E5:h | F5:h E5:q' });
    expect(ex.pickup).toBe(1);
    expect(ex.bars).toBe(3);
    expect(expectedNotes(ex)[0].beat).toBe(3);
    expect(expectedNotes(ex)[1].beat).toBe(4);
    expect(totalBeats(ex)).toBe(12);
    expect(timed({ pickup: 'e e', right: 'G4:e A4:e | C5:w' }).pickup).toBe(1);
    expect(() => timed({ pickup: 'h', right: 'G4:q | C5:w' })).toThrow(/upbeat/);
    expect(() => timed({ pickup: 'w', right: 'G4:w | C5:w' })).toThrow(/shorter/);
    // Without a pickup, a short first bar is still an error.
    expect(() => timed({ right: 'G4:q | C5:w' })).toThrow(/bar 1/);
  });

  it('counts compound meters in dotted quarters', () => {
    expect(parseMeter('6/8')).toMatchObject({ quarters: 3, pulse: 1.5 });
    expect(parseMeter('3/8')).toMatchObject({ quarters: 1.5, pulse: 0.5 });
    expect(parseMeter('2/2')).toMatchObject({ quarters: 4, pulse: 2 });
    expect(parseMeter('3/4').pulse).toBe(1);
    const ex = timed({ meter: '6/8', tempo: 60, right: 'C4:e D4:e E4:e F4:q. | G4:q. r:q.' });
    const s = new TimedSession(ex, cal, { tempo: 60, startAt: 0, latencyMs: 0, mode: 'play' });
    // 60 dotted quarters a minute: a quarter is 2/3 s, so a bar of 6/8 lasts 2 s with two clicks.
    expect(s.beatMs).toBeCloseTo(2000 / 3);
    expect(s.clicks(false).map((c) => Math.round(c.time))).toEqual([0, 1000]);
    expect(s.clicks(false).map((c) => c.accent)).toEqual([true, false]);
    expect(s.position(1100)).toMatchObject({ phase: 'count-in', count: 2 });
    expect(Math.round(s.t0)).toBe(2000);
  });
});
