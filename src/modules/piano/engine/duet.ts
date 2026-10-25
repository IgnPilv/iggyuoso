import { earNotes, EAR_TUNES, tuneTokens, type EarNote, type EarTune } from './byEar';
import type { NoteToken } from '../music/notes';

// Duet (#/duet): the player plays a tune's melody and the app plays the accompaniment, following
// the player. Nothing runs ahead of the player: the band plays up to the next melody note and waits
// there until it is played, and between notes it keeps to the player's own tempo, which it learns
// as they go (a long wait or a sudden rush is not taken as the new tempo). At the end it says where
// the player held back or hurried against their own beat, where the band had to wait, and whether
// the tempo crept. The ui is src/modules/piano/ui/duetView.ts.
//
// The tunes are Play by ear's public-domain tunes (src/modules/piano/engine/byEar.ts), with a chord
// for each bar (or two, each half the bar), all in 4/4.

export type DuetStyle = 'held' | 'oompah' | 'rolling';
export const DUET_STYLES: [DuetStyle, string][] = [
  ['held', 'Held chords'],
  ['oompah', 'Bass and chord (oom-pah)'],
  ['rolling', 'Rolling eighths'],
];

export interface DuetTune {
  tune: EarTune;
  /** One entry per bar of 4 beats: a chord, or two chords for half a bar each ("C G"). */
  chords: string[];
}

const CHORDS: Record<string, string[]> = {
  'hot-cross-buns': ['C', 'C', 'C G', 'C'],
  mary: ['C', 'C', 'G', 'C'],
  'ode-to-joy': ['C', 'G', 'C', 'G C'],
  'au-clair': ['C', 'C G', 'C G', 'C'],
  'frere-jacques': ['C', 'C', 'C', 'C'],
  'lightly-row': ['C', 'G', 'C', 'C'],
  'jingle-bells': ['C', 'C', 'C G', 'C'],
  twinkle: ['C', 'F C', 'F C', 'G C'],
  'london-bridge': ['C', 'C', 'G', 'C'],
  'old-macdonald': ['G', 'C G', 'G D', 'G'],
  'yankee-doodle': ['C', 'C G', 'C', 'G C'],
};

export const DUET_TUNES: DuetTune[] = Object.entries(CHORDS).map(([id, chords]) => ({ tune: EAR_TUNES.find((t) => t.id === id)!, chords }));

const BAR = 4;
const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** A chord's left-hand notes: the root low (C2 to B2) and the triad close above it (C3 to B3). */
export function voice(name: string): { bass: number; triad: number[] } {
  const m = /^([A-G])([#b]?)(m?)(7?)$/.exec(name);
  if (!m) throw new Error(`Unknown chord ${name}`);
  const root = (PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  const tones = [0, m[3] ? 3 : 4, 7, ...(m[4] ? [10] : [])].map((i) => (root + i) % 12);
  const bass = 36 + root;
  const triad = tones.map((pc) => 48 + pc).sort((a, b) => a - b);
  return { bass, triad };
}

export interface BandEvent {
  /** Quarter beats from the start of the tune. */
  beat: number;
  midi: number[];
  beats: number;
}

/** What the band plays under a tune, in beat order. */
export function accompaniment(t: DuetTune, style: DuetStyle): BandEvent[] {
  const out: BandEvent[] = [];
  t.chords.forEach((bar, b) => {
    const names = bar.split(/\s+/);
    const span = BAR / names.length;
    names.forEach((name, k) => {
      const start = b * BAR + k * span;
      const { bass, triad } = voice(name);
      if (style === 'held') out.push({ beat: start, midi: [bass, ...triad], beats: span });
      else if (style === 'oompah') {
        for (let i = 0; i < span; i++) out.push({ beat: start + i, midi: (start + i) % 2 === 0 ? [bass] : triad, beats: 1 });
      } else {
        const pattern = [bass, triad[triad.length - 1], triad[1], triad[triad.length - 1]];
        for (let i = 0; i < span * 2; i++) out.push({ beat: start + i / 2, midi: [pattern[i % 4]], beats: i % 4 === 0 ? 1 : 0.5 });
      }
    });
  });
  return out;
}

export interface DuetSetup {
  tokens: NoteToken[];
  notes: EarNote[];
  events: BandEvent[];
  /** The tune's length in beats. */
  beats: number;
}

export function duetSetup(t: DuetTune, style: DuetStyle): DuetSetup {
  const tokens = tuneTokens(t.tune)!;
  return { tokens, notes: earNotes(tokens), events: accompaniment(t, style), beats: t.chords.length * BAR };
}

export interface DuetSound { event: BandEvent; time: number; durMs: number }
export type DuetPress = { kind: 'right'; index: number; done: boolean } | { kind: 'wrong' } | { kind: 'ignored' };

/** A gap this much longer than the tempo means the band waited, and is not learnt as the tempo. */
const WAIT = 1.5;

/** Follows the player through a tune and hands out what the band plays when. */
export class Duet {
  /** Index of the melody note to play next. */
  index = 0;
  /** Milliseconds a beat, learnt from the player. */
  msPerBeat: number;
  /** When each melody note was played (performance ms). */
  readonly hits: number[] = [];
  /** Wrong keys before each melody note. */
  readonly wrong: number[];
  /** Notes before which the band waited. */
  readonly waited = new Set<number>();
  private anchor?: { beat: number; time: number };
  private sent = 0;

  constructor(readonly setup: DuetSetup, bpm: number) {
    this.msPerBeat = 60000 / bpm;
    this.wrong = setup.notes.map(() => 0);
  }

  get notes() { return this.setup.notes; }
  get started() { return this.index > 0; }
  get done() { return this.index >= this.notes.length; }
  get bpm() { return Math.round(60000 / this.msPerBeat); }

  /** When the next melody note is due at the player's tempo; undefined before the start or after the end. */
  expected(): number | undefined {
    if (!this.anchor || this.done) return undefined;
    return this.anchor.time + (this.notes[this.index].at - this.anchor.beat) * this.msPerBeat;
  }

  /** True once the next note is well past due: the band is waiting. */
  waiting(now: number): boolean {
    const e = this.expected();
    return e !== undefined && now > e + this.msPerBeat * 0.35;
  }

  /** When the tune's last beat ends (after the last note is played). */
  endTime(): number | undefined {
    if (!this.done || !this.anchor) return undefined;
    return this.anchor.time + (this.setup.beats - this.anchor.beat) * this.msPerBeat;
  }

  /** A key pressed (written MIDI number, performance ms). The right note in another octave counts. */
  press(midi: number, time: number): DuetPress {
    if (this.done) return { kind: 'ignored' };
    const target = this.notes[this.index];
    const lowest = Math.min(...this.notes.map((n) => n.midi));
    // Keys well under the tune (the player's own left hand) are left alone.
    if (midi < lowest - 7) return { kind: 'ignored' };
    if (midi !== target.midi && !(Math.abs(midi - target.midi) === 12)) {
      if (!this.started) return { kind: 'ignored' };
      this.wrong[this.index]++;
      return { kind: 'wrong' };
    }
    const i = this.index;
    if (i > 0) {
      const gap = time - this.hits[i - 1];
      const beats = target.at - this.notes[i - 1].at;
      const measured = gap / beats;
      const ratio = measured / this.msPerBeat;
      if (ratio > WAIT) this.waited.add(i);
      else if (ratio > 0.6) this.msPerBeat = this.msPerBeat * 0.6 + measured * 0.4;
    }
    this.hits.push(time);
    this.anchor = { beat: target.at, time };
    // Anything the band had not played yet before this note is left out (the player came early).
    while (this.sent < this.setup.events.length && this.setup.events[this.sent].beat < target.at - 1e-6) this.sent++;
    this.index++;
    return { kind: 'right', index: i, done: this.done };
  }

  /** What the band plays from now until `until` (performance ms), each with its time and length. */
  due(until: number): DuetSound[] {
    const out: DuetSound[] = [];
    if (!this.anchor) return out;
    const limit = this.done ? Infinity : this.notes[this.index].at - 1e-6;
    const evs = this.setup.events;
    while (this.sent < evs.length) {
      const e = evs[this.sent];
      if (e.beat >= limit) break;
      const time = this.anchor.time + (e.beat - this.anchor.beat) * this.msPerBeat;
      if (time > until) break;
      out.push({ event: e, time, durMs: e.beats * this.msPerBeat });
      this.sent++;
    }
    return out;
  }

  report(): DuetReport | undefined {
    return duetReport(this.notes, this.hits, this.wrong);
  }
}

export interface DuetNote {
  index: number;
  /** Bar and beat (1-based) where the note starts. */
  bar: number;
  beat: number;
  /** How far off the player's own beat the gap before it was, in beats (+ held back, − hurried). */
  dev?: number;
  mark?: 'held' | 'hurried' | 'wait';
}

export interface DuetReport {
  score: number;
  tempo: { start: number; end: number; change: 'steady' | 'faster' | 'slower' };
  notes: DuetNote[];
  held: DuetNote[];
  hurried: DuetNote[];
  waits: DuetNote[];
  wrong: number;
  tips: string[];
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Where the player held back or hurried, against the beat of the notes around each one. */
export function duetReport(notes: EarNote[], hits: number[], wrong: number[]): DuetReport | undefined {
  const n = Math.min(notes.length, hits.length);
  if (n < 4) return undefined;
  // Milliseconds a beat over each gap.
  const per: number[] = [];
  for (let i = 1; i < n; i++) per.push((hits[i] - hits[i - 1]) / (notes[i].at - notes[i - 1].at));
  const out: DuetNote[] = [];
  let credit = 0;
  for (let i = 0; i < n; i++) {
    const at = notes[i].at;
    const note: DuetNote = { index: i, bar: Math.floor(at / BAR) + 1, beat: Math.round((at % BAR) * 2) / 2 + 1 };
    if (i > 0) {
      const g = i - 1;
      const around = per.slice(Math.max(0, g - 3), g + 4);
      const local = median(around);
      const beats = notes[i].at - notes[i - 1].at;
      const gap = hits[i] - hits[i - 1];
      note.dev = Math.round(((gap - beats * local) / local) * 100) / 100;
      if (gap > beats * local * WAIT && note.dev > 0.75) note.mark = 'wait';
      else if (note.dev > 0.25) note.mark = 'held';
      else if (note.dev < -0.2) note.mark = 'hurried';
      credit += note.mark === 'wait' ? 0 : Math.max(0, Math.min(1, 1 - (Math.abs(note.dev) - 0.08) / 0.42));
    }
    out.push(note);
  }
  const wrongs = wrong.slice(0, n).reduce((a, b) => a + b, 0);
  const score = Math.max(0, Math.min(100, Math.round((credit / (n - 1)) * 100 - wrongs * 3)));
  const third = Math.max(1, Math.floor(per.length / 3));
  const steady = per.filter((p) => p < median(per) * WAIT);
  const first = steady.slice(0, third), last = steady.slice(-third);
  const start = Math.round(60000 / median(first.length ? first : per));
  const end = Math.round(60000 / median(last.length ? last : per));
  const change = Math.abs(end - start) >= 4 && Math.abs(end - start) / start >= 0.06 ? (end > start ? 'faster' : 'slower') : 'steady';
  const by = (mark: DuetNote['mark']) => out.filter((x) => x.mark === mark).sort((a, b) => Math.abs(b.dev!) - Math.abs(a.dev!));
  const held = by('held'), hurried = by('hurried'), waits = out.filter((x) => x.mark === 'wait');
  const tips: string[] = [];
  const longBefore = hurried.filter((x) => notes[x.index].at - notes[x.index - 1].at >= 2);
  const leapBefore = [...held, ...waits].filter((x) => Math.abs(notes[x.index].midi - notes[x.index - 1].midi) >= 5);
  if (waits.length) tips.push(`The band waited for you ${waits.length === 1 ? 'once' : `${waits.length} times`} (${waits.slice(0, 3).map(place).join(', ')}). Look at the next note while you play this one, so it is ready under your finger.`);
  if (longBefore.length) tips.push(`Long notes got cut short (${longBefore.slice(0, 3).map((x) => `before ${place(x)}`).join(', ')}). Count them through: "1 2" for a half note, "1 2 3 4" for a whole one.`);
  if (leapBefore.length >= 2) tips.push('You held back before the bigger jumps. Move your hand while the note before is still sounding.');
  if (change === 'faster') tips.push(`You sped up from ${start} to ${end} a minute, and the band went with you. Pick a calmer first note and keep that pace.`);
  if (change === 'slower') tips.push(`You slowed down from ${start} to ${end} a minute. The band followed; try to keep the tempo you started with.`);
  if (wrongs) tips.push(`${wrongs} wrong ${wrongs === 1 ? 'key' : 'keys'}. The band waits, so there is no hurry: find the note, then play it.`);
  if (!tips.length) tips.push(score >= 92 ? 'Steady all through. Try another way of playing along, or a harder tune.' : 'Nearly even. Play it again and listen to the band: land each note with it.');
  return { score, tempo: { start, end, change }, notes: out, held: held.slice(0, 3), hurried: hurried.slice(0, 3), waits, wrong: wrongs, tips: tips.slice(0, 3) };
}

/** "bar 3, beat 2" */
export function place(x: DuetNote): string {
  return `bar ${x.bar}${x.beat !== 1 ? `, beat ${x.beat}` : ''}`;
}
