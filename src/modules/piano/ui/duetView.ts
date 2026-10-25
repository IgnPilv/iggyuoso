import { audio, loadPiano, piano, stopAll } from '../audio/audio';
import { keyWindow, toDevice, toWritten, type Calibration } from '../calibration';
import { demo } from '../demo/demo';
import { Duet, DUET_STYLES, DUET_TUNES, duetSetup, place, type DuetNote, type DuetReport, type DuetStyle, type DuetTune } from '../engine/duet';
import { midi } from '../midi/input';
import { parseMeter } from '../music/notes';
import { stars } from '../scoring/stars';
import { h, type View } from '../../../core/dom';
import { animate } from './animate';
import { KeyboardView } from './keyboard';
import { theoryStaff } from './theory';
import { midiBanner, needCalibration } from './views';
import { roomEyebrow } from './practiceRoom';

// Duet (#/duet): the player plays a tune's melody, the app plays the left hand under it and follows
// them: it starts when they start, keeps to their tempo and waits at each melody note until it is
// played. The next note is lit (it can be switched off). At the end: where they held back or
// hurried, where the band had to wait, the tempo, and tips. Nothing is saved.

const DEFAULTS = { tune: 'ode-to-joy', style: 'oompah' as DuetStyle, light: true };
const kept = { ...DEFAULTS };
/** Band notes are handed to the sound this far ahead of time. */
const LOOKAHEAD = 120;

export interface DuetHooks {
  /** Called when a duet is ready to start (the demo plays along). */
  onReady?: (d: Duet) => void;
  onReport?: (r: DuetReport) => void;
}

export const duetView: View = (root) => {
  const cal = needCalibration(root);
  if (!cal) return;
  return mountDuet(root, cal);
};

export function mountDuet(root: HTMLElement, cal: Calibration, hooks: DuetHooks = {}) {
  // The demo works on its own copy, so it never changes what the player picked.
  const opts = demo.active ? { ...DEFAULTS } : kept;
  const tuneSel = h('select', { 'aria-label': 'tune' }, ...DUET_TUNES.map((t) => h('option', { value: t.tune.id, selected: t.tune.id === opts.tune }, t.tune.title)));
  const styleSel = h('select', { 'aria-label': 'accompaniment' }, ...DUET_STYLES.map(([v, l]) => h('option', { value: v, selected: v === opts.style }, l)));
  const light = h('input', { type: 'checkbox', checked: opts.light, 'aria-label': 'light the next note' });
  const hearBtn = h('button', { class: 'secondary' }, 'Hear it');
  const againBtn = h('button', { class: 'secondary' }, 'Start over');
  const say = h('p', { class: 'ear-say', 'aria-live': 'polite' });
  const live = h('p', { class: 'small duet-live' });
  const dots = h('div', { class: 'ear-dots', 'aria-hidden': 'true' });
  const stage = h('div', { class: 'stage' });
  const staffBox = h('div', { class: 'ear-staff' });
  const result = h('div', { class: 'gym-result', 'aria-live': 'polite' });

  let tune: DuetTune;
  let duet: Duet;
  let kb: KeyboardView;
  let reported = false;
  let stopListen: (() => void) | undefined;
  const dev = (m: number) => toDevice(cal, m);

  function setUp(notify = true) {
    stopListen?.();
    stopAll();
    opts.tune = tuneSel.value;
    opts.style = styleSel.value as DuetStyle;
    opts.light = light.checked;
    tune = DUET_TUNES.find((t) => t.tune.id === opts.tune) ?? DUET_TUNES[0];
    const setup = duetSetup(tune, opts.style);
    duet = new Duet(setup, tune.tune.tempo);
    reported = false;
    const keys = [...setup.notes.map((n) => n.midi), 36, 59].map(dev);
    const [low, high] = keyWindow(cal, keys, 3);
    kb = new KeyboardView(low, high, { middleC: cal.middleC, cal, labels: 'c' });
    stage.replaceChildren(kb.el);
    staffBox.replaceChildren(theoryStaff({ notes: setup.tokens, clef: 'treble', labels: 'names', meter: parseMeter('4/4') }, 1));
    result.replaceChildren();
    say.textContent = `Play the tune; the band follows you. Start on ${setup.notes[0].pitch.letter} whenever you are ready, at the pace you like.`;
    live.textContent = '';
    audio();
    void loadPiano();
    draw();
    if (notify) hooks.onReady?.(duet);
  }

  /** The dots (one per melody note) and the lit next key. */
  function draw(marks?: DuetReport) {
    kb.clear('target');
    if (opts.light && !duet.done) kb.set(dev(duet.notes[duet.index].midi), 'target', true);
    dots.replaceChildren(...duet.notes.map((_, i) => {
      const m = marks?.notes[i]?.mark;
      const cls = m === 'wait' ? ' shown' : m ? ' later' : i < duet.index ? ' found' : i === duet.index ? ' now' : '';
      return h('span', { class: `ear-dot${cls}`, title: m === 'wait' ? 'The band waited' : m === 'held' ? 'Held back' : m === 'hurried' ? 'Hurried' : '' });
    }));
  }

  /** The band's notes up to the lookahead, sounded and shown faintly on the keys. */
  const stopAnim = animate((now) => {
    for (const snd of duet.due(now + LOOKAHEAD)) {
      for (const m of snd.event.midi) {
        piano(m, Math.max(snd.time, now), snd.durMs * 0.95, 0.42);
        const k = dev(m);
        window.setTimeout(() => kb.flash(k, 'option', Math.max(150, snd.durMs * 0.8)), Math.max(0, snd.time - now));
      }
    }
    if (duet.started && !duet.done) {
      live.textContent = duet.waiting(now) ? 'The band is waiting for you…' : `Your tempo: about ${duet.bpm} a minute`;
    }
    const end = duet.endTime();
    if (end !== undefined && !reported && now > end) finish();
  });

  function finish() {
    reported = true;
    const r = duet.report();
    live.textContent = '';
    if (!r) return;
    draw(r);
    const st = stars(r.score);
    const tempoWords = r.tempo.change === 'steady' ? `about ${r.tempo.start} a minute, and kept it` : `from ${r.tempo.start} to ${r.tempo.end} a minute (${r.tempo.change === 'faster' ? 'speeding up' : 'slowing down'})`;
    const list = (label: string, xs: DuetNote[]) => xs.length
      ? h('p', { class: 'small' }, `${label}: ${xs.map((x) => `${place(x)} (${Math.abs(Math.round((x.dev ?? 0) * 100))}% of a beat)`).join('; ')}.`) : '';
    say.textContent = `${tune.tune.title}, together.`;
    const next = h('button', {}, 'Play it again');
    next.onclick = () => setUp();
    result.replaceChildren(
      h('p', { class: 'gym-score' }, h('strong', {}, String(r.score)), st ? ` ${'★'.repeat(st)}` : '',
        h('span', { class: 'small' }, ' how evenly you kept your own beat')),
      h('p', { class: 'gym-tempo' }, `Tempo: ${tempoWords}.`),
      list('Held back the most', r.held),
      list('Hurried the most', r.hurried),
      r.waits.length ? h('p', { class: 'small' }, `The band waited at ${r.waits.map(place).join(', ')}.`) : '',
      ...r.tips.map((t) => h('p', { class: 'gym-tip' }, t)),
      h('div', { class: 'controls' }, next),
    );
    hooks.onReport?.(r);
  }

  /** The tune with its band at the tune's own tempo, to know how it goes. */
  function hear() {
    setUp(false);
    const beatMs = 60000 / tune.tune.tempo;
    const t0 = performance.now() + 300;
    const timers: number[] = [];
    for (const n of duet.notes) {
      piano(n.midi, t0 + n.at * beatMs, n.beats * beatMs * 0.92);
      timers.push(window.setTimeout(() => kb.flash(dev(n.midi), 'hit', n.beats * beatMs * 0.8), t0 + n.at * beatMs - performance.now()));
    }
    for (const e of duet.setup.events) for (const m of e.midi) piano(m, t0 + e.beat * beatMs, e.beats * beatMs * 0.95, 0.42);
    stopListen = () => { timers.forEach(clearTimeout); stopAll(); stopListen = undefined; };
  }

  const offNotes = midi.onNote((e) => {
    if (e.type !== 'on') { kb.set(e.note, 'pressed', false); return; }
    kb.set(e.note, 'pressed', true);
    if (!duet.started) stopListen?.();
    const r = duet.press(toWritten(cal, e.note), e.time);
    if (r.kind === 'right') {
      kb.flash(e.note, 'hit');
      if (r.index === 0) { say.textContent = 'Keep going: the band waits for each note.'; result.replaceChildren(); }
      draw();
    } else if (r.kind === 'wrong') {
      kb.flash(e.note, 'wrong');
    }
  });

  hearBtn.onclick = hear;
  againBtn.onclick = () => setUp();
  for (const el of [tuneSel, styleSel]) el.onchange = () => setUp();
  light.onchange = () => { opts.light = light.checked; draw(); };

  const banner = h('div');
  const showBanner = () => banner.replaceChildren(midiBanner() ?? '');
  showBanner();
  const offPorts = midi.onPorts(showBanner);

  root.append(banner, h('section', { class: 'card ear duet' },
    roomEyebrow('duet'),
    h('h2', {}, 'Duet'),
    h('p', {}, 'You play the tune, the app plays the left hand, and it follows you: it starts when you start, keeps to your tempo, and waits at every note until you play it. Then it shows where you held back or hurried against your own beat.'),
    h('div', { class: 'controls' }, tuneSel, styleSel, h('label', {}, light, ' Light the next note')),
    h('div', { class: 'controls' }, hearBtn, againBtn),
    say, live, dots, stage, staffBox, result,
    h('p', { class: 'small' }, 'Nothing here is saved. The right note an octave away counts too. Every tune is public domain.'),
  ));
  setUp();

  return () => { stopAnim(); stopListen?.(); offNotes(); offPorts(); stopAll(); };
}
