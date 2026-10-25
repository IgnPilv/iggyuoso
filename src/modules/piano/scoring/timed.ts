import { CHORD_WINDOW_MS } from '../midi/chords';
import { pitchClass, type Hand } from '../music/notes';
import { beatMs, type ExpectedNote } from '../music/timeline';
import { stars } from './stars';
import type { DynamicsResult } from './dynamics';
import type { PedalResult } from './pedal';

// Scores a timed exercise. Each hand is scored on its own; the feedback names the hand and the
// habit that gave way (early/late, rushing/dragging, uneven, misses, wrong notes, extras, short
// holds). All times are in ms relative to the first downbeat after the count-in, already
// corrected for audio latency. Pitches are written MIDI numbers (C4 = 60).

export interface PlayedNote {
  midi: number;
  on: number;
  off?: number;
  /** Key velocity (1–127), for dynamics. */
  velocity?: number;
}

export interface TimedScoreOptions {
  tempo: number;
  /** `side`: written notes from middle C up match each other, and those below it (two-hand tap). */
  pitchMatch: 'exact' | 'pitchClass' | 'any' | 'side';
}

export type Outcome = 'hit' | 'miss' | 'wrong';

export interface NoteResult {
  expected: ExpectedNote;
  outcome: Outcome;
  played?: PlayedNote;
  /** Signed: negative = early. */
  offsetMs?: number;
  shortHold?: boolean;
  points: number;
}

export interface HandResult {
  hand: Hand;
  notes: number;
  hits: number;
  misses: number;
  wrong: number;
  extras: number;
  shortHolds: number;
  /** Average signed timing of hits (negative = early). */
  meanOffsetMs: number | null;
  /** Standard deviation of hit timing. */
  spreadMs: number | null;
  /** How much later (positive) or earlier (negative) the hand landed by the end than at the start. */
  driftMs: number | null;
  score: number;
}

export interface Together {
  sharedBeats: number;
  /** Average distance between the hands on beats they share. */
  meanGapMs: number;
}

export type Habit =
  | 'missed' | 'wrong-notes' | 'extra-notes' | 'early' | 'late' | 'rushing' | 'dragging' | 'uneven'
  | 'short-holds' | 'hands-apart' | 'weaker-hand' | 'pedal' | 'dynamics' | 'clean';

export interface Feedback {
  hand?: Hand;
  habit: Habit;
  message: string;
}

export interface TimedResult {
  hands: HandResult[];
  together: Together | null;
  score: number;
  stars: 0 | 1 | 2 | 3;
  notes: NoteResult[];
  extras: { played: PlayedNote; hand: Hand }[];
  feedback: Feedback[];
  /** Set when the exercise has a pedal line; `score` and `stars` then include it. */
  pedal?: PedalResult;
  /** Set when the exercise's dynamics change; `score` and `stars` then include it (if it could be measured). */
  dynamics?: DynamicsResult;
}

export const PERFECT_MS = 50;
export const EARLY_LATE_MS = 40;
export const UNEVEN_MS = 70;
export const DRIFT_MS = 80;
export const TOGETHER_MS = 50;
export const SHORT_HOLD_FRACTION = 0.75;
const EXTRA_PENALTY = 0.5;
const SHORT_HOLD_FACTOR = 0.7;

/** Half-width of the window in which a key press counts as aimed at a note. */
export function hitWindowMs(tempo: number): number {
  return Math.min(350, Math.max(150, 0.45 * beatMs(tempo)));
}

export function timingPoints(offsetMs: number, windowMs: number): number {
  const d = Math.abs(offsetMs);
  if (d <= PERFECT_MS) return 1;
  if (d >= windowMs) return 0;
  return 1 - (0.5 * (d - PERFECT_MS)) / (windowMs - PERFECT_MS);
}

export function scoreTimed(expected: ExpectedNote[], playedRaw: PlayedNote[], opts: TimedScoreOptions): TimedResult {
  const bMs = beatMs(opts.tempo);
  const win = hitWindowMs(opts.tempo);
  // Presses during the count-in are warming up, not extras.
  const played = playedRaw.filter((p) => p.on >= -win);
  const handsPresent = (['right', 'left'] as const).filter((h) => expected.some((e) => e.hand === h));
  const samePitch = (a: number, b: number) =>
    opts.pitchMatch === 'any' || (opts.pitchMatch === 'side' ? (a >= 60) === (b >= 60) : opts.pitchMatch === 'pitchClass' ? pitchClass(a) === pitchClass(b) : a === b);
  const time = (e: ExpectedNote) => e.beat * bMs;

  // 1. Hits: pair expected and played notes of the same pitch, closest in time first.
  const pairs: { e: number; p: number; d: number }[] = [];
  expected.forEach((e, ei) => {
    played.forEach((p, pi) => {
      const d = Math.abs(p.on - time(e));
      if (d <= win && samePitch(e.midi, p.midi)) pairs.push({ e: ei, p: pi, d });
    });
  });
  pairs.sort((a, b) => a.d - b.d || a.e - b.e);
  const eMatch = new Array<number>(expected.length).fill(-1);
  const pUsed = new Array<boolean>(played.length).fill(false);
  for (const { e, p } of pairs) {
    if (eMatch[e] >= 0 || pUsed[p]) continue;
    eMatch[e] = p;
    pUsed[p] = true;
  }

  // 2. Wrong notes: a leftover press close to a note nobody hit is that note played wrong.
  const eWrong = new Array<number>(expected.length).fill(-1);
  played.forEach((p, pi) => {
    if (pUsed[pi]) return;
    let best = -1;
    let bestKey = Infinity;
    expected.forEach((e, ei) => {
      if (eMatch[ei] >= 0 || eWrong[ei] >= 0) return;
      const d = Math.abs(p.on - time(e));
      if (d > win) return;
      const key = d + Math.abs(p.midi - e.midi); // nearest in time, then in pitch
      if (key < bestKey) { bestKey = key; best = ei; }
    });
    if (best >= 0) { eWrong[best] = pi; pUsed[pi] = true; }
  });

  // A chord counts as one hit timed from its first note, but only within one hand: a gap
  // between the hands is exactly what "hands together" measures.
  const chordStart = new Map<PlayedNote, number>();
  for (const hand of handsPresent) {
    const hits = expected.flatMap((e, ei) => (e.hand === hand && eMatch[ei] >= 0 ? [played[eMatch[ei]]] : []));
    hits.sort((a, b) => a.on - b.on);
    let start = -Infinity;
    for (const p of hits) {
      if (p.on - start > CHORD_WINDOW_MS) start = p.on;
      chordStart.set(p, start);
    }
  }

  const notes: NoteResult[] = expected.map((e, ei) => {
    if (eMatch[ei] >= 0) {
      const p = played[eMatch[ei]];
      const offsetMs = chordStart.get(p)! - time(e);
      let points = timingPoints(offsetMs, win);
      let shortHold = false;
      if (e.beats >= 2 && p.off !== undefined && p.off - p.on < SHORT_HOLD_FRACTION * e.beats * bMs) {
        shortHold = true;
        points *= SHORT_HOLD_FACTOR;
      }
      return { expected: e, outcome: 'hit', played: p, offsetMs, shortHold, points };
    }
    if (eWrong[ei] >= 0) return { expected: e, outcome: 'wrong', played: played[eWrong[ei]], points: 0 };
    return { expected: e, outcome: 'miss', points: 0 };
  });

  // 3. Extras: everything else. Blame the hand whose note was nearest, else split at middle C.
  const extras = played.filter((_, pi) => !pUsed[pi]).map((p) => {
    let hand: Hand | undefined = handsPresent.length === 1 ? handsPresent[0] : undefined;
    if (!hand) {
      let bestD = win;
      for (const e of expected) {
        const d = Math.abs(p.on - time(e));
        if (d <= bestD) { bestD = d; hand = e.hand; }
      }
    }
    return { played: p, hand: hand ?? (p.midi < 60 ? 'left' : 'right') };
  });

  const hands = handsPresent.map((hand) => handResult(hand, notes, extras.filter((x) => x.hand === hand).length, bMs));
  const together = handsTogether(notes);
  const totalNotes = expected.length;
  const totalPoints = notes.reduce((s, n) => s + n.points, 0) - EXTRA_PENALTY * extras.length;
  const score = totalNotes ? Math.round((100 * Math.max(0, totalPoints)) / totalNotes) : 0;
  const result: TimedResult = { hands, together, score, stars: stars(score), notes, extras, feedback: [] };
  result.feedback = feedbackFor(result);
  return result;
}

function handResult(hand: Hand, all: NoteResult[], extras: number, bMs: number): HandResult {
  const mine = all.filter((n) => n.expected.hand === hand);
  const hits = mine.filter((n) => n.outcome === 'hit');
  const offsets = hits.map((n) => n.offsetMs!);
  const mean = offsets.length ? offsets.reduce((a, b) => a + b, 0) / offsets.length : null;
  const spread = mean !== null && offsets.length >= 2
    ? Math.sqrt(offsets.reduce((s, o) => s + (o - mean) ** 2, 0) / offsets.length)
    : null;
  let drift: number | null = null;
  if (hits.length >= 4) {
    const xs = hits.map((n) => n.expected.beat * bMs);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
    if (sxx > 0) {
      const slope = xs.reduce((s, x, i) => s + (x - mx) * (offsets[i] - mean!), 0) / sxx;
      drift = slope * (Math.max(...xs) - Math.min(...xs));
    }
  }
  const points = mine.reduce((s, n) => s + n.points, 0) - EXTRA_PENALTY * extras;
  const score = mine.length ? Math.round((100 * Math.max(0, points)) / mine.length) : 0;
  return {
    hand,
    notes: mine.length,
    hits: hits.length,
    misses: mine.filter((n) => n.outcome === 'miss').length,
    wrong: mine.filter((n) => n.outcome === 'wrong').length,
    extras,
    shortHolds: hits.filter((n) => n.shortHold).length,
    meanOffsetMs: mean === null ? null : Math.round(mean),
    spreadMs: spread === null ? null : Math.round(spread),
    driftMs: drift === null ? null : Math.round(drift),
    score,
  };
}

function handsTogether(notes: NoteResult[]): Together | null {
  const byBeat = new Map<number, { right: number[]; left: number[] }>();
  for (const n of notes) {
    if (n.outcome !== 'hit') continue;
    const slot = byBeat.get(n.expected.beat) ?? { right: [], left: [] };
    slot[n.expected.hand].push(n.played!.on);
    byBeat.set(n.expected.beat, slot);
  }
  const gaps: number[] = [];
  for (const { right, left } of byBeat.values()) {
    if (right.length && left.length) gaps.push(Math.abs(Math.min(...right) - Math.min(...left)));
  }
  if (!gaps.length) return null;
  return { sharedBeats: gaps.length, meanGapMs: Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) };
}

const HAND_NAME: Record<Hand, string> = { right: 'Right hand', left: 'Left hand' };
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

export function feedbackFor(r: Pick<TimedResult, 'hands' | 'together'>): Feedback[] {
  const out: Feedback[] = [];
  if (r.hands.length === 2) {
    const [a, b] = [...r.hands].sort((x, y) => x.score - y.score);
    if (b.score - a.score >= 10) {
      out.push({ hand: a.hand, habit: 'weaker-hand', message: `${HAND_NAME[a.hand]} gave way first (${a.score} vs ${b.score}). Practise it on its own, slowly.` });
    }
  }
  for (const h of [...r.hands].sort((x, y) => x.score - y.score)) {
    const H = HAND_NAME[h.hand];
    if (h.misses) out.push({ hand: h.hand, habit: 'missed', message: `${H} missed ${plural(h.misses, 'note')}.` });
    if (h.wrong) out.push({ hand: h.hand, habit: 'wrong-notes', message: `${H} played ${plural(h.wrong, 'wrong note')}. Check the keys before you start.` });
    if (h.meanOffsetMs !== null && h.hits >= 3 && Math.abs(h.meanOffsetMs) >= EARLY_LATE_MS) {
      const early = h.meanOffsetMs < 0;
      out.push({
        hand: h.hand,
        habit: early ? 'early' : 'late',
        message: `${H} tends to come in ${early ? 'early' : 'late'}, about ${Math.abs(h.meanOffsetMs)} ms ${early ? 'before' : 'after'} the click.`,
      });
    }
    if (h.driftMs !== null && Math.abs(h.driftMs) >= DRIFT_MS) {
      const rushing = h.driftMs < 0;
      out.push({
        hand: h.hand,
        habit: rushing ? 'rushing' : 'dragging',
        message: `${H} ${rushing ? 'sped up' : 'slowed down'} as it went. Keep listening to the click to the end.`,
      });
    }
    if (h.spreadMs !== null && h.hits >= 3 && h.spreadMs >= UNEVEN_MS) {
      out.push({ hand: h.hand, habit: 'uneven', message: `${H}'s beats were uneven. Count out loud with the click.` });
    }
    if (h.shortHolds) {
      out.push({ hand: h.hand, habit: 'short-holds', message: `${H} let go of long notes too soon (${plural(h.shortHolds, 'time')}). Hold each one for its full count.` });
    }
    if (h.extras) out.push({ hand: h.hand, habit: 'extra-notes', message: `${H} played ${plural(h.extras, 'extra note')}, for example during a rest.` });
  }
  if (r.together && r.together.meanGapMs >= TOGETHER_MS) {
    out.push({ habit: 'hands-apart', message: `The hands did not land together: about ${r.together.meanGapMs} ms apart on shared beats.` });
  }
  if (!out.length) out.push({ habit: 'clean', message: 'Clean and steady. Well done!' });
  return out;
}
