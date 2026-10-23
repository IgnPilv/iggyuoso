import type { TreeNode } from '../content/tree';
import { STAR_THRESHOLDS } from '../scoring/stars';
import type { Attempt, Store } from './store';

// Mastery on the tree (docs/mastery-curriculum.md): each node climbs
// Locked -> Introduced -> Practised (every exercise ★, 65+) -> Solid (every exercise ★★★, 92+, at a
// tempo that counts) -> Mastered (passed again on a later day). Solid and Mastered fade: a node's
// freshness halves every review interval (review boxes), it comes due at half freshness, and a
// failed review drops it one state. XP only for clean takes, new stars, reviews on time and
// promotions, with a daily cap. The streak forgives a rest day.

export const STATES = ['locked', 'introduced', 'practised', 'solid', 'mastered'] as const;
export type NodeState = (typeof STATES)[number];

/** Days until a review is due, per box. A good review moves up a box, a failed one back to 0. */
export const REVIEW_DAYS = [2, 4, 8, 16, 32, 64] as const;

export const XP = { cleanTake: 10, star: 5, review: 10, promotion: 25, dailyCap: 300 } as const;
/** Days without practice the streak forgives. */
export const STREAK_GRACE_DAYS = 1;

export interface NodeRecord {
  /** Highest state reached through the exercises; a failed review can bring it down. */
  state: NodeState;
  /** Review box (index into REVIEW_DAYS). */
  box: number;
  /** Day (YYYY-MM-DD) of the last good take, for freshness. */
  lastGood?: string;
  /** Day the node became Solid; Mastered needs a pass on a later day. */
  solidDay?: string;
}

export interface MasteryMeta {
  xp: number;
  xpDay?: string;
  xpToday: number;
  streak: number;
  streakDay?: string;
}

export interface AttemptOutcome {
  xp: number;
  promoted: { node: string; to: NodeState }[];
  dropped: { node: string; to: NodeState }[];
  reviewed: string[];
}

/** Local calendar day. */
export const dayOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
const rank = (s: NodeState) => STATES.indexOf(s);

export class Mastery {
  constructor(
    private store: Store,
    private nodes: ReadonlyMap<string, TreeNode>,
    /** Exercise ids of a lesson. */
    private exercisesOf: (lessonId: string) => string[],
  ) {}

  private rec(id: string): NodeRecord {
    return this.store.get<NodeRecord>(`mastery.${id}`) ?? { state: 'introduced', box: 0 };
  }
  private save(id: string, r: NodeRecord) { this.store.put(`mastery.${id}`, r); }

  get meta(): MasteryMeta {
    return { xp: 0, xpToday: 0, streak: 0, ...this.store.get<Partial<MasteryMeta>>('mastery.meta') };
  }
  private set meta(m: MasteryMeta) { this.store.put('mastery.meta', m); }

  /** What the exercises' best takes say about a node: introduced, practised or solid. */
  private earned(node: TreeNode): NodeState {
    const exs = node.lesson ? this.exercisesOf(node.lesson) : [];
    if (!exs.length) return 'introduced';
    const progress = exs.map((id) => this.store.exercise(id));
    if (!progress.every((p) => p.passed)) return 'introduced';
    if (!progress.every((p) => p.best && p.best.counts && p.best.score >= STAR_THRESHOLDS[2])) return 'practised';
    return 'solid';
  }

  /** The node's state now: Locked until every node it requires is at least Practised. */
  state(id: string): NodeState {
    const node = this.nodes.get(id);
    if (!node) return 'locked';
    if (node.requires.some((r) => rank(this.state(r)) < rank('practised'))) {
      return rank(this.rec(id).state) >= rank('practised') ? this.rec(id).state : 'locked';
    }
    return this.rec(id).state;
  }

  /** 1 = just practised, 0.5 = due for review. Only Solid and Mastered nodes fade. */
  freshness(id: string, now = new Date()): number {
    const r = this.rec(id);
    if (rank(r.state) < rank('solid') || !r.lastGood) return 1;
    const days = Math.max(0, daysBetween(r.lastGood, dayOf(now)));
    return 2 ** (-days / REVIEW_DAYS[Math.min(r.box, REVIEW_DAYS.length - 1)]);
  }

  isDue(id: string, now = new Date()) { return this.freshness(id, now) <= 0.5; }

  /** Nodes due for review, the most faded first. */
  reviewQueue(now = new Date()): string[] {
    return [...this.nodes.keys()].filter((id) => this.isDue(id, now)).sort((a, b) => this.freshness(a, now) - this.freshness(b, now));
  }

  /**
   * Call after store.record() with the attempt just saved and the exercise's stars before it.
   * Updates every node whose lesson uses the exercise, the XP and the streak.
   */
  onAttempt(exerciseId: string, a: Attempt, starsBefore: number, now = new Date()): AttemptOutcome {
    const today = dayOf(now);
    const out: AttemptOutcome = { xp: 0, promoted: [], dropped: [], reviewed: [] };
    const passed = a.counts && a.score >= STAR_THRESHOLDS[0];
    const clean = a.counts && a.score >= STAR_THRESHOLDS[2];
    let xp = 0;
    if (clean) xp += XP.cleanTake;
    if (a.counts && a.stars > starsBefore) xp += XP.star * (a.stars - starsBefore);

    for (const node of this.nodes.values()) {
      if (!node.lesson || !this.exercisesOf(node.lesson).includes(exerciseId)) continue;
      const r = this.rec(node.id);
      const due = this.isDue(node.id, now);
      if (due && rank(r.state) >= rank('solid')) {
        if (passed) {
          r.box = Math.min(r.box + 1, REVIEW_DAYS.length - 1);
          xp += XP.review;
          out.reviewed.push(node.id);
        } else {
          r.state = STATES[rank(r.state) - 1];
          r.box = 0;
          // Back to Solid: Mastered again needs another later day. Back to Practised: start over.
          r.solidDay = r.state === 'solid' ? today : undefined;
          out.dropped.push({ node: node.id, to: r.state });
          this.save(node.id, r);
          continue;
        }
      }
      // Promotions need a fresh take: Practised and Mastered a pass, Solid a clean one. So a node
      // that dropped after a failed review climbs back only by playing it well again.
      const earned = this.earned(node);
      let to = r.state;
      if (passed && rank(earned) >= rank('practised') && rank(to) < rank('practised')) to = 'practised';
      if (clean && earned === 'solid' && rank(to) < rank('solid')) to = 'solid';
      if (passed && r.state === 'solid' && earned === 'solid' && r.solidDay && r.solidDay < today) to = 'mastered';
      if (to !== r.state) {
        if (to === 'solid') { r.solidDay = today; r.box = 0; }
        r.state = to;
        xp += XP.promotion;
        out.promoted.push({ node: node.id, to });
      }
      if (passed && rank(r.state) >= rank('solid')) r.lastGood = today;
      this.save(node.id, r);
    }

    const m = this.meta;
    if (m.xpDay !== today) { m.xpDay = today; m.xpToday = 0; }
    xp = Math.max(0, Math.min(xp, XP.dailyCap - m.xpToday));
    m.xp += xp;
    m.xpToday += xp;
    if (passed && m.streakDay !== today) {
      const gap = m.streakDay ? daysBetween(m.streakDay, today) : Infinity;
      m.streak = gap <= 1 + STREAK_GRACE_DAYS ? m.streak + 1 : 1;
      m.streakDay = today;
    }
    this.meta = m;
    out.xp = xp;
    return out;
  }
}
