import { content, treeNodes } from '../content';
import type { Exercise, Lesson } from '../content/types';
import { Mastery } from './mastery';
import { memoryBackend, Store, store } from './store';

// The player's progress: exercise records (store) and the mastery tree built on them.

export const lessonExercises = (l: Lesson) => l.steps.flatMap((s) => ('exercise' in s ? [s.exercise] : []));

/** A lesson's exercises with their rep goals, for Store.lessonDone. */
export const lessonGoals = (l: Lesson): Exercise[] =>
  lessonExercises(l).map((id) => content.exercises.get(id)).filter((e): e is Exercise => !!e);

export type LessonLock =
  | { locked: false }
  /** The lesson before it in the unit is not done yet. */
  | { locked: true; reason: 'previous'; lesson: Lesson }
  /** Its tree node needs other nodes first (Practised; Mastered for a checkpoint). */
  | { locked: true; reason: 'tree'; nodes: string[]; checkpoint: boolean };

/**
 * Whether a lesson can be opened. Lessons in a unit open one by one: the next opens when the one
 * before is done. A lesson whose tree node is still Locked stays closed too.
 */
export function lessonLock(l: Lesson, p: { store: Store; mastery: Mastery } = { store, mastery }): LessonLock {
  if (p.store.settings.openAll) return { locked: false };
  const order = content.units.find((u) => u.id === l.unit)?.lessons ?? [];
  const prev = content.lessons.get(order[order.indexOf(l.id) - 1]);
  if (prev && !p.store.lessonDone(lessonGoals(prev))) return { locked: true, reason: 'previous', lesson: prev };
  const node = nodeOfLesson(l.id);
  if (node && p.mastery.state(node.id) === 'locked') {
    return { locked: true, reason: 'tree', nodes: p.mastery.missing(node), checkpoint: node.type === 'checkpoint' };
  }
  return { locked: false };
}

const exercisesOf = (lessonId: string) => {
  const l = content.lessons.get(lessonId);
  return l ? lessonExercises(l) : [];
};

export const mastery = new Mastery(store, treeNodes, exercisesOf);

/** Throwaway progress for the demo pianist, so the demo shows rewards without saving anything. */
let demoPair: { store: Store; mastery: Mastery } | undefined;
export function demoProgress() {
  if (!demoPair) {
    const s = new Store(memoryBackend());
    demoPair = { store: s, mastery: new Mastery(s, treeNodes, exercisesOf) };
  }
  return demoPair;
}

/** The tree node a lesson is placed at. */
export const nodeOfLesson = (lessonId: string) => [...treeNodes.values()].find((n) => n.lesson === lessonId);
