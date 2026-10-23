import { describe, expect, it } from 'vitest';
import { parseExercise } from '../src/content/load';
import type { GeneratedExercise, QuizExercise, TimedExercise } from '../src/content/types';
import { QuizSession } from '../src/engine/drills';
import { generate, poolNotes } from '../src/engine/generate';
import { pitchToMidi } from '../src/music/notes';
import { applyGoal } from '../src/scoring/goal';
import { calibrate, toDevice } from '../src/calibration';

const cal88 = (() => { const r = calibrate(21, 108); if (!r.ok) throw new Error(); return r.calibration; })();

/** A repeatable random source. */
function seeded(seed = 1) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

const gen = (raw: Record<string, unknown>) => parseExercise({ id: 'g', kind: 'generated', ...raw }) as GeneratedExercise;

describe('generated drills', () => {
  it('reads the pool, with defaults, at the top level or under pool:', () => {
    const g = gen({ generator: 'read-notes', pool: { notes: 'C4-C5', keys: ['G'] } });
    expect(g).toMatchObject({ generator: 'read-notes', clefs: 'treble', keys: ['G'], questions: 30, answer: 'play', mastery: { accuracy: 90, medianMs: 2500 }, reps: 3 });
    expect(poolNotes(g, 'G').map((p) => pitchToMidi(p))).toEqual([60, 62, 64, 66, 67, 69, 71, 72]);
    expect(gen({ generator: 'sight-read' }).mastery).toEqual({ accuracy: 90 });
    expect(() => gen({ generator: 'nope' })).toThrow();
    expect(() => gen({ generator: 'intervals', intervals: ['M3'] })).toThrow();
    expect(() => gen({ generator: 'read-notes', notes: 'C4-C#4' })).toThrow();
    expect(() => gen({ generator: 'read-notes', keys: ['H'] })).toThrow();
  });

  it('makes fresh note-reading quizzes that save under the drill id', () => {
    const g = gen({ generator: 'read-notes', notes: 'C4-G4', questions: 12, reps: 5 });
    const a = generate(g, seeded(1)) as QuizExercise;
    const b = generate(g, seeded(2)) as QuizExercise;
    expect(a.kind).toBe('quiz');
    expect(a).toMatchObject({ id: 'g', reps: 5, goal: { accuracy: 90, medianMs: 2500 } });
    expect(a.questions).toHaveLength(12);
    const notes = (q: QuizExercise) => q.questions.map((x) => pitchToMidi(x.play![0]));
    expect(notes(a)).not.toEqual(notes(b));
    for (const q of a.questions) expect(q.staff?.[0].pitches[0]).toEqual(q.play![0]);
    // never the same note twice running
    notes(a).forEach((n, i, xs) => { if (i) expect(n).not.toBe(xs[i - 1]); });
  });

  it('names notes and intervals with buttons, the right one among them', () => {
    const names = generate(gen({ generator: 'read-notes', notes: 'C4-C5', answer: 'name', clef: 'grand' }), seeded(3)) as QuizExercise;
    for (const q of names.questions) expect(q.choices![q.correct!]).toBe(q.staff![0].pitches[0].letter);
    const iv = generate(gen({ generator: 'intervals', notes: 'C4-G4', intervals: ['M2', 'M3', 'P5'], questions: 20 }), seeded(4)) as QuizExercise;
    const semis: Record<string, number> = { 'major 2nd': 2, 'major 3rd': 4, 'perfect 5th': 7 };
    for (const q of iv.questions) {
      const ps = q.staff!.flatMap((t) => t.pitches).map(pitchToMidi);
      expect(ps[1] - ps[0]).toBe(semis[q.choices![q.correct!]]);
    }
  });

  it('finds notes in any octave', () => {
    const f = generate(gen({ generator: 'find-notes', notes: 'C4-B4', questions: 5 }), seeded(5)) as QuizExercise;
    expect(f.pitchMatch).toBe('pitchClass');
    expect(f.questions[0].ask).toMatch(/^Find [A-G]/);
  });

  it('writes rhythms and tunes that fill their bars and end at home', () => {
    for (let s = 1; s < 20; s++) {
      const r = generate(gen({ generator: 'rhythm-read', durations: ['q', 'h', 'e'], meter: '3/4', bars: 4 }), seeded(s)) as TimedExercise;
      expect(r.tap).toBe(true);
      expect(r.bars).toBe(4);
      const t = generate(gen({ generator: 'sight-read', notes: 'C4-G4', keys: ['C', 'G'], durations: ['q', 'h'], bars: 4, tempo: 80 }), seeded(s)) as TimedExercise;
      expect(t).toMatchObject({ kind: 'timed', display: 'staff', tempo: 80, bars: 4, hand: 'right' });
      const notes = t.right!.filter((x) => x.pitches.length).map((x) => pitchToMidi(x.pitches[0]));
      expect(Math.min(...notes)).toBeGreaterThanOrEqual(60);
      expect(Math.max(...notes)).toBeLessThanOrEqual(67);
      expect(notes[notes.length - 1] % 12).toBe(t.key === 'G' ? 7 : 0);
    }
  });

  it('scores against the goal: its accuracy is a clean take, slow answers stay below', () => {
    expect(applyGoal(90, { accuracy: 90 }).score).toBe(92);
    expect(applyGoal(100, { accuracy: 90 }).score).toBe(100);
    expect(applyGoal(90, { accuracy: 90, medianMs: 2000 }, 2500)).toEqual({ score: 91, stars: 2, slow: true });
    expect(applyGoal(80, undefined).score).toBe(80);

    let t = 0;
    const quiz = generate(gen({ generator: 'read-notes', notes: 'C4-G4', questions: 3, mastery: { accuracy: 90, medianMs: 1000 } }), seeded(6)) as QuizExercise;
    const s = new QuizSession(quiz, cal88, Math.random, () => t);
    for (const q of quiz.questions) {
      t += 1500;
      s.press(toDevice(cal88, pitchToMidi(q.play![0])));
      s.next();
    }
    expect(s.medianMs()).toBe(1500);
    expect(s.result()).toMatchObject({ right: 3, score: 91, slow: true });
  });
});
