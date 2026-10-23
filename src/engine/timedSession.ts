import { toWritten, type Calibration } from '../calibration';
import type { TimedExercise } from '../content/types';
import { pitchClass } from '../music/notes';
import { beatMs, expectedNotes, expectedPedal, totalBeats, type ExpectedNote, type PedalSpan } from '../music/timeline';
import { PEDAL_WEIGHT, pedalMessages, scorePedal, type PedalPress } from '../scoring/pedal';
import { stars } from '../scoring/stars';
import { hitWindowMs, scoreTimed, type PlayedNote, type TimedResult } from '../scoring/timed';

// One run of a timed exercise: the clock, the count-in, what to play when, and the notes the
// player pressed. No DOM and no audio here; screens read the clock and draw, the audio module
// plays the schedule. All times are on the performance.now() clock, in ms.
//
// Sound scheduled for time S reaches the player's ears at S + latency, and they play along with
// what they hear. So the song position the player experiences is (now - latency), and a key
// press at time T belongs to song time T - latency.

export interface TimedSessionOptions {
  /** Tempo actually played, in beats per minute (may be slower than written). */
  tempo: number;
  /** When the first count-in click sounds (before latency). */
  startAt: number;
  /** Audio output latency plus the player's own adjustment. */
  latencyMs: number;
  mode: 'listen' | 'play';
  /** The player's count-in: a full bar (the exercise's `countIn` bars), the last two beats, or none. */
  countIn?: CountIn;
}

export type CountIn = 'bar' | 'short' | 'none';
export const COUNT_INS: CountIn[] = ['bar', 'short', 'none'];

/** Quarter beats of count-in. "none" still leaves one silent beat to get ready. */
export function countInBeats({ meter, countIn }: Pick<TimedExercise, 'meter' | 'countIn'>, choice: CountIn = 'bar'): number {
  const pulses = Math.round(meter.quarters / meter.pulse);
  if (choice === 'none') return meter.pulse;
  if (choice === 'short') return (pulses <= 2 ? 1 : 2) * meter.pulse;
  return Math.max(1, countIn) * meter.quarters;
}

export type Phase = 'waiting' | 'count-in' | 'playing' | 'done';

export interface Position {
  phase: Phase;
  /** Beats from the first downbeat; negative during the count-in. */
  beat: number;
  /** 1-based count during the count-in ("1, 2, 3, 4"). */
  count?: number;
}

export interface Click { time: number; accent: boolean }
export interface GuideNote { midi: number; time: number; durMs: number; note: ExpectedNote }

/** What a single key press looked like the moment it happened. */
export interface PressJudgement {
  kind: 'hit' | 'wrong' | 'extra';
  device: number;
  /** For a hit: signed ms, negative = early. */
  offsetMs?: number;
  /** The note it was aimed at (hit or wrong). */
  expected?: ExpectedNote;
}

/** Running totals while playing. */
export interface LiveScore {
  score: number;
  hits: number;
  wrong: number;
  missed: number;
  extras: number;
  perHand: Partial<Record<'right' | 'left', number>>;
}

/** Live state of an expected note, for drawing. */
export type LiveState = 'coming' | 'now' | 'hit' | 'missed';

export class TimedSession {
  readonly expected: ExpectedNote[];
  /** Milliseconds per quarter beat. */
  readonly beatMs: number;
  readonly quarterTempo: number;
  readonly countBeats: number;
  readonly totalBeats: number;
  /** First downbeat after the count-in, as scheduled. */
  readonly t0: number;
  readonly end: number;
  readonly windowMs: number;
  readonly played: PlayedNote[] = [];
  readonly pedalLine: PedalSpan[];
  /** Pedal presses and lifts, in song time. */
  readonly pedal: PedalPress[] = [];
  /** Whether the pedal was already down when the run started. */
  private pedalAtStart = false;
  private open = new Map<number, PlayedNote>();

  constructor(readonly ex: TimedExercise, readonly cal: Calibration, readonly opts: TimedSessionOptions) {
    this.expected = expectedNotes(ex);
    this.pedalLine = expectedPedal(ex);
    // The tempo counts the meter's beat (a dotted quarter in 6/8); timing works in quarters.
    this.quarterTempo = opts.tempo * ex.meter.pulse;
    this.beatMs = beatMs(this.quarterTempo);
    this.countBeats = countInBeats(ex, opts.countIn);
    this.totalBeats = totalBeats(ex);
    this.t0 = opts.startAt + this.countBeats * this.beatMs;
    this.windowMs = hitWindowMs(this.quarterTempo);
    this.end = this.t0 + this.totalBeats * this.beatMs + this.windowMs + opts.latencyMs + 200;
  }

  /**
   * Count-in clicks (unless the count-in is none, or the exercise says `click: off`); beat clicks
   * while playing only with the metronome on, and never with `click: count-in` or `off`.
   */
  clicks(metronome: boolean): Click[] {
    const { quarters: q, pulse } = this.ex.meter;
    const out: Click[] = [];
    // Accents on the bar lines, counted back from the first downbeat ("3 4" leads into "1").
    const accent = (b: number) => Math.abs(b / q - Math.round(b / q)) < 1e-6;
    const click = this.ex.click ?? 'on';
    if (click !== 'off' && this.opts.countIn !== 'none') {
      for (let b = 0; b < this.countBeats - 1e-6; b += pulse) out.push({ time: this.opts.startAt + b * this.beatMs, accent: accent(b - this.countBeats) });
    }
    if (metronome && click === 'on') for (let b = 0; b < this.totalBeats - 1e-6; b += pulse) out.push({ time: this.t0 + b * this.beatMs, accent: accent(b) });
    return out;
  }

  guide(): GuideNote[] {
    return this.expected.map((note) => ({
      midi: note.midi, time: this.t0 + note.beat * this.beatMs, durMs: note.beats * this.beatMs * 0.92, note,
    }));
  }

  /** Where the player is in the music at a moment on the performance clock. */
  position(now: number): Position {
    const heard = now - this.opts.latencyMs;
    const beat = (heard - this.t0) / this.beatMs;
    if (now >= this.end) return { phase: 'done', beat };
    if (heard < this.opts.startAt) return { phase: 'waiting', beat };
    if (beat < 0) {
      if (this.opts.countIn === 'none') return { phase: 'count-in', beat };
      const { quarters, pulse } = this.ex.meter;
      // Counted as beats of the bar before the downbeat: a short count-in in 4/4 says "3, 4".
      const q = (((beat % quarters) + quarters) % quarters);
      return { phase: 'count-in', beat, count: Math.floor(q / pulse + 1e-6) + 1 };
    }
    return { phase: 'playing', beat };
  }

  /** Song time in ms (0 = first downbeat) of a key event at performance time `time`. */
  songTime(time: number): number {
    return time - this.t0 - this.opts.latencyMs;
  }

  noteOn(device: number, time: number): PressJudgement | undefined {
    if (this.opts.mode !== 'play') return undefined;
    const n: PlayedNote = { midi: toWritten(this.cal, device), on: this.songTime(time) };
    this.played.push(n);
    this.open.set(n.midi, n);
    if (n.on < -this.windowMs) return undefined; // count-in
    return this.judge(n, device);
  }

  private judge(n: PlayedNote, device: number): PressJudgement {
    let best: ExpectedNote | undefined;
    let bestD = Infinity;
    let near: ExpectedNote | undefined;
    let nearD = Infinity;
    for (const e of this.expected) {
      const d = Math.abs(n.on - e.beat * this.beatMs);
      if (d > this.windowMs) continue;
      if (this.samePitch(e.midi, n.midi) && d < bestD) { best = e; bestD = d; }
      if (d + Math.abs(e.midi - n.midi) < nearD) { near = e; nearD = d + Math.abs(e.midi - n.midi); }
    }
    if (best) return { kind: 'hit', device, expected: best, offsetMs: Math.round(n.on - best.beat * this.beatMs) };
    if (near) return { kind: 'wrong', device, expected: near };
    return { kind: 'extra', device };
  }

  /** The pedal state when the run starts (it may already be down). */
  pedalStart(down: boolean) {
    this.pedalAtStart = down;
  }

  pedalChange(down: boolean, time: number) {
    if (this.opts.mode !== 'play') return;
    this.pedal.push({ down, at: this.songTime(time) });
  }

  noteOff(device: number, time: number) {
    const w = toWritten(this.cal, device);
    const n = this.open.get(w);
    if (n) { n.off = this.songTime(time); this.open.delete(w); }
  }

  private samePitch(a: number, b: number) {
    if (this.ex.pitchMatch === 'any') return true;
    if (this.ex.pitchMatch === 'side') return (a >= 60) === (b >= 60);
    return this.ex.pitchMatch === 'pitchClass' ? pitchClass(a) === pitchClass(b) : a === b;
  }

  /** Rough live state for drawing: the full scoring runs at the end. */
  liveState(e: ExpectedNote, beat: number): LiveState {
    const t = e.beat * this.beatMs;
    const sounding = beat >= e.beat && beat < e.beat + e.beats;
    if (this.opts.mode === 'listen') return sounding ? 'now' : beat >= e.beat ? 'hit' : 'coming';
    const hit = this.played.some((p) => Math.abs(p.on - t) <= this.windowMs && this.samePitch(p.midi, e.midi));
    if (hit) return 'hit';
    if (beat * this.beatMs > t + this.windowMs) return 'missed';
    return sounding ? 'now' : 'coming';
  }

  /** Score so far: only notes whose time has fully passed count. */
  liveScore(now: number): LiveScore {
    const songMs = this.songTime(now);
    const done = this.expected.filter((e) => e.beat * this.beatMs + this.windowMs < songMs);
    const doneSet = new Set(done);
    // A press belongs to the finished part unless its nearest note is still to come.
    const played = this.played.filter((p) => {
      let nearest: ExpectedNote | undefined;
      let d = Infinity;
      for (const e of this.expected) {
        const x = Math.abs(p.on - e.beat * this.beatMs);
        if (x < d) { d = x; nearest = e; }
      }
      return !nearest || doneSet.has(nearest) || d > this.windowMs;
    });
    if (!done.length) return { score: 100, hits: 0, wrong: 0, missed: 0, extras: 0, perHand: {} };
    const r = scoreTimed(done, played, { tempo: this.quarterTempo, pitchMatch: this.ex.pitchMatch });
    const sum = (k: 'hits' | 'wrong' | 'misses' | 'extras') => r.hands.reduce((s, h) => s + h[k], 0);
    return {
      score: r.score,
      hits: sum('hits'),
      wrong: sum('wrong'),
      missed: sum('misses'),
      extras: r.extras.length,
      perHand: Object.fromEntries(r.hands.map((h) => [h.hand, h.score])),
    };
  }

  result(): TimedResult {
    const r = scoreTimed(this.expected, this.played, { tempo: this.quarterTempo, pitchMatch: this.ex.pitchMatch });
    if (!this.pedalLine.length) return r;
    const pedal = scorePedal(this.pedalLine, this.pedal, { beatMs: this.beatMs, windowMs: this.windowMs, initialDown: this.pedalAtStart });
    const score = Math.round((1 - PEDAL_WEIGHT) * r.score + PEDAL_WEIGHT * pedal.score);
    const messages = pedalMessages(pedal).map((message) => ({ habit: 'pedal' as const, message }));
    const feedback = messages.length ? [...r.feedback.filter((f) => f.habit !== 'clean'), ...messages] : r.feedback;
    return { ...r, score, stars: stars(score), feedback, pedal };
  }
}
