import { content, nodeOfLesson, pathLessons, songOf, treeNodes } from '../content';
import type { TreeNode } from '../content/tree';
import type { Exercise, Lesson } from '../content/types';
import type { PlanInput } from './daily';
import { Mastery } from './mastery';
import { memoryBackend, Store, store } from './store';

// The player's progress: exercise records (store) and the mastery tree built on them.

export { nodeOfLesson };

export const lessonExercises = (l: Lesson) => l.steps.flatMap((s) => ('exercise' in s ? [s.exercise] : []));

/** A lesson's exercises with their rep goals, for Store.lessonDone. */
export const lessonGoals = (l: Lesson): Exercise[] =>
  lessonExercises(l).map((id) => content.exercises.get(id)).filter((e): e is Exercise => !!e);

type Progress = { store: Store; mastery: Mastery };

export type LessonAdvice =
  | { ready: true }
  /** Its tree node is best after other nodes (Practised; Mastered for a milestone). */
  | { ready: false; reason: 'tree'; nodes: string[]; checkpoint: boolean };

/**
 * Whether a lesson is the right one to take now. Nothing is ever closed: this only says what is
 * recommended first, so the player can skip ahead knowingly. A node whose requirements are not
 * far enough along has not grown yet.
 */
export function lessonAdvice(l: Lesson, p: Progress = { store, mastery }): LessonAdvice {
  const node = nodeOfLesson(l.id);
  if (node && p.mastery.state(node.id) === 'locked') {
    return { ready: false, reason: 'tree', nodes: p.mastery.missing(node), checkpoint: node.type === 'checkpoint' };
  }
  return { ready: true };
}

const lessonOf = (n: TreeNode) => (n.lesson ? content.lessons.get(n.lesson) : undefined);

/** Whether every exercise of the node's lesson has its clean takes. */
export const nodeDone = (n: TreeNode, p: Progress = { store, mastery }) => {
  const l = lessonOf(n);
  return !!l && p.store.lessonDone(lessonGoals(l));
};

/**
 * How far a lesson has got: not started, started, played through (every exercise has a clean take,
 * so the path moves on; the takes still owed, some on later days, come back in Today's practice),
 * or done (every exercise has all its clean takes).
 */
export type LessonStage = 'new' | 'started' | 'through' | 'done';

export const lessonStage = (l: Lesson, p: Progress = { store, mastery }) => goalsStage(lessonGoals(l), p.store);

export function goalsStage(goals: Exercise[], s: Store): LessonStage {
  if (s.lessonDone(goals)) return 'done';
  if (goals.length && goals.every((e) => s.reps(e).clean > 0)) return 'through';
  return goals.some((e) => s.exercise(e.id).attempts > 0) ? 'started' : 'new';
}

const SKIPPED = 'path.skipped';

/** Lessons the player went through without playing anything: suggested again only after the rest. */
export const skippedLessons = (p: Progress = { store, mastery }) => new Set(p.store.get<string[]>(SKIPPED) ?? []);

/** Note a lesson whose recap was reached with no take at all; a later take clears it. */
export function noteSkipped(l: Lesson, p: Progress = { store, mastery }) {
  const s = skippedLessons(p);
  const played = lessonStage(l, p) !== 'new';
  if (played === !s.has(l.id)) return;
  if (played) s.delete(l.id); else s.add(l.id);
  p.store.put(SKIPPED, [...s]);
}

const behind = (l: Lesson | undefined, p: Progress, skipped: Set<string>) =>
  !!l && skipped.has(l.id) && lessonStage(l, p) === 'new';

/**
 * The growing edge of the tree: nodes that are open (their requirements are far enough along) and
 * not done yet, best first. Earlier stages first; inside a stage, lessons the player skipped come
 * last and the branch that is furthest behind (fewest lessons played through) comes first, so the
 * tree grows evenly. Songs have their own page and are left out.
 */
export function frontier(p: Progress = { store, mastery }): TreeNode[] {
  const nodes = [...treeNodes.values()].filter((n) => n.lesson && n.branch !== 'songs');
  const skipped = skippedLessons(p);
  const through = (n: TreeNode) => { const l = lessonOf(n); return !!l && ['through', 'done'].includes(lessonStage(l, p)); };
  const last = new Set(nodes.filter((n) => behind(lessonOf(n), p, skipped)).map((n) => n.id));
  const share = new Map<string, number>();
  const key = (n: TreeNode) => `${n.stage}/${n.branch}`;
  for (const n of nodes) {
    const k = key(n);
    if (share.has(k)) continue;
    const same = nodes.filter((m) => key(m) === k);
    share.set(k, same.filter(through).length / same.length);
  }
  const order = [...treeNodes.keys()];
  return nodes
    .filter((n) => !nodeDone(n, p) && p.mastery.state(n.id) !== 'locked')
    .sort((a, b) => a.stage - b.stage
      // Milestones wait until the rest of their stage is done.
      || Number(a.type === 'checkpoint') - Number(b.type === 'checkpoint')
      || Number(last.has(a.id)) - Number(last.has(b.id))
      || share.get(key(a))! - share.get(key(b))!
      || order.indexOf(a.id) - order.indexOf(b.id));
}

/**
 * The lesson to go on with: one not played through yet, so a lesson waiting only for takes on a
 * later day never holds the path back. After `from` (the lesson just finished), the next open
 * lesson of the same branch comes first; otherwise the growing edge, skipped lessons last; else the
 * first lesson not played through at all.
 */
export function nextLesson(p: Progress = { store, mastery }, from?: Lesson): Lesson | undefined {
  const skipped = skippedLessons(p);
  const fresh = (l: Lesson | undefined): l is Lesson =>
    !!l && l.id !== from?.id && ['new', 'started'].includes(lessonStage(l, p)) && nodeOfLesson(l.id)?.branch !== 'songs';
  const node = from && nodeOfLesson(from.id);
  // A song taught in steps goes on with its next step not played through yet.
  const song = node && songOf(node.id);
  if (song && song.steps.length > 1) {
    const step = song.steps.slice(song.steps.indexOf(node!) + 1).map(lessonOf)
      .find((l) => !!l && ['new', 'started'].includes(lessonStage(l, p)));
    if (step) return step;
  }
  if (node && node.branch !== 'songs') {
    const nodes = [...treeNodes.values()];
    const after = nodes.slice(nodes.indexOf(node) + 1)
      .find((n) => n.branch === node.branch && p.mastery.state(n.id) !== 'locked' && fresh(lessonOf(n)) && !behind(lessonOf(n), p, skipped));
    if (after) return lessonOf(after);
  }
  const open = frontier(p).map(lessonOf).filter(fresh);
  return open.find((l) => !behind(l, p, skipped)) ?? open[0] ?? pathLessons().find(fresh);
}

/** Today's practice plan and progress, for the real progress or the demo's. */
export function dailyInput(p: Progress = { store, mastery }): PlanInput {
  return {
    content, nodes: treeNodes, store: p.store, mastery: p.mastery, lessonGoals,
    next: () => {
      const f = frontier(p).map(lessonOf).filter((l): l is Lesson => !!l);
      // Lessons played through with takes still owed come first, so the later-day takes get played.
      const owed = (l: Lesson) => lessonStage(l, p) === 'through' && lessonGoals(l).some((e) => p.store.reps(e).today);
      // Those waiting only for tomorrow go last.
      const waiting = (l: Lesson) => lessonStage(l, p) === 'through' && !owed(l);
      const sorted = [...f.filter(owed), ...f.filter((l) => !owed(l) && !waiting(l)), ...f.filter(waiting)];
      return sorted.length ? sorted : [nextLesson(p)].filter((l): l is Lesson => !!l);
    },
    path: pathLessons,
  };
}

const exercisesOf = (lessonId: string) => {
  const l = content.lessons.get(lessonId);
  return l ? lessonExercises(l) : [];
};

export const mastery = new Mastery(store, treeNodes, exercisesOf);

/** Throwaway progress for the demo pianist, so the demo shows rewards without saving anything. */
let demoPair: Progress | undefined;
export function demoProgress() {
  if (!demoPair) {
    const s = new Store(memoryBackend());
    demoPair = { store: s, mastery: new Mastery(s, treeNodes, exercisesOf) };
  }
  return demoPair;
}
