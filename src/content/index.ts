import type { Exercise, Lesson } from './types';
import { loadContent } from './load';
import { loadTree } from './tree';
import { attachReadings, loadBook } from './book';

const files = import.meta.glob('../../content/**/*.yaml', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const bookFiles = import.meta.glob('../../content/book/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const { content, errors: contentErrors } = loadContent(files);
if (contentErrors.length) console.warn('Content problems:\n' + contentErrors.join('\n'));

export const { book, errors: bookErrors } = loadBook({ ...files, ...bookFiles }, content.lessons);
if (bookErrors.length) console.warn('Book problems:\n' + bookErrors.join('\n'));
attachReadings(book, content.lessons);

export const { stages, branches, nodes: treeNodes, errors: treeErrors } = loadTree(files, content.lessons);
if (treeErrors.length) console.warn('Mastery tree problems:\n' + treeErrors.join('\n'));

/** The lesson an exercise belongs to, and its number there (1-based). */
export function placeOf(exerciseId: string): { lesson: Lesson; n: number; of: number } | undefined {
  for (const lesson of content.lessons.values()) {
    const ids = lesson.steps.flatMap((s) => ('exercise' in s ? [s.exercise] : []));
    const i = ids.indexOf(exerciseId);
    if (i >= 0) return { lesson, n: i + 1, of: ids.length };
  }
  return undefined;
}

/** A heading for an exercise: its own `title`, else its place in its lesson, else its id. */
export function exerciseTitle(ex: Exercise): string {
  if (ex.title) return ex.title;
  const at = placeOf(ex.id);
  if (!at) return ex.id;
  return at.of > 1 ? `${at.lesson.title}: exercise ${at.n} of ${at.of}` : at.lesson.title;
}

/** The tree node a lesson is placed at. */
export const nodeOfLesson = (lessonId: string) => lessonNode.get(lessonId);
const lessonNode = new Map([...treeNodes.values()].filter((n) => n.lesson).map((n) => [n.lesson!, n]));

/** Lessons in path order: by stage, then branch, as the tree lists them. */
export const pathLessons = (): Lesson[] =>
  [...treeNodes.values()].map((n) => (n.lesson ? content.lessons.get(n.lesson) : undefined)).filter((l): l is Lesson => !!l);
