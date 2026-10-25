import { audio, loadPiano, piano, stopAll } from '../audio/audio';
import { keyWindow, toDevice, toWritten, type Calibration } from '../calibration';
import { levelOf, playReport, where, type PlayedNote, type PlayReport, type ReportEvent } from '../engine/playReport';
import { midi } from '../midi/input';
import type { Hand } from '../music/notes';
import { h, s, type View } from '../../../core/dom';
import { KeyboardView } from './keyboard';
import { animate } from './players';
import { presetPulse } from './pulseView';
import { midiBanner, needCalibration } from './views';
import { roomEyebrow } from './practiceRoom';

// The Play report (#/report): nothing to pick and no click. The page is always listening; the
// first key starts a take and five seconds of quiet (or Finish) ends it. Then it says what it
// heard: the tempo and whether it crept, every place held back or hurried against the player's
// own beat, stops, which hand lands first, the key, the chords and the loudness, with tips.
// Nothing is saved.

/** A take ends after this long with no key pressed. */
export const IDLE_MS = 5000;
const HAND_LABEL: Record<Hand, string> = { right: 'Right hand', left: 'Left hand' };
const width = (el: HTMLElement) => Math.max(280, Math.min(1000, (el.clientWidth || 616) - 16));

export interface ReportHooks {
  /** Called once the page is listening (the demo plays along). */
  onReady?: () => void;
  /** Called when a report is shown. */
  onReport?: (r: PlayReport) => void;
}

export const playReportView: View = (root) => {
  const cal = needCalibration(root);
  if (!cal) return;
  return mountPlayReport(root, cal);
};

export function mountPlayReport(root: HTMLElement, cal: Calibration, hooks: ReportHooks = {}) {
  const finishBtn = h('button', { class: 'secondary', disabled: true }, 'Finish');
  const playBtn = h('button', { class: 'secondary', disabled: true }, 'Play it back');
  const status = h('span', { class: 'small', 'aria-live': 'polite' }, 'Listening: play anything');
  const stage = h('div', { class: 'stage' });
  const tempoChart = h('div', { class: 'pulse-line report-chart' });
  const timeChart = h('div', { class: 'pulse-line report-chart' });
  const result = h('div', { class: 'gym-result report-result', 'aria-live': 'polite' });

  const [low, high] = keyWindow(cal, [36, 84].map((m) => toDevice(cal, m)), 2);
  const kb = new KeyboardView(low, high, { middleC: cal.middleC, cal, labels: 'c' });
  stage.append(kb.el);

  /** The take being played (written MIDI, performance ms), and the last one finished. */
  let take: PlayedNote[] = [];
  let last: { notes: PlayedNote[]; report?: PlayReport } | undefined;
  const open = new Map<number, PlayedNote>();

  const offNotes = midi.onNote((e) => {
    const w = toWritten(cal, e.note);
    if (e.type !== 'on') {
      kb.set(e.note, 'pressed', false);
      const n = open.get(w);
      if (n) { n.off = e.time; open.delete(w); }
      return;
    }
    kb.set(e.note, 'pressed', true);
    if (!take.length) begin();
    const n: PlayedNote = { midi: w, on: e.time, velocity: e.velocity };
    take.push(n);
    open.set(w, n);
  });

  /** The first key of a take: the last report gives way to the live count. */
  function begin() {
    stopAll();
    result.replaceChildren();
    tempoChart.hidden = timeChart.hidden = true;
    finishBtn.disabled = false;
    playBtn.disabled = true;
  }

  let counted = 0;
  const stopAnim = animate((now) => {
    if (!take.length) return;
    const lastOn = take[take.length - 1].on;
    if (now - lastOn > IDLE_MS && !open.size) { finish(); return; }
    if (take.length === counted) return;
    counted = take.length;
    const so = playReport(take);
    status.textContent = `Listening: ${take.length} ${take.length === 1 ? 'note' : 'notes'}${so ? `, about ${so.bpm} a minute` : ''}. Stop for ${IDLE_MS / 1000} seconds, or press Finish, for the report.`;
  });

  function finish() {
    if (!take.length) return;
    const end = performance.now();
    for (const n of open.values()) n.off = end;
    open.clear();
    const notes = take;
    take = [];
    counted = 0;
    finishBtn.disabled = true;
    const report = playReport(notes);
    last = { notes, report };
    playBtn.disabled = false;
    if (!report) {
      status.textContent = 'Listening: play anything';
      result.replaceChildren(h('p', { class: 'gym-tip' }, `That was too short to find a beat (${notes.length} ${notes.length === 1 ? 'note' : 'notes'}). Play at least a few bars: a tune, a piece, a scale, anything with a beat.`));
      return;
    }
    status.textContent = 'Listening: play again for a new report';
    show(report);
    hooks.onReport?.(report);
  }

  finishBtn.onclick = finish;
  playBtn.onclick = () => {
    if (!last) return;
    audio();
    void loadPiano();
    stopAll();
    const first = Math.min(...last.notes.map((n) => n.on));
    const at = performance.now() + 300;
    for (const n of last.notes) piano(n.midi, at + n.on - first, Math.max(120, (n.off ?? n.on + 400) - n.on), 0.25 + (n.velocity / 127) * 0.5);
  };

  function show(r: PlayReport) {
    const start = r.events[0].time;
    const key = r.key?.key ?? 'C';
    const line = (label: string, evs: ReportEvent[]) => evs.length
      ? h('p', { class: 'small' }, `${label}: `, evs.map((e) => `${where(e, start, key)} (${Math.abs(e.devMs!)} ms)`).join('; '), '.') : '';
    const tempoWords = r.tempo.change === 'steady' ? ' and kept it steady' : r.tempo.change === 'faster' ? `, speeding up from ${r.tempo.start} to ${r.tempo.end}` : `, slowing from ${r.tempo.start} to ${r.tempo.end}`;
    const toPulse = h('button', { class: 'secondary', onclick: () => { presetPulse(r.tempo.start); location.hash = '#/pulse'; } }, `Timing mirror at ${r.tempo.start}`);
    result.replaceChildren(
      h('p', { class: 'gym-tempo' }, 'Your tempo: ', h('strong', {}, String(r.bpm)), ` beats a minute${tempoWords}`,
        h('span', { class: 'small' }, ` (${r.notes} notes in ${r.seconds} s; the shortest notes ${r.perBeat === 1 ? 'one' : r.perBeat} to a beat)`)),
      r.key ? h('p', { class: 'gym-heard' }, r.key.sure ? 'Key: ' : 'Key, most likely: ', h('strong', {}, r.key.name), r.key.other ? h('span', { class: 'small' }, ` (or ${r.key.other})`) : '') : '',
      r.chords.length ? h('p', { class: 'gym-heard report-chords' }, 'Chords: ',
        ...r.chords.slice(0, 16).map((c) => h('span', { class: 'meta-chip' }, c.name, c.numeral ? h('span', { class: 'report-numeral' }, ` ${c.numeral}`) : '')),
        r.chords.length > 16 ? h('span', { class: 'small' }, ` and ${r.chords.length - 16} more`) : '') : '',
      r.dynamics ? h('p', { class: 'small' }, `Loudness: from ${r.dynamics.from} to ${r.dynamics.to}${r.dynamics.right !== undefined && r.dynamics.left !== undefined ? ` (right hand around ${levelOf(r.dynamics.right)}, left around ${levelOf(r.dynamics.left)})` : ''}.`) : '',
      h('div', { class: 'timing-hands' }, ...(['right', 'left'] as Hand[]).filter((hand) => r.hands[hand]).map((hand) => handCard(r, hand))),
      line('Held back the most', r.held),
      line('Hurried the most', r.hurried),
      ...r.tips.map((t) => h('p', { class: 'gym-tip' }, t)),
      h('div', { class: 'controls' }, toPulse),
    );
    drawTempo(r);
    drawTiming(r);
  }

  const handCard = (r: PlayReport, hand: Hand) => {
    const st = r.hands[hand]!;
    const even = st.spreadMs === undefined ? '' : st.spreadMs < 25 ? 'Very even' : st.spreadMs < 45 ? 'Even' : st.spreadMs < 75 ? 'A little uneven' : 'Uneven';
    const first = r.gapMs !== undefined && Math.abs(r.gapMs) >= 15 && (r.gapMs > 0) === (hand === 'left') ? ` Lands about ${Math.abs(r.gapMs)} ms before the other hand.` : '';
    return h('div', { class: `timing-hand ${hand}` },
      h('h3', {}, HAND_LABEL[hand]),
      h('p', { class: 'timing-big' }, even || `${st.count} ${st.count === 1 ? 'note' : 'notes'}`),
      h('p', { class: 'small' }, `${st.count} ${st.count === 1 ? 'time' : 'times'} struck.${st.spreadMs !== undefined ? ` Its gaps keep within about ±${st.spreadMs} ms of your beat.` : ''}${first}`));
  };

  /** The player's tempo through the take, against the tempo of the whole. */
  function drawTempo(r: PlayReport) {
    tempoChart.hidden = false;
    const W = width(tempoChart), H = 110, pad = 26;
    const t0 = r.events[0].time, t1 = r.events[r.events.length - 1].time;
    const x = (t: number) => pad + ((t - t0) / Math.max(1, t1 - t0)) * (W - pad * 2);
    const pts = r.events.filter((e) => e.bpm !== undefined);
    const lo = Math.min(r.bpm * 0.8, ...pts.map((e) => e.bpm!)), hi = Math.max(r.bpm * 1.2, ...pts.map((e) => e.bpm!));
    const y = (b: number) => 12 + ((hi - b) / (hi - lo)) * (H - 30);
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'pulse-svg', role: 'img', 'aria-label': `Your tempo through the take, around ${r.bpm} beats a minute` });
    svg.append(
      s('line', { x1: pad, x2: W - pad, y1: y(r.bpm), y2: y(r.bpm), class: 'pulse-centre' }),
      s('text', { x: 4, y: y(r.bpm) - 4, class: 'pulse-axis' }, String(r.bpm)),
      s('text', { x: 4, y: H - 4, class: 'pulse-axis' }, 'Tempo through the take (beats a minute)'),
    );
    if (pts.length > 1) svg.append(s('polyline', { points: pts.map((e) => `${x(e.time)},${y(e.bpm!)}`).join(' '), class: 'report-tempo' }));
    for (const e of r.stops) svg.append(s('line', { x1: x(e.time), x2: x(e.time), y1: 4, y2: H - 18, class: 'gym-top' }));
    tempoChart.replaceChildren(svg);
  }

  /** Every note struck, left to right in time: held back above the line, hurried below, by hand. */
  function drawTiming(r: PlayReport) {
    timeChart.hidden = false;
    const W = width(timeChart), H = 150, mid = 68, half = 56, pad = 26;
    const t0 = r.events[0].time, t1 = r.events[r.events.length - 1].time;
    const x = (t: number) => pad + ((t - t0) / Math.max(1, t1 - t0)) * (W - pad * 2);
    const range = Math.max(80, Math.min(250, r.unitMs * r.perBeat * 0.35));
    const y = (ms: number) => mid - (Math.max(-range, Math.min(range, ms)) / range) * half;
    const bw = Math.max(2, Math.min(8, (W - pad * 2) / r.events.length - 1));
    const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: 'pulse-svg', role: 'img', 'aria-label': 'Each note: held back above the line, hurried below' });
    svg.append(
      s('line', { x1: 0, x2: W, y1: mid, y2: mid, class: 'pulse-centre' }),
      s('text', { x: 4, y: 12, class: 'pulse-axis' }, 'held back'),
      s('text', { x: 4, y: mid + half + 4, class: 'pulse-axis' }, 'hurried'),
      s('text', { x: 4, y: H - 4, class: 'pulse-axis' }, `Each note against your own beat (±${Math.round(range)} ms)`),
    );
    for (const e of r.events) {
      if (e.mark === 'stop') {
        svg.append(s('line', { x1: x(e.time), x2: x(e.time), y1: 4, y2: mid + half, class: 'gym-top' }),
          s('text', { x: x(e.time) + 3, y: 24, class: 'pulse-axis' }, 'stop'));
        continue;
      }
      if (e.devMs === undefined) continue;
      const hand = e.hands.includes('right') ? 'right' : 'left';
      const yy = y(e.devMs);
      svg.append(s('rect', { x: x(e.time) - bw / 2, y: Math.min(yy, mid), width: bw, height: Math.max(1.5, Math.abs(yy - mid)), rx: 1, class: `gym-bar ${hand}${e.mark ? ' marked' : ''}` }));
    }
    timeChart.replaceChildren(svg);
  }

  tempoChart.hidden = timeChart.hidden = true;
  const banner = h('div');
  const showBanner = () => banner.replaceChildren(midiBanner() ?? '');
  showBanner();
  const offPorts = midi.onPorts(showBanner);

  root.append(banner, h('section', { class: 'card gym report' },
    roomEyebrow('report'),
    h('h2', {}, 'Play report'),
    h('p', {}, 'Play anything: a piece, a song, a scale, something of your own. There is no click and nothing to set. The page listens, finds your own tempo, and then shows where you held back or hurried against it, where you sped up or slowed down, which hand lands first, the key and the chords it heard.'),
    h('div', { class: 'controls' }, finishBtn, playBtn, status),
    stage, result, tempoChart, timeChart,
    h('p', { class: 'small' }, 'Nothing here is saved. Hands split at middle C. To see what you played written down, use the ', h('a', { href: '#/sketchbook' }, 'Sketchbook'), '; to play on a click, the ', h('a', { href: '#/pulse' }, 'Timing mirror'), '.'),
  ));
  hooks.onReady?.();

  return () => { stopAnim(); offNotes(); offPorts(); stopAll(); };
}
