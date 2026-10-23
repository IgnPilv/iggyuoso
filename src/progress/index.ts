import { content, treeNodes } from '../content';
import type { Lesson } from '../content/types';
import { Mastery } from './mastery';
import { memoryBackend, Store, store } from './store';

// The player's progress: exercise records (store) and the mastery tree built on them.

export const lessonExercises = (l: Lesson) => l.steps.flatMap((s) => ('exercise' in s ? [s.exercise] : []));

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
