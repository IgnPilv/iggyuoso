import { toDevice, toWritten, type Calibration } from '../calibration';
import type { FindExercise, FindTarget, SequenceExercise } from '../content/types';
import { isBlack, pitchClass, pitchToMidi } from '../music/notes';
import { stars } from './stars';

// State machines for the untimed kinds. They take device key numbers and decide right or wrong;
// the UI only shows what they say.

export type PressOutcome = 'correct' | 'wrong' | 'again' | 'ignored';

export interface UntimedResult {
  steps: number;
  wrong: number;
  score: number;
  stars: 0 | 1 | 2 | 3;
}

function untimedScore(steps: number, wrong: number): UntimedResult {
  const score = steps ? Math.round((100 * steps) / (steps + wrong)) : 0;
  return { steps, wrong, score, stars: stars(score) };
}

/** Which black-key group a device key belongs to, as "2:<octave>" or "3:<octave>". */
export function blackGroupOf(c: Calibration, device: number): string | undefined {
  if (!isBlack(device)) return undefined;
  const w = toWritten(c, device);
  const pc = pitchClass(w);
  const octave = Math.floor(w / 12);
  return pc === 1 || pc === 3 ? `2:${octave}` : `3:${octave}`;
}

export function isLow(c: Calibration, device: number) {
  return device <= c.middleC - 12 || device < c.low + c.keyCount / 3;
}
export function isHigh(c: Calibration, device: number) {
  return device >= c.middleC + 12 || device > c.high - c.keyCount / 3;
}

function keysOnBoard(c: Calibration): number[] {
  return Array.from({ length: c.keyCount }, (_, i) => c.low + i);
}

/** One thing to find: a set of device keys, any of which completes it. */
export interface FindStep {
  label: string;
  keys: number[];
}

export function targetLabel(t: FindTarget): string {
  if ('blackGroup' in t) return `a group of ${t.blackGroup} black keys`;
  if ('pitchClass' in t) return t.name;
  return t.region === 'low' ? 'a low key' : 'a high key';
}

export function findSteps(ex: FindExercise, c: Calibration, random: () => number = Math.random): FindStep[] {
  const keys = keysOnBoard(c);
  const matching = (t: FindTarget) =>
    keys.filter((k) =>
      'blackGroup' in t
        ? blackGroupOf(c, k)?.startsWith(`${t.blackGroup}:`)
        : 'pitchClass' in t
          ? pitchClass(k) === t.pitchClass
          : t.region === 'low' ? isLow(c, k) : isHigh(c, k),
    );
  if (ex.coverAll) {
    // Every instance on the keyboard, bottom to top. Black groups cut off at the edge still count.
    const steps: FindStep[] = [];
    for (const t of ex.targets) {
      if ('blackGroup' in t) {
        const groups = new Map<string, number[]>();
        for (const k of matching(t)) {
          const g = blackGroupOf(c, k)!;
          groups.set(g, [...(groups.get(g) ?? []), k]);
        }
        for (const ks of groups.values()) steps.push({ label: targetLabel(t), keys: ks });
      } else {
        for (const k of matching(t)) steps.push({ label: targetLabel(t), keys: [k] });
      }
    }
    return steps.sort((a, b) => a.keys[0] - b.keys[0]);
  }
  const steps = ex.targets.map((t) => ({ label: targetLabel(t), keys: matching(t) }));
  if (ex.order === 'random') {
    for (let i = steps.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [steps[i], steps[j]] = [steps[j], steps[i]];
    }
  }
  return steps;
}

export class FindSession {
  readonly steps: FindStep[];
  readonly found: boolean[];
  current = 0;
  wrong = 0;

  constructor(readonly ex: FindExercise, readonly cal: Calibration, random?: () => number) {
    this.steps = findSteps(ex, cal, random);
    this.found = this.steps.map(() => false);
  }

  get done() {
    return this.found.every(Boolean);
  }

  /** Remaining steps the player is being asked for. In cover-all mode, any order is fine. */
  press(device: number): PressOutcome {
    if (this.done) return 'ignored';
    if (this.ex.coverAll) {
      const i = this.steps.findIndex((s) => s.keys.includes(device));
      if (i < 0) { this.wrong++; return 'wrong'; }
      if (this.found[i]) return 'again';
      this.found[i] = true;
      return 'correct';
    }
    if (this.steps[this.current].keys.includes(device)) {
      this.found[this.current] = true;
      this.current++;
      return 'correct';
    }
    this.wrong++;
    return 'wrong';
  }

  result(): UntimedResult {
    return untimedScore(this.steps.length, this.wrong);
  }
}

/** Device keys of a sequence exercise, for lighting the hand position. */
export const positionKeys = (ex: SequenceExercise, c: Calibration) => ex.position.map((p) => toDevice(c, pitchToMidi(p)));

export class SequenceSession {
  readonly keys: number[];
  current = 0;
  wrong = 0;
  /** Index of notes that needed more than one try. */
  readonly stumbles = new Set<number>();

  constructor(readonly ex: SequenceExercise, readonly cal: Calibration) {
    this.keys = ex.notes.map((p) => toDevice(cal, pitchToMidi(p)));
  }

  get done() {
    return this.current >= this.keys.length;
  }

  press(device: number): PressOutcome {
    if (this.done) return 'ignored';
    const want = this.keys[this.current];
    const ok = this.ex.pitchMatch === 'pitchClass' ? pitchClass(device) === pitchClass(want) : device === want;
    if (ok) { this.current++; return 'correct'; }
    this.wrong++;
    this.stumbles.add(this.current);
    return 'wrong';
  }

  result(): UntimedResult {
    return untimedScore(this.keys.length, this.wrong);
  }

  /** A hint for the current note, e.g. "E4 with finger 3". */
  hint(): string {
    if (this.done) return '';
    const p = this.ex.notes[this.current];
    const name = `${p.letter}${p.accidental === 1 ? '#' : p.accidental === -1 ? 'b' : ''}${p.octave}`;
    const f = this.ex.fingers[this.current];
    return f ? `${name} with finger ${f}` : name;
  }
}

