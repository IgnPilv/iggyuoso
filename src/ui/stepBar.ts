import { exerciseTitle } from '../content';
import type { Exercise, Lesson } from '../content/types';
import type { Store } from '../progress/store';
import { h } from './dom';

// The bar of steps at the top of a lesson. Each segment is a button that jumps to its step, and
// it is marked by what that step holds: an exercise done (all its clean takes) or under way (a
// clean take), a theory screen seen, the recap once the lesson is done.

export type StepMark = 'done' | 'clean' | 'seen' | '';

/** A short name for a step, for the segment's tooltip. */
export function stepName(lesson: Lesson, i: number, exercise: (id: string) => Exercise | undefined): string {
  const s = lesson.steps[i];
  if (!s) return 'Recap';
  if ('exercise' in s) { const e = exercise(s.exercise); return e ? exerciseTitle(e) : 'Exercise'; }
  if ('playground' in s) return 'Try it on the keys';
  // The first line of the explanation, without its markdown.
  const line = s.explain.trim().split('\n')[0].replace(/[*_`#>[\]]/g, '').trim();
  return line.length > 48 ? `${line.slice(0, 46).trim()}…` : line || 'Theory';
}

export function stepBar(lesson: Lesson, store: Store, exercise: (id: string) => Exercise | undefined, jump: (i: number) => void) {
  const count = lesson.steps.length + 1;
  const seen = new Set<number>();
  const segs = [...Array(count).keys()].map((i) =>
    h('button', { class: 'step-seg', type: 'button', onclick: () => jump(i) }, h('span')));
  const el = h('nav', { class: 'step-bar', 'aria-label': 'Lesson steps' }, ...segs);

  const mark = (i: number): StepMark => {
    const s = lesson.steps[i];
    if (!s) {
      const goals = lesson.steps.flatMap((x) => ('exercise' in x ? [exercise(x.exercise)] : [])).filter((e): e is Exercise => !!e);
      return store.lessonDone(goals) ? 'done' : seen.has(i) ? 'seen' : '';
    }
    if ('exercise' in s) {
      const e = exercise(s.exercise);
      const r = e && store.reps(e);
      if (r?.done) return 'done';
      if (r?.clean) return 'clean';
    }
    return seen.has(i) ? 'seen' : '';
  };
  const words: Record<StepMark, string> = { done: 'done', clean: 'clean take, not finished', seen: 'seen', '': 'not yet' };

  /** Redraw for the step now showing (also after a take, so a new clean take shows at once). */
  const paint = (current: number) => {
    seen.add(current);
    segs.forEach((b, i) => {
      const m = mark(i);
      b.className = `step-seg${m ? ` ${m}` : ''}${i === current ? ' current' : ''}`;
      const label = `Step ${i + 1}: ${stepName(lesson, i, exercise)} (${i === current ? 'here' : words[m]})`;
      b.title = label;
      b.setAttribute('aria-label', i === lesson.steps.length ? `Recap (${i === current ? 'here' : words[m]})` : label);
      if (i === current) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
  };
  return { el, paint };
}
