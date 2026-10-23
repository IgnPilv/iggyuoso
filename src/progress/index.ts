import { content, treeNodes } from '../content';
import type { Exercise, Lesson } from '../content/types';
import type { PlanInput } from './daily';
import { Mastery } from './mastery';
import { memoryBackend, Store, store } from './store';

// The player's progress: exercise records (store) and the mastery tree built on them.

export const lessonExercises = (l: Lesson) => l.steps.flatMap((s) => ('exercise' in s ? [s.exercise] : []));

/** A lesson's exercises with their rep goals, for Store.lessonDone. */
export const lessonGoals = (l: Lesson): Exercise[] =>
  lessonExercises(l).map((id) => content.exercises.get(id)).filter((e): e is Exercise => !!e);

export type LessonAdvice =
  | { ready: true }
  /** The lesson before it in the unit is not done yet. */
  | { ready: false; reason: 'previous'; lesson: Lesson }
  /** Its tree node is best after other nodes (Practised; Mastered for a checkpoint). */
  | { ready: false; reason: 'tree'; nodes: string[]; checkpoint: boolean };

/**
 * Whether a lesson is the right one to take now. Nothing is ever closed: this only says what is
 * recommended first, so the player can skip ahead knowingly. Lessons in a unit are meant one by
 * one, and a lesson whose tree node is still Locked is best after the nodes it needs.
 */
export function lessonAdvice(l: Lesson, p: { store: Store; mastery: Mastery } = { store, mastery }): LessonAdvice {
  const order = content.units.find((u) => u.id === l.unit)?.lessons ?? [];
  const prev = content.lessons.get(order[order.indexOf(l.id) - 1]);
  if (prev && !p.store.lessonDone(lessonGoals(prev))) return { ready: false, reason: 'previous', lesson: prev };
  const node = nodeOfLesson(l.id);
  if (node && p.mastery.state(node.id) === 'locked') {
    return { ready: false, reason: 'tree', nodes: p.mastery.missing(node), checkpoint: node.type === 'checkpoint' };
  }
  return { ready: true };
}

/** Today's practice plan and progress, for the real progress or the demo's. */
export function dailyInput(p: { store: Store; mastery: Mastery } = { store, mastery }): PlanInput {
  return { content, nodes: treeNodes, store: p.store, mastery: p.mastery, ready: (l) => lessonAdvice(l, p).ready, lessonGoals };
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
