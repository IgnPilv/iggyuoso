import { isBlack, parsePitchClass, type Hand } from '../music/notes';
import { SCALES } from '../music/theory';
import type { Click } from './timedSession';

// The Scale gym (#/scales): a scale or arpeggio up and down on the click, and a note-by-note
// picture of how evenly it went. Each note is matched to its place in the run and kept as an
// offset in ms and a velocity, so the screen can show where a hand stumbles, above all where the
// thumb passes under or a finger crosses over it. No DOM and no audio; times are on the
// performance.now() clock, latency as in TimedSession.

export const GYM_KINDS = [
  { id: 'major', name: 'Major scale', steps: SCALES.major },
  { id: 'natural minor', name: 'Natural minor scale', steps: SCALES['natural minor'] },
  { id: 'harmonic minor', name: 'Harmonic minor scale', steps: SCALES['harmonic minor'] },
  { id: 'chromatic', name: 'Chromatic scale', steps: SCALES.chromatic },
  { id: 'major arpeggio', name: 'Major arpeggio', steps: [0, 4, 7] },
  { id: 'minor arpeggio', name: 'Minor arpeggio', steps: [0, 3, 7] },
] as const;
export type GymKind = (typeof GYM_KINDS)[number]['id'];
export const GYM_ROOTS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
/** Minor scales and arpeggios start on white keys here (their textbook fingering follows one rule). */
const WHITE_ROOTS = ['C', 'G', 'D', 'A', 'E', 'B', 'F'];
export const rootsFor = (kind: GymKind) => (kind === 'major' || kind === 'chromatic' ? GYM_ROOTS : WHITE_ROOTS);
export type GymHands = Hand | 'together';

export interface GymSetup {
  root: string;
  kind: GymKind;
  octaves: 1 | 2;
  hands: GymHands;
}

/** One note of the run: its step (0, 1, 2, ...) and the key and finger of each hand that plays it. */
export interface GymStep {
  step: number;
  /** Going up (true) or coming down. The top note counts as up. */
  up: boolean;
  keys: Partial<Record<Hand, { midi: number; finger: number; pass: boolean }>>;
}

/** The notes of a scale or arpeggio from its tonic, `octaves` up and back. */
export function gymLine(root: string, kind: GymKind, octaves: number, octave: number): number[] {
  const steps = GYM_KINDS.find((k) => k.id === kind)!.steps;
  const tonic = 12 * (octave + 1) + parsePitchClass(root);
  const up: number[] = [];
  for (let o = 0; o < octaves; o++) for (const s of steps) up.push(tonic + 12 * o + s);
  up.push(tonic + 12 * octaves);
  return [...up, ...up.slice(0, -1).reverse()];
}

/**
 * Where the fourth finger falls going up, as a scale degree (0 = the tonic). Major and minor
 * scales take groups of 1 2 3 and 1 2 3 4 that this one degree places: in the right hand the 4 is
 * on the leading note in C, G, D, A, E and B, and on B♭ (A♯) in every other key; in the left hand
 * on the second degree in C, G, D, A, E and F, on F♯ in B, on F♯ itself in F♯ and on the fourth
 * degree in the flat keys.
 */
const RH_FOUR: Record<string, number> = { C: 6, G: 6, D: 6, A: 6, E: 6, B: 6, F: 3, Bb: 0, Eb: 4, Ab: 1, Db: 5, 'F#': 2 };
const LH_FOUR: Record<string, number> = { C: 1, G: 1, D: 1, A: 1, E: 1, F: 1, B: 4, 'F#': 0, Db: 3, Ab: 3, Eb: 3, Bb: 3 };
const RH_GROUPS = [4, 1, 2, 3, 1, 2, 3];
const LH_GROUPS = [4, 3, 2, 1, 3, 2, 1];

/**
 * Textbook fingering for the way up (the way down uses the same fingers). Scales follow the
 * groups above, ending on 5 (or the next finger) where the thumb would fall on the last note of
 * the right hand or the first of the left. Chromatic: 3 on black keys, the thumb on white ones
 * and 2 on the second of two white keys in a row
 * (E F, B C). Arpeggios: 1 2 3 5 and 5 3 2 1 for one octave,
 * 1 2 3 1 2 3 5 and 5 4 2 1 4 2 1 for two.
 */
export function gymFingers(root: string, kind: GymKind, hand: Hand, up: number[]): number[] {
  const right = hand === 'right';
  if (kind === 'chromatic') {
    return up.map((m, i) => {
      if (isBlack(m)) return 3;
      // The second of two white keys in a row going up (right hand) or down (left hand).
      const pair = right ? i > 0 && !isBlack(m - 1) : i < up.length - 1 && !isBlack(m + 1);
      return pair ? 2 : 1;
    });
  }
  if (kind.endsWith('arpeggio')) {
    const two = up.length > 4;
    const f = right ? (two ? [1, 2, 3, 1, 2, 3, 5] : [1, 2, 3, 5]) : (two ? [5, 4, 2, 1, 4, 2, 1] : [5, 3, 2, 1]);
    return up.map((_, i) => f[i] ?? f[f.length - 1]);
  }
  const k = (right ? RH_FOUR : LH_FOUR)[root] ?? (right ? 6 : 1);
  const groups = right ? RH_GROUPS : LH_GROUPS;
  const f = up.map((_, j) => groups[(((j % 7) - k) % 7 + 7) % 7]);
  if (right && f[f.length - 1] === 1) f[f.length - 1] = f[f.length - 2] + 1;
  if (!right && f[0] === 1) f[0] = f[1] + 1;
  return f;
}

/**
 * A crossing in the direction of travel: the thumb passing under a finger, or a finger crossing
 * over the thumb. In the right hand going up that is the thumb after another finger; going down,
 * another finger after the thumb. The left hand is the mirror image.
 */
export function isPass(hand: Hand, up: boolean, prev: number | undefined, cur: number) {
  if (prev === undefined || prev === cur) return false;
  const thumbNow = (hand === 'right') === up;
  return thumbNow ? cur === 1 && prev > 1 : prev === 1 && cur > 1;
}

/**
 * The run for both hands: the right hand from the tonic above middle C (C4 to B4), the left
 * hand as many octaves below as the run is long, so the two hands never share a key.
 */
export function gymPlan(setup: GymSetup): GymStep[] {
  const hands: Hand[] = setup.hands === 'together' ? ['right', 'left'] : [setup.hands];
  const lines = new Map<Hand, { midi: number[]; fingers: number[] }>();
  for (const hand of hands) {
    const midi = gymLine(setup.root, setup.kind, setup.octaves, hand === 'right' ? 4 : 4 - setup.octaves);
    const top = (midi.length - 1) / 2;
    const up = gymFingers(setup.root, setup.kind, hand, midi.slice(0, top + 1));
    const fingers = midi.map((_, i) => up[i <= top ? i : 2 * top - i]);
    lines.set(hand, { midi, fingers });
  }
  const len = lines.values().next().value!.midi.length;
  const top = (len - 1) / 2;
  return Array.from({ length: len }, (_, step) => {
    const up = step <= top;
    const keys: GymStep['keys'] = {};
    for (const [hand, l] of lines) {
      keys[hand] = { midi: l.midi[step], finger: l.fingers[step], pass: isPass(hand, up, l.fingers[step - 1], l.fingers[step]) };
    }
    return { step, up, keys };
  });
}

export interface GymOptions {
  tempo: number;
  /** Notes per click: 1 (quarters), 2 (eighths), 4 (sixteenths). */
  perBeat: 1 | 2 | 4;
  startAt: number;
  latencyMs: number;
  beatsPerBar?: number;
}

export interface GymNote {
  step: number;
  hand: Hand;
  midi: number;
  finger: number;
  pass: boolean;
  /** Ms from where it belongs (positive = late); missing until played. */
  offsetMs?: number;
  velocity?: number;
}

export class ScaleGym {
  readonly beatMs: number;
  readonly stepMs: number;
  readonly beatsPerBar: number;
  /** First note, after one bar of count-in, as scheduled. */
  readonly t0: number;
  readonly notes: GymNote[];
  /** Keys that belonged to no note of the run. */
  wrong = 0;

  constructor(readonly plan: GymStep[], readonly opts: GymOptions) {
    this.beatMs = 60000 / opts.tempo;
    this.stepMs = this.beatMs / opts.perBeat;
    this.beatsPerBar = opts.beatsPerBar ?? 4;
    this.t0 = opts.startAt + this.beatsPerBar * this.beatMs;
    this.notes = plan.flatMap((s) => (Object.entries(s.keys) as [Hand, NonNullable<GymStep['keys'][Hand]>][])
      .map(([hand, k]) => ({ step: s.step, hand, midi: k.midi, finger: k.finger, pass: k.pass })));
  }

  /** Song ms when the run's last note is due. */
  get lastMs() { return (this.plan.length - 1) * this.stepMs; }
  /** Performance time after which the run is over (the last note plus a beat). */
  get endsAt() { return this.t0 + this.lastMs + Math.max(this.beatMs, 2 * this.stepMs) + this.opts.latencyMs; }

  /** How far from its place a press may land and still be that note. */
  get window() { return Math.max(200, Math.min(700, 1.5 * this.stepMs)); }

  /** Step being played at performance time `now` (negative in the count-in), and the count-in beat. */
  position(now: number) {
    const ms = now - this.t0;
    return { step: Math.floor(ms / this.stepMs + 0.5), countIn: ms < -this.stepMs / 2, beat: Math.floor(ms / this.beatMs) + this.beatsPerBar + 1 };
  }

  /** Clicks (one per beat, accent on the downbeat) from `from` (exclusive) to `to`, up to the last note. */
  clicks(from: number, to: number): Click[] {
    const out: Click[] = [];
    const last = this.t0 + this.lastMs;
    const first = Math.floor((from - this.opts.startAt) / this.beatMs) + 1;
    for (let i = Math.max(0, first); ; i++) {
      const time = this.opts.startAt + i * this.beatMs;
      if (time > to || time > last + 1) break;
      if (time <= from) continue;
      out.push({ time, accent: i % this.beatsPerBar === 0 });
    }
    return out;
  }

  /**
   * A key went down (written MIDI). Returns the note of the run it played (the nearest one not
   * yet played, on that key, within the window), or nothing for a wrong key or the count-in.
   */
  press(writtenMidi: number, time: number, velocity = 80): GymNote | undefined {
    const ms = time - this.t0 - this.opts.latencyMs;
    if (ms < -this.window) return undefined;
    let best: GymNote | undefined;
    for (const n of this.notes) {
      if (n.offsetMs !== undefined || n.midi !== writtenMidi) continue;
      const off = ms - n.step * this.stepMs;
      if (Math.abs(off) > this.window) continue;
      if (!best || Math.abs(off) < Math.abs(ms - best.step * this.stepMs)) best = n;
    }
    if (!best) {
      if (ms <= this.lastMs + this.window) this.wrong++;
      return undefined;
    }
    best.offsetMs = Math.round(ms - best.step * this.stepMs);
    best.velocity = velocity;
    return best;
  }
}

// ---------------------------------------------------------------- the report

/** Full marks within this many ms. */
const SHARP_MS = 20;

/** One note's marks: 1 within 20 ms, falling to 0 at half a step (60 to 100 ms); 0 if missed. */
export function noteMark(n: GymNote, stepMs: number) {
  if (n.offsetMs === undefined) return 0;
  const edge = Math.max(60, Math.min(100, stepMs / 2));
  const off = Math.abs(n.offsetMs);
  return off <= SHARP_MS ? 1 : Math.max(0, 1 - (off - SHARP_MS) / (edge - SHARP_MS));
}

export interface HandReport {
  hand: Hand;
  played: number;
  missed: number;
  /** Mean offset of the notes played (positive = late). */
  lean: number;
  /** Standard deviation of the offsets. */
  spread: number;
  /** Mean offset at thumb passes and at the other notes (when there are passes played). */
  passLean?: number;
  otherLean?: number;
  /** Velocity spread, and how much louder thumb notes are than the rest; only when velocities vary. */
  velSpread?: number;
  thumbLouder?: number;
  /** The notes furthest from their place, worst first (at most 3, each over 40 ms off). */
  worst: GymNote[];
}

export interface GymReport {
  score: number;
  hands: HandReport[];
  wrong: number;
  /** One or two sentences: what gave way, and what to do about it. */
  tips: string[];
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => { const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))); };

/** Score and per-hand findings for the notes up to `upToStep` (all of them when the run is over). */
export function gymReport(g: ScaleGym, upToStep = Infinity): GymReport {
  const due = g.notes.filter((n) => n.step <= upToStep);
  const hands: HandReport[] = [];
  for (const hand of ['right', 'left'] as Hand[]) {
    const mine = due.filter((n) => n.hand === hand);
    if (!mine.length) continue;
    const played = mine.filter((n) => n.offsetMs !== undefined);
    const offs = played.map((n) => n.offsetMs!);
    const r: HandReport = {
      hand, played: played.length, missed: mine.length - played.length,
      lean: offs.length ? Math.round(mean(offs)) : 0, spread: offs.length ? Math.round(sd(offs)) : 0,
      worst: [...played].filter((n) => Math.abs(n.offsetMs!) > 40).sort((a, b) => Math.abs(b.offsetMs!) - Math.abs(a.offsetMs!)).slice(0, 3),
    };
    const passes = played.filter((n) => n.pass), others = played.filter((n) => !n.pass);
    if (passes.length && others.length) {
      r.passLean = Math.round(mean(passes.map((n) => n.offsetMs!)));
      r.otherLean = Math.round(mean(others.map((n) => n.offsetMs!)));
    }
    const vels = played.map((n) => n.velocity ?? 80);
    if (vels.length >= 4 && new Set(vels).size > 1) {
      r.velSpread = Math.round(sd(vels));
      const thumbs = played.filter((n) => n.finger === 1).map((n) => n.velocity ?? 80);
      const rest = played.filter((n) => n.finger !== 1).map((n) => n.velocity ?? 80);
      if (thumbs.length && rest.length) r.thumbLouder = Math.round(mean(thumbs) - mean(rest));
    }
    hands.push(r);
  }
  const marks = due.reduce((a, n) => a + noteMark(n, g.stepMs), 0);
  const score = due.length ? Math.max(0, Math.round((100 * (marks - 0.5 * g.wrong)) / due.length)) : 0;
  return { score, hands, wrong: g.wrong, tips: gymTips(hands, g.wrong) };
}

const HAND_WORD: Record<Hand, string> = { right: 'right hand', left: 'left hand' };

/** The habits worth naming, most important first (at most two). */
export function gymTips(hands: HandReport[], wrong: number): string[] {
  const tips: string[] = [];
  const missed = hands.reduce((a, r) => a + r.missed, 0);
  if (missed + wrong >= 3) tips.push('Several notes went missing or wrong: take the tempo down until every note is there, then build it back up.');
  for (const r of hands) {
    if (r.passLean !== undefined && r.otherLean !== undefined && r.passLean - r.otherLean >= 20) {
      tips.push(`The ${HAND_WORD[r.hand]} is ${r.passLean - r.otherLean} ms late where the thumb passes under or a finger crosses over. Practise just the turn slowly (3 1 3, or 4 1 4), moving the thumb under early, while the finger before it is still playing.`);
    }
  }
  for (const r of hands) {
    if (r.thumbLouder !== undefined && r.thumbLouder >= 8) tips.push(`The ${HAND_WORD[r.hand]}'s thumb bumps: its notes are ${r.thumbLouder} louder than the others. Let the thumb play lightly, from the side.`);
  }
  if (hands.length === 2 && hands.every((r) => r.played >= 4) && Math.abs(hands[0].lean - hands[1].lean) >= 30) {
    const [a, b] = hands[0].lean > hands[1].lean ? hands : [hands[1], hands[0]];
    tips.push(`The ${HAND_WORD[a.hand]} trails the ${HAND_WORD[b.hand]} by ${a.lean - b.lean} ms. Listen for one sound, not two.`);
  }
  for (const r of hands) {
    if (r.played >= 4 && r.spread >= 45) tips.push(`The ${HAND_WORD[r.hand]} is uneven (notes wander ±${r.spread} ms). Try it with two notes a click at a slower tempo, and think in groups.`);
  }
  if (!tips.length && hands.some((r) => r.played)) tips.push('Even and on the click. Try a faster tempo, two octaves or more notes a click.');
  return tips.slice(0, 2);
}
