import { parse as parseYaml } from 'yaml';
import {
  barLengths, parseFingers, parseMeter, parsePitchClass, parsePitchList, parseTimedNotes, type NoteToken,
} from '../music/notes';
import type { Content, Exercise, FindTarget, Lesson, LessonStep, Unit } from './types';

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
    if (step && typeof step.explain === 'string') return { explain: step.explain };
    if (step && typeof step.exercise === 'string') return { exercise: step.exercise };
    throw new FieldError(`step ${i + 1} should be "explain:" or "exercise:"`);
  });
  const skills = Array.isArray(raw.skills) ? raw.skills.map(String) : [];
  return {
    id: str(raw, 'id')!, title: str(raw, 'title')!, unit: str(raw, 'unit')!, skills, steps, recap: str(raw, 'recap', false) ?? '',
  };
}

function parseTarget(t: unknown): FindTarget {
  const o = t as Raw;
  if (o && (o.blackGroup === 2 || o.blackGroup === 3)) return { blackGroup: o.blackGroup };
  if (o && typeof o.pitchClass === 'string') return { pitchClass: parsePitchClass(o.pitchClass), name: o.pitchClass };
  if (o && (o.region === 'low' || o.region === 'high')) return { region: o.region };
  throw new FieldError(`target ${JSON.stringify(t)} should be { blackGroup: 2|3 }, { pitchClass: C } or { region: low|high }`);
}

const HANDS = ['right', 'left', 'alternating', 'together'] as const;

export function parseExercise(raw: Raw): Exercise {
  const id = str(raw, 'id')!;
  const kind = oneOf(raw, 'kind', ['find', 'sequence', 'timed'] as const);
  if (!kind) throw new FieldError('missing "kind"');
  const base = {
    id,
    prompt: str(raw, 'prompt', false),
    hand: oneOf(raw, 'hand', HANDS),
    display: oneOf(raw, 'display', ['keys', 'staff'] as const) ?? 'keys',
    clef: oneOf(raw, 'clef', ['treble', 'bass'] as const),
  };
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

  const tempo = Number(raw.tempo);
  if (!(tempo >= 20 && tempo <= 300)) throw new FieldError('"tempo" should be a number of beats per minute (20 to 300)');
  const meter = parseMeter(str(raw, 'meter')!);
  const countIn = raw.countIn === undefined ? 1 : Number(raw.countIn);
  if (!Number.isInteger(countIn) || countIn < 0 || countIn > 4) throw new FieldError('"countIn" should be 0 to 4 bars');
  const right = raw.right !== undefined ? parseTimedNotes(str(raw, 'right')!) : undefined;
  const left = raw.left !== undefined ? parseTimedNotes(str(raw, 'left')!) : undefined;
  if (!right && !left) throw new FieldError('a timed exercise needs "right" and/or "left" notes');
  let bars = -1;
  for (const [name, tokens] of [['right', right], ['left', left]] as const) {
    if (!tokens) continue;
    const lens = barLengths(tokens);
    lens.forEach((len, i) => {
      if (Math.abs(len - meter.quarters) > 1e-9) {
        throw new FieldError(`${name} hand bar ${i + 1} has ${len} beats, but ${meter.beats}/${meter.unit} needs ${meter.quarters}`);
      }
    });
    if (bars >= 0 && lens.length !== bars) throw new FieldError(`right and left hands have different bar counts (${bars} vs ${lens.length})`);
    bars = lens.length;
  }
  const hand = base.hand;
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
  return { ...base, hand: hand ?? (right && left ? 'together' : right ? 'right' : 'left'), kind, tempo, meter, countIn, right, left, fingers, pitchMatch, bars };
}

function countNotes(tokens: NoteToken[]): number {
  return tokens.filter((t) => t.pitches.length > 0).length;
}
