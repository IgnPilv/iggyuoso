import { keyWindow, toDevice, toWritten, type Calibration } from '../calibration';
import { audio, click, drum, loadPiano, outputLatencyMs, piano, stopAll } from '../audio/audio';
import {
  BACKINGS, barEvents, chordAt, comp, emptyTally, fitOf, GROOVES, JAM_KEYS, JAM_MINOR_KEYS, jamAdvice, jamPlan, tallyNote,
  bassRoot, type Fit, type GrooveId, type JamPlan,
} from '../engine/jam';
import { midi } from '../midi/input';
import { chordWords } from '../music/chordNames';
import { pitchClass } from '../music/notes';
import { store } from '../progress/store';
import { h, type View } from '../../../core/dom';
import { KeyboardView } from './keyboard';
import { needCalibration } from './views';
import { roomEyebrow } from './practiceRoom';

// The Jam room (#/jam): pick a progression, a key, a groove and a tempo, and a small band (drums,
// bass, chords) loops it while the player makes things up on top. The keys light the chord
// that is playing (bright) and the scale that fits (soft); each note played shows how it fits.
// Nothing is saved. Settings changed while the band plays take effect from the next bar.

const keyLabel = (k: string, minor: boolean) => `${k.replace('b', '♭').replace('#', '♯')} ${minor ? 'minor' : 'major'}`;
const FIT_WORDS: Record<Fit, string> = { chord: 'chord notes', scale: 'in the scale', key: 'in the key', outside: 'outside' };

/** What the page remembers until it reloads (the demo keeps its own). */
const kept = { backing: 'pop', key: 'C', groove: 'pop' as GrooveId, tempo: 92 };

export interface JamHooks {
  /** Called when the band starts: when bar 0 begins and how long a beat is. */
  onStart?: (info: { t0: number; beatMs: number; plan: JamPlan }) => void;
}

export function mountJam(box: HTMLElement, cal: Calibration, hooks: JamHooks = {}, opts = hooks.onStart ? { ...kept } : kept) {
  // Room for a left hand and a tune: G2 to B5, or two octaves around middle C on a phone.
  const narrow = typeof window !== 'undefined' && window.innerWidth < 600;
  const [low, high] = keyWindow(cal, (narrow ? [55, 79] : [43, 83]).map((m) => toDevice(cal, m)), 0);
  const kb = new KeyboardView(low, high, { middleC: cal.middleC, cal, labels: 'c' });
  const backingSel = h('select', { 'aria-label': 'backing' }, ...BACKINGS.map((b) => h('option', { value: b.id }, b.name)));
  const keySel = h('select', { 'aria-label': 'key' });
  const grooveSel = h('select', { 'aria-label': 'groove' }, ...GROOVES.map((g) => h('option', { value: g.id }, g.name)));
  const tempo = h('input', { type: 'number', min: 50, max: 180, step: 2, value: opts.tempo, 'aria-label': 'tempo', class: 'num' });
  const startBtn = h('button', {}, 'Start');
  const stopBtn = h('button', { class: 'secondary', disabled: true }, 'Stop');
  const chart = h('div', { class: 'jam-chart', role: 'list', 'aria-label': 'chords' });
  const now = h('p', { class: 'jam-now', 'aria-live': 'polite' });
  const tallyEl = h('div', { class: 'jam-tally' });
  const advice = h('p', { class: 'small jam-advice' });
  backingSel.value = opts.backing;
  grooveSel.value = opts.groove;

  const backing = () => BACKINGS.find((b) => b.id === backingSel.value) ?? BACKINGS[0];
  const fillKeys = () => {
    const b = backing();
    const keys = b.minor ? JAM_MINOR_KEYS : JAM_KEYS;
    keySel.replaceChildren(...keys.map((k) => h('option', { value: k }, keyLabel(k, b.minor))));
    keySel.value = keys.includes(opts.key) ? opts.key : keys[0];
  };
  fillKeys();

  let plan = jamPlan(backing(), keySel.value);
  let tally = emptyTally();
  /** Bars scheduled so far: when each starts (perf ms), its beat length and its chord. */
  let bars: { n: number; at: number; beatMs: number; chord: number; plan: JamPlan }[] = [];
  let timer: number | undefined;
  let frame: number | undefined;
  let litBar = -2;
  const latency = () => outputLatencyMs() + (store.settings.latencyMs ?? 0);

  const drawChart = (p = plan, current = -1) => {
    chart.replaceChildren(...p.chords.map((c, i) => h('div', { class: `jam-bar${i === current ? ' now' : ''}`, role: 'listitem' },
      h('span', { class: 'jam-name' }, c.name), h('span', { class: 'jam-numeral' }, c.numeral))));
  };

  /** Light the chord (bright) and the rest of the scale (soft) on every octave of the keyboard. */
  const light = (p: JamPlan, chord: number) => {
    kb.clear('target');
    kb.clear('option');
    const c = p.chords[chord];
    for (let m = low; m <= high; m++) {
      const pc = pitchClass(toWritten(cal, m));
      if (c.pcs.has(pc)) kb.set(m, 'target');
      else if (p.scale.has(pc)) kb.set(m, 'option');
    }
  };

  const showTally = () => {
    const all = tally.chord + tally.scale + tally.key + tally.outside;
    tallyEl.replaceChildren(
      h('div', { class: 'jam-fit', 'aria-hidden': 'true' }, ...(['chord', 'scale', 'key', 'outside'] as Fit[]).map((f) =>
        h('span', { class: `fit-${f}`, style: `flex-grow: ${all ? tally[f] : f === 'outside' ? 0 : 1}` }))),
      h('p', { class: 'small' }, all
        ? (['chord', 'scale', 'key', 'outside'] as Fit[]).map((f) => `${tally[f]} ${FIT_WORDS[f]}`).join(' · ')
          + (tally.downbeats ? ` · on beat 1: ${tally.downbeatChord} of ${tally.downbeats} on the chord` : '')
        : 'Your notes are counted here: chord notes, notes of the scale, other notes of the key, and notes outside it.'),
    );
    advice.textContent = jamAdvice(tally) ?? '';
  };

  const schedule = () => {
    const ahead = performance.now() + 250;
    while (bars.length && bars[bars.length - 1].at + 4 * bars[bars.length - 1].beatMs < ahead) {
      const last = bars[bars.length - 1];
      const at = last.at + 4 * last.beatMs;
      const beatMs = 60000 / (Number(tempo.value) || 92);
      const p = plan;
      const n = last.n + 1;
      const chord = n % p.chords.length;
      bars.push({ n, at, beatMs, chord, plan: p });
      if (bars.length > 64) bars = bars.slice(-32);
      playBar(p, chord, at, beatMs);
    }
  };

  const playBar = (p: JamPlan, chord: number, at: number, beatMs: number) => {
    const c = p.chords[chord];
    const next = p.chords[(chord + 1) % p.chords.length];
    for (const e of barEvents(grooveSel.value as GrooveId, c, next)) {
      const t = at + e.beat * beatMs;
      if (e.part === 'bass' || e.part === 'chord') for (const n of e.notes!) piano(n, t, e.beats! * beatMs, e.level);
      else drum(e.part, t, e.level);
    }
  };

  const songBeatsAt = (time: number) => {
    const t = time - latency();
    for (let i = bars.length - 1; i >= 0; i--) {
      const b = bars[i];
      if (t >= b.at - b.beatMs / 2 || i === 0) return { beats: b.n * 4 + (t - b.at) / b.beatMs, bar: b };
    }
    return undefined;
  };

  const tick = () => {
    frame = requestAnimationFrame(tick);
    const t = performance.now() - latency();
    let i = bars.length - 1;
    while (i >= 0 && bars[i].at > t) i--;
    if (i < 0) return;
    const b = bars[i];
    // The keys move on to the next chord an eighth before it, so a player can see it coming.
    const nextBar = bars[i + 1];
    const show = nextBar && t >= nextBar.at - b.beatMs / 2 ? nextBar : b;
    if (show.n !== litBar) {
      litBar = show.n;
      light(show.plan, show.chord);
      drawChart(show.plan, show.chord);
      const c = show.plan.chords[show.chord];
      const n = show.plan.chords[(show.chord + 1) % show.plan.chords.length];
      now.replaceChildren('Now ', h('strong', {}, chordWords(c.name)), ` (${c.numeral}) · next ${chordWords(n.name)}`);
    }
  };

  const offNote = midi.onNote((e) => {
    if (e.type !== 'on') { kb.set(e.note, 'pressed', false); kb.set(e.note, 'hit', false); kb.set(e.note, 'wrong', false); return; }
    kb.set(e.note, 'pressed', true);
    if (!bars.length) return;
    const pos = songBeatsAt(e.time);
    if (!pos || pos.beats < 0) return;
    const p = pos.bar.plan;
    const chord = p.chords[chordAt(pos.beats, p.chords.length)];
    const fit = fitOf(p, chord, toWritten(cal, e.note));
    tallyNote(tally, fit, pos.beats);
    kb.set(e.note, fit === 'outside' ? 'wrong' : 'hit', true);
    showTally();
  });

  const start = () => {
    stop();
    audio();
    plan = jamPlan(backing(), keySel.value);
    tally = emptyTally();
    showTally();
    const beatMs = 60000 / (Number(tempo.value) || 92);
    // One bar of count-in clicks, then the band.
    const t0 = performance.now() + 400 + 4 * beatMs;
    for (let b = 0; b < 4; b++) click(t0 - (4 - b) * beatMs, b === 0);
    bars = [{ n: 0, at: t0, beatMs, chord: 0, plan }];
    playBar(plan, 0, t0, beatMs);
    timer = window.setInterval(schedule, 50);
    frame = requestAnimationFrame(tick);
    startBtn.disabled = true;
    stopBtn.disabled = false;
    now.textContent = 'Count-in: 1 2 3 4';
    hooks.onStart?.({ t0, beatMs, plan });
  };

  function stop() {
    if (timer !== undefined) clearInterval(timer);
    if (frame !== undefined) cancelAnimationFrame(frame);
    timer = frame = undefined;
    if (bars.length) stopAll();
    bars = [];
    litBar = -2;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    light(plan, 0);
    drawChart();
  }

  const changed = () => {
    opts.backing = backingSel.value;
    opts.key = keySel.value;
    opts.groove = grooveSel.value as GrooveId;
    opts.tempo = Number(tempo.value) || opts.tempo;
    const next = jamPlan(backing(), keySel.value);
    loadPiano([...next.chords.flatMap(comp), ...next.chords.map(bassRoot)]);
    plan = next;
    if (!bars.length) { light(plan, 0); drawChart(); }
  };
  backingSel.onchange = () => {
    fillKeys();
    grooveSel.value = backing().groove;
    changed();
  };
  keySel.onchange = grooveSel.onchange = tempo.onchange = changed;
  startBtn.onclick = start;
  stopBtn.onclick = stop;
  changed();
  showTally();

  box.append(h('section', { class: 'card jam' },
    roomEyebrow('jam'),
    h('h2', {}, 'Jam room'),
    h('p', {}, 'A band plays the chords; you make up the tune. Bright keys are the chord playing now, soft keys the rest of the scale that fits. Any of them sounds right, so start with one finger and a simple rhythm, and land on a bright key when the chord changes.'),
    h('div', { class: 'controls' },
      h('label', {}, 'Chords ', backingSel), h('label', {}, 'Key ', keySel),
      h('label', {}, 'Groove ', grooveSel), h('label', {}, 'Tempo ', tempo)),
    h('div', { class: 'controls' }, startBtn, stopBtn),
    chart,
    now,
    h('div', { class: 'stage' }, kb.el),
    tallyEl,
    advice,
    h('p', { class: 'small' }, 'Nothing here is saved. Found something you like? Play it into the ', h('a', { href: '#/sketchbook' }, 'Sketchbook'), ' to keep it.'),
  ));

  return () => { stop(); offNote(); };
}

export const jamView: View = (root) => {
  const cal = needCalibration(root);
  if (!cal) return;
  return mountJam(root, cal);
};

