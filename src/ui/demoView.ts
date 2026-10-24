import { audio } from '../audio/audio';
import { book, content, exerciseTitle, pathLessons, treeNodes } from '../content';
import { bookView } from './bookView';
import type { EarExercise, Exercise, ExplainStep, Lesson, PlaygroundStep, TimedExercise } from '../content/types';
import { demo, DEMO_CALIBRATION, stopDemo } from '../demo/demo';
import { Pianist } from '../demo/pianist';
import { parse } from 'yaml';
import { loadContent, parseExercise } from '../content/load';
import { h, type View } from './dom';
import { branchPage, growingNow, growingTree, snapshot, songPage, songsCard, songsPage, stageList } from './treeView';
import { mountExercise, resetDemoOptions } from './players';
import { renderProfile, sampleProgress } from './profileView';
import { runToday, todayCard } from './todayView';
import { demoProgress, goalsStage, lessonGoals, lessonExercises, nodeOfLesson } from '../progress';
import { lessonRecap } from './recap';
import { stepBar } from './stepBar';
import { dayOf, Mastery } from '../progress/mastery';
import { memoryBackend, Store } from '../progress/store';
import { demoAccount } from '../sync';
import { computerKeys } from '../midi/computerKeys';
import { currentTheme, previewTheme } from './theme';
import { explainBlock, playground } from './theory';
import { calibrateView, keyMap, testerView } from './views';
import { sketchbookView } from './sketchbookView';
import { mySongsView } from './mySongsView';
import { writeMidiFile } from '../music/midiFile';

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
const isTimed = (e: Exercise): e is TimedExercise => e.kind === 'timed' && !e.tap;

/** A content exercise of this kind if there is one, else a built-in sample. */
function sampleOf(kind: Exercise['kind'] | 'tap', yaml: string): Exercise {
  const real = allExercises().find((e) => (kind === 'tap' ? e.kind === 'timed' && e.tap : e.kind === kind));
  return real ?? parseExercise(parse(yaml));
}

const SAMPLES = {
  dynamics: `
id: demo-dynamics
kind: timed
title: Scale that swells and fades
hand: together
display: staff
tempo: 72
meter: 4/4
countIn: 1
right: "C4:q D4:q E4:q F4:q | G4:q A4:q B4:q C5:q | C5:h G4:h | F4:q E4:q D4:q E4:q | C4:w"
left: "C3:q D3:q E3:q F3:q | G3:q A3:q B3:q C4:q | C4:h G3:h | F3:q E3:q D3:q E3:q | C3:w"
dynamics: "p | < | f | > | p"`,
  harmony: `
id: demo-ear-harmony
kind: ear
title: Hearing harmony
prompt: Which chord is it, and which progression? The bass shows the way.
questions: 4
items:
  - { type: function, key: C, pool: [I, IV, V, vi] }
  - { type: progression, key: [C, G], pool: [I IV V I, I V vi IV, I vi IV V, vi ii V I] }`,
  earSteps: `
id: demo-ear-steps
kind: ear
title: First ear steps
prompt: Ear training from zero. Same or different, which way, how many, louder or softer.
questions: 7
items:
  - { type: compare, pool: [same, different], gap: [4, 7] }
  - { type: note, pool: [C4, G4], lit: true, reference: C4 }
  - { type: contour, length: 3 }
  - { type: motion }
  - { type: count, pool: [1, 2, 3] }
  - { type: loudness, notes: "C4 E4 G4" }
  - { type: melody, notes: "C4 D4 E4", lit: true, plays: 2 }`,
  earRhythm: `
id: demo-ear-rhythm
kind: ear
title: Which rhythm?
prompt: A bar of clicks, then a rhythm on one note. Pick its picture.
questions: 3
items:
  - { type: rhythm, tempo: 80, pool: ["x:q x:q x:h", "x:h x:h", "x:q x:q x:q x:q", "x:h x:q x:q", "x:e x:e x:q x:h"] }`,
  ear: `
id: demo-ear
kind: ear
prompt: Ear training. Listen, then answer on the keyboard or with the buttons.
cadence: C
questions: 4
items:
  - { type: degree, key: C, pool: [1, 3, 5] }
  - { type: compare, range: [C4, C5] }
  - { type: interval, pool: [M3, P5], answer: name }
  - { type: melody, notes: "C4 D4 E4" }`,
  quiz: `
id: demo-quiz
kind: quiz
prompt: A theory quiz. Answer with a button, or by playing.
questions:
  - ask: How many beats does a half note last?
    staff: "C4:h C4:h"
    choices: ["1", "2", "4"]
    correct: 1
    why: A half note is half of a whole note (4 beats), so it lasts **2 beats**. Its head is open, with a stem.
  - ask: Which note is this?
    staff: "G4:w"
    choices: [E, { text: G }, { text: B, why: "B sits on the middle line, one line higher." }]
    correct: 1
    why: The treble clef curls round the second line from the bottom, and that line is **G**.
    whyKeys: { notes: G4, labels: names }
  - ask: Play the note shown.
    staff: "E4:w"
    play: E4`,
  build: `
id: demo-build
kind: build
prompt: Build it. Play the chord, interval or scale asked for.
tasks:
  - chord: C
  - interval: P5
    from: D4
  - chord: Am
  - scale: G major`,
  tap: `
id: demo-tap
kind: tap
prompt: Rhythm only. Tap the rhythm on any key.
tempo: 84
meter: 4/4
rhythm: "x:q x:q x:h | x:e x:e x:q x:h"`,
  tapBoth: `
id: demo-tap-both
kind: generated
generator: rhythm-read
hands: both
durations: [q, h, e]
bars: 2
tempo: 72`,
  echo: `
id: demo-echo
kind: generated
generator: rhythm-echo
durations: [q, h, e, r:q]
bars: 2
tempo: 80`,
  rhythms: `
id: demo-rhythms
kind: timed
display: staff
hand: right
prompt: An upbeat, a dotted rhythm, a triplet, a tie and sixteenths.
tempo: 66
meter: 4/4
pickup: q
right: "G4:q | C5:q. D5:e E5:e3 F5:e3 E5:e3 D5:q~ | D5:q C5:s D5:s E5:e C5:h"`,
  ladder: `
id: demo-ladder
kind: timed
hand: right
prompt: A tune on the tempo ladder.
tempo: 96
tempoLadder: [70, 85, 100]
meter: 4/4
right: "C4:q D4:q E4:q C4:q | E4:q F4:q G4:h | G4:e A4:e G4:e F4:e E4:q C4:q | C4:q G3:q C4:h"
fingers: "1 2 3 1 3 4 5 5 5 4 3 3 1 1 1 1"`,
  keys: `
id: demo-key
kind: timed
display: staff
hand: right
prompt: G major. The sharp is in the key signature, so the F#s need no sign; the F natural does.
key: G
tempo: 72
meter: 4/4
right: "G4:q A4:q B4:q C5:q | D5:q F#5:q F5:q F#5:q | G5:h D5:h | G4:w"`,
  pedal: `
id: demo-pedal
kind: timed
display: staff
prompt: Legato pedal. Lift as each chord sounds, then press again.
tempo: 60
meter: 4/4
right: "E4:h G4:h | A4:h G4:h | F4:h E4:h | D4:w"
left: "C3+G3:h C3+G3:h | F2+C3:h C3+G3:h | G2+D3:h C3+G3:h | G2+D3:w"
pedal: "x:h x:h | x:h x:h | x:h x:h | x:w"`,
  reps: `
id: demo-reps
kind: timed
hand: right
prompt: Three clean takes, on two different days, to finish this one.
tempo: 100
meter: 4/4
reps: 3
days: 2
right: "C4:q D4:q E4:q F4:q | G4:q F4:q E4:h"
fingers: "1 2 3 4 5 4 3"`,
  readNotes: `
id: demo-read-notes
kind: generated
generator: read-notes
prompt: Fresh every time. Play each note you see, in the right octave.
notes: C4-C5
keys: [C, G]
questions: 8
mastery: { accuracy: 90, medianMs: 2500 }`,
  sightRead: `
id: demo-sight-read
kind: generated
generator: sight-read
notes: C4-G4
durations: [q, h]
bars: 4
tempo: 76`,
  sightReadTogether: `
id: demo-sight-read-together
kind: generated
generator: sight-read
hand: together
left: fifths
notes: C4-C5
keys: [C, G, F]
durations: [q, h]
bars: 4
tempo: 70`,
  sixEight: `
id: demo-six-eight
kind: timed
hand: right
prompt: Six-eight, counted in two.
tempo: 50
meter: 6/8
right: "C4:e D4:e E4:e F4:q E4:e | D4:q. G4:q. | E4:e F4:e G4:e A4:q F4:e | E4:q. C4:q."`,
};

/** Two lessons learned a week ago, Solid and now due for review; a fresh plan for today. */
function seedReviews(s: Store) {
  const old = new Date(Date.now() - 7 * 86_400_000);
  const first = pathLessons().slice(0, 2).map((l) => l.id);
  for (const id of first) {
    const lesson = content.lessons.get(id);
    const node = lesson && nodeOfLesson(id);
    if (!lesson || !node) continue;
    // Enough clean takes, on enough days, for the lesson to be done.
    for (const ex of lessonGoals(lesson)) {
      for (let i = 0; i < ex.reps; i++) {
        const at = new Date(old.getTime() - (i % ex.days) * 86_400_000).toISOString();
        s.record(ex.id, { at, score: 95, stars: 3, tempo: 999, counts: true });
      }
    }
    s.put(`mastery.${node.id}`, { state: 'solid', box: 0, lastGood: dayOf(old), solidDay: dayOf(old) });
  }
  s.put('daily.plan', undefined);
}

/** A unit's lesson list as it looks on home: one done, the next recommended, the rest ahead (still open). */
const THEORY = `
id: demo-theory
title: The treble staff
unit: demo
steps:
  - explain: |
      Music is written on a **staff**: five lines, and the four spaces between them. The higher a
      note sits, the higher it sounds. These three notes climb from middle C.
    staff: { notes: "C4:q E4:q G4:h", clef: treble, labels: names }
    keys: { notes: "C4 E4 G4", fingers: "1 3 5" }
    sound: "C4:q E4:q G4:h"
    callout: "**Rule.** Lines and spaces count from the bottom up."
    terms: [staff, treble clef, ledger line]
    check: { ask: "Which note sits on the bottom line?", choices: [C, E, G], correct: 1, why: "Middle C hangs below the staff on its own short ledger line; the bottom line is **E**." }
  - playground: { clef: treble, notes: C4-C5, prompt: "Try it: press any key and watch where it sits on the staff." }
`;

/** A lesson's theory steps, answered by the pianist (one slip), then the playground. */
const theoryScene: Scene['run'] = (box, next, p) => {
  const lesson = loadContent({ 'content/lessons/demo-theory.yaml': THEORY }).content.lessons.get('demo-theory')!;
  const [step, pg] = lesson.steps as [ExplainStep, PlaygroundStep];
  const timers: number[] = [];
  const later = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));
  demo.onCheck = (c) => {
    if (c.choose && c.correct !== undefined) {
      later(2600, () => c.choose!((c.correct! + 1) % 3));
      later(5200, () => c.choose!(c.correct!));
    } else if (c.keys) c.keys.forEach((k, i) => p.playNote(k, 1500 + i * 450, 300));
  };
  let destroy = () => {};
  const nextBtn = h('button', { disabled: true }, 'Next');
  const card = h('div');
  const block = explainBlock(step, DEMO_CALIBRATION, () => {
    nextBtn.disabled = false;
    later(2500, () => {
      block.destroy();
      const play = playground(pg, DEMO_CALIBRATION);
      destroy = play.destroy;
      card.replaceChildren(play.el);
      nextBtn.remove();
      [60, 64, 67, 72].forEach((m, i) => p.playNote(m, 900 + i * 1100, 800));
      p.playChord([60, 64, 67], 900 + 4 * 1100, 1400);
      later(8000, next);
    });
  });
  destroy = block.destroy;
  card.append(block.el);
  box.append(h('section', { class: 'card' }, h('h2', {}, lesson.title), card, h('div', { class: 'controls' }, nextBtn)));
  return () => { timers.forEach(clearTimeout); destroy(); demo.onCheck = undefined; };
};

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
    demo.onAsk = (a) => p.answer(a);
    if (ex.kind === 'improvise') demo.onRecord = (r) => p.improvise(r, ex);
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
    if (ex.kind === 'timed' || ex.kind === 'improvise') timers.push(window.setTimeout(() => press(box, opts.listenFirst && ex.kind === 'timed' ? 'Listen' : 'Play'), 900));
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
  if (oneHand) out.push({ title: 'Falling notes', caption: 'Listen first: the app plays the tune and lights each key. Then the pianist plays it, with one wrong key, one late note and one missed note. The score and the mistakes show up live. The result card shows the XP earned (clean takes, new stars and promotions only).', run: exerciseScene(oneHand, { listenFirst: true, view: 'falling' }) });
  const twoHands = pick(isTimed, (e) => !!(e.right && e.left));
  if (twoHands) out.push({ title: 'Two hands', caption: 'Right hand in blue, left hand in green. Each hand gets its own score. The sheet music rides along above the falling notes, with a playhead on the note being played and notes turning green or red.', run: exerciseScene(twoHands, { view: 'falling' }) });
  const sheet = pick(isTimed, (e) => e.display === 'staff' && !(e.right && e.left));
  if (sheet) out.push({ title: 'Sheet music', caption: 'The same exercise on "Keyboard & sheet": the staff, with notes turning green or red as they are played.', run: exerciseScene(sheet, { view: 'classic' }) });
  const rhythms = parseExercise(parse(SAMPLES.rhythms));
  out.push({ title: 'Upbeats, ties and triplets', caption: 'Note strings can start on an upbeat, tie notes across a bar line, and mix dotted notes, triplets and sixteenths. On the staff a tie is an arc, and the tied note is held, not played again.', run: exerciseScene(rhythms, { view: 'classic' }) });
  out.push({ title: 'Six-eight', caption: 'In 6/8 the click and the tempo count dotted quarters, two to a bar, as musicians count it.', run: exerciseScene(parseExercise(parse(SAMPLES.sixEight)), { view: 'falling' }) });
  out.push({ title: 'Key signatures', caption: 'Staff exercises can have a key signature (key: G). Notes are still written out in full; the staff only draws a sharp, flat or natural where a note differs from the key or from an earlier note in the bar.', run: exerciseScene(parseExercise(parse(SAMPLES.keys)), { view: 'classic' }) });
  out.push({ title: 'Loud and soft', caption: 'Dynamics marks (p, f, crescendo and diminuendo wedges) sit under the staff and next to the bar numbers in the falling notes. The app hears how fast each key goes down: a change of mark must be heard as a change, and a crescendo must grow. Here the pianist plays the crescendo flat, and the result says so. A keyboard that sends one strength for every key (or the computer keyboard) is not marked down.', run: exerciseScene(parseExercise(parse(SAMPLES.dynamics)), { view: 'classic' }) });
  out.push({ title: 'Sustain pedal', caption: 'Pedal lines sit under the staff ("Ped.", a line while it is held, a notch at each change) and down the right edge of the falling notes. The pedal is scored too: here the pianist holds it through one chord change, and the result says so. With the computer keyboard, Space is the pedal.', run: exerciseScene(parseExercise(parse(SAMPLES.pedal)), { view: 'classic' }) });
  out.push({
    title: 'Tempo ladder and loops',
    caption: 'Exercises can climb a tempo ladder: three clean takes (92+) on a step move up, two failed takes in a row move down. After a take, the result points at the bars with the most mistakes, and "Loop" plays just those bars round and round (loop takes are not saved).',
    run: (box, next, p) => {
      const timers: number[] = [];
      let loops = 0;
      demo.onTimed = (s) => p.playTimed(s);
      demo.onRunEnd = () => {
        const loopBtn = [...box.querySelectorAll('button')].find((b) => b.textContent?.startsWith('Loop bar'));
        if (loops === 0 && loopBtn) {
          loops++;
          timers.push(window.setTimeout(() => { loopBtn.click(); timers.push(window.setTimeout(() => press(box, 'Play'), 1200)); }, 3000));
        } else if (loops++ >= 2) timers.push(window.setTimeout(next, 2500));
      };
      const cleanup = mountExercise(box, parseExercise(parse(SAMPLES.ladder)), DEMO_CALIBRATION, () => {});
      setView(box, 'falling');
      timers.push(window.setTimeout(() => press(box, 'Play'), 900));
      return () => { timers.forEach(clearTimeout); cleanup(); };
    },
  });
  out.push({
    title: 'Options carry over',
    caption: 'Tempo, count-in, click, guide notes and whether Options is open are remembered: set 100%, a short count-in ("3 4" instead of "1 2 3 4") or no click on one exercise, and the next one starts the same way.',
    run: (box, next) => {
      resetDemoOptions();
      const timers: number[] = [];
      const later = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));
      const first = parseExercise(parse(SAMPLES.ladder));
      let cleanup = mountExercise(box, first, DEMO_CALIBRATION, () => {});
      setView(box, 'classic');
      const change = (sel: string, f: (el: HTMLInputElement & HTMLSelectElement) => void) => {
        const el = box.querySelector<HTMLInputElement & HTMLSelectElement>(sel);
        if (el) { f(el); el.dispatchEvent(new Event('change')); }
      };
      later(1200, () => { const d = box.querySelector('details.drawer') as HTMLDetailsElement | null; if (d) d.open = true; });
      later(2600, () => change('select[aria-label=tempo]', (el) => { el.value = '100'; }));
      later(3800, () => change('select[aria-label=count-in]', (el) => { el.value = 'short'; }));
      later(5000, () => change('.drawer input[type=checkbox]', (el) => { el.checked = false; }));
      later(6500, () => {
        cleanup();
        box.replaceChildren();
        const other = allExercises().find((e) => isTimed(e) && e.id !== first.id && !!e.ladder) ?? parseExercise(parse(SAMPLES.sixEight));
        cleanup = mountExercise(box, other, DEMO_CALIBRATION, () => {});
        setView(box, 'classic');
      });
      later(8000, () => press(box, 'Listen'));
      later(14000, next);
      return () => { timers.forEach(clearTimeout); cleanup(); resetDemoOptions(); };
    },
  });
  out.push({
    title: 'Clean takes and the path',
    caption: 'An exercise is done after its clean takes (★★★, 92 or more, at full tempo), some on two different days. The recap says it plainly: what each exercise still needs, what can count today, and one main button. Once every exercise has a clean take the lesson is played through and Next goes on (the same branch first; skipped lessons come back last); the takes owed for tomorrow come back in Today\'s practice. Nothing is locked. The bar of steps on top is marked too (green: done, pale green: a clean take so far), and any step can be tapped to jump to it.',
    run: (box, next, p) => {
      const timers: number[] = [];
      const later = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));
      let takes = 0;
      let cleanup = () => {};
      // Fresh ids each time, so the throwaway progress starts from zero.
      const stamp = Date.now();
      const ex = { ...parseExercise(parse(SAMPLES.reps)), id: `demo-reps-${stamp}`, title: 'Five-finger walk' };
      const tap = { ...parseExercise(parse(SAMPLES.reps)), id: `demo-reps-b-${stamp}`, title: 'Walk back down', reps: 2, days: 1 };
      const lesson: Lesson = { id: 'demo-path', title: 'Five fingers', skills: [], recap: 'Five fingers, five keys: one finger for each.', steps: [{ exercise: ex.id }, { exercise: tap.id }] };
      const store = demoProgress().store;
      const play = (e: Exercise) => {
        cleanup();
        box.replaceChildren();
        cleanup = mountExercise(box, e, DEMO_CALIBRATION, () => {});
        setView(box, 'falling');
        later(900, () => press(box, 'Play'));
      };
      const recap = () => {
        cleanup();
        cleanup = () => {};
        const goals = [ex, tap];
        const r = lessonRecap({
          lesson, goals, stage: goalsStage(goals, store), store,
          next: { id: 'demo-next', title: 'Echo two notes', skills: [], steps: [], recap: '' },
          practise: (id) => play(id === ex.id ? ex : tap), openLesson: () => next(), home: () => next(),
        });
        const bar = stepBar(lesson, store, (id) => goals.find((e) => e.id === id), (i) => (i < goals.length ? play(goals[i]) : recap()));
        bar.paint(goals.length);
        box.replaceChildren(h('section', { class: 'card' }, h('h2', {}, lesson.title), bar.el, ...r.body, h('div', { class: 'controls' }, ...r.nav)));
        // The pianist presses the main button: practise again until the lesson is played through.
        const main = box.querySelector<HTMLButtonElement>('.controls button');
        later(5500, () => (takes < 3 ? main?.click() : next()));
      };
      demo.onTimed = (s) => p.playTimed(s, { slips: false });
      demo.onRunEnd = (mode) => {
        if (mode !== 'play') return;
        takes++;
        later(1800, recap);
      };
      play(ex);
      return () => { timers.forEach(clearTimeout); cleanup(); };
    },
  });
  out.push({
    title: 'Pause and keys',
    caption: 'Space plays, pauses and resumes a timed exercise: the music holds where it is, and going on gives a bar to count back in (a take with a pause is practice and is not saved). In a lesson, the way forward also sits at the top next to the step bar, and Enter presses the main button: Next, Practise again or Next lesson.',
    run: (box, next) => {
      const timers: number[] = [];
      const later = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));
      const space = () => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }));
      const cleanup = mountExercise(box, { ...parseExercise(parse(SAMPLES.reps)), id: `demo-pause-${Date.now()}`, title: 'Five-finger walk' }, DEMO_CALIBRATION, () => {});
      setView(box, 'falling');
      later(900, () => press(box, 'Listen'));
      later(5200, space);
      later(8200, space);
      later(17000, next);
      return () => { timers.forEach(clearTimeout); cleanup(); };
    },
  });
  out.push({ title: 'Fresh drills', caption: 'Generated drills make new questions every run from a pool of notes, keys and intervals, so they can be played again and again without learning the answers by heart. The goal counts speed too: here 90% right, answering in 2.5 s or less (middle answer time), makes a clean take.', run: exerciseScene(parseExercise(parse(SAMPLES.readNotes)), { view: 'classic' }) });
  out.push({
    title: 'Sight-reading',
    caption: 'A new tune every time, in the notes and note values the pupil knows so far, ending on the home note. "New tune" makes another one.',
    run: (box, next, p) => {
      const timers: number[] = [];
      let runs = 0;
      demo.onTimed = (s) => p.playTimed(s);
      demo.onRunEnd = (mode) => {
        if (mode !== 'play') return;
        if (++runs === 1) timers.push(window.setTimeout(() => { press(box, 'New tune'); timers.push(window.setTimeout(() => press(box, 'Play'), 1500)); }, 3500));
        else timers.push(window.setTimeout(next, 4000));
      };
      const cleanup = mountExercise(box, parseExercise(parse(SAMPLES.sightRead)), DEMO_CALIBRATION, () => {});
      timers.push(window.setTimeout(() => press(box, 'Play'), 900));
      return () => { timers.forEach(clearTimeout); cleanup(); };
    },
  });
  out.push({
    title: 'Sight-reading, both hands',
    caption: 'From the second stage on, fresh pieces have a left hand: it holds the root of I, IV or V (or root then fifth, or the whole chord), and the tune lands on a note of the chord at the start of each bar. Grand staff, a new piece every run.',
    run: (box, next, p) => {
      const timers: number[] = [];
      demo.onTimed = (s) => p.playTimed(s);
      demo.onRunEnd = (mode) => { if (mode === 'play') timers.push(window.setTimeout(next, 4000)); };
      const cleanup = mountExercise(box, parseExercise(parse(SAMPLES.sightReadTogether)), DEMO_CALIBRATION, () => {});
      timers.push(window.setTimeout(() => press(box, 'Play'), 900));
      return () => { timers.forEach(clearTimeout); cleanup(); };
    },
  });
  out.push({
    title: "Today's practice",
    caption: "About 20 minutes a day, in a teacher's order: first the reviews that are fading, then the next lesson, then fresh drills from what is already learned. New lessons wait until the reviews are done. Here two lessons learned a week ago are due; the pianist starts on the first review.",
    run: (box, next, p) => {
      const timers: number[] = [];
      const progress = demoProgress();
      seedReviews(progress.store);
      box.append(todayCard(progress, '#/demo'));
      demo.onFind = (s) => p.playFind(s);
      demo.onSequence = (s) => p.playSequence(s);
      demo.onTimed = (s) => p.playTimed(s);
      demo.onAsk = (a) => p.answer(a);
      demo.onRunEnd = () => {};
      let cleanup: (() => void) | undefined;
      timers.push(window.setTimeout(() => {
        box.replaceChildren();
        cleanup = runToday(box, DEMO_CALIBRATION, progress);
        if (box.querySelector('.kind-timed')) timers.push(window.setTimeout(() => press(box, 'Play'), 900));
        timers.push(window.setTimeout(next, 16000));
      }, 5000));
      return () => { timers.forEach(clearTimeout); cleanup?.(); };
    },
  });
  out.push({
    title: 'Your tree',
    caption: 'The home page is a tree that grows. Each branch (technique, reading, rhythm, theory, ear, pieces, creativity) gets a leaf for every lesson practised; a bud at its tip means something new is open there. Milestones ring the trunk and open songs. "Growing now" lists what is open, so you choose; below, each stage is a woven map: a column per branch and a thread for every prerequisite, so you can see that ear chords wait for chord theory and pieces wait for their rhythms. Point at a lesson to light its threads. This is a made-up player two stages in.',
    run: (box, next) => {
      const p = sampleTreeProgress();
      const snap = snapshot(p);
      box.append(growingTree(snap), growingNow(snap, p, 6), songsCard(snap), stageList(snap, p));
      const timers = [
        window.setTimeout(() => { box.replaceChildren(branchPage('rhythm', p)); window.scrollTo({ top: 0, behavior: 'smooth' }); }, 9000),
        window.setTimeout(() => { box.replaceChildren(songsPage(p)); }, 15000),
        window.setTimeout(next, 21000),
      ];
      return () => timers.forEach(clearTimeout);
    },
  });
  const songStep = content.exercises.get('song-wim-verse2');
  if (songStep) {
    const play = exerciseScene(songStep, { view: 'falling', switchAt: 9000 });
    out.push({
      title: 'A song in steps',
      caption: 'A bigger song is one entry in the songbook ("Step 1 of 7") and is learned in steps, one lesson each: "Where Is My Mind" (Maxence Cyrin\'s piano version of the Pixies song) goes from the riff over bass notes to the four chords (with an ear drill on the progression), the verse rhythm tapped before it is played, the "ooh" and the break, the rolling left hand, the chorus, and last the whole song in an easy, a medium and the full arrangement, with the pedal. Later steps say which milestone they are best after. Then a step from the middle: the verse over the rolling left hand.',
      run: (box, next, p) => {
        box.append(songPage('song-wim', sampleTreeProgress()));
        let stop: (() => void) | void;
        const t = window.setTimeout(() => { box.replaceChildren(); stop = play(box, next, p); }, 6000);
        return () => { clearTimeout(t); stop?.(); };
      },
    });
  }
  out.push({
    title: 'Profile',
    caption: 'The profile (top right) shows the level, which rises with XP, plus the streak and a calendar of practice days. Each skill strand of the tree shows how far along its lessons are, and each hand gets its timing: early or late on average, how steady it is, and whether it is getting better. Here it shows a made-up seven weeks.',
    run: (box, next) => {
      box.append(renderProfile(sampleProgress()));
      const t = window.setTimeout(next, 12000);
      return () => clearTimeout(t);
    },
  });
  out.push({
    title: 'Guest or account',
    caption: 'Without an account you play as a guest: progress is saved on this device only, and the profile says so. Sign in with an emailed link (no password) and the guest progress goes into the account, which carries it to every device. Here the pianist signs in and the practice from their other device arrives, then tries "Wipe progress", which asks first and then clears the takes, XP and path here and in the account (sketches, songs and settings stay). The demo uses a pretend server.',
    run: (box, next) => {
      const timers: number[] = [];
      const email = 'pianist@example.com';
      const { server, account, data } = demoAccount();
      // The "other device": seven weeks of made-up practice already in the account.
      const other = sampleProgress().store;
      const keys = ['profile.days', 'profile.timing', 'mastery.meta', ...[...treeNodes.keys()].map((id) => `mastery.${id}`)];
      void server.push({ userId: `user:${email}`, email, accessToken: '', refreshToken: '', expiresAt: 0 },
        keys.flatMap((key) => { const value = other.get(key); return value === undefined ? [] : [{ key, value, schema: 1 }]; }));
      const local = new Store(data);
      const progress = { store: local, mastery: new Mastery(local, treeNodes, (l) => { const x = content.lessons.get(l); return x ? lessonGoals(x).map((e) => e.id) : []; }) };
      const draw = () => box.replaceChildren(renderProfile(progress, new Date(), account));
      draw();
      const off = account.onChange((changed) => { if (changed) draw(); });
      timers.push(window.setTimeout(() => {
        const input = box.querySelector<HTMLInputElement>('.account-form input');
        if (!input) return;
        [...email].forEach((_, i) => timers.push(window.setTimeout(() => { input.value = email.slice(0, i + 1); input.dispatchEvent(new Event('input')); }, i * 60)));
        timers.push(window.setTimeout(() => box.querySelector<HTMLFormElement>('.account-form')?.requestSubmit(), email.length * 60 + 500));
      }, 4500));
      timers.push(window.setTimeout(() => void account.completeSignIn(`#memory-sign-in=${email}`), 10500));
      timers.push(window.setTimeout(() => press(box, 'Wipe progress'), 16000));
      timers.push(window.setTimeout(() => press(box, 'Wipe everything'), 20000));
      timers.push(window.setTimeout(next, 25000));
      return () => { timers.forEach(clearTimeout); off(); };
    },
  });
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
  out.push({ title: 'First ear steps', caption: 'Ear training for someone who hears no pitch yet: same or different, which way a tune goes (arrows), a step or a leap, how many notes sound at once, louder or softer the second time. Note questions can light the keys to choose from and play a named note first; a melody can light the keys it uses.', run: exerciseScene(parseExercise(parse(SAMPLES.earSteps)), { view: 'classic' }) });
  out.push({ title: 'Hearing rhythms', caption: 'A bar of clicks, then a rhythm played on one note. The answers are rhythm pictures: pick the one you heard.', run: exerciseScene(parseExercise(parse(SAMPLES.earRhythm)), { view: 'classic' }) });
  out.push({ title: 'Hearing harmony', caption: 'A cadence sets the key, then one chord: is it I, IV, V or vi? After the answer it goes home, so its pull can be heard. Progression questions play four chords and ask which famous progression it was (I V vi IV, ii V I...). Lessons also teach ii, iii and vi, modulation, secondary dominants, modes, texture and the eras of music, so the player can talk about a piece like a music student.', run: exerciseScene(parseExercise(parse(SAMPLES.harmony)), { view: 'classic' }) });
  out.push({ title: 'Ear training', caption: 'The app plays a cadence to set the key, then a note, two notes or a phrase. The first key (or button) is the answer, and missed questions come back more often. The pianist gets one wrong.', run: exerciseScene(sampleOf('ear', SAMPLES.ear), { view: 'classic' }) });
  const checkpoint = allExercises().find((e) => (e.kind === 'ear' || e.kind === 'quiz') && e.feedback === 'none')
    ?? { ...(sampleOf('ear', SAMPLES.ear) as EarExercise), id: 'demo-checkpoint', feedback: 'none' as const };
  out.push({ title: 'Checkpoint', caption: 'Checkpoints test without hints: each answer is only noted, and the result lists the ones that were wrong, with the right answers.', run: exerciseScene(checkpoint, { view: 'classic' }) });
  const chapter = [...book.chapters.values()].find((c) => c.blocks.some((b) => 'figure' in b && b.figure.check)) ?? [...book.chapters.values()][0];
  if (chapter) {
    out.push({
      title: 'The Book',
      caption: `Theory to read, like a music-school textbook: ${book.chapters.size} chapters in parts that follow the tree's stages, each several hundred words on one idea (what it is, why it matters, how it sounds and looks, common confusions). Pictures on the staff and the keys can be played, and quick checks sit in the text. Every lesson that goes with a chapter opens with it as a "Read first" step; here, the contents and then "${chapter.title}".`,
      run: (box, next) => {
        const timers: number[] = [];
        const later = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));
        let cleanup = bookView(box);
        later(3500, () => {
          cleanup?.();
          box.replaceChildren();
          cleanup = bookView(box, chapter.id);
          const figures = [...box.querySelectorAll<HTMLElement>('.book-figure')];
          figures.forEach((f, i) => later(1500 + i * 2600, () => {
            f.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const choices = [...f.querySelectorAll<HTMLButtonElement>('.check .choice')];
            const right = chapter.blocks.filter((b) => 'figure' in b)[i];
            const correct = 'figure' in right ? right.figure.check?.correct : undefined;
            if (choices.length && correct !== undefined) {
              later(900, () => choices[(correct + 1) % choices.length].click());
              later(1900, () => choices[correct].click());
            }
          }));
          later(1500 + figures.length * 2600 + 1500, () => { window.scrollTo({ top: 0, behavior: 'smooth' }); next(); });
        });
        return () => { timers.forEach(clearTimeout); cleanup?.(); };
      },
    });
  }
  out.push({ title: 'Theory screens', caption: 'Theory comes with pictures: a staff (with note names), lit keys with fingers, a sound to hear, the rule in a box and its key terms. A quick check holds Next until it is answered right; a wrong answer explains why. Then a playground: press any key and see it on the staff.', run: theoryScene });
  out.push({ title: 'Theory quiz', caption: 'Short theory questions, with a picture or a sound. Answer with a button, or by playing the answer. After each answer the quiz says why, with a picture, and waits for Next.', run: exerciseScene(parseExercise(parse(SAMPLES.quiz)), { view: 'classic' }) });
  out.push({ title: 'Build it', caption: 'Play a named chord (hold it down), interval or scale, untimed. "Show me" lights the keys, but then it does not count as a first try.', run: exerciseScene(sampleOf('build', SAMPLES.build), { view: 'falling', switchAt: 6000 }) });
  const played = (ex: Exercise, wait = 4000): Scene['run'] => (box, next, p) => {
    const timers: number[] = [];
    demo.onTimed = (s) => p.playTimed(s);
    demo.onRunEnd = (mode) => { if (mode === 'play') timers.push(window.setTimeout(next, wait)); };
    const cleanup = mountExercise(box, ex, DEMO_CALIBRATION, () => {});
    timers.push(window.setTimeout(() => press(box, 'Play'), 900));
    return () => { timers.forEach(clearTimeout); cleanup(); };
  };
  out.push({ title: 'Two-hand tapping', caption: 'Rhythm for both hands: the right hand taps any key from middle C up, the left hand any key below, and each hand is scored on its own. Here a fresh two-line rhythm to read (rhythm-read with hands: both).', run: played(parseExercise(parse(SAMPLES.tapBoth))) });
  out.push({ title: 'Rhythm echo', caption: 'Play sounds a rhythm you cannot see. After a bar of count-in it is your turn: tap it back on any key. Then the staff shows what it was, marked note by note. A new rhythm every run.', run: played(parseExercise(parse(SAMPLES.echo)), 5000) });
  out.push({ title: 'Rhythm tapping', caption: 'Rhythm only: any key counts, and the score is all about timing.', run: exerciseScene(sampleOf('tap', SAMPLES.tap), { view: 'falling' }) });
  out.push({
    title: 'Sketchbook',
    caption: 'Free play, written down. Press Record, and after a bar of count-in play anything: the Sketchbook writes it on the staff (right hand on the treble, left on the bass), plays it back with your own timing, and keeps the ideas you like, with a name and a note. A kept idea can be practised like any exercise, falling notes and all. Here the pianist plays a little tune over a bass and keeps it.',
    run: (box, next, p) => {
      const timers: number[] = [];
      // A four-bar idea: a tune that climbs and comes home, over C, F, G, C in the left hand.
      const tune: [number, number, number][] = [
        [64, 0, 1], [67, 1, 1], [72, 2, 2], [48, 0, 4],
        [69, 4, 1], [67, 5, 0.5], [65, 5.5, 0.5], [64, 6, 2], [53, 4, 4],
        [62, 8, 1], [64, 9, 1], [65, 10, 1], [67, 11, 1], [55, 8, 4],
        [64, 12, 2], [60, 14, 2], [48, 12, 4],
      ];
      demo.onRecord = (r) => p.playIdea(r, tune, () => {
        press(box, 'Stop');
        timers.push(window.setTimeout(() => press(box, 'Play it back'), 1500));
        timers.push(window.setTimeout(() => {
          const name = box.querySelector<HTMLInputElement>('.sketch-take input[type=text]');
          if (name) name.value = 'Climb and come home';
          press(box, 'Keep it');
        }, 9500));
        timers.push(window.setTimeout(next, 14000));
      });
      const cleanup = sketchbookView(box);
      timers.push(window.setTimeout(() => press(box, 'Record'), 1200));
      return () => { timers.forEach(clearTimeout); demo.onRecord = undefined; cleanup?.(); };
    },
  });
  out.push({
    title: 'My songs',
    caption: 'Bring your own song as a MIDI file: Songs → My songs → Import a MIDI file. The file is read in the browser; each part goes to a hand (the highest to the right, the lowest to the left, and you can change it), and the first bars show on the staff. Then the song is a piece like any other: both hands or one, falling notes or the sheet, each hand scored, the tempo ladder and looping bars. Here the pianist imports Ode to Joy (Beethoven, public domain) and plays it.',
    run: (box, next, p) => {
      const timers: number[] = [];
      demo.midiFile = { name: 'Ode to Joy.mid', bytes: odeToJoyMidi() };
      demo.onTimed = (s) => p.playTimed(s);
      demo.onRunEnd = (mode) => { if (mode === 'play') timers.push(window.setTimeout(next, 4000)); };
      const cleanup = mySongsView(box);
      timers.push(window.setTimeout(() => press(box, 'Import a MIDI file'), 1200));
      timers.push(window.setTimeout(() => press(box, 'Add to My songs'), 6000));
      timers.push(window.setTimeout(() => {
        press(box, 'Both hands');
        // A new song starts at the bottom of its tempo ladder; the demo plays it at full speed.
        const tempo = box.querySelector<HTMLSelectElement>('select[aria-label=tempo]');
        if (tempo) { tempo.value = '100'; tempo.dispatchEvent(new Event('change')); }
      }, 8500));
      timers.push(window.setTimeout(() => press(box, 'Play'), 10000));
      return () => { timers.forEach(clearTimeout); demo.midiFile = undefined; cleanup?.(); };
    },
  });
  const improv = (content.exercises.get('cmp-full-close') ?? allExercises().find((e) => e.kind === 'improvise'));
  if (improv) out.push({
    title: 'Improvising that listens',
    caption: 'Improvising and composing exercises give a frame (the notes to use, lit; the chords, played by the app and shown bar by bar; sometimes a rhythm or a phrase to answer) and the player makes up the tune. The app listens to the musical choices: notes from the scale, chord notes on the strong beats, ending at home, a question and its answer, a motif repeated or moved, space between phrases. The take is written on the staff and can be kept in the Sketchbook.',
    run: exerciseScene(improv),
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
  out.push({
    title: 'Computer keyboard',
    caption: 'No MIDI keyboard at hand? Switch on "Play with the computer keyboard" in Settings: A S D F G H J K L ; \' are the white keys from middle C, W E T Y U O P the black keys, Z and X shift an octave. The keys show their letters. The pianist types a tune, then moves an octave down.',
    run: (box, next, p) => {
      const was = { on: computerKeys.enabled, shift: computerKeys.shift };
      computerKeys.enable(true);
      computerKeys.setShift(0);
      const map = keyMap();
      const light = (code: string, down: boolean) => map.querySelector(`[data-code=${code}]`)?.classList.toggle('down', down);
      box.append(map);
      const cleanup = testerView(box);
      // Hot cross buns: E D C, E D C, then the same an octave lower.
      const tune = ['KeyD', 'KeyS', 'KeyA', '', 'KeyD', 'KeyS', 'KeyA', '', 'KeyZ', 'KeyD', 'KeyS', 'KeyA', '', 'KeyX', 'KeyT', 'KeyG', 'KeyH'];
      tune.forEach((code, i) => { if (code) p.typeKey(code, 500 + i * 380, code === 'KeyZ' || code === 'KeyX' ? 150 : 320, light); });
      const t = window.setTimeout(next, 500 + tune.length * 380 + 1500);
      return () => {
        clearTimeout(t);
        cleanup?.();
        computerKeys.releaseAll();
        computerKeys.setShift(was.shift);
        computerKeys.enable(was.on);
      };
    },
  });
  return out;
}

/** Ode to Joy as a small MIDI file: the tune in one track, held bass notes in the other. */
function odeToJoyMidi(): Uint8Array {
  const tune = 'E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4:1.5 D4:0.5 D4:2 | E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4:1.5 C4:0.5 C4:2';
  const STEP: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7 };
  let at = 0;
  const right = tune.split(/\s+/).filter((t) => t !== '|').map((t) => {
    const [name, len] = t.split(':');
    const beats = len ? Number(len) : 1;
    const n = { midi: 12 * (Number(name[1]) + 1) + STEP[name[0]], at, beats: beats - 0.05 };
    at += beats;
    return n;
  });
  const left = [48, 43, 48, 43, 48, 43, 48, 48].map((midi, bar) => ({ midi, at: bar * 4, beats: 3.9 }));
  return writeMidiFile([{ name: 'Melody', notes: right }, { name: 'Bass', notes: left }], { bpm: 96 });
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
    demo.onTimed = demo.onFind = demo.onSequence = demo.onRunEnd = demo.onRecord = demo.onAsk = undefined;
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
  {
    for (const l of pathLessons()) {
      const ids = l.steps.flatMap((s) => ('exercise' in s ? [s.exercise] : []));
      exercises.append(h('div', { class: 'demo-lesson' },
        h('span', { class: 'small' }, l.title),
        ...ids.map((id, i) => {
          const ex = content.exercises.get(id);
          if (!ex) return null;
          return h('button', { class: 'chip', onclick: () => {
            audio();
            window.scrollTo(0, 0);
            show(-1, { title: exerciseTitle(ex), caption: ex.prompt ?? 'The pianist plays this exercise.', run: exerciseScene(ex, { listenFirst: false }) });
          } }, ex.title ?? `Exercise ${i + 1}`);
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

/**
 * A made-up player for the tree scene: everything in stage 1 and most of stage 2 practised (the
 * early ones Solid), milestone 1 passed, two songs learned. Throwaway: nothing is saved.
 */
function sampleTreeProgress() {
  const s = new Store(memoryBackend());
  const exercisesOf = (id: string) => { const l = content.lessons.get(id); return l ? lessonExercises(l) : []; };
  const m = new Mastery(s, treeNodes, exercisesOf);
  const day = dayOf(new Date(Date.now() - 3 * 86_400_000));
  const nodes = [...treeNodes.values()].filter((n) => n.lesson);
  const stage2 = nodes.filter((n) => n.stage === 2 && n.branch !== 'songs' && n.type !== 'checkpoint');
  const learned = [
    ...nodes.filter((n) => n.stage === 1),
    ...stage2.slice(0, Math.ceil(stage2.length * 0.7)),
    ...nodes.filter((n) => n.branch === 'songs').slice(0, 2),
  ];
  learned.forEach((n, i) => {
    const solid = i % 3 !== 2;
    for (const id of exercisesOf(n.lesson!)) {
      const ex = content.exercises.get(id);
      for (let k = 0; k < (ex?.reps ?? 3); k++) {
        s.record(id, { at: new Date(Date.now() - (3 + (k % (ex?.days ?? 1))) * 86_400_000).toISOString(), score: solid ? 96 : 85, stars: solid ? 3 : 2, tempo: 999, counts: true });
      }
    }
    s.put(`mastery.${n.id}`, { state: solid ? 'solid' : 'practised', box: 1, lastGood: day, solidDay: solid ? day : undefined });
  });
  return { store: s, mastery: m };
}
