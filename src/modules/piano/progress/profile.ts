import { STRANDS, type Strand, type TreeNode } from '../content/tree';
import type { Hand } from '../music/notes';
import type { NodeState } from './mastery';
import type { Attempt, Store } from './store';

// The player profile: a practice log per day, timing per hand from timed takes, a level from XP,
// and summaries for the profile page. Saved as `profile.days` and `profile.timing`.

/** One day of practice. */
export interface DayLog {
  xp: number;
  takes: number;
  clean: number;
  /** Practice time, estimated from the gaps between takes (see PRACTICE_GAP_MS). */
  ms: number;
  /** Time of the last take, ms since 1970. */
  lastAt: number;
}

/** Timing of one hand in one timed take. */
export interface TimingEntry {
  at: string;
  hand: Hand;
  /** Average signed offset of the hits, negative = early. */
  mean: number;
  /** Standard deviation of the hits. */
  spread: number | null;
}

/** A gap between takes up to this long counts as practice; a longer one starts a new sitting. */
export const PRACTICE_GAP_MS = 5 * 60_000;
/** The first take of a sitting counts this long. */
export const FIRST_TAKE_MS = 60_000;
/** Timing entries kept (oldest dropped). */
export const TIMING_KEEP = 200;

/** Total XP needed to reach a level: 0, 100, 300, 600, 1000, ... (each level 100 XP more). */
export const xpForLevel = (level: number) => 50 * level * (level - 1);

export function levelOf(xp: number) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const from = xpForLevel(level);
  const to = xpForLevel(level + 1);
  return { level, into: xp - from, span: to - from };
}

export class Profile {
  constructor(private store: Store) {}

  get days(): Record<string, DayLog> { return this.store.get('profile.days') ?? {}; }
  get timing(): TimingEntry[] { return this.store.get('profile.timing') ?? []; }

  /** Call after every saved take, with the XP it earned. */
  log(a: Attempt, xp: number, clean: boolean, day: string) {
    const days = this.days;
    const t = Date.parse(a.at);
    const d = days[day] ?? { xp: 0, takes: 0, clean: 0, ms: 0, lastAt: 0 };
    const last = Math.max(d.lastAt, ...Object.values(days).map((x) => x.lastAt));
    const gap = t - last;
    d.ms += gap > 0 && gap <= PRACTICE_GAP_MS ? gap : FIRST_TAKE_MS;
    d.xp += xp;
    d.takes++;
    if (clean) d.clean++;
    d.lastAt = t;
    days[day] = d;
    this.store.put('profile.days', days);
    if (a.timing) {
      const entries = (Object.entries(a.timing) as [Hand, { mean: number; spread: number | null }][])
        .map(([hand, v]) => ({ at: a.at, hand, mean: v.mean, spread: v.spread }));
      if (entries.length) this.store.put('profile.timing', [...this.timing, ...entries].slice(-TIMING_KEEP));
    }
  }

  /** Practice per day for the last `weeks` weeks, oldest first, ending today. */
  calendar(today: string, weeks = 12): { day: string; log?: DayLog }[] {
    const days = this.days;
    const end = new Date(`${today}T12:00:00`);
    const out: { day: string; log?: DayLog }[] = [];
    for (let i = weeks * 7 - 1; i >= 0; i--) {
      const d = new Date(end.getTime() - i * 86_400_000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      out.push({ day: key, log: days[key] });
    }
    return out;
  }

  totals() {
    const logs = Object.values(this.days);
    return {
      days: logs.length,
      takes: logs.reduce((s, d) => s + d.takes, 0),
      clean: logs.reduce((s, d) => s + d.clean, 0),
      minutes: Math.round(logs.reduce((s, d) => s + d.ms, 0) / 60_000),
    };
  }

  /** Per hand: recent average timing and steadiness, and the change from the takes before. */
  timingSummary(recent = 10) {
    const out: Partial<Record<Hand, { takes: number; mean: number; spread: number | null; before?: number }>> = {};
    for (const hand of ['right', 'left'] as Hand[]) {
      const xs = this.timing.filter((e) => e.hand === hand);
      if (!xs.length) continue;
      const now = xs.slice(-recent);
      const prev = xs.slice(-2 * recent, -recent);
      const avg = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
      const spreads = now.map((e) => e.spread).filter((s): s is number => s !== null);
      out[hand] = {
        takes: xs.length,
        mean: Math.round(avg(now.map((e) => e.mean))),
        spread: spreads.length ? Math.round(avg(spreads)) : null,
        before: prev.length ? Math.round(avg(prev.map((e) => e.mean))) : undefined,
      };
    }
    return out;
  }
}

/** For each strand, how many written nodes are in each state. Checkpoints count under "all". */
export function strandMastery(nodes: Iterable<TreeNode>, state: (id: string) => NodeState) {
  const out = new Map<Strand, Record<NodeState, number> & { total: number }>();
  for (const s of STRANDS) out.set(s, { locked: 0, introduced: 0, practised: 0, solid: 0, mastered: 0, total: 0 });
  for (const n of nodes) {
    if (n.planned || !n.lesson || n.strand === 'all') continue;
    const row = out.get(n.strand)!;
    row[state(n.id)]++;
    row.total++;
  }
  return out;
}
