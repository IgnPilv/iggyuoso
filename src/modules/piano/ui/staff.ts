import { chordSymbols } from '../music/chordNames';
import { diatonicStep, type Letter, type Pitch } from '../music/notes';
import { keySignature } from '../music/theory';
import type { PedalSpan } from '../music/timeline';
import { LEVELS, type DynamicSpan } from '../scoring/dynamics';
import { s } from '../../../core/dom';

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
  /** The written value (q = 1) when it differs from `beats` (dots, triplets). */
  value?: number;
  dotted?: boolean;
  triplet?: boolean;
  /** Tied to the next note: drawn with an arc. */
  tie?: boolean;
  /** A finger number, over the staff (or under it on a lower or bass staff). */
  finger?: number;
  /** A chord's finger numbers, low note to high, stacked like the notes (instead of `finger`). */
  fingers?: number[];
  /** Text under the note, such as its name. */
  label?: string;
  /** Takes its place in the line but draws nothing (no rest): the other staff of a picture has the note. */
  spacer?: boolean;
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

/** `startQuarter`: where in the first bar the music starts (the beats an upbeat leaves out). */
/** Where each sharp and flat of a signature sits on the treble staff (the bass is two octaves down). */
const SIG_SHARPS: [Letter, number][] = [['F', 5], ['C', 5], ['G', 5], ['D', 5], ['A', 4], ['E', 5], ['B', 4]];
const SIG_FLATS: [Letter, number][] = [['B', 4], ['E', 5], ['A', 4], ['D', 5], ['G', 4], ['C', 5], ['F', 4]];
const SIG_W = 9;
const FINGER_LINE = 11; // between stacked finger numbers
const ACCIDENTAL = { 1: '♯', [-1]: '♭', 0: '♮' } as const;

/**
 * `key`: a key signature (G, Bb, Em...). Notes are written out in full; an accidental is drawn
 * only where the note differs from the signature or from an earlier note on that line in the bar.
 */
/** `time`: a time signature drawn after the clef and key; `beatW`: width of a quarter beat (pictures only). */
/** `chords`: chord names (C, Am, G7) over the music where the notes sounding together make a chord. */
export function renderStaff(parts: StaffPart[], opts: { barQuarters?: number; startQuarter?: number; pedal?: PedalSpan[]; dynamics?: DynamicSpan[]; key?: string; time?: [number, number]; beatW?: number; chords?: boolean; pulse?: number } = {}) {
  const beatW = opts.beatW ?? BEAT_W;
  const timed = parts.some((p) => p.notes.some((n) => n.beats !== undefined));
  const length = Math.max(
    ...parts.map((p) => (timed ? p.notes.reduce((a, n) => a + (n.beats ?? 1), 0) : p.notes.length)),
  );
  const sig = opts.key ? keySignature(opts.key) : undefined;
  const sigCount = Math.abs(sig?.count ?? 0);
  const timeX = LEFT + (sigCount ? sigCount * SIG_W + 2 : -6);
  const left = LEFT + (sigCount ? sigCount * SIG_W + 6 : 0) + (opts.time ? 22 : 0);
  const width = left + length * (timed ? beatW : UNTIMED_W) + 20;
  const staffTop = (i: number) => 40 + i * (STAFF_H + 70);
  // Dynamics sit under the music (between the staves of a grand staff), the pedal below them.
  const dyn = timed && (opts.dynamics?.length ?? 0) > 0;
  const dynY = parts.length === 2 ? staffTop(0) + STAFF_H + 38 : staffTop(0) + STAFF_H + 44;
  const pedalY = staffTop(parts.length - 1) + STAFF_H + 48 + (dyn && parts.length === 1 ? 24 : 0);
  const height = Math.max(pedalY + (opts.pedal?.length ? 22 : 2), dyn ? dynY + 10 : 0);
  const svg = s('svg', { viewBox: `0 0 ${width} ${height}`, class: 'staff', role: 'img', 'aria-label': 'music staff' });
  const els = new Map<string, SVGGElement>();
  // The highest point drawn for each note of the upper staff (by its beat), so chord names clear it.
  const ceiling = new Map<number, number>();
  const beatKey = (at: number) => Math.round(at * 1000);

  parts.forEach((part, pi) => {
    // Fingers sit over the upper staff and under the lower one (and under a lone bass staff).
    const fingersBelow = parts.length === 2 ? pi === 1 : part.clef === 'bass';
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
    if (sig && sigCount) {
      const places = (sig.count > 0 ? SIG_SHARPS : SIG_FLATS).slice(0, sigCount);
      places.forEach(([letter, octave], i) => {
        const step = diatonicStep({ letter, accidental: 0, octave: octave - (part.clef === 'bass' ? 2 : 0) });
        svg.append(s('text', { x: LEFT - 6 + i * SIG_W, y: y(step) + 5, class: 'accidental signature' }, sig.count > 0 ? '♯' : '♭'));
      });
    }
    if (opts.time) {
      for (const [i, n] of opts.time.entries()) svg.append(s('text', { x: timeX + 8, y: top + (i ? 37 : 17), class: 'time-sig' }, String(n)));
    }
    // Accidentals already shown in this bar, per staff line or space.
    let shown = new Map<number, -1 | 0 | 1>();

    let pos = 0;
    let barPos = opts.startQuarter ?? 0;
    let tripletPos = 0; // beats into the current triplet group
    for (const n of part.notes) {
      const x = left + (timed ? pos * beatW : pos * UNTIMED_W) + 14;
      if (!timed) shown = new Map(); // reading drills: every note on its own
      const g = s('g', { class: 'note' });
      const value = n.value ?? n.beats;
      const dotted = n.dotted ?? (n.beats !== undefined && [0.375, 0.75, 1.5, 3, 6].includes(n.beats));
      if (!n.pitches.length && !n.spacer) g.append(rest(x, top, value ?? 1));
      let high = n.pitches.length ? Math.min(...n.pitches.map((p) => y(diatonicStep(p)))) - 8 : top;
      if (n.pitches.length && value !== undefined && value < 4 && Math.max(...n.pitches.map(diatonicStep)) < bStep + 4) high -= 34;
      if (n.triplet) high = Math.min(high, top - 26);
      if (n.pitches.length && (n.finger !== undefined || n.label)) {
        const ys = n.pitches.map((p) => y(diatonicStep(p)));
        // Clear of the stem: up when the notes sit low on the staff (as drawn below).
        const stem = value !== undefined && value < 4;
        const up = Math.max(...n.pitches.map(diatonicStep)) < bStep + 4;
        if (n.finger !== undefined) {
          const fy = fingersBelow
            ? Math.max(bottom + 16, Math.max(...ys) + (stem && !up ? 46 : 18))
            : Math.min(top - 8, Math.min(...ys) - (stem && up ? 40 : 12));
          // A chord's numbers stack with the highest note's on top, growing away from the staff.
          const stack = [...(n.fingers ?? [n.finger])].reverse();
          stack.forEach((f, i) => g.append(s('text', { x, y: fy + (fingersBelow ? i : i - stack.length + 1) * FINGER_LINE, class: 'finger' }, String(f))));
          if (!fingersBelow) high = Math.min(high, fy - (stack.length - 1) * FINGER_LINE - 10);
        }
        if (n.label) g.append(s('text', { x, y: Math.max(bottom + 18, Math.max(...ys) + 20) + (n.finger !== undefined && fingersBelow ? 16 + ((n.fingers?.length ?? 1) - 1) * FINGER_LINE : 0), class: 'note-label' }, n.label));
      }
      for (const p of n.pitches) {
        const step = diatonicStep(p);
        const ny = y(step);
        // Ledger lines above or below the staff.
        for (let st = bStep - 2; st >= step; st -= 2) g.append(s('line', { x1: x - 12, x2: x + 12, y1: y(st), y2: y(st), class: 'ledger' }));
        for (let st = bStep + 10; st <= step; st += 2) g.append(s('line', { x1: x - 12, x2: x + 12, y1: y(st), y2: y(st), class: 'ledger' }));
        const open = value !== undefined && value >= 2;
        g.append(s('ellipse', { cx: x, cy: ny, rx: 6.2, ry: 4.4, transform: `rotate(-20 ${x} ${ny})`, class: open ? 'head open' : 'head' }));
        const current = shown.get(step) ?? sig?.of[p.letter] ?? 0;
        if (p.accidental !== current) g.append(s('text', { x: x - 18, y: ny + 5, class: 'accidental' }, ACCIDENTAL[p.accidental]));
        shown.set(step, p.accidental);
        if (dotted) g.append(s('circle', { cx: x + 11, cy: ny - (step % 2 === bStep % 2 ? HALF : 0), r: 1.6 }));
        if (n.tie && n.beats !== undefined) {
          const x2 = x + n.beats * beatW;
          const below = step < bStep + 4;
          const ty = ny + (below ? 7 : -7);
          g.append(s('path', { d: `M${x + 4} ${ty} Q ${(x + x2) / 2} ${ty + (below ? 9 : -9)} ${x2 - 4} ${ty}`, class: 'tie' }));
        }
      }
      if (n.pitches.length && value !== undefined && value < 4) {
        const steps = n.pitches.map(diatonicStep);
        const up = Math.max(...steps) < bStep + 4;
        const ys = steps.map(y);
        const x2 = up ? x + 5.8 : x - 5.8;
        const y1 = up ? Math.max(...ys) : Math.min(...ys);
        const y2 = up ? Math.min(...ys) - 34 : Math.max(...ys) + 34;
        g.append(s('line', { x1: x2, x2, y1, y2, class: 'stem' }));
        const flags = value <= 0.25 ? 2 : value <= 0.5 ? 1 : 0;
        for (let f = 0; f < flags; f++) {
          const fy = y2 + (up ? 8 : -8) * f;
          g.append(s('path', { d: `M${x2} ${fy} q 8 ${up ? 10 : -10} 9 ${up ? 22 : -22}`, class: 'flag' }));
        }
      }
      if (n.triplet && value !== undefined) {
        // A "3" over the middle of each group of three.
        if (tripletPos < 1e-6) g.append(s('text', { x: x + ((2 * value) / 3) * beatW, y: top - 14, class: 'tuplet' }, '3'));
        tripletPos += n.beats ?? 0;
        if (tripletPos >= value * 2 - 1e-6) tripletPos = 0;
      } else tripletPos = 0;
      svg.append(g);
      els.set(n.key, g);
      if (pi === 0 && timed) ceiling.set(beatKey(pos), high);
      pos += timed ? (n.beats ?? 1) : 1;
      barPos += n.beats ?? 0;
      if (timed && opts.barQuarters && Math.abs(barPos - opts.barQuarters) < 1e-6) {
        barPos = 0;
        shown = new Map();
        const bx = left + pos * beatW + 2;
        svg.append(s('line', { x1: bx, x2: bx, y1: top, y2: bottom, class: 'bar' }));
      }
    }
  });
  if (parts.length === 2) svg.append(s('line', { x1: 10, x2: 10, y1: staffTop(0), y2: staffTop(1) + STAFF_H, class: 'bar' }));

  // Pedal marks under the music: "Ped." where it goes down, a line while it is held, a notch
  // where it changes and a tick where it comes up.
  if (timed && opts.pedal?.length) {
    const px = (beat: number) => left + (beat - (opts.startQuarter ?? 0)) * beatW + 8;
    const g = s('g', { class: 'pedal' });
    for (const sp of opts.pedal) {
      const a = px(sp.beat);
      const b = px(sp.beat + sp.beats);
      if (sp.change) g.append(s('path', { d: `M${a - 5} ${pedalY} L${a} ${pedalY - 7} L${a + 5} ${pedalY}`, class: 'pedal-line' }));
      else g.append(s('text', { x: a - 4, y: pedalY + 1, class: 'pedal-text' }, 'Ped.'));
      g.append(s('line', { x1: sp.change ? a + 5 : a + 26, x2: sp.lift ? b - 4 : b - 5, y1: pedalY, y2: pedalY, class: 'pedal-line' }));
      if (sp.lift) g.append(s('line', { x1: b - 4, x2: b - 4, y1: pedalY, y2: pedalY - 8, class: 'pedal-line' }));
    }
    svg.append(g);
  }

  // Loud and soft: the mark at the start of its bars; a hairpin as an opening or closing wedge.
  if (dyn) {
    const dx = (beat: number) => left + (beat - (opts.startQuarter ?? 0)) * beatW + 8;
    const g = s('g', { class: 'dynamics' });
    for (const d of opts.dynamics!) {
      const a = Math.max(left - 6, dx(d.beat));
      const b = dx(d.beat + d.beats) - 10;
      if (!d.hairpin) { g.append(s('text', { x: a, y: dynY + 4, class: 'dyn-text' }, LEVELS[d.level])); continue; }
      const [wide, narrow] = d.hairpin > 0 ? [b, a] : [a, b];
      g.append(s('path', { d: `M${wide} ${dynY - 5} L${narrow} ${dynY} L${wide} ${dynY + 5}`, class: 'dyn-line' }));
    }
    svg.append(g);
  }

  // Chord names on a line over the upper staff, lifted over high notes and their fingers.
  if (timed && opts.chords) {
    const g = s('g', { class: 'chord-names' });
    let lowest = 0;
    // With bars known, broken chords (arpeggios, oom-pah) in the left hand are named by the bar.
    const spans = opts.barQuarters ? { barQuarters: opts.barQuarters, offset: opts.startQuarter, pulse: opts.pulse, left: parts.length === 1 && parts[0].clef === 'bass' } : undefined;
    for (const c of chordSymbols(parts, spans)) {
      const cy = Math.min(staffTop(0) - 22, (ceiling.get(beatKey(c.at)) ?? Infinity) - 6);
      lowest = Math.min(lowest, cy - 14);
      g.append(s('text', { x: left + c.at * beatW + 14, y: cy, class: 'chord-name' }, c.name));
    }
    svg.append(g);
    if (lowest < 0) svg.setAttribute('viewBox', `0 ${lowest} ${width} ${height - lowest}`);
  }

  return {
    svg,
    width,
    /** Where a beat (timed, counted like the falling notes) or a note number (untimed) sits. */
    xOf: (at: number) => left + (timed ? (at - (opts.startQuarter ?? 0)) * beatW : at * UNTIMED_W) + 14,
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
  return s('text', { x: x - 5, y: top + 26, class: 'rest-glyph' }, beats <= 0.25 ? '\u{1D13F}' : '\u{1D13E}');
}
