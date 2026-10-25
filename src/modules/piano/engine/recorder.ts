import { toWritten, type Calibration } from '../calibration';
import type { Meter } from '../music/notes';
import { transcribe, type CapturedNote, type Transcription } from '../music/transcribe';
import type { Click } from './timedSession';

// A free-play take: a bar of count-in, then everything the player presses is kept, on a grid of
// the chosen tempo, until Stop (or `maxBars`). No DOM and no audio; the screen schedules the
// clicks and draws. Times are on the performance.now() clock; latency works as in TimedSession.

export interface RecorderOptions {
  /** Beats per minute of the meter's beat (dotted quarters in 6/8). */
  tempo: number;
  meter: Meter;
  /** When the first count-in click sounds. */
  startAt: number;
  latencyMs: number;
  /** Bars of count-in (0 = start at once, with no clicks before). */
  countInBars?: number;
  /** The take stops by itself after this many bars. */
  maxBars?: number;
}

export type RecorderPhase = 'count-in' | 'recording' | 'done';

export class Recorder {
  /** Milliseconds per quarter beat. */
  readonly beatMs: number;
  /** First downbeat, as scheduled. */
  readonly t0: number;
  readonly notes: CapturedNote[] = [];
  private open = new Map<number, CapturedNote>();
  private stoppedAt?: number;

  constructor(readonly cal: Calibration, readonly opts: RecorderOptions) {
    this.beatMs = 60000 / (opts.tempo * opts.meter.pulse);
    this.t0 = opts.startAt + (opts.countInBars ?? 1) * opts.meter.quarters * this.beatMs;
  }

  /** Song ms of a key event at performance time `time`. */
  songTime(time: number) {
    return time - this.t0 - this.opts.latencyMs;
  }

  get maxMs() {
    return (this.opts.maxBars ?? 64) * this.opts.meter.quarters * this.beatMs;
  }

  phase(now: number): RecorderPhase {
    if (this.stoppedAt !== undefined || this.songTime(now) >= this.maxMs) return 'done';
    return this.songTime(now) < 0 ? 'count-in' : 'recording';
  }

  /** Quarter beats from the first downbeat (negative in the count-in). */
  beat(now: number) {
    return this.songTime(now) / this.beatMs;
  }

  /** Clicks (one per counted beat, accents on bar lines) from `from` to `to` on the performance clock. */
  clicks(from: number, to: number, countInOnly = false): Click[] {
    const { quarters, pulse } = this.opts.meter;
    const step = pulse * this.beatMs;
    const out: Click[] = [];
    const first = Math.ceil((from - this.opts.startAt) / step - 1e-6);
    for (let i = Math.max(0, first); ; i++) {
      const time = this.opts.startAt + i * step;
      if (time >= to) break;
      if (countInOnly && time >= this.t0 - 1) break;
      const q = (time - this.t0) / this.beatMs;
      out.push({ time, accent: Math.abs(q / quarters - Math.round(q / quarters)) < 1e-6 });
    }
    return out;
  }

  noteOn(device: number, time: number, velocity = 64) {
    if (this.stoppedAt !== undefined) return;
    const n: CapturedNote = { midi: toWritten(this.cal, device), on: this.songTime(time), velocity };
    if (n.on >= this.maxMs) return;
    this.notes.push(n);
    this.open.set(n.midi, n);
  }

  noteOff(device: number, time: number) {
    const w = toWritten(this.cal, device);
    const n = this.open.get(w);
    if (n) { n.off = this.songTime(time); this.open.delete(w); }
  }

  /** End the take: keys still held are let go now. */
  stop(time: number) {
    if (this.stoppedAt !== undefined) return;
    this.stoppedAt = time;
    const end = Math.min(this.songTime(time), this.maxMs);
    for (const n of this.open.values()) n.off = end;
    this.open.clear();
  }

  /** Presses that belong to the take (not count-in noise before the first downbeat). */
  take(): CapturedNote[] {
    return this.notes.filter((n) => n.on >= -this.beatMs / 2);
  }

  written(key: string, grid = 0.5): Transcription {
    return transcribe(this.take(), { beatMs: this.beatMs, meter: this.opts.meter, key, grid });
  }
}
