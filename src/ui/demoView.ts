import { audio } from '../audio/audio';
import { content } from '../content';
import type { Exercise, TimedExercise } from '../content/types';
import { demo, DEMO_CALIBRATION, stopDemo } from '../demo/demo';
import { Pianist } from '../demo/pianist';
import { h, type View } from './dom';
import { mountExercise } from './players';
import { currentTheme, previewTheme } from './theme';
import { calibrateView, testerView } from './views';

// The no-keyboard showcase. Scenes are picked from the live content, so the demo always shows
// what the app currently does. When a feature is added, add or extend a scene here.

interface Scene {
  title: string;
  caption: string;
  run: (box: HTMLElement, next: () => void, p: Pianist) => (() => void) | void;
}

const allExercises = () => [...content.exercises.values()];
const noteCount = (e: TimedExercise) => (e.right?.filter((t) => t.pitches.length).length ?? 0) + (e.left?.filter((t) => t.pitches.length).length ?? 0);

function pick<T extends Exercise>(pred: (e: Exercise) => e is T, ...prefs: ((e: T) => boolean)[]): T | undefined {
  const xs = allExercises().filter(pred);
  for (const pref of prefs) {
    const hit = xs.find(pref);
    if (hit) return hit;
  }
  return xs[0];
}
const isTimed = (e: Exercise): e is TimedExercise => e.kind === 'timed';

const press = (box: HTMLElement, label: string) =>
  [...box.querySelectorAll('button')].find((b) => b.textContent === label)?.click();

/** Mount an exercise and let the pianist play it; for timed ones, Listen first if asked. */
type View2 = 'classic' | 'falling';
const setView = (box: HTMLElement, v: View2) => box.querySelector<HTMLButtonElement>(`.view-toggle [data-view=${v}]`)?.click();

/** `switchAt`: flip to the other view after this many ms, to show the toggle (untimed only). */
function exerciseScene(ex: Exercise, opts: { listenFirst?: boolean; view?: View2; switchAt?: number } = {}): Scene['run'] {
  return (box, next, p) => {
    demo.onFind = (s) => p.playFind(s);
    demo.onSequence = (s) => p.playSequence(s);
    demo.onTimed = (s) => p.playTimed(s);
    demo.onRunEnd = (mode) => {
      if (mode === 'listen') window.setTimeout(() => press(box, 'Play'), 800);
    };
    const cleanup = mountExercise(box, ex, DEMO_CALIBRATION, () => window.setTimeout(next, 4000));
    if (opts.view) setView(box, opts.view);
    const timers: number[] = [];
    if (opts.switchAt && opts.view) {
      const other: View2 = opts.view === 'classic' ? 'falling' : 'classic';
      timers.push(window.setTimeout(() => setView(box, other), opts.switchAt));
    }
    if (ex.kind === 'timed') timers.push(window.setTimeout(() => press(box, opts.listenFirst ? 'Listen' : 'Play'), 900));
    return () => { timers.forEach(clearTimeout); cleanup(); };
  };
}

function scenes(): Scene[] {
  const out: Scene[] = [];
  out.push({
    title: 'Keyboard setup',
    caption: 'First the app learns your keyboard: you press the lowest white key, then the highest. Then it shows you middle C and asks you to press it. The pianist presses a wrong C first.',
    run: (box, next, p) => {
      const cleanup = calibrateView(box);
      p.playCalibration(DEMO_CALIBRATION.low, DEMO_CALIBRATION.high, DEMO_CALIBRATION.middleC);
      const t = window.setTimeout(next, 9000);
      return () => { clearTimeout(t); cleanup?.(); };
    },
  });
  const find = pick((e): e is Exercise => e.kind === 'find', (e) => e.kind === 'find' && e.coverAll && e.targets.some((t) => 'pitchClass' in t));
  if (find) out.push({ title: 'Finding keys', caption: `"${find.prompt ?? find.id}" Found keys stay green; a wrong key flashes red. Every exercise has a switch between "Keyboard & sheet" and "Falling notes"; watch it flip halfway.`, run: exerciseScene(find, { view: 'classic', switchAt: 3200 }) });
  const seq = pick((e): e is Exercise => e.kind === 'sequence', (e) => e.kind === 'sequence' && e.display === 'keys' && e.fingers.length > 0);
  if (seq) out.push({ title: 'Finger numbers', caption: 'In falling notes, each note falls to the keyboard and waits until you play it, with the finger number on it. The pianist stumbles once, then the view switches back to the keyboard.', run: exerciseScene(seq, { view: 'falling', switchAt: 4200 }) });
  const oneHand = pick(isTimed, (e) => !!e.right !== !!e.left && e.display === 'keys' && noteCount(e) >= 9 && e.fingers[e.right ? 'right' : 'left'].length > 0, (e) => !!e.right !== !!e.left && noteCount(e) >= 9);
  if (oneHand) out.push({ title: 'Falling notes', caption: 'Listen first: the app plays the tune and lights each key. Then the pianist plays it, with one wrong key, one late note and one missed note. The score and the mistakes show up live.', run: exerciseScene(oneHand, { listenFirst: true, view: 'falling' }) });
  const twoHands = pick(isTimed, (e) => !!(e.right && e.left));
  if (twoHands) out.push({ title: 'Two hands', caption: 'Right hand in blue, left hand in green. Each hand gets its own score.', run: exerciseScene(twoHands, { view: 'falling' }) });
  const sheet = pick(isTimed, (e) => e.display === 'staff' && !(e.right && e.left));
  if (sheet) out.push({ title: 'Sheet music', caption: 'The same exercise on "Keyboard & sheet": the staff, with notes turning green or red as they are played.', run: exerciseScene(sheet, { view: 'classic' }) });
  const looks = pick((e): e is Exercise => e.kind === 'sequence', (e) => e.kind === 'sequence' && e.display === 'keys');
  if (looks) out.push({
    title: 'Dark and light',
    caption: 'The app comes in a dark look and a light one. Pick one with the button at the top right or in Settings → Appearance, or let it follow your device. Here it flips between the two while the pianist plays.',
    run: (box, next, p) => {
      const other = currentTheme() === 'dark' ? 'light' : 'dark';
      const flips = [2200, 4600, 7000].map((t, i) => window.setTimeout(() => previewTheme(i % 2 === 0 ? other : undefined), t));
      const cleanup = exerciseScene(looks, { view: 'classic' })(box, next, p);
      return () => { flips.forEach(clearTimeout); previewTheme(undefined); cleanup?.(); };
    },
  });
  out.push({
    title: 'MIDI tester',
    caption: 'In Settings, the MIDI tester shows each key you press and the raw MIDI messages, for checking that a keyboard is connected.',
    run: (box, next, p) => {
      const cleanup = testerView(box);
      [60, 62, 64, 65, 67].forEach((n, i) => p.playNote(n, 400 + i * 450, 350));
      p.playChord([60, 64, 67], 3000, 900);
      const t = window.setTimeout(next, 5000);
      return () => { clearTimeout(t); cleanup?.(); };
    },
  });
  return out;
}

export const demoView: View = (root, arg) => {
  const list = scenes();
  const stage = h('div', { class: 'demo-stage' });
  const caption = h('p', { class: 'demo-caption' });
  const steps = h('ol', { class: 'demo-steps' });
  let index = -1;
  let cleanup: (() => void) | void;
  let pianist = new Pianist();

  const stopScene = () => {
    pianist.stop();
    cleanup?.();
    cleanup = undefined;
    demo.onTimed = demo.onFind = demo.onSequence = demo.onRunEnd = undefined;
  };

  const show = (i: number, scene?: Scene) => {
    stopScene();
    demo.active = true;
    pianist = new Pianist();
    index = i;
    const s = scene ?? list[i];
    [...steps.children].forEach((li, j) => li.classList.toggle('current', j === i));
    caption.replaceChildren(h('strong', {}, `${s.title}. `), s.caption);
    stage.replaceChildren();
    const box = h('div');
    stage.append(box);
    const next = () => { if (scene) return; if (index === i && i + 1 < list.length) show(i + 1); else if (i + 1 >= list.length) finish(); };
    cleanup = s.run(box, next, pianist);
  };

  const finish = () => {
    stopScene();
    caption.replaceChildren('That is the tour. Watch any single exercise below, or plug in your keyboard and start lesson 1.');
  };

  steps.append(...list.map((s, i) => h('li', {}, h('a', { href: '#/demo', onclick: (e: Event) => { e.preventDefault(); audio(); show(i); } }, s.title))));

  const startBtn = h('button', { onclick: () => { audio(); show(0); } }, 'Start the tour');
  const exercises = h('div', { class: 'demo-list' });
  for (const unit of content.units) {
    for (const lid of unit.lessons) {
      const l = content.lessons.get(lid);
      if (!l) continue;
      const ids = l.steps.flatMap((s) => ('exercise' in s ? [s.exercise] : []));
      exercises.append(h('div', { class: 'demo-lesson' },
        h('span', { class: 'small' }, l.title),
        ...ids.map((id) => {
          const ex = content.exercises.get(id);
          if (!ex) return null;
          return h('button', { class: 'chip', onclick: () => {
            audio();
            window.scrollTo(0, 0);
            show(-1, { title: id, caption: ex.prompt ?? 'The pianist plays this exercise.', run: exerciseScene(ex, { listenFirst: false }) });
          } }, id);
        })));
    }
  }

  root.append(
    h('section', { class: 'card' },
      h('h2', {}, 'Demo'),
      h('p', {}, 'No keyboard needed: a demo pianist plays the app on a virtual 88-key keyboard, mistakes included, so you can see every screen. Turn your sound on. Nothing here is saved to your progress.'),
      h('div', { class: 'controls' }, startBtn, h('button', { class: 'secondary', onclick: () => { stopScene(); caption.textContent = 'Paused.'; } }, 'Stop')),
      steps,
      caption,
      stage,
    ),
    h('section', { class: 'card' }, h('h2', {}, 'Watch any exercise'), exercises),
  );
  if (arg === 'start') startBtn.click();
  return () => { stopScene(); stopDemo(); previewTheme(undefined); };
};
