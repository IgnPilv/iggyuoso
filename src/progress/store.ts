import type { Calibration } from '../calibration';

// Progress lives in localStorage for now. Everything goes through a small key-value backend so
// it can be swapped for an account later.

export interface Backend {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export const localBackend: Backend = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage full or blocked */ } },
};

export function memoryBackend(): Backend {
  const m = new Map<string, string>();
  return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v) };
}

export interface Attempt {
  at: string;
  score: number;
  stars: number;
  tempo: number;
  /** Per-hand scores for timed exercises. */
  hands?: Partial<Record<'right' | 'left', number>>;
  /** Counts toward the record (played at 90% of the written tempo or faster). */
  counts: boolean;
}

export interface ExerciseProgress {
  best?: Attempt;
  attempts: number;
  last?: Attempt;
}

export interface Settings {
  /** Extra ms added to the measured audio latency; positive = the player hears clicks later. */
  latencyMs: number;
  metronome: boolean;
  guide: boolean;
}

const DEFAULT_SETTINGS: Settings = { latencyMs: 0, metronome: true, guide: false };
const PREFIX = 'iggyuoso.';

export class Store {
  constructor(private backend: Backend = localBackend) {}

  private read<T>(key: string): T | undefined {
    const v = this.backend.get(PREFIX + key);
    if (v === null) return undefined;
    try { return JSON.parse(v) as T; } catch { return undefined; }
  }

  private write(key: string, v: unknown) {
    this.backend.set(PREFIX + key, JSON.stringify(v));
  }

  get calibration(): Calibration | undefined { return this.read('calibration'); }
  set calibration(c: Calibration | undefined) { this.write('calibration', c); }

  get settings(): Settings { return { ...DEFAULT_SETTINGS, ...this.read<Partial<Settings>>('settings') }; }
  set settings(s: Settings) { this.write('settings', s); }

  exercise(id: string): ExerciseProgress {
    return this.read<ExerciseProgress>(`ex.${id}`) ?? { attempts: 0 };
  }

  record(id: string, a: Attempt): ExerciseProgress {
    const p = this.exercise(id);
    p.attempts++;
    p.last = a;
    if (a.counts && (!p.best || a.score > p.best.score)) p.best = a;
    this.write(`ex.${id}`, p);
    return p;
  }

  lessonDone(id: string): boolean { return this.read<boolean>(`lesson.${id}`) ?? false; }
  markLessonDone(id: string) { this.write(`lesson.${id}`, true); }
}

export const store = new Store();
