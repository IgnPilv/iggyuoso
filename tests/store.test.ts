import { describe, expect, it } from 'vitest';
import { parseExercise } from '../src/modules/piano/content/load';
import { memoryBackend, SCHEMA_VERSION, Store } from '../src/modules/piano/progress/store';

describe('progress store', () => {
  it('keeps the best counting attempt only', () => {
    const s = new Store(memoryBackend());
    const at = '2026-10-23';
    s.record('x', { at, score: 70, stars: 1, tempo: 60, counts: true });
    s.record('x', { at, score: 99, stars: 3, tempo: 30, counts: false }); // slow practice
    s.record('x', { at, score: 85, stars: 2, tempo: 60, counts: true });
    const p = s.exercise('x');
    expect(p.attempts).toBe(3);
    expect(p.best?.score).toBe(85);
    expect(p.last?.score).toBe(85);
  });

  it('has default settings', () => {
    expect(new Store(memoryBackend()).settings).toEqual({ latencyMs: 0, metronome: true, guide: false, theme: 'system' });
  });

  it('marks a lesson done only when every exercise has its clean takes, on enough days', () => {
    const s = new Store(memoryBackend());
    const a = { id: 'a', reps: 2, days: 1 };
    const b = { id: 'b', reps: 2, days: 2 };
    const day1 = '2026-10-23T10:00:00';
    const day2 = '2026-10-24T10:00:00';
    s.record('a', { at: day1, score: 95, stars: 3, tempo: 60, counts: true });
    s.record('a', { at: day1, score: 90, stars: 2, tempo: 60, counts: true }); // not clean
    s.record('a', { at: day1, score: 99, stars: 3, tempo: 30, counts: false }); // too slow
    expect(s.reps(a)).toMatchObject({ clean: 1, days: 1, done: false, left: 1, later: 0, today: true });
    s.record('a', { at: day1, score: 93, stars: 3, tempo: 60, counts: true });
    expect(s.reps(a).done).toBe(true);
    s.record('b', { at: day1, score: 95, stars: 3, tempo: 60, counts: true });
    s.record('b', { at: day1, score: 95, stars: 3, tempo: 60, counts: true });
    expect(s.reps(b, new Date(day1))).toMatchObject({ clean: 2, days: 1, done: false, left: 1, later: 1, today: false });
    expect(s.reps(b, new Date(day2))).toMatchObject({ left: 1, later: 0, today: true });
    expect(s.lessonDone([a, b])).toBe(false);
    s.record('b', { at: day2, score: 92, stars: 3, tempo: 60, counts: true });
    expect(s.lessonDone([a, b])).toBe(true);
    expect(s.lessonDone([])).toBe(false);
  });

  it('says how many clean takes are left, and how many must wait for later days', () => {
    const s = new Store(memoryBackend());
    const g = { id: 'g', reps: 3, days: 2 };
    const today = new Date('2026-10-24T12:00:00');
    expect(s.reps(g, today)).toMatchObject({ left: 3, later: 1, today: true });
    s.record('g', { at: '2026-10-24T10:00:00', score: 95, stars: 3, tempo: 60, counts: true });
    // Two more: one can be today, the other tomorrow or later.
    expect(s.reps(g, today)).toMatchObject({ left: 2, later: 1, today: true });
    s.record('g', { at: '2026-10-24T10:05:00', score: 95, stars: 3, tempo: 60, counts: true });
    // Only another day counts now.
    expect(s.reps(g, today)).toMatchObject({ left: 1, later: 1, today: false });
    expect(s.reps({ id: 'g', reps: 3, days: 3 }, today)).toMatchObject({ left: 2, later: 2, today: false });
  });

  it('reads reps and days from the content, 3 and 1 by default', () => {
    const base = { id: 'r', kind: 'sequence', notes: 'C4 D4' };
    expect(parseExercise(base)).toMatchObject({ reps: 3, days: 1 });
    expect(parseExercise({ ...base, reps: 5, days: 2 })).toMatchObject({ reps: 5, days: 2 });
    expect(() => parseExercise({ ...base, reps: 0 })).toThrow();
    expect(() => parseExercise({ ...base, reps: 2.5 })).toThrow();
    expect(() => parseExercise({ ...base, reps: 1, days: 2 })).toThrow();
  });

  it('counts a clean best saved before reps existed as one clean take', () => {
    const b = memoryBackend();
    b.set('iggyuoso.ex.old', JSON.stringify({ attempts: 4, passed: true, best: { at: '2026-10-20T09:00:00', score: 96, stars: 3, tempo: 80, counts: true } }));
    expect(new Store(b).reps({ id: 'old', reps: 3, days: 1 })).toMatchObject({ clean: 1, days: 1, done: false });
  });

  it('stamps the saved data with a schema version', () => {
    const b = memoryBackend();
    b.set('iggyuoso.calibration', JSON.stringify({ low: 21 }));
    const s = new Store(b);
    expect(b.get('iggyuoso.schema')).toBe(String(SCHEMA_VERSION));
    expect(s.calibration?.low).toBe(21);
  });
});
