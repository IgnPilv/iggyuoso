import { audio, click, loadPiano, outputLatencyMs, piano } from '../audio/audio';
import { keyWindow, toDevice, toWritten, type Calibration } from '../calibration';
import { demo } from '../demo/demo';
import {
  GYM_KINDS, gymPlan, gymReport, rootsFor, ScaleGym, type GymHands, type GymKind, type GymReport, type GymSetup, type HandReport,
} from '../engine/scaleGym';
import { midi } from '../midi/input';
import { midiName, type Hand } from '../music/notes';
import { stars } from '../scoring/stars';
import { store } from '../progress/store';
import { h, s, type View } from '../../../core/dom';
import { KeyboardView } from './keyboard';
import { animate } from './players';
import { midiBanner, needCalibration } from './views';

// The Scale gym (#/scales): pick a scale or arpeggio, a key, the hands, octaves, notes a click
// and a tempo; play it up and down on the click and see, note by note, how evenly it went and
// where the thumb passes made a hand late. Nothing is saved; the settings and the best score of
// each scale last until the page reloads.

const HAND_LABEL: Record<Hand, string> = { right: 'Right hand', left: 'Left hand' };
const rootLabel = (r: string) => r.replace('b', '♭').replace('#', '♯');
const DEFAULTS = { root: 'C', kind: 'major' as GymKind, octaves: 1 as 1 | 2, hands: 'right' as GymHands, perBeat: 2 as 1 | 2 | 4, tempo: 60 };
const kept = { ...DEFAULTS };
const best = new Map<string, number>();
const width = (el: HTMLElement) => Math.max(280, Math.min(1000, (el.clientWidth || 616) - 16));

export interface GymHooks {
  /** Called when a run starts (the demo plays along). */
  onStart?: (g: ScaleGym) => void;
}

export const scaleGymView: View = (root) => {
  const cal = needCalibration(root);
  if (!cal) return;
  return mountScaleGym(root, cal);
};

export function mountScaleGym(root: HTMLElement, cal: Calibration, hooks: GymHooks = {}) {
  // The demo works on its own copy, so it never changes what the player picked.
  const opts = demo.active ? { ...DEFAULTS } : kept;
  const kindSel = h('select', { 'aria-label': 'scale' }, ...GYM_KINDS.map((k) => h('option', { value: k.id, selected: k.id === opts.kind }, k.name)));
  const rootSel = h('select', { 'aria-label': 'key' });
  const handsSel = h('select', { 'aria-label': 'hands' },
    ...[['right', 'Right hand'], ['left', 'Left hand'], ['together', 'Hands together']].map(([v, l]) => h('option', { value: v, selected: v === opts.hands }, l)));
  const octSel = h('select', { 'aria-label': 'octaves' }, ...[1, 2].map((n) => h('option', { value: n, selected: n === opts.octaves }, n === 1 ? '1 octave' : '2 octaves')));
  const perSel = h('select', { 'aria-label': 'notes a click' },
    ...[[1, '1 note a click'], [2, '2 notes a click'], [4, '4 notes a click']].map(([v, l]) => h('option', { value: v, selected: v === opts.perBeat }, String(l))));
  const tempo = h('input', { type: 'number', min: 30, max: 200, step: 1, value: opts.tempo, 'aria-label': 'tempo', class: 'num' });
  const slower = h('button', { class: 'secondary', 'aria-label': 'slower' }, '−');
  const faster = h('button', { class: 'secondary', 'aria-label': 'faster' }, '+');
  const listenBtn = h('button', { class: 'secondary' }, 'Listen');
  const startBtn = h('button', {}, 'Start');
  const stopBtn = h('button', { class: 'secondary', disabled: true }, 'Stop');
  const status = h('span', { class: 'small', 'aria-live': 'polite' });
  const stage = h('div', { class: 'stage' });
  const chart = h('div', { class: 'pulse-line gym-chart' });
  const result = h('div', { class: 'gym-result', 'aria-live': 'polite' });

  const fillRoots = () => {
    const roots = rootsFor(opts.kind);
    if (!roots.includes(opts.root)) opts.root = roots[0];
    rootSel.replaceChildren(...roots.map((r) => h('option', { value: r, selected: r === opts.root }, rootLabel(r))));
  };
  fillRoots();

  const setup = (): GymSetup => ({ root: opts.root, kind: opts.kind, octaves: opts.octaves, hands: opts.hands });
  const setupKey = () => `${opts.root} ${opts.kind} ${opts.octaves} ${opts.hands} ${opts.perBeat}`;
  let plan = gymPlan(setup());
  let kb: KeyboardView;
  let gym: ScaleGym | undefined;
  let run: { stop: () => void } | undefined;
  let stopListen: (() => void) | undefined;

  /** Every key of the run, lit softly with its finger; the hand's first keys brighter. */
  const drawKeys = () => {
    const keys = plan.flatMap((st) => Object.values(st.keys).map((k) => toDevice(cal, k!.midi)));
    const [low, high] = keyWindow(cal, keys, 2);
    kb = new KeyboardView(low, high, { middleC: cal.middleC, cal, labels: 'c' });
    stage.replaceChildren(kb.el);
    showFingers();
  };
  const showFingers = (current?: number) => {
    kb.clear('option');
    kb.clear('target');
    kb.clearLabels();
    const top = (plan.length - 1) / 2;
    for (const st of plan) {
      // Label the way up; the way down uses the same fingers.
      if (st.step > top) continue;
      for (const k of Object.values(st.keys)) kb.set(toDevice(cal, k!.midi), 'option', true, String(k!.finger));
    }
    const now = plan[current ?? 0];
    if (now) for (const k of Object.values(now.keys)) kb.set(toDevice(cal, k!.midi), 'target', true, String(k!.finger));
  };

  const readSettings = () => {
    opts.kind = kindSel.value as GymKind;
    fillRoots();
    opts.root = rootSel.value;
    opts.hands = handsSel.value as GymHands;
    opts.octaves = Number(octSel.value) === 2 ? 2 : 1;
    opts.perBeat = Number(perSel.value) as 1 | 2 | 4;
    opts.tempo = Math.max(30, Math.min(200, Math.round(Number(tempo.value) || 60)));
    tempo.value = String(opts.tempo);
    plan = gymPlan(setup());
  };
  const changed = () => { stop(false); stopListen?.(); readSettings(); drawKeys(); gym = undefined; drawChart(); result.replaceChildren(); status.textContent = ''; };
  for (const el of [kindSel, rootSel, handsSel, octSel, perSel, tempo]) el.onchange = changed;
  slower.onclick = () => { tempo.value = String(Number(tempo.value) - 4); changed(); };
  faster.onclick = () => { tempo.value = String(Number(tempo.value) + 4); changed(); };

  listenBtn.onclick = () => {
    stopListen?.();
    audio();
    void loadPiano();
    const stepMs = 60000 / opts.tempo / opts.perBeat;
    const at = performance.now() + 300;
    for (const st of plan) for (const k of Object.values(st.keys)) piano(k!.midi, at + st.step * stepMs, stepMs * 0.95);
    const timers = plan.map((st) => window.setTimeout(() => showFingers(st.step), at + st.step * stepMs - performance.now()));
    timers.push(window.setTimeout(() => showFingers(), at + plan.length * stepMs - performance.now()));
    stopListen = () => { timers.forEach(clearTimeout); stopListen = undefined; };
  };

  function start() {
    stop(false);
    stopListen?.();
    readSettings();
    audio();
    const latencyMs = demo.active ? 0 : outputLatencyMs() + store.settings.latencyMs;
    const g = new ScaleGym(plan, { tempo: opts.tempo, perBeat: opts.perBeat, startAt: performance.now() + 400, latencyMs });
    gym = g;
    result.replaceChildren();
    drawChart();
    let clickedTo = g.opts.startAt - 1;
    const offNotes = midi.onNote((e) => {
      const dev = e.note;
      if (e.type !== 'on') { kb.set(dev, 'pressed', false); return; }
      kb.set(dev, 'pressed', true);
      const n = g.press(toWritten(cal, dev), e.time, e.velocity);
      kb.flash(dev, n ? 'hit' : 'wrong');
      if (n) drawChart();
    });
    let shown = -2;
    const stopAnim = animate((now) => {
      const to = now + 300;
      for (const c of g.clicks(clickedTo, to)) click(c.time, c.accent);
      clickedTo = to;
      const pos = g.position(now);
      if (pos.countIn) status.textContent = `Count-in: ${Math.max(1, pos.beat)}`;
      else status.textContent = pos.step <= (plan.length - 1) / 2 ? 'Going up' : 'Coming down';
      const step = Math.max(0, Math.min(plan.length - 1, pos.step));
      if (step !== shown) { shown = step; showFingers(step); }
      if (now > g.endsAt) stop(true);
    });
    run = { stop: () => { stopAnim(); offNotes(); } };
    startBtn.disabled = true;
    stopBtn.disabled = false;
    listenBtn.disabled = true;
    hooks.onStart?.(g);
  }

  /** End the run; `done` = it ran to the end (else only the notes due so far are counted). */
  function stop(done: boolean) {
    if (!run) return;
    run.stop();
    run = undefined;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    listenBtn.disabled = false;
    showFingers();
    if (!gym) return;
    const upTo = done ? Infinity : gym.position(performance.now()).step;
    if (upTo < 0) { status.textContent = ''; return; }
    const r = gymReport(gym, upTo);
    status.textContent = done ? 'Done' : 'Stopped';
    showResult(r, done);
  }

  startBtn.onclick = start;
  stopBtn.onclick = () => stop(false);

  function showResult(r: GymReport, done: boolean) {
    const key = setupKey();
    const prev = best.get(key);
    const newBest = done && (prev === undefined || r.score > prev);
    if (newBest) best.set(key, r.score);
    const st = stars(r.score);
    result.replaceChildren(
      h('p', { class: 'gym-score' }, h('strong', {}, String(r.score)), st ? ` ${'★'.repeat(st)}` : '',
        h('span', { class: 'small' }, done ? (newBest && prev !== undefined ? ` New best (was ${prev})` : prev !== undefined ? ` Best ${prev}` : '') : ' (stopped early)')),
      h('div', { class: 'timing-hands' }, ...r.hands.map(handCard)),
      r.wrong ? h('p', { class: 'small' }, `${r.wrong} wrong ${r.wrong === 1 ? 'key' : 'keys'}.`) : '',
      ...r.tips.map((t) => h('p', { class: 'gym-tip' }, t)),
    );
  }

  const handCard = (r: HandReport) => {
    const lean = Math.abs(r.lean) < 15 ? 'On the click' : `${Math.abs(r.lean)} ms ${r.lean > 0 ? 'late' : 'early'}`;
    const even = r.spread < 20 ? 'very even' : r.spread < 35 ? 'even' : r.spread < 60 ? 'a little uneven' : 'uneven';
    return h('div', { class: `timing-hand ${r.hand}` },
      h('h3', {}, HAND_LABEL[r.hand]),
      h('p', { class: 'timing-big' }, r.played ? lean : 'Nothing played'),
      r.played ? h('p', { class: 'small' }, `${even[0].toUpperCase()}${even.slice(1)}: notes land within ±${r.spread} ms of each other.${r.missed ? ` ${r.missed} missed.` : ''}`) : '',
      r.passLean !== undefined ? h('p', { class: 'small' }, `Thumb passes: ${signed(r.passLean)}; the other notes ${signed(r.otherLean!)}.`) : '',
      r.velSpread !== undefined ? h('p', { class: 'small' }, `Loudness wanders ±${r.velSpread}${r.thumbLouder !== undefined && Math.abs(r.thumbLouder) >= 5 ? `; the thumb plays ${Math.abs(r.thumbLouder)} ${r.thumbLouder > 0 ? 'louder' : 'softer'}` : ''}.`) : '',
      r.worst.length ? h('p', { class: 'small' }, 'Furthest off: ', r.worst.map((n) => `${midiName(n.midi)} (finger ${n.finger}, ${signed(n.offsetMs!)})`).join(', '), '.') : '');
  };
  const signed = (ms: number) => (Math.abs(ms) < 5 ? 'on the click' : `${Math.abs(ms)} ms ${ms > 0 ? 'late' : 'early'}`);

  /** Each note of the run left to right: late above the line, early below, thumb passes marked. */
  function drawChart() {
    const W = width(chart), H = 162, mid = 64, half = 52;
    const n = plan.length;
    const x = (step: number) => 24 + (step / Math.max(1, n - 1)) * (W - 48);
    const range = gym ? Math.max(60, Math.min(150, gym.stepMs / 2)) : 100;
    const y = (ms: number) => mid - (Math.max(-range, Math.min(range, ms)) / range) * half;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'pulse-svg', role: 'img', 'aria-label': 'Each note of the scale: late above the line, early below' });
    const topX = x((n - 1) / 2);
    svg.append(
      s('line', { x1: topX, x2: topX, y1: 4, y2: mid + half, class: 'gym-top' }),
      s('line', { x1: 0, x2: W, y1: mid, y2: mid, class: 'pulse-centre' }),
      s('text', { x: 4, y: 14, class: 'pulse-axis' }, `late`),
      s('text', { x: 4, y: mid + half + 2, class: 'pulse-axis' }, `early`),
      s('text', { x: topX - 6, y: 14, class: 'pulse-axis', 'text-anchor': 'end' }, 'up'),
      s('text', { x: topX + 6, y: 14, class: 'pulse-axis' }, 'down'),
    );
    const hands = (Object.keys(plan[0]?.keys ?? {}) as Hand[]);
    const small = (W - 48) / Math.max(1, n - 1) < 13;
    const bw = Math.max(3, Math.min(14, (W - 48) / Math.max(1, n) / (hands.length + 0.6)));
    for (const st of plan) {
      hands.forEach((hand, hi) => {
        const k = st.keys[hand]!;
        const bx = x(st.step) + (hi - (hands.length - 1) / 2) * bw;
        // A row of finger numbers per hand (right above left), a ▲ under each thumb pass.
        const fy = H - 4 - (hands.length - 1 - hi) * 13;
        if (k.pass) svg.append(s('path', { d: `M${x(st.step) - 4} ${H - 4 - hands.length * 13} l4 -6 l4 6 z`, class: `gym-pass ${hand}` }));
        svg.append(s('text', { x: x(st.step), y: fy, class: `gym-finger ${hand}`, 'text-anchor': 'middle', 'font-size': small ? 9 : 11 }, String(k.finger)));
        const note = gym?.notes.find((g) => g.step === st.step && g.hand === hand);
        if (!note || note.offsetMs === undefined) {
          const due = gym && gym.position(performance.now()).step > st.step + 1;
          if (due) svg.append(s('text', { x: bx, y: mid + 4, class: 'gym-miss', 'text-anchor': 'middle' }, '×'));
          return;
        }
        const yy = y(note.offsetMs);
        svg.append(s('rect', { x: bx - bw / 2, y: Math.min(yy, mid), width: bw - 1, height: Math.max(1.5, Math.abs(yy - mid)), rx: 1.5, class: `gym-bar ${hand}` }));
      });
    }
    chart.replaceChildren(svg);
  }

  drawKeys();
  drawChart();

  const banner = h('div');
  const showBanner = () => banner.replaceChildren(midiBanner() ?? '');
  showBanner();
  const offPorts = midi.onPorts(showBanner);

  root.append(banner, h('section', { class: 'card gym' },
    h('h2', {}, 'Scale gym'),
    h('p', {}, 'Scales and arpeggios up and back down on the click, with the fingering on the keys. Afterwards every note shows where it landed, so you can see which hand stumbles and where: most often where the thumb passes under (marked ▲). Even first, fast later.'),
    h('div', { class: 'controls' }, h('label', {}, 'Play ', kindSel), h('label', {}, 'in ', rootSel), handsSel, octSel),
    h('div', { class: 'controls' }, perSel, h('label', {}, 'Tempo ', slower, tempo, faster)),
    h('div', { class: 'controls' }, listenBtn, startBtn, stopBtn, status),
    stage, chart, result,
    h('p', { class: 'small' }, 'Nothing here is saved. One bar of count-in, then the scale goes up and back down. Check your pulse alone in the ', h('a', { href: '#/pulse' }, 'Timing mirror'), '.'),
  ));

  return () => { run?.stop(); stopListen?.(); offPorts(); };
}
