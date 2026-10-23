import type { MasteryMeta } from '../progress/mastery';
import { TIMING_KEEP, type DayLog, type TimingEntry } from '../progress/profile';
import type { Attempt, ExerciseProgress } from '../progress/store';

// When the same record changed on this device and on the account since the last sync (two
// devices used offline), the two versions are merged. Records that grow (takes, practice days,
// timing, XP) keep the most of both, so practice on either device is never lost; everything else
// takes the newer version. Records the tree rebuild or later features add fall under "newer
// wins" until they get a rule here.

type Rule = (local: any, remote: any, localNewer: boolean) => unknown;

const later = (a?: Attempt, b?: Attempt) => (!a ? b : !b ? a : a.at >= b.at ? a : b);
const better = (a?: Attempt, b?: Attempt) => (!a ? b : !b ? a : b.score > a.score ? b : a);
const union = (a: string[] = [], b: string[] = []) => [...new Set([...a, ...b])].sort();
const max = (a?: number, b?: number) => (a === undefined ? b : b === undefined ? a : Math.max(a, b));

export const mergeExercise = (a: ExerciseProgress, b: ExerciseProgress): ExerciseProgress => {
  const out: ExerciseProgress = { ...a, ...b, attempts: Math.max(a.attempts ?? 0, b.attempts ?? 0) };
  const best = better(a.best, b.best);
  const last = later(a.last, b.last);
  if (best) out.best = best;
  if (last) out.last = last;
  if (a.passed || b.passed) out.passed = true;
  const clean = max(a.clean, b.clean);
  if (clean !== undefined) out.clean = clean;
  if (a.cleanDays || b.cleanDays) out.cleanDays = union(a.cleanDays, b.cleanDays);
  return out;
};

export const mergeDays = (a: Record<string, DayLog>, b: Record<string, DayLog>): Record<string, DayLog> => {
  const out: Record<string, DayLog> = { ...a };
  for (const [day, d] of Object.entries(b)) {
    const x = out[day];
    out[day] = !x ? d : { xp: Math.max(x.xp, d.xp), takes: Math.max(x.takes, d.takes), clean: Math.max(x.clean, d.clean), ms: Math.max(x.ms, d.ms), lastAt: Math.max(x.lastAt, d.lastAt) };
  }
  return out;
};

export const mergeTiming = (a: TimingEntry[], b: TimingEntry[]): TimingEntry[] => {
  const seen = new Map<string, TimingEntry>();
  for (const e of [...a, ...b]) seen.set(`${e.at}|${e.hand}`, e);
  return [...seen.values()].sort((x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : 0)).slice(-TIMING_KEEP);
};

export const mergeMeta = (a: MasteryMeta, b: MasteryMeta): MasteryMeta => {
  const day = (x: MasteryMeta) => x.xpDay ?? '';
  const streakFrom = (x: MasteryMeta) => x.streakDay ?? '';
  const today = day(a) === day(b) ? { xpDay: a.xpDay, xpToday: Math.max(a.xpToday, b.xpToday) } : day(a) > day(b) ? a : b;
  const streak = streakFrom(a) === streakFrom(b) ? (a.streak >= b.streak ? a : b) : streakFrom(a) > streakFrom(b) ? a : b;
  return {
    ...a,
    ...b,
    xp: Math.max(a.xp, b.xp),
    xpDay: today.xpDay,
    xpToday: today.xpToday,
    streak: streak.streak,
    streakDay: streak.streakDay,
    bestStreak: max(max(a.bestStreak, a.streak), max(b.bestStreak, b.streak)),
  };
};

const RULES: [test: (key: string) => boolean, rule: Rule][] = [
  [(k) => k.startsWith('ex.'), (l, r) => mergeExercise(l, r)],
  [(k) => k === 'profile.days', (l, r) => mergeDays(l, r)],
  [(k) => k === 'profile.timing', (l, r) => mergeTiming(l, r)],
  [(k) => k === 'mastery.meta', (l, r) => mergeMeta(l, r)],
];

/** Merge a record (store key without the prefix) changed on both sides. */
export function mergeRecord(key: string, local: unknown, remote: unknown, localNewer: boolean): unknown {
  if (local === null || local === undefined) return remote;
  if (remote === null || remote === undefined) return local;
  const rule = RULES.find(([test]) => test(key))?.[1];
  if (rule && typeof local === 'object' && typeof remote === 'object') {
    try { return rule(local, remote, localNewer); } catch { /* odd shape: fall back to newer wins */ }
  }
  return localNewer ? local : remote;
}
