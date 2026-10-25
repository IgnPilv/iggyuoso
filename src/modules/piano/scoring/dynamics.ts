import type { PlayedNote } from './timed';

// Loud and soft, scored from key velocity. Keyboards differ a lot in how hard a "forte" is, so
// nothing is judged on its own: a change of mark (p to f) must be heard as a change between the
// two stretches (their middle velocities), and a crescendo or diminuendo must grow or fade
// through its bars. A keyboard that sends the same strength for every key (the computer
// keyboard, or a fixed-velocity setting) cannot be measured, and then dynamics are not scored.

export const LEVELS = ['pp', 'p', 'mp', 'mf', 'f', 'ff'] as const;
export type Level = (typeof LEVELS)[number];
/** One mark per bar: a level, a hairpin (`<` crescendo, `>` diminuendo), or nothing (`-`). */
export type DynamicMark = Level | '<' | '>' | '-';

/** A stretch of bars at one level, or one hairpin, in beats like the notes. */
export interface DynamicSpan {
  beat: number;
  beats: number;
  /** First and last bar, 1-based. */
  bars: [number, number];
  /** The level (0 = pp … 5 = ff); for a hairpin, the level it starts from. */
  level: number;
  /** A hairpin: +1 crescendo, −1 diminuendo, towards the next span's level. */
  hairpin?: 1 | -1;
}

/** Bar marks (one per bar) as spans. Bar 1 must carry a level; a hairpin must lead to a louder or softer one. */
export function dynamicSpans(marks: DynamicMark[], barQuarters: number, offset = 0): DynamicSpan[] {
  const out: DynamicSpan[] = [];
  marks.forEach((m, i) => {
    const beat = offset + i * barQuarters;
    const last = out[out.length - 1];
    if (m === '<' || m === '>') {
      const hairpin = m === '<' ? 1 : -1;
      if (last?.hairpin === hairpin) { last.beats += barQuarters; last.bars[1] = i + 1; return; }
      out.push({ beat, beats: barQuarters, bars: [i + 1, i + 1], level: last ? last.level : 3, hairpin });
      return;
    }
    const level = m === '-' ? (last?.hairpin ? undefined : last?.level) : LEVELS.indexOf(m);
    if (level === undefined) throw new Error(`bar ${i + 1}: a hairpin must end on a level (pp to ff)`);
    if (last && !last.hairpin && last.level === level) { last.beats += barQuarters; last.bars[1] = i + 1; return; }
    out.push({ beat, beats: barQuarters, bars: [i + 1, i + 1], level });
  });
  out.forEach((s, i) => {
    if (!s.hairpin) return;
    const next = out[i + 1];
    if (!next) throw new Error(`the ${s.hairpin > 0 ? 'crescendo' : 'diminuendo'} in bar ${s.bars[0]} needs a level after it`);
    if (Math.sign(next.level - s.level) !== s.hairpin) throw new Error(`bar ${s.bars[0]}: a ${s.hairpin > 0 ? 'crescendo must lead to a louder' : 'diminuendo must lead to a softer'} level`);
  });
  return out;
}

export interface DynamicsCheck {
  kind: 'change' | 'hairpin';
  /** The span this check is about (the later one, for a change). */
  span: DynamicSpan;
  from: Level;
  to: Level;
  /** Measured velocity difference in the expected direction (negative = the wrong way). */
  diff: number;
  credit: number;
  ok: boolean;
}

export interface DynamicsResult {
  /** False when every key came in at the same strength: nothing to measure, not scored. */
  measured: boolean;
  score: number;
  checks: DynamicsCheck[];
}

/** Share of the take score that is dynamics, when an exercise has marks that change. */
export const DYNAMICS_WEIGHT = 0.2;
/** Velocity steps (of 127) expected per level of difference, and the most asked for one change. */
const PER_LEVEL = 7;
const MAX_NEED = 24;
/** How much a hairpin should grow (or fade) from its first notes to its last. */
const HAIRPIN_NEED = 8;
const CREDIT_OK = 0.75;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const clamp = (x: number) => Math.max(0, Math.min(1, x));

/** Whether a set of marks has anything to score (at least one change of level). */
export const hasDynamics = (spans: DynamicSpan[]) => spans.length > 1;

export function scoreDynamics(spans: DynamicSpan[], played: PlayedNote[], opts: { beatMs: number; windowMs: number }): DynamicsResult {
  const withVel = played.filter((p) => p.velocity !== undefined && p.on >= -opts.windowMs);
  const measured = new Set(withVel.map((p) => p.velocity)).size > 1;
  if (!measured) return { measured, score: 100, checks: [] };
  // A press belongs to the span it starts in (a little early still counts for the new one).
  const inSpan = (s: DynamicSpan) => withVel
    .filter((p) => p.on >= s.beat * opts.beatMs - opts.windowMs && p.on < (s.beat + s.beats) * opts.beatMs - opts.windowMs)
    .sort((a, b) => a.on - b.on)
    .map((p) => p.velocity!);
  const vels = spans.map(inSpan);
  const checks: DynamicsCheck[] = [];
  const name = (l: number) => LEVELS[l];
  // Changes: each level stretch against the level stretch before it (a hairpin may sit between).
  let prev = -1;
  spans.forEach((s, i) => {
    if (s.hairpin) return;
    if (prev >= 0 && vels[prev].length && vels[i].length && spans[prev].level !== s.level) {
      const dir = Math.sign(s.level - spans[prev].level);
      const need = Math.min(MAX_NEED, PER_LEVEL * Math.abs(s.level - spans[prev].level));
      const diff = (median(vels[i]) - median(vels[prev])) * dir;
      const credit = clamp(diff / need);
      checks.push({ kind: 'change', span: s, from: name(spans[prev].level), to: name(s.level), diff: Math.round(diff), credit, ok: credit >= CREDIT_OK });
    }
    prev = i;
  });
  // Hairpins: the first third of the notes against the last third.
  spans.forEach((s, i) => {
    if (!s.hairpin) return;
    // Its own notes when there are enough; a short one also counts the note it arrives on.
    const line = vels[i].length >= 3 ? vels[i] : [...vels[i], ...vels[i + 1].slice(0, 1)];
    if (line.length < 3) return;
    const third = Math.max(1, Math.floor(line.length / 3));
    const diff = (mean(line.slice(-third)) - mean(line.slice(0, third))) * s.hairpin;
    const credit = clamp(diff / HAIRPIN_NEED);
    checks.push({ kind: 'hairpin', span: s, from: name(s.level), to: name(spans[i + 1].level), diff: Math.round(diff), credit, ok: credit >= CREDIT_OK });
  });
  const score = checks.length ? Math.round((100 * checks.reduce((a, c) => a + c.credit, 0)) / checks.length) : 100;
  return { measured, score, checks };
}

const barsText = ([a, b]: [number, number]) => (a === b ? `bar ${a}` : `bars ${a}–${b}`);

/** What to say about the dynamics of a take. */
export function dynamicsMessages(r: DynamicsResult): string[] {
  if (!r.measured) return ['Every key came in at the same strength, so loud and soft were not scored (the computer keyboard, or a keyboard set to fixed velocity).'];
  return r.checks.filter((c) => !c.ok).map((c) => {
    const where = barsText(c.span.bars);
    if (c.kind === 'hairpin') {
      return c.span.hairpin! > 0
        ? `The crescendo in ${where} did not grow: let each note be a little louder than the one before, up to ${c.to}.`
        : `The diminuendo in ${where} did not fade: let each note be a little softer than the one before, down to ${c.to}.`;
    }
    const louder = LEVELS.indexOf(c.to) > LEVELS.indexOf(c.from);
    const word = louder ? 'louder' : 'softer';
    const head = `${where[0].toUpperCase()}${where.slice(1)} (${c.to}) ${c.span.bars[0] === c.span.bars[1] ? 'was' : 'were'}`;
    return c.diff <= 0
      ? `${head} not ${word} than the ${c.from} before: ${louder ? 'play into the keys with more weight' : 'lighten the touch, from close to the keys'}.`
      : `${head} only a little ${word} than the ${c.from} before: make the difference bigger.`;
  });
}
