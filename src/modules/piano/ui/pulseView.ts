import { audio, click, outputLatencyMs } from '../audio/audio';
import { toWritten, type Calibration } from '../calibration';
import { demo } from '../demo/demo';
import { leanWords, Pulse, pulseStats, silentDrift, steadyWords, tapTempo, type PulseHand, type PulseHit } from '../engine/pulse';
import { midi } from '../midi/input';
import { store } from '../progress/store';
import { h, s, type View } from '../../../core/dom';
import { animate } from './players';
import { midiBanner, needCalibration } from './views';
import { roomEyebrow } from './practiceRoom';

// The Timing mirror (#/pulse): a metronome that shows, press by press, how early or late each hand
// lands and how steady it is, with silent bars to test the inner pulse. Nothing is saved; the
// settings last until the page reloads.

const HANDS: PulseHand[] = ['right', 'left'];
const HAND_LABEL: Record<PulseHand, string> = { right: 'Right hand', left: 'Left hand' };
const SILENT: Record<string, { play: number; rest: number } | undefined> = {
  off: undefined, '2-2': { play: 2, rest: 2 }, '1-1': { play: 1, rest: 1 }, '3-1': { play: 3, rest: 1 },
};
const DEFAULTS = { tempo: 80, beats: 4, sub: 1 as 1 | 2, silent: 'off' };
const kept = { ...DEFAULTS };

/** Opens the Timing mirror at this tempo next time (the Play report hands over the tempo it found). */
export function presetPulse(tempo: number) {
  kept.tempo = Math.max(30, Math.min(240, Math.round(tempo)));
}

/** Dots kept on the mirror per hand, and presses on the timeline. */
const DOTS = 12;
/** Drawn at the size it shows (so text stays readable on a phone), 600 before it is on the page. */
const width = (el: HTMLElement) => Math.max(280, Math.min(1000, (el.clientWidth || 616) - 16));
const LINE = 40;

export interface PulseHooks {
  /** Called when a run starts (the demo plays along). */
  onStart?: (p: Pulse) => void;
}

export const pulseView: View = (root) => {
  const cal = needCalibration(root);
  if (!cal) return;
  return mountPulse(root, cal);
};

export function mountPulse(root: HTMLElement, cal: Calibration, hooks: PulseHooks = {}) {
  // The demo works on its own copy, so it never changes what the player picked.
  const settings = demo.active ? { ...DEFAULTS } : kept;
  const tempo = h('input', { type: 'number', min: 30, max: 240, step: 1, value: settings.tempo, 'aria-label': 'tempo', class: 'num' });
  const slower = h('button', { class: 'secondary', 'aria-label': 'slower' }, '−');
  const faster = h('button', { class: 'secondary', 'aria-label': 'faster' }, '+');
  const tap = h('button', { class: 'secondary' }, 'Tap tempo');
  const beats = h('select', { 'aria-label': 'beats per bar' }, ...[2, 3, 4, 6].map((n) => h('option', { value: n, selected: n === settings.beats }, String(n))));
  const sub = h('select', { 'aria-label': 'presses on' },
    h('option', { value: 1, selected: settings.sub === 1 }, 'Beats'), h('option', { value: 2, selected: settings.sub === 2 }, 'Beats and halves'));
  const silent = h('select', { 'aria-label': 'silent bars' },
    ...[['off', 'Off'], ['2-2', '2 bars on, 2 off'], ['3-1', '3 bars on, 1 off'], ['1-1', '1 bar on, 1 off']].map(([v, l]) => h('option', { value: v, selected: v === settings.silent }, l)));
  const startBtn = h('button', {}, 'Start');
  const stopBtn = h('button', { class: 'secondary', disabled: true }, 'Stop');
  const clearBtn = h('button', { class: 'secondary' }, 'Clear');
  const status = h('span', { class: 'small pulse-status', 'aria-live': 'polite' });
  const lights = h('div', { class: 'pulse-lights', 'aria-hidden': 'true' });
  const mirror = h('div', { class: 'pulse-mirror' });
  const line = h('div', { class: 'pulse-line' });
  const readout = h('div', { class: 'timing-hands pulse-readout' });

  let run: { p: Pulse; stop: () => void } | undefined;
  let hits: PulseHit[] = [];
  let range = 150;

  const readSettings = () => {
    settings.tempo = Math.max(30, Math.min(240, Math.round(Number(tempo.value) || 80)));
    tempo.value = String(settings.tempo);
    settings.beats = Number(beats.value);
    settings.sub = Number(sub.value) === 2 ? 2 : 1;
    settings.silent = silent.value;
  };
  /** Settings changed mid-run: start again at the new ones, keeping the dots. */
  const restartIfRunning = () => { readSettings(); if (run) { stop(); start(); } };

  slower.onclick = () => { tempo.value = String(Number(tempo.value) - 4); restartIfRunning(); };
  faster.onclick = () => { tempo.value = String(Number(tempo.value) + 4); restartIfRunning(); };
  tempo.onchange = restartIfRunning;
  beats.onchange = restartIfRunning;
  sub.onchange = restartIfRunning;
  silent.onchange = restartIfRunning;
  let taps: number[] = [];
  tap.onclick = () => {
    const now = performance.now();
    if (taps.length && now - taps[taps.length - 1] > 2000) taps = [];
    taps.push(now);
    const bpm = tapTempo(taps);
    if (bpm) { tempo.value = String(bpm); readSettings(); }
    status.textContent = bpm ? `Tapped: ${bpm} beats a minute` : 'Keep tapping…';
  };

  const drawLights = (now: number) => {
    if (!run) { lights.replaceChildren(); return; }
    const pos = run.p.position(now);
    const n = settings.beats;
    lights.replaceChildren(...Array.from({ length: n }, (_, i) =>
      h('span', { class: `pulse-light${i === 0 ? ' down' : ''}${pos.beat === i + 1 ? ' on' : ''}${pos.silent ? ' silent' : ''}` })));
    status.textContent = pos.countIn ? `Count-in: ${pos.beat}` : pos.silent ? 'Silent bar: keep counting' : `Bar ${pos.bar + 1}`;
  };

  function start() {
    readSettings();
    audio();
    const latencyMs = demo.active ? 0 : outputLatencyMs() + store.settings.latencyMs;
    const p = new Pulse({ tempo: settings.tempo, beatsPerBar: settings.beats, sub: settings.sub, startAt: performance.now() + 400, latencyMs, silent: SILENT[settings.silent] });
    range = Math.min(150, Math.round(p.stepMs / 2));
    let clickedTo = p.opts.startAt - 1;
    const offNotes = midi.onNote((e) => {
      if (e.type !== 'on') return;
      const hit = p.press(toWritten(cal, e.note), e.time);
      if (hit) { hits.push(hit); draw(); }
    });
    const stopAnim = animate((now) => {
      const to = now + 300;
      for (const c of p.clicks(clickedTo, to)) click(c.time, c.accent);
      clickedTo = to;
      drawLights(now);
    });
    run = {
      p,
      stop: () => { stopAnim(); offNotes(); },
    };
    startBtn.disabled = true;
    stopBtn.disabled = false;
    hooks.onStart?.(p);
  }

  function stop() {
    run?.stop();
    run = undefined;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    status.textContent = hits.length ? `${hits.length} ${hits.length === 1 ? 'press' : 'presses'}` : '';
    lights.replaceChildren();
  }

  startBtn.onclick = start;
  stopBtn.onclick = stop;
  clearBtn.onclick = () => { hits = []; draw(); };

  /** The mirror: one row per hand, on the beat in the middle, early to the left, late to the right. */
  function drawMirror() {
    const W = width(mirror), ROW = 46, H = ROW * 2 + 26, mid = W / 2, half = W / 2 - 20;
    const x = (ms: number) => mid + (Math.max(-range, Math.min(range, ms)) / range) * half;
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'pulse-svg', role: 'img', 'aria-label': 'Where your presses land around the beat' });
    svg.append(
      s('rect', { x: mid - (15 / range) * half, y: 0, width: (30 / range) * half, height: ROW * 2, class: 'pulse-zone' }),
      s('line', { x1: mid, x2: mid, y1: 0, y2: ROW * 2, class: 'pulse-centre' }),
      s('text', { x: 20, y: H - 6, class: 'pulse-axis' }, `${range} ms early`),
      s('text', { x: mid, y: H - 6, class: 'pulse-axis', 'text-anchor': 'middle' }, 'on the beat'),
      s('text', { x: W - 20, y: H - 6, class: 'pulse-axis', 'text-anchor': 'end' }, `${range} ms late`),
    );
    HANDS.forEach((hand, r) => {
      const y = r * ROW + ROW / 2;
      svg.append(s('line', { x1: 20, x2: W - 20, y1: y, y2: y, class: 'pulse-row' }));
      const mine = hits.filter((t) => t.hand === hand).slice(-DOTS);
      mine.forEach((t, i) => {
        const age = (mine.length - 1 - i) / DOTS;
        svg.append(s('circle', {
          cx: x(t.offsetMs), cy: y, r: i === mine.length - 1 ? 9 : 6,
          class: `pulse-dot ${hand}${t.silent ? ' silent' : ''}`, opacity: (1 - age * 0.8).toFixed(2),
        }));
      });
      svg.append(s('text', { x: 24, y: y - 10, class: 'pulse-label' }, HAND_LABEL[hand]));
    });
    mirror.replaceChildren(svg);
  }

  /** The timeline: the last presses left to right, early below the middle, late above. */
  function drawLine() {
    const W = width(line), H = 120, mid = H / 2;
    const recent = hits.slice(-LINE);
    const y = (ms: number) => mid - (Math.max(-range, Math.min(range, ms)) / range) * (mid - 8);
    const x = (i: number) => 10 + (i / (LINE - 1)) * (W - 20);
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'pulse-svg', role: 'img', 'aria-label': 'Your last presses, early below the line and late above' });
    svg.append(s('line', { x1: 0, x2: W, y1: mid, y2: mid, class: 'pulse-centre' }),
      s('text', { x: 6, y: 14, class: 'pulse-axis' }, 'late'), s('text', { x: 6, y: H - 4, class: 'pulse-axis' }, 'early'));
    // Silent bars as shaded columns.
    recent.forEach((t, i) => { if (t.silent) svg.append(s('rect', { x: x(i) - 6, y: 0, width: 12, height: H, class: 'pulse-quiet' })); });
    for (const hand of HANDS) {
      const pts = recent.map((t, i) => ({ t, i })).filter(({ t }) => t.hand === hand);
      if (pts.length > 1) svg.append(s('polyline', { points: pts.map(({ t, i }) => `${x(i)},${y(t.offsetMs)}`).join(' '), class: `pulse-trace ${hand}` }));
      for (const { t, i } of pts) svg.append(s('circle', { cx: x(i), cy: y(t.offsetMs), r: 3.5, class: `pulse-dot ${hand}${t.silent ? ' silent' : ''}` }));
    }
    line.replaceChildren(svg);
  }

  function drawReadout() {
    readout.replaceChildren(...HANDS.map((hand) => {
      const mine = hits.filter((t) => t.hand === hand);
      // The lean and steadiness come from bars with the click; the silent bars get their own line.
      const heard = mine.filter((t) => !t.silent);
      const st = pulseStats((heard.length ? heard : mine).slice(-24));
      const drift = silentDrift(mine.slice(-48));
      return h('div', { class: `timing-hand ${hand}` },
        h('h3', {}, HAND_LABEL[hand]),
        st ? h('p', { class: 'timing-big' }, leanWords(st.mean)) : h('p', { class: 'small' }, hand === 'right' ? 'Play on the click from middle C up.' : 'Play on the click below middle C.'),
        st ? h('p', { class: 'small' }, `${steadyWords(st.spread)[0].toUpperCase()}${steadyWords(st.spread).slice(1)}: presses land within ±${st.spread} ms of each other. From the last ${st.count}.`) : '',
        drift ? h('p', { class: 'small' }, drift.words) : '');
    }));
  }

  function draw() { drawMirror(); drawLine(); drawReadout(); }
  draw();

  const banner = h('div');
  const showBanner = () => banner.replaceChildren(midiBanner() ?? '');
  showBanner();
  const offPorts = midi.onPorts(showBanner);

  root.append(banner, h('section', { class: 'card pulse' },
    roomEyebrow('pulse'),
    h('h2', {}, 'Timing mirror'),
    h('p', {}, 'A metronome that listens. Play any key on the click, with either hand or both, and see each press land early or late. A good pulse is steady first; being exactly on the click comes next. Turn on silent bars to find out whether the beat is inside you or only in the click.'),
    h('div', { class: 'controls' },
      h('label', {}, 'Tempo ', slower, tempo, faster), tap,
      h('label', {}, 'Beats in a bar ', beats), h('label', {}, 'Play on ', sub), h('label', {}, 'Silent bars ', silent)),
    h('div', { class: 'controls' }, startBtn, stopBtn, clearBtn, lights, status),
    mirror, line, readout,
    h('p', { class: 'small' }, 'Nothing here is saved. Timing from scored exercises is on your Profile. If every press shows late, set Settings → Timing. Scales and arpeggios, note by note: ', h('a', { href: '#/scales' }, 'Scale gym'), '. Anything, with no click: ', h('a', { href: '#/report' }, 'Play report'), '.'),
  ));

  return () => { run?.stop(); offPorts(); };
}
