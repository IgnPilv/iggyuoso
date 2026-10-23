import { toDevice } from '../calibration';
import type { TimedSession } from '../engine/timedSession';
import { computerKeys } from '../midi/computerKeys';
import { midi } from '../midi/input';
import { isBlack } from '../music/notes';
import type { DemoAsk } from './demo';
import type { FindSession, SequenceSession } from '../scoring/untimed';

// The demo pianist plays exercises through the same MIDI path as a real keyboard. It plays mostly
// well, with a few deliberate slips so the live feedback has something to show.

export class Pianist {
  private timers: number[] = [];
  private held = new Set<number>();
  private pedal = false;

  private setPedal(down: boolean) {
    if (down === this.pedal) return;
    this.pedal = down;
    midi.injectPedal(down);
  }

  private at(ms: number, fn: () => void) {
    this.timers.push(window.setTimeout(fn, Math.max(0, ms)));
  }

  /** Press a key `startIn` ms from now and hold it. */
  playNote(note: number, startIn: number, holdMs: number) {
    this.at(startIn, () => { midi.inject('on', note); this.held.add(note); });
    this.at(startIn + holdMs, () => { midi.inject('off', note); this.held.delete(note); });
  }

  playChord(notes: number[], startIn: number, holdMs: number) {
    notes.forEach((n, i) => this.playNote(n, startIn + i * 12, holdMs));
  }

  /** Type a computer-keyboard key (by KeyboardEvent.code), as a player would with the emulator on. */
  typeKey(code: string, startIn: number, holdMs: number, onKey?: (code: string, down: boolean) => void) {
    this.at(startIn, () => { computerKeys.press(code); onKey?.(code, true); });
    this.at(startIn + holdMs, () => { computerKeys.release(code); onKey?.(code, false); });
  }

  stop() {
    computerKeys.releaseAll();
    this.timers.forEach(clearTimeout);
    this.timers = [];
    for (const n of this.held) midi.inject('off', n);
    this.held.clear();
    this.setPedal(false);
  }

  /** Plays along with a timed run: one wrong key, one late note, one missed note, small jitter. */
  playTimed(s: TimedSession, opts: { slips: boolean } = { slips: true }) {
    const now = performance.now();
    s.guide().forEach((g, i) => {
      let note = toDevice(s.cal, g.midi);
      let offset = Math.round(Math.sin(i * 2.3) * 22); // a human-ish wobble, ±22 ms
      if (opts.slips && s.expected.length >= 6) {
        if (i === 2) note = nextWhite(note);        // wrong key
        if (i === 4) offset = 140;                  // late
        if (i === 6 && s.expected.length >= 9) return; // missed
      }
      this.playNote(note, g.time + s.opts.latencyMs + offset - now, g.durMs * 0.9);
    });
    // Legato pedal: lift as each chord sounds and press again just after. Holds through the
    // second change, so the pedal feedback has something to show.
    const at = (beat: number) => s.t0 + s.opts.latencyMs + beat * s.beatMs - now;
    let changes = 0;
    s.pedalLine.forEach((sp, i) => {
      const slip = opts.slips && sp.change && ++changes === 2;
      if (!slip) {
        if (sp.change) this.at(at(sp.beat) + 20, () => this.setPedal(false));
        this.at(at(sp.beat) + Math.min(180, 0.3 * s.beatMs), () => this.setPedal(true));
      }
      if (sp.lift) this.at(at(sp.beat + sp.beats) - (i === s.pedalLine.length - 1 ? -200 : 30), () => this.setPedal(false));
    });
  }

  /** Answers an ear, quiz or build question; slips on the second one. */
  answer(a: DemoAsk) {
    const slip = a.index === 1;
    const t = a.waitMs + 700;
    if (a.choose && a.correct !== undefined && a.choices) {
      const pick = slip ? (a.correct + 1) % a.choices : a.correct;
      this.at(t + 500, () => a.choose!(pick));
      return;
    }
    const keys = a.keys ?? [];
    if (!keys.length) return;
    if (a.together) {
      if (slip) this.playNote(nextWhite(keys[keys.length - 1]), t, 250);
      this.playChord(keys, t + (slip ? 600 : 0), 900);
      return;
    }
    let at = t;
    keys.forEach((k, i) => {
      if (slip && i === keys.length - 1) { this.playNote(nextWhite(k), at, 250); at += 450; if (keys.length === 1) return; }
      this.playNote(k, at, 300);
      at += 450;
    });
  }

  /** Finds every target, with one wrong key early on. */
  playFind(s: FindSession, gapMs = 550) {
    let t = 400;
    s.steps.forEach((step, i) => {
      if (i === 1) { this.playNote(nextWhite(step.keys[0]), t, 150); t += gapMs; }
      // Prefer a key near the middle of the keyboard for "any octave" targets.
      const key = s.ex.coverAll ? step.keys[0] : step.keys[Math.floor(step.keys.length / 2)];
      this.playNote(key, t, 200);
      t += gapMs;
    });
  }

  /** Plays the notes in order, stumbling once on the second note. */
  playSequence(s: SequenceSession, gapMs = 600) {
    let t = 500;
    s.keys.forEach((key, i) => {
      if (i === 1) { this.playNote(nextWhite(key), t, 180); t += gapMs; }
      this.playNote(key, t, 300);
      t += gapMs;
    });
  }

  /** Keyboard setup: lowest white key, highest key, a wrong C, then middle C. */
  playCalibration(low: number, high: number, middleC: number) {
    this.playNote(low, 600, 200);
    this.playNote(high, 1800, 200);
    this.playNote(middleC - 12, 3600, 250);
    this.playNote(middleC, 5400, 400);
  }
}

function nextWhite(note: number) {
  let n = note + 1;
  while (isBlack(n)) n++;
  return n;
}
