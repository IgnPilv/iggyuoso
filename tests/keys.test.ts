import { describe, expect, it } from 'vitest';
import { parseExercise } from '../src/content/load';
import { keySignature } from '../src/music/theory';

describe('key signatures', () => {
  it('counts sharps and flats for major and minor keys', () => {
    expect(keySignature('C').count).toBe(0);
    expect(keySignature('G')).toMatchObject({ count: 1, of: { F: 1, C: 0 } });
    expect(keySignature('D').of).toMatchObject({ F: 1, C: 1, G: 0 });
    expect(keySignature('Bb')).toMatchObject({ count: -2, of: { B: -1, E: -1, A: 0 } });
    expect(keySignature('F').of.B).toBe(-1);
    expect(keySignature('Am').count).toBe(0);
    expect(keySignature('Em').count).toBe(1);
    expect(keySignature('Dm').count).toBe(-1);
    expect(keySignature('C#').count).toBe(7);
    expect(keySignature('Cb').count).toBe(-7);
    expect(() => keySignature('D#')).toThrow(/usual spelling/);
    expect(() => keySignature('H')).toThrow();
  });

  it('is checked in content', () => {
    const ex = parseExercise({ id: 'k', kind: 'timed', hand: 'right', tempo: 60, meter: '4/4', key: 'G', right: 'G4:q A4:q B4:q F#4:q' });
    expect(ex.key).toBe('G');
    expect(() => parseExercise({ id: 'k', kind: 'timed', hand: 'right', tempo: 60, meter: '4/4', key: 'X', right: 'G4:w' })).toThrow();
    const quiz = parseExercise({ id: 'q', kind: 'quiz', questions: [{ ask: 'Which key?', staff: 'F#4:w', key: 'D', choices: ['D', 'G'], correct: 0 }] });
    expect(quiz.kind === 'quiz' && quiz.questions[0].key).toBe('D');
  });
});
