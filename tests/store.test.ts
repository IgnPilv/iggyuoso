import { describe, expect, it } from 'vitest';
import { memoryBackend, SCHEMA_VERSION, Store } from '../src/progress/store';

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
    expect(new Store(memoryBackend()).settings).toEqual({ latencyMs: 0, metronome: true, guide: false });
  });

  it('marks a lesson done only when every exercise passed at a tempo that counts', () => {
    const s = new Store(memoryBackend());
    const at = '2026-10-23';
    s.record('a', { at, score: 90, stars: 2, tempo: 60, counts: true });
    s.record('b', { at, score: 99, stars: 3, tempo: 30, counts: false });
    expect(s.lessonDone(['a', 'b'])).toBe(false);
    s.record('b', { at, score: 70, stars: 1, tempo: 60, counts: true });
    expect(s.lessonDone(['a', 'b'])).toBe(true);
  });

  it('stamps the saved data with a schema version', () => {
    const b = memoryBackend();
    b.set('iggyuoso.calibration', JSON.stringify({ low: 21 }));
    const s = new Store(b);
    expect(b.get('iggyuoso.schema')).toBe(String(SCHEMA_VERSION));
    expect(s.calibration?.low).toBe(21);
  });
});
