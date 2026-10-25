import type { Calibration } from '../calibration';
import { STAR_THRESHOLDS } from '../scoring/stars';
import { deviceData, PREFIX, SCHEMA_VERSION, type Backend, localBackend } from '../../../core/storage';

// Piano progress, on top of the shared device storage (src/core/storage.ts). The piano module
// predates modules, so its records keep their old names (`iggyuoso.ex.<id>`, `iggyuoso.mastery.*`,
// ...) with no module prefix; see `PIANO_RECORDS` in records.ts.

export { localBackend, memoryBackend, type Backend } from '../../../core/storage';

export interface Attempt {
  at: string;
  score: number;
  stars: number;
  tempo: number;
  /** Per-hand scores for timed exercises. */
  hands?: Partial<Record<'right' | 'left', number>>;
  /** Timing per hand for timed takes: average offset (negative = early) and spread, in ms. */
  timing?: Partial<Record<'right' | 'left', { mean: number; spread: number | null }>>;
  /** Counts toward the record (played at 90% of the written tempo or faster). */
  counts: boolean;
}

export interface ExerciseProgress {
  best?: Attempt;
  attempts: number;
  last?: Attempt;
  /** Passed (★ or better) at least once, at a tempo that counts. */
  passed?: boolean;
  /** Clean takes (★★★ at a tempo that counts), and the days they were played on. */
  clean?: number;
  cleanDays?: string[];
}

/** What an exercise needs before it is done (from the content: `reps`, `days`). */
export interface RepsGoal {
  id: string;
  reps: number;
  days: number;
}

/** Where an exercise stands against its goal. */
export interface RepsProgress {
  clean: number;
  days: number;
  done: boolean;
  /** Clean takes still needed (counting the extra days a take must be spread over). */
  left: number;
  /** How many of those must wait for later days, one per day (today's take only adds one day). */
  later: number;
  /** Whether a clean take today still counts towards the goal. */
  today: boolean;
}

/** Score of a clean take. */
export const CLEAN_SCORE = STAR_THRESHOLDS[2];

export interface Settings {
  /** Extra ms added to the measured audio latency; positive = the player hears clicks later. */
  latencyMs: number;
  metronome: boolean;
  guide: boolean;
  /** Last view the player picked; unset = each exercise's own default. */
  view?: 'classic' | 'falling';
  /** Look of the app; 'system' follows the device. index.html reads this before first paint. */
  theme: 'system' | 'light' | 'dark';
  /** Play with the computer keyboard (A S D F ... as white keys). Off unless switched on. */
  computerKeys?: boolean;
  /** Tempo in percent the player last picked; the next exercise starts there too. */
  tempo?: number;
  /** Count-in before timed exercises: a full bar, the last two beats ("3 4"), or none. */
  countIn?: 'bar' | 'short' | 'none';
  /** Whether the exercise Options drawer was left open. */
  optionsOpen?: boolean;
  /** Finger numbers on the notes (falling notes, sheet, lit keys); unset = on. */
  fingers?: boolean;
}

/** Local calendar day (YYYY-MM-DD) of an ISO time. */
export function localDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DEFAULT_SETTINGS: Settings = { latencyMs: 0, metronome: true, guide: false, theme: 'system' };

/** Upgrade steps of the shared schema version (src/core/storage.ts) for piano records. */
const MIGRATIONS: Record<number, (s: Store) => void> = {
  // 0 -> 1: the first release saved the same shapes without a version number.
  1: () => {},
};

export class Store {
  constructor(private backend: Backend = localBackend) {
    this.migrate();
  }

  private migrate() {
    const v = this.read<number>('schema') ?? 0;
    if (v > SCHEMA_VERSION) return; // saved by a newer app; leave it alone
    this.upgradeFrom(v);
  }

  /**
   * Run the upgrade steps after version `v`. Also used when sync brings in records saved by an
   * older app, so every step must leave records that are already upgraded as they are.
   */
  upgradeFrom(v: number) {
    while (v < SCHEMA_VERSION) {
      v++;
      MIGRATIONS[v]?.(this);
    }
    this.write('schema', SCHEMA_VERSION);
  }

  private read<T>(key: string): T | undefined {
    const v = this.backend.get(PREFIX + key);
    if (v === null) return undefined;
    try { return JSON.parse(v) as T; } catch { return undefined; }
  }

  private write(key: string, v: unknown) {
    this.backend.set(PREFIX + key, JSON.stringify(v));
  }

  /** Other saved records (the mastery store keeps its own under these keys). */
  get<T>(key: string): T | undefined { return this.read<T>(key); }
  put(key: string, v: unknown) { this.write(key, v); }
  /** Names of saved records that start with `prefix` (without the app's own prefix). */
  keys(prefix: string): string[] {
    return (this.backend.keys?.() ?? []).filter((k) => k.startsWith(PREFIX + prefix)).map((k) => k.slice(PREFIX.length));
  }

  get calibration(): Calibration | undefined { return this.read('calibration'); }
  set calibration(c: Calibration | undefined) { this.write('calibration', c); }

  get settings(): Settings { return { ...DEFAULT_SETTINGS, ...this.read<Partial<Settings>>('settings') }; }
  set settings(s: Settings) { this.write('settings', s); }

  exercise(id: string): ExerciseProgress {
    const p = this.read<ExerciseProgress>(`ex.${id}`) ?? { attempts: 0 };
    // Saved before clean takes were counted: a clean best counts as one.
    if (p.clean === undefined && p.best?.counts && p.best.score >= CLEAN_SCORE) {
      p.clean = 1;
      p.cleanDays = [localDay(p.best.at)];
    }
    return p;
  }

  record(id: string, a: Attempt): ExerciseProgress {
    const p = this.exercise(id);
    p.attempts++;
    p.last = a;
    if (a.counts && (!p.best || a.score > p.best.score)) p.best = a;
    if (a.counts && a.stars >= 1) p.passed = true;
    if (a.counts && a.score >= CLEAN_SCORE) {
      p.clean = (p.clean ?? 0) + 1;
      const day = localDay(a.at);
      if (!p.cleanDays?.includes(day)) p.cleanDays = [...(p.cleanDays ?? []), day];
    }
    this.write(`ex.${id}`, p);
    return p;
  }

  /** Clean takes so far against the exercise's goal. */
  reps(goal: RepsGoal, now = new Date()): RepsProgress {
    const p = this.exercise(goal.id);
    const clean = p.clean ?? 0;
    const days = p.cleanDays?.length ?? 0;
    const done = clean >= goal.reps && days >= goal.days;
    const daysLeft = Math.max(0, goal.days - days);
    const left = done ? 0 : Math.max(goal.reps - clean, daysLeft);
    const playedToday = !!p.cleanDays?.includes(localDay(now.toISOString()));
    const later = done ? 0 : Math.max(0, daysLeft - (playedToday ? 0 : 1));
    return { clean, days, done, left, later, today: left > later };
  }

  /** A lesson is done when every exercise in it is done: enough clean takes, on enough days. */
  lessonDone(exercises: RepsGoal[]): boolean {
    return exercises.length > 0 && exercises.every((e) => this.reps(e).done);
  }
}

export { deviceData, SCHEMA_VERSION };
export const store = new Store(deviceData);
