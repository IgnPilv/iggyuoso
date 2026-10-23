import { audio, click, loadPiano, outputLatencyMs, piano, stopAll } from '../audio/audio';
import { keyName, keyWindow, toDevice, type Calibration } from '../calibration';
import type { Exercise, FindExercise, GeneratedExercise, SequenceExercise, TimedExercise } from '../content/types';
import { generate } from '../engine/generate';
import { applyGoal } from '../scoring/goal';
import { midi } from '../midi/input';
import { isTieEnd, type Hand, type NoteToken } from '../music/notes';
import { expectedNotes, expectedPedal, pickupOffset, totalBeats } from '../music/timeline';
import { demoProgress, mastery } from '../progress';
import type { AttemptOutcome, Mastery, NodeState } from '../progress/mastery';
import { CLEAN_SCORE, store, type Attempt, type RepsGoal, type RepsProgress, type Settings } from '../progress/store';
import { treeNodes } from '../content';
import { RECORD_TEMPO_FRACTION } from '../scoring/stars';
import type { TimedResult } from '../scoring/timed';
import { COUNT_INS, TimedSession, type CountIn } from '../engine/timedSession';
import { climb, LADDER, LADDER_START, sliceBars, trickyBars, type LadderState } from '../engine/practice';
import { FallingView, type Flash } from './falling';
import { FindSession, positionKeys, SequenceSession, type UntimedResult } from '../scoring/untimed';
import { demo } from '../demo/demo';
import { h } from './dom';
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
  if (ex.kind === 'find') return findPlayer(root, ex, cal, onDone);
  if (ex.kind === 'sequence') return sequencePlayer(root, ex, cal, onDone);
  if (ex.kind === 'ear') return earPlayer(root, ex, cal, onDone);
  if (ex.kind === 'quiz') return quizPlayer(root, ex, cal, onDone);
  if (ex.kind === 'build') return buildPlayer(root, ex, cal, onDone);
  if (ex.kind === 'generated') return generatedHost(root, ex, cal, onDone);
  if (ex.kind === 'improvise') return improvisePlayer(root, ex, cal, onDone);
  return timedHost(root, ex, cal, onDone);
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

/** A timed exercise, or a loop of some of its bars; "Loop" and "Whole piece" swap between them. */
function timedHost(root: HTMLElement, ex: TimedExercise, cal: Calibration, onDone: OnDone): () => void {
  let cleanup = () => {};
  const mount = (bars?: [number, number], percent?: number) => {
    cleanup();
    root.replaceChildren();
    const loop = { setLoop: mount, whole: ex, percent };
    cleanup = bars
      ? timedPlayer(root, sliceBars(ex, bars[0], bars[1]), cal, () => {}, { ...loop, bars })
      : timedPlayer(root, ex, cal, onDone, loop);
  };
  mount();
  return () => cleanup();
}

interface LoopOptions {
  /** Set when this player loops these bars of `whole` (0-based, inclusive). */
  bars?: [number, number];
  /** Loop these bars (or go back to the whole piece) at this tempo, in percent. */
  setLoop: (bars?: [number, number], percent?: number) => void;
  whole: TimedExercise;
  /** The tempo to start on, carried between the whole piece and a loop. */
  percent?: number;
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
    !reps.done && !clean ? (a.counts ? ' A clean take needs 92 or more.' : ' Takes count at full tempo.') : '');
  return h('div', { class: 'take-summary' }, rewardLine(p.mastery.onAttempt(ex.id, a, before), p.mastery), repsLine);
}

/** "2 of 3 clean takes · 1 of 2 days", or how it was done. */
export function repsText(goal: RepsGoal, r: RepsProgress): string {
  if (r.done) return `Done: ${r.clean} clean ${r.clean === 1 ? 'take' : 'takes'}${goal.days > 1 ? ` on ${r.days} days` : ''}.`;
  const takes = `${Math.min(r.clean, goal.reps)} of ${goal.reps} clean takes`;
  return goal.days > 1 ? `${takes} · ${Math.min(r.days, goal.days)} of ${goal.days} days.` : `${takes}.`;
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
    h('button', { class: 'seg', 'data-view': v, 'aria-pressed': String(v === start) }, VIEW_LABEL[v]));
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
export function animate(draw: (now: number) => void) {
  let raf = 0;
  const tick = () => { draw(performance.now()); raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

// Key tints in falling notes, as design tokens (styles/tokens.css).
const FOUND = '--ok';
const POSITION = '--key-pos';

// ---------------------------------------------------------------- find

function findPlayer(root: HTMLElement, ex: FindExercise, cal: Calibration, onDone: OnDone) {
  const ask = h('div', { class: 'ask' });
  const result = h('div');
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
      for (const k of found.keys()) kb.set(k, 'hit');
      const offHeld = showHeld(kb);
      stage.append(kb.el);
      stopView = offHeld;
    } else {
      const fv = new FallingView(cal.low, cal.high, cal, [], { lookahead: 4, barQuarters: 4, totalBeats: 0, labels: 'middle-c' });
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
    }
  });

  update();
  root.append(header(ex, 'Find the keys.'), h('div', { class: 'controls top' }, toggle.el), ask, stage, result);
  build(toggle.get());
  return () => { off(); stopView(); };
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
  const result = h('div');
  const stage = h('div', { class: 'stage' });
  const flashes: Flash[] = [];
  const posMarks = new Map(pos.map((k) => [k, POSITION]));

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
      pos.forEach((k) => kb!.set(k, 'pos'));
      staff = ex.display === 'staff' ? sequenceStaff(ex) : undefined;
      for (let i = 0; i < session.current; i++) staff?.mark(String(i), 'hit');
      const offHeld = showHeld(kb);
      stage.append(staff ? h('div', { class: 'staff-wrap' }, staff.svg) : '', kb.el);
      stopView = offHeld;
    } else {
      // Wait mode: the next note falls to the keyboard and waits there until it is played.
      const notes = session.keys.map((device, i) => ({ device, beat: i, beats: 0.9, hand, finger: ex.fingers[i] }));
      const fv = new FallingView(lo, hi, cal, notes, { lookahead: 4, barQuarters: 1000, totalBeats: 0 });
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
          beat: shown, held: midi.held, flashes, now, marked: posMarks,
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
    build(toggle.get());
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
    }
  });

  root.append(header(ex, 'Play the notes in order.'), h('div', { class: 'controls top' }, toggle.el), ask, stage, result);
  build(toggle.get());
  return () => { off(); stopView(); };
}

// ---------------------------------------------------------------- timed

export function staffParts(ex: TimedExercise): StaffPart[] {
  const part = (hand: Hand, tokens: NoteToken[], clef: Clef): StaffPart => {
    let index = 0;
    return {
      clef,
      notes: tokens.map((t, ti) => {
        const own = t.pitches.length && !isTieEnd(tokens, ti);
        const finger = own ? ex.fingers[hand][index] : undefined;
        return {
          pitches: t.pitches, beats: t.beats, value: t.value, dotted: t.dotted, triplet: t.triplet, tie: t.tie, finger,
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

const TEMPO_STEPS = [50, 60, 70, 80, 90, 100];

// Exercise options (tempo, click, guide notes, the Options drawer) carry over: what the player
// picked last is where the next exercise starts. The demo keeps its own, never saved.
let demoOptions: Partial<Settings> = {};
type ExerciseOptions = Pick<Settings, 'metronome' | 'guide' | 'tempo' | 'countIn' | 'optionsOpen'>;
export const exerciseOptions = (): ExerciseOptions => (demo.active ? { ...store.settings, ...demoOptions } : store.settings);
export function setExerciseOptions(o: Partial<ExerciseOptions>) {
  if (demo.active) demoOptions = { ...demoOptions, ...o };
  else store.settings = { ...store.settings, ...o };
}
export const resetDemoOptions = () => { demoOptions = {}; };

function timedPlayer(root: HTMLElement, ex: TimedExercise, cal: Calibration, onDone: OnDone, loop: LoopOptions) {
  const settings = exerciseOptions();
  const looping = loop.bars !== undefined;
  const progress = demo.active ? demoProgress().store : store;
  // The tempo ladder: the tempo select starts on the current rung; takes on that rung climb it.
  const rungs = looping ? undefined : ex.ladder;
  const ladderKey = `ladder.${ex.id}`;
  let ladder: LadderState = (rungs && progress.get<LadderState>(ladderKey)) || LADDER_START;
  if (rungs) ladder = { ...ladder, rung: Math.min(ladder.rung, rungs.length - 1) };
  const expected = expectedNotes(ex);
  void loadPiano(expected.map((e) => e.midi));
  // Rhythm echo: Play sounds the rhythm unseen, then the player taps it back; the staff shows after.
  const echo = !!ex.echo;
  let revealed = false;
  const devices = expected.map((e) => toDevice(cal, e.midi));
  const [lo, hi] = keyWindow(cal, devices);

  // Reading exercises start on the sheet, the rest on falling notes, until the player picks.
  const stage = h('div', { class: 'stage' });
  let falling: FallingView | undefined;
  let staff: ReturnType<typeof renderStaff> | undefined;
  let strip: ReturnType<typeof staffStrip> | undefined;
  let kb: KeyboardView | undefined;
  let offHeld = () => {};
  const buildView = (view: ViewMode) => {
    falling?.destroy();
    offHeld();
    stage.replaceChildren();
    falling = undefined; staff = undefined; kb = undefined; strip = undefined;
    if (view === 'falling' && !echo) {
      falling = new FallingView(lo, hi, cal,
        expected.map((e, i) => ({ device: devices[i], beat: e.beat, beats: e.beats, hand: e.hand, finger: e.finger })),
        { lookahead: Math.max(4, ex.meter.quarters), barQuarters: ex.meter.quarters, totalBeats: totalBeats(ex), pulse: ex.meter.pulse, pedal: expectedPedal(ex) });
      // The sheet music rides along above the lane (not for tap exercises: their notes are placeholders).
      if (!ex.tap) {
        staff = renderStaff(staffParts(ex), { barQuarters: ex.meter.quarters, startQuarter: pickupOffset(ex), pedal: expectedPedal(ex), key: ex.key });
        strip = staffStrip(staff);
      }
      stage.append(strip?.el ?? '', falling.el);
      offHeld = () => {};
      idle();
    } else {
      staff = renderStaff(staffParts(ex), { barQuarters: ex.meter.quarters, startQuarter: pickupOffset(ex), pedal: expectedPedal(ex), key: ex.key });
      kb = new KeyboardView(lo, hi, { middleC: cal.middleC, cal, labels: 'c' });
      offHeld = showHeld(kb);
      stage.append(h('div', { class: 'staff-wrap', hidden: echo && !revealed }, staff.svg), kb.el);
    }
  };

  const hud = h('div', { class: 'hud' });
  const status = h('div', { class: 'status-line' }, echo ? 'Press Play to hear the rhythm.' : 'Press Listen to hear it, then Play.');
  const result = h('div');
  // The player's last pick wins over the ladder's step (the ladder line still says which counts).
  const startPercent = loop.percent ?? settings.tempo ?? (rungs ? rungs[ladder.rung] : 100);
  const steps = [...new Set([...TEMPO_STEPS, ...(rungs ?? []), startPercent])].sort((a, b) => a - b);
  const tempoSel = h('select', { 'aria-label': 'tempo' }, ...steps.map((p) => h('option', { value: p, selected: p === startPercent }, `${p}%`)));
  const ladderLine = h('p', { class: 'small ladder-line' });
  const showLadder = () => {
    if (!rungs) return;
    const left = LADDER.cleanTakes - ladder.clean;
    const top = ladder.rung === rungs.length - 1;
    ladderLine.textContent = `Tempo ladder: ${rungs[ladder.rung]}% (step ${ladder.rung + 1} of ${rungs.length}). `
      + (top ? 'Full tempo: keep it clean.' : `${left} more clean ${left === 1 ? 'take' : 'takes'} (${LADDER.cleanScore}+) at ${rungs[ladder.rung]}% to move up.`);
  };
  showLadder();
  // Looping a few bars: pick them here, or take the ones the result card suggests.
  const barSel = (value: number) => h('select', { 'aria-label': 'bar' }, ...Array.from({ length: loop.whole.bars }, (_, i) => h('option', { value: i, selected: i === value }, String(i + 1))));
  const loopFrom = barSel(loop.bars?.[0] ?? 0);
  const loopTo = barSel(loop.bars?.[1] ?? Math.min(1, loop.whole.bars - 1));
  const loopBtn = h('button', { class: 'secondary', onclick: () => {
    const a = Number(loopFrom.value), b = Number(loopTo.value);
    loop.setLoop([Math.min(a, b), Math.max(a, b)], Number(tempoSel.value));
  } }, looping ? 'Loop these' : 'Loop');
  // An echo is heard whole each time, so it has no loops.
  const loopControls = loop.whole.bars > 1 && !echo
    ? h('div', { class: 'controls loop-controls' },
      h('span', { class: 'small' }, 'Loop bars'), loopFrom, h('span', { class: 'small' }, 'to'), loopTo, loopBtn,
      looping ? h('button', { class: 'secondary', onclick: () => loop.setLoop(undefined, Number(tempoSel.value)) }, 'Whole piece') : '')
    : '';
  let again = 0; // the next loop take
  const metro = h('input', { type: 'checkbox', checked: settings.metronome });
  const guide = h('input', { type: 'checkbox', checked: settings.guide });
  metro.addEventListener('change', () => setExerciseOptions({ metronome: metro.checked }));
  guide.addEventListener('change', () => setExerciseOptions({ guide: guide.checked }));
  tempoSel.addEventListener('change', () => setExerciseOptions({ tempo: Number(tempoSel.value) }));
  const COUNT_IN_LABELS: Record<CountIn, string> = { bar: 'Full bar', short: 'Short', none: 'None' };
  const countSel = h('select', { 'aria-label': 'count-in' }, ...COUNT_INS.map((c) => h('option', { value: c, selected: c === (settings.countIn ?? 'bar') }, COUNT_IN_LABELS[c])));
  countSel.addEventListener('change', () => setExerciseOptions({ countIn: countSel.value as CountIn }));
  const toggle = viewToggle(initialView(ex), (v) => buildView(v));
  const listenBtn = h('button', { class: 'secondary' }, 'Listen');
  const playBtn = h('button', {}, 'Play');
  const stopBtn = h('button', { class: 'secondary', disabled: true }, 'Stop');

  let run: { cancel: () => void } | undefined;
  const flashes: Flash[] = [];

  // Draw a still frame (before the first run, or after switching views).
  function idle() {
    falling?.draw({ beat: -1, held: midi.held, noteState: () => 'coming', flashes: [], now: performance.now(), banner: 'Press Listen or Play' });
  }

  /** `echoTurn`: the tap-back half of an echo, right after the app played the rhythm. */
  const start = (mode: 'listen' | 'play', echoTurn = false) => {
    run?.cancel();
    clearTimeout(again);
    audio();
    result.replaceChildren();
    hud.replaceChildren();
    flashes.length = 0;
    staff?.clear('hit'); staff?.clear('miss'); staff?.clear('wrong');
    const tempo = Math.round((ex.tempo * Number(tempoSel.value)) / 100);
    const session = new TimedSession(ex, cal, {
      tempo, mode, startAt: performance.now() + 600, latencyMs: outputLatencyMs() + store.settings.latencyMs,
      countIn: echoTurn ? 'bar' : (countSel.value as CountIn),
    });
    for (const c of session.clicks(metro.checked)) click(c.time, c.accent);
    if (mode === 'listen' || (guide.checked && !echo)) for (const g of session.guide()) piano(g.midi, g.time, g.durMs);
    session.pedalStart(midi.pedalDown);
    if (mode === 'play') demo.onTimed?.(session);

    let lastMessage = '';
    const offPedal = midi.onPedal((e) => session.pedalChange(e.down, e.time));
    const offNotes = midi.onNote((e) => {
      if (e.type === 'off') { session.noteOff(e.note, e.time); return; }
      const j = session.noteOn(e.note, e.time);
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
      status.textContent = pos.phase === 'count-in' ? (pos.count ? `${echoTurn ? 'Your turn: ' : ''}Count in… ${pos.count}` : 'Get ready…')
        : pos.phase === 'playing' ? (mode === 'listen' ? (echo ? 'Listen…' : 'Listen and watch the keys…') : echo ? 'Tap it back!' : 'Play!')
        : pos.phase === 'waiting' ? 'Get ready…' : '';
      falling?.draw({
        beat: pos.beat, count: pos.phase === 'count-in' ? pos.count : undefined, held: midi.held, noteState, flashes, now, pedalDown: midi.pedalDown,
        banner: pos.phase === 'waiting' ? 'Get ready' : undefined,
      });
      strip?.follow(Math.max(0, pos.beat));
      if (kb) {
        kb.clear('target');
        kb.clearLabels();
      }
      staff?.clear('current');
      expected.forEach((e, i) => {
        if (pos.beat >= e.beat && pos.beat < e.beat + e.beats) {
          // Generated drills test reading: the keys stay dark while the player plays.
          if (!(ex.goal && mode === 'play') && !echo) kb?.set(devices[i], 'target', true, e.finger ? String(e.finger) : '');
          staff?.mark(`${e.hand}:${e.index}`, 'current');
        }
        if (staff && mode === 'play') {
          const st = noteState(i);
          if (st === 'hit' || st === 'missed') staff.mark(`${e.hand}:${e.index}`, st === 'hit' ? 'hit' : 'miss');
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
      stopBtn.disabled = true;
      run = undefined;
    };

    const finish = () => {
      stop();
      if (mode === 'listen' && echo) { start('play', true); return; }
      if (mode === 'listen') { status.textContent = 'Now you try: press Play.'; idle(); demo.onRunEnd?.('listen'); return; }
      if (echo && !revealed) {
        // Now the rhythm can be seen, marked with how each note went.
        revealed = true;
        stage.querySelector<HTMLElement>('.staff-wrap')?.removeAttribute('hidden');
      }
      status.textContent = '';
      const raw = session.result();
      const goal = applyGoal(raw.score, ex.goal);
      const r = ex.goal ? { ...raw, score: goal.score, stars: goal.stars } : raw;
      for (const n of r.notes) staff?.mark(`${n.expected.hand}:${n.expected.index}`, n.outcome === 'hit' ? 'hit' : n.outcome);
      hud.replaceChildren();
      if (looping) {
        // Loop takes are practice: nothing is saved, and the next take starts by itself.
        status.textContent = `${r.score}. Again in a moment; press Stop to finish looping.`;
        result.replaceChildren(timedResult(r, ex, tempo, cal, true));
        again = window.setTimeout(() => start('play'), 2500);
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
        }
        showLadder();
      }
      const tricky = trickyBars(r, ex, session.beatMs);
      const loopTip = tricky && loop.whole.bars > 1 && !echo
        ? h('p', { class: 'small' }, 'Most mistakes were in ', h('strong', {}, barsText(tricky)), '. ',
          h('button', { class: 'secondary', onclick: () => loop.setLoop(tricky, Number(tempoSel.value)) }, `Loop ${barsText(tricky)}`))
        : '';
      // Go again from the card, without scrolling back up to Play.
      const againRow = h('div', { class: 'controls' },
        h('button', { onclick: () => { stage.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); start(echo ? 'listen' : 'play'); } }, 'Try again'),
        regenerate.has(ex) ? h('button', { class: 'secondary', onclick: () => regenerate.get(ex)!() }, ex.tap ? 'New rhythm' : 'New tune') : '');
      result.replaceChildren(timedResult(r, ex, tempo, cal), reward, ladderNote, loopTip, againRow);
      onDone(r);
      demo.onRunEnd?.('play');
    };

    listenBtn.disabled = playBtn.disabled = true;
    toggle.disable(true);
    stopBtn.disabled = false;
    raf = requestAnimationFrame(frame);
    run = { cancel: stop };
  };

  listenBtn.onclick = () => start('listen');
  playBtn.onclick = () => start(echo ? 'listen' : 'play');
  if (echo) listenBtn.hidden = true;
  stopBtn.onclick = () => { run?.cancel(); clearTimeout(again); status.textContent = 'Stopped.'; idle(); };

  // Transport up front (Listen, Play, Stop, view); tempo, click, guide and looping in a drawer.
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
        h('label', {}, guide, ' Guide notes')),
      loopControls));
  drawer.addEventListener('toggle', () => setExerciseOptions({ optionsOpen: drawer.open }));
  root.append(
    header(ex, echo ? 'Press Play: listen to the rhythm, then tap it back after a bar of count-in.' : ex.pitchMatch === 'side' ? 'Tap the rhythm: right hand on any key from middle C up, left hand on any key below.'
      : ex.tap ? 'Tap the rhythm on any key, with the click.' : 'Play along with the click.'),
    h('div', { class: 'transport' },
      h('div', { class: 'transport-main' }, listenBtn, playBtn, stopBtn),
      echo ? '' : toggle.el,
    ),
    drawer,
    rungs ? ladderLine : '',
    status,
    hud,
    stage,
    result,
  );
  if (looping) status.textContent = `Looping ${barsText(loop.bars!)}. Press Play; it goes round until you press Stop. Loop takes are not saved.`;
  buildView(toggle.get());
  return () => { run?.cancel(); clearTimeout(again); falling?.destroy(); offHeld(); };
}

/** `loopTake`: a practice loop, which is never saved, so there is no note about records. */
function timedResult(r: TimedResult, ex: TimedExercise, tempo: number, cal: Calibration, loopTake = false) {
  const slow = !loopTake && tempo < RECORD_TEMPO_FRACTION * ex.tempo;
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
      r.together ? h('li', {}, `Hands together: ${r.together.meanGapMs} ms apart on shared beats`) : null),
    h('ul', { class: 'feedback' }, ...r.feedback.map((f) => h('li', { class: f.habit }, f.message))),
    wrongKeys.length ? h('p', { class: 'small' }, `Wrong keys: ${wrongKeys.join(', ')}.`) : null,
    slow ? h('p', { class: 'small' }, `Practised at ${tempo} bpm. Records count from ${Math.ceil(RECORD_TEMPO_FRACTION * ex.tempo)} bpm.`) : null,
  );
}

