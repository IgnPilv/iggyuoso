import { audio, click, loadPiano, piano, stopAll } from '../audio/audio';
import { keyWindow, toDevice, type Calibration } from '../calibration';
import type { BuildExercise, DrillGoal, EarExercise, Exercise, QuizExercise } from '../content/types';
import { demo } from '../demo/demo';
import { BuildSession, EarSession, noteName, QuizSession, sequence, soundsEnd, type DrillOutcome, type DrillResult, type Sound } from '../engine/drills';
import { midi } from '../midi/input';
import { pitchToMidi, type NoteToken, type Pitch } from '../music/notes';
import { h } from '../../../core/dom';
import { FallingView, type FallingNote, type Flash } from './falling';
import { KeyboardView } from './keyboard';
import {
  animate, header, initialView, record, regenerate, showHeld, starText, viewToggle, type OnDone, type ViewMode,
} from './players';
import { markdown } from './markdown';
import { renderStaff, type StaffNote } from './staff';
import { theoryKeys, theoryStaff } from './theory';

// Players for the question kinds: ear (listen, then answer), quiz (theory questions) and build
// (play a named chord, interval or scale). Scoring lives in engine/drills.ts.

// ---------------------------------------------------------------- shared

/** Play sounds starting now; returns when they end (ms from now). */
export function playSounds(sounds: Sound[], delay = 0): number {
  audio();
  const start = performance.now() + 80 + delay;
  for (const s of sounds) {
    if (s.click) click(start + s.at, s.click === 'accent');
    for (const n of s.notes) piano(n, start + s.at, s.dur, (s.vol ?? 0.7) / Math.sqrt(s.notes.length));
  }
  return 80 + delay + soundsEnd(sounds);
}

/**
 * The keyboard to answer on, as "Keyboard & sheet" (an on-screen keyboard) or "Falling notes"
 * (the canvas stage), with the same toggle as every other exercise. `shown` keys fall and wait
 * (or light up) when the answer is revealed.
 */
class AnswerStage {
  readonly el = h('div', { class: 'stage' });
  readonly toggle: ReturnType<typeof viewToggle>;
  private kb?: KeyboardView;
  private stop = () => {};
  private flashes: Flash[] = [];
  private shown: number[] = [];
  private opts: number[] = [];
  private done = new Map<number, string>();
  banner = '';
  /** No right / wrong colours (checkpoints with `feedback: none`). */
  silent = false;

  constructor(private cal: Calibration, private lo: number, private hi: number, ex: Exercise, private labels: 'c' | 'none' = 'c') {
    this.toggle = viewToggle(initialView(ex), (v) => this.build(v));
    this.build(this.toggle.get());
  }

  private build(v: ViewMode) {
    this.stop();
    this.el.replaceChildren();
    this.kb = undefined;
    if (v === 'classic') {
      const kb = new KeyboardView(this.lo, this.hi, { middleC: this.cal.middleC, cal: this.cal, labels: this.labels });
      this.kb = kb;
      kb.playable();
      const off = showHeld(kb);
      this.el.append(kb.el);
      this.stop = off;
      this.paint();
    } else {
      let fv: FallingView | undefined;
      let notesKey = '';
      const make = () => {
        fv?.destroy();
        const notes: FallingNote[] = this.shown.map((device) => ({ device, beat: 0, beats: 0.9, hand: 'right' }));
        fv = new FallingView(this.lo, this.hi, this.cal, notes, { lookahead: 4, barQuarters: 1000, totalBeats: 0, labels: this.labels === 'none' ? 'middle-c' : undefined });
        fv.playable();
        this.el.replaceChildren(fv.el);
        notesKey = this.shown.join(',');
      };
      make();
      const stopAnim = animate((now) => {
        if (this.shown.join(',') !== notesKey) make();
        fv!.draw({ beat: 0, held: midi.held, flashes: this.flashes, now, marked: this.marks(), banner: this.banner, noteState: () => 'now' });
      });
      this.stop = () => { stopAnim(); fv?.destroy(); };
    }
  }

  /** Option keys under the keys already played right (falling view). */
  private marks(): Map<number, string> {
    return new Map([...this.opts.map((k) => [k, '--key-option'] as [number, string]), ...this.done]);
  }

  private paint() {
    if (!this.kb) return;
    this.kb.clear('target');
    this.kb.clear('hit');
    this.kb.clear('option');
    this.opts.forEach((k) => this.kb!.set(k, 'option'));
    this.shown.forEach((k) => this.kb!.set(k, 'target'));
    this.done.forEach((_, k) => this.kb!.set(k, 'hit'));
  }

  flash(device: number, outcome: DrillOutcome) {
    if (outcome === 'ignored' || this.silent) return;
    const ok = outcome === 'correct';
    this.kb?.flash(device, ok ? 'hit' : 'wrong', ok ? 450 : 350);
    this.flashes.push({ device, kind: ok ? 'hit' : 'wrong', text: ok ? '✓' : '✗', until: performance.now() + 700 });
  }

  /** Show these keys as the answer (or [] to hide). */
  show(keys: number[]) {
    this.shown = keys;
    this.paint();
  }

  /** Light these keys as the ones to choose from (or [] for none). */
  options(keys: number[]) {
    this.opts = keys;
    this.paint();
  }

  /** Keys already played right in this task (a chord being built). */
  mark(keys: number[]) {
    this.done = new Map(keys.map((k) => [k, '--ok']));
    this.paint();
  }

  destroy() { this.stop(); }
}

/** A question answered wrongly in a no-feedback checkpoint, listed on the result card. */
type Review = { number: number; ask: string; answer: string };

const secs = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

function drillResultView(r: DrillResult & { medianMs?: number; slow?: boolean }, unit: string, retry: () => void, review: Review[] = [], goal?: DrillGoal) {
  return h('div', { class: 'result' },
    h('div', { class: 'score' }, h('span', { class: 'stars' }, starText(r.stars)), ` ${r.score}`),
    h('p', {}, r.right === r.total ? `All ${r.total} ${unit} right. Well done!` : `${r.right} of ${r.total} ${unit} right.`),
    goal ? h('p', { class: 'small' },
      `Goal: ${goal.accuracy}% right`, goal.medianMs ? `, answering in ${secs(goal.medianMs)} or less (middle answer time)` : '', '. ',
      r.medianMs !== undefined ? `Your middle answer time: ${secs(r.medianMs)}. ` : '',
      r.slow ? h('strong', {}, 'Right, but a bit slow for a clean take: aim to answer faster.') : '') : '',
    review.length ? h('ul', { class: 'review-list' }, ...review.map((x) => h('li', {}, `${x.number}. ${x.ask} `, h('strong', {}, x.answer)))) : '',
    h('button', { onclick: retry }, 'Try again'),
  );
}

/** Note an answer without saying whether it was right. */
function noteAnswer(feedback: HTMLElement, choices: HTMLElement, picked?: number) {
  feedback.textContent = 'Answer noted.';
  choices.querySelectorAll<HTMLButtonElement>('button.choice').forEach((b, i) => {
    b.disabled = true;
    b.classList.toggle('picked', i === picked);
  });
}

const choiceButtons = (choices: string[], onPick: (i: number) => void, pictures?: NoteToken[][], bar = 4) =>
  h('div', { class: pictures ? 'choices pictures' : 'choices' }, ...choices.map((c, i) => h('button', { class: 'secondary choice', 'data-choice': i, onclick: () => onPick(i) },
    pictures ? rhythmPicture(pictures[i], bar) : '', pictures ? h('span', { class: 'small' }, c) : c)));

/** A rhythm drawn on one line of the staff (the middle line), for "which rhythm did you hear". */
function rhythmPicture(tokens: NoteToken[], bar: number): Element {
  const B4: Pitch = { letter: 'B', accidental: 0, octave: 4 };
  const notes: StaffNote[] = tokens.map((t, i) => ({
    pitches: t.pitches.length ? [B4] : [], beats: t.beats, value: t.value, dotted: t.dotted, triplet: t.triplet, tie: t.tie, key: String(i),
  }));
  const { svg } = renderStaff([{ clef: 'treble', notes }], { barQuarters: bar });
  svg.classList.add('rhythm-picture');
  return svg;
}

function markChoices(box: HTMLElement, picked: number, correct: number) {
  box.querySelectorAll<HTMLButtonElement>('button.choice').forEach((b, i) => {
    b.disabled = true;
    b.classList.toggle('right', i === correct);
    b.classList.toggle('wrong', i === picked && picked !== correct);
  });
}

/** Keys around these written notes (C3 to C6 if none), with middle C in view. */
function middleRange(cal: Calibration, notes: number[] = []): [number, number] {
  const keys = notes.length ? notes.map((n) => toDevice(cal, n)) : [toDevice(cal, 48), toDevice(cal, 84)];
  return keyWindow(cal, keys);
}

// ---------------------------------------------------------------- ear

export function earPlayer(root: HTMLElement, ex: EarExercise, cal: Calibration, onDone: OnDone) {
  let session = new EarSession(ex, cal);
  void loadPiano(); // ear questions use the whole middle of the piano, and cadences go low
  const range = middleRange(cal, earNotes(ex));
  const stage = new AnswerStage(cal, range[0], range[1], ex);
  const silent = (stage.silent = ex.feedback === 'none');
  let review: Review[] = [];
  const ask = h('div', { class: 'ask' });
  const count = h('span', { class: 'small' });
  const feedback = h('p', { class: 'drill-feedback' });
  const choices = h('div');
  const result = h('div', { class: 'result-slot' });
  const listen = h('button', { class: 'secondary' }, 'Listen again');
  const nextBtn = h('button', { class: 'secondary', hidden: true }, 'Next');
  const startBtn = h('button', {}, 'Start');
  let plays = 0;
  let timers: number[] = [];
  const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  const setAsk = (text: string) => { ask.textContent = text; stage.banner = text; };

  const present = () => {
    const q = session.current;
    clearTimers();
    stage.show([]);
    stage.options(q.lit ?? []);
    feedback.textContent = '';
    feedback.className = 'drill-feedback';
    nextBtn.hidden = true;
    count.textContent = `Question ${session.number + 1} of ${ex.questions}`;
    choices.replaceChildren(q.choices ? choiceButtons(q.choices, (i) => answered(session.pick(i), i), q.pictures, q.pictureBar) : '');
    setAsk('Listen…');
    plays = 1;
    const ends = playSounds(q.play);
    listen.disabled = q.plays <= 1;
    later(ends, () => {
      setAsk(q.ask);
      demo.onAsk?.({
        index: session.number, keys: q.keys?.expect, correct: q.correct, choices: q.choices?.length,
        choose: (i) => (choices.querySelector<HTMLButtonElement>(`[data-choice="${i}"]`))?.click(), waitMs: 0,
      });
    });
  };

  const answered = (outcome: DrillOutcome, picked?: number) => {
    if (outcome === 'ignored') return;
    if (!session.answered) return; // more notes of a phrase to come
    const q = session.current;
    const credit = session.credits[session.credits.length - 1];
    if (silent) {
      noteAnswer(feedback, choices, picked);
      if (credit < 1) review.push({ number: session.number + 1, ask: q.ask, answer: q.answerText });
    } else {
      if (q.choices && picked !== undefined) markChoices(choices, picked, q.correct!);
      if (credit >= 1) {
        feedback.textContent = '✓ Right!';
        feedback.classList.add('ok');
      } else {
        feedback.textContent = `✗ It was ${q.answerText}.`;
        feedback.classList.add('bad');
        if (q.keys) stage.show(q.keys.expect);
      }
    }
    // A resolution would give the answer away, so a checkpoint skips it.
    const afterEnds = q.after.length && !silent ? playSounds(q.after, 250) : 0;
    if (session.done) {
      later(afterEnds + 900, finish);
      return;
    }
    nextBtn.hidden = false;
    later(afterEnds + (silent || credit >= 1 ? 1100 : 2600), next);
  };

  const next = () => {
    if (!session.answered || session.done) return;
    session.next();
    present();
  };

  const finish = () => {
    const r = session.result();
    const reward = record(ex, r.score, r.stars, 0);
    setAsk('Done!');
    result.replaceChildren(drillResultView(r, ex.questions === 1 ? 'answer' : 'answers', restart, review), reward);
    onDone(r);
  };

  const restart = () => {
    clearTimers();
    session = new EarSession(ex, cal);
    review = [];
    result.replaceChildren();
    present();
  };

  listen.onclick = () => {
    const q = session.current;
    if (session.answered || plays >= q.plays) return;
    plays++;
    listen.disabled = plays >= q.plays;
    playSounds(q.prompt);
  };
  nextBtn.onclick = () => { clearTimers(); next(); };
  // Keys pressed (or tapped) before Start are just trying the keys, not an answer.
  let started = false;
  startBtn.onclick = () => { started = true; startBtn.remove(); controls.append(listen, nextBtn); present(); };

  const off = midi.onNote((e) => {
    if (e.type !== 'on' || !started || session.done || !session.current.keys || session.answered) return;
    const outcome = session.press(e.note);
    stage.flash(e.note, outcome);
    answered(outcome);
  });

  const controls = h('div', { class: 'controls top' }, stage.toggle.el, startBtn);
  setAsk('Press Start, listen, then answer.');
  root.append(h('div', { class: 'ex-top' }, header(ex, 'Listen, then answer.'), controls), h('div', { class: 'drill-head' }, count), ask, choices, feedback, stage.el, result);
  queueMicrotask(() => { if (demo.active && demo.onAsk) startBtn.click(); });
  return () => { off(); clearTimers(); stopAll(); stage.destroy(); };
}

/** Every written note an ear exercise can play, to size the keyboard. */
function earNotes(ex: EarExercise): number[] {
  return ex.items.flatMap((it) => {
    if (it.type === 'note') return it.pool.map(pitchToMidi);
    if (it.type === 'melody') return it.notes.map(pitchToMidi);
    if (it.type === 'interval') return it.from.flatMap((p) => [pitchToMidi(p) - 12, pitchToMidi(p) + 12]);
    if (it.type === 'compare' || it.type === 'contour' || it.type === 'motion' || it.type === 'count') return it.range.map(pitchToMidi);
    if (it.type === 'rhythm') return [pitchToMidi(it.pitch)];
    if (it.type === 'loudness') return it.notes.map(pitchToMidi);
    return [60 - 5, 60 + 19];
  });
}

// ---------------------------------------------------------------- quiz

export function quizPlayer(root: HTMLElement, ex: QuizExercise, cal: Calibration, onDone: OnDone) {
  let session = new QuizSession(ex, cal);
  void loadPiano(ex.questions.flatMap((q) => (q.sound ?? []).flatMap((t) => t.pitches.map(pitchToMidi))));
  const plays = ex.questions.flatMap((q) => q.play?.map(pitchToMidi) ?? []);
  const needsKeys = plays.length > 0;
  const range = middleRange(cal, plays);
  const stage = needsKeys ? new AnswerStage(cal, range[0], range[1], ex) : undefined;
  const silent = ex.feedback === 'none';
  if (stage) stage.silent = silent;
  let review: Review[] = [];
  const ask = h('div', { class: 'ask' });
  const count = h('span', { class: 'small' });
  const picture = h('div', { class: 'quiz-picture' });
  const choices = h('div');
  const feedback = h('p', { class: 'drill-feedback' });
  const why = h('div', { class: 'why', hidden: true });
  const result = h('div', { class: 'result-slot' });
  const nextBtn = h('button', { class: 'secondary', hidden: true }, 'Next');
  let timers: number[] = [];
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  /** Why the answer is what it is (and why a wrong pick is wrong), with its picture. */
  const explain = (q: typeof session.current, picked?: number) => {
    const wrongWhy = picked !== undefined && picked !== q.correct ? q.choiceWhy?.[picked] : undefined;
    if (!q.why && !wrongWhy) return false;
    const text = h('div', { class: 'explain' });
    text.innerHTML = markdown([wrongWhy, q.why].filter(Boolean).join('\n\n'));
    why.replaceChildren(text, q.whyStaff ? theoryStaff(q.whyStaff) : '', q.whyKeys ? theoryKeys(q.whyKeys, cal) : '');
    why.hidden = false;
    return true;
  };

  const present = () => {
    clearTimers();
    const q = session.current;
    stage?.show([]);
    ask.textContent = q.ask;
    if (stage) stage.banner = q.play ? q.ask : '';
    count.textContent = `Question ${session.index + 1} of ${session.questions.length}`;
    feedback.textContent = '';
    feedback.className = 'drill-feedback';
    why.hidden = true;
    why.replaceChildren();
    nextBtn.hidden = true;
    picture.replaceChildren();
    if (q.staff) {
      const clef = q.clef ?? ex.clef ?? 'treble';
      const st = renderStaff([{ clef, notes: q.staff.map((t, i) => ({ pitches: t.pitches, beats: t.beats, value: t.value, dotted: t.dotted, triplet: t.triplet, tie: t.tie, key: String(i) })) }], { barQuarters: 4, key: q.key ?? ex.key });
      picture.append(h('div', { class: 'staff-wrap' }, st.svg));
    }
    if (q.sound) {
      const sounds = q.sound.flatMap((t, i, all) => {
        const beat = all.slice(0, i).reduce((a, x) => a + x.beats, 0);
        return t.pitches.length ? [{ notes: t.pitches.map(pitchToMidi), at: beat * 600, dur: t.beats * 600 * 0.92 }] : [];
      });
      picture.append(h('div', { class: 'controls' }, h('button', { class: 'secondary', onclick: () => playSounds(sounds) }, '▶ Play the sound')));
    }
    choices.replaceChildren(q.choices ? choiceButtons(q.choices, (i) => answered(session.pick(i), i)) : '');
    // The keyboard only for questions answered by playing.
    if (stage) stage.el.style.display = stage.toggle.el.style.display = q.play ? '' : 'none';
    queueMicrotask(() => demo.onAsk?.({
      index: session.index,
      keys: session.keys?.expect,
      correct: q.correct,
      choices: q.choices?.length,
      choose: (i) => choices.querySelector<HTMLButtonElement>(`[data-choice="${i}"]`)?.click(),
      waitMs: q.sound ? 400 : 0,
    }));
  };

  const answered = (outcome: DrillOutcome, picked?: number) => {
    if (outcome === 'ignored' || !session.answered) return;
    const q = session.current;
    const credit = session.credits[session.credits.length - 1];
    const answer = q.choices ? q.choices[q.correct!] : q.play!.map((p) => noteName(pitchToMidi(p))).join(' ');
    if (silent) {
      noteAnswer(feedback, choices, picked);
      if (credit < 1) review.push({ number: session.index + 1, ask: q.ask, answer });
    } else {
      if (q.choices && picked !== undefined) markChoices(choices, picked, q.correct!);
      if (credit >= 1) {
        feedback.textContent = '✓ Right!';
        feedback.classList.add('ok');
      } else {
        feedback.textContent = `✗ The answer is ${answer}.`;
        feedback.classList.add('bad');
        if (session.keys) stage?.show(session.keys.expect);
      }
    }
    // With a reason to read, the player moves on with Next (the demo reads fast).
    const reading = !silent && explain(q, picked);
    if (session.done && !reading) {
      timers.push(window.setTimeout(finish, 900));
      return;
    }
    nextBtn.textContent = session.done ? 'See the result' : 'Next';
    nextBtn.hidden = false;
    nextBtn.classList.toggle('secondary', !reading);
    if (!reading || demo.active) timers.push(window.setTimeout(session.done ? finish : next, reading ? 3500 : silent || credit >= 1 ? 1100 : 2600));
  };

  const next = () => {
    if (!session.answered || session.done) return;
    session.next();
    present();
  };

  const finish = () => {
    if (result.childElementCount) return;
    nextBtn.hidden = true;
    const r = session.result();
    const reward = record(ex, r.score, r.stars, 0);
    ask.textContent = 'Done!';
    result.replaceChildren(drillResultView(r, 'answers', restart, review, ex.goal), reward);
    onDone(r);
  };

  const restart = () => {
    const fresh = regenerate.get(ex);
    if (fresh) return fresh();
    session = new QuizSession(ex, cal);
    review = [];
    result.replaceChildren();
    present();
  };
  nextBtn.onclick = () => { clearTimers(); if (session.done) { nextBtn.hidden = true; finish(); } else next(); };

  const off = midi.onNote((e) => {
    if (e.type !== 'on' || session.done || session.answered || !session.keys) return;
    const outcome = session.press(e.note);
    stage?.flash(e.note, outcome);
    answered(outcome);
  });

  root.append(
    h('div', { class: 'ex-top' }, header(ex, 'Answer the questions.'), stage ? h('div', { class: 'controls top' }, stage.toggle.el) : ''),
    h('div', { class: 'drill-head' }, count), ask, picture, choices, stage?.el ?? '', feedback, why, h('div', { class: 'controls' }, nextBtn), result,
  );
  present();
  return () => { off(); clearTimers(); stopAll(); stage?.destroy(); };
}

// ---------------------------------------------------------------- build

export function buildPlayer(root: HTMLElement, ex: BuildExercise, cal: Calibration, onDone: OnDone) {
  let session = new BuildSession(ex, cal);
  void loadPiano(ex.tasks.flatMap((t) => t.notes));
  const range = middleRange(cal, ex.tasks.flatMap((t) => t.notes));
  const stage = new AnswerStage(cal, range[0], range[1], ex);
  const ask = h('div', { class: 'ask' });
  const count = h('span', { class: 'small' });
  const feedback = h('p', { class: 'drill-feedback' });
  const result = h('div', { class: 'result-slot' });
  let revealed = false;
  let timers: number[] = [];
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  const hint = (mode: string) => (mode === 'together' ? 'Hold all the notes down together.' : mode === 'listed' ? 'One note at a time, in order.' : 'One note at a time, in any order.');
  const hear = h('button', { class: 'secondary', onclick: () => {
    const t = session.task;
    if (!t) return;
    playSounds(t.mode === 'together' ? [{ notes: t.notes, at: 0, dur: 1400 }] : sequence(t.notes, 0, 420));
  } }, 'Hear it');
  const showMe = h('button', { class: 'secondary', onclick: () => {
    if (session.done) return;
    revealed = true;
    session.revealed();
    stage.show(session.keys);
  } }, 'Show me');

  const present = () => {
    clearTimers();
    revealed = false;
    stage.show([]);
    stage.mark([]);
    const t = session.task;
    ask.textContent = t.ask;
    stage.banner = t.ask;
    count.textContent = `Task ${session.index + 1} of ${ex.tasks.length}. ${hint(t.mode)}`;
    feedback.textContent = '';
    feedback.className = 'drill-feedback';
    queueMicrotask(() => demo.onAsk?.({ index: session.index, keys: session.keys, together: t.mode === 'together', waitMs: 0 }));
  };

  const finish = () => {
    const r = session.result();
    const reward = record(ex, r.score, r.stars, 0);
    ask.textContent = 'Done!';
    stage.banner = '';
    result.replaceChildren(drillResultView(r, 'first tries', restart), reward);
    onDone(r);
  };

  const restart = () => {
    session = new BuildSession(ex, cal);
    result.replaceChildren();
    present();
  };

  const off = midi.onNote((e) => {
    if (session.done) return;
    if (e.type === 'off') {
      const before = session.index;
      session.release(e.note);
      if (session.index !== before) taskDone(before);
      else stage.mark([...session.got]);
      return;
    }
    const before = session.index;
    const outcome = session.press(e.note);
    stage.flash(e.note, outcome);
    if (outcome === 'wrong') {
      feedback.textContent = '✗ Not that one. Try again.';
      feedback.className = 'drill-feedback bad';
    }
    if (session.index !== before) taskDone(before);
    else stage.mark([...session.got]);
  });

  const taskDone = (i: number) => {
    const clean = session.clean[i];
    feedback.textContent = clean ? '✓ Right!' : revealed ? '✓ Got it (with help).' : '✓ Got it.';
    feedback.className = 'drill-feedback ok';
    stage.show([]);
    stage.mark(ex.tasks[i].notes.map((n) => toDevice(cal, n)));
    timers.push(window.setTimeout(() => (session.done ? finish() : present()), 1000));
  };

  root.append(
    h('div', { class: 'ex-top' }, header(ex, 'Play what is asked.'), h('div', { class: 'controls top' }, stage.toggle.el, hear, showMe)),
    h('div', { class: 'drill-head' }, count), ask, feedback, stage.el, result,
  );
  present();
  return () => { off(); clearTimers(); stopAll(); stage.destroy(); };
}
