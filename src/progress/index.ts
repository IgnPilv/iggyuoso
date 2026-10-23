import { content, nodeOfLesson, pathLessons, treeNodes } from '../content';
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
 * The growing edge of the tree: nodes that are open (their requirements are far enough along) and
 * not done yet, best first. Earlier stages first; inside a stage, the branch that is furthest
 * behind comes first, so the tree grows evenly. Songs have their own page and are left out.
 */
export function frontier(p: Progress = { store, mastery }): TreeNode[] {
  const nodes = [...treeNodes.values()].filter((n) => n.lesson && n.branch !== 'songs');
  const share = new Map<string, number>();
  const key = (n: TreeNode) => `${n.stage}/${n.branch}`;
  for (const n of nodes) {
    const k = key(n);
    if (share.has(k)) continue;
    const same = nodes.filter((m) => key(m) === k);
    share.set(k, same.filter((m) => nodeDone(m, p)).length / same.length);
  }
  const order = [...treeNodes.keys()];
  return nodes
    .filter((n) => !nodeDone(n, p) && p.mastery.state(n.id) !== 'locked')
    .sort((a, b) => a.stage - b.stage
      // Milestones wait until the rest of their stage is done.
      || Number(a.type === 'checkpoint') - Number(b.type === 'checkpoint')
      || share.get(key(a))! - share.get(key(b))!
      || order.indexOf(a.id) - order.indexOf(b.id));
}

/** The lesson to continue with: the first node of the frontier, else the first not done at all. */
export function nextLesson(p: Progress = { store, mastery }): Lesson | undefined {
  const n = frontier(p)[0];
  if (n) return lessonOf(n);
  return pathLessons().find((l) => !p.store.lessonDone(lessonGoals(l)) && nodeOfLesson(l.id)?.branch !== 'songs');
}

/** Today's practice plan and progress, for the real progress or the demo's. */
export function dailyInput(p: Progress = { store, mastery }): PlanInput {
  return {
    content, nodes: treeNodes, store: p.store, mastery: p.mastery, lessonGoals,
    next: () => {
      const f = frontier(p).map(lessonOf).filter((l): l is Lesson => !!l);
      return f.length ? f : [nextLesson(p)].filter((l): l is Lesson => !!l);
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
