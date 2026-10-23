import { audio, click, outputLatencyMs, stopAll, tone } from '../audio/audio';
import { keyName, toDevice, type Calibration } from '../calibration';
import type { Exercise, FindExercise, SequenceExercise, TimedExercise } from '../content/types';
import { midi } from '../midi/input';
import type { Hand, NoteToken } from '../music/notes';
import { expectedNotes, totalBeats } from '../music/timeline';
import { store } from '../progress/store';
import { RECORD_TEMPO_FRACTION } from '../scoring/stars';
import type { TimedResult } from '../scoring/timed';
import { TimedSession } from '../engine/timedSession';
import { FallingView, type Flash } from './falling';
import { FindSession, positionKeys, SequenceSession, type UntimedResult } from '../scoring/untimed';
import { demo } from '../demo/demo';
import { h } from './dom';
import { KeyboardView, rangeAround } from './keyboard';
import { renderStaff, type Clef, type StaffPart } from './staff';

export interface PlayerResult {
  score: number;
  stars: number;
}

type OnDone = (r: PlayerResult) => void;

const starText = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);
const HAND_LABEL: Record<string, string> = {
  right: 'Right hand', left: 'Left hand', alternating: 'Hands take turns', together: 'Hands together',
};

export function mountExercise(root: HTMLElement, ex: Exercise, cal: Calibration, onDone: OnDone): () => void {
  root.replaceChildren();
  root.classList.add('exercise', `kind-${ex.kind}`);
  if (ex.kind === 'find') return findPlayer(root, ex, cal, onDone);
  if (ex.kind === 'sequence') return sequencePlayer(root, ex, cal, onDone);
  return timedPlayer(root, ex, cal, onDone);
}

function header(ex: Exercise, fallback: string) {
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

function record(ex: Exercise, score: number, stars: number, tempo: number, hands?: Partial<Record<Hand, number>>) {
  if (demo.active) return; // the demo pianist's playing is not your progress
  const written = ex.kind === 'timed' ? ex.tempo : tempo;
  store.record(ex.id, { at: new Date().toISOString(), score, stars, tempo, hands, counts: tempo >= RECORD_TEMPO_FRACTION * written });
}

/** Lights held keys and returns the unsubscribe function. */
function showHeld(kb: KeyboardView) {
  return midi.onNote((e) => kb.set(e.note, 'pressed', e.type === 'on'));
}

// ---------------------------------------------------------------- view toggle

type ViewMode = 'classic' | 'falling';
const VIEW_LABEL: Record<ViewMode, string> = { classic: 'Keyboard & sheet', falling: 'Falling notes' };

/** The player's last pick wins everywhere; otherwise reading exercises start classic. */
function initialView(ex: Exercise): ViewMode {
  return store.settings.view ?? (ex.kind === 'timed' && ex.display !== 'staff' ? 'falling' : 'classic');
}

/** A two-way switch shown on every playing exercise. */
function viewToggle(start: ViewMode, onChange: (v: ViewMode) => void) {
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
function animate(draw: (now: number) => void) {
  let raf = 0;
  const tick = () => { draw(performance.now()); raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

const FOUND = '#4ade80';
const POSITION = '#dbe4ff';

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
      record(ex, r.score, r.stars, 0);
      result.replaceChildren(untimedResult(r, restart));
      onDone(r);
    }
  });

  update();
  root.append(header(ex, 'Find the keys.'), h('div', { class: 'controls top' }, toggle.el), ask, stage, result);
  build(toggle.get());
  return () => { off(); stopView(); };
}

// ---------------------------------------------------------------- sequence

function clefFor(ex: Exercise, hand?: Hand): Clef {
  return ex.clef ?? (hand === 'left' || ex.hand === 'left' ? 'bass' : 'treble');
}

function sequencePlayer(root: HTMLElement, ex: SequenceExercise, cal: Calibration, onDone: OnDone) {
  let session = new SequenceSession(ex, cal);
  queueMicrotask(() => demo.onSequence?.(session));
  const pos = positionKeys(ex, cal);
  const [lo, hi] = rangeAround([...session.keys, ...pos], cal.low, cal.high);
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
      staff = ex.display === 'staff'
        ? renderStaff([{ clef: clefFor(ex), notes: ex.notes.map((p, i) => ({ pitches: [p], key: String(i) })) }])
        : undefined;
      for (let i = 0; i < session.current; i++) staff?.mark(String(i), 'hit');
      const offHeld = showHeld(kb);
      stage.append(staff ? h('div', { class: 'staff-wrap' }, staff.svg) : '', kb.el);
      stopView = offHeld;
    } else {
      // Wait mode: the next note falls to the keyboard and waits there until it is played.
      const notes = session.keys.map((device, i) => ({ device, beat: i, beats: 0.9, hand, finger: ex.fingers[i] }));
      const fv = new FallingView(lo, hi, cal, notes, { lookahead: 4, barQuarters: 1000, totalBeats: 0 });
      stage.append(fv.el);
      let shown = session.current;
      const stop = animate((now) => {
        shown += (session.current - shown) * 0.18;
        if (Math.abs(session.current - shown) < 0.01) shown = session.current;
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
      record(ex, r.score, r.stars, 0);
      result.replaceChildren(untimedResult(r, restart));
      onDone(r);
    }
  });

  root.append(header(ex, 'Play the notes in order.'), h('div', { class: 'controls top' }, toggle.el), ask, stage, result);
  build(toggle.get());
  return () => { off(); stopView(); };
}

// ---------------------------------------------------------------- timed

function staffParts(ex: TimedExercise): StaffPart[] {
  const part = (hand: Hand, tokens: NoteToken[], clef: Clef): StaffPart => {
    let index = 0;
    return {
      clef,
      notes: tokens.map((t, ti) => ({ pitches: t.pitches, beats: t.beats, key: t.pitches.length ? `${hand}:${index++}` : `${hand}:r${ti}` })),
    };
  };
  if (ex.right && ex.left) return [part('right', ex.right, 'treble'), part('left', ex.left, 'bass')];
  const hand: Hand = ex.right ? 'right' : 'left';
  return [part(hand, (ex.right ?? ex.left)!, clefFor(ex, hand))];
}

const TEMPO_STEPS = [50, 60, 70, 80, 90, 100];

function timedPlayer(root: HTMLElement, ex: TimedExercise, cal: Calibration, onDone: OnDone) {
  const settings = store.settings;
  const expected = expectedNotes(ex);
  const devices = expected.map((e) => toDevice(cal, e.midi));
  const [lo, hi] = rangeAround(devices, cal.low, cal.high);

  // Reading exercises start on the sheet, the rest on falling notes, until the player picks.
  const stage = h('div', { class: 'stage' });
  let falling: FallingView | undefined;
  let staff: ReturnType<typeof renderStaff> | undefined;
  let kb: KeyboardView | undefined;
  let offHeld = () => {};
  const buildView = (view: ViewMode) => {
    falling?.destroy();
    offHeld();
    stage.replaceChildren();
    falling = undefined; staff = undefined; kb = undefined;
    if (view === 'falling') {
      falling = new FallingView(lo, hi, cal,
        expected.map((e, i) => ({ device: devices[i], beat: e.beat, beats: e.beats, hand: e.hand, finger: e.finger })),
        { lookahead: Math.max(4, ex.meter.quarters), barQuarters: ex.meter.quarters, totalBeats: totalBeats(ex) });
      stage.append(falling.el);
      offHeld = () => {};
      idle();
    } else {
      staff = renderStaff(staffParts(ex), { barQuarters: ex.meter.quarters });
      kb = new KeyboardView(lo, hi, { middleC: cal.middleC, cal, labels: 'c' });
      offHeld = showHeld(kb);
      stage.append(h('div', { class: 'staff-wrap' }, staff.svg), kb.el);
    }
  };

  const hud = h('div', { class: 'hud' });
  const status = h('div', { class: 'ask' }, `${ex.meter.beats}/${ex.meter.unit} at ${ex.tempo} beats per minute. Press Listen to hear it, then Play.`);
  const result = h('div');
  const tempoSel = h('select', { 'aria-label': 'tempo' }, ...TEMPO_STEPS.map((p) => h('option', { value: p, selected: p === 100 }, `${p}%`)));
  const metro = h('input', { type: 'checkbox', checked: settings.metronome });
  const guide = h('input', { type: 'checkbox', checked: settings.guide });
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

  const start = (mode: 'listen' | 'play') => {
    run?.cancel();
    audio();
    result.replaceChildren();
    hud.replaceChildren();
    flashes.length = 0;
    staff?.clear('hit'); staff?.clear('miss'); staff?.clear('wrong');
    const tempo = Math.round((ex.tempo * Number(tempoSel.value)) / 100);
    const session = new TimedSession(ex, cal, {
      tempo, mode, startAt: performance.now() + 600, latencyMs: outputLatencyMs() + store.settings.latencyMs,
    });
    for (const c of session.clicks(metro.checked)) click(c.time, c.accent);
    if (mode === 'listen' || guide.checked) for (const g of session.guide()) tone(g.midi, g.time, g.durMs);
    if (mode === 'play') demo.onTimed?.(session);

    let lastMessage = '';
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
        lastMessage = `Wrong key: ${keyName(cal, e.note)}, the note was ${keyName(cal, toDevice(cal, j.expected!.midi))}`;
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
    if (mode === 'play') hud.append(scoreEl, countsEl, msgEl);
    let lastHud = 0;
    let missedSeen = 0;

    let raf = 0;
    const frame = () => {
      const now = performance.now();
      const pos = session.position(now);
      const noteState = (i: number) => session.liveState(expected[i], pos.beat);
      status.textContent = pos.phase === 'count-in' ? `Count in… ${pos.count}` : pos.phase === 'playing' ? (mode === 'listen' ? 'Listen and watch the keys…' : 'Play!') : pos.phase === 'waiting' ? 'Get ready…' : '';
      falling?.draw({
        beat: pos.beat, count: pos.phase === 'count-in' ? pos.count : undefined, held: midi.held, noteState, flashes, now,
        banner: pos.phase === 'waiting' ? 'Get ready' : undefined,
      });
      if (kb) {
        kb.clear('target');
        kb.clearLabels();
      }
      staff?.clear('current');
      expected.forEach((e, i) => {
        if (pos.beat >= e.beat && pos.beat < e.beat + e.beats) {
          kb?.set(devices[i], 'target', true, e.finger ? String(e.finger) : '');
          staff?.mark(`${e.hand}:${e.index}`, 'current');
        }
        if (staff && mode === 'play') {
          const st = noteState(i);
          if (st === 'hit' || st === 'missed') staff.mark(`${e.hand}:${e.index}`, st === 'hit' ? 'hit' : 'miss');
        }
      });
      if (mode === 'play' && now - lastHud > 100) {
        lastHud = now;
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
      if (mode === 'listen') { status.textContent = 'Now you try: press Play.'; idle(); demo.onRunEnd?.('listen'); return; }
      status.textContent = '';
      const r = session.result();
      for (const n of r.notes) staff?.mark(`${n.expected.hand}:${n.expected.index}`, n.outcome === 'hit' ? 'hit' : n.outcome);
      const handScores = Object.fromEntries(r.hands.map((hr) => [hr.hand, hr.score]));
      record(ex, r.score, r.stars, tempo, handScores);
      hud.replaceChildren();
      result.replaceChildren(timedResult(r, ex, tempo, cal));
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
  playBtn.onclick = () => start('play');
  stopBtn.onclick = () => { run?.cancel(); status.textContent = 'Stopped.'; idle(); };

  root.append(
    header(ex, 'Play along with the click.'),
    h('div', { class: 'controls top' },
      listenBtn, playBtn, stopBtn,
      h('label', {}, 'Tempo ', tempoSel),
      h('label', {}, metro, ' Click'),
      h('label', {}, guide, ' Guide notes'),
      toggle.el,
    ),
    status,
    hud,
    stage,
    result,
  );
  buildView(toggle.get());
  return () => { run?.cancel(); falling?.destroy(); offHeld(); };
}

function timedResult(r: TimedResult, ex: TimedExercise, tempo: number, cal: Calibration) {
  const slow = tempo < RECORD_TEMPO_FRACTION * ex.tempo;
  const handLine = r.hands.map((hr) => {
    const timing = hr.meanOffsetMs === null ? '' : ` · ${Math.abs(hr.meanOffsetMs)} ms ${hr.meanOffsetMs < 0 ? 'early' : 'late'} on average`;
    return h('li', {}, h('strong', {}, `${HAND_LABEL[hr.hand]} ${hr.score}`), ` · ${hr.hits}/${hr.notes} notes${timing}`);
  });
  const wrongKeys = r.notes.filter((n) => n.outcome === 'wrong').slice(0, 3)
    .map((n) => `${keyName(cal, toDevice(cal, n.played!.midi))} instead of ${keyName(cal, toDevice(cal, n.expected.midi))}`);
  return h('div', { class: 'result' },
    h('div', { class: 'score' }, h('span', { class: 'stars' }, starText(r.stars)), ` ${r.score}`),
    h('ul', { class: 'hands' }, ...handLine,
      r.together ? h('li', {}, `Hands together: ${r.together.meanGapMs} ms apart on shared beats`) : null),
    h('ul', { class: 'feedback' }, ...r.feedback.map((f) => h('li', { class: f.habit }, f.message))),
    wrongKeys.length ? h('p', { class: 'small' }, `Wrong keys: ${wrongKeys.join(', ')}.`) : null,
    slow ? h('p', { class: 'small' }, `Practised at ${tempo} bpm. Records count from ${Math.ceil(RECORD_TEMPO_FRACTION * ex.tempo)} bpm.`) : null,
  );
}

