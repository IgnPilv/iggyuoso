// Wait for me (a Practice option): the music moves on at the tempo, but stops at each note or
// chord until its keys have been pressed, Synthesia's "wait" mode. No timing is judged and
// nothing is saved; a round only counts notes, wrong keys and how often the music had to wait.
// No DOM here: the timed player reads the clock and the step's keys and draws them.
//
// A step is every note that starts on the same beat (both hands together). Its keys may be
// pressed one at a time, in any order, and a key counts once pressed (it can be let go again).
// Keys of the step may also be pressed before the clock gets there: the clock then jumps on.

import type { LiveState } from './timedSession';

export interface WaitNote { beat: number; beats: number }

export interface WaitStep {
  beat: number;
  /** Indices into the notes. */
  notes: number[];
}

export type WaitPress =
  | { kind: 'hit'; note: number; advanced: boolean }
  | { kind: 'again' }
  | { kind: 'wrong' };

export interface WaitResult {
  notes: number;
  steps: number;
  wrong: number;
  /** Steps played with no wrong key on the way. */
  cleanSteps: number;
  /** Steps where the music got there first and had to stop. */
  waits: number;
  ms: number;
}

const SAME_BEAT = 1e-3;

export function waitSteps(notes: WaitNote[]): WaitStep[] {
  const order = notes.map((_, i) => i).sort((a, b) => notes[a].beat - notes[b].beat);
  const steps: WaitStep[] = [];
  for (const i of order) {
    const last = steps[steps.length - 1];
    if (last && Math.abs(notes[i].beat - last.beat) < SAME_BEAT) last.notes.push(i);
    else steps.push({ beat: notes[i].beat, notes: [i] });
  }
  return steps;
}

export class WaitSession {
  readonly steps: WaitStep[];
  /** The step being waited for (= steps.length when done). */
  current = 0;
  private pressed = new Set<number>();
  private stepOf: number[];
  private anchorBeat: number;
  private anchorTime: number;
  private frozen: number | undefined;
  private startTime: number;
  private endTime: number | undefined;
  private wrongHere = false;
  private waitedHere = false;
  private counts = { wrong: 0, cleanSteps: 0, waits: 0 };

  /**
   * `devices`: the key each note is played on. The clock starts `leadBeats` before the first
   * step (so the first notes are seen coming) at `startAt`, and runs at `beatMs` per beat.
   */
  constructor(readonly notes: WaitNote[], readonly devices: number[], readonly beatMs: number, startAt: number, leadBeats = 1) {
    this.steps = waitSteps(notes);
    this.stepOf = [];
    this.steps.forEach((s, k) => s.notes.forEach((i) => { this.stepOf[i] = k; }));
    this.anchorBeat = (this.steps[0]?.beat ?? 0) - leadBeats;
    this.anchorTime = startAt;
    this.startTime = startAt;
  }

  get done() { return this.current >= this.steps.length; }
  get paused() { return this.frozen !== undefined; }

  /** Where the music is: running at the tempo, held at the step being waited for. */
  beat(now: number): number {
    if (this.frozen !== undefined) return this.frozen;
    const free = this.anchorBeat + Math.max(0, now - this.anchorTime) / this.beatMs;
    const cap = this.steps[this.current]?.beat;
    return cap === undefined ? free : Math.min(free, cap);
  }

  /** The music has reached the step and stands still until it is played. */
  waiting(now: number): boolean {
    const step = this.steps[this.current];
    return !!step && !this.paused && this.beat(now) >= step.beat - 1e-9;
  }

  pause(now: number) {
    if (this.frozen === undefined) this.frozen = this.beat(now);
  }

  resume(now: number) {
    if (this.frozen === undefined) return;
    this.anchorBeat = this.frozen;
    this.anchorTime = now;
    this.frozen = undefined;
  }

  press(device: number, now: number): WaitPress {
    const step = this.steps[this.current];
    if (!step || this.paused) return { kind: 'again' };
    const note = step.notes.find((i) => !this.pressed.has(i) && this.devices[i] === device);
    if (note === undefined) {
      if (step.notes.some((i) => this.devices[i] === device)) return { kind: 'again' };
      this.wrongHere = true;
      this.counts.wrong++;
      return { kind: 'wrong' };
    }
    if (this.waiting(now)) this.waitedHere = true;
    this.pressed.add(note);
    const advanced = step.notes.every((i) => this.pressed.has(i));
    if (advanced) this.advance(now);
    return { kind: 'hit', note, advanced };
  }

  private advance(now: number) {
    const step = this.steps[this.current];
    // Played ahead of the clock: the music jumps on to the step just played.
    this.anchorBeat = Math.max(this.beat(now), step.beat);
    this.anchorTime = now;
    if (this.waitedHere) this.counts.waits++;
    if (!this.wrongHere) this.counts.cleanSteps++;
    this.wrongHere = this.waitedHere = false;
    this.pressed.clear();
    this.current++;
    if (this.done) this.endTime = now;
  }

  /** How a note is drawn: played (or pressed in this step), waited for, or still to come. */
  noteState(i: number): LiveState {
    const k = this.stepOf[i];
    if (k < this.current || (k === this.current && this.pressed.has(i))) return 'hit';
    return k === this.current ? 'now' : 'coming';
  }

  /** The current step's notes: keys already pressed and keys still to play. */
  stepKeys(): { pressed: number[]; remaining: number[] } {
    const step = this.steps[this.current];
    if (!step) return { pressed: [], remaining: [] };
    return {
      pressed: step.notes.filter((i) => this.pressed.has(i)),
      remaining: step.notes.filter((i) => !this.pressed.has(i)),
    };
  }

  result(now: number): WaitResult {
    return {
      notes: this.notes.length,
      steps: this.steps.length,
      wrong: this.counts.wrong,
      cleanSteps: this.counts.cleanSteps,
      waits: this.counts.waits,
      ms: Math.max(0, (this.endTime ?? now) - this.startTime),
    };
  }
}

/** The words for a finished round: "32 notes, 2 wrong keys, the music waited 5 times, 0:48". */
export function waitSummary(r: WaitResult): string {
  const s = Math.round(r.ms / 1000);
  const time = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const wrong = r.wrong ? `${r.wrong} wrong ${r.wrong === 1 ? 'key' : 'keys'}` : 'no wrong keys';
  const waits = r.waits ? `the music waited ${r.waits} ${r.waits === 1 ? 'time' : 'times'}` : 'it never had to wait';
  return `${r.notes} ${r.notes === 1 ? 'note' : 'notes'}, ${wrong}, ${waits}, ${time}`;
}
