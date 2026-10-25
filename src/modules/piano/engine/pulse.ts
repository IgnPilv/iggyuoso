import type { Click } from './timedSession';

// The Timing mirror (#/pulse): a metronome that listens. Every key press is matched to the
// nearest beat (or half beat) and kept as an offset in ms, per hand, so the screen can show how
// early or late each hand lands and how steady it is. Silent bars (the click drops out) test the
// inner pulse. No DOM and no audio; times are on the performance.now() clock, latency as in
// TimedSession.

export type PulseHand = 'right' | 'left';

export interface PulseOptions {
  /** Beats per minute. */
  tempo: number;
  beatsPerBar: number;
  /** 1 = presses go on the beat, 2 = on the beat or halfway. */
  sub: 1 | 2;
  /** When the first count-in click sounds. */
  startAt: number;
  latencyMs: number;
  /** Bars of count-in, always clicked. */
  countInBars?: number;
  /** Bars with the click, then bars without, over and over (after the count-in). */
  silent?: { play: number; rest: number };
}

export interface PulseHit {
  hand: PulseHand;
  /** Positive = late, negative = early. */
  offsetMs: number;
  /** Which beat or half beat it was meant for, from 0 at the first downbeat. */
  step: number;
  /** Played in a bar without the click. */
  silent: boolean;
}

/** Notes of one hand this close together are one chord, timed from the first. */
export const CHORD_MS = 60;

export class Pulse {
  readonly beatMs: number;
  readonly stepMs: number;
  /** First downbeat after the count-in, as scheduled. */
  readonly t0: number;
  readonly hits: PulseHit[] = [];
  private lastOn: Partial<Record<PulseHand, number>> = {};

  constructor(readonly opts: PulseOptions) {
    this.beatMs = 60000 / opts.tempo;
    this.stepMs = this.beatMs / opts.sub;
    this.t0 = opts.startAt + (opts.countInBars ?? 1) * opts.beatsPerBar * this.beatMs;
  }

  /** Ms from the first downbeat of a key event at performance time `time`. */
  songTime(time: number) {
    return time - this.t0 - this.opts.latencyMs;
  }

  /** Bar (from 0 at the first downbeat; negative in the count-in) at song ms `ms`. */
  barAt(ms: number) {
    return Math.floor(ms / (this.opts.beatsPerBar * this.beatMs));
  }

  /** The click drops out in this bar. */
  isSilent(bar: number) {
    const s = this.opts.silent;
    if (!s || bar < 0 || s.rest <= 0) return false;
    return bar % (s.play + s.rest) >= s.play;
  }

  /** Beat number in the bar (1-based) and bar at performance time `now`. */
  position(now: number) {
    const ms = now - this.t0;
    const beat = Math.floor(ms / this.beatMs + 1e-6);
    const bar = Math.floor(beat / this.opts.beatsPerBar);
    return { bar, beat: beat - bar * this.opts.beatsPerBar + 1, silent: this.isSilent(bar), countIn: ms < 0 };
  }

  /** Clicks (one per beat, accent on the downbeat) from `from` (exclusive) to `to`, skipping silent bars. */
  clicks(from: number, to: number): Click[] {
    const out: Click[] = [];
    const first = Math.floor((from - this.opts.startAt) / this.beatMs) + 1;
    for (let i = Math.max(0, first); ; i++) {
      const time = this.opts.startAt + i * this.beatMs;
      if (time > to) break;
      if (time <= from) continue;
      const beat = Math.round((time - this.t0) / this.beatMs);
      const bar = Math.floor(beat / this.opts.beatsPerBar);
      if (this.isSilent(bar)) continue;
      out.push({ time, accent: ((beat % this.opts.beatsPerBar) + this.opts.beatsPerBar) % this.opts.beatsPerBar === 0 });
    }
    return out;
  }

  /**
   * A key went down. Returns the hit, or nothing for a press in the count-in or a later note of a
   * chord. The right hand is middle C and up (written MIDI ≥ 60).
   */
  press(writtenMidi: number, time: number): PulseHit | undefined {
    const hand: PulseHand = writtenMidi >= 60 ? 'right' : 'left';
    const last = this.lastOn[hand];
    if (last !== undefined && time - last < CHORD_MS) return undefined;
    this.lastOn[hand] = time;
    const ms = this.songTime(time);
    if (ms < -this.stepMs / 2) return undefined;
    const step = Math.max(0, Math.round(ms / this.stepMs));
    const hit: PulseHit = { hand, offsetMs: Math.round(ms - step * this.stepMs), step, silent: this.isSilent(this.barAt(step * this.stepMs)) };
    this.hits.push(hit);
    return hit;
  }
}

export interface PulseStats {
  count: number;
  /** Mean offset (positive = late). */
  mean: number;
  /** Standard deviation of the offsets: how far presses wander around their own average. */
  spread: number;
}

export function pulseStats(hits: PulseHit[]): PulseStats | undefined {
  if (!hits.length) return undefined;
  const mean = hits.reduce((a, h) => a + h.offsetMs, 0) / hits.length;
  const spread = Math.sqrt(hits.reduce((a, h) => a + (h.offsetMs - mean) ** 2, 0) / hits.length);
  return { count: hits.length, mean: Math.round(mean), spread: Math.round(spread) };
}

/** "on the beat", "25 ms late", "40 ms early". */
export function leanWords(mean: number) {
  if (Math.abs(mean) < 15) return 'on the beat';
  return `${Math.abs(mean)} ms ${mean > 0 ? 'late' : 'early'}`;
}

/** How steady a spread is, in words. */
export function steadyWords(spread: number) {
  if (spread < 20) return 'rock steady';
  if (spread < 35) return 'steady';
  if (spread < 60) return 'a little uneven';
  return 'uneven';
}

/**
 * What the silent bars showed: did the hand drift ahead or fall behind without the click?
 * Needs at least three presses with and three without.
 */
export function silentDrift(hits: PulseHit[]): { drift: number; words: string } | undefined {
  const heard = pulseStats(hits.filter((h) => !h.silent));
  const quiet = pulseStats(hits.filter((h) => h.silent));
  if (!heard || !quiet || heard.count < 3 || quiet.count < 3) return undefined;
  const drift = quiet.mean - heard.mean;
  const words = Math.abs(drift) < 20 ? 'Your pulse held in the silent bars.'
    : drift < 0 ? `In the silent bars you pushed ahead by ${-drift} ms (rushing).`
      : `In the silent bars you held back by ${drift} ms (dragging).`;
  return { drift, words };
}

/** Beats per minute from tap times (ms), using the last few gaps. */
export function tapTempo(taps: number[]): number | undefined {
  const recent = taps.slice(-6);
  if (recent.length < 3) return undefined;
  const gaps = recent.slice(1).map((t, i) => t - recent[i]);
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  if (mean <= 0) return undefined;
  return Math.max(30, Math.min(240, Math.round(60000 / mean)));
}
