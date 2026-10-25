import { keyWindow, toDevice, toWritten } from '../calibration';
import { demo } from '../demo/demo';
import { NoteRush, multiplier, rushPool, type RushClef, type RushLevel, type RushMode, type RushSummary } from '../engine/noteRush';
import { midi } from '../midi/input';
import { LETTERS, pitchClass, type Pitch } from '../music/notes';
import { deviceData, patchSettings, PREFIX, readSettings } from '../../../core/storage';
import { h, s, type View } from '../../../core/dom';
import { KeyboardView } from './keyboard';
import { showHeld } from './players';
import { renderStaff, type StaffNote } from './staff';
import { needCalibration } from './views';

// Note Rush (#/noterush), a one-minute note-reading game (engine/noteRush.ts). Best scores per
// clef and level are kept as `game.noterush` (synced like other progress); the demo never saves.
// The way notes come (slide in or jump) is a device setting, `settings.noteRushMode`.

const CLEFS: [RushClef, string][] = [['treble', 'Treble clef'], ['bass', 'Bass clef'], ['grand', 'Both clefs']];
const MODES: [RushMode, string][] = [['scroll', 'Notes slide in'], ['jump', 'Notes jump in place']];
const LEVELS: [RushLevel, string][] = [['position', 'C position'], ['staff', 'The whole staff'], ['ledger', 'With ledger lines']];
const RECORD = `${PREFIX}game.noterush`;
/** The demo plays a short round. */
const DEMO_ROUND_MS = 16_000;

type Bests = Record<string, number>;
const readBests = (): Bests => { try { return JSON.parse(deviceData.get(RECORD) ?? '{}') ?? {}; } catch { return {}; } };

const WHITE_PC = [0, 2, 4, 5, 7, 9, 11];
const pitchOf = (m: number): Pitch => ({ letter: LETTERS[WHITE_PC.indexOf(pitchClass(m))], accidental: 0, octave: Math.floor(m / 12) - 1 });

const staffParts = (clef: RushClef, notes: (number | undefined)[]) => {
  const note = (m: number | undefined, i: number, staff: 'treble' | 'bass'): StaffNote =>
    m !== undefined && (clef !== 'grand' || (m >= 60) === (staff === 'treble'))
      ? { pitches: [pitchOf(m)], key: String(i) }
      : { pitches: [], key: String(i), spacer: true };
  return clef === 'grand'
    ? (['treble', 'bass'] as const).map((c) => ({ clef: c, notes: notes.map((m, i) => note(m, i, c)) }))
    : [{ clef, notes: notes.map((m, i) => note(m, i, clef)) }];
};

/** Jump: the note to play and the three after it, in place (middle C and up on the treble of a grand staff). */
function rushStaff(queue: number[], clef: RushClef) {
  const st = renderStaff(staffParts(clef, queue));
  st.mark('0', 'current');
  st.svg.classList.add('rush-staff');
  return st.svg;
}

// Scroll: an empty staff with a line at the first note's place; each note is drawn once and slides.
const SLOTS = 10;
const GAP_W = 88;
const FADE_TO = 4.9;

class ScrollStaff {
  readonly svg: SVGSVGElement;
  private layer = s('g', { class: 'rush-notes' });
  private els: SVGGElement[] = [];
  private lineX: number;

  constructor(private clef: RushClef) {
    const st = renderStaff(staffParts(clef, Array(SLOTS).fill(undefined)));
    this.svg = st.svg;
    this.svg.classList.add('rush-staff', 'rush-scroll');
    this.lineX = st.xOf(0);
    const [, , , height] = (this.svg.getAttribute('viewBox') ?? '0 0 0 0').split(' ').map(Number);
    this.svg.append(s('line', { x1: this.lineX, x2: this.lineX, y1: 14, y2: height - 14, class: 'rush-line' }), this.layer);
  }

  private noteEl(m: number): SVGGElement {
    const one = renderStaff(staffParts(this.clef, [m]));
    const g = [...one.svg.querySelectorAll<SVGGElement>('g.note')].find((x) => x.childElementCount)!;
    g.classList.add('rush-note');
    return g;
  }

  /** Draws the queue at its places; `gone` notes left the front since the last draw (played or missed). */
  draw(queue: number[], at: number[], gone: ('hit' | 'miss')[]) {
    for (const how of gone) {
      const el = this.els.shift();
      if (!el) continue;
      el.classList.remove('current');
      el.classList.add(how, 'leaving');
      window.setTimeout(() => el.remove(), 350);
    }
    while (this.els.length < queue.length) {
      const el = this.noteEl(queue[this.els.length]);
      this.els.push(el);
      this.layer.append(el);
    }
    this.els.forEach((el, i) => {
      el.setAttribute('transform', `translate(${Math.max(0, at[i]) * GAP_W} 0)`);
      // Notes fade in at the right edge of the staff.
      el.style.opacity = i === 0 ? '' : String(Math.max(0, Math.min(1, (FADE_TO - at[i]) / 0.6)));
      el.classList.toggle('current', i === 0);
    });
  }
}

export const noteRushView: View = (root) => {
  const cal = needCalibration(root);
  if (!cal) return;
  const clefSel = h('select', { 'aria-label': 'clef' }, ...CLEFS.map(([v, l]) => h('option', { value: v }, l)));
  const levelSel = h('select', { 'aria-label': 'level' }, ...LEVELS.map(([v, l]) => h('option', { value: v }, l)));
  const modeSel = h('select', { 'aria-label': 'how the notes come' }, ...MODES.map(([v, l]) => h('option', { value: v }, l)));
  modeSel.value = demo.active ? 'scroll' : (readSettings().noteRushMode === 'jump' ? 'jump' : 'scroll');
  const mode = () => modeSel.value as RushMode;
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
  let scroll: ScrollStaff | undefined;
  let seen = { hits: 0, timeouts: 0 };

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
    if (scroll) {
      const gone: ('hit' | 'miss')[] = [];
      // Hits and misses since the last draw, in order is near enough (one per frame at most).
      for (; seen.hits < game.hits; seen.hits++) gone.push('hit');
      for (; seen.timeouts < game.timeouts; seen.timeouts++) gone.push('miss');
      scroll.draw(game.queue, game.at, gone);
    } else staffBox.replaceChildren(rushStaff(game.queue, clefSel.value as RushClef));
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
    startBtn.disabled = clefSel.disabled = levelSel.disabled = modeSel.disabled = false;
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
    if (t === 'timeout') ask();
    if (t === 'timeout' || scroll) draw();
    clock.textContent = String(Math.ceil(game.roundLeft(now) / 1000));
    fill.style.width = `${(100 * game.noteLeft(now)) / 6000}%`;
    frame = requestAnimationFrame(loop);
  };

  startBtn.onclick = () => {
    game = new NoteRush(rushPool(clefSel.value as RushClef, levelSel.value as RushLevel), Math.random, demo.active ? DEMO_ROUND_MS : undefined, mode());
    game.start(performance.now());
    asked = 0;
    seen = { hits: 0, timeouts: 0 };
    scroll = mode() === 'scroll' ? new ScrollStaff(clefSel.value as RushClef) : undefined;
    if (scroll) staffBox.replaceChildren(scroll.svg);
    result.replaceChildren();
    startBtn.disabled = clefSel.disabled = levelSel.disabled = modeSel.disabled = true;
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

  const onSetting = () => {
    setKeyboard();
    showBest();
    if (game) return;
    const clef = clefSel.value as RushClef;
    const sample = rushPool(clef, levelSel.value as RushLevel).slice(0, 4);
    if (mode() === 'jump') return staffBox.replaceChildren(rushStaff(sample, clef));
    const sc = new ScrollStaff(clef);
    sc.draw(sample, [1, 2, 3, 4], []);
    staffBox.replaceChildren(sc.svg);
  };
  clefSel.onchange = levelSel.onchange = onSetting;
  modeSel.onchange = () => { if (!demo.active) patchSettings({ noteRushMode: mode() }); onSetting(); };

  root.append(h('section', { class: 'card rush' },
    h('span', { class: 'eyebrow' }, 'Mini game'),
    h('h1', {}, 'Note Rush'),
    h('p', {}, 'Notes slide along the staff to the line: play each one before it gets there (or have them jump in place, each with its own time bar). The faster you find them, the more you get in a minute. Every note in a row adds to your streak, and every five in a row adds to the points per note, but each note gets a little less time. A wrong key ends the streak.'),
    h('div', { class: 'controls' }, clefSel, levelSel, modeSel, startBtn, best),
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
