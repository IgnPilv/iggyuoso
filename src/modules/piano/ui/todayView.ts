import type { Calibration } from '../calibration';
import { content, exerciseTitle } from '../content';
import { demo, DEMO_CALIBRATION } from '../demo/demo';
import { dailyInput, demoProgress, mastery } from '../progress';
import { DAILY_MINUTES, itemDone, todayPlan, type DailyItem, type PlanInput } from '../progress/daily';
import type { Mastery } from '../progress/mastery';
import { store, type Store } from '../progress/store';
import { h, type View } from '../../../core/dom';
import { mountExercise } from './players';

// Today's practice (#/today and a card on home): the reviews due, the next lesson and drills,
// about 20 minutes, played one after the other.

const WHY: Record<DailyItem['why'], string> = { review: 'Review', lesson: 'New', drill: 'Drill' };

function itemTitle(item: DailyItem) {
  const ex = item.exercise ? content.exercises.get(item.exercise) : undefined;
  return ex ? exerciseTitle(ex) : content.lessons.get(item.lesson)?.title ?? item.lesson;
}

/** The plan with what is done. */
function status(input: PlanInput) {
  const plan = todayPlan(input);
  const done = plan.items.map((i) => itemDone(input, i));
  const reviewsLeft = plan.items.some((i, k) => i.why === 'review' && !done[k]);
  const minutes = plan.items.reduce((s, i) => s + i.minutes, 0);
  const left = plan.items.reduce((s, i, k) => s + (done[k] ? 0 : i.minutes), 0);
  return { plan, done, reviewsLeft, minutes, left };
}

/** The home card: today's list, how far along, and a button to go on. */
export function todayCard(p: { store: Store; mastery: Mastery } = { store, mastery }, href = '#/today'): HTMLElement | '' {
  const input = dailyInput(p);
  const st = status(input);
  if (!st.plan.items.length) return '';
  const all = st.done.every(Boolean);
  const pct = st.minutes ? Math.round((100 * (st.minutes - st.left)) / st.minutes) : 100;
  return h('section', { class: 'card today-card' },
    h('div', { class: 'unit-head' },
      h('h2', {}, "Today's practice"),
      h('span', { class: 'unit-progress' }, all ? 'Done for today' : `about ${Math.round(st.left)} of ${Math.round(st.minutes)} min left`)),
    h('div', { class: 'level-bar' }, h('span', { style: `width: ${pct}%` })),
    h('ol', { class: 'today-list' }, ...st.plan.items.map((item, k) =>
      h('li', { class: st.done[k] ? 'done' : '' },
        h('span', { class: `state-badge why-${item.why}` }, WHY[item.why]),
        h('span', { class: 'today-title' }, itemTitle(item)),
        h('span', { class: 'today-min' }, `${item.minutes} min`)))),
    all
      ? h('p', { class: 'banner ok' }, `That's today done. Come back tomorrow: the streak counts days, not hours.`)
      : h('div', { class: 'controls' },
        h('button', { onclick: () => { location.hash = href; } }, st.done.some(Boolean) ? "Continue today's practice" : "Start today's practice"),
        h('span', { class: 'small' }, st.minutes < DAILY_MINUTES - 5
          // Early on there is nothing to review and no drills yet, so the day is short.
          ? `Short today: as you learn more, reviews and drills fill the day up to about ${DAILY_MINUTES} minutes. Take your time with the lesson.`
          : `${DAILY_MINUTES} minutes a day: reviews first, then the next lesson, then drills.`)));
}

/** Plays today's items in order, one at a time. */
export function runToday(root: HTMLElement, cal: Calibration, p: { store: Store; mastery: Mastery } = { store, mastery }): () => void {
  const input = dailyInput(p);
  const body = h('div');
  const head = h('div', { class: 'lesson-head' });
  const nav = h('div', { class: 'controls' });
  let cleanup: (() => void) | undefined;
  let at = 0;

  const show = () => {
    cleanup?.();
    cleanup = undefined;
    const st = status(input);
    body.replaceChildren();
    nav.replaceChildren();
    // Start at the first item not done yet (from `at` on).
    while (at < st.plan.items.length && st.done[at]) at++;
    if (at >= st.plan.items.length) {
      head.replaceChildren(h('h2', {}, "Today's practice"));
      body.append(h('p', { class: 'banner ok' }, "All done for today. Well played!"), todayCard(p) || '');
      nav.append(h('button', { onclick: () => { location.hash = '#/'; } }, 'Home'));
      return;
    }
    const item = st.plan.items[at];
    head.replaceChildren(
      h('h2', {}, `${WHY[item.why]}: ${itemTitle(item)}`),
      h('span', { class: 'small' }, `${at + 1} of ${st.plan.items.length} · about ${Math.round(st.left)} min left`));
    const skip = h('button', { class: 'secondary', onclick: () => { at++; show(); } }, 'Skip for now');
    if (item.why === 'lesson') {
      body.append(h('p', {}, 'Next on your path. Read it through and play its exercises; it is done when each has its clean takes.'));
      // Reviews come first in a teacher's order, but they never hold the lesson back.
      if (st.reviewsLeft) body.append(h('p', { class: 'small' }, 'Some reviews above are still to do. They work best first, but the lesson is open.'));
      nav.append(h('button', { onclick: () => { location.hash = `#/lesson/${item.lesson}`; } }, 'Open the lesson'), skip);
      if (st.reviewsLeft) nav.append(h('button', { class: 'secondary', onclick: () => { at = 0; show(); } }, 'Back to the reviews'));
      return;
    }
    const ex = content.exercises.get(item.exercise!);
    if (!ex) { at++; show(); return; }
    if (item.why === 'review') body.append(h('p', { class: 'small' }, 'This one is fading. A pass now keeps it fresh for longer.'));
    const box = h('div');
    body.append(box);
    const next = h('button', { class: 'secondary', onclick: () => { at++; show(); } }, 'Next');
    nav.append(next);
    cleanup = mountExercise(box, ex, cal, () => { next.classList.remove('secondary'); });
  };

  root.append(h('section', { class: 'card' }, head, body, nav));
  show();
  return () => cleanup?.();
}

export const todayView: View = (root) => {
  const cal = demo.active ? DEMO_CALIBRATION : store.calibration;
  if (!cal) {
    root.append(h('p', { class: 'banner' }, 'First, let the app get to know your keyboard. ', h('a', { href: '#/calibrate' }, 'Set up the keyboard')));
    return;
  }
  return runToday(root, cal, demo.active ? demoProgress() : { store, mastery });
};
