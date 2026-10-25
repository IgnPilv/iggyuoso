import { keyWindow, toDevice, toWritten } from '../calibration';
import { demo } from '../demo/demo';
import { NoteRush, multiplier, rushPool, type RushClef, type RushLevel, type RushSummary } from '../engine/noteRush';
import { midi } from '../midi/input';
import { LETTERS, pitchClass, type Pitch } from '../music/notes';
import { deviceData, PREFIX } from '../../../core/storage';
import { h, type View } from '../../../core/dom';
import { KeyboardView } from './keyboard';
import { showHeld } from './players';
import { renderStaff, type StaffNote } from './staff';
import { needCalibration } from './views';

// Note Rush (#/noterush), a one-minute note-reading game (engine/noteRush.ts). Best scores per
// clef and level are kept as `game.noterush` (synced like other progress); the demo never saves.

const CLEFS: [RushClef, string][] = [['treble', 'Treble clef'], ['bass', 'Bass clef'], ['grand', 'Both clefs']];
const LEVELS: [RushLevel, string][] = [['position', 'C position'], ['staff', 'The whole staff'], ['ledger', 'With ledger lines']];
const RECORD = `${PREFIX}game.noterush`;
/** The demo plays a short round. */
const DEMO_ROUND_MS = 16_000;

type Bests = Record<string, number>;
const readBests = (): Bests => { try { return JSON.parse(deviceData.get(RECORD) ?? '{}') ?? {}; } catch { return {}; } };

const WHITE_PC = [0, 2, 4, 5, 7, 9, 11];
const pitchOf = (m: number): Pitch => ({ letter: LETTERS[WHITE_PC.indexOf(pitchClass(m))], accidental: 0, octave: Math.floor(m / 12) - 1 });

/** The note to play and the three after it, on one clef or the grand staff (middle C and up on the treble). */
function rushStaff(queue: number[], clef: RushClef) {
  const note = (m: number, i: number, on: boolean): StaffNote => ({ pitches: [pitchOf(m)], key: String(i), spacer: !on });
  const parts = clef === 'grand'
    ? (['treble', 'bass'] as const).map((c) => ({ clef: c, notes: queue.map((m, i) => note(m, i, (m >= 60) === (c === 'treble'))) }))
    : [{ clef, notes: queue.map((m, i) => note(m, i, true)) }];
  const st = renderStaff(parts);
  st.mark('0', 'current');
  st.svg.classList.add('rush-staff');
  return st.svg;
}

export const noteRushView: View = (root) => {
  const cal = needCalibration(root);
  if (!cal) return;
  const clefSel = h('select', { 'aria-label': 'clef' }, ...CLEFS.map(([v, l]) => h('option', { value: v }, l)));
  const levelSel = h('select', { 'aria-label': 'level' }, ...LEVELS.map(([v, l]) => h('option', { value: v }, l)));
  const startBtn = h('button', {}, 'Start');
  const best = h('span', { class: 'small' });
  const score = h('span', { class: 'live-score' }, '0');
  const streak = h('span', { class: 'rush-streak' });
  const clock = h('span', { class: 'rush-clock' }, '60');
  const fill = h('div', { class: 'rush-fill' });
  const staffBox = h('div', { class: 'staff-wrap rush-staff-wrap' });
  const kbBox = h('div', { class: 'rush-keys' });
  const result = h('div', { class: 'rush-result', 'aria-live': 'polite' });
  const key = () => `${clefSel.value}-${levelSel.value}`;
  const showBest = () => { const b = (demo.active ? {} : readBests())[key()]; best.textContent = b ? `Best: ${b}` : 'No best yet'; };

  let game: NoteRush | undefined;
  let kb: KeyboardView | undefined;
  let offHeld: (() => void) | undefined;
  let frame = 0;
  let asked = 0;

  const setKeyboard = () => {
    offHeld?.();
    const pool = rushPool(clefSel.value as RushClef, levelSel.value as RushLevel).map((m) => toDevice(cal, m));
    const [lo, hi] = keyWindow(cal, pool);
    kb = new KeyboardView(lo, hi, { middleC: cal.middleC, cal });
    offHeld = showHeld(kb);
    kbBox.replaceChildren(kb.el);
  };

  const draw = () => {
    if (!game) return;
    staffBox.replaceChildren(rushStaff(game.queue, clefSel.value as RushClef));
    score.textContent = String(game.score);
    const m = multiplier(game.streak);
    streak.textContent = game.streak ? `${game.streak} in a row${m > 1 ? ` · ×${m}` : ''}` : '';
  };

  const ask = () => {
    if (!game || !demo.active) return;
    demo.onAsk?.({ index: asked++, keys: [toDevice(cal, game.current)], waitMs: 0 });
  };

  const finish = () => {
    if (!game) return;
    cancelAnimationFrame(frame);
    const s = game.summary();
    const k = key();
    const bests = demo.active ? {} : readBests();
    const isBest = s.score > 0 && s.score > (bests[k] ?? 0);
    if (isBest && !demo.active) deviceData.set(RECORD, JSON.stringify({ ...bests, [k]: s.score }));
    result.replaceChildren(resultCard(s, isBest));
    game = undefined;
    startBtn.disabled = clefSel.disabled = levelSel.disabled = false;
    startBtn.textContent = 'Play again';
    fill.style.width = '0%';
    clock.textContent = '0';
    showBest();
  };

  const loop = () => {
    if (!game) return;
    const now = performance.now();
    const t = game.tick(now);
    if (t === 'over') return finish();
    if (t === 'timeout') { draw(); ask(); }
    clock.textContent = String(Math.ceil(game.roundLeft(now) / 1000));
    fill.style.width = `${(100 * game.noteLeft(now)) / 6000}%`;
    frame = requestAnimationFrame(loop);
  };

  startBtn.onclick = () => {
    game = new NoteRush(rushPool(clefSel.value as RushClef, levelSel.value as RushLevel), Math.random, demo.active ? DEMO_ROUND_MS : undefined);
    game.start(performance.now());
    asked = 0;
    result.replaceChildren();
    startBtn.disabled = clefSel.disabled = levelSel.disabled = true;
    draw();
    ask();
    frame = requestAnimationFrame(loop);
  };

  const offNote = midi.onNote((e) => {
    if (!game || e.type !== 'on') return;
    const r = game.press(toWritten(cal, e.note), performance.now());
    if (r === 'hit') { kb?.flash(e.note, 'hit', 300); draw(); ask(); }
    if (r === 'wrong') { kb?.flash(e.note, 'wrong', 350); staffBox.classList.remove('shake'); void staffBox.offsetWidth; staffBox.classList.add('shake'); draw(); }
  });

  const onSetting = () => { setKeyboard(); showBest(); if (!game) staffBox.replaceChildren(rushStaff(rushPool(clefSel.value as RushClef, levelSel.value as RushLevel).slice(0, 4), clefSel.value as RushClef)); };
  clefSel.onchange = levelSel.onchange = onSetting;

  root.append(h('section', { class: 'card rush' },
    h('span', { class: 'eyebrow' }, 'Mini game'),
    h('h1', {}, 'Note Rush'),
    h('p', {}, 'A note shows on the staff: play it. The faster you find each one, the more you get in a minute. Every note in a row adds to your streak, and every five in a row adds to the points per note, but each note gets a little less time. A wrong key ends the streak.'),
    h('div', { class: 'controls' }, clefSel, levelSel, startBtn, best),
    h('div', { class: 'hud rush-hud' }, score, streak, h('span', { class: 'rush-time small' }, clock, ' s')),
    h('div', { class: 'rush-bar', 'aria-hidden': 'true' }, fill),
    staffBox,
    result,
    kbBox));
  onSetting();
  return () => { cancelAnimationFrame(frame); offNote(); offHeld?.(); game = undefined; };
};

function resultCard(s: RushSummary, isBest: boolean): HTMLElement {
  const sec = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
  return h('div', { class: 'card result rush-card' },
    h('h2', {}, isBest ? `New best: ${s.score}` : `Score: ${s.score}`),
    h('p', {}, `${s.hits} notes found, ${s.accuracy}% right`, s.medianMs ? `, ${sec(s.medianMs)} for a middle note` : '', `. Longest streak: ${s.bestStreak}.`),
    s.wrong || s.timeouts ? h('p', { class: 'small' }, `${s.wrong} wrong ${s.wrong === 1 ? 'key' : 'keys'}, ${s.timeouts} ran out of time.`) : '',
    s.slowest.length ? h('p', { class: 'small' }, 'Took longest: ', s.slowest.map((x) => `${x.name} (${sec(x.ms)})`).join(', '), '. Worth a look before the next round.') : '');
}
