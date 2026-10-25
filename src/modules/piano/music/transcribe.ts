import { LETTERS, type Hand, type Letter, type Meter } from './notes';
import { keySignature } from './theory';

// Turns what the player pressed (free play, a Sketchbook take, an improvisation) into note strings
// in the content format, so the normal staff, playback and timed player can use them.
// Times are song ms from the first downbeat; pitches are written MIDI numbers (C4 = 60).

export interface CapturedNote {
  midi: number;
  /** Song ms from the first downbeat. */
  on: number;
  /** Song ms of the release; unset while still held (or never released). */
  off?: number;
  velocity?: number;
  /** The hand it belongs to, when known (an imported part); otherwise the split decides. */
  hand?: Hand;
}

export interface TranscribeOptions {
  /** Milliseconds per quarter beat. */
  beatMs: number;
  meter: Meter;
  /** Smallest step, in quarter beats: 0.5 = eighths (default), 0.25 = sixteenths. */
  grid?: number;
  /** Key for spelling (C, G, Bb, Am...). */
  key?: string;
  /** Notes from here up are the right hand (treble staff); below, the left (bass). Default middle C. */
  split?: number;
  /** Drop empty whole bars before the first note (default true). */
  trimStart?: boolean;
}

export interface Transcription {
  right?: string;
  left?: string;
  bars: number;
  /** Bars dropped from the front (empty before the first note). */
  skippedBars: number;
}

/** Spell a written MIDI note in a key: the key's own note, else a natural, else ♯ in sharp keys and ♭ in flat ones. */
export function spell(midi: number, key = 'C'): string {
  const sig = keySignature(key);
  const pc = ((midi % 12) + 12) % 12;
  const NAT: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const name = (letter: Letter, acc: number) => {
    // The octave belongs to the letter: B#3 is C4's key, Cb5 is B4's.
    const octave = Math.floor((midi - acc) / 12) - 1;
    return `${letter}${acc > 0 ? '#' : acc < 0 ? 'b' : ''}${octave}`;
  };
  for (const l of LETTERS) if ((NAT[l] + sig.of[l] + 12) % 12 === pc) return name(l, sig.of[l]);
  for (const l of LETTERS) if (NAT[l] === pc) return name(l, 0);
  const flat = sig.count < 0;
  for (const l of LETTERS) if ((NAT[l] + (flat ? -1 : 1) + 12) % 12 === pc) return name(l, flat ? -1 : 1);
  return name('C', 0); // unreachable: every pitch class has a sharp or a flat spelling
}

/** Note values a length can be written with, longest first (quarter beats). */
const VALUES: [number, string][] = [[4, 'w'], [3, 'h.'], [2, 'h'], [1.5, 'q.'], [1, 'q'], [0.75, 'e.'], [0.5, 'e'], [0.25, 's']];

/** Split a length (a multiple of a sixteenth) into written values, longest first. */
export function splitLength(beats: number): string[] {
  const out: string[] = [];
  let left = Math.round(beats * 4) / 4;
  while (left > 1e-6) {
    const [v, name] = VALUES.find(([v]) => v <= left + 1e-6)!;
    out.push(name);
    left -= v;
  }
  return out;
}

interface Event { at: number; beats: number; notes: number[] }

/** Notes of one hand as events on the grid: chords merged, each held at most until the next one. */
function events(notes: CapturedNote[], beatMs: number, grid: number, end: number, barQ: number): Event[] {
  const q = (ms: number) => Math.round(ms / beatMs / grid) * grid;
  const byStart = new Map<number, { notes: number[]; len: number; raw: number }>();
  for (const n of notes) {
    const at = Math.max(0, q(n.on));
    const len = n.off !== undefined ? Math.max(grid, q(n.off) - at) : Infinity;
    const e = byStart.get(at) ?? { notes: [], len: 0, raw: 0 };
    if (!e.notes.includes(n.midi)) e.notes.push(n.midi);
    e.len = Math.max(e.len, len);
    e.raw = Math.max(e.raw, n.off !== undefined ? n.off / beatMs - at : Infinity);
    byStart.set(at, e);
  }
  const starts = [...byStart.keys()].sort((a, b) => a - b);
  return starts.map((at, i) => {
    const e = byStart.get(at)!;
    const next = starts[i + 1] ?? Math.min(end, Math.ceil((at + Math.min(e.len, end - at)) / barQ - 1e-6) * barQ);
    let beats = Math.min(e.len, next - at);
    // Hands lift a little early: a gap of under a step after a longer note is still legato.
    if (beats < next - at && next - at - e.raw < 0.9 * grid && beats >= 2 * grid) beats = next - at;
    return { at, beats, notes: e.notes.sort((a, b) => a - b) };
  });
}

/** One hand's events written out bar by bar, with rests between and ties over bar lines. */
function write(evs: Event[], bars: number, barQ: number, key: string): string {
  const out: string[][] = Array.from({ length: bars }, () => []);
  const put = (from: number, beats: number, head: string, tied: boolean) => {
    let at = from;
    let left = beats;
    while (left > 1e-6) {
      const bar = Math.floor(at / barQ + 1e-6);
      const inBar = Math.min(left, (bar + 1) * barQ - at);
      const parts = splitLength(inBar);
      parts.forEach((d, i) => {
        const last = left - inBar < 1e-6 && i === parts.length - 1;
        out[bar].push(`${head}:${d}${tied && !last ? '~' : ''}`);
      });
      at += inBar;
      left -= inBar;
    }
  };
  let pos = 0;
  for (const e of evs) {
    if (e.at > pos + 1e-6) put(pos, e.at - pos, 'r', false);
    put(e.at, e.beats, e.notes.map((m) => spell(m, key)).join('+'), true);
    pos = e.at + e.beats;
  }
  if (pos < bars * barQ - 1e-6) put(pos, bars * barQ - pos, 'r', false);
  return out.map((b) => b.join(' ')).join(' | ');
}

/**
 * Write a take down. Onsets snap to the grid; a note lasts until its release (snapped, at least
 * one step) but never past the next note of its hand; notes that snap together are a chord.
 */
export function transcribe(notes: CapturedNote[], opts: TranscribeOptions): Transcription {
  const grid = opts.grid ?? 0.5;
  const barQ = opts.meter.quarters;
  const key = opts.key ?? 'C';
  const split = opts.split ?? 60;
  // Presses just before the downbeat belong to it; earlier ones are count-in noise.
  const kept = notes.filter((n) => n.on >= -opts.beatMs * grid);
  if (!kept.length) return { bars: 0, skippedBars: 0 };
  const firstBeat = Math.max(0, Math.round(Math.min(...kept.map((n) => n.on)) / opts.beatMs / grid) * grid);
  const skippedBars = opts.trimStart === false ? 0 : Math.floor(firstBeat / barQ + 1e-6);
  const shift = skippedBars * barQ * opts.beatMs;
  const moved = kept.map((n) => ({ ...n, on: n.on - shift, off: n.off === undefined ? undefined : n.off - shift }));
  const lastEnd = Math.max(...moved.map((n) => Math.max(n.on, n.off ?? n.on + opts.beatMs) / opts.beatMs));
  const bars = Math.max(1, Math.ceil(Math.round(lastEnd / grid) * grid / barQ - 1e-6));
  const end = bars * barQ;
  const right = moved.filter((n) => (n.hand ?? (n.midi >= split ? 'right' : 'left')) === 'right');
  const left = moved.filter((n) => (n.hand ?? (n.midi >= split ? 'right' : 'left')) === 'left');
  return {
    right: right.length ? write(events(right, opts.beatMs, grid, end, barQ), bars, barQ, key) : undefined,
    left: left.length ? write(events(left, opts.beatMs, grid, end, barQ), bars, barQ, key) : undefined,
    bars,
    skippedBars,
  };
}
