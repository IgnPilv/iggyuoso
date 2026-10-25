import { chordSymbols, type SymbolNote } from '../music/chordNames';
import { parsePitch, type Hand } from '../music/notes';
import { spell } from '../music/transcribe';

// The Play report (#/report): the player plays anything, with no click and nothing picked first,
// and the page works out what it heard: the tempo (and whether it crept up or sank), where a note
// came held back or hurried against the player's own beat, where they stopped, which hand lands
// first, how steady each hand is, the key, the chords and how loud. No DOM and no audio; times
// are ms on any one clock (performance.now() in the app), pitches are written MIDI (C4 = 60).

export interface PlayedNote {
  midi: number;
  on: number;
  /** Release time; unset while held (it then counts as held to the end). */
  off?: number;
  velocity: number;
}

export type Mark = 'held' | 'hurried' | 'stop';

/** A moment something was struck: the notes within `CHORD_MS` of the first count as one. */
export interface ReportEvent {
  time: number;
  midis: number[];
  hands: Hand[];
  /** Grid steps (the most common short note value) from the first event; halves and quarters for shorter notes. */
  pos: number;
  /** How much the gap before it was longer (+, held back) or shorter (−, hurried) than the beat around it. */
  devMs?: number;
  mark?: Mark;
  /** The player's tempo around here, in beats a minute. */
  bpm?: number;
}

export interface HandStats { count: number; spreadMs?: number }

export interface PlayReport {
  notes: number;
  seconds: number;
  /** The smallest note value heard, in ms, and how many of them make a beat. */
  unitMs: number;
  perBeat: number;
  bpm: number;
  events: ReportEvent[];
  /** How far a typical gap strays from the beat around it (ms, both hands, the worst tenth left out). */
  spreadMs: number;
  tempo: { start: number; end: number; change: 'steady' | 'faster' | 'slower' };
  held: ReportEvent[];
  hurried: ReportEvent[];
  stops: ReportEvent[];
  hands: Partial<Record<Hand, HandStats>>;
  /** Mean ms the right hand lands after the left (minus = right first), where both strike together. */
  gapMs?: number;
  key?: { key: string; name: string; sure: boolean; other?: string };
  chords: { name: string; numeral?: string }[];
  dynamics?: { from: string; to: string; right?: number; left?: number };
  tips: string[];
}

/** Notes struck this close together are one chord, timed from the first. */
export const CHORD_MS = 60;
/** Right hand from middle C up (as everywhere in the app). */
const SPLIT = 60;
/** A gap this many steps longer than expected is a stop, not a timing slip. */
const STOP_STEPS = 4;
/** Gaps either side that make "the beat around" a note. */
const LOCAL = 6;
/** The beat is the step doubled until it is at least this long (140 a minute at most). */
const MIN_BEAT_MS = 430;

const handOf = (m: number): Hand => (m >= SPLIT ? 'right' : 'left');
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
/** Root mean square of the deviations, leaving out the worst tenth (one hesitation should not call a whole hand uneven; it is listed on its own). */
const spread = (xs: number[]) => {
  const s = xs.map(Math.abs).sort((a, b) => a - b);
  const kept = s.slice(0, s.length - Math.floor(s.length / 10) || 1);
  return Math.sqrt(mean(kept.map((x) => x * x)));
};

/** Groups notes into events: anything within CHORD_MS of an event's first note joins it. */
export function events(notes: PlayedNote[]): ReportEvent[] {
  const sorted = [...notes].sort((a, b) => a.on - b.on);
  const out: ReportEvent[] = [];
  for (const n of sorted) {
    const last = out[out.length - 1];
    if (last && n.on - last.time < CHORD_MS) {
      last.midis.push(n.midi);
      if (!last.hands.includes(handOf(n.midi))) last.hands.push(handOf(n.midi));
    } else out.push({ time: n.on, midis: [n.midi], hands: [handOf(n.midi)], pos: 0 });
  }
  return out;
}

/**
 * The smallest note value played often enough to be the grid: the shortest gap that at least an
 * eighth of the gaps (two at least) sit within 20% of, then fitted to every gap up to 8 steps
 * long that is close to a whole number of them. Undefined with fewer than four gaps to go on.
 */
export function unitOf(gaps: number[]): number | undefined {
  const xs = gaps.filter((x) => x >= 90 && x <= 2500).sort((a, b) => a - b);
  if (xs.length < 4) return undefined;
  const need = Math.max(2, Math.ceil(xs.length / 8));
  const seed = xs.find((x) => xs.filter((y) => y >= x * 0.8 && y <= x * 1.2).length >= need) ?? median(xs);
  let u = median(xs.filter((y) => y >= seed * 0.8 && y <= seed * 1.2));
  for (let i = 0; i < 3; i++) {
    let num = 0, den = 0;
    for (const x of xs) {
      const k = Math.round(x / u);
      // Dotted and short notes (1.5, 0.5 steps) say nothing about the step's size.
      if (k < 1 || k > 8 || Math.abs(x / u - k) > 0.2) continue;
      num += x * k;
      den += k * k;
    }
    if (den) u = num / den;
  }
  return u;
}

/**
 * Steps a gap is worth: rounded, leaning short, so a hesitation reads as held back rather than as
 * a longer note played hurried. A gap well under one step is a half or a quarter step (the short
 * note of a dotted rhythm, an odd pair of eighths among quarters), never a hurried whole step.
 */
export const stepsOf = (gap: number, unit: number, nextGap?: number) => {
  const r = gap / unit;
  if (r < 0.35) return 0.25;
  if (r < 0.7) return 0.5;
  // A dotted note: half a step over, and the next note a short one that makes up the rest.
  const over = r - Math.floor(r);
  if (over >= 0.35 && over <= 0.65 && nextGap !== undefined && nextGap / unit < 0.7) return Math.floor(r) + 0.5;
  return Math.max(1, Math.round(r - 0.2));
};

/**
 * Puts the events on a grid of the player's own step, following a tempo that drifts, then gives
 * each gap's deviation from the beat around it (the middle step of up to six gaps either side).
 * Fills in `pos`, `devMs`, `mark` and `bpm`. Returns the steps' size and how many make a beat.
 */
export function placeOnGrid(evs: ReportEvent[]): { unitMs: number; perBeat: number } | undefined {
  const gapsMs = evs.slice(1).map((e, i) => e.time - evs[i].time);
  const unit = unitOf(gapsMs);
  if (!unit) return undefined;
  let perBeat = 1;
  while (unit * perBeat < MIN_BEAT_MS && perBeat < 4) perBeat *= 2;

  // First pass, left to right: steps per gap, following the recent tempo.
  const per: { i: number; steps: number; perStep: number; stop: boolean }[] = [];
  let local = unit;
  evs[0].pos = 0;
  for (let i = 1; i < evs.length; i++) {
    const gap = evs[i].time - evs[i - 1].time;
    const stop = gap > (STOP_STEPS + 1) * local && gap > 1500;
    const next = i + 1 < evs.length ? evs[i + 1].time - evs[i].time : undefined;
    const steps = stop ? Math.round(gap / local) : stepsOf(gap, local, next);
    evs[i].pos = evs[i - 1].pos + steps;
    per.push({ i, steps, perStep: gap / steps, stop });
    const recent = per.filter((p) => !p.stop).slice(-LOCAL).map((p) => p.perStep);
    local = Math.max(unit * 0.75, Math.min(unit * 1.33, median(recent)));
  }

  // Second pass: each gap against the beat on both sides of it.
  const steady = per.filter((p) => !p.stop);
  steady.forEach((p, j) => {
    const around = [...steady.slice(Math.max(0, j - LOCAL), j), ...steady.slice(j + 1, j + 1 + LOCAL)].map((q) => q.perStep);
    const at = around.length >= 2 ? median(around) : unit;
    const e = evs[p.i];
    e.devMs = Math.round(p.perStep * p.steps - at * p.steps);
    e.bpm = Math.round(60000 / (at * perBeat));
    const edge = Math.max(45, Math.min(120, at * 0.2)) + 0.05 * (p.steps - 1) * at;
    if (e.devMs > edge) e.mark = 'held';
    else if (e.devMs < -edge) e.mark = 'hurried';
  });
  for (const p of per) if (p.stop) evs[p.i].mark = 'stop';
  return { unitMs: unit, perBeat };
}

// ---------------------------------------------------------------- key

// Krumhansl–Kessler key profiles (how strongly each degree belongs to a major or minor key).
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const MAJOR_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINOR_KEYS = ['Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'];
export const keyName = (key: string) =>
  key.replace('#', '♯').replace(/([A-G])b/, '$1♭').replace(/m$/, ' minor').replace(/^([A-G][♯♭]?)$/, '$1 major');

function correlate(xs: number[], ys: number[]) {
  const mx = mean(xs), my = mean(ys);
  let n = 0, dx = 0, dy = 0;
  for (let i = 0; i < 12; i++) { n += (xs[i] - mx) * (ys[i] - my); dx += (xs[i] - mx) ** 2; dy += (ys[i] - my) ** 2; }
  return dx && dy ? n / Math.sqrt(dx * dy) : 0;
}

/**
 * The key the notes fit best (each note weighed by how long it sounds, up to two seconds, plus a
 * little for being struck), with the runner-up named when it is nearly as good. The lowest note
 * of the first and last events counts double, since tunes tend to start and end at home.
 */
export function detectKey(notes: PlayedNote[]): PlayReport['key'] {
  const pcs = new Set(notes.map((n) => n.midi % 12));
  if (notes.length < 6 || pcs.size < 4) return undefined;
  const end = Math.max(...notes.map((n) => n.off ?? n.on));
  const weight = Array(12).fill(0);
  for (const n of notes) weight[n.midi % 12] += Math.min(2000, Math.max(150, (n.off ?? end) - n.on)) / 1000 + 0.3;
  const sorted = [...notes].sort((a, b) => a.on - b.on);
  for (const group of [sorted.filter((n) => n.on - sorted[0].on < CHORD_MS), sorted.filter((n) => sorted[sorted.length - 1].on - n.on < CHORD_MS)]) {
    const low = Math.min(...group.map((n) => n.midi));
    weight[low % 12] += 1;
  }
  const scores: { key: string; r: number }[] = [];
  for (let t = 0; t < 12; t++) {
    const rot = weight.slice(t).concat(weight.slice(0, t));
    scores.push({ key: MAJOR_KEYS[t], r: correlate(rot, MAJOR) }, { key: MINOR_KEYS[t], r: correlate(rot, MINOR) });
  }
  scores.sort((a, b) => b.r - a.r);
  const [a, b] = scores;
  const sure = a.r >= 0.6 && a.r - b.r >= 0.05;
  return { key: a.key, name: keyName(a.key), sure, other: a.r - b.r < 0.05 ? keyName(b.key) : undefined };
}

// ---------------------------------------------------------------- chords

const ROOT_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const MAJOR_NUMERALS = ['I', '♭II', 'II', '♭III', 'III', 'IV', '♯IV', 'V', '♭VI', 'VI', '♭VII', 'VII'];
const MINOR_NUMERALS = ['I', '♭II', 'II', 'III', '♯III', 'IV', '♯IV', 'V', 'VI', '♯VI', 'VII', 'VII'];

/** The chord's Roman numeral in a key: lower case for minor and diminished chords. */
export function numeral(name: string, key: string): string | undefined {
  const m = /^([A-G])([♯♭#b]?)(.*)$/.exec(name);
  const k = /^([A-G])([#b]?)(m?)$/.exec(key);
  if (!m || !k) return undefined;
  const acc = (s: string) => (s === '♯' || s === '#' ? 1 : s === '♭' || s === 'b' ? -1 : 0);
  const root = ROOT_PC[m[1]] + acc(m[2]);
  const tonic = ROOT_PC[k[1]] + acc(k[2]);
  const deg = (((root - tonic) % 12) + 12) % 12;
  const base = (k[3] ? MINOR_NUMERALS : MAJOR_NUMERALS)[deg];
  const rest = m[3];
  const small = /^m(?!aj)/.test(rest) || rest.startsWith('dim');
  const tail = rest.startsWith('dim7') ? '°7' : rest.startsWith('dim') ? '°' : rest === 'm7♭5' ? 'ø7' : rest.replace(/^m(?!aj)/, '');
  return (small ? base.toLowerCase() : base) + tail;
}

/**
 * The chords heard, in order, each named once where it changes (as on a lead sheet), read with
 * the sheet's own chord namer from the two hands as lines on the grid: a note lasts until its
 * release or its hand's next note, whichever comes first.
 */
export function chordsHeard(notes: PlayedNote[], evs: ReportEvent[], unitMs: number, perBeat: number, key: string): PlayReport['chords'] {
  const byTime = new Map(evs.map((e) => [e.time, e]));
  const sorted = [...notes].sort((a, b) => a.on - b.on);
  // Each note's event (its grid place).
  const eventOf = new Map<PlayedNote, ReportEvent>();
  let cur: ReportEvent | undefined;
  for (const n of sorted) {
    if (byTime.has(n.on)) cur = byTime.get(n.on);
    if (cur) eventOf.set(n, cur);
  }
  const end = Math.max(...notes.map((n) => n.off ?? n.on));
  const parts = (['right', 'left'] as Hand[]).map((hand) => {
    const mine = sorted.filter((n) => handOf(n.midi) === hand);
    const groups: { pos: number; notes: PlayedNote[] }[] = [];
    for (const n of mine) {
      const pos = eventOf.get(n)?.pos ?? 0;
      const last = groups[groups.length - 1];
      if (last && last.pos === pos) last.notes.push(n);
      else groups.push({ pos, notes: [n] });
    }
    const line: SymbolNote[] = [];
    let at = 0;
    groups.forEach((g, i) => {
      if (g.pos > at) line.push({ pitches: [], beats: (g.pos - at) / perBeat });
      const next = groups[i + 1]?.pos ?? g.pos + perBeat * 4;
      const held = Math.max(...g.notes.map((n) => ((n.off ?? end) - n.on) / unitMs));
      const len = Math.min(next - g.pos, Math.max(0.5, Math.round(held * 2) / 2));
      line.push({ pitches: g.notes.map((n) => parsePitch(spell(n.midi, key))), beats: len / perBeat });
      at = g.pos + len;
    });
    return { notes: line };
  }).filter((p) => p.notes.length);
  return chordSymbols(parts).map((c) => ({ name: c.name, numeral: numeral(c.name, key) }));
}

// ---------------------------------------------------------------- dynamics

const LEVELS: [number, string][] = [[40, 'pp'], [56, 'p'], [72, 'mp'], [88, 'mf'], [104, 'f'], [128, 'ff']];
export const levelOf = (velocity: number) => LEVELS.find(([top]) => velocity < top)?.[1] ?? 'ff';

function dynamicsOf(notes: PlayedNote[]): PlayReport['dynamics'] {
  const vs = notes.map((n) => n.velocity);
  if (Math.max(...vs) - Math.min(...vs) < 8) return undefined; // every key the same: no velocities to judge
  const s = [...vs].sort((a, b) => a - b);
  const q = (f: number) => s[Math.min(s.length - 1, Math.floor(f * s.length))];
  const by = (hand: Hand) => {
    const mine = notes.filter((n) => handOf(n.midi) === hand).map((n) => n.velocity);
    return mine.length >= 4 ? Math.round(median(mine)) : undefined;
  };
  return { from: levelOf(q(0.1)), to: levelOf(q(0.9)), right: by('right'), left: by('left') };
}

// ---------------------------------------------------------------- the report

const at = (e: ReportEvent, start: number) => {
  const s = Math.max(0, Math.round((e.time - start) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
/** Where something happened, in words: "at 0:12, on E4". */
export const where = (e: ReportEvent, start: number, key = 'C') =>
  `at ${at(e, start)}, on ${[...new Set(e.midis)].sort((a, b) => b - a).map((m) => spell(m, key).replace('#', '♯').replace(/([A-G])b/, '$1♭')).join(' + ')}`;

/** What the take was like. Undefined until there are at least eight things struck to go on. */
export function playReport(notes: PlayedNote[]): PlayReport | undefined {
  const evs = events(notes);
  if (evs.length < 8) return undefined;
  const grid = placeOnGrid(evs);
  if (!grid) return undefined;
  const { unitMs, perBeat } = grid;
  const timed = evs.filter((e) => e.devMs !== undefined);
  const bpm = Math.round(60000 / (unitMs * perBeat));
  const curve = timed.map((e) => e.bpm!);
  const third = Math.max(1, Math.floor(curve.length / 3));
  const start = Math.round(median(curve.slice(0, third)));
  const endBpm = Math.round(median(curve.slice(-third)));
  const moved = curve.length >= 9 && Math.abs(endBpm - start) >= Math.max(4, start * 0.06);
  const change = !moved ? 'steady' : endBpm > start ? 'faster' : 'slower';

  const biggest = (mark: Mark, sign: number) => evs.filter((e) => e.mark === mark).sort((a, b) => sign * (b.devMs! - a.devMs!)).slice(0, 3);
  const hands: PlayReport['hands'] = {};
  for (const hand of ['right', 'left'] as Hand[]) {
    const mine = evs.filter((e) => e.hands.includes(hand));
    if (!mine.length) continue;
    const devs = mine.filter((e) => e.devMs !== undefined).map((e) => e.devMs!);
    hands[hand] = { count: mine.length, spreadMs: devs.length >= 4 ? Math.round(spread(devs)) : undefined };
  }
  // Hands together: in each event with both hands, the first right note against the first left one.
  const sorted = [...notes].sort((a, b) => a.on - b.on);
  const pairs = evs.filter((e) => e.hands.length === 2).map((e) => {
    const inIt = sorted.filter((n) => n.on >= e.time && n.on - e.time < CHORD_MS);
    const r = inIt.find((n) => handOf(n.midi) === 'right'), l = inIt.find((n) => handOf(n.midi) === 'left');
    return r && l ? r.on - l.on : undefined;
  }).filter((x): x is number => x !== undefined);
  const key = detectKey(notes);
  const report: PlayReport = {
    notes: notes.length,
    seconds: Math.round((Math.max(...notes.map((n) => n.off ?? n.on)) - evs[0].time) / 1000),
    unitMs: Math.round(unitMs), perBeat, bpm, events: evs,
    spreadMs: Math.round(spread(timed.map((e) => e.devMs!))),
    tempo: { start, end: endBpm, change },
    held: biggest('held', 1), hurried: biggest('hurried', -1), stops: evs.filter((e) => e.mark === 'stop'),
    hands, gapMs: pairs.length >= 3 ? Math.round(mean(pairs)) : undefined,
    key,
    chords: chordsHeard(notes, evs, unitMs, perBeat, key?.key ?? 'C'),
    dynamics: dynamicsOf(notes),
    tips: [],
  };
  report.tips = reportTips(report);
  return report;
}

/** Up to three things to work on (or one thing done well), most useful first. */
export function reportTips(r: PlayReport): string[] {
  const tips: string[] = [];
  const key = r.key?.key ?? 'C';
  if (r.stops.length) {
    tips.push(`You stopped ${r.stops.length === 1 ? 'once' : `${r.stops.length} times`} (${where(r.stops[0], r.events[0].time, key)}). Practise that spot slowly on its own, then play through it without stopping, even with a wrong note.`);
  }
  if (r.tempo.change !== 'steady') {
    tips.push(r.tempo.change === 'faster'
      ? `You sped up from about ${r.tempo.start} to ${r.tempo.end} a minute. Play it with a click at ${r.tempo.start} to feel the pull.`
      : `You slowed down from about ${r.tempo.start} to ${r.tempo.end} a minute. Start at the tempo you can keep to the end.`);
  }
  // A note the player keeps waiting before is a spot to learn.
  const before = new Map<string, number>();
  for (const e of r.events.filter((x) => x.mark === 'held')) {
    const name = spell(Math.max(...e.midis), key).replace('#', '♯').replace(/([A-G])b/, '$1♭');
    before.set(name, (before.get(name) ?? 0) + 1);
  }
  const [worst] = [...before].sort((a, b) => b[1] - a[1]);
  if (worst && worst[1] >= 2) tips.push(`You held back before ${worst[0]} ${worst[1]} times. Know where the hand goes next before you get there: play the move on its own until it is ready in time.`);
  if (r.gapMs !== undefined && Math.abs(r.gapMs) >= 25) {
    tips.push(`Where both hands play together the ${r.gapMs > 0 ? 'left' : 'right'} hand lands about ${Math.abs(r.gapMs)} ms first. Listen for one sound, not two.`);
  }
  const d = r.dynamics;
  if (d?.right !== undefined && d.left !== undefined && d.left > d.right + 8) {
    tips.push('The left hand plays louder than the right. Let the tune on top sing and keep the accompaniment under it.');
  }
  if (r.hurried.length >= 3 && r.hurried.length > r.held.length * 2) {
    tips.push('Most slips were hurried notes. Give the long notes their full length before you move on.');
  }
  if (!tips.length) {
    tips.push(r.spreadMs <= Math.max(25, r.unitMs * 0.08)
      ? `Steady: your gaps keep within about ${r.spreadMs} ms of your own beat. Try it a little faster, or try it with the click.`
      : 'No one place stands out. Play it again and listen for an even beat.');
  }
  return tips.slice(0, 3);
}
