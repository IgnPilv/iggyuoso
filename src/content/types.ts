import type { Hand, Meter, NoteToken, PedalToken, Pitch } from '../music/notes';

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
  /** Echo a rhythm (`echo: true` on a tap): Play sounds it first, unseen, then the player taps it back; the staff shows on the result. */
  echo?: boolean;
  tempo: number;
  meter: Meter;
  countIn: number;
  /** `count-in`: clicks only during the count-in (keep the pulse inside); `off`: no clicks at all. */
  click?: 'on' | 'count-in' | 'off';
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
  /** `any`: any key counts (tap); `side`: any key on the hand's side of middle C (two-hand tap). */
  pitchMatch: 'exact' | 'pitchClass' | 'any' | 'side';
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

export const GENERATORS = ['read-notes', 'find-notes', 'intervals', 'rhythm-read', 'rhythm-echo', 'sight-read'] as const;
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
  /** Rhythm reading and echo: one line (any key) or `both` hands (right and left lines). */
  hands: 'one' | 'both';
  /** Sight-reading with `hand: together`: what the left hand plays under the tune. */
  leftPart: 'roots' | 'fifths' | 'chords';
  mastery: DrillGoal;
}

/**
 * One thing an improvisation is checked for (`kind: improvise`). Each gives a value from 0 to 1;
 * the take's score is their average. See src/engine/improvise.ts.
 */
export type ImproviseRule =
  /** The notes come from the exercise's `scale`. */
  | { rule: 'inScale' }
  /** Notes on strong beats belong to the bar's chord. */
  | { rule: 'chordTones' }
  /** The first (or last) note is this pitch class. */
  | { rule: 'startOn' | 'endOn'; pc: number; name: string }
  /** Bars before `split` ask (end away from home), the rest answer (end on home, begin like the question). */
  | { rule: 'questionAnswer'; split: number }
  /**
   * Bars from `at` (default: right after) repeat the first `bars` (`repeat`), bring the same shape
   * moved up or down (`sequence`), or sound different (`contrast`, the B of an A B A).
   */
  | { rule: 'repeat' | 'sequence' | 'contrast'; bars: number; at: number }
  /** At least `percent` of the moves are steps (2 semitones or less). */
  | { rule: 'steps'; percent: number }
  /** Leave space: a silence of at least `beats` once in every four bars. */
  | { rule: 'rests'; beats: number }
  /** At least this many different notes. */
  | { rule: 'variety'; notes: number }
  /** The notes stay between these (written MIDI). */
  | { rule: 'range'; low: number; high: number }
  /** The given `rhythm` is followed. */
  | { rule: 'rhythm' }
  /** The left hand plays each bar's chord root on the downbeat. */
  | { rule: 'bassRoots' }
  /** Something is played in every bar. */
  | { rule: 'fill' };

/**
 * Improvising or composing on the spot: the player makes the notes up, inside a frame (a scale,
 * chords the app plays, a rhythm, a phrase to answer), and the take is checked against `rules`.
 * Good takes can be kept in the Sketchbook.
 */
export interface ImproviseExercise extends ExerciseBase {
  kind: 'improvise';
  tempo: number;
  meter: Meter;
  countIn: number;
  click?: 'on' | 'count-in' | 'off';
  /** The player's bars (after the call, if there is one). */
  bars: number;
  /** Home note (pitch class) and spelling key, from `key` (default C). */
  tonic: number;
  /** Notes to use: a scale ("C major pentatonic", "A blues") or a list, as pitch classes. */
  scale?: { name: string; pcs: number[] };
  /** One chord per bar of the player's part ("C | F | G | C"); repeated if shorter. */
  chords?: string[];
  /** What the app plays under the player's bars (left hand). */
  backing?: NoteToken[];
  /** A phrase the app plays first; the player's bars follow it. */
  call?: NoteToken[];
  /** A rhythm to improvise in (any notes). */
  rhythm?: NoteToken[];
  /** A model take for Listen (right hand). */
  example?: NoteToken[];
  rules: ImproviseRule[];
}

export type Exercise = FindExercise | SequenceExercise | TimedExercise | EarExercise | QuizExercise | BuildExercise | GeneratedExercise | ImproviseExercise;

export interface Content {
  lessons: Map<string, Lesson>;
  exercises: Map<string, Exercise>;
}
