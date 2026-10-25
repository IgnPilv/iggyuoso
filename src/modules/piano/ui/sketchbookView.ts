import { toDevice, type Calibration } from '../calibration';
import { demo } from '../demo/demo';
import type { Recorder } from '../engine/recorder';
import { parseMeter } from '../music/notes';
import { demoProgress } from '../progress';
import { deleteSketch, getSketch, saveSketch, sketches, sketchExercise, updateSketch, type Sketch } from '../progress/sketches';
import { store, type Store } from '../progress/store';
import { h, type View } from '../../../core/dom';
import { KeyboardView } from './keyboard';
import { mountExercise, showHeld, staffParts } from './players';
import { playBack, recordButton, startTake } from './recordPanel';
import { renderStaff } from './staff';
import { needCalibration } from './views';

// The Sketchbook (#/sketchbook): play anything, see it written down, hear it back, and keep the
// ideas worth keeping. A kept idea can be practised like any exercise (#/sketchbook/<id>).
// The demo keeps its sketches in throwaway progress.

const METERS = ['4/4', '3/4', '2/4', '6/8'];
const KEYS = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Am', 'Em', 'Bm', 'Dm', 'Gm', 'Cm'];
const keyLabel = (k: string) => k.replace('b', '♭').replace(/m$/, ' minor').replace(/^([A-G♭]+)$/, '$1 major');

export const sketchStore = (): Store => (demo.active ? demoProgress().store : store);

/** The staff for a sketch (or a fresh take written the same way). */
export function sketchStaff(s: Pick<Sketch, 'right' | 'left' | 'tempo' | 'meter' | 'key' | 'title' | 'id'>): Element | '' {
  const ex = sketchExercise({ ...s, created: '', updated: '', grid: 0.5, notes: [], bars: 0 });
  if (!ex) return '';
  return h('div', { class: 'staff-wrap' }, renderStaff(staffParts(ex, false), { barQuarters: ex.meter.quarters, key: ex.key, chords: true }).svg);
}

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export const sketchbookView: View = (root, id?: string) => {
  const cal = needCalibration(root);
  if (!cal) return;
  if (id) return sketchPage(root, cal, id);

  const kb = new KeyboardView(cal.low, cal.high, { middleC: cal.middleC, cal, labels: 'c' });
  const offHeld = showHeld(kb);
  const tempo = h('input', { type: 'number', min: 40, max: 200, step: 2, value: 80, 'aria-label': 'tempo', class: 'num' });
  const meter = h('select', { 'aria-label': 'meter' }, ...METERS.map((m) => h('option', { value: m }, m)));
  const key = h('select', { 'aria-label': 'key' }, ...KEYS.map((k) => h('option', { value: k }, keyLabel(k))));
  const grid = h('select', { 'aria-label': 'grid' }, h('option', { value: '0.5' }, 'Eighths'), h('option', { value: '0.25' }, 'Sixteenths'));
  const clickBox = h('input', { type: 'checkbox', checked: true });
  const recBtn = recordButton();
  const stopBtn = h('button', { class: 'secondary', disabled: true }, 'Stop');
  const status = h('span', { class: 'small rec-status', 'aria-live': 'polite' });
  const take = h('div', { class: 'sketch-take' });
  const list = h('div', { class: 'sketch-list' });
  let run: ReturnType<typeof startTake> | undefined;
  let stopPlay: (() => void) | undefined;
  const light = (m: number, on: boolean) => kb.set(toDevice(cal, m), 'target', on);

  const showTake = (rec: Recorder) => {
    take.replaceChildren();
    const k = key.value;
    const g = Number(grid.value);
    const w = rec.written(k, g);
    if (!w.bars) {
      take.append(h('p', { class: 'small' }, 'Nothing was played. Press Record, wait for the count-in, then play anything.'));
      return;
    }
    // Keep the take from its first written bar, so playback and the staff line up.
    const shift = w.skippedBars * rec.opts.meter.quarters * rec.beatMs;
    const notes = rec.take().map((n) => ({ ...n, on: n.on - shift, off: n.off === undefined ? undefined : n.off - shift }));
    const draft = { right: w.right, left: w.left, tempo: Number(tempo.value), meter: meter.value, key: k, title: 'New idea', id: 'take' };
    const name = h('input', { type: 'text', value: `Idea ${sketches(sketchStore()).length + 1}`, 'aria-label': 'name', maxlength: 60 });
    const keep = h('button', {}, 'Keep it');
    const play = h('button', { class: 'secondary' }, 'Play it back');
    play.onclick = () => { stopPlay?.(); stopPlay = playBack(notes, undefined, light); };
    keep.onclick = () => {
      const s = saveSketch(sketchStore(), { ...draft, title: name.value.trim() || 'Untitled idea', grid: g, notes, bars: w.bars });
      take.replaceChildren(h('p', { class: 'banner ok' }, `Kept “${s.title}” in your Sketchbook. `, h('a', { href: `#/sketchbook/${s.id}` }, 'Practise it')));
      showList();
    };
    take.append(
      h('h3', {}, `Your take: ${w.bars} ${w.bars === 1 ? 'bar' : 'bars'}`),
      sketchStaff(draft),
      h('p', { class: 'small' }, 'Written on the grid of the tempo, so small timing differences are smoothed out. Playback keeps your own timing.'),
      h('div', { class: 'controls' }, play, name, keep),
    );
  };

  recBtn.onclick = () => {
    stopPlay?.();
    run?.stop();
    take.replaceChildren();
    recBtn.disabled = true;
    stopBtn.disabled = false;
    const m = parseMeter(meter.value);
    run = startTake(cal, { tempo: Number(tempo.value) || 80, meter: m, click: clickBox.checked ? 'on' : 'count-in', maxBars: 64 }, status, (rec) => {
      recBtn.disabled = false;
      stopBtn.disabled = true;
      run = undefined;
      showTake(rec);
    }, (rec) => demo.onRecord?.(rec));
  };
  stopBtn.onclick = () => run?.stop();

  function showList() {
    const all = sketches(sketchStore());
    list.replaceChildren(
      h('h3', {}, 'Your ideas'),
      all.length
        ? h('ul', { class: 'sketch-items' }, ...all.map((s) => h('li', {},
          h('a', { href: `#/sketchbook/${s.id}`, class: 'sketch-title' }, s.title),
          h('span', { class: 'small' }, `${when(s.created)} · ${s.bars} ${s.bars === 1 ? 'bar' : 'bars'} · ${keyLabel(s.key)} · ${s.meter} at ${s.tempo}`))))
        : h('p', { class: 'small' }, 'Nothing kept yet. Ideas you keep here, and good takes from improvising exercises, are saved with your progress.'),
    );
  }
  showList();

  root.append(h('section', { class: 'card sketchbook' },
    h('h2', {}, 'Sketchbook'),
    h('p', {}, 'Play anything: a tune that came to you, a chord you like, an improvisation. The app writes it down, plays it back and keeps the ideas worth keeping. Every composer starts with a notebook.'),
    h('p', { class: 'small' }, 'Found a chord you like and want to know its name? ', h('a', { href: '#/chords' }, 'Chord finder')),
    h('div', { class: 'controls' },
      h('label', {}, 'Tempo ', tempo), h('label', {}, 'Time ', meter), h('label', {}, 'Key ', key),
      h('label', {}, 'Write in ', grid), h('label', {}, clickBox, ' Click')),
    h('div', { class: 'controls' }, recBtn, stopBtn, status),
    h('div', { class: 'stage' }, kb.el),
    take,
  ), h('section', { class: 'card' }, list));

  return () => { run?.stop(); stopPlay?.(); offHeld(); };
};

/** One kept idea: its staff, playback, a memo, practising it, renaming and deleting. */
function sketchPage(root: HTMLElement, cal: Calibration, id: string) {
  const s = getSketch(sketchStore(), id);
  if (!s) { root.append(h('p', {}, 'That idea is not in your Sketchbook. ', h('a', { href: '#/sketchbook' }, 'Back to the Sketchbook'))); return; }
  let stopPlay: (() => void) | undefined;
  let cleanup = () => {};
  const title = h('input', { type: 'text', value: s.title, 'aria-label': 'name', maxlength: 60, class: 'sketch-name' });
  title.onchange = () => updateSketch(sketchStore(), id, { title: title.value.trim() || s.title });
  const memo = h('textarea', { rows: 2, placeholder: 'A note to yourself: what you like about it, where it could go next…', 'aria-label': 'memo' }, s.memo ?? '');
  memo.onchange = () => updateSketch(sketchStore(), id, { memo: memo.value });
  const play = h('button', { class: 'secondary', onclick: () => { stopPlay?.(); stopPlay = playBack(s.notes); } }, 'Play it back');
  const del = h('button', { class: 'secondary danger' }, 'Delete');
  // Two steps instead of a browser dialog.
  del.onclick = () => {
    if (del.dataset.sure) { deleteSketch(sketchStore(), id); location.hash = '#/sketchbook'; return; }
    del.dataset.sure = '1';
    del.textContent = 'Really delete?';
  };
  const practice = h('div');
  const ex = sketchExercise(s);
  const practiseBtn = h('button', { disabled: !ex }, 'Practise it');
  practiseBtn.onclick = () => {
    if (!ex) return;
    practiseBtn.hidden = true;
    cleanup = mountExercise(practice, ex, cal, () => {});
  };
  root.append(h('section', { class: 'card sketchbook' },
    h('p', { class: 'small' }, h('a', { href: '#/sketchbook' }, '← Sketchbook')),
    h('h2', {}, title),
    h('p', { class: 'small' }, `${when(s.created)} · ${s.bars} ${s.bars === 1 ? 'bar' : 'bars'} · ${keyLabel(s.key)} · ${s.meter} at ${s.tempo}${s.from ? ' · from an improvising exercise' : ''}`),
    sketchStaff(s),
    memo,
    h('div', { class: 'controls' }, play, practiseBtn, del),
    practice,
  ));
  return () => { stopPlay?.(); cleanup(); };
}
