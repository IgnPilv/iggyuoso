import { audio, loadPiano, piano } from '../audio/audio';
import { keyWindow, toDevice, toWritten, type Calibration } from '../calibration';
import { demo } from '../demo/demo';
import { EAR_KEYS, EAR_TUNES, EarHunt, earNotes, nextTune, tuneTokens, type EarLevel, type EarSize, type EarTune } from '../engine/byEar';
import { midi } from '../midi/input';
import { midiName, type NoteToken, type Pitch } from '../music/notes';
import { stars } from '../scoring/stars';
import { h, type View } from '../../../core/dom';
import { KeyboardView } from './keyboard';
import { theoryStaff } from './theory';
import { midiBanner, needCalibration } from './views';
import { roomEyebrow } from './practiceRoom';

// Play by ear (#/byear): the app plays the opening of a well-known tune and lights its first note;
// the player finds the rest on the keys. Wrong keys get a hint (higher or lower, then how far from
// the last note found), "Show me" lights the next key, and each note found is written on the staff.
// Nothing is saved; settings, tunes played and best scores last until the page reloads.

const LEVELS: [EarLevel, string][] = [['easy', 'Easy: steps near middle C'], ['medium', 'Medium: skips and longer lines'], ['hard', 'Hard: leaps, wider range']];
const SIZE_WORD: Record<EarSize, string> = { same: 'the same note again', step: 'a step', skip: 'a skip', leap: 'a leap' };
const DEFAULTS = { level: 'easy' as EarLevel, key: 'C', mystery: false };
const kept = { ...DEFAULTS };
const recent: string[] = [];
const best = new Map<string, number>();

const spell = (p: Pitch) => `${p.letter}${p.accidental === 1 ? '♯' : p.accidental === -1 ? '♭' : ''}${p.octave}`;

export interface ByEarHooks {
  /** Start on this tune (the demo). */
  tune?: string;
  /** Called with each new tune (the demo plays along). */
  onTune?: (hunt: EarHunt) => void;
}

export const byEarView: View = (root) => {
  const cal = needCalibration(root);
  if (!cal) return;
  return mountByEar(root, cal);
};

export function mountByEar(root: HTMLElement, cal: Calibration, hooks: ByEarHooks = {}) {
  // The demo works on its own copy, so it never changes what the player picked.
  const opts = demo.active ? { ...DEFAULTS } : kept;
  const levelSel = h('select', { 'aria-label': 'level' }, ...LEVELS.map(([v, l]) => h('option', { value: v, selected: v === opts.level }, l)));
  const keySel = h('select', { 'aria-label': 'key' },
    h('option', { value: 'C', selected: opts.key === 'C' }, 'Start near middle C'),
    h('option', { value: 'any', selected: opts.key === 'any' }, 'Start on any key'));
  const mystery = h('input', { type: 'checkbox', checked: opts.mystery, 'aria-label': 'mystery tune' });
  const hearAll = h('button', { class: 'secondary' }, 'Hear it all');
  const hearNext = h('button', { class: 'secondary' }, 'Hear the next notes');
  const showBtn = h('button', { class: 'secondary' }, 'Show me');
  const newBtn = h('button', { class: 'secondary' }, 'New tune');
  const title = h('h3', { class: 'ear-title' });
  const dots = h('div', { class: 'ear-dots', 'aria-hidden': 'true' });
  const say = h('p', { class: 'ear-say', 'aria-live': 'polite' });
  const stage = h('div', { class: 'stage' });
  const staffBox = h('div', { class: 'ear-staff' });
  const result = h('div', { class: 'ear-result', 'aria-live': 'polite' });

  let tune: EarTune;
  let key = 'C';
  let tokens: NoteToken[] = [];
  let hunt: EarHunt;
  let kb: KeyboardView;
  let stopSound: (() => void) | undefined;

  const dev = (m: number) => toDevice(cal, m);

  /** Play notes [from, to) of the tune with its rhythm; the keys stay dark unless `light`. */
  function play(from: number, to: number, light = false) {
    stopSound?.();
    audio();
    void loadPiano();
    const notes = hunt.notes.slice(from, to);
    if (!notes.length) return;
    const beatMs = 60000 / tune.tempo;
    const t0 = performance.now() + 250 - notes[0].at * beatMs;
    const timers: number[] = [];
    for (const n of notes) {
      piano(n.midi, t0 + n.at * beatMs, n.beats * beatMs * 0.92);
      if (light) {
        timers.push(window.setTimeout(() => kb.set(dev(n.midi), 'target', true), t0 + n.at * beatMs - performance.now()));
        timers.push(window.setTimeout(() => kb.set(dev(n.midi), 'target', false), t0 + (n.at + n.beats * 0.9) * beatMs - performance.now()));
      }
    }
    stopSound = () => { timers.forEach(clearTimeout); kb.clear('target'); stopSound = undefined; };
  }

  function newTune(id?: string, sameKey = false) {
    stopSound?.();
    opts.level = levelSel.value as EarLevel;
    opts.key = keySel.value;
    opts.mystery = mystery.checked;
    tune = (id && EAR_TUNES.find((t) => t.id === id)) || nextTune(opts.level, recent);
    recent.push(tune.id);
    if (recent.length > 4) recent.shift();
    if (!sameKey) {
      const keys = opts.key === 'any' ? Object.keys(EAR_KEYS).filter((k) => k !== key || tune.id !== recent[recent.length - 2]) : ['C'];
      key = keys[Math.floor(Math.random() * keys.length)];
    }
    tokens = tuneTokens(tune, key) ?? tuneTokens(tune)!;
    hunt = new EarHunt(earNotes(tokens));
    const keys = hunt.notes.map((n) => dev(n.midi));
    const [low, high] = keyWindow(cal, keys, 3);
    kb = new KeyboardView(low, high, { middleC: cal.middleC, cal, labels: 'c' });
    stage.replaceChildren(kb.el);
    result.replaceChildren();
    for (const b of [hearNext, showBtn]) b.disabled = false;
    title.textContent = opts.mystery ? 'Find the mystery tune' : `Find: ${tune.title}`;
    say.textContent = `It starts on ${spell(hunt.notes[0].pitch)} (lit). Listen, then play it from there.`;
    draw();
    hooks.onTune?.(hunt);
  }

  /** Keys, dots and staff for what has been found so far. */
  function draw() {
    kb.clear('option');
    kb.clearLabels();
    const last = hunt.last;
    kb.set(dev(last.midi), 'option', true, spell(last.pitch).replace(/\d+$/, ''));
    dots.replaceChildren(...hunt.notes.map((_, i) => h('span', {
      class: `ear-dot${i < hunt.index ? (hunt.shown.has(i) ? ' shown' : hunt.tries[i] ? ' later' : ' found') : i === hunt.index ? ' now' : ''}`,
    })));
    // Only the notes found so far, by name; rests between them are left out.
    let n = 0;
    const found = tokens.filter((t) => t.pitches.length && n++ < hunt.index);
    staffBox.replaceChildren(theoryStaff({ notes: found, clef: 'treble', labels: 'names' }, 1));
  }

  function finish() {
    for (const b of [hearNext, showBtn]) b.disabled = true;
    kb.clear('option');
    kb.clearLabels();
    const score = hunt.score();
    const st = stars(score);
    const sum = hunt.summary();
    const id = `${tune.id} ${key}`;
    const prev = best.get(id);
    if (prev === undefined || score > prev) best.set(id, score);
    title.textContent = tune.title;
    say.textContent = 'Found it! Here it is again.';
    staffBox.replaceChildren(theoryStaff({ notes: tokens, clef: 'treble', labels: 'names' }, 1));
    const again = h('button', { class: 'secondary' }, 'Play it back');
    again.onclick = () => play(0, hunt.notes.length, true);
    const otherKey = h('button', { class: 'secondary' }, 'Same tune, another key');
    otherKey.onclick = () => {
      const keys = Object.keys(EAR_KEYS).filter((k) => k !== key);
      key = keys[Math.floor(Math.random() * keys.length)];
      recent.pop();
      newTune(tune.id, true);
    };
    const next = h('button', {}, 'Next tune');
    next.onclick = () => newTune();
    result.replaceChildren(
      h('p', { class: 'gym-score' }, h('strong', {}, String(score)), st ? ` ${'★'.repeat(st)}` : '',
        h('span', { class: 'small' }, prev !== undefined ? (score > prev ? ` New best (was ${prev})` : ` Best ${prev}`) : '')),
      h('p', {}, `${tune.title}${key !== 'C' ? `, in ${EAR_KEYS[key].name}` : ''}: ${tune.origin}.`),
      h('p', { class: 'small' }, [
        `${sum.first} of ${hunt.notes.length - 1} notes found on the first try`,
        sum.later ? `${sum.later} after a hint` : '',
        sum.shown ? `${sum.shown} shown` : '',
      ].filter(Boolean).join(', ') + '.'),
      h('div', { class: 'controls' }, next, otherKey, again),
    );
    play(0, hunt.notes.length, true);
  }

  function onPress(written: number, device: number) {
    const r = hunt.press(written);
    if (r.kind === 'right') {
      kb.flash(device, 'hit');
      say.textContent = r.done ? '' : hunt.tries[r.index] ? 'That\'s it.' : 'Yes!';
      draw();
      if (r.done) finish();
    } else if (r.kind === 'octave') {
      kb.flash(device, 'option', 500);
      say.textContent = `Right note, wrong octave: the tune is an octave ${r.higher ? 'higher' : 'lower'} here.`;
    } else if (r.kind === 'wrong') {
      kb.flash(device, 'wrong');
      const dir = r.higher ? 'higher' : 'lower';
      const way = hunt.target!.midi > hunt.last.midi ? 'up' : 'down';
      say.textContent = `Not ${midiName(written).replace('#', '♯')}: the note is ${dir} than that.`
        + (r.size && r.size !== 'same' ? ` From ${spell(hunt.last.pitch)} the tune moves ${SIZE_WORD[r.size]} ${way}.` : '');
      if (r.tries >= 3) say.textContent += ' Stuck? Hear the next notes, or Show me.';
    }
  }

  hearAll.onclick = () => play(0, hunt.notes.length, hunt.done);
  hearNext.onclick = () => play(Math.max(0, hunt.index - 1), hunt.index + 2);
  showBtn.onclick = () => {
    const n = hunt.show();
    if (!n) return;
    kb.flash(dev(n.midi), 'target', 900);
    play(hunt.index - 1, hunt.index);
    say.textContent = `It was ${spell(n.pitch)}.`;
    draw();
    if (hunt.done) finish();
  };
  newBtn.onclick = () => newTune();
  for (const el of [levelSel, keySel]) el.onchange = () => newTune();
  mystery.onchange = () => {
    opts.mystery = mystery.checked;
    if (!hunt.done) title.textContent = opts.mystery ? 'Find the mystery tune' : `Find: ${tune.title}`;
  };

  const offNotes = midi.onNote((e) => {
    if (e.type !== 'on') { kb.set(e.note, 'pressed', false); return; }
    kb.set(e.note, 'pressed', true);
    onPress(toWritten(cal, e.note), e.note);
  });

  const banner = h('div');
  const showBanner = () => banner.replaceChildren(midiBanner() ?? '');
  showBanner();
  const offPorts = midi.onPorts(showBanner);

  root.append(banner, h('section', { class: 'card ear' },
    roomEyebrow('byear'),
    h('h2', {}, 'Play by ear'),
    h('p', {}, 'Hear the start of a tune you know, then find it on the keys, one note at a time. The first note is lit. A wrong key tells you whether to go higher or lower; play from the start again whenever you like, it is never counted as a guess.'),
    h('div', { class: 'controls' }, levelSel, keySel, h('label', {}, mystery, ' Mystery tune (name hidden)')),
    title, dots,
    h('div', { class: 'controls' }, hearAll, hearNext, showBtn, newBtn),
    say, stage, staffBox, result,
    h('p', { class: 'small' }, 'Nothing here is saved. Only the notes count, not the rhythm. Every tune is public domain.'),
  ));
  newTune(hooks.tune);

  return () => { stopSound?.(); offNotes(); offPorts(); };
}
