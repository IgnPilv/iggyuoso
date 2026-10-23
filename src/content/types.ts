import type { Hand, Meter, NoteToken, Pitch } from '../music/notes';

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
  prompt?: string;
  hand?: ExerciseHand;
  display: Display;
  clef?: 'treble' | 'bass';
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
  tempo: number;
  meter: Meter;
  countIn: number;
  right?: NoteToken[];
  left?: NoteToken[];
  fingers: number[];
  pitchMatch: 'exact' | 'pitchClass';
  bars: number;
}

export type Exercise = FindExercise | SequenceExercise | TimedExercise;

export interface Content {
  units: Unit[];
  lessons: Map<string, Lesson>;
  exercises: Map<string, Exercise>;
}
