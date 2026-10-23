import { toDevice, type Calibration } from '../calibration';
import type { BuildExercise, BuildTask, EarExercise, EarItem, QuizExercise, QuizQuestion } from '../content/types';
import { pitchClass, pitchToMidi, type Pitch } from '../music/notes';
import { beatMs } from '../music/timeline';
import {
  cadence, CHORD_QUALITIES, chordQuality, degreeSemitones, interval, parseKey, resolution, tonicIn,
} from '../music/theory';
import { applyGoal } from '../scoring/goal';
import { stars } from '../scoring/stars';

// State machines for the question kinds: ear, quiz and build. Like the other sessions they take
// device key numbers and decide; the UI plays the sounds they describe and shows what they say.

export type DrillOutcome = 'correct' | 'wrong' | 'ignored';
type Rng = () => number;

/** Notes to play: written MIDI numbers at a time (ms from the start of the prompt). */
export interface Sound {
  notes: number[];
  at: number;
  dur: number;
}

export interface DrillResult {
  /** Questions or tasks right (partial credit for phrases). */
  right: number;
  total: number;
  score: number;
  stars: 0 | 1 | 2 | 3;
}

function drillResult(credits: number[], total: number): DrillResult {
  const right = credits.reduce((a, b) => a + b, 0);
  const score = total ? Math.round((100 * right) / total) : 0;
  return { right: Math.round(right * 10) / 10, total, score, stars: stars(score) };
}

const pick = <T>(xs: readonly T[], rng: Rng): T => xs[Math.min(xs.length - 1, Math.floor(rng() * xs.length))];

const NOTE_MS = 650;
const CHORD_MS = 750;

export function sequence(notes: number[], start = 0, ms = NOTE_MS): Sound[] {
  return notes.map((n, i) => ({ notes: [n], at: start + i * ms, dur: ms * 0.9 }));
}

function cadenceSounds(key: string): Sound[] {
  return cadence(parseKey(key)).map((notes, i) => ({ notes, at: i * CHORD_MS, dur: CHORD_MS * (i === 3 ? 1.4 : 0.95) }));
}

/** Where a list of sounds ends, in ms. */
export const soundsEnd = (xs: Sound[]) => xs.reduce((a, s) => Math.max(a, s.at + s.dur), 0);

/**
 * Notes judged one by one: the first key pressed for each note is what counts, right or wrong,
 * and the phrase moves on either way. Used for echoing a melody and for "play the answer".
 */
export class KeyAnswer {
  index = 0;
  marks: boolean[] = [];
  constructor(readonly expect: number[], private same: (a: number, b: number) => boolean) {}
  get done() { return this.index >= this.expect.length; }
  press(device: number): DrillOutcome {
    if (this.done) return 'ignored';
    const ok = this.same(device, this.expect[this.index]);
    this.marks.push(ok);
    this.index++;
    return ok ? 'correct' : 'wrong';
  }
  get credit() { return this.marks.filter(Boolean).length / this.expect.length; }
}

const matcher = (mode: 'exact' | 'pitchClass') => (a: number, b: number) =>
  mode === 'pitchClass' ? pitchClass(a) === pitchClass(b) : a === b;

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export const noteName = (w: number) => `${NAMES[pitchClass(w)]}${Math.floor(w / 12) - 1}`;
const pitchText = (p: Pitch) => `${p.letter}${p.accidental === 1 ? '#' : p.accidental === -1 ? 'b' : ''}${p.octave}`;

// ---------------------------------------------------------------- ear

export interface EarQuestion {
  /** What the player is asked, e.g. "Which key was that? Play it." */
  ask: string;
  /** The cadence (if any) and the prompt. */
  play: Sound[];
  /** Just the prompt, for "Listen again". */
  prompt: Sound[];
  /** Times the prompt may be played in all (melodies); Infinity otherwise. */
  plays: number;
  /** Played once the question is answered: the resolution, or the right answer. */
  after: Sound[];
  /** Keys to press (device numbers), or buttons to choose from. */
  keys?: KeyAnswer;
  choices?: string[];
  correct?: number;
  /** The right answer in words, shown after a wrong one. */
  answerText: string;
  /** For adaptivity: which item and value this was. */
  slot: string;
}

/** Each item and value it can ask, e.g. "0:M3". Missed ones come back more often. */
function slots(ex: EarExercise): { slot: string; item: number; value: string }[] {
  return ex.items.flatMap((it, i) => {
    const values = it.type === 'melody' ? ['melody'] : it.type === 'note' ? it.pool.map(pitchText) : it.pool.map(String);
    return [...new Set(values)].map((value) => ({ slot: `${i}:${value}`, item: i, value }));
  });
}

export class EarSession {
  /** Higher weight = asked more often. A miss adds 2; a clean answer takes 0.5 off (never below 1). */
  readonly weights = new Map<string, number>();
  readonly credits: number[] = [];
  current: EarQuestion;
  /** The current question has been answered (waiting for Next). */
  answered = false;
  private all: ReturnType<typeof slots>;
  private last?: string;

  constructor(readonly ex: EarExercise, readonly cal: Calibration, private rng: Rng = Math.random) {
    this.all = slots(ex);
    this.all.forEach((s) => this.weights.set(s.slot, 1));
    this.current = this.make();
  }

  get done() { return this.credits.length >= this.ex.questions; }
  /** 0-based number of the current question. */
  get number() { return this.credits.length - (this.answered ? 1 : 0); }

  private choose() {
    const pool = this.all.length > 1 ? this.all.filter((s) => s.slot !== this.last) : this.all;
    const total = pool.reduce((a, s) => a + this.weights.get(s.slot)!, 0);
    let r = this.rng() * total;
    for (const s of pool) {
      r -= this.weights.get(s.slot)!;
      if (r < 0) return s;
    }
    return pool[pool.length - 1];
  }

  private make(): EarQuestion {
    const { item, value, slot } = this.choose();
    this.last = slot;
    const it = this.ex.items[item];
    const q = buildEarQuestion(it, value, this.ex, this.cal, this.rng);
    const cadenceKey = it.type === 'degree' ? it.key : this.ex.cadence;
    const intro = cadenceKey ? cadenceSounds(cadenceKey) : [];
    const offset = intro.length ? soundsEnd(intro) + 450 : 0;
    return { ...q, slot, play: [...intro, ...q.prompt.map((s) => ({ ...s, at: s.at + offset }))] };
  }

  private settle(credit: number) {
    this.answered = true;
    this.credits.push(credit);
    const w = this.weights.get(this.current.slot)!;
    this.weights.set(this.current.slot, credit >= 1 ? Math.max(1, w - 0.5) : w + 2);
  }

  press(device: number): DrillOutcome {
    const k = this.current.keys;
    if (this.answered || this.done || !k) return 'ignored';
    const out = k.press(device);
    if (k.done) this.settle(k.credit);
    return out;
  }

  pick(choice: number): DrillOutcome {
    const q = this.current;
    if (this.answered || this.done || q.choices === undefined) return 'ignored';
    const ok = choice === q.correct;
    this.settle(ok ? 1 : 0);
    return ok ? 'correct' : 'wrong';
  }

  next() {
    if (!this.answered || this.done) return;
    this.answered = false;
    this.current = this.make();
  }

  result(): DrillResult { return drillResult(this.credits, this.ex.questions); }
}

type Prompt = Omit<EarQuestion, 'play' | 'slot'>;

function buildEarQuestion(it: EarItem, value: string, ex: EarExercise, cal: Calibration, rng: Rng): Prompt {
  const dev = (w: number) => toDevice(cal, w);
  const same = matcher(ex.pitchMatch);
  switch (it.type) {
    case 'note': {
      const n = pitchToMidi(it.pool.find((p) => pitchText(p) === value)!);
      return {
        ask: 'Which key was that? Play it.', prompt: sequence([n], 0, 900), plays: Infinity, after: [],
        keys: new KeyAnswer([dev(n)], same), answerText: noteName(n),
      };
    }
    case 'interval': {
      const iv = interval(value);
      const from = pitchToMidi(pick(it.from, rng));
      const down = it.direction === 'down' || (it.direction === 'both' && rng() < 0.5);
      const to = down ? from - iv.semitones : from + iv.semitones;
      const prompt = it.together ? [{ notes: [from, to], at: 0, dur: 1300 }] : sequence([from, to], 0, 800);
      const words = `${iv.name} ${down ? 'down' : 'up'}`;
      if (it.answer === 'name') {
        const choices = [...new Set(it.pool.map((c) => interval(c).name))];
        return { ask: 'Which interval was that?', prompt, plays: Infinity, after: [], choices, correct: choices.indexOf(iv.name), answerText: words };
      }
      return {
        ask: `The first note is ${noteName(from)}. Play the second note.`, prompt, plays: Infinity, after: [],
        keys: new KeyAnswer([dev(to)], same), answerText: `${noteName(to)} (a ${words})`,
      };
    }
    case 'chord': {
      const root = pitchToMidi(pick(it.root, rng));
      const notes = chordQuality(value).steps.map((s) => root + s);
      const prompt = [{ notes, at: 0, dur: 1300 }, ...sequence(notes, 1500, 380)];
      const choices = it.pool.map((c) => CHORD_QUALITIES[c].name);
      return {
        ask: 'Which chord was that?', prompt, plays: Infinity, after: [], choices, correct: it.pool.indexOf(value), answerText: CHORD_QUALITIES[value].name,
      };
    }
    case 'degree': {
      const key = parseKey(it.key);
      const t = tonicIn(key, 4) > 66 ? tonicIn(key, 3) : tonicIn(key, 4);
      const n = t + degreeSemitones(key, value);
      return {
        ask: `In ${key.name}: play the note you heard.`, prompt: sequence([n], 0, 900), plays: Infinity,
        after: it.resolve ? sequence(resolution(key, n), 0, 420) : [],
        keys: new KeyAnswer([dev(n)], matcher('pitchClass')), answerText: `${noteName(n)}, degree ${value}`,
      };
    }
    case 'melody': {
      const notes = it.notes.map(pitchToMidi);
      return {
        ask: 'Play it back.', prompt: sequence(notes, 0, beatMs(92)), plays: it.plays, after: [],
        keys: new KeyAnswer(notes.map(dev), same), answerText: notes.map(noteName).join(' '),
      };
    }
    case 'compare': {
      const lo = pitchToMidi(it.range[0]);
      const hi = pitchToMidi(it.range[1]);
      const gap = 2 + Math.floor(rng() * Math.min(6, hi - lo - 1));
      let a: number;
      let b: number;
      if (value === 'same') {
        a = lo + Math.floor(rng() * (hi - lo + 1));
        b = a;
      } else {
        a = lo + Math.floor(rng() * (hi - lo - gap + 1));
        b = a + gap;
        if (value === 'lower') [a, b] = [b, a];
      }
      const choices = ['Higher', 'Lower', 'The same'];
      const correct = ['higher', 'lower', 'same'].indexOf(value);
      return {
        ask: 'Is the second note higher, lower or the same?', prompt: sequence([a, b], 0, 900), plays: Infinity, after: [],
        choices, correct, answerText: choices[correct].toLowerCase(),
      };
    }
  }
}

// ---------------------------------------------------------------- quiz

export class QuizSession {
  readonly questions: QuizQuestion[];
  readonly credits: number[] = [];
  /** How long each answer took, from the question being shown. */
  readonly times: number[] = [];
  index = 0;
  answered = false;
  keys?: KeyAnswer;
  private askedAt = 0;

  constructor(readonly ex: QuizExercise, readonly cal: Calibration, rng: Rng = Math.random, private clock: () => number = () => performance.now()) {
    this.questions = [...ex.questions];
    if (ex.shuffle) {
      for (let i = this.questions.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [this.questions[i], this.questions[j]] = [this.questions[j], this.questions[i]];
      }
    }
    this.setup();
  }

  get current() { return this.questions[this.index]; }
  get done() { return this.credits.length >= this.questions.length; }

  private setup() {
    const q = this.current;
    this.askedAt = this.clock();
    this.keys = q?.play ? new KeyAnswer(q.play.map((p) => toDevice(this.cal, pitchToMidi(p))), matcher(this.ex.pitchMatch)) : undefined;
  }

  pick(choice: number): DrillOutcome {
    if (this.answered || this.done || this.current.choices === undefined) return 'ignored';
    const ok = choice === this.current.correct;
    this.credits.push(ok ? 1 : 0);
    this.times.push(this.clock() - this.askedAt);
    this.answered = true;
    return ok ? 'correct' : 'wrong';
  }

  press(device: number): DrillOutcome {
    if (this.answered || this.done || !this.keys) return 'ignored';
    const out = this.keys.press(device);
    if (this.keys.done) {
      this.credits.push(this.keys.credit);
      this.times.push(this.clock() - this.askedAt);
      this.answered = true;
    }
    return out;
  }

  next() {
    if (!this.answered || this.done) return;
    this.answered = false;
    this.index++;
    this.setup();
  }

  /** The middle answer time, in ms (undefined before any answer). */
  medianMs(): number | undefined {
    if (!this.times.length) return undefined;
    const xs = [...this.times].sort((a, b) => a - b);
    const mid = Math.floor(xs.length / 2);
    return Math.round(xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2);
  }

  result(): DrillResult & { medianMs?: number; slow?: boolean } {
    const r = drillResult(this.credits, this.questions.length);
    if (!this.ex.goal) return r;
    const medianMs = this.medianMs();
    const g = applyGoal(r.score, this.ex.goal, medianMs);
    return { ...r, score: g.score, stars: g.stars, medianMs, slow: g.slow };
  }
}

// ---------------------------------------------------------------- build

export class BuildSession {
  index = 0;
  /** Per finished task: right with no wrong key on the way. */
  readonly clean: boolean[] = [];
  /** Device keys of the current task already played (any / listed) or held (together). */
  readonly got = new Set<number>();
  private wrongHere = false;
  private held = new Set<number>();

  constructor(readonly ex: BuildExercise, readonly cal: Calibration) {}

  get task(): BuildTask { return this.ex.tasks[this.index]; }
  get done() { return this.index >= this.ex.tasks.length; }
  /** The current task's keys, as device numbers. */
  get keys(): number[] { return this.done ? [] : this.task.notes.map((n) => toDevice(this.cal, n)); }

  private same(a: number, b: number) { return matcher(this.ex.pitchMatch)(a, b); }

  /** 'correct' for a right key. The task is finished when `index` moves on. */
  press(device: number): DrillOutcome {
    if (this.done) return 'ignored';
    this.held.add(device);
    const keys = this.keys;
    let ok: boolean;
    if (this.task.mode === 'listed') {
      const want = keys[this.got.size];
      ok = this.same(device, want);
      if (ok) this.got.add(want);
    } else {
      const k = keys.find((x) => !this.got.has(x) && this.same(device, x));
      if (k === undefined && keys.some((x) => this.same(device, x))) return 'ignored'; // played again
      ok = k !== undefined;
      if (k !== undefined) this.got.add(k);
    }
    if (!ok) this.wrongHere = true;
    this.check();
    return ok ? 'correct' : 'wrong';
  }

  /** The player asked to see the answer: this task no longer counts as a clean first try. */
  revealed() { this.wrongHere = true; }

  release(device: number) {
    this.held.delete(device);
    if (this.done || this.task.mode !== 'together') return;
    // A chord counts only while all of it is held; letting go of a wrong key can complete it.
    for (const k of [...this.got]) if (![...this.held].some((h) => this.same(h, k))) this.got.delete(k);
    this.check();
  }

  private check() {
    const keys = this.keys;
    const held = [...this.held];
    const complete = this.task.mode === 'together'
      ? keys.every((k) => held.some((h) => this.same(h, k))) && held.every((h) => keys.some((k) => this.same(h, k)))
      : this.got.size >= keys.length;
    if (!complete) return;
    this.clean.push(!this.wrongHere);
    this.wrongHere = false;
    this.got.clear();
    this.held.clear(); // keys still down from this task don't belong to the next one
    this.index++;
  }

  result(): DrillResult { return drillResult(this.clean.map((c) => (c ? 1 : 0)), this.ex.tasks.length); }
}
