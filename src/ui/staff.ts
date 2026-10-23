import { diatonicStep, type Pitch } from '../music/notes';
import { s } from './dom';

// A plain SVG staff: one clef or a grand staff, note heads, stems, rests and bar lines.
// Good enough to read from; the design thread can replace it.

export type Clef = 'treble' | 'bass';

export interface StaffNote {
  /** Empty = rest. */
  pitches: Pitch[];
  /** Quarter beats; undefined for untimed reading (heads only, evenly spaced). */
  beats?: number;
  /** Used to find the element later, e.g. "right:3". */
  key: string;
}

export interface StaffPart {
  clef: Clef;
  notes: StaffNote[];
}

const GAP = 10; // between staff lines
const HALF = GAP / 2;
const BEAT_W = 46;
const UNTIMED_W = 44;
const LEFT = 64;
const STAFF_H = 4 * GAP;
const BOTTOM_STEP: Record<Clef, number> = { treble: 4 * 7 + 2, bass: 2 * 7 + 4 }; // E4, G2

export function renderStaff(parts: StaffPart[], opts: { barQuarters?: number } = {}) {
  const timed = parts.some((p) => p.notes.some((n) => n.beats !== undefined));
  const length = Math.max(
    ...parts.map((p) => (timed ? p.notes.reduce((a, n) => a + (n.beats ?? 1), 0) : p.notes.length)),
  );
  const width = LEFT + length * (timed ? BEAT_W : UNTIMED_W) + 20;
  const staffTop = (i: number) => 40 + i * (STAFF_H + 70);
  const height = staffTop(parts.length - 1) + STAFF_H + 50;
  const svg = s('svg', { viewBox: `0 0 ${width} ${height}`, class: 'staff', role: 'img', 'aria-label': 'music staff' });
  const els = new Map<string, SVGGElement>();

  parts.forEach((part, pi) => {
    const top = staffTop(pi);
    const bottom = top + STAFF_H;
    const bStep = BOTTOM_STEP[part.clef];
    const y = (step: number) => bottom - (step - bStep) * HALF;
    for (let i = 0; i < 5; i++) svg.append(s('line', { x1: 10, x2: width - 10, y1: top + i * GAP, y2: top + i * GAP, class: 'line' }));
    svg.append(
      part.clef === 'treble'
        ? s('text', { x: 14, y: bottom + 8, class: 'clef treble' }, '\u{1D11E}')
        : s('text', { x: 14, y: top + 26, class: 'clef bass' }, '\u{1D122}'),
    );

    let pos = 0;
    let barPos = 0;
    for (const n of part.notes) {
      const x = LEFT + (timed ? pos * BEAT_W : pos * UNTIMED_W) + 14;
      const g = s('g', { class: 'note' });
      if (!n.pitches.length) g.append(rest(x, top, n.beats ?? 1));
      for (const p of n.pitches) {
        const step = diatonicStep(p);
        const ny = y(step);
        // Ledger lines above or below the staff.
        for (let st = bStep - 2; st >= step; st -= 2) g.append(s('line', { x1: x - 10, x2: x + 10, y1: y(st), y2: y(st), class: 'ledger' }));
        for (let st = bStep + 10; st <= step; st += 2) g.append(s('line', { x1: x - 10, x2: x + 10, y1: y(st), y2: y(st), class: 'ledger' }));
        const open = n.beats !== undefined && n.beats >= 2;
        g.append(s('ellipse', { cx: x, cy: ny, rx: 6.2, ry: 4.4, transform: `rotate(-20 ${x} ${ny})`, class: open ? 'head open' : 'head' }));
        if (p.accidental) g.append(s('text', { x: x - 18, y: ny + 5, class: 'accidental' }, p.accidental > 0 ? '♯' : '♭'));
        if (n.beats !== undefined && [0.75, 1.5, 3, 6].includes(n.beats)) g.append(s('circle', { cx: x + 11, cy: ny - (step % 2 === bStep % 2 ? HALF : 0), r: 1.6 }));
      }
      if (n.pitches.length && n.beats !== undefined && n.beats < 4) {
        const steps = n.pitches.map(diatonicStep);
        const up = Math.max(...steps) < bStep + 4;
        const ys = steps.map(y);
        const x2 = up ? x + 5.8 : x - 5.8;
        const y1 = up ? Math.max(...ys) : Math.min(...ys);
        const y2 = up ? Math.min(...ys) - 34 : Math.max(...ys) + 34;
        g.append(s('line', { x1: x2, x2, y1, y2, class: 'stem' }));
        if (n.beats <= 0.75) g.append(s('path', { d: `M${x2} ${y2} q 8 ${up ? 10 : -10} 9 ${up ? 22 : -22}`, class: 'flag' }));
      }
      svg.append(g);
      els.set(n.key, g);
      pos += timed ? (n.beats ?? 1) : 1;
      barPos += n.beats ?? 0;
      if (timed && opts.barQuarters && Math.abs(barPos - opts.barQuarters) < 1e-9) {
        barPos = 0;
        const bx = LEFT + pos * BEAT_W + 2;
        svg.append(s('line', { x1: bx, x2: bx, y1: top, y2: bottom, class: 'bar' }));
      }
    }
  });
  if (parts.length === 2) svg.append(s('line', { x1: 10, x2: 10, y1: staffTop(0), y2: staffTop(1) + STAFF_H, class: 'bar' }));

  return {
    svg,
    mark(key: string, cls: string, on = true) {
      els.get(key)?.classList.toggle(cls, on);
    },
    clear(cls: string) {
      for (const g of els.values()) g.classList.remove(cls);
    },
  };
}

function rest(x: number, top: number, beats: number): SVGElement {
  if (beats >= 4) return s('rect', { x: x - 6, y: top + GAP, width: 12, height: 5, class: 'rest' });
  if (beats >= 2) return s('rect', { x: x - 6, y: top + 2 * GAP - 5, width: 12, height: 5, class: 'rest' });
  if (beats >= 1) {
    const y = top + 6;
    return s('path', { d: `M${x - 3} ${y} l6 7 l-5 6 l6 7 c-6 -3 -8 2 -4 6 c-7 -3 -6 -9 0 -7 l-6 -7 l5 -6 z`, class: 'rest' });
  }
  return s('text', { x: x - 5, y: top + 26, class: 'rest-glyph' }, '\u{1D13E}');
}
