import { describe, expect, it } from 'vitest';
import { loadContent, parseExercise } from '../src/modules/piano/content/load';
import type { ExplainStep, PlaygroundStep, QuizExercise } from '../src/modules/piano/content/types';
import { pitchToMidi } from '../src/modules/piano/music/notes';

const lesson = (steps: string) => loadContent({ 'content/lessons/t.yaml': `id: t\ntitle: T\nunit: u\nsteps:\n${steps}` });

describe('theory blocks', () => {
  it('reads pictures, sound, callout, terms and a check on an explain step', () => {
    const { content, errors } = lesson(`
  - explain: The staff has five lines.
    staff: { notes: "C4:q E4:q G4:h", clef: treble, key: G, labels: names }
    keys: { notes: "C4 E4 G4", fingers: "1 3 5" }
    sound: "C4+E4+G4:h"
    callout: "**Rule.** Lines count from the bottom."
    terms: [staff, treble clef]
    check: { ask: "Which line?", choices: [first, { text: second, why: "count again" }], correct: 0, why: "It sits on the bottom line." }
    somethingNew: ignored
  - explain: Play it.
    staff: "G4:w"
    keys: [G4]
    check: { ask: "Play G", play: G4, pitchMatch: pitchClass }
  - playground: { clef: grand, notes: C3-C5, prompt: "Press any key." }`);
    expect(errors).toEqual([]);
    const [a, b, c] = content.lessons.get('t')!.steps as [ExplainStep, ExplainStep, PlaygroundStep];
    expect(a.staff).toMatchObject({ clef: 'treble', key: 'G', labels: 'names' });
    expect(a.staff!.notes).toHaveLength(3);
    expect(a.keys).toMatchObject({ labels: 'fingers', fingers: [1, 3, 5] });
    expect(a.sound![0].pitches).toHaveLength(3);
    expect(a.terms).toEqual(['staff', 'treble clef']);
    expect(a.check).toMatchObject({ choices: ['first', 'second'], correct: 0, why: 'It sits on the bottom line.' });
    expect(b.staff).toMatchObject({ clef: 'treble', labels: 'none' });
    expect(b.keys).toMatchObject({ labels: 'none' });
    expect(b.check).toMatchObject({ pitchMatch: 'pitchClass' });
    expect(pitchToMidi(b.check!.play![0])).toBe(67);
    expect(c.playground).toMatchObject({ clef: 'grand', prompt: 'Press any key.' });
    expect(c.playground.range.map(pitchToMidi)).toEqual([48, 72]);
  });

  it('says what is wrong', () => {
    expect(lesson(`  - explain: x\n    keys: { notes: "C4 E4", fingers: "1" }`).errors[0]).toMatch(/step 1: keys: "fingers" needs one number per key/);
    expect(lesson(`  - explain: x\n    check: { ask: "?" }`).errors[0]).toMatch(/check: give either/);
    expect(lesson(`  - explain: x\n    staff: { notes: "C4:q", clef: alto }`).errors[0]).toMatch(/clef/);
    expect(lesson(`  - playground: { notes: C5-C4 }`).errors[0]).toMatch(/low to high/);
  });

  it('gives quiz questions a why, per question and per choice, with a picture', () => {
    const q = parseExercise({
      id: 'q', kind: 'quiz', questions: [
        { ask: 'Which note?', choices: ['C', { text: 'D', why: 'D is a step higher.' }], correct: 0, why: 'Middle C sits on its own ledger line.', whyStaff: 'C4:w', whyKeys: 'C4' },
        { ask: 'Play C', play: 'C4' },
      ],
    }) as QuizExercise;
    expect(q.questions[0]).toMatchObject({ choices: ['C', 'D'], choiceWhy: [undefined, 'D is a step higher.'], why: 'Middle C sits on its own ledger line.' });
    expect(q.questions[0].whyStaff?.notes).toHaveLength(1);
    expect(q.questions[0].whyKeys?.notes).toHaveLength(1);
    expect(q.questions[1].why).toBeUndefined();
  });
});

import { romanChord as rc, voiceProgression as vp, parseKey as pk } from '../src/modules/piano/music/theory';

describe('roman numerals', () => {
  it('builds chords on the degrees of a key', () => {
    expect(rc(pk('C'), 'I')).toEqual([60, 64, 67]);
    expect(rc(pk('C'), 'vi')).toEqual([69, 72, 76]);
    expect(rc(pk('C'), 'ii')).toEqual([62, 65, 69]);
    expect(rc(pk('C'), 'V7')).toEqual([67, 71, 74, 77]);
    expect(rc(pk('C'), 'vii°')).toEqual([71, 74, 77]);
    expect(rc(pk('G'), 'IV')).toEqual([72, 76, 79]);
    expect(rc(pk('Am'), 'V')).toEqual([76, 80, 83]);
    expect(rc(pk('Am'), 'iv')).toEqual([74, 77, 81]);
    expect(rc(pk('Am'), 'VII')).toEqual([79, 83, 86]);
    expect(rc(pk('C'), 'bVII')).toEqual([70, 74, 77]);
    expect(() => rc(pk('C'), 'VIII')).toThrow();
  });

  it('voices a progression smoothly over a bass', () => {
    const v = vp(pk('C'), ['I', 'vi', 'IV', 'V']);
    expect(v.map((c) => c[0] % 12)).toEqual([0, 9, 5, 7]);
    for (let i = 1; i < v.length; i++) {
      const moves = v[i].slice(1).map((n, k) => Math.abs(n - v[i - 1][k + 1]));
      expect(Math.max(...moves)).toBeLessThanOrEqual(5);
    }
  });
});
