import { audio, click, loadPiano, outputLatencyMs, piano, stopAll } from '../audio/audio';
import { keyName, keyWindow, toDevice, type Calibration } from '../calibration';
import type { Exercise, FindExercise, GeneratedExercise, SequenceExercise, TimedExercise } from '../content/types';
import { generate } from '../engine/generate';
import { applyGoal } from '../scoring/goal';
import { midi } from '../midi/input';
import { computerKeys, typing } from '../midi/computerKeys';
import { tapCount } from './tapKeys';
import { chordSymbols, chordWords } from '../music/chordNames';
import { chordFingers } from '../music/fingering';
import { HandPlan } from '../music/handPlacement';
import { isTieEnd, pitchToMidi, type Hand, type NoteToken } from '../music/notes';
import { expectedDynamics, expectedNotes, expectedPedal, pickupOffset, totalBeats, type ExpectedNote } from '../music/timeline';
import { demoProgress, mastery } from '../progress';
import type { AttemptOutcome, Mastery, NodeState } from '../progress/mastery';
import { CLEAN_SCORE, store, type Attempt, type RepsGoal, type RepsProgress, type Settings } from '../progress/store';
import { treeNodes } from '../content';
import { RECORD_TEMPO_FRACTION } from '../scoring/stars';
import type { TimedResult } from '../scoring/timed';
import { COUNT_INS, TimedSession, type CountIn } from '../engine/timedSession';
import { climb, LADDER, LADDER_START, sliceBars, sliceMap, trickyBars, type LadderState } from '../engine/practice';
import { rangeSlider, sheetRange, spanText, type BarSpan } from './barRange';
import { FallingView, type Flash } from './falling';
import { fullScreen, type FullScreen } from './fullScreen';
import { FindSession, positionKeys, SequenceSession, type UntimedResult } from '../scoring/untimed';
import { demo } from '../demo/demo';
import { h } from '../../../core/dom';
import { KeyboardView } from './keyboard';
import { buildPlayer, earPlayer, quizPlayer } from './drills';
import { improvisePlayer } from './improvise';
import { renderStaff, type Clef, type StaffPart } from './staff';

export interface PlayerResult {
  score: number;
  stars: number;
}

export type OnDone = (r: PlayerResult) => void;

export const starText = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);
const HAND_LABEL: Record<string, string> = {
  right: 'Right hand', left: 'Left hand', alternating: 'Hands take turns', together: 'Hands together',
};

export function mountExercise(root: HTMLElement, ex: Exercise, cal: Calibration, onDone: OnDone): () => void {
  root.replaceChildren();
  root.classList.add('exercise', `kind-${ex.kind}`);
  const unmount = ex.kind === 'find' ? findPlayer(root, ex, cal, onDone)
    : ex.kind === 'sequence' ? sequencePlayer(root, ex, cal, onDone)
    : ex.kind === 'ear' ? earPlayer(root, ex, cal, onDone)
    : ex.kind === 'quiz' ? quizPlayer(root, ex, cal, onDone)
    : ex.kind === 'build' ? buildPlayer(root, ex, cal, onDone)
    : ex.kind === 'generated' ? generatedHost(root, ex, cal, onDone)
    : ex.kind === 'improvise' ? improvisePlayer(root, ex, cal, onDone)
    : timedHost(root, ex, cal, onDone);
  const unwatch = keepResultClear(root);
  return () => { unwatch(); unmount(); };
}

/** In a lesson panel the result card comes up over the stage: it starts where the stage starts,
 *  below the controls, and shuts the Options pop-over. Options opened again over a result moves
 *  the card down below it, so neither ever covers the other. */
function keepResultClear(root: HTMLElement): () => void {
  const place = (slot: HTMLElement, shut: boolean) => {
    const box = slot.parentElement;
    if (!slot.childElementCount || !box || !slot.closest('.focus') || slot.classList.contains('fs-result')) return;
    const drawers = box.querySelectorAll<HTMLDetailsElement>(':scope > .ex-top > details.drawer[open]');
    if (shut) drawers.forEach((d) => { d.open = false; });
    const stage = box.querySelector<HTMLElement>(':scope > .stage');
    let top = stage?.offsetTop ?? 0;
    const body = shut ? null : drawers[0]?.querySelector<HTMLElement>('.drawer-body');
    if (body) top = Math.max(top, body.getBoundingClientRect().bottom - box.getBoundingClientRect().top + 8);
    if (top) slot.style.setProperty('--result-top', `${Math.round(top)}px`);
    // A fresh result opens in full, with a button that folds it down to its score, so the marks
    // on the sheet or notes underneath can be seen.
    if (shut && !slot.querySelector(':scope > .result-fold')) {
      slot.classList.remove('folded');
      const fold = h('button', { class: 'secondary result-fold', type: 'button' }, 'See the marks');
      fold.addEventListener('click', () => {
        const folded = slot.classList.toggle('folded');
        fold.textContent = folded ? 'Show the result' : 'See the marks';
      });
      slot.prepend(fold);
    }
  };
  const watch = new MutationObserver((records) => {
    for (const r of records) {
      const t = r.target as HTMLElement;
      if (t.classList?.contains('result-slot')) place(t, true);
    }
  });
  watch.observe(root, { childList: true, subtree: true });
  const onToggle = (e: Event) => {
    const d = e.target as HTMLElement;
    if (!d.classList?.contains('drawer')) return;
    const slot = d.closest('.exercise')?.querySelector<HTMLElement>(':scope > .result-slot');
    if (slot) place(slot, false);
  };
  root.addEventListener('toggle', onToggle, true);
  return () => { watch.disconnect(); root.removeEventListener('toggle', onToggle, true); };
}

/** For a run of a generated drill: makes the next run (players call it from "Try again"). */
export const regenerate = new WeakMap<Exercise, () => void>();

/** A generated drill: each run is made fresh; reading ones also get a "new one" button. */
function generatedHost(root: HTMLElement, ex: GeneratedExercise, cal: Calibration, onDone: OnDone): () => void {
  let cleanup = () => {};
  const timed = ex.generator === 'rhythm-read' || ex.generator === 'sight-read';
  const mount = () => {
    cleanup();
    root.replaceChildren();
    const made = generate(ex);
    regenerate.set(made, mount);
    const box = h('div');
    root.append(box);
    if (timed) {
      root.prepend(h('div', { class: 'controls generated-bar' },
        h('span', { class: 'small' }, ex.generator === 'sight-read' ? 'A new tune every time.' : 'A new rhythm every time.'),
        h('button', { class: 'secondary', onclick: mount }, ex.generator === 'sight-read' ? 'New tune' : 'New rhythm')));
    }
    cleanup = mountExercise(box, made, cal, onDone);
  };
  mount();
  return () => cleanup();
}

/** A timed exercise: scored takes, or practice on some of its bars. */
function timedHost(root: HTMLElement, ex: TimedExercise, cal: Calibration, onDone: OnDone): () => void {
  return timedPlayer(root, ex, cal, onDone);
}

const barsText = ([a, b]: [number, number]) => (a === b ? `bar ${a + 1}` : `bars ${a + 1}–${b + 1}`);

export function header(ex: Exercise, fallback: string) {
  return h('div', { class: 'ex-head' },
    ex.hand ? h('span', { class: `hand-badge ${ex.hand}` }, HAND_LABEL[ex.hand]) : null,
    h('p', { class: 'prompt' }, ex.prompt ?? fallback),
  );
}

function untimedResult(r: UntimedResult, retry: () => void) {
  return h('div', { class: 'result' },
    h('div', { class: 'score' }, h('span', { class: 'stars' }, starText(r.stars)), ` ${r.score}`),
    h('p', {}, r.wrong ? `${r.steps} right, ${r.wrong} ${r.wrong === 1 ? 'wrong key' : 'wrong keys'} on the way.` : 'Every key right first time. Well done!'),
    h('button', { onclick: retry }, 'Try again'),
  );
}

/**
 * Save an attempt and update the mastery tree. Returns a line for the result card (XP, a node
 * going up or down), or '' when there is nothing to tell. The demo uses throwaway progress.
 */
export function record(ex: Exercise, score: number, stars: number, tempo: number, hands?: Partial<Record<Hand, number>>, timing?: Attempt['timing']): HTMLElement {
  const p = demo.active ? demoProgress() : { store, mastery };
  const written = ex.kind === 'timed' ? ex.tempo : tempo;
  const a: Attempt = { at: new Date().toISOString(), score, stars, tempo, hands, timing, counts: tempo >= RECORD_TEMPO_FRACTION * written };
  const before = p.store.exercise(ex.id).best?.stars ?? 0;
  const wasDone = p.store.reps(ex).done;
  p.store.record(ex.id, a);
  const reps = p.store.reps(ex);
  const clean = a.counts && score >= CLEAN_SCORE;
  const repsLine = h('p', { class: `reps-line${reps.done ? ' done' : ''}` },
    reps.done && !wasDone ? h('strong', {}, 'Exercise done! ') : clean ? h('strong', {}, 'Clean take. ') : '',
    repsText(ex, reps),
    !reps.done && !clean ? (a.counts ? ' A clean take needs 92 or more.'
      : ` Only takes from ${Math.ceil(RECORD_TEMPO_FRACTION * written)} bpm count toward them; this one was slow practice.`) : '',
    !reps.done && clean && !reps.today ? " That's all this one can count today." : '');
  return h('div', { class: 'take-summary' }, rewardLine(p.mastery.onAttempt(ex.id, a, before), p.mastery), repsLine);
}

/** What is left, in plain words: "2 more clean takes, one of them tomorrow or later", or how it was done. */
export function repsText(goal: RepsGoal, r: RepsProgress): string {
  if (r.done) return `Done: ${r.clean} clean ${r.clean === 1 ? 'take' : 'takes'}${goal.days > 1 ? ` on ${r.days} days` : ''}.`;
  const takes = `${r.left} more clean ${r.left === 1 ? 'take' : 'takes'}`;
  if (!r.later) return `${takes}.`;
  if (!r.today) return r.left === 1 ? `${takes}, tomorrow or later.` : `${takes}, one a day from tomorrow.`;
  return r.later === 1 ? `${takes}, one of them tomorrow or later.` : `${takes}, ${r.later} of them on later days.`;
}

const STATE_LABEL: Record<NodeState, string> = { locked: 'Locked', introduced: 'Introduced', practised: 'Practised', solid: 'Solid', mastered: 'Mastered' };

function rewardLine(o: AttemptOutcome, m: Mastery): HTMLElement | '' {
  const title = (id: string) => treeNodes.get(id)?.title ?? id;
  const parts: (string | HTMLElement)[] = [];
  if (o.xp) parts.push(h('strong', { class: 'xp' }, `+${o.xp} XP`));
  for (const p of o.promoted) parts.push(`“${title(p.node)}” is now ${STATE_LABEL[p.to]}.`);
  for (const id of o.reviewed) parts.push(`Review of “${title(id)}” done.`);
  for (const d of o.dropped) parts.push(`“${title(d.node)}” slipped back to ${STATE_LABEL[d.to]}: play it again soon.`);
  if (!parts.length) return '';
  const meta = m.meta;
  return h('p', { class: 'reward' }, ...parts.flatMap((x) => [x, ' ']), meta.streak > 1 ? h('span', { class: 'small' }, `${meta.streak}-day streak`) : '');
}

/** Lights held keys and returns the unsubscribe function. */
export function showHeld(kb: KeyboardView) {
  return midi.onNote((e) => kb.set(e.note, 'pressed', e.type === 'on'));
}

// ---------------------------------------------------------------- view toggle

export type ViewMode = 'classic' | 'falling';
const VIEW_LABEL: Record<ViewMode, string> = { classic: 'Keyboard & sheet', falling: 'Falling notes' };
/** Shorter labels for a phone held upright, where the switch shares a row. */
const VIEW_SHORT: Record<ViewMode, string> = { classic: 'Sheet', falling: 'Falling' };

/** The player's last pick wins everywhere; otherwise reading exercises start classic. */
export function initialView(ex: Exercise): ViewMode {
  // Reading questions are about the staff: an empty falling lane under them only distracts.
  if (ex.kind === 'quiz' && ex.questions.some((q) => q.staff)) return 'classic';
  return store.settings.view ?? (ex.kind === 'timed' && ex.display !== 'staff' ? 'falling' : 'classic');
}

/** A two-way switch shown on every playing exercise. */
export function viewToggle(start: ViewMode, onChange: (v: ViewMode) => void) {
  let current = start;
  const buttons = (Object.keys(VIEW_LABEL) as ViewMode[]).map((v) =>
    h('button', { class: 'seg', 'data-view': v, 'aria-pressed': String(v === start), 'aria-label': VIEW_LABEL[v] },
      h('span', { class: 'seg-long' }, VIEW_LABEL[v]), h('span', { class: 'seg-short' }, VIEW_SHORT[v])));
  const el = h('div', { class: 'view-toggle', role: 'group', 'aria-label': 'view' }, ...buttons);
  const set = (v: ViewMode) => {
    current = v;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
  };
  buttons.forEach((b) => b.addEventListener('click', () => {
    const v = b.dataset.view as ViewMode;
    if (v === current) return;
    set(v);
    if (!demo.active) store.settings = { ...store.settings, view: v };
    onChange(v);
  }));
  return { el, set, get: () => current, disable: (d: boolean) => buttons.forEach((b) => { b.disabled = d; }) };
}

/** Redraws a canvas view every frame until stopped. */
import { animate } from './animate';
export { animate };

// Key tints in falling notes, as design tokens (styles/tokens.css).
const FOUND = '--ok';
const POSITION = '--key-pos';

// ---------------------------------------------------------------- find

function findPlayer(root: HTMLElement, ex: FindExercise, cal: Calibration, onDone: OnDone) {
  const ask = h('div', { class: 'ask' });
  const result = h('div', { class: 'result-slot' });
  const stage = h('div', { class: 'stage' });
  let session = new FindSession(ex, cal);
  queueMicrotask(() => demo.onFind?.(session));
  const flashes: Flash[] = [];
  const found = new Map<number, string>();

  let kb: KeyboardView | undefined;
  let stopView = () => {};
  const build = (v: ViewMode) => {
    stopView();
    stage.replaceChildren();
    kb = undefined;
    if (v === 'classic') {
      // No note names here: they would give the answer away.
      kb = new KeyboardView(cal.low, cal.high, { middleC: cal.middleC });
      kb.playable();
      for (const k of found.keys()) kb.set(k, 'hit');
      const offHeld = showHeld(kb);
      stage.append(kb.el);
      stopView = offHeld;
    } else {
      const fv = new FallingView(cal.low, cal.high, cal, [], { lookahead: 4, barQuarters: 4, totalBeats: 0, labels: 'middle-c' });
      fv.playable();
      stage.append(fv.el);
      const stop = animate((now) => fv.draw({
        beat: -100, held: midi.held, noteState: () => 'coming', flashes, now, marked: found, banner: ask.textContent ?? '',
      }));
      stopView = () => { stop(); fv.destroy(); };
    }
  };
  const toggle = viewToggle(initialView(ex), build);

  const update = () => {
    if (session.done) ask.textContent = 'All found!';
    else if (ex.coverAll) ask.textContent = `Found ${session.found.filter(Boolean).length} of ${session.steps.length}`;
    else ask.replaceChildren('Play ', h('strong', {}, session.steps[session.current].label));
  };
  const restart = () => {
    session = new FindSession(ex, cal);
    demo.onFind?.(session);
    found.clear();
    kb?.clear('hit');
    result.replaceChildren();
    update();
  };

  const off = midi.onNote((e) => {
    if (e.type !== 'on' || session.done) return;
    const outcome = session.press(e.note);
    const until = performance.now() + 700;
    if (outcome === 'wrong') { kb?.flash(e.note, 'wrong'); flashes.push({ device: e.note, kind: 'wrong', text: '✗', until }); }
    if (outcome === 'correct') {
      flashes.push({ device: e.note, kind: 'hit', text: '✓', until });
      if (ex.coverAll) {
        session.steps.filter((st) => st.keys.includes(e.note)).forEach((st) => st.keys.forEach((k) => { found.set(k, FOUND); kb?.set(k, 'hit'); }));
      } else kb?.flash(e.note, 'hit', 500);
    }
    update();
    if (session.done) {
      const r = session.result();
      const reward = record(ex, r.score, r.stars, 0);
      result.replaceChildren(untimedResult(r, restart), reward);
      onDone(r);
      fs.refresh();
    }
  });

  update();
  root.append(h('div', { class: 'ex-top' }, header(ex, 'Find the keys.'), h('div', { class: 'controls top' }, toggle.el)), ask, stage, result);
  const fs = fullScreen({ score: [ask], stage, result, onChange: (on) => build(on ? 'falling' : toggle.get()) });
  build(fs.on ? 'falling' : toggle.get());
  return () => { off(); stopView(); fs.destroy(); };
}

// ---------------------------------------------------------------- sheet strip

/**
 * The staff as a strip above the falling notes, scrolling so the music being played stays a
 * third of the way in from the left, with a playhead there.
 */
export function staffStrip(staff: ReturnType<typeof renderStaff>) {
  staff.svg.style.width = `${staff.width}px`;
  staff.svg.style.minWidth = '0';
  const head = h('div', { class: 'strip-head' });
  const el = h('div', { class: 'staff-strip' }, staff.svg, head);
  let last = NaN;
  return {
    el,
    follow(at: number) {
      const x = staff.xOf(at);
      if (Math.abs(x - last) < 0.5) return;
      last = x;
      const lead = el.clientWidth / 3;
      const shift = Math.max(0, Math.min(x - lead, staff.width - el.clientWidth));
      staff.svg.style.transform = `translateX(${-shift}px)`;
      head.style.left = `${x - shift}px`;
    },
  };
}

// ---------------------------------------------------------------- sequence

export function clefFor(ex: Exercise, hand?: Hand): Clef {
  return ex.clef ?? (hand === 'left' || ex.hand === 'left' ? 'bass' : 'treble');
}

const sequenceStaff = (ex: SequenceExercise) =>
  renderStaff([{ clef: clefFor(ex), notes: ex.notes.map((p, i) => ({ pitches: [p], key: String(i), finger: ex.fingers[i] })) }], { key: ex.key });

function sequencePlayer(root: HTMLElement, ex: SequenceExercise, cal: Calibration, onDone: OnDone) {
  let session = new SequenceSession(ex, cal);
  queueMicrotask(() => demo.onSequence?.(session));
  const pos = positionKeys(ex, cal);
  const [lo, hi] = keyWindow(cal, [...session.keys, ...pos]);
  const hand: Hand = ex.hand === 'left' ? 'left' : 'right';
  const ask = h('div', { class: 'ask' });
  const result = h('div', { class: 'result-slot' });
  const stage = h('div', { class: 'stage' });
  const flashes: Flash[] = [];
  const posMarks = new Map(pos.map((k) => [k, POSITION]));
  // Hands over the keys (Options → Hands in timed exercises; the same setting here).
  const plan = exerciseOptions().hands !== false
    ? new HandPlan(session.keys.map((key, i) => ({ key, beat: i, beats: 0.9, hand, finger: ex.fingers[i] })))
    : undefined;
  const hands = plan?.hands.length ? plan : undefined;

  let kb: KeyboardView | undefined;
  let staff: ReturnType<typeof renderStaff> | undefined;
  let stopView = () => {};

  const build = (v: ViewMode) => {
    stopView();
    stage.replaceChildren();
    kb = undefined;
    staff = undefined;
    if (v === 'classic') {
      kb = new KeyboardView(lo, hi, { middleC: cal.middleC, cal, labels: 'c' });
      kb.playable();
      pos.forEach((k) => kb!.set(k, 'pos'));
      staff = ex.display === 'staff' ? sequenceStaff(ex) : undefined;
      for (let i = 0; i < session.current; i++) staff?.mark(String(i), 'hit');
      const offHeld = showHeld(kb);
      stage.append(staff ? h('div', { class: 'staff-wrap' }, staff.svg) : '', kb.el);
      stopView = offHeld;
    } else {
      // Wait mode: the next note falls to the keyboard and waits there until it is played.
      const notes = session.keys.map((device, i) => ({ device, beat: i, beats: 0.9, hand, finger: ex.fingers[i] }));
      const fv = new FallingView(lo, hi, cal, notes, { lookahead: 4, barQuarters: 1000, totalBeats: 0, hands });
      fv.playable();
      // Reading exercises keep the music in view: a staff strip above the lane.
      staff = ex.display === 'staff' ? sequenceStaff(ex) : undefined;
      const strip = staff ? staffStrip(staff) : undefined;
      for (let i = 0; i < session.current; i++) staff?.mark(String(i), 'hit');
      stage.append(strip?.el ?? '', fv.el);
      let shown = session.current;
      const stop = animate((now) => {
        shown += (session.current - shown) * 0.18;
        if (Math.abs(session.current - shown) < 0.01) shown = session.current;
        strip?.follow(shown);
        fv.draw({
          beat: shown, handBeat: shown - 0.02, held: midi.held, flashes, now, marked: posMarks,
          noteState: (i) => (i < session.current ? 'hit' : i === session.current ? 'now' : 'coming'),
        });
      });
      stopView = () => { stop(); fv.destroy(); };
    }
    update();
  };
  const toggle = viewToggle(initialView(ex), build);

  function update() {
    kb?.clear('target');
    kb?.clearLabels();
    staff?.clear('current');
    // Reading from the sheet: the hands would give the key away.
    kb?.showHands(staff || session.done ? undefined : hands?.at(session.current - 0.02));
    if (session.done) { ask.textContent = 'Done!'; return; }
    const i = session.current;
    const f = ex.fingers[i];
    if (staff) {
      staff.mark(String(i), 'current');
      ask.textContent = `Note ${i + 1} of ${session.keys.length}`;
    } else {
      kb?.set(session.keys[i], 'target', true, f ? String(f) : '');
      ask.textContent = f ? `Finger ${f}` : `Play ${session.hint()}`;
    }
  }
  const restart = () => {
    session = new SequenceSession(ex, cal);
    demo.onSequence?.(session);
    staff?.clear('hit');
    result.replaceChildren();
    build(fs.on ? 'falling' : toggle.get());
  };

  const off = midi.onNote((e) => {
    if (e.type !== 'on' || session.done) return;
    const i = session.current;
    const outcome = session.press(e.note);
    const until = performance.now() + 700;
    if (outcome === 'wrong') {
      kb?.flash(e.note, 'wrong');
      flashes.push({ device: e.note, kind: 'wrong', text: '✗', until });
    }
    if (outcome === 'correct') {
      kb?.flash(e.note, 'hit');
      staff?.mark(String(i), 'hit');
      flashes.push({ device: e.note, kind: 'hit', text: '✓', until });
    }
    update();
    if (session.done) {
      const r = session.result();
      const reward = record(ex, r.score, r.stars, 0);
      result.replaceChildren(untimedResult(r, restart), reward);
      onDone(r);
      fs.refresh();
    }
  });

  root.append(h('div', { class: 'ex-top' }, header(ex, 'Play the notes in order.'), h('div', { class: 'controls top' }, toggle.el)), ask, stage, result);
  const fs = fullScreen({ score: [ask], stage, result, onChange: (on) => build(on ? 'falling' : toggle.get()) });
  build(fs.on ? 'falling' : toggle.get());
  return () => { off(); stopView(); fs.destroy(); };
}

// ---------------------------------------------------------------- timed

/** The exercise as staves; `fingers: false` leaves the finger numbers off. */
export function staffParts(ex: TimedExercise, fingers = true): StaffPart[] {
  const part = (hand: Hand, tokens: NoteToken[], clef: Clef): StaffPart => {
    let index = 0;
    return {
      clef,
      notes: tokens.map((t, ti) => {
        const own = t.pitches.length && !isTieEnd(tokens, ti);
        const finger = own && fingers ? ex.fingers[hand][index] : undefined;
        // A chord shows a number for each note, stacked like the notes.
        const chord = finger !== undefined && t.pitches.length > 1 ? chordFingers(t.pitches.map(pitchToMidi), hand, finger) : undefined;
        return {
          pitches: t.pitches, beats: t.beats, value: t.value, dotted: t.dotted, triplet: t.triplet, tie: t.tie, finger, ...(chord ? { fingers: chord } : {}),
          // A tied note's second half shares the note's number; it is not marked on its own.
          key: !t.pitches.length ? `${hand}:r${ti}` : !own ? `${hand}:t${ti}` : `${hand}:${index++}`,
        };
      }),
    };
  };
  if (ex.right && ex.left) return [part('right', ex.right, 'treble'), part('left', ex.left, 'bass')];
  const hand: Hand = ex.right ? 'right' : 'left';
  return [part(hand, (ex.right ?? ex.left)!, clefFor(ex, hand))];
}

/** Whether any notes of the exercise make a chord that can be named over the sheet. */
const hasChords = (ex: TimedExercise) => chordSymbols(staffParts(ex, false)).length > 0;

const TEMPO_STEPS = [50, 60, 70, 80, 90, 100];

// Exercise options (tempo, click, guide notes, the Options drawer) carry over: what the player
// picked last is where the next exercise starts. The demo keeps its own, never saved.
let demoOptions: Partial<Settings> = {};
type ExerciseOptions = Pick<Settings, 'metronome' | 'guide' | 'tempo' | 'countIn' | 'optionsOpen' | 'fingers' | 'hands' | 'chords'>;
export const exerciseOptions = (): ExerciseOptions => (demo.active ? { ...store.settings, ...demoOptions } : store.settings);
export function setExerciseOptions(o: Partial<ExerciseOptions>) {
  if (demo.active) demoOptions = { ...demoOptions, ...o };
  else store.settings = { ...store.settings, ...o };
}
export const resetDemoOptions = () => { demoOptions = {}; };

/** Practice mode and its bars, per exercise, while the app is open (never saved). */
const practiceMemory = new Map<string, { on: boolean; span: BarSpan }>();

/** `opening`: open in practice on these bars (the result card's "Practise bars 2–3"). */
function timedPlayer(root: HTMLElement, ex: TimedExercise, cal: Calibration, onDone: OnDone, opening?: BarSpan) {
  const settings = exerciseOptions();
  const progress = demo.active ? demoProgress().store : store;
  // The tempo ladder: the tempo select starts on the current rung; takes on that rung climb it.
  const rungs = ex.ladder;
  const ladderKey = `ladder.${ex.id}`;
  let ladder: LadderState = (rungs && progress.get<LadderState>(ladderKey)) || LADDER_START;
  if (rungs) ladder = { ...ladder, rung: Math.min(ladder.rung, rungs.length - 1) };
  // Rhythm echo: Play sounds the rhythm unseen, then the player taps it back; the staff shows after.
  const echo = !!ex.echo;
  let revealed = false;

  // Practice: the bars picked go round until Stop, and nothing is saved. An echo is heard whole
  // each time, so it has no practice mode.
  const canPractise = !echo;
  const ranged = canPractise && ex.bars > 1;
  const remembered = demo.active ? undefined : practiceMemory.get(ex.id);
  let practising = canPractise && (!!opening || !!remembered?.on);
  let span: BarSpan = opening ?? remembered?.span ?? [0, ex.bars - 1];
  const remember = () => { if (!demo.active) practiceMemory.set(ex.id, { on: practising, span }); };
  if (opening) remember();

  // What a take plays: the whole exercise, or in practice the bars picked. The sheet always shows
  // the whole piece; `key` finds a played note on it.
  const wholeExpected = expectedNotes(ex);
  void loadPiano(wholeExpected.map((e) => e.midi));
  const wholeDevices = wholeExpected.map((e) => toDevice(cal, e.midi));
  const [lo, hi] = keyWindow(cal, wholeDevices);
  const planOf = (notes: ExpectedNote[], devices: number[]) => (ex.tap || echo ? undefined
    : new HandPlan(notes.map((e, i) => ({ key: devices[i], beat: e.beat, beats: e.beats, hand: e.hand, finger: e.finger }))));
  const wholePlan = planOf(wholeExpected, wholeDevices);
  const makeTarget = () => {
    const whole = !practising || (span[0] === 0 && span[1] === ex.bars - 1);
    if (whole) return { ex, expected: wholeExpected, devices: wholeDevices, plan: wholePlan, from: 0, offset: 0, key: (e: { hand: Hand; index: number }) => `${e.hand}:${e.index}` };
    const part = sliceBars(ex, span[0], span[1]);
    const expected = expectedNotes(part);
    const devices = expected.map((e) => toDevice(cal, e.midi));
    const map = sliceMap(ex, span[0], part);
    return { ex: part, expected, devices, plan: planOf(expected, devices), from: span[0], offset: map.offset, key: (e: { hand: Hand; index: number }) => map.keys.get(`${e.hand}:${e.index}`) ?? '' };
  };
  let target = makeTarget();
  /** The bars changed while practice went round: the next round picks them up. */
  let stale = false;

  // Reading exercises start on the sheet, the rest on falling notes, until the player picks.
  const stage = h('div', { class: 'stage' });
  let falling: FallingView | undefined;
  let staff: ReturnType<typeof renderStaff> | undefined;
  let strip: ReturnType<typeof staffStrip> | undefined;
  let kb: KeyboardView | undefined;
  let sheetHandles: ReturnType<typeof sheetRange> | undefined;
  let offHeld = () => {};
  // Finger numbers on the notes, the sheet and the lit keys (Options → Fingers; on unless switched off).
  let fingersOn = settings.fingers !== false;
  // Hands over the keys (Options → Hands, beta; on unless switched off). Not for taps or echoes,
  // whose notes are placeholders.
  let handsOn = settings.hands !== false;
  // Chord names over the sheet (Options → Chord names; on unless switched off). Not over taps'
  // placeholders, nor in reading tests, where they would give the left hand's chords away.
  let chordsOn = settings.chords !== false;
  const chordable = !ex.tap && !ex.goal;
  const hasHands = !!wholePlan?.hands.length;
  /** Drill tests of reading keep the keys dark while playing, so the hands stay off then too. */
  let handsHidden = false;
  const showHands = (beat: number) => kb?.showHands(handsOn && target.plan?.hands.length && !handsHidden ? target.plan.at(beat) : undefined, fingersOn);
  // The bars to practise: a slider over the stage, and handles on the sheet's bar lines.
  const onSpan = (r: BarSpan, done: boolean) => {
    span = r;
    remember();
    slider?.set(r);
    sheetHandles?.update(r);
    if (!done) return;
    if (run || looping) {
      stale = true;
      status.textContent = `${spanText(r)} from the next round.`;
      return;
    }
    retarget();
  };
  const slider = ranged ? rangeSlider(ex.bars, span, onSpan) : undefined;
  let view: ViewMode = 'classic';
  const buildView = (v: ViewMode) => {
    view = v;
    falling?.destroy();
    offHeld();
    stage.replaceChildren();
    falling = undefined; staff = undefined; kb = undefined; strip = undefined; sheetHandles = undefined;
    const sheet = () => renderStaff(staffParts(ex, fingersOn), { barQuarters: ex.meter.quarters, startQuarter: pickupOffset(ex), pedal: expectedPedal(ex), dynamics: expectedDynamics(ex), key: ex.key, chords: chordsOn && chordable });
    const t = target;
    if (view === 'falling' && !echo) {
      falling = new FallingView(lo, hi, cal,
        t.expected.map((e, i) => ({ device: t.devices[i], beat: e.beat, beats: e.beats, hand: e.hand, finger: fingersOn ? e.finger : undefined })),
        { lookahead: Math.max(4, ex.meter.quarters), barQuarters: ex.meter.quarters, totalBeats: totalBeats(t.ex), pulse: ex.meter.pulse, pedal: expectedPedal(t.ex), dynamics: expectedDynamics(t.ex),
          hands: handsOn && t.plan?.hands.length ? t.plan : undefined, handNumbers: fingersOn, firstBar: t.from,
          chords: chordsOn && chordable ? chordSymbols(staffParts(t.ex, false)).map((c) => ({ beat: c.at + pickupOffset(t.ex), name: chordWords(c.name) })) : undefined });
      // The sheet music rides along above the lane (not for tap exercises: their notes are placeholders).
      if (!ex.tap) {
        staff = sheet();
        strip = staffStrip(staff);
      }
      falling.playable();
      stage.append(practising && slider ? slider.el : '', strip?.el ?? '', falling.el);
      offHeld = () => {};
      idle();
    } else {
      staff = sheet();
      kb = new KeyboardView(lo, hi, { middleC: cal.middleC, cal, labels: 'c' });
      kb.playable();
      offHeld = showHeld(kb);
      stage.append(practising && slider ? slider.el : '', h('div', { class: 'staff-wrap', hidden: echo && !revealed }, staff.svg), kb.el);
      showHands(-1);
    }
    if (practising && ranged && staff) sheetHandles = sheetRange(staff, ex.bars, ex.meter.quarters, pickupOffset(ex), () => span, onSpan);
  };

  const hud = h('div', { class: 'hud' });
  const status = h('div', { class: 'status-line' });
  const rounds = h('span', { class: 'rounds', 'aria-label': 'practice rounds' });
  const result = h('div', { class: 'result-slot' });
  const intro = () => (practising
    ? `${ranged ? `Practice on ${spanText(span).toLowerCase()} of ${ex.bars}: drag the ends to pick the bars, then press Play.` : 'Practice: press Play.'} It goes round until Stop; nothing is saved.`
    : echo ? 'Press Play to hear the rhythm.' : 'Press Listen to hear it, then Play.');
  // The player's last pick wins over the ladder's step (the ladder line still says which counts).
  const startPercent = settings.tempo ?? (rungs ? rungs[ladder.rung] : 100);
  const steps = [...new Set([...TEMPO_STEPS, ...(rungs ?? []), startPercent])].sort((a, b) => a - b);
  const tempoSel = h('select', { 'aria-label': 'tempo' }, ...steps.map((p) => h('option', { value: p, selected: p === startPercent }, `${p}%`)));
  const ladderLine = h('p', { class: 'small ladder-line' });
  const showLadder = () => {
    if (!rungs) return;
    const left = LADDER.cleanTakes - ladder.clean;
    const top = ladder.rung === rungs.length - 1;
    ladderLine.textContent = `Tempo ladder: ${rungs[ladder.rung]}% (step ${ladder.rung + 1} of ${rungs.length}). `
      + (top ? 'Full tempo: keep it clean.' : `${left} more clean ${left === 1 ? 'take' : 'takes'} (${LADDER.cleanScore}+) at ${rungs[ladder.rung]}% to move up.`)
      + (rungs[ladder.rung] < RECORD_TEMPO_FRACTION * 100 ? ` The lesson's clean takes count from ${RECORD_TEMPO_FRACTION * 100}%.` : '');
  };
  showLadder();
  let again = 0; // the next practice round
  let looping = false; // practice is going round (also in the gap between rounds)
  let round = 0;
  const metro = h('input', { type: 'checkbox', checked: settings.metronome });
  const guide = h('input', { type: 'checkbox', checked: settings.guide });
  const fingerBox = h('input', { type: 'checkbox', checked: fingersOn });
  fingerBox.addEventListener('change', () => {
    fingersOn = fingerBox.checked;
    setExerciseOptions({ fingers: fingersOn });
    buildView(view);
  });
  const handBox = h('input', { type: 'checkbox', checked: handsOn });
  handBox.addEventListener('change', () => {
    handsOn = handBox.checked;
    setExerciseOptions({ hands: handsOn });
    buildView(view);
  });
  const chordBox = h('input', { type: 'checkbox', checked: chordsOn });
  chordBox.addEventListener('change', () => {
    chordsOn = chordBox.checked;
    setExerciseOptions({ chords: chordsOn });
    buildView(view);
  });
  metro.addEventListener('change', () => setExerciseOptions({ metronome: metro.checked }));
  guide.addEventListener('change', () => setExerciseOptions({ guide: guide.checked }));
  tempoSel.addEventListener('change', () => setExerciseOptions({ tempo: Number(tempoSel.value) }));
  const COUNT_IN_LABELS: Record<CountIn, string> = { bar: 'Full bar', short: 'Short', none: 'None' };
  const countSel = h('select', { 'aria-label': 'count-in' }, ...COUNT_INS.map((c) => h('option', { value: c, selected: c === (settings.countIn ?? 'bar') }, COUNT_IN_LABELS[c])));
  countSel.addEventListener('change', () => setExerciseOptions({ countIn: countSel.value as CountIn }));
  const toggle = viewToggle(initialView(ex), (v) => buildView(v));
  // Scored takes count (records, clean takes, the ladder); Practice loops bars and saves nothing.
  const modeBtns = (['scored', 'practice'] as const).map((m) => h('button', {
    class: 'seg', 'data-mode': m, 'aria-pressed': String((m === 'practice') === practising),
    title: m === 'scored' ? 'Takes count: score, stars, clean takes' : 'Loop the bars you pick; nothing is saved',
  }, m === 'scored' ? 'Scored' : 'Practice'));
  const modeEl = h('div', { class: 'view-toggle mode-toggle', role: 'group', 'aria-label': 'mode' }, ...modeBtns);
  modeBtns.forEach((b) => b.addEventListener('click', () => setPractice(b.dataset.mode === 'practice')));
  const listenBtn = h('button', { class: 'secondary' }, 'Listen');
  const playBtn = h('button', {}, 'Play');
  const stopBtn = h('button', { class: 'secondary', disabled: true }, 'Stop');
  const pauseBtn = h('button', { class: 'secondary', disabled: true, title: 'Space' }, 'Pause');

  let run: { cancel: () => void; togglePause: () => void } | undefined;
  const flashes: Flash[] = [];
  let fs: FullScreen | undefined;
  // While a take runs the lesson does not scroll away from it (a swipe on the notes stays put).
  const setRunning = (on: boolean) => { fs?.setRunning(on); root.classList.toggle('taking', on); };

  // Draw a still frame (before the first run, or after switching views); the sheet strip shows
  // where the take starts.
  function idle() {
    falling?.draw({ beat: -1, held: midi.held, noteState: () => 'coming', flashes: [], now: performance.now(), banner: practising ? spanText(span) : 'Press Listen or Play' });
    const s = strip;
    if (s) requestAnimationFrame(() => s.follow(target.offset + pickupOffset(target.ex)));
  }
  function retarget() {
    stale = false;
    target = makeTarget();
    buildView(view);
    status.textContent = intro();
  }
  const endLoop = () => {
    looping = false;
    clearTimeout(again);
    if (stale) retarget();
  };

  /** Into practice (on these bars) or back to scored takes. */
  function setPractice(on: boolean, r?: BarSpan) {
    if (!canPractise) return;
    run?.cancel();
    endLoop();
    practising = on;
    if (r) { span = r; slider?.set(r); }
    remember();
    modeBtns.forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.mode === 'practice') === on)));
    result.replaceChildren();
    hud.replaceChildren();
    rounds.replaceChildren();
    round = 0;
    root.classList.toggle('practising', on);
    ladderLine.hidden = on;
    retarget();
    fs?.refresh();
  }

  // In a lesson panel Options is a pop-over: it shuts when a take starts, so it never covers the music.
  let closeOptions = () => {};
  /** `echoTurn`: the tap-back half of an echo, right after the app played the rhythm. */
  const start = (mode: 'listen' | 'play', echoTurn = false) => {
    closeOptions();
    run?.cancel();
    clearTimeout(again);
    if (stale) { stale = false; target = makeTarget(); buildView(view); }
    looping = practising && mode === 'play';
    const t = target;
    const expected = t.expected;
    audio();
    result.replaceChildren();
    hud.replaceChildren();
    flashes.length = 0;
    staff?.clear('hit'); staff?.clear('miss'); staff?.clear('wrong');
    const tempo = Math.round((ex.tempo * Number(tempoSel.value)) / 100);
    const session = new TimedSession(t.ex, cal, {
      tempo, mode, startAt: performance.now() + 600, latencyMs: outputLatencyMs() + store.settings.latencyMs,
      countIn: echoTurn ? 'bar' : (countSel.value as CountIn),
    });
    for (const c of session.clicks(metro.checked)) click(c.time, c.accent);
    if (mode === 'listen' || (guide.checked && !echo)) for (const g of session.guide()) piano(g.midi, g.time, g.durMs);
    session.pedalStart(midi.pedalDown);
    if (mode === 'play') demo.onTimed?.(session);
    const tapsAtStart = tapCount();

    let lastMessage = '';
    const offPedal = midi.onPedal((e) => session.pedalChange(e.down, e.time));
    const offNotes = midi.onNote((e) => {
      if (e.type === 'off') { session.noteOff(e.note, e.time); return; }
      const j = session.noteOn(e.note, e.time, e.velocity);
      if (!j) return;
      const until = performance.now() + 900;
      if (j.kind === 'hit') {
        const off = j.offsetMs!;
        const text = Math.abs(off) <= 50 ? '✓' : off < 0 ? 'early' : 'late';
        flashes.push({ device: e.note, kind: 'hit', text, until });
        if (text !== '✓') lastMessage = `${HAND_LABEL[j.expected!.hand]}: ${Math.abs(off)} ms ${text}`;
      } else if (j.kind === 'wrong') {
        flashes.push({ device: e.note, kind: 'wrong', text: '✗', until });
        lastMessage = ex.pitchMatch === 'side'
          ? `Wrong side: that was the ${j.expected!.midi >= 60 ? 'right' : 'left'} hand's beat (right hand from middle C up)`
          : `Wrong key: ${keyName(cal, e.note)}, the note was ${keyName(cal, toDevice(cal, j.expected!.midi))}`;
        kb?.flash(e.note, 'wrong');
      } else {
        flashes.push({ device: e.note, kind: 'extra', text: 'extra', until });
        lastMessage = `Extra note: ${keyName(cal, e.note)}`;
        kb?.flash(e.note, 'wrong');
      }
    });

    const scoreEl = h('span', { class: 'live-score' });
    const countsEl = h('span', { class: 'live-counts' });
    const msgEl = h('span', { class: 'live-msg' });
    const pedalEl = h('span', { class: 'pedal-pill' }, 'Pedal');
    if (mode === 'play') hud.append(scoreEl, countsEl, ...(session.pedalLine.length ? [pedalEl] : []), msgEl);
    let lastHud = 0;
    let missedSeen = 0;

    let raf = 0;
    const frame = () => {
      const now = performance.now();
      const pos = session.position(now);
      const noteState = (i: number) => session.liveState(expected[i], pos.beat);
      const roundText = looping ? `Round ${round + 1} · ` : '';
      status.textContent = session.paused ? 'Paused. Press Space or Resume to go on, after a bar to count back in.'
        : pos.phase === 'count-in' ? (pos.count ? `${roundText}${echoTurn ? 'Your turn: ' : ''}Count in… ${pos.count}` : 'Get ready…')
        : pos.phase === 'playing' ? (mode === 'listen' ? (echo ? 'Listen…' : 'Listen and watch the keys…') : echo ? 'Tap it back!' : `${roundText}Play!`)
        : pos.phase === 'waiting' ? 'Get ready…' : '';
      falling?.draw({
        beat: pos.beat, count: pos.phase === 'count-in' && !session.paused ? pos.count : undefined, held: midi.held, noteState, flashes, now, pedalDown: midi.pedalDown,
        banner: session.paused ? 'Paused' : pos.phase === 'waiting' ? 'Get ready' : undefined,
      });
      strip?.follow(Math.max(0, pos.beat) + t.offset);
      if (kb) {
        kb.clear('target');
        kb.clearLabels();
        showHands(pos.beat);
      }
      staff?.clear('current');
      expected.forEach((e, i) => {
        if (pos.beat >= e.beat && pos.beat < e.beat + e.beats) {
          // Generated drills test reading: the keys stay dark while the player plays.
          if (!(ex.goal && mode === 'play') && !echo) kb?.set(t.devices[i], 'target', true, e.finger && fingersOn ? String(e.finger) : '');
          staff?.mark(t.key(e), 'current');
        }
        if (staff && mode === 'play') {
          const st = noteState(i);
          if (st === 'hit' || st === 'missed') staff.mark(t.key(e), st === 'hit' ? 'hit' : 'miss');
        }
      });
      if (mode === 'play' && now - lastHud > 100) {
        lastHud = now;
        pedalEl.classList.toggle('down', midi.pedalDown);
        const live = session.liveScore(now);
        scoreEl.textContent = String(live.score);
        scoreEl.className = `live-score ${live.score >= 92 ? 's3' : live.score >= 80 ? 's2' : live.score >= 65 ? 's1' : 's0'}`;
        countsEl.textContent = `✓ ${live.hits}   ✗ ${live.wrong} wrong   ${live.missed} missed${live.extras ? `   ${live.extras} extra` : ''}`;
        if (live.missed > missedSeen) { missedSeen = live.missed; lastMessage = 'Missed a note'; }
        msgEl.textContent = lastMessage;
      }
      if (pos.phase !== 'done') raf = requestAnimationFrame(frame);
      else finish();
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      offNotes();
      offPedal();
      stopAll();
      kb?.clear('target');
      kb?.clearLabels();
      staff?.clear('current');
      listenBtn.disabled = playBtn.disabled = false;
      toggle.disable(false);
      modeBtns.forEach((b) => { b.disabled = false; });
      fingerBox.disabled = handBox.disabled = chordBox.disabled = false;
      handsHidden = false;
      stopBtn.disabled = !looping;
      pauseBtn.disabled = true;
      pauseBtn.textContent = 'Pause';
      run = undefined;
      setRunning(false);
    };

    // Space or the Pause button: the clock holds where it is; going on gives a bar to count back
    // in (or the rest of the count-in, when paused before the music started).
    const togglePause = () => {
      const now = performance.now();
      if (!session.paused) {
        if (session.position(now).phase === 'done') return;
        session.pause(now);
        stopAll();
        pauseBtn.textContent = 'Resume';
        setRunning(false);
        return;
      }
      const started = session.position(now).beat >= 0;
      const lead = started ? ex.meter.quarters : 0;
      const at = session.resume(now, lead)!;
      if (started && (ex.click ?? 'on') !== 'off') {
        for (let b = lead; b > 1e-6; b -= ex.meter.pulse) click(at - b * session.beatMs, Math.abs(b - lead) < 1e-6);
      }
      for (const c of session.clicks(metro.checked)) if (c.time >= Math.max(at, now) - 1) click(c.time, c.accent);
      if (mode === 'listen' || (guide.checked && !echo)) for (const g of session.guide()) if (g.time >= at - 1) piano(g.midi, g.time, g.durMs);
      pauseBtn.textContent = 'Pause';
      setRunning(true);
    };

    const finish = () => {
      stop();
      if (mode === 'listen' && echo) { start('play', true); return; }
      if (mode === 'listen') { status.textContent = practising ? 'Now you try: press Play. It goes round until Stop.' : 'Now you try: press Play.'; idle(); demo.onRunEnd?.('listen'); return; }
      if (echo && !revealed) {
        // Now the rhythm can be seen, marked with how each note went.
        revealed = true;
        stage.querySelector<HTMLElement>('.staff-wrap')?.removeAttribute('hidden');
      }
      status.textContent = '';
      const raw = session.result();
      const goal = applyGoal(raw.score, ex.goal);
      const r = ex.goal ? { ...raw, score: goal.score, stars: goal.stars } : raw;
      for (const n of r.notes) staff?.mark(t.key(n.expected), n.outcome === 'hit' ? 'hit' : n.outcome);
      hud.replaceChildren();
      if (practising) {
        // A practice round: a small result, and the next round starts by itself. Nothing is saved.
        round++;
        rounds.append(h('span', { class: `round-chip ${r.score >= 92 ? 's3' : r.score >= 80 ? 's2' : r.score >= 65 ? 's1' : 's0'}`, title: `Round ${round}: ${r.score}` }, String(r.score)));
        while (rounds.childElementCount > 8) rounds.firstElementChild!.remove();
        const tip = r.feedback[0]?.message.replace(/\.$/, '');
        status.textContent = `Round ${round}: ${r.score} ${starText(r.stars)}${tip ? ` · ${tip}` : ''}. Again in a moment; Stop to finish.`;
        again = window.setTimeout(() => start('play'), 2500);
        demo.onRunEnd?.('play');
        return;
      }
      const tapped = tapCount() > tapsAtStart;
      if (session.wasPaused || tapped) {
        // A take with a pause, or with keys tapped on the screen, is practice: shown, never saved.
        status.textContent = tapped
          ? `${r.score}. Keys tapped on the screen are for trying things out, so this take is practice and is not saved; play it on the piano (or the computer keyboard) to count it.`
          : `${r.score}. A take with a pause is practice and is not saved; play it through without pausing to count it.`;
        result.replaceChildren(timedResult(r, ex, cal));
        demo.onRunEnd?.('play');
        return;
      }
      const handScores = Object.fromEntries(r.hands.map((hr) => [hr.hand, hr.score]));
      const timing = Object.fromEntries(r.hands.filter((hr) => hr.meanOffsetMs !== null)
        .map((hr) => [hr.hand, { mean: Math.round(hr.meanOffsetMs!), spread: hr.spreadMs === null ? null : Math.round(hr.spreadMs) }]));
      const reward = record(ex, r.score, r.stars, tempo, handScores, timing);
      let ladderNote: HTMLElement | '' = '';
      if (rungs && Number(tempoSel.value) === rungs[ladder.rung]) {
        const step = climb(rungs, ladder, r.score);
        ladder = step.state;
        progress.put(ladderKey, ladder);
        if (step.moved) {
          tempoSel.value = String(rungs[ladder.rung]);
          showTempo();
          ladderNote = h('p', { class: 'reward' }, step.moved === 'up'
            ? `Tempo ladder: up to ${rungs[ladder.rung]}%.`
            : `Tempo ladder: back to ${rungs[ladder.rung]}% for now.`);
        } else if (r.score >= LADDER.cleanScore && ladder.rung < rungs.length - 1) {
          ladderNote = h('p', { class: 'small' }, `Tempo ladder: clean take at ${rungs[ladder.rung]}% (${ladder.clean} of ${LADDER.cleanTakes} to move up).`);
        }
        showLadder();
      }
      const tricky = trickyBars(r, ex, session.beatMs);
      const loopTip = tricky && ranged
        ? h('p', { class: 'small' }, 'Most mistakes were in ', h('strong', {}, barsText(tricky)), '. ',
          h('button', { class: 'secondary', onclick: () => setPractice(true, tricky) }, `Practise ${barsText(tricky)}`))
        : '';
      // Go again from the card, without scrolling back up to Play.
      const againRow = h('div', { class: 'controls' },
        h('button', { onclick: () => { stage.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); start(echo ? 'listen' : 'play'); } }, 'Try again'),
        regenerate.has(ex) ? h('button', { class: 'secondary', onclick: () => regenerate.get(ex)!() }, ex.tap ? 'New rhythm' : 'New tune') : '');
      result.replaceChildren(timedResult(r, ex, cal), reward, ladderNote, loopTip, againRow);
      onDone(r);
      fs?.refresh();
      demo.onRunEnd?.('play');
    };

    listenBtn.disabled = playBtn.disabled = true;
    toggle.disable(true);
    modeBtns.forEach((b) => { b.disabled = true; });
    fingerBox.disabled = handBox.disabled = chordBox.disabled = true;
    handsHidden = !!ex.goal && mode === 'play';
    stopBtn.disabled = pauseBtn.disabled = false;
    setRunning(true);
    raf = requestAnimationFrame(frame);
    run = { cancel: stop, togglePause };
  };

  listenBtn.onclick = () => start('listen');
  playBtn.onclick = () => start(echo ? 'listen' : 'play');
  if (echo) listenBtn.hidden = true;
  stopBtn.onclick = () => {
    const wasLooping = looping;
    looping = false;
    run?.cancel();
    endLoop();
    stopBtn.disabled = true;
    status.textContent = wasLooping && round ? `Stopped after ${round} ${round === 1 ? 'round' : 'rounds'}. Play to go again, or Scored to count a take.` : 'Stopped.';
    idle();
  };
  pauseBtn.onclick = () => run?.togglePause();
  // Space plays, pauses and resumes (unless the computer keyboard needs it for the pedal here).
  const onSpace = (e: KeyboardEvent) => {
    if (e.code !== 'Space' || e.ctrlKey || e.metaKey || e.altKey || typing(e.target) || !root.isConnected) return;
    if (computerKeys.enabled && expectedPedal(ex).length) return;
    if (demo.active && e.isTrusted) return;
    e.preventDefault();
    if (e.repeat) return;
    // A focused button would also take the Space as a click.
    if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur();
    if (run) run.togglePause();
    else if (!playBtn.disabled) playBtn.click();
  };
  window.addEventListener('keydown', onSpace);

  // Transport up front (Scored / Practice, Listen, Play, Stop, view); tempo, click and guide in a drawer.
  const tempoChip = h('span', { class: 'meta-chip' });
  const showTempo = () => {
    tempoChip.textContent = `${ex.meter.beats}/${ex.meter.unit} · ${Math.round((ex.tempo * Number(tempoSel.value)) / 100)} bpm`;
  };
  showTempo();
  tempoSel.addEventListener('change', showTempo);
  const drawer = h('details', { class: 'drawer', open: !!settings.optionsOpen },
    h('summary', {}, 'Options', tempoChip),
    h('div', { class: 'drawer-body' },
      h('div', { class: 'controls' },
        h('label', {}, 'Tempo ', tempoSel),
        h('label', {}, 'Count-in ', countSel),
        h('label', {}, metro, ' Click'),
        h('label', {}, guide, ' Guide notes'),
        ex.tap ? '' : h('label', {}, fingerBox, ' Fingers'),
        hasHands ? h('label', {}, handBox, ' Hands (beta)') : '',
        chordable && hasChords(ex) ? h('label', {}, chordBox, ' Chord names') : ''),
      canPractise ? h('p', { class: 'small drawer-note' }, ranged ? 'To loop some bars, switch to Practice and drag the ends of the bar slider (or the handles on the sheet).' : 'Practice plays it round and round, and saves nothing.') : ''));
  let quiet = false;
  drawer.addEventListener('toggle', () => { if (quiet) quiet = false; else setExerciseOptions({ optionsOpen: drawer.open }); });
  closeOptions = () => { if (drawer.open && drawer.closest('.focus')) drawer.open = false; };
  // A pop-over never opens by itself over the music: the remembered "open" is for the drawer outside lessons.
  requestAnimationFrame(() => { if (drawer.open && drawer.closest('.focus')) { quiet = true; drawer.open = false; } });
  // A tap anywhere else shuts the pop-over too.
  const onOutside = (e: PointerEvent) => { if (!drawer.contains(e.target as Node)) closeOptions(); };
  document.addEventListener('pointerdown', onOutside);
  const transportMain = h('div', { class: 'transport-main' }, listenBtn, playBtn, pauseBtn, stopBtn);
  const transport = h('div', { class: 'transport' }, canPractise ? modeEl : '', transportMain, echo ? '' : toggle.el);
  root.append(
    h('div', { class: 'ex-top' },
      header(ex, echo ? 'Press Play: listen to the rhythm, then tap it back after a bar of count-in.' : ex.pitchMatch === 'side' ? 'Tap the rhythm: right hand on any key from middle C up, left hand on any key below.'
        : ex.tap ? 'Tap the rhythm on any key, with the click.' : 'Play along with the click.'),
      transport,
      drawer),
    h('div', { class: 'ex-meta' }, rungs ? ladderLine : '', status, rounds, hud),
    stage,
    result,
  );
  root.classList.toggle('practising', practising);
  ladderLine.hidden = practising;
  status.textContent = intro();
  // A phone on its side: falling notes only, full screen (an echo has no falling notes).
  if (!echo) {
    fs = fullScreen({ score: [hud, rounds], controls: canPractise ? [modeEl, transportMain] : transportMain, stage, result,
      onChange: (on) => buildView(on ? 'falling' : toggle.get()) });
  }
  buildView(fs?.on ? 'falling' : toggle.get());
  return () => { run?.cancel(); clearTimeout(again); falling?.destroy(); offHeld(); fs?.destroy(); window.removeEventListener('keydown', onSpace); document.removeEventListener('pointerdown', onOutside); };
}

/** The take's score, each hand and its habits. What it counted for is said by `record`. */
function timedResult(r: TimedResult, ex: TimedExercise, cal: Calibration) {
  const handLine = r.hands.map((hr) => {
    const timing = hr.meanOffsetMs === null ? '' : ` · ${Math.abs(hr.meanOffsetMs)} ms ${hr.meanOffsetMs < 0 ? 'early' : 'late'} on average`;
    return h('li', {}, h('strong', {}, `${HAND_LABEL[hr.hand]} ${hr.score}`), ` · ${hr.hits}/${hr.notes} notes${timing}`);
  });
  const wrongKeys = r.notes.filter((n) => n.outcome === 'wrong').slice(0, 3)
    .map((n) => ex.pitchMatch === 'side'
      ? `a ${n.played!.midi >= 60 ? 'right' : 'left'}-hand key on a ${n.expected.midi >= 60 ? 'right' : 'left'}-hand beat`
      : `${keyName(cal, toDevice(cal, n.played!.midi))} instead of ${keyName(cal, toDevice(cal, n.expected.midi))}`);
  return h('div', { class: 'result' },
    h('div', { class: 'score' }, h('span', { class: 'stars' }, starText(r.stars)), ` ${r.score}`),
    h('ul', { class: 'hands' }, ...handLine,
      r.pedal ? h('li', {}, h('strong', {}, `Pedal ${r.pedal.score}`), ` · ${r.pedal.spans.filter((x) => !x.problems.length).length}/${r.pedal.spans.length} clean`) : null,
      r.dynamics ? h('li', {}, h('strong', {}, r.dynamics.measured ? `Dynamics ${r.dynamics.score}` : 'Dynamics'),
        r.dynamics.measured ? ` · ${r.dynamics.checks.filter((c) => c.ok).length}/${r.dynamics.checks.length} changes heard` : ' · not measured') : null,
      r.together ? h('li', {}, `Hands together: ${r.together.meanGapMs} ms apart on shared beats`) : null),
    h('ul', { class: 'feedback' }, ...r.feedback.map((f) => h('li', { class: f.habit }, f.message))),
    wrongKeys.length ? h('p', { class: 'small' }, `Wrong keys: ${wrongKeys.join(', ')}.`) : null,
  );
}

