import { h, s } from '../../../core/dom';

// Practice mode picks the bars to loop with two handles: on a slider of bars over the stage (every
// view, also a phone on its side) and on the sheet music itself, where they sit on the bar lines
// at the ends of the chosen bars. Both move the same range.

/** First and last bar, 0-based, inclusive. */
export type BarSpan = [number, number];

/** A handle sits on a boundary between bars: `from` on boundary r[0], `to` on boundary r[1] + 1. */
type Which = 'from' | 'to';

function moved(r: BarSpan, which: Which, boundary: number, bars: number): BarSpan {
  return which === 'from'
    ? [Math.max(0, Math.min(boundary, r[1])), r[1]]
    : [r[0], Math.min(bars - 1, Math.max(boundary - 1, r[0]))];
}

/** The handle nearer a boundary (ties: the one on the side the pointer is). */
const nearer = (r: BarSpan, boundary: number): Which =>
  Math.abs(boundary - r[0]) < Math.abs(boundary - (r[1] + 1)) || (boundary <= r[0]) ? 'from' : 'to';

export const spanText = ([a, b]: BarSpan) => (a === b ? `Bar ${a + 1}` : `Bars ${a + 1}–${b + 1}`);

/**
 * Drags a handle from a pointer down to its release. `boundaryAt` turns a pointer into the
 * nearest boundary; `which` is the handle grabbed, or undefined to take the nearer one.
 */
function drag(e: PointerEvent, el: Element, which: Which | undefined, get: () => BarSpan, bars: number,
  boundaryAt: (e: PointerEvent) => number, change: (r: BarSpan, done: boolean) => void) {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  const w = which ?? nearer(get(), boundaryAt(e));
  const step = (ev: PointerEvent, done: boolean) => {
    const r = get();
    const next = moved(r, w, boundaryAt(ev), bars);
    if (done || next[0] !== r[0] || next[1] !== r[1]) change(next, done);
  };
  try { el.setPointerCapture(e.pointerId); } catch { /* a synthetic event has no pointer to capture */ }
  step(e, false);
  const move = (ev: Event) => step(ev as PointerEvent, false);
  const up = (ev: Event) => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
    step(ev as PointerEvent, true);
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
}

export interface RangeControl {
  el: HTMLElement;
  set(r: BarSpan): void;
}

/**
 * A slider of `bars` bars with two handles. `onChange` runs while dragging (`done` false) and once
 * more when the handle is let go or moved with the keys (`done` true).
 */
export function rangeSlider(bars: number, start: BarSpan, onChange: (r: BarSpan, done: boolean) => void): RangeControl {
  let r = start;
  const cells = Array.from({ length: bars }, (_, i) => h('span', { class: 'range-cell' }, bars <= 24 || i % 4 === 0 ? String(i + 1) : ''));
  const handle = (which: Which) => h('button', {
    type: 'button', class: `range-handle ${which}`, role: 'slider',
    'aria-label': which === 'from' ? 'first bar' : 'last bar', 'aria-valuemin': 1, 'aria-valuemax': bars,
  });
  const from = handle('from');
  const to = handle('to');
  const fill = h('span', { class: 'range-fill' });
  const track = h('div', { class: 'range-track' }, ...cells, fill, from, to);
  const label = h('span', { class: 'range-label' });
  const el = h('div', { class: 'bar-range' }, label, track);

  const paint = () => {
    label.textContent = spanText(r);
    cells.forEach((c, i) => c.classList.toggle('in', i >= r[0] && i <= r[1]));
    from.style.left = `${(r[0] / bars) * 100}%`;
    to.style.left = `${((r[1] + 1) / bars) * 100}%`;
    fill.style.left = from.style.left;
    fill.style.width = `${((r[1] - r[0] + 1) / bars) * 100}%`;
    from.setAttribute('aria-valuenow', String(r[0] + 1));
    to.setAttribute('aria-valuenow', String(r[1] + 1));
    from.setAttribute('aria-valuetext', spanText(r));
    to.setAttribute('aria-valuetext', spanText(r));
  };
  const change = (next: BarSpan, done: boolean) => { r = next; paint(); onChange(r, done); };
  const boundaryAt = (e: PointerEvent) => {
    const box = track.getBoundingClientRect();
    return Math.round(((e.clientX - box.left) / Math.max(1, box.width)) * bars);
  };
  track.addEventListener('pointerdown', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('.range-handle');
    drag(e, track, t ? (t === from ? 'from' : 'to') : undefined, () => r, bars, boundaryAt, change);
  });
  for (const [btn, which] of [[from, 'from'], [to, 'to']] as const) {
    btn.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : 0;
      if (!d) return;
      e.preventDefault();
      const at = which === 'from' ? r[0] : r[1] + 1;
      change(moved(r, which, at + d, bars), true);
    });
  }
  paint();
  return { el, set(next) { r = next; paint(); } };
}

/** What a staff drawing offers for the handles on the sheet. */
interface StaffLike { svg: SVGSVGElement; xOf: (beat: number) => number }

/**
 * The same handles on the sheet: the bars outside the range are shaded, a handle stands on the
 * bar line at each end, and bar numbers sit over the bars. `startBeat`: where the music starts
 * (after an upbeat's padding); `barQuarters`: quarters in a bar.
 */
export function sheetRange(staff: StaffLike, bars: number, barQuarters: number, startBeat: number, get: () => BarSpan,
  onChange: (r: BarSpan, done: boolean) => void) {
  const { svg } = staff;
  // A strip over the music (and over any chord names) for the bar numbers and the handles' knobs.
  const box = svg.viewBox.baseVal;
  const top = box.y - 18;
  const W = box.width, H = box.height + 18;
  svg.setAttribute('viewBox', `${box.x} ${top} ${W} ${H}`);
  // Bar lines: the first sits where the music starts, the others one bar apart.
  const xs = Array.from({ length: bars + 1 }, (_, k) => (k === 0 ? staff.xOf(startBeat) - 16 : staff.xOf(k * barQuarters) - 12));
  const shadeA = s('rect', { class: 'range-shade', y: top, height: H });
  const shadeB = s('rect', { class: 'range-shade', y: top, height: H });
  const band = s('rect', { class: 'range-band', y: top, height: 4, rx: 2 });
  const grip = (which: Which) => {
    const g = s('g', { class: `range-grip ${which}`, role: 'slider', 'aria-label': which === 'from' ? 'first bar' : 'last bar' },
      s('rect', { class: 'grip-hit', x: -14, y: top, width: 28, height: H }),
      s('line', { class: 'grip-line', x1: 0, x2: 0, y1: top + 4, y2: top + H - 4 }),
      s('rect', { class: 'grip-knob', x: -7, y: top + 2, width: 14, height: 24, rx: 7 }),
      s('line', { class: 'grip-mark', x1: -2, x2: -2, y1: top + 9, y2: top + 19 }),
      s('line', { class: 'grip-mark', x1: 2, x2: 2, y1: top + 9, y2: top + 19 }));
    return g;
  };
  const from = grip('from');
  const to = grip('to');
  const numbers = xs.slice(0, bars).map((x, i) => s('text', { class: 'range-num', x: x + 11, y: top + 16 }, String(i + 1)));
  const layer = s('g', { class: 'range-overlay' }, shadeA, shadeB, band, ...numbers, from, to);
  svg.append(layer);

  const update = (r: BarSpan) => {
    const a = xs[r[0]], b = xs[r[1] + 1];
    shadeA.setAttribute('x', '0'); shadeA.setAttribute('width', String(Math.max(0, a)));
    shadeB.setAttribute('x', String(b)); shadeB.setAttribute('width', String(Math.max(0, W - b)));
    band.setAttribute('x', String(a)); band.setAttribute('width', String(Math.max(0, b - a)));
    from.setAttribute('transform', `translate(${a} 0)`);
    to.setAttribute('transform', `translate(${b} 0)`);
    numbers.forEach((n, i) => n.classList.toggle('in', i >= r[0] && i <= r[1]));
  };
  const boundaryAt = (e: PointerEvent) => {
    const ctm = svg.getScreenCTM();
    if (!ctm) return 0;
    const x = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse()).x;
    let best = 0;
    xs.forEach((bx, k) => { if (Math.abs(bx - x) < Math.abs(xs[best] - x)) best = k; });
    return best;
  };
  for (const [g, which] of [[from, 'from'], [to, 'to']] as const) {
    g.addEventListener('pointerdown', (e) => drag(e as PointerEvent, g, which, get, bars, boundaryAt, (r, done) => { update(r); onChange(r, done); }));
  }
  update(get());
  return { update, remove: () => layer.remove() };
}
