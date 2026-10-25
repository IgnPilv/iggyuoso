import type { DrillGoal } from '../content/types';
import { stars } from './stars';

/**
 * Score a generated drill against its goal: reaching the goal's accuracy counts as a clean take
 * (92), more is up to 100; answering slower than the goal's median keeps the take below clean.
 */
export function applyGoal(score: number, goal: DrillGoal | undefined, medianMs?: number) {
  if (!goal) return { score, stars: stars(score), slow: false };
  let s = Math.min(100, Math.round((score * 92) / goal.accuracy));
  const slow = goal.medianMs !== undefined && medianMs !== undefined && medianMs > goal.medianMs;
  if (slow) s = Math.min(s, 91);
  return { score: s, stars: stars(s), slow };
}
