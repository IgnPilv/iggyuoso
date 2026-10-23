import { parse as parseYaml } from 'yaml';
import {
  barLengths, isTieEnd, parseDuration, parsePedal, parsePitch, pitchToMidi, type Meter, type Pitch, parseFingers, parseMeter, parsePitchClass, parsePitchList, parseTimedNotes, type NoteToken,
} from '../music/notes';
import { DEFAULT_LADDER } from '../engine/practice';
import { chordNotes, chordQuality, COMPARE, degreeSemitones, interval, keySignature, parseKey, scaleNotes } from '../music/theory';
import { GENERATORS } from './types';
import type {
  BuildTask, Content, EarItem, ExplainStep, Exercise, FindTarget, Lesson, LessonStep, PlaygroundStep, QuizQuestion, TheoryCheck,
  TheoryKeys, TheoryStaff, Unit,
} from './types';

// Turns the YAML files under content/ into typed data, and reports every problem it finds with
// the file it came from. The format is described in content/README.md.

export interface LoadResult {
  content: Content;
  errors: string[];
}

type Raw = Record<string, unknown>;

class FieldError extends Error {}

function str(o: Raw, key: string, required = true): string | undefined {
  const v = o[key];
  if (v === undefined || v === null) {
    if (required) throw new FieldError(`missing "${key}"`);
    return undefined;
  }
  if (typeof v !== 'string' && typeof v !== 'number') throw new FieldError(`"${key}" should be text`);
  return String(v);
}

function oneOf<T extends string>(o: Raw, key: string, allowed: readonly T[], fallback?: T): T | undefined {
  const v = str(o, key, false);
  if (v === undefined) return fallback;
  if (!allowed.includes(v as T)) throw new FieldError(`"${key}" should be one of ${allowed.join(', ')}, not "${v}"`);
  return v as T;
}

function fileBase(path: string): string {
  return path.split('/').pop()!.replace(/\.ya?ml$/, '');
}

export function loadContent(files: Record<string, string>): LoadResult {
  const errors: string[] = [];
  const units: Unit[] = [];
  const lessons = new Map<string, Lesson>();
  const exercises = new Map<string, Exercise>();

  const entries = Object.entries(files).sort(([a], [b]) => a.localeCompare(b));
  for (const [path, text] of entries) {
    const where = path.slice(path.indexOf('content/'));
    let raw: Raw;
    try {
      raw = parseYaml(text) as Raw;
      if (!raw || typeof raw !== 'object') throw new FieldError('file is empty or not a mapping');
    } catch (e) {
      errors.push(`${where}: ${(e as Error).message}`);
      continue;
    }
    try {
      if (path.includes('/units/')) {
        units.push(parseUnit(raw, Number(/(\d+)-/.exec(fileBase(path))?.[1] ?? 0)));
      } else if (path.includes('/lessons/')) {
        const l = parseLesson(raw);
        if (lessons.has(l.id)) throw new FieldError(`duplicate lesson id "${l.id}"`);
        lessons.set(l.id, l);
      } else if (path.includes('/exercises/')) {
        const ex = parseExercise(raw);
        if (ex.id !== fileBase(path)) throw new FieldError(`id "${ex.id}" should match the file name "${fileBase(path)}"`);
        if (exercises.has(ex.id)) throw new FieldError(`duplicate exercise id "${ex.id}"`);
        exercises.set(ex.id, ex);
      }
    } catch (e) {
      errors.push(`${where}: ${(e as Error).message}`);
    }
  }

  units.sort((a, b) => a.order - b.order);
  for (const u of units) {
    for (const id of u.lessons) {
      const l = lessons.get(id);
      if (!l) errors.push(`unit ${u.id}: lesson "${id}" not found`);
      else if (l.unit !== u.id) errors.push(`lesson ${id}: unit is "${l.unit}" but it is listed in unit "${u.id}"`);
    }
  }
  for (const l of lessons.values()) {
    for (const s of l.steps) {
      if ('exercise' in s && !exercises.has(s.exercise)) errors.push(`lesson ${l.id}: exercise "${s.exercise}" not found`);
    }
  }
  return { content: { units, lessons, exercises }, errors };
}

function parseUnit(raw: Raw, order: number): Unit {
  const lessons = raw.lessons;
  if (!Array.isArray(lessons)) throw new FieldError('"lessons" should be a list of lesson ids');
  return { id: str(raw, 'id')!, title: str(raw, 'title')!, summary: str(raw, 'summary', false) ?? '', lessons: lessons.map(String), order };
}

function parseLesson(raw: Raw): Lesson {
  if (!Array.isArray(raw.steps)) throw new FieldError('"steps" should be a list');
  const steps: LessonStep[] = raw.steps.map((s: unknown, i: number) => {
    const step = s as Raw;
    try {
      if (step && typeof step.explain === 'string') return parseExplain(step);
      if (step && typeof step.exercise === 'string') return { exercise: step.exercise };
      if (step && step.playground !== undefined) return parsePlayground(step);
    } catch (e) {
      throw new FieldError(`step ${i + 1}: ${(e as Error).message}`);
    }
    throw new FieldError(`step ${i + 1} should be "explain:", "exercise:" or "playground:"`);
  });
  const skills = Array.isArray(raw.skills) ? raw.skills.map(String) : [];
  return {
    id: str(raw, 'id')!, title: str(raw, 'title')!, unit: str(raw, 'unit')!, skills, steps, recap: str(raw, 'recap', false) ?? '',
  };
}

const obj = (v: unknown, what: string): Raw => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new FieldError(`"${what}" should be a map`);
  return v as Raw;
};
const GRAND = ['treble', 'bass', 'grand'] as const;

/** `staff:` in theory: a note string, or { notes, clef, key, labels }. */
function parseTheoryStaff(v: unknown): TheoryStaff {
  const o = typeof v === 'string' ? { notes: v } : obj(v, 'staff');
  try {
    const notes = parseTimedNotes(Array.isArray(o.notes) ? o.notes.join(' ') : str(o, 'notes')!);
    return {
      notes,
      clef: oneOf(o, 'clef', GRAND) ?? 'treble',
      labels: oneOf(o, 'labels', ['names', 'none'] as const) ?? 'none',
      ...(o.key !== undefined ? { key: checkKey(str(o, 'key')!) } : {}),
    };
  } catch (e) {
    throw new FieldError(`staff: ${(e as Error).message}`);
  }
}

/** `keys:` in theory: a pitch list, or { notes, labels, fingers }. */
function parseTheoryKeys(v: unknown): TheoryKeys {
  const o = typeof v === 'string' || Array.isArray(v) ? { notes: v } : obj(v, 'keys');
  try {
    const notes = pitches(o, 'notes');
    if (!notes.length) throw new FieldError('missing "notes"');
    const fingers = o.fingers !== undefined ? parseFingers(o.fingers as string) : undefined;
    if (fingers && fingers.length !== notes.length) throw new FieldError('"fingers" needs one number per key');
    const labels = oneOf(o, 'labels', ['names', 'fingers', 'none'] as const) ?? (fingers ? 'fingers' : 'none');
    if (labels === 'fingers' && !fingers) throw new FieldError('labels: fingers needs "fingers"');
    return { notes, labels, ...(fingers ? { fingers } : {}) };
  } catch (e) {
    throw new FieldError(`keys: ${(e as Error).message}`);
  }
}

/** Answer choices: plain text, or { text, why } for a reason shown when that choice is picked. */
function parseChoices(o: Raw): { choices: string[]; whys: (string | undefined)[] } | undefined {
  const raw = list(o, 'choices');
  if (!raw.length) return undefined;
  const items = raw.map((c) => (c && typeof c === 'object' ? { text: str(c as Raw, 'text')!, why: str(c as Raw, 'why', false) } : { text: String(c), why: undefined }));
  if (items.length < 2) throw new FieldError('"choices" needs at least two answers');
  const correct = Number(o.correct);
  if (!Number.isInteger(correct) || correct < 0 || correct >= items.length) {
    throw new FieldError(`"correct" should be the index of the right choice, 0 to ${items.length - 1}`);
  }
  return { choices: items.map((c) => c.text), whys: items.map((c) => c.why) };
}

function parseCheck(v: unknown): TheoryCheck {
  const o = obj(v, 'check');
  try {
    const c: TheoryCheck = { ask: str(o, 'ask')!, pitchMatch: o.pitchMatch === 'pitchClass' ? 'pitchClass' : 'exact' };
    const ch = parseChoices(o);
    if (ch) { c.choices = ch.choices; c.correct = Number(o.correct); }
    const play = pitches(o, 'play');
    if (play.length) c.play = play;
    if (!c.choices === !c.play) throw new FieldError('give either "choices" + "correct" or "play"');
    const why = str(o, 'why', false);
    if (why) c.why = why;
    if (o.staff !== undefined) c.staff = parseTheoryStaff(o.staff);
    if (o.keys !== undefined) c.keys = parseTheoryKeys(o.keys);
    return c;
  } catch (e) {
    throw new FieldError(`check: ${(e as Error).message}`);
  }
}

function parseExplain(o: Raw): ExplainStep {
  const step: ExplainStep = { explain: String(o.explain) };
  if (o.staff !== undefined) step.staff = parseTheoryStaff(o.staff);
  if (o.keys !== undefined) step.keys = parseTheoryKeys(o.keys);
  if (o.sound !== undefined) step.sound = parseTimedNotes(str(o, 'sound')!);
  const callout = str(o, 'callout', false);
  if (callout) step.callout = callout;
  const terms = strings(o, 'terms');
  if (terms.length) step.terms = terms;
  if (o.check !== undefined) step.check = parseCheck(o.check);
  return step;
}

function parsePlayground(o: Raw): PlaygroundStep {
  const p = o.playground === null || o.playground === true ? {} : obj(o.playground, 'playground');
  const text = str(p, 'notes', false) ?? 'C4-C5';
  const m = /^\s*(\S+)\s*-\s*(\S+)\s*$/.exec(text);
  if (!m) throw new FieldError('playground "notes" should be a range like C4-G5');
  const range: [ReturnType<typeof parsePitch>, ReturnType<typeof parsePitch>] = [parsePitch(m[1]), parsePitch(m[2])];
  if (pitchToMidi(range[1]) <= pitchToMidi(range[0])) throw new FieldError('playground "notes" should go from low to high');
  return {
    playground: {
      clef: oneOf(p, 'clef', GRAND) ?? 'treble', range,
      ...(p.prompt !== undefined ? { prompt: str(p, 'prompt')! } : {}),
      ...(p.key !== undefined ? { key: checkKey(str(p, 'key')!) } : {}),
    },
  };
}

function parseTarget(t: unknown): FindTarget {
  const o = t as Raw;
  if (o && (o.blackGroup === 2 || o.blackGroup === 3)) return { blackGroup: o.blackGroup };
  if (o && typeof o.pitchClass === 'string') return { pitchClass: parsePitchClass(o.pitchClass), name: o.pitchClass };
  if (o && (o.region === 'low' || o.region === 'high')) return { region: o.region };
  throw new FieldError(`target ${JSON.stringify(t)} should be { blackGroup: 2|3 }, { pitchClass: C } or { region: low|high }`);
}

/** Clean takes an exercise needs by default, and the days they are spread over. */
export const DEFAULT_REPS = 3;
export const DEFAULT_DAYS = 1;

function count(raw: Raw, key: string, fallback: number): number {
  const v = raw[key];
  if (v === undefined) return fallback;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 50) throw new FieldError(`"${key}" should be a whole number from 1 to 50`);
  return v;
}

const HANDS = ['right', 'left', 'alternating', 'together'] as const;

export function parseExercise(raw: Raw): Exercise {
  const id = str(raw, 'id')!;
  const kind = oneOf(raw, 'kind', ['find', 'sequence', 'timed', 'tap', 'ear', 'quiz', 'build', 'generated'] as const);
  if (!kind) throw new FieldError('missing "kind"');
  const base = {
    id,
    title: str(raw, 'title', false),
    prompt: str(raw, 'prompt', false),
    hand: oneOf(raw, 'hand', HANDS),
    display: oneOf(raw, 'display', ['keys', 'staff'] as const) ?? 'keys',
    clef: kind === 'generated' ? undefined : oneOf(raw, 'clef', ['treble', 'bass'] as const),
    ...(raw.key !== undefined ? { key: checkKey(str(raw, 'key')!) } : {}),
    reps: count(raw, 'reps', DEFAULT_REPS),
    days: count(raw, 'days', DEFAULT_DAYS),
  };
  if (base.days > base.reps) throw new FieldError('"days" cannot be more than "reps" (one clean take a day at least)');
  const pitchMatch = raw.pitchMatch === 'pitchClass' ? 'pitchClass' : 'exact';
  if (raw.pitchMatch !== undefined && raw.pitchMatch !== 'pitchClass') throw new FieldError('"pitchMatch" can only be pitchClass');

  if (kind === 'find') {
    if (!Array.isArray(raw.targets) || raw.targets.length === 0) throw new FieldError('"targets" should be a non-empty list');
    const targets = raw.targets.map(parseTarget);
    const coverAll = raw.coverAll === true;
    if (coverAll && targets.some((t) => 'region' in t)) throw new FieldError('coverAll does not work with region targets');
    return { ...base, kind, targets, coverAll, order: raw.order === 'random' ? 'random' : 'listed' };
  }

  if (kind === 'sequence') {
    const notes = parsePitchList(str(raw, 'notes')!);
    const fingers = parseFingers(str(raw, 'fingers', false));
    if (fingers.length && fingers.length !== notes.length) {
      throw new FieldError(`${fingers.length} fingers for ${notes.length} notes`);
    }
    const position = raw.position ? parsePitchList(str(raw, 'position')!) : [];
    return { ...base, kind, notes, fingers, position, pitchMatch };
  }

  if (kind === 'generated') return parseGenerated(raw, base);
  if (kind === 'ear') return parseEar(raw, base, pitchMatch);
  if (kind === 'quiz') return parseQuiz(raw, base, pitchMatch);
  if (kind === 'build') return parseBuild(raw, base, pitchMatch);
  if (kind === 'tap') {
    // Rhythm only: "x:q x:q x:h | ..." with x as the pitch placeholder; any key counts.
    if (raw.right !== undefined || raw.left !== undefined) throw new FieldError('a tap exercise has "rhythm", not right/left notes');
    const rhythm = str(raw, 'rhythm')!;
    if (/(^|[\s|+])(?!x:|r:)[^\s|]+:/.test(` ${rhythm}`)) throw new FieldError('"rhythm" uses x for every note, like "x:q x:q x:h | r:q x:q x:h"');
    raw = { ...raw, right: rhythm.replace(/(^|[\s|])x:/g, '$1C4:') };
  }

  const tempo = Number(raw.tempo);
  if (!(tempo >= 20 && tempo <= 300)) throw new FieldError('"tempo" should be a number of beats per minute (20 to 300)');
  const meter = parseMeter(str(raw, 'meter')!);
  const countIn = raw.countIn === undefined ? 1 : Number(raw.countIn);
  if (!Number.isInteger(countIn) || countIn < 0 || countIn > 4) throw new FieldError('"countIn" should be 0 to 4 bars');
  const right = raw.right !== undefined ? parseTimedNotes(str(raw, 'right')!) : undefined;
  const left = raw.left !== undefined ? parseTimedNotes(str(raw, 'left')!) : undefined;
  if (!right && !left) throw new FieldError('a timed exercise needs "right" and/or "left" notes');
  const pickup = parsePickup(raw.pickup, meter);
  const pedal = raw.pedal !== undefined ? parsePedal(str(raw, 'pedal')!) : undefined;
  let bars = -1;
  for (const [name, tokens] of [['right', right], ['left', left], ['pedal', pedal]] as const) {
    if (!tokens) continue;
    const lens = barLengths(tokens);
    const same = (a: number, b: number) => Math.abs(a - b) < 1e-6;
    lens.forEach((len, i) => {
      if (pickup && i === 0) {
        if (!same(len, pickup)) throw new FieldError(`${name}: the upbeat bar has ${round(len)} beats, but "pickup" says ${round(pickup)}`);
        return;
      }
      // After an upbeat, the last bar may be short by the upbeat's length.
      if (pickup && i > 0 && i === lens.length - 1 && same(len, meter.quarters - pickup)) return;
      if (!same(len, meter.quarters)) {
        throw new FieldError(`${name === 'pedal' ? 'pedal' : `${name} hand`} bar ${i + 1} has ${round(len)} beats, but ${meter.beats}/${meter.unit} needs ${round(meter.quarters)}`);
      }
    });
    if (bars >= 0 && lens.length !== bars) {
      throw new FieldError(name === 'pedal' ? `the pedal has ${lens.length} bars but the notes have ${bars}` : `right and left hands have different bar counts (${bars} vs ${lens.length})`);
    }
    bars = lens.length;
  }
  const hand = kind === 'tap' ? 'right' : base.hand; // a tap without a hand shows no hand badge
  if ((hand === 'right' && !right) || (hand === 'left' && !left)) throw new FieldError(`hand is ${hand} but there are no ${hand} notes`);
  if ((hand === 'alternating' || hand === 'together') && !(right && left)) throw new FieldError(`hand ${hand} needs both right and left notes`);
  // `fingers` for a one-hand exercise; `rightFingers` / `leftFingers` when both hands play.
  const fingers: Record<'right' | 'left', number[]> = { right: [], left: [] };
  const plain = parseFingers(str(raw, 'fingers', false));
  if (plain.length) {
    if (right && left) throw new FieldError('both hands play: use "rightFingers" and "leftFingers" instead of "fingers"');
    fingers[right ? 'right' : 'left'] = plain;
  }
  for (const [h, tokens] of [['right', right], ['left', left]] as const) {
    const own = parseFingers(str(raw, `${h}Fingers`, false));
    if (!own.length) continue;
    if (!tokens) throw new FieldError(`"${h}Fingers" given but there are no ${h} notes`);
    fingers[h] = own;
  }
  for (const [h, tokens] of [['right', right], ['left', left]] as const) {
    if (fingers[h].length && tokens && fingers[h].length !== countNotes(tokens)) {
      throw new FieldError(`${fingers[h].length} ${h} fingers for ${countNotes(tokens)} ${h} notes`);
    }
  }
  return {
    ...base, hand: kind === 'tap' ? base.hand : hand ?? (right && left ? 'together' : right ? 'right' : 'left'), kind: 'timed', tempo, meter, countIn, right, left, fingers, pickup, ...(pedal ? { pedal } : {}),
    ...(raw.tempoLadder !== undefined && raw.tempoLadder !== false ? { ladder: parseLadder(raw.tempoLadder) } : {}),
    pitchMatch: kind === 'tap' ? 'any' : pitchMatch, bars, ...(kind === 'tap' ? { tap: true } : {}),
  };
}

type Base = Pick<Exercise, 'id' | 'title' | 'prompt' | 'hand' | 'display' | 'clef' | 'key' | 'reps' | 'days'>;
type Match = 'exact' | 'pitchClass';

const list = (o: Raw, key: string): unknown[] => {
  const v = o[key];
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
};
/** A pitch or a list of pitches: `C4`, `[C4, G4]` or "C4 G4". */
const pitches = (o: Raw, key: string, fallback?: string): Pitch[] => {
  const xs = list(o, key).flatMap((v) => String(v).trim().split(/\s+/));
  if (!xs.length && fallback) return [parsePitch(fallback)];
  return xs.map(parsePitch);
};
const strings = (o: Raw, key: string) => list(o, key).map(String);
const feedbackOf = (raw: Raw) => oneOf(raw, 'feedback', ['normal', 'none'] as const) ?? 'normal';

function parseEar(raw: Raw, base: Base, pitchMatch: Match): Exercise {
  if (!Array.isArray(raw.items) || !raw.items.length) throw new FieldError('"items" should be a non-empty list');
  const cadence = str(raw, 'cadence', false);
  if (cadence && cadence !== 'none') parseKey(cadence);
  const questions = raw.questions === undefined ? 10 : Number(raw.questions);
  if (!Number.isInteger(questions) || questions < 1 || questions > 50) throw new FieldError('"questions" should be 1 to 50');
  const items = raw.items.map((r: unknown, i: number): EarItem => {
    const o = (r ?? {}) as Raw;
    try {
      const type = oneOf(o, 'type', ['note', 'interval', 'chord', 'degree', 'melody', 'compare', 'contour', 'motion', 'count', 'rhythm', 'loudness'] as const);
      const need = <T>(xs: T[], what: string) => { if (!xs.length) throw new FieldError(`"${what}" should not be empty`); return xs; };
      /** `range: [C4, C5]`, at least `min` semitones wide. */
      const rangeOf = (fallback: [string, string], min = 4): [Pitch, Pitch] => {
        const r = pitches(o, 'range');
        if (r.length && r.length !== 2) throw new FieldError('"range" should be two notes, like [C4, C5]');
        const [lo, hi] = r.length ? r : [parsePitch(fallback[0]), parsePitch(fallback[1])];
        if (pitchToMidi(hi) - pitchToMidi(lo) < min) throw new FieldError(`"range" should span at least ${min} semitones`);
        return [lo, hi];
      };
      /** `gap: [min, max]` in semitones. */
      const gapOf = (fallback: [number, number]): [number, number] => {
        if (o.gap === undefined) return fallback;
        const g = (Array.isArray(o.gap) ? o.gap : [o.gap, o.gap]).map(Number);
        if (g.length !== 2 || !g.every((x) => Number.isInteger(x) && x >= 1 && x <= 12) || g[0] > g[1]) throw new FieldError('"gap" should be [min, max] semitones, 1 to 12');
        return [g[0], g[1]];
      };
      const only = <T extends string>(xs: string[], allowed: readonly T[], what: string): T[] => {
        const bad = xs.find((x) => !allowed.includes(x as T));
        if (bad) throw new FieldError(`"${bad}" should be one of ${allowed.join(', ')} (${what})`);
        return xs as T[];
      };
      switch (type) {
        case 'note': {
          const pool = need(pitches(o, 'pool'), 'pool');
          const ref = pitches(o, 'reference');
          return { type, pool, lit: o.lit === true, ...(ref.length ? { reference: ref[0] } : {}) };
        }
        case 'interval': {
          const pool = need(strings(o, 'pool'), 'pool');
          pool.forEach(interval);
          return {
            type, pool, from: pitches(o, 'from', 'C4'),
            direction: oneOf(o, 'direction', ['up', 'down', 'both'] as const) ?? 'up',
            answer: oneOf(o, 'answer', ['play', 'name'] as const) ?? 'play',
            together: o.together === true,
          };
        }
        case 'chord': {
          const pool = need(strings(o, 'pool'), 'pool');
          pool.forEach(chordQuality);
          return { type, pool, root: pitches(o, 'root', 'C4') };
        }
        case 'degree': {
          const key = str(o, 'key', false) ?? cadence ?? 'C';
          const k = parseKey(key);
          const pool = need(strings(o, 'pool'), 'pool');
          pool.forEach((d) => degreeSemitones(k, d));
          return { type, key, pool, resolve: o.resolve !== false };
        }
        case 'melody': {
          const notes = need(pitches(o, 'notes'), 'notes');
          const plays = o.plays === undefined ? 2 : Number(o.plays);
          if (!Number.isInteger(plays) || plays < 1 || plays > 5) throw new FieldError('"plays" should be 1 to 5');
          return { type, notes, plays, lit: o.lit === true };
        }
        case 'compare': {
          const pool = only(strings(o, 'pool'), COMPARE, 'compare');
          if (pool.includes('different') && pool.some((p) => p === 'higher' || p === 'lower')) {
            throw new FieldError('with "different" the pool is same / different only');
          }
          const gap = gapOf([2, 7]);
          const range = rangeOf(['C4', 'C5'], Math.max(4, gap[0]));
          return { type, pool: pool.length ? pool : ['higher', 'lower', 'same'], range, gap };
        }
        case 'contour': {
          const length = o.length === undefined ? 3 : Number(o.length);
          if (!Number.isInteger(length) || length < 2 || length > 5) throw new FieldError('"length" should be 2 to 5 notes');
          const pool = strings(o, 'pool');
          for (const p of pool) {
            const parts = p.split('-');
            if (parts.length !== length - 1 || parts.some((x) => x !== 'up' && x !== 'down')) throw new FieldError(`"${p}" should be ${length - 1} of up / down joined by -, like up-down`);
          }
          const gap = gapOf([2, 5]);
          return { type, length, pool: pool.length ? pool : contours(length), range: rangeOf(['C4', 'C5'], gap[1] * 2), gap };
        }
        case 'motion': {
          const pool = only(strings(o, 'pool'), ['same', 'step', 'leap'] as const, 'motion');
          return { type, pool: pool.length ? pool : ['same', 'step', 'leap'], range: rangeOf(['C4', 'C5'], 9) };
        }
        case 'count': {
          const pool = (o.pool === undefined ? [1, 2, 3] : list(o, 'pool').map(Number));
          if (!pool.every((n) => Number.isInteger(n) && n >= 1 && n <= 4)) throw new FieldError('"pool" should be numbers of notes, 1 to 4');
          return { type, pool, range: rangeOf(['C3', 'C5'], 12) };
        }
        case 'rhythm': {
          const meter = parseMeter(str(o, 'meter', false) ?? '4/4');
          const tempo = o.tempo === undefined ? 80 : Number(o.tempo);
          if (!(tempo >= 30 && tempo <= 200)) throw new FieldError('"tempo" should be 30 to 200');
          const texts = need(strings(o, 'pool'), 'pool');
          if (texts.length < 2) throw new FieldError('"pool" needs at least two rhythms to choose from');
          const pool = texts.map((t) => {
            if (/(^|[\s|+])(?!x:|r:)[^\s|]+:/.test(` ${t}`)) throw new FieldError(`"${t}" uses x for every note, like "x:q x:q x:h"`);
            const tokens = parseTimedNotes(t.replace(/(^|[\s|])x:/g, '$1C4:'));
            barLengths(tokens).forEach((len, b) => {
              if (Math.abs(len - meter.quarters) > 1e-6) throw new FieldError(`"${t}": bar ${b + 1} has ${round(len)} beats, but ${meter.beats}/${meter.unit} needs ${round(meter.quarters)}`);
            });
            return tokens;
          });
          const pitch = pitches(o, 'pitch', 'C5')[0];
          return { type, pool, meter, tempo, pitch };
        }
        case 'loudness': {
          const pool = only(strings(o, 'pool'), ['loud', 'soft'] as const, 'loudness');
          return { type, pool: pool.length ? pool : ['loud', 'soft'], notes: pitches(o, 'notes', 'C4') };
        }
        default: throw new FieldError('missing "type"');
      }
    } catch (e) {
      throw new FieldError(`item ${i + 1}: ${(e as Error).message}`);
    }
  });
  return { ...base, kind: 'ear', cadence: cadence === 'none' ? undefined : cadence, questions, items, pitchMatch, feedback: feedbackOf(raw) };
}

/** Every up / down shape of `length` notes, like up-down. */
function contours(length: number): string[] {
  let out = [''];
  for (let i = 0; i < length - 1; i++) out = out.flatMap((p) => ['up', 'down'].map((d) => (p ? `${p}-${d}` : d)));
  return out;
}

function parseQuiz(raw: Raw, base: Base, pitchMatch: Match): Exercise {
  if (!Array.isArray(raw.questions) || !raw.questions.length) throw new FieldError('"questions" should be a non-empty list');
  const questions = raw.questions.map((r: unknown, i: number): QuizQuestion => {
    const o = (r ?? {}) as Raw;
    try {
      const q: QuizQuestion = { ask: str(o, 'ask')! };
      const ch = parseChoices(o);
      if (ch) {
        q.choices = ch.choices;
        q.correct = Number(o.correct);
        if (ch.whys.some(Boolean)) q.choiceWhy = ch.whys;
      }
      const why = str(o, 'why', false);
      if (why) q.why = why;
      if (o.whyStaff !== undefined) q.whyStaff = parseTheoryStaff(o.whyStaff);
      if (o.whyKeys !== undefined) q.whyKeys = parseTheoryKeys(o.whyKeys);
      const play = pitches(o, 'play');
      if (play.length) q.play = play;
      if (!q.choices === !q.play) throw new FieldError('give either "choices" + "correct" or "play"');
      if (o.staff !== undefined) q.staff = parseTimedNotes(str(o, 'staff')!);
      if (o.sound !== undefined) q.sound = parseTimedNotes(str(o, 'sound')!);
      const clef = oneOf(o, 'clef', ['treble', 'bass'] as const);
      if (clef) q.clef = clef;
      if (o.key !== undefined) q.key = checkKey(str(o, 'key')!);
      return q;
    } catch (e) {
      throw new FieldError(`question ${i + 1}: ${(e as Error).message}`);
    }
  });
  return { ...base, kind: 'quiz', shuffle: raw.shuffle === true, questions, pitchMatch, feedback: feedbackOf(raw) };
}

/**
 * `kind: generated`: a drill made fresh each run. Pool fields can sit at the top level or under
 * `pool:`. Notes are a range ("C4-G5": every note of the key in between) or a list.
 */
function parseGenerated(top: Raw, base: Base): Exercise {
  const raw: Raw = { ...top, ...((top.pool ?? {}) as Raw) };
  const generator = oneOf(raw, 'generator', GENERATORS);
  if (!generator) throw new FieldError(`missing "generator" (${GENERATORS.join(', ')})`);
  const notesText = raw.notes === undefined ? 'C4-G4' : Array.isArray(raw.notes) ? raw.notes.join(' ') : str(raw, 'notes')!;
  const rangeMatch = /^\s*(\S+)\s*-\s*(\S+)\s*$/.exec(notesText);
  let range: [Pitch, Pitch] | undefined;
  let notes: Pitch[] | undefined;
  if (rangeMatch) {
    range = [parsePitch(rangeMatch[1]), parsePitch(rangeMatch[2])];
    if (pitchToMidi(range[1]) - pitchToMidi(range[0]) < 2) throw new FieldError('"notes" range should span at least a 2nd, like C4-G4');
  } else {
    notes = parsePitchList(notesText);
    if (notes.length < 2) throw new FieldError('"notes" should be a range like C4-G4 or at least two notes');
  }
  const keys = strings(raw, 'keys').flatMap((k) => k.split(/[\s,]+/)).filter(Boolean);
  keys.forEach(checkKey);
  const durations = strings(raw, 'durations').flatMap((d) => d.split(/\s+/)).filter(Boolean);
  durations.forEach((d) => parseDuration(d.replace(/^r:/, '')));
  if (durations.length && durations.every((d) => d.startsWith('r:'))) throw new FieldError('"durations" needs at least one note value, not only rests');
  const meter = str(raw, 'meter', false) ?? '4/4';
  parseMeter(meter);
  const intervals = strings(raw, 'intervals').flatMap((d) => d.split(/[\s,]+/)).filter(Boolean);
  intervals.forEach(interval);
  if (generator === 'intervals' && intervals.length < 2) throw new FieldError('"intervals" should list at least two, like [M2, M3, P5]');
  const m = (raw.mastery ?? {}) as Raw;
  const accuracy = m.accuracy === undefined ? 90 : Number(m.accuracy);
  if (!(accuracy >= 50 && accuracy <= 100)) throw new FieldError('"mastery.accuracy" should be a percentage from 50 to 100');
  const timed = generator === 'rhythm-read' || generator === 'sight-read';
  const medianMs = m.medianMs === undefined ? (timed ? undefined : 2500) : Number(m.medianMs);
  if (medianMs !== undefined && !(medianMs >= 300)) throw new FieldError('"mastery.medianMs" should be milliseconds, 300 or more');
  const questions = raw.questions === undefined ? 30 : Number(raw.questions);
  if (!Number.isInteger(questions) || questions < 1 || questions > 200) throw new FieldError('"questions" should be a whole number from 1 to 200');
  const bars = raw.bars === undefined ? 4 : Number(raw.bars);
  if (!Number.isInteger(bars) || bars < 1 || bars > 32) throw new FieldError('"bars" should be a whole number from 1 to 32');
  const tempo = raw.tempo === undefined ? 72 : Number(raw.tempo);
  if (!(tempo >= 20 && tempo <= 240)) throw new FieldError('"tempo" should be beats per minute, 20 to 240');
  return {
    ...base, kind: 'generated', generator, ...(range ? { range } : { list: notes }),
    clefs: oneOf(raw, 'clef', ['treble', 'bass', 'grand'] as const) ?? 'treble',
    keys: keys.length ? keys : ['C'],
    durations: durations.length ? durations : ['q', 'h'],
    meter, bars, tempo, intervals, questions,
    answer: oneOf(raw, 'answer', ['play', 'name'] as const) ?? 'play',
    leftPart: leftPartOf(raw, generator, base.hand),
    mastery: { accuracy, ...(medianMs !== undefined ? { medianMs } : {}) },
  };
}

/** `left: roots | fifths | chords` for sight-reading with both hands. */
function leftPartOf(raw: Raw, generator: string, hand: Base['hand']): 'roots' | 'fifths' | 'chords' {
  const left = oneOf(raw, 'left', ['roots', 'fifths', 'chords'] as const);
  if (left && !(generator === 'sight-read' && hand === 'together')) throw new FieldError('"left" is for sight-read with hand: together');
  if (generator === 'sight-read' && (hand === 'alternating')) throw new FieldError('sight-read takes hand: right, left or together');
  return left ?? 'roots';
}

const octaveWords = (n: number) => (n === 1 ? 'one octave' : `${n} octaves`);

function parseBuild(raw: Raw, base: Base, pitchMatch: Match): Exercise {
  if (!Array.isArray(raw.tasks) || !raw.tasks.length) throw new FieldError('"tasks" should be a non-empty list');
  const tasks = raw.tasks.map((r: unknown, i: number): BuildTask => {
    const o = (r ?? {}) as Raw;
    try {
      const octave = o.octave === undefined ? 4 : Number(o.octave);
      // A chord is held at once unless `together: false`; the rest are played one by one.
      const mode = (fallback: BuildTask['mode']): BuildTask['mode'] =>
        (o.together === true || (fallback === 'together' && o.together !== false))
          ? 'together'
          : (oneOf(o, 'order', ['listed', 'any'] as const) ?? (fallback === 'together' ? 'any' : fallback));
      let t: BuildTask;
      if (o.chord !== undefined) {
        const sym = str(o, 'chord')!;
        t = { ask: `Play ${articleFor(sym)} ${chordName(sym)} chord`, notes: chordNotes(sym, octave), mode: mode('together') };
      } else if (o.interval !== undefined) {
        const code = str(o, 'interval')!;
        const from = parsePitch(str(o, 'from', false) ?? 'C4');
        const down = o.direction === 'down';
        const a = pitchToMidi(from);
        const iv = interval(code);
        t = {
          ask: `Play a ${iv.name} ${down ? 'down' : 'up'} from ${str(o, 'from', false) ?? 'C4'}`,
          notes: [a, down ? a - iv.semitones : a + iv.semitones],
          mode: mode('any'),
        };
      } else if (o.scale !== undefined) {
        const name = str(o, 'scale')!;
        const octaves = o.octaves === undefined ? 1 : Number(o.octaves);
        if (!Number.isInteger(octaves) || octaves < 1 || octaves > 4) throw new FieldError('"octaves" should be 1 to 4');
        t = { ask: `Play the ${name} scale, ${octaveWords(octaves)} up`, notes: scaleNotes(name, octaves, octave), mode: mode('listed') };
      } else if (o.notes !== undefined) {
        t = { ask: 'Play these notes', notes: pitches(o, 'notes').map(pitchToMidi), mode: mode('listed') };
      } else {
        throw new FieldError('a task needs "chord", "interval", "scale" or "notes"');
      }
      const ask = str(o, 'ask', false);
      if (ask) t.ask = ask;
      return t;
    } catch (e) {
      throw new FieldError(`task ${i + 1}: ${(e as Error).message}`);
    }
  });
  return { ...base, kind: 'build', tasks, pitchMatch };
}

/** "Cm" -> "C minor", "G7" -> "G dominant 7th". */
function chordName(sym: string): string {
  const m = /^([A-G](?:#|b)?)(.*)$/.exec(sym)!;
  const names: Record<string, string> = { '': 'major', m: 'minor', dim: 'diminished', aug: 'augmented', sus2: 'sus2', sus4: 'sus4', 7: 'dominant 7th', maj7: 'major 7th', m7: 'minor 7th' };
  return `${m[1]} ${names[m[2]] ?? m[2]}`;
}
const articleFor = (sym: string) => (/^[AEF]/.test(sym) ? 'an' : 'a');

function countNotes(tokens: NoteToken[]): number {
  return tokens.filter((t, i) => t.pitches.length > 0 && !isTieEnd(tokens, i)).length;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** `pickup: q` (a duration, or a sum like "e e") or a number of quarter beats. */
function parsePickup(v: unknown, meter: Meter): number {
  if (v === undefined) return 0;
  const beats = typeof v === 'number' ? v : String(v).trim().split(/\s+/).reduce((a, d) => a + parseDuration(d).beats, 0);
  if (!(beats > 0 && beats < meter.quarters - 1e-6)) throw new FieldError('"pickup" should be shorter than a bar, like q or "e e"');
  return beats;
}

/** `tempoLadder: true` (60 70 80 90 100) or a list of rising percentages; 100 is added if missing. */
function parseLadder(v: unknown): number[] {
  if (v === true) return [...DEFAULT_LADDER];
  const rungs = (Array.isArray(v) ? v : String(v).split(/[\s,]+/)).map(Number);
  if (!rungs.length || rungs.some((r, i) => !(r >= 20 && r <= 100) || (i > 0 && r <= rungs[i - 1]))) {
    throw new FieldError('"tempoLadder" should be true or rising percentages like [60, 80, 100]');
  }
  return rungs[rungs.length - 1] === 100 ? rungs : [...rungs, 100];
}

const checkKey = (k: string) => (keySignature(k), k);
