import type { PedalSpan } from '../music/timeline';

// Scores the sustain pedal against a pedal line. Times are song ms (0 = first downbeat), like
// the notes. Each stretch of pedal is worth one point: half for getting it down at the right
// moment (pressed with or just after the chord; at a change, lifted as the chord sounds and
// pressed again), half for keeping it down to the end and lifting in time.

export interface PedalPress {
  down: boolean;
  at: number;
}

export type PedalHabit = 'held' | 'early-change' | 'late-press' | 'missing' | 'early-lift' | 'late-lift';

export interface PedalSpanResult {
  span: PedalSpan;
  problems: PedalHabit[];
  points: number;
}

export interface PedalResult {
  score: number;
  spans: PedalSpanResult[];
  counts: Partial<Record<PedalHabit, number>>;
}

/** Pedal down for this fraction of a stretch counts as held. */
const HOLD_FRACTION = 0.9;
/** Share of the final score that is pedal, when an exercise has a pedal line. */
export const PEDAL_WEIGHT = 0.25;

export function scorePedal(spans: PedalSpan[], presses: PedalPress[], opts: { beatMs: number; windowMs: number; initialDown: boolean }): PedalResult {
  const events = [...presses].sort((a, b) => a.at - b.at);
  const stateAt = (t: number) => {
    let down = opts.initialDown;
    for (const e of events) {
      if (e.at > t) break;
      down = e.down;
    }
    return down;
  };
  const changesIn = (a: number, b: number) => events.filter((e) => e.at >= a && e.at <= b);
  /** Is the pedal up at any moment in [a, b]? */
  const upDuring = (a: number, b: number) => !stateAt(a) || changesIn(a, b).some((e) => !e.down);
  /** Fraction of [a, b] with the pedal down. */
  const downFraction = (a: number, b: number) => {
    if (b <= a) return 1;
    let down = stateAt(a);
    let t = a;
    let total = 0;
    for (const e of changesIn(a, b)) {
      if (down) total += e.at - t;
      down = e.down;
      t = e.at;
    }
    if (down) total += b - t;
    return total / (b - a);
  };

  const { beatMs: bMs, windowMs: win } = opts;
  const last = spans.length - 1;
  const marks = spans.map((span, i) => {
    const start = span.beat * bMs;
    const end = (span.beat + span.beats) * bMs;
    const grace = Math.min(0.5 * bMs + win, (end - start) / 2); // time to press after the chord
    const problems: PedalHabit[] = [];
    let pressPoints = 0.5;
    const downBy = stateAt(start + grace);
    if (span.change && !upDuring(start - win / 2, start + grace)) {
      // Never lifted around the chord: was it changed too soon, or not at all?
      problems.push(upDuring(start - bMs, start - win / 2) ? 'early-change' : 'held');
      pressPoints = 0;
    } else if (!downBy) {
      const pressedLater = changesIn(start + grace, end - win).some((e) => e.down);
      problems.push(pressedLater ? 'late-press' : 'missing');
      pressPoints = 0;
    }
    let holdPoints = 0;
    if (!problems.includes('missing')) {
      const held = downFraction(start + grace, end - win);
      holdPoints = 0.5 * Math.min(1, held / HOLD_FRACTION);
      if (held < HOLD_FRACTION && !problems.includes('late-press')) problems.push('early-lift');
      // A stretch before a rest must end with the pedal up (the last one may ring on).
      if (span.lift && i < last && !upDuring(end - win, end + win)) {
        problems.push('late-lift');
        holdPoints = Math.max(0, holdPoints - 0.25);
      }
    }
    return { span, problems, pressPoints, holdPoints };
  });
  // A change made too early also cuts the stretch before it short; count that mistake once.
  marks.forEach((m, i) => {
    const prev = marks[i - 1];
    if (!m.problems.includes('early-change') || !prev?.problems.includes('early-lift')) return;
    prev.problems = prev.problems.filter((p) => p !== 'early-lift');
    prev.holdPoints = prev.problems.includes('late-lift') ? 0.25 : 0.5;
  });
  const results: PedalSpanResult[] = marks.map((m) => ({ span: m.span, problems: m.problems, points: m.pressPoints + m.holdPoints }));

  const counts: Partial<Record<PedalHabit, number>> = {};
  for (const r of results) for (const p of r.problems) counts[p] = (counts[p] ?? 0) + 1;
  const score = spans.length ? Math.round((100 * results.reduce((a, r) => a + r.points, 0)) / spans.length) : 100;
  return { score, spans: results, counts };
}

const times = (n: number) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);

/** Plain advice for each pedal habit, most important first. */
export function pedalMessages(r: PedalResult): string[] {
  const c = r.counts;
  const out: string[] = [];
  if (c.held) out.push(`Pedal: held through a chord change ${times(c.held)}. Lift it as the new chord sounds, then press it again.`);
  if (c['early-change']) out.push(`Pedal: changed before the new chord ${times(c['early-change'])}. Play the chord, then lift and press.`);
  if (c['late-press']) out.push(`Pedal: pressed late ${times(c['late-press'])}. Press it just after the chord.`);
  if (c.missing) out.push(`Pedal: missing ${times(c.missing)}.`);
  if (c['early-lift']) out.push(`Pedal: lifted early ${times(c['early-lift'])}. Keep it down to the end of the line.`);
  if (c['late-lift']) out.push(`Pedal: lifted late ${times(c['late-lift'])}, so the sound ran into the rest.`);
  return out;
}
