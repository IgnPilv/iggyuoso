import { audio, click, outputLatencyMs, stopAll, tone } from '../audio/audio';
import { keyName, toDevice, toWritten, type Calibration } from '../calibration';
import type { Exercise, FindExercise, SequenceExercise, TimedExercise } from '../content/types';
import { midi } from '../midi/input';
import type { Hand, NoteToken } from '../music/notes';
import { beatMs, expectedNotes, totalBeats } from '../music/timeline';
import { store } from '../progress/store';
import { RECORD_TEMPO_FRACTION } from '../scoring/stars';
import { hitWindowMs, scoreTimed, type PlayedNote, type TimedResult } from '../scoring/timed';
import { FindSession, positionKeys, SequenceSession, type UntimedResult } from '../scoring/untimed';
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
  const written = ex.kind === 'timed' ? ex.tempo : tempo;
  store.record(ex.id, { at: new Date().toISOString(), score, stars, tempo, hands, counts: tempo >= RECORD_TEMPO_FRACTION * written });
}

/** Lights held keys and returns the unsubscribe function. */
function showHeld(kb: KeyboardView) {
  return midi.onNote((e) => kb.set(e.note, 'pressed', e.type === 'on'));
}

// ---------------------------------------------------------------- find

function findPlayer(root: HTMLElement, ex: FindExercise, cal: Calibration, onDone: OnDone) {
  const kb = new KeyboardView(cal.low, cal.high, { middleC: cal.middleC });
  const ask = h('div', { class: 'ask' });
  const result = h('div');
  let session = new FindSession(ex, cal);

  const update = () => {
    if (session.done) ask.textContent = 'All found!';
    else if (ex.coverAll) ask.textContent = `Found ${session.found.filter(Boolean).length} of ${session.steps.length}`;
    else ask.replaceChildren('Play ', h('strong', {}, session.steps[session.current].label));
  };
  const restart = () => {
    session = new FindSession(ex, cal);
    kb.clear('hit');
    result.replaceChildren();
    update();
  };

  const offHeld = showHeld(kb);
  const off = midi.onNote((e) => {
    if (e.type !== 'on' || session.done) return;
    const outcome = session.press(e.note);
    if (outcome === 'wrong') kb.flash(e.note, 'wrong');
    if (outcome === 'correct') {
      if (ex.coverAll) session.steps.filter((st) => st.keys.includes(e.note)).forEach((st) => st.keys.forEach((k) => kb.set(k, 'hit')));
      else kb.flash(e.note, 'hit', 500);
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
  root.append(header(ex, 'Find the keys.'), ask, kb.el, result);
  return () => { off(); offHeld(); };
}

// ---------------------------------------------------------------- sequence

function clefFor(ex: Exercise, hand?: Hand): Clef {
  return ex.clef ?? (hand === 'left' || ex.hand === 'left' ? 'bass' : 'treble');
}

function sequencePlayer(root: HTMLElement, ex: SequenceExercise, cal: Calibration, onDone: OnDone) {
  let session = new SequenceSession(ex, cal);
  const pos = positionKeys(ex, cal);
  const [lo, hi] = rangeAround([...session.keys, ...pos], cal.low, cal.high);
  const kb = new KeyboardView(lo, hi, { middleC: cal.middleC });
  const staff = ex.display === 'staff'
    ? renderStaff([{ clef: clefFor(ex), notes: ex.notes.map((p, i) => ({ pitches: [p], key: String(i) })) }])
    : undefined;
  const ask = h('div', { class: 'ask' });
  const result = h('div');
  pos.forEach((k) => kb.set(k, 'pos'));

  const update = () => {
    kb.clear('target');
    kb.clearLabels();
    staff?.clear('current');
    if (session.done) { ask.textContent = 'Done!'; return; }
    const i = session.current;
    if (staff) {
      staff.mark(String(i), 'current');
      ask.textContent = `Note ${i + 1} of ${session.keys.length}`;
    } else {
      const f = ex.fingers[i];
      kb.set(session.keys[i], 'target', true, f ? String(f) : '');
      ask.textContent = f ? `Finger ${f}` : `Play ${session.hint()}`;
    }
  };
  const restart = () => {
    session = new SequenceSession(ex, cal);
    staff?.clear('hit');
    result.replaceChildren();
    update();
  };

  const offHeld = showHeld(kb);
  const off = midi.onNote((e) => {
    if (e.type !== 'on' || session.done) return;
    const i = session.current;
    const outcome = session.press(e.note);
    if (outcome === 'wrong') kb.flash(e.note, 'wrong');
    if (outcome === 'correct') { kb.flash(e.note, 'hit'); staff?.mark(String(i), 'hit'); }
    update();
    if (session.done) {
      const r = session.result();
      record(ex, r.score, r.stars, 0);
      result.replaceChildren(untimedResult(r, restart));
      onDone(r);
    }
  });

  update();
  root.append(header(ex, 'Play the notes in order.'), staff ? h('div', { class: 'staff-wrap' }, staff.svg) : '', ask, kb.el, result);
  return () => { off(); offHeld(); };
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
  const [lo, hi] = rangeAround(expected.map((e) => toDevice(cal, e.midi)), cal.low, cal.high);
  const kb = new KeyboardView(lo, hi, { middleC: cal.middleC });
  const staff = ex.display === 'staff' ? renderStaff(staffParts(ex), { barQuarters: ex.meter.quarters }) : undefined;
  const status = h('div', { class: 'ask' }, `${ex.meter.beats}/${ex.meter.unit} at ${ex.tempo} beats per minute`);
  const result = h('div');

  const tempoSel = h('select', { 'aria-label': 'tempo' }, ...TEMPO_STEPS.map((p) => h('option', { value: p, selected: p === 100 }, `${p}%`)));
  const metro = h('input', { type: 'checkbox', checked: settings.metronome });
  const guide = h('input', { type: 'checkbox', checked: settings.guide });
  const listenBtn = h('button', { class: 'secondary' }, 'Listen');
  const playBtn = h('button', {}, 'Play');
  const stopBtn = h('button', { class: 'secondary', disabled: true }, 'Stop');

  let run: { cancel: () => void } | undefined;

  const start = (mode: 'listen' | 'play') => {
    run?.cancel();
    audio();
    result.replaceChildren();
    staff?.clear('hit'); staff?.clear('miss'); staff?.clear('wrong');
    const tempo = Math.round((ex.tempo * Number(tempoSel.value)) / 100);
    const bMs = beatMs(tempo);
    const q = ex.meter.quarters;
    const countBeats = Math.max(1, ex.countIn) * q;
    const total = totalBeats(ex);
    const latency = outputLatencyMs() + store.settings.latencyMs;
    const begin = performance.now() + 500;
    const t0 = begin + countBeats * bMs;
    const end = t0 + total * bMs + hitWindowMs(tempo) + 200;

    for (let i = 0; i < countBeats; i++) click(begin + i * bMs, i % q === 0);
    if (metro.checked) for (let b = 0; b < total; b++) click(t0 + b * bMs, b % q === 0);
    if (mode === 'listen' || guide.checked) for (const e of expected) tone(e.midi, t0 + e.beat * bMs, e.beats * bMs * 0.92);

    const played: PlayedNote[] = [];
    const open = new Map<number, PlayedNote>();
    const offNotes = mode === 'play'
      ? midi.onNote((e) => {
        const t = e.time - (t0 + latency);
        const w = toWritten(cal, e.note);
        if (e.type === 'on') {
          const n: PlayedNote = { midi: w, on: t };
          played.push(n);
          open.set(w, n);
        } else {
          const n = open.get(w);
          if (n) { n.off = t; open.delete(w); }
        }
      })
      : () => {};

    let raf = 0;
    const frame = () => {
      const now = performance.now() - latency;
      kb.clear('target');
      kb.clearLabels();
      staff?.clear('current');
      if (now < t0) {
        status.textContent = now < begin ? 'Get ready…' : String((Math.floor((now - begin) / bMs) % q) + 1);
      } else {
        const beat = (now - t0) / bMs;
        status.textContent = mode === 'listen' ? 'Listen…' : 'Play!';
        for (const e of expected) {
          if (beat >= e.beat && beat < e.beat + e.beats) {
            if (!staff) kb.set(toDevice(cal, e.midi), 'target', true, e.finger ? String(e.finger) : '');
            staff?.mark(`${e.hand}:${e.index}`, 'current');
          }
        }
      }
      if (performance.now() < end) raf = requestAnimationFrame(frame);
      else finish();
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      offNotes();
      stopAll();
      kb.clear('target');
      kb.clearLabels();
      staff?.clear('current');
      listenBtn.disabled = playBtn.disabled = false;
      stopBtn.disabled = true;
      run = undefined;
    };

    const finish = () => {
      stop();
      if (mode === 'listen') { status.textContent = 'Now you try: press Play.'; return; }
      status.textContent = '';
      const r = scoreTimed(expected, played, { tempo, pitchMatch: ex.pitchMatch });
      for (const n of r.notes) staff?.mark(`${n.expected.hand}:${n.expected.index}`, n.outcome === 'hit' ? 'hit' : n.outcome);
      const handScores = Object.fromEntries(r.hands.map((hr) => [hr.hand, hr.score]));
      record(ex, r.score, r.stars, tempo, handScores);
      result.replaceChildren(timedResult(r, ex, tempo, cal));
      onDone(r);
    };

    listenBtn.disabled = playBtn.disabled = true;
    stopBtn.disabled = false;
    raf = requestAnimationFrame(frame);
    run = { cancel: stop };
  };

  listenBtn.onclick = () => start('listen');
  playBtn.onclick = () => start('play');
  stopBtn.onclick = () => { run?.cancel(); status.textContent = 'Stopped.'; };
  const offHeld = showHeld(kb);

  root.append(
    header(ex, 'Play along with the click.'),
    staff ? h('div', { class: 'staff-wrap' }, staff.svg) : '',
    status,
    kb.el,
    h('div', { class: 'controls' },
      listenBtn, playBtn, stopBtn,
      h('label', {}, 'Tempo ', tempoSel),
      h('label', {}, metro, ' Click'),
      h('label', {}, guide, ' Guide notes'),
    ),
    result,
  );
  return () => { run?.cancel(); offHeld(); };
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

