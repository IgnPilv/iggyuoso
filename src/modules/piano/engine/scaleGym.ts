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
/** The key to use after the boxes change: the one picked, unless this kind of scale has no such key here. */
export const pickRoot = (kind: GymKind, picked: string) => (rootsFor(kind).includes(picked) ? picked : rootsFor(kind)[0]);
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
  /**
   * Ms from where it belongs (positive = late); missing until played. In free tempo: how much
   * longer (late, a hesitation) or shorter (hurried) the gap before it was than the player's own
   * beat at that point.
   */
  offsetMs?: number;
  velocity?: number;
  /** When it was played (performance ms; free tempo only). */
  time?: number;
}

const notesOf = (plan: GymStep[]): GymNote[] => plan.flatMap((s) => (Object.entries(s.keys) as [Hand, NonNullable<GymStep['keys'][Hand]>][])
  .map(([hand, k]) => ({ step: s.step, hand, midi: k.midi, finger: k.finger, pass: k.pass })));

/** What the report needs from a run of either mode. */
export interface GymRun {
  notes: GymNote[];
  stepMs: number;
  wrong: number;
}

export class ScaleGym implements GymRun {
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
    this.notes = notesOf(plan);
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

// ---------------------------------------------------------------- free tempo

/** Notes skipped over at most, when a press matches a note further on. */
const LOOKAHEAD = 2;
/** IOIs either side that set the local beat a note is measured against. */
const LOCAL = 4;

const median = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

/**
 * Free tempo: no click. The first right note starts the run, each hand works through its notes
 * in order (a key up to two notes ahead counts, the ones skipped are missed), and the tempo is
 * worked out from the notes afterwards (`freeTempo`).
 */
export class FreeGym implements GymRun {
  readonly notes: GymNote[];
  wrong = 0;
  started?: number;
  lastAt?: number;
  /** Set by `freeTempo`: the player's own step (ms between notes). */
  stepMs = 0;
  private next: Partial<Record<Hand, number>> = {};
  private byHand = new Map<Hand, GymNote[]>();

  constructor(readonly plan: GymStep[]) {
    this.notes = notesOf(plan);
    for (const n of this.notes) {
      if (!this.byHand.has(n.hand)) { this.byHand.set(n.hand, []); this.next[n.hand] = 0; }
      this.byHand.get(n.hand)!.push(n);
    }
  }

  /** Every hand has reached its last note. */
  get done() { return [...this.byHand].every(([hand, ns]) => this.next[hand]! >= ns.length); }

  /** The furthest step any hand has played (−1 before the start). */
  get reached() { return Math.max(-1, ...[...this.byHand].map(([hand]) => this.next[hand]! - 1)); }

  /** The notes each hand plays next (to light them). */
  upcoming(): GymNote[] {
    return [...this.byHand].flatMap(([hand, ns]) => (ns[this.next[hand]!] ? [ns[this.next[hand]!]] : []));
  }

  press(writtenMidi: number, time: number, velocity = 80): GymNote | undefined {
    for (const [hand, ns] of this.byHand) {
      const at = this.next[hand]!;
      // Before the start only a hand's first note counts.
      const reach = this.started === undefined ? 0 : LOOKAHEAD;
      for (let k = 0; k <= reach && at + k < ns.length; k++) {
        const n = ns[at + k];
        if (n.midi !== writtenMidi) continue;
        n.time = time;
        n.velocity = velocity;
        n.offsetMs = 0;
        this.next[hand] = at + k + 1;
        this.started ??= time;
        this.lastAt = time;
        return n;
      }
    }
    if (this.started !== undefined && !this.done) this.wrong++;
    return undefined;
  }
}

export interface FreeTempo {
  /** The player's step in ms, and the same as beats a minute at `perBeat` notes a beat. */
  stepMs: number;
  bpm: number;
  /** Beats a minute going up and coming down, when both have enough notes. */
  upBpm?: number;
  downBpm?: number;
  /** Hands together: mean ms the right hand lands after the left (minus = ahead), on notes both played. */
  gapMs?: number;
}

/**
 * Works out the player's tempo (the middle gap between notes, a skipped note counting as two
 * gaps) and measures each note's gap against the beat around it (the middle of up to four gaps
 * either side), so a slow start or a gentle speeding up is not blamed on every note, while a
 * hesitation or a rushed note stands out. Fills in `offsetMs` and `stepMs` on the run.
 */
export function freeTempo(g: FreeGym, perBeat: number): FreeTempo | undefined {
  const gaps: { hand: Hand; step: number; ms: number; up: boolean }[] = [];
  const top = (g.plan.length - 1) / 2;
  for (const hand of ['right', 'left'] as Hand[]) {
    const played = g.notes.filter((n) => n.hand === hand && n.time !== undefined);
    for (let i = 1; i < played.length; i++) {
      const steps = played[i].step - played[i - 1].step;
      gaps.push({ hand, step: played[i].step, ms: (played[i].time! - played[i - 1].time!) / steps, up: played[i].step <= top });
    }
  }
  if (gaps.length < 3) return undefined;
  const stepMs = median(gaps.map((x) => x.ms));
  g.stepMs = stepMs;
  const bpm = (ms: number) => Math.round(60000 / (ms * perBeat));
  for (const hand of ['right', 'left'] as Hand[]) {
    const mine = gaps.filter((x) => x.hand === hand);
    mine.forEach((x, i) => {
      const around = [...mine.slice(Math.max(0, i - LOCAL), i), ...mine.slice(i + 1, i + 1 + LOCAL)].map((y) => y.ms);
      const local = around.length >= 2 ? median(around) : stepMs;
      const n = g.notes.find((m) => m.hand === hand && m.step === x.step)!;
      n.offsetMs = Math.round(x.ms - local);
    });
  }
  const out: FreeTempo = { stepMs: Math.round(stepMs), bpm: bpm(stepMs) };
  const up = gaps.filter((x) => x.up), down = gaps.filter((x) => !x.up);
  if (up.length >= 3 && down.length >= 3) { out.upBpm = bpm(median(up.map((x) => x.ms))); out.downBpm = bpm(median(down.map((x) => x.ms))); }
  const pairs = g.plan.map((st) => {
    const r = g.notes.find((n) => n.hand === 'right' && n.step === st.step)?.time;
    const l = g.notes.find((n) => n.hand === 'left' && n.step === st.step)?.time;
    return r !== undefined && l !== undefined ? r - l : undefined;
  }).filter((x): x is number => x !== undefined);
  if (pairs.length >= 3) out.gapMs = Math.round(mean(pairs));
  return out;
}

/** Tips that only free tempo has: speeding up or slowing down, and one hand ahead of the other. */
export function freeTips(t: FreeTempo): string[] {
  const tips: string[] = [];
  if (t.upBpm && t.downBpm && Math.abs(t.downBpm - t.upBpm) >= Math.max(4, t.upBpm * 0.06)) {
    tips.push(t.downBpm > t.upBpm
      ? `You sped up on the way down (${t.upBpm} going up, ${t.downBpm} coming down). Coming down is easier, so hold it back.`
      : `You slowed down on the way down (${t.upBpm} going up, ${t.downBpm} coming down). Know the fingering down as well as up.`);
  }
  if (t.gapMs !== undefined && Math.abs(t.gapMs) >= 25) {
    tips.push(`The ${t.gapMs > 0 ? 'left' : 'right'} hand lands ${Math.abs(t.gapMs)} ms ahead of the ${t.gapMs > 0 ? 'right' : 'left'}. Listen for one sound, not two.`);
  }
  return tips;
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
export function gymReport(g: GymRun, upToStep = Infinity, free?: FreeTempo): GymReport {
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
  return { score, hands, wrong: g.wrong, tips: gymTips(hands, g.wrong, free) };
}

const HAND_WORD: Record<Hand, string> = { right: 'right hand', left: 'left hand' };

/** The habits worth naming, most important first (at most two). */
export function gymTips(hands: HandReport[], wrong: number, free?: FreeTempo): string[] {
  const tips: string[] = [];
  const late = free ? 'hesitates' : 'is';
  const missed = hands.reduce((a, r) => a + r.missed, 0);
  if (missed + wrong >= 3) tips.push('Several notes went missing or wrong: take the tempo down until every note is there, then build it back up.');
  for (const r of hands) {
    if (r.passLean !== undefined && r.otherLean !== undefined && r.passLean - r.otherLean >= 20) {
      tips.push(`The ${HAND_WORD[r.hand]} ${late} ${r.passLean - r.otherLean} ms ${free ? 'longer' : 'late'} where the thumb passes under or a finger crosses over. Practise just the turn slowly (3 1 3, or 4 1 4), moving the thumb under early, while the finger before it is still playing.`);
    }
  }
  for (const r of hands) {
    if (r.thumbLouder !== undefined && r.thumbLouder >= 8) tips.push(`The ${HAND_WORD[r.hand]}'s thumb bumps: its notes are ${r.thumbLouder} louder than the others. Let the thumb play lightly, from the side.`);
  }
  if (free) tips.push(...freeTips(free));
  else if (hands.length === 2 && hands.every((r) => r.played >= 4) && Math.abs(hands[0].lean - hands[1].lean) >= 30) {
    const [a, b] = hands[0].lean > hands[1].lean ? hands : [hands[1], hands[0]];
    tips.push(`The ${HAND_WORD[a.hand]} trails the ${HAND_WORD[b.hand]} by ${a.lean - b.lean} ms. Listen for one sound, not two.`);
  }
  for (const r of hands) {
    if (r.played >= 4 && r.spread >= 45) tips.push(`The ${HAND_WORD[r.hand]} is uneven (notes wander ±${r.spread} ms). ${free ? 'Try it with the click at this tempo or a little slower' : 'Try it with two notes a click at a slower tempo'}, and think in groups.`);
  }
  if (!tips.length && hands.some((r) => r.played)) tips.push(free ? 'Even all the way. Try it a little faster, or with the click at this tempo.' : 'Even and on the click. Try a faster tempo, two octaves or more notes a click.');
  return tips.slice(0, 2);
}

// ---------------------------------------------------------------- recognising the scale

/** A key pressed during a free run, kept so the run can be measured once the scale is known. */
export interface Played { midi: number; time: number; velocity: number }

/** Two keys this close together are played by the two hands at once. */
const TOGETHER_MS = 60;

/**
 * One hand or both: if most presses come in pairs (two keys within 60 ms), it is both hands and
 * the lower key of each pair is the left hand's. Otherwise one hand, the left one when the notes
 * sit mostly below middle C.
 */
export function splitHands(presses: Played[]): { hands: GymHands; right: Played[]; left: Played[] } {
  const paired = new Set<number>();
  for (let i = 1; i < presses.length; i++) {
    if (!paired.has(i - 1) && presses[i].time - presses[i - 1].time < TOGETHER_MS && presses[i].midi !== presses[i - 1].midi) {
      paired.add(i - 1);
      paired.add(i);
    }
  }
  if (presses.length >= 6 && paired.size >= presses.length * 0.6) {
    const right: Played[] = [], left: Played[] = [];
    for (let i = 0; i < presses.length; i++) {
      if (paired.has(i) && paired.has(i + 1) && presses[i + 1].time - presses[i].time < TOGETHER_MS) {
        const [lo, hi] = presses[i].midi < presses[i + 1].midi ? [presses[i], presses[i + 1]] : [presses[i + 1], presses[i]];
        left.push(lo);
        right.push(hi);
        i++;
      }
    }
    return { hands: 'together', right, left };
  }
  const low = median(presses.map((p) => p.midi)) < 60;
  return low ? { hands: 'left', right: [], left: presses } : { hands: 'right', right: presses, left: [] };
}

/** Fewest notes added, left out or changed to turn one line into the other. */
export function lineDistance(a: number[], b: number[]) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

const ROOT_OF_PC = new Map(GYM_ROOTS.map((r) => [parsePitchClass(r), r]));
/** A run is recognised only when at most this share of its notes differ from the scale's. */
const MAX_MISFIT = 0.35;

/** Moves one hand's notes in a plan by `semis`. */
const shiftHand = (plan: GymStep[], hand: Hand, semis: number): GymStep[] => plan.map((st) => {
  const k = st.keys[hand];
  return k ? { ...st, keys: { ...st.keys, [hand]: { ...k, midi: k.midi + semis } } } : st;
});

/**
 * Which scale or arpeggio a free run was: the one, starting on the first or lowest note, whose
 * line up and back down needs the fewest changes to become what was played (at most a third of
 * its notes), one or two octaves by the span played. The plan is moved to the octaves the hands
 * actually played in. Any of the 12 keys is tried, also for minor scales.
 */
export function recognise(presses: Played[]): { setup: GymSetup; plan: GymStep[]; misfit: number } | undefined {
  if (presses.length < 5) return undefined;
  const split = splitHands(presses);
  const main = (split.hands === 'left' ? split.left : split.right).map((p) => p.midi);
  if (main.length < 5) return undefined;
  const lo = Math.min(...main), hi = Math.max(...main);
  const octaves: 1 | 2 = hi - lo >= 18 ? 2 : 1;
  let best: { root: string; kind: GymKind; tonic: number; misfit: number } | undefined;
  for (const kind of GYM_KINDS.map((k) => k.id)) {
    for (const tonic of new Set([main[0], lo])) {
      const root = ROOT_OF_PC.get(((tonic % 12) + 12) % 12)!;
      const line = gymLine(root, kind, octaves, Math.floor(tonic / 12) - 1);
      const misfit = lineDistance(main, line) / line.length;
      if (!best || misfit < best.misfit - 1e-9) best = { root, kind, tonic, misfit };
    }
  }
  if (!best || best.misfit > MAX_MISFIT) return undefined;
  const setup: GymSetup = { root: best.root, kind: best.kind, octaves, hands: split.hands };
  let plan = gymPlan(setup);
  const mainHand: Hand = split.hands === 'left' ? 'left' : 'right';
  plan = shiftHand(plan, mainHand, best.tonic - plan[0].keys[mainHand]!.midi);
  if (split.hands === 'together' && split.left.length) {
    const first = split.left[0].midi, planned = plan[0].keys.left!.midi;
    plan = shiftHand(plan, 'left', Math.round((first - planned) / 12) * 12);
  }
  return { setup, plan, misfit: Math.round(best.misfit * 100) / 100 };
}

/** Feeds a recorded free run into a FreeGym on `plan`. */
export function replay(plan: GymStep[], presses: Played[]): FreeGym {
  const g = new FreeGym(plan);
  for (const p of presses) g.press(p.midi, p.time, p.velocity);
  return g;
}
