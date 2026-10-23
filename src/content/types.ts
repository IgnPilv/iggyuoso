import type { Hand, Meter, NoteToken, PedalToken, Pitch } from '../music/notes';

export interface Unit {
  id: string;
  title: string;
  summary: string;
  lessons: string[];
  order: number;
}

/** A staff picture in theory text or feedback. `grand` splits the notes at middle C. */
export interface TheoryStaff {
  notes: NoteToken[];
  clef: 'treble' | 'bass' | 'grand';
  key?: string;
  /** `names` writes each note's letter under it. */
  labels: 'names' | 'none';
}

/** A keyboard picture with these keys lit. */
export interface TheoryKeys {
  notes: Pitch[];
  /** `names` or `fingers` (from `fingers`, one per key) on the lit keys. */
  labels: 'names' | 'fingers' | 'none';
  fingers?: number[];
}

/** A question inside theory text: Next waits until it is answered right. */
export interface TheoryCheck {
  ask: string;
  choices?: string[];
  correct?: number;
  play?: Pitch[];
  pitchMatch: 'exact' | 'pitchClass';
  why?: string;
  staff?: TheoryStaff;
  keys?: TheoryKeys;
}

export interface ExplainStep {
  explain: string;
  staff?: TheoryStaff;
  keys?: TheoryKeys;
  /** A play button for these notes. */
  sound?: NoteToken[];
  /** A rule in a highlighted box (Markdown). */
  callout?: string;
  /** Key terms, shown as chips. */
  terms?: string[];
  check?: TheoryCheck;
}

/** Press any key and see it on the staff, named. Next is always allowed. */
export interface PlaygroundStep {
  playground: { clef: 'treble' | 'bass' | 'grand'; range: [Pitch, Pitch]; prompt?: string; key?: string };
}

export type LessonStep = ExplainStep | { exercise: string } | PlaygroundStep;

export interface Lesson {
  id: string;
  title: string;
  unit: string;
  skills: string[];
  steps: LessonStep[];
  recap: string;
}

export type FindTarget = { blackGroup: 2 | 3 } | { pitchClass: number; name: string } | { region: 'low' | 'high' };

export type ExerciseHand = Hand | 'alternating' | 'together';
export type Display = 'keys' | 'staff';

interface ExerciseBase {
  id: string;
  /** A short name for lists and headings; falls back to the lesson's title. */
  title?: string;
  prompt?: string;
  hand?: ExerciseHand;
  display: Display;
  clef?: 'treble' | 'bass';
  /** Key signature for the staff (`key: G`, `Bb`, `Em`). Notes are still written out in full. */
  key?: string;
  /** Clean takes (★★★ at a tempo that counts) needed before the exercise is done. */
  reps: number;
  /** ...spread over at least this many different days. */
  days: number;
  /**
   * Set on the exercises a generated drill makes: reaching `accuracy` (percent right) counts as a
   * clean take (92), and answering slower than `medianMs` (median per question) keeps it below.
   */
  goal?: DrillGoal;
}

export interface DrillGoal {
  accuracy: number;
  medianMs?: number;
}

export interface FindExercise extends ExerciseBase {
  kind: 'find';
  targets: FindTarget[];
  coverAll: boolean;
  order: 'listed' | 'random';
}

export interface SequenceExercise extends ExerciseBase {
  kind: 'sequence';
  notes: Pitch[];
  fingers: number[];
  position: Pitch[];
  pitchMatch: 'exact' | 'pitchClass';
}

export interface TimedExercise extends ExerciseBase {
  kind: 'timed';
  /** Written as `kind: tap`: rhythm only, any key counts (notes are placeholders on middle C). */
  tap?: boolean;
  tempo: number;
  meter: Meter;
  countIn: number;
  /** Length of an upbeat bar in quarter beats (0 = none). Bar 1 is that long. */
  pickup: number;
  /** Tempo ladder rungs in percent of `tempo`, ending at 100 (from `tempoLadder`). */
  ladder?: number[];
  right?: NoteToken[];
  left?: NoteToken[];
  /** The sustain pedal, in the same bars as the notes. */
  pedal?: PedalToken[];
  /** Finger numbers per hand, one per note (chords take one number for the whole chord). */
  fingers: Record<Hand, number[]>;
  pitchMatch: 'exact' | 'pitchClass' | 'any';
  bars: number;
}

/** One kind of ear question; an ear exercise mixes several. */
export type EarItem =
  /** Press the key you heard. `lit` lights the pool's keys; `reference` sounds (and names) a note first. */
  | { type: 'note'; pool: Pitch[]; lit: boolean; reference?: Pitch }
  /** Two notes; press the second (`answer: play`) or name the interval (`answer: name`). */
  | { type: 'interval'; from: Pitch[]; pool: string[]; direction: 'up' | 'down' | 'both'; answer: 'play' | 'name'; together: boolean }
  /** A chord; name its quality with buttons. */
  | { type: 'chord'; root: Pitch[]; pool: string[] }
  /** After the cadence, a scale degree; press it (any octave), then hear it resolve. */
  | { type: 'degree'; key: string; pool: string[]; resolve: boolean }
  /** A short phrase; play it back, judged note by note (first key per note). `lit` lights its keys. */
  | { type: 'melody'; notes: Pitch[]; plays: number; lit: boolean }
  /**
   * Two notes `gap` semitones apart (min, max): higher, lower or the same? With `different` in the
   * pool, the buttons are Same / Different.
   */
  | { type: 'compare'; pool: ('higher' | 'lower' | 'same' | 'different')[]; range: [Pitch, Pitch]; gap: [number, number] }
  /** `length` notes going up or down (steps of `gap` semitones); pick the shape. Pool: "up-down", ... */
  | { type: 'contour'; length: number; pool: string[]; range: [Pitch, Pitch]; gap: [number, number] }
  /** Two notes: the same, a step (1–2 semitones) or a leap (5 or more)? */
  | { type: 'motion'; pool: ('same' | 'step' | 'leap')[]; range: [Pitch, Pitch] }
  /** How many notes sound together? */
  | { type: 'count'; pool: number[]; range: [Pitch, Pitch] }
  /** A rhythm on one note after a bar of clicks; pick it from rhythm pictures. */
  | { type: 'rhythm'; pool: NoteToken[][]; meter: Meter; tempo: number; pitch: Pitch }
  /** A note or phrase twice: was the second time louder or softer? */
  | { type: 'loudness'; pool: ('loud' | 'soft')[]; notes: Pitch[] };

export interface EarExercise extends ExerciseBase {
  kind: 'ear';
  /** Key of the I-IV-V-I cadence played before each question, if any. */
  cadence?: string;
  questions: number;
  items: EarItem[];
  pitchMatch: 'exact' | 'pitchClass';
  /** 'none' for checkpoints: no right / wrong per question, answers shown at the end. */
  feedback: Feedback;
}

export type Feedback = 'normal' | 'none';

export interface QuizQuestion {
  ask: string;
  /** Answer with a button... */
  choices?: string[];
  correct?: number;
  /** ...or by playing these notes in order. */
  play?: Pitch[];
  /** A staff picture of these notes. */
  staff?: NoteToken[];
  clef?: 'treble' | 'bass';
  /** Key signature for the picture. */
  key?: string;
  /** A play button for these notes. */
  sound?: NoteToken[];
  /** Why the answer is right, shown after any answer. */
  why?: string;
  /** Per choice: why that choice is wrong, shown when it is picked. */
  choiceWhy?: (string | undefined)[];
  /** A picture shown with `why`. */
  whyStaff?: TheoryStaff;
  whyKeys?: TheoryKeys;
}

export interface QuizExercise extends ExerciseBase {
  kind: 'quiz';
  shuffle: boolean;
  questions: QuizQuestion[];
  pitchMatch: 'exact' | 'pitchClass';
  feedback: Feedback;
}

export interface BuildTask {
  ask: string;
  /** Written MIDI numbers (C4 = 60). */
  notes: number[];
  /** together = hold them all at once; listed = in this order; any = in any order. */
  mode: 'together' | 'listed' | 'any';
}

export interface BuildExercise extends ExerciseBase {
  kind: 'build';
  tasks: BuildTask[];
  pitchMatch: 'exact' | 'pitchClass';
}

export const GENERATORS = ['read-notes', 'find-notes', 'intervals', 'rhythm-read', 'sight-read'] as const;
export type Generator = (typeof GENERATORS)[number];

/** A drill made fresh every run from a pool (`kind: generated`); see src/engine/generate.ts. */
export interface GeneratedExercise extends ExerciseBase {
  kind: 'generated';
  generator: Generator;
  /** The notes to draw from: every note of the key from `range[0]` to `range[1]`, or these. */
  range?: [Pitch, Pitch];
  list?: Pitch[];
  /** `grand` picks treble or bass by the note. */
  clefs: 'treble' | 'bass' | 'grand';
  /** Keys to pick from (spelling and signature); C when none. */
  keys: string[];
  /** Rhythm and sight-reading: note values to use, the meter, bars and tempo. */
  durations: string[];
  meter: string;
  bars: number;
  tempo: number;
  /** Intervals to ask (interval codes like M3, P5). */
  intervals: string[];
  /** Questions per run (note, interval and find drills). */
  questions: number;
  /** Answer reading drills by playing the note, or by naming it with buttons. */
  answer: 'play' | 'name';
  mastery: DrillGoal;
}

export type Exercise = FindExercise | SequenceExercise | TimedExercise | EarExercise | QuizExercise | BuildExercise | GeneratedExercise;

export interface Content {
  units: Unit[];
  lessons: Map<string, Lesson>;
  exercises: Map<string, Exercise>;
}
