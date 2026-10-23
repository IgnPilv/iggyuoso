import { parseExercise } from '../content/load';
import type { Exercise, GeneratedExercise } from '../content/types';
import { diatonicStep, LETTERS, parseDuration, parseMeter, parsePitch, pitchToMidi, type Pitch } from '../music/notes';
import { interval, keySignature, parseKey } from '../music/theory';

// Generated drills (`kind: generated`): each run draws fresh questions from a pool and becomes an
// ordinary quiz or timed exercise, built as raw content and checked by the same loader. The
// drill's mastery goal rides along as `goal`, so the players can score it (see applyGoal).

type Rng = () => number;
type Raw = Record<string, unknown>;

const pick = <T>(xs: readonly T[], rng: Rng): T => xs[Math.min(xs.length - 1, Math.floor(rng() * xs.length))];
const ACC = ['b', '', '#'];
export const pitchText = (p: Pitch) => `${p.letter}${ACC[p.accidental + 1]}${p.octave}`;
const nameOf = (p: Pitch) => `${p.letter}${ACC[p.accidental + 1]}`;
const pitchAt = (step: number, key: string): Pitch => {
  const letter = LETTERS[((step % 7) + 7) % 7];
  return { letter, accidental: keySignature(key).of[letter], octave: Math.floor(step / 7) };
};

/** The notes of the pool, spelled in a key: every key note in the range, or the listed notes. */
export function poolNotes(ex: GeneratedExercise, key: string): Pitch[] {
  if (ex.list) return ex.list;
  const [lo, hi] = ex.range!;
  const out: Pitch[] = [];
  for (let s = diatonicStep(lo); s <= diatonicStep(hi); s++) {
    const p = pitchAt(s, key);
    const m = pitchToMidi(p);
    if (m >= pitchToMidi(lo) && m <= pitchToMidi(hi)) out.push(p);
  }
  return out;
}

const clefFor = (ex: GeneratedExercise, p: Pitch) => (ex.clefs === 'grand' ? (pitchToMidi(p) >= 60 ? 'treble' : 'bass') : ex.clefs);

/** A few answer buttons: the right one and others from `pool`, in a random order. */
function choicesWith(right: string, pool: string[], rng: Rng, n = 4) {
  const others = [...new Set(pool.filter((x) => x !== right))];
  const chosen = [right];
  while (chosen.length < n && others.length) chosen.push(others.splice(Math.floor(rng() * others.length), 1)[0]);
  for (let i = chosen.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [chosen[i], chosen[j]] = [chosen[j], chosen[i]];
  }
  return { choices: chosen, correct: chosen.indexOf(right) };
}

/** A random item from `xs`, but not the same as the one before when there is a choice. */
function drawer<T>(xs: T[], rng: Rng, same: (a: T, b: T) => boolean) {
  let last: T | undefined;
  return () => {
    let x = pick(xs, rng);
    for (let tries = 0; last !== undefined && same(x, last) && xs.length > 1 && tries < 10; tries++) x = pick(xs, rng);
    last = x;
    return x;
  };
}

function readNotes(ex: GeneratedExercise, rng: Rng): Raw {
  const key = () => pick(ex.keys, rng);
  const draws = new Map<string, () => Pitch>();
  const questions = Array.from({ length: ex.questions }, () => {
    const k = key();
    if (!draws.has(k)) draws.set(k, drawer(poolNotes(ex, k), rng, (a, b) => pitchToMidi(a) === pitchToMidi(b)));
    const p = draws.get(k)!();
    const q: Raw = { staff: `${pitchText(p)}:w`, clef: clefFor(ex, p), ...(k !== 'C' ? { key: k } : {}) };
    if (ex.answer === 'name') {
      const names = poolNotes(ex, k).map(nameOf);
      return { ...q, ask: 'Which note is this?', ...choicesWith(nameOf(p), names, rng) };
    }
    return { ...q, ask: 'Play this note.', play: pitchText(p) };
  });
  return { kind: 'quiz', prompt: ex.prompt ?? (ex.answer === 'name' ? 'Name each note.' : 'Play each note you see, in the right octave.'), questions };
}

function findNotes(ex: GeneratedExercise, rng: Rng): Raw {
  const k = pick(ex.keys, rng);
  const names = [...new Map(poolNotes(ex, k).map((p) => [nameOf(p), p])).values()];
  const draw = drawer(names, rng, (a, b) => nameOf(a) === nameOf(b));
  const questions = Array.from({ length: ex.questions }, () => {
    const p = draw();
    return { ask: `Find ${nameOf(p).replace('#', '♯').replace('b', '♭')}, any one.`, play: pitchText(p) };
  });
  return { kind: 'quiz', pitchMatch: 'pitchClass', prompt: ex.prompt ?? 'Find each note as fast as you can: any octave counts.', questions };
}

/** The note `code` above `p`, spelled with the right letter, or undefined if that needs a double sharp or flat. */
function above(p: Pitch, code: string): Pitch | undefined {
  const number = code === 'TT' ? 4 : Number(code.slice(1));
  const step = diatonicStep(p) + number - 1;
  const letter = LETTERS[step % 7];
  const natural = { letter, accidental: 0 as const, octave: Math.floor(step / 7) };
  const acc = pitchToMidi(p) + interval(code).semitones - pitchToMidi(natural);
  if (acc < -1 || acc > 1) return undefined;
  return { ...natural, accidental: acc as -1 | 0 | 1 };
}

function intervals(ex: GeneratedExercise, rng: Rng): Raw {
  const names = ex.intervals.map((c) => interval(c).name);
  const k = pick(ex.keys, rng);
  const lows = poolNotes(ex, k);
  const draw = drawer(ex.intervals, rng, (a, b) => a === b);
  const questions = Array.from({ length: ex.questions }, () => {
    const code = draw();
    let low = pick(lows, rng);
    let high = above(low, code);
    for (let tries = 0; !high && tries < 20; tries++) { low = pick(lows, rng); high = above(low, code); }
    if (!high) { low = parsePitch('C4'); high = above(low, code)!; }
    const together = rng() < 0.4;
    const staff = together ? `${pitchText(low)}+${pitchText(high)}:w` : `${pitchText(low)}:h ${pitchText(high)}:h`;
    return { ask: 'Which interval is this?', staff, clef: clefFor(ex, low), ...(k !== 'C' ? { key: k } : {}), ...choicesWith(interval(code).name, names, rng) };
  });
  return { kind: 'quiz', prompt: ex.prompt ?? 'Name each interval: count the lines and spaces from the lower note.', questions };
}

const BAR_VALUE: Record<number, string> = { 4: 'w', 3: 'h.', 2: 'h', 1.5: 'q.', 1: 'q' };

/** Note values filling `bars` bars, as duration codes; eighths come in pairs on the beat. */
function rhythm(ex: GeneratedExercise, rng: Rng): string[][] {
  const { quarters } = parseMeter(ex.meter);
  const values = ex.durations.map((d) => ({ d, beats: parseDuration(d).beats })).sort((a, b) => b.beats - a.beats);
  const out: string[][] = [];
  for (let b = 0; b < ex.bars; b++) {
    const last = b === ex.bars - 1;
    // The last bar ends on one long note when the meter allows it.
    if (last && BAR_VALUE[quarters] && ex.bars > 1) { out.push([BAR_VALUE[quarters]]); continue; }
    const bar: string[] = [];
    let left = quarters;
    while (left > 1e-6) {
      const fits = values.filter((v) => v.beats <= left + 1e-6 && (v.beats !== 0.5 || left >= 1 - 1e-6));
      if (!fits.length) { bar.push(`r:${left === 0.5 ? 'e' : 'q'}`); left -= left === 0.5 ? 0.5 : 1; continue; }
      const v = pick(fits, rng);
      if (v.beats === 0.5) { bar.push('e', 'e'); left -= 1; } else { bar.push(v.d); left -= v.beats; }
    }
    out.push(bar);
  }
  return out;
}

function rhythmRead(ex: GeneratedExercise, rng: Rng): Raw {
  const bars = rhythm(ex, rng);
  const text = bars.map((bar) => bar.map((d) => (d.startsWith('r:') ? d : `x:${d}`)).join(' ')).join(' | ');
  return { kind: 'tap', display: 'staff', tempo: ex.tempo, meter: ex.meter, rhythm: text, prompt: ex.prompt ?? 'Read the rhythm and tap it on any key.' };
}

function sightRead(ex: GeneratedExercise, rng: Rng): Raw {
  const k = pick(ex.keys, rng);
  const pool = poolNotes(ex, k);
  const tonic = parseKey(k.replace(/m$/, '') + (k.endsWith('m') ? 'm' : '')).tonicPc;
  const tonics = pool.map((p, i) => ({ p, i })).filter(({ p }) => ((pitchToMidi(p) % 12) + 12) % 12 === tonic);
  const home = tonics.length ? tonics[Math.floor(tonics.length / 2)].i : Math.floor(pool.length / 2);
  let at = home;
  // Mostly steps, some skips of a third, never leaving the pool.
  const move = () => {
    const r = rng();
    const d = r < 0.35 ? 1 : r < 0.7 ? -1 : r < 0.8 ? 0 : r < 0.9 ? 2 : -2;
    at = Math.max(0, Math.min(pool.length - 1, at + d));
    return pool[at];
  };
  const bars = rhythm(ex, rng);
  const text = bars.map((bar, bi) => bar.map((d, i) => {
    if (d.startsWith('r:')) return d;
    const lastNote = bi === bars.length - 1 && i === bar.length - 1;
    const p = bi === 0 && i === 0 ? pool[home] : lastNote ? pool[home] : move();
    return `${pitchText(p)}:${d}`;
  }).join(' ')).join(' | ');
  const hand = ex.hand === 'left' ? 'left' : 'right';
  return {
    kind: 'timed', display: 'staff', hand, tempo: ex.tempo, meter: ex.meter, [hand]: text,
    clef: ex.clefs === 'grand' ? (hand === 'left' ? 'bass' : 'treble') : ex.clefs,
    ...(k !== 'C' ? { key: k } : {}),
    prompt: ex.prompt ?? 'A new tune to read. Look ahead, keep going, and keep the beat.',
  };
}

const MAKERS = { 'read-notes': readNotes, 'find-notes': findNotes, intervals, 'rhythm-read': rhythmRead, 'sight-read': sightRead } as const;

/** This run of a generated drill, as a playable exercise that saves under the drill's id. */
export function generate(ex: GeneratedExercise, rng: Rng = Math.random): Exercise {
  const raw = MAKERS[ex.generator](ex, rng);
  const made = parseExercise({ ...raw, id: ex.id, ...(ex.title ? { title: ex.title } : {}), reps: ex.reps, days: ex.days });
  return { ...made, goal: ex.mastery };
}
