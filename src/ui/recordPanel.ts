import { audio, click, outputLatencyMs, piano, stopAll } from '../audio/audio';
import type { Calibration } from '../calibration';
import { Recorder } from '../engine/recorder';
import { midi } from '../midi/input';
import type { Meter } from '../music/notes';
import { store } from '../progress/store';
import { animate } from './players';
import { h } from './dom';

// Recording a take: a bar of count-in, clicks that keep going (or stop after the count-in), an
// optional backing the app plays, and a status line ("3 4", "Bar 2 of 8"). Used by the
// Sketchbook and by improvising exercises.

/** A note the app plays under the take, in quarter beats from the first downbeat. */
export interface BackingNote { midi: number; beat: number; beats: number }

export interface RecordOptions {
  tempo: number;
  meter: Meter;
  click: 'on' | 'count-in' | 'off';
  countInBars?: number;
  maxBars?: number;
  backing?: BackingNote[];
  /** Words for the status line while recording, given the bar (from 0). */
  barText?: (bar: number) => string;
}

export interface RecordRun {
  rec: Recorder;
  stop: () => void;
}

/** Starts a take now. `onDone` gets the finished recorder (after Stop or at `maxBars`). */
export function startTake(cal: Calibration, o: RecordOptions, status: HTMLElement, onDone: (rec: Recorder) => void, onStart?: (rec: Recorder) => void): RecordRun {
  audio();
  const startAt = performance.now() + 500;
  const rec = new Recorder(cal, {
    tempo: o.tempo, meter: o.meter, startAt, latencyMs: outputLatencyMs() + store.settings.latencyMs,
    countInBars: o.countInBars ?? 1, maxBars: o.maxBars,
  });
  for (const b of o.backing ?? []) piano(b.midi, rec.t0 + b.beat * rec.beatMs, b.beats * rec.beatMs * 0.95, 0.45);
  let clickedTo = startAt - 1;
  const offNotes = midi.onNote((e) => (e.type === 'on' ? rec.noteOn(e.note, e.time, e.velocity) : rec.noteOff(e.note, e.time)));
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    stopAnim();
    offNotes();
    stopAll();
    rec.stop(performance.now());
    status.textContent = '';
    onDone(rec);
  };
  const stopAnim = animate((now) => {
    if (o.click !== 'off') {
      const to = now + 400;
      for (const c of rec.clicks(clickedTo, to, o.click === 'count-in')) click(c.time, c.accent);
      clickedTo = to;
    }
    const phase = rec.phase(now);
    if (phase === 'done') { finish(); return; }
    const beat = rec.beat(now);
    const { quarters, pulse } = o.meter;
    if (phase === 'count-in') {
      const q = ((beat % quarters) + quarters) % quarters;
      status.textContent = `Count-in: ${Math.floor(q / pulse + 1e-6) + 1}`;
    } else {
      const bar = Math.floor(beat / quarters);
      status.textContent = o.barText?.(bar) ?? `Recording · bar ${bar + 1}${o.maxBars ? ` of ${o.maxBars}` : ''}`;
    }
  });
  onStart?.(rec);
  return { rec, stop: finish };
}

/** Play a take back as it was played, at its own timing. Returns a stop function. */
export function playBack(notes: { midi: number; on: number; off?: number }[], onEnd?: () => void, light?: (midi: number, on: boolean) => void): () => void {
  audio();
  const start = performance.now() + 300 - Math.min(0, ...notes.map((n) => n.on));
  const timers: number[] = [];
  let end = 0;
  for (const n of notes) {
    const dur = Math.max(120, (n.off ?? n.on + 500) - n.on);
    piano(n.midi, start + n.on, dur, 0.55);
    end = Math.max(end, n.on + dur);
    if (light) {
      timers.push(window.setTimeout(() => light(n.midi, true), start + n.on - performance.now()));
      timers.push(window.setTimeout(() => light(n.midi, false), start + n.on + dur - performance.now()));
    }
  }
  timers.push(window.setTimeout(() => onEnd?.(), start + end + 400 - performance.now()));
  return () => { timers.forEach(clearTimeout); stopAll(); onEnd?.(); };
}

export const recordButton = (label = 'Record') => h('button', { class: 'record-btn' }, h('span', { class: 'rec-dot', 'aria-hidden': 'true' }), label);
