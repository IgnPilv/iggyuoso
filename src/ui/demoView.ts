import { audio } from '../audio/audio';
import { content, exerciseTitle } from '../content';
import type { EarExercise, Exercise, ExplainStep, PlaygroundStep, TimedExercise } from '../content/types';
import { demo, DEMO_CALIBRATION, stopDemo } from '../demo/demo';
import { Pianist } from '../demo/pianist';
import { parse } from 'yaml';
import { loadContent, parseExercise } from '../content/load';
import { h, type View } from './dom';
import { mountExercise } from './players';
import { renderProfile, sampleProgress } from './profileView';
import { runToday, todayCard } from './todayView';
import { demoProgress, lessonGoals, nodeOfLesson } from '../progress';
import { dayOf } from '../progress/mastery';
import type { Store } from '../progress/store';
import { computerKeys } from '../midi/computerKeys';
import { currentTheme, previewTheme } from './theme';
import { explainBlock, playground } from './theory';
import { calibrateView, keyMap, testerView } from './views';

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
prompt: Three clean takes to finish this one.
tempo: 100
meter: 4/4
reps: 3
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
  const first = [...content.units].sort((a, b) => a.order - b.order)[0]?.lessons.slice(0, 2) ?? [];
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
function pathDemo() {
  const item = (title: string, cls: string, badge?: string) =>
    h('li', { class: cls }, h('a', { href: '#/demo' }, title, badge ? h('span', { class: `state-badge ${cls}` }, badge) : ''));
  return h('section', { class: 'card' },
    h('p', { class: 'small' }, 'On the home page:'),
    h('ol', { class: 'lessons' },
      item('Steps up and down', 'done'),
      item('Five-finger tune', 'next'),
      item('Skips', 'ahead', 'Ahead'),
      item('Checkpoint: first tunes', 'ahead', 'Ahead')),
    h('div', { class: 'advice small' }, h('p', {}, h('strong', {}, 'Ahead of your path. '),
      'Recommended first: Five-finger tune. You can play this now; your takes count all the same.')));
}

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
  if (oneHand) out.push({ title: 'Falling notes', caption: 'Listen first: the app plays the tune and lights each key. Then the pianist plays it, with one wrong key, one late note and one missed note. The score and the mistakes show up live. The result card shows the XP earned (clean takes, new stars and promotions only).', run: exerciseScene(oneHand, { listenFirst: true, view: 'falling' }) });
  const twoHands = pick(isTimed, (e) => !!(e.right && e.left));
  if (twoHands) out.push({ title: 'Two hands', caption: 'Right hand in blue, left hand in green. Each hand gets its own score. The sheet music rides along above the falling notes, with a playhead on the note being played and notes turning green or red.', run: exerciseScene(twoHands, { view: 'falling' }) });
  const sheet = pick(isTimed, (e) => e.display === 'staff' && !(e.right && e.left));
  if (sheet) out.push({ title: 'Sheet music', caption: 'The same exercise on "Keyboard & sheet": the staff, with notes turning green or red as they are played.', run: exerciseScene(sheet, { view: 'classic' }) });
  const rhythms = parseExercise(parse(SAMPLES.rhythms));
  out.push({ title: 'Upbeats, ties and triplets', caption: 'Note strings can start on an upbeat, tie notes across a bar line, and mix dotted notes, triplets and sixteenths. On the staff a tie is an arc, and the tied note is held, not played again.', run: exerciseScene(rhythms, { view: 'classic' }) });
  out.push({ title: 'Six-eight', caption: 'In 6/8 the click and the tempo count dotted quarters, two to a bar, as musicians count it.', run: exerciseScene(parseExercise(parse(SAMPLES.sixEight)), { view: 'falling' }) });
  out.push({ title: 'Key signatures', caption: 'Staff exercises can have a key signature (key: G). Notes are still written out in full; the staff only draws a sharp, flat or natural where a note differs from the key or from an earlier note in the bar.', run: exerciseScene(parseExercise(parse(SAMPLES.keys)), { view: 'classic' }) });
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
    title: 'Clean takes and the path',
    caption: 'One good take is not enough: an exercise is done after three clean takes (★★★, 92 or more, at full tempo), and some need them on different days. Nothing is locked: lessons further along are marked Ahead and say what is recommended first (checkpoints: everything before them Mastered), but you can open and play any of them.',
    run: (box, next, p) => {
      const timers: number[] = [];
      let takes = 0;
      // A fresh id each time, so the throwaway progress starts from zero.
      const ex = { ...parseExercise(parse(SAMPLES.reps)), id: `demo-reps-${Date.now()}` };
      demo.onTimed = (s) => p.playTimed(s, { slips: false });
      demo.onRunEnd = (mode) => {
        if (mode !== 'play') return;
        if (++takes < 3) timers.push(window.setTimeout(() => press(box, 'Play'), 2600));
        else timers.push(window.setTimeout(() => { box.append(pathDemo()); timers.push(window.setTimeout(next, 5000)); }, 1500));
      };
      const cleanup = mountExercise(box, ex, DEMO_CALIBRATION, () => {});
      setView(box, 'falling');
      timers.push(window.setTimeout(() => press(box, 'Play'), 900));
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
    title: 'Profile',
    caption: 'The profile (top right) shows the level, which rises with XP, plus the streak and a calendar of practice days. Each skill strand of the tree shows how far along its lessons are, and each hand gets its timing: early or late on average, how steady it is, and whether it is getting better. Here it shows a made-up seven weeks.',
    run: (box, next) => {
      box.append(renderProfile(sampleProgress()));
      const t = window.setTimeout(next, 12000);
      return () => clearTimeout(t);
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
  out.push({ title: 'Ear training', caption: 'The app plays a cadence to set the key, then a note, two notes or a phrase. The first key (or button) is the answer, and missed questions come back more often. The pianist gets one wrong.', run: exerciseScene(sampleOf('ear', SAMPLES.ear), { view: 'classic' }) });
  const checkpoint = allExercises().find((e) => (e.kind === 'ear' || e.kind === 'quiz') && e.feedback === 'none')
    ?? { ...(sampleOf('ear', SAMPLES.ear) as EarExercise), id: 'demo-checkpoint', feedback: 'none' as const };
  out.push({ title: 'Checkpoint', caption: 'Checkpoints test without hints: each answer is only noted, and the result lists the ones that were wrong, with the right answers.', run: exerciseScene(checkpoint, { view: 'classic' }) });
  out.push({ title: 'Theory screens', caption: 'Theory comes with pictures: a staff (with note names), lit keys with fingers, a sound to hear, the rule in a box and its key terms. A quick check holds Next until it is answered right; a wrong answer explains why. Then a playground: press any key and see it on the staff.', run: theoryScene });
  out.push({ title: 'Theory quiz', caption: 'Short theory questions, with a picture or a sound. Answer with a button, or by playing the answer. After each answer the quiz says why, with a picture, and waits for Next.', run: exerciseScene(parseExercise(parse(SAMPLES.quiz)), { view: 'classic' }) });
  out.push({ title: 'Build it', caption: 'Play a named chord (hold it down), interval or scale, untimed. "Show me" lights the keys, but then it does not count as a first try.', run: exerciseScene(sampleOf('build', SAMPLES.build), { view: 'falling', switchAt: 6000 }) });
  out.push({ title: 'Rhythm tapping', caption: 'Rhythm only: any key counts, and the score is all about timing.', run: exerciseScene(sampleOf('tap', SAMPLES.tap), { view: 'falling' }) });
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
    demo.onTimed = demo.onFind = demo.onSequence = demo.onRunEnd = demo.onAsk = undefined;
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
