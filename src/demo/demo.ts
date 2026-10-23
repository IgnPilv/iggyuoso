import { calibrate, type Calibration } from '../calibration';
import type { TimedSession } from '../engine/timedSession';
import type { FindSession, SequenceSession } from '../scoring/untimed';

// Demo mode: the app runs on a virtual 88-key keyboard played by the demo pianist, so it can be
// shown without a MIDI keyboard. Nothing is saved while it is on.
//
// Keep the demo current: every user-facing feature should show up in the demo tour
// (src/ui/demoView.ts) or be reachable from its exercise list.

const r = calibrate(21, 108);
if (!r.ok) throw new Error(r.error);
export const DEMO_CALIBRATION: Calibration = r.calibration;

export const demo = {
  active: false,
  /** Called by the players when a run starts, so the pianist knows what to play. */
  onTimed: undefined as ((s: TimedSession) => void) | undefined,
  onFind: undefined as ((s: FindSession) => void) | undefined,
  onSequence: undefined as ((s: SequenceSession) => void) | undefined,
  /** Called by ear, quiz and build when a question is ready to answer. */
  onAsk: undefined as ((a: DemoAsk) => void) | undefined,
  /** Called when a timed Listen or Play run ends. */
  onRunEnd: undefined as ((mode: 'listen' | 'play') => void) | undefined,
};

/** What the pianist needs to answer one question. */
export interface DemoAsk {
  /** Question number, from 0 (the pianist slips on one). */
  index: number;
  /** Device keys to play, in order (or all at once with `together`). */
  keys?: number[];
  together?: boolean;
  /** The right button, and how to press one. */
  correct?: number;
  choices?: number;
  choose?: (i: number) => void;
  /** Wait this long (the prompt is still sounding). */
  waitMs: number;
}

export function stopDemo() {
  demo.active = false;
  demo.onTimed = demo.onFind = demo.onSequence = demo.onRunEnd = demo.onAsk = undefined;
}
