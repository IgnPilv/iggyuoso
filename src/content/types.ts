import type { Hand, Meter, NoteToken, PedalToken, Pitch } from '../music/notes';

export interface Unit {
  id: string;
  title: string;
  summary: string;
  lessons: string[];
  order: number;
}

export type LessonStep = { explain: string } | { exercise: string };

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
  /** Press the key you heard. */
  | { type: 'note'; pool: Pitch[] }
  /** Two notes; press the second (`answer: play`) or name the interval (`answer: name`). */
  | { type: 'interval'; from: Pitch[]; pool: string[]; direction: 'up' | 'down' | 'both'; answer: 'play' | 'name'; together: boolean }
  /** A chord; name its quality with buttons. */
  | { type: 'chord'; root: Pitch[]; pool: string[] }
  /** After the cadence, a scale degree; press it (any octave), then hear it resolve. */
  | { type: 'degree'; key: string; pool: string[]; resolve: boolean }
  /** A short phrase; play it back, judged note by note (first key per note). */
  | { type: 'melody'; notes: Pitch[]; plays: number }
  /** Two notes; is the second higher, lower or the same? Buttons. */
  | { type: 'compare'; pool: ('higher' | 'lower' | 'same')[]; range: [Pitch, Pitch] };

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
