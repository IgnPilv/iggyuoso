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

  it('sight-reads with both hands: a tune over I, IV, V roots, fifths or chords', () => {
    const bass = (t: TimedExercise) => t.left!.map((x) => x.pitches.map(pitchToMidi));
    for (let s = 1; s < 25; s++) {
      for (const [key, left, meter] of [['C', 'roots', '4/4'], ['G', 'fifths', '3/4'], ['F', 'chords', '4/4'], ['Am', 'roots', '4/4'], ['D', 'fifths', '6/8']] as const) {
        const t = generate(gen({ generator: 'sight-read', hand: 'together', left, notes: 'C4-C5', keys: [key], durations: meter === '6/8' ? ['q.', 'q', 'e'] : ['q', 'h'], meter, bars: 4 }), seeded(s)) as TimedExercise;
        expect(t).toMatchObject({ kind: 'timed', hand: 'together', bars: 4 });
        const lh = bass(t);
        lh.flat().forEach((n) => { expect(n).toBeLessThanOrEqual(60); expect(n).toBeGreaterThanOrEqual(40); });
        const tonic = { C: 0, G: 7, F: 5, Am: 9, D: 2 }[key];
        expect(lh[0][0] % 12).toBe(tonic); // starts on I
        expect(lh[lh.length - 1][0] % 12).toBe(tonic); // ends on I
        if (left === 'chords') lh.forEach((c) => expect(c).toHaveLength(3));
        else lh.forEach((c) => expect(c).toHaveLength(1));
        // Each bar's first tune note belongs to the bar's chord.
        let at = 0, bar = 0;
        const barLen = { '4/4': 4, '3/4': 3, '6/8': 3 }[meter];
        const leftAt = (beat: number) => { let b = 0; for (const x of t.left!) { if (beat < b + x.beats) return x; b += x.beats; } return t.left![t.left!.length - 1]; };
        for (const x of t.right!) {
          if (Math.abs(at - bar * barLen) < 1e-6 && x.pitches.length) {
            const chordRoot = pitchToMidi(leftAt(at).pitches[0]) % 12;
            const third = key === 'Am' && chordRoot !== 4 ? 3 : 4;
            expect([chordRoot, (chordRoot + third) % 12, (chordRoot + 7) % 12]).toContain(pitchToMidi(x.pitches[0]) % 12);
          }
          at += x.beats;
          if (at >= (bar + 1) * barLen - 1e-6) bar = Math.floor(at / barLen + 1e-6);
        }
      }
    }
    // The bar before the end is V: in A minor that is E major, with a G sharp.
    const am = generate(gen({ generator: 'sight-read', hand: 'together', left: 'chords', keys: ['Am'], notes: 'A4-A5', bars: 4 }), seeded(3)) as TimedExercise;
    expect(bass(am)[2].map((n) => n % 12)).toEqual([4, 8, 11]);
    expect(() => gen({ generator: 'sight-read', left: 'chords' })).toThrow(/together/);
  });

  it('writes two-hand rhythms and echoes', () => {
    for (let s = 1; s < 20; s++) {
      const r = generate(gen({ generator: 'rhythm-read', hands: 'both', durations: ['q', 'h', 'e'], bars: 3 }), seeded(s)) as TimedExercise;
      expect(r).toMatchObject({ tap: true, pitchMatch: 'side', hand: 'together', bars: 3 });
      expect(r.left!.every((t) => t.beats >= 1)).toBe(true); // the left hand moves in longer values
      const e = generate(gen({ generator: 'rhythm-echo', durations: ['q', 'h', 'e'], bars: 2 }), seeded(s)) as TimedExercise;
      expect(e).toMatchObject({ tap: true, echo: true, pitchMatch: 'any', bars: 2 });
      const e2 = generate(gen({ generator: 'rhythm-echo', hands: 'both', bars: 2 }), seeded(s)) as TimedExercise;
      expect(e2).toMatchObject({ echo: true, pitchMatch: 'side' });
    }
    expect(() => gen({ generator: 'sight-read', hands: 'both' })).toThrow(/rhythm-read/);
  });

  it('always gives a rhythm to hear: no whole-bar notes before the last bar, at least two values', () => {
    for (let s = 1; s < 200; s++) {
      for (const bars of [2, 4, 8]) {
        const r = generate(gen({ generator: 'rhythm-echo', durations: ['q', 'h', 'w'], bars }), seeded(s)) as TimedExercise;
        const lines = r.right!;
        expect(lines.slice(0, -1).every((t) => t.beats < 4)).toBe(true); // only the last bar is a whole note
        expect(new Set(lines.map((t) => t.beats)).size).toBeGreaterThan(1);
      }
    }
  });

  it('puts rests in rhythms when durations list them, never first', () => {
    let rests = 0;
    for (let s = 1; s < 30; s++) {
      const r = generate(gen({ generator: 'rhythm-read', durations: ['q', 'h', 'r:q', 'r:e', 'e'], bars: 3 }), seeded(s)) as TimedExercise;
      expect(r.right![0].pitches.length).toBe(1);
      rests += r.right!.filter((t) => !t.pitches.length).length;
    }
    expect(rests).toBeGreaterThan(0);
    expect(() => gen({ generator: 'rhythm-read', durations: ['r:q'] })).toThrow();
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
