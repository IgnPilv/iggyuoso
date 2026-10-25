import { exerciseTitle } from '../content';
import type { Exercise, Lesson } from '../content/types';
import type { LessonStage } from '../progress';
import type { Store } from '../progress/store';
import { h } from '../../../core/dom';
import { markdown } from './markdown';
import { repsText } from './players';

// The end of a lesson: where it stands in plain words, each exercise with what it still needs, and
// one obvious next thing to press. Used by the lesson screen and by the demo (with its own store).

export interface RecapInput {
  lesson: Lesson;
  goals: Exercise[];
  stage: LessonStage;
  store: Store;
  /** The lesson recommended next, if any. */
  next?: Lesson;
  /** Play one of the lesson's exercises again. */
  practise: (exerciseId: string) => void;
  openLesson: (lessonId: string) => void;
  home: () => void;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function lessonRecap(r: RecapInput): { body: HTMLElement[]; nav: HTMLElement[]; forward: HTMLButtonElement } {
  const recap = h('div', { class: 'explain recap' });
  recap.innerHTML = markdown(`**Recap.** ${r.lesson.recap}`);
  const reps = r.goals.map((e) => ({ e, p: r.store.reps(e) }));
  const open = reps.filter((x) => !x.p.done);
  const today = open.filter((x) => x.p.today);
  const left = open.reduce((s, x) => s + x.p.left, 0);
  const leftToday = today.reduce((s, x) => s + x.p.left - x.p.later, 0);
  const withClean = reps.filter((x) => x.p.clean > 0).length;

  const [head, text, ok] =
    r.stage === 'done' ? ['Lesson done.', 'Every exercise has all its clean takes.', true]
    : r.stage === 'through' ? ['Played through.', `Every exercise has a clean take, so go on to the next lesson. ${
        today.length ? `To finish this one: ${plural(left, 'more clean take')}, ${leftToday === left ? 'all of them today if you like' : `${leftToday} today and the rest on later days`}.`
          : `To finish this one: ${plural(left, 'more clean take')} from tomorrow. Today's practice brings them back.`}`, true]
    : ['Not finished yet.', `${withClean} of ${plural(r.goals.length, 'exercise')} ${withClean === 1 ? 'has' : 'have'} a clean take. ${
        today.length ? `Play ${withClean ? 'the others' : 'each'} until ${withClean ? 'each gets' : 'it gets'} one; you can also move on any time.` : 'You can move on any time.'}`, false];
  const status = h('div', { class: `banner recap-status${ok ? ' ok' : ''}` },
    h('p', {}, h('strong', {}, `${head} `), text),
    h('p', { class: 'small' }, 'A clean take is ★★★ (92 or more) at full tempo. Some exercises want takes on different days, because a skill sticks after a night\'s sleep.'));

  const list = h('ul', { class: 'reps-list recap-list' }, ...reps.map(({ e, p }) => {
    const row = [h('span', {}, p.done ? '✓ ' : '', exerciseTitle(e)), h('span', { class: 'reps-count' }, repsText(e, p))];
    return h('li', { class: p.done ? 'done' : p.today ? 'todo' : 'later' },
      p.today ? h('button', { class: 'link-row', onclick: () => r.practise(e.id), title: `Play ${exerciseTitle(e)} again` }, ...row) : h('span', { class: 'link-row' }, ...row));
  }));

  // One main button: practise the first exercise that can still count today, unless the lesson
  // is played through (then the path moves on and practising is the second choice).
  // Before the lesson is played through, the first exercise still without a clean take.
  const pick = today.find((x) => !x.p.clean) ?? today[0];
  const again = pick && h('button', { onclick: () => r.practise(pick.e.id) },
    `${pick.p.clean ? 'Practise again' : 'Play'}: ${exerciseTitle(pick.e)} (${plural(pick.p.left - pick.p.later, 'more clean take')}${pick.p.later ? ' today' : ''})`);
  const next = r.next
    ? h('button', { onclick: () => r.openLesson(r.next!.id) }, `Next lesson: ${r.next.title}`)
    : h('button', { onclick: r.home }, 'Your tree');
  const nav: HTMLElement[] = [];
  if (again && r.stage !== 'through' && r.stage !== 'done') {
    nav.push(again);
    next.classList.add('secondary');
    nav.push(next);
  } else {
    nav.push(next);
    if (again) { again.classList.add('secondary'); nav.push(again); }
  }
  return { body: [recap, status, list], nav, forward: next as HTMLButtonElement };
}
