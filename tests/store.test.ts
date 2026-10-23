import { describe, expect, it } from 'vitest';
import { memoryBackend, Store } from '../src/progress/store';

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
});
