import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { calibrate } from '../src/modules/piano/calibration';
import { parseExercise } from '../src/modules/piano/content/load';
import type { BuildExercise, EarExercise, QuizExercise } from '../src/modules/piano/content/types';
import { BuildSession, EarSession, QuizSession } from '../src/modules/piano/engine/drills';
import { cadence, chordNotes, parseKey, resolution, scaleNotes } from '../src/modules/piano/music/theory';
import { scoreTimed } from '../src/modules/piano/scoring/timed';
import { expectedNotes } from '../src/modules/piano/music/timeline';

const ex = <T>(yaml: string) => parseExercise(parse(yaml)) as T;
const cal88 = (() => { const r = calibrate(21, 108); if (!r.ok) throw new Error(); return r.calibration; })();
// A 61-key board that sends notes an octave low: written C4 is device 48.
const calLow = (() => { const r = calibrate(24, 84); if (!r.ok) throw new Error(); return { ...r.calibration, middleC: 48, offset: -12 }; })();
const seq = (...xs: number[]) => { let i = 0; return () => xs[i++ % xs.length]; };

describe('theory', () => {
  it('builds chords, scales and keys', () => {
    expect(chordNotes('C')).toEqual([60, 64, 67]);
    expect(chordNotes('Am', 3)).toEqual([57, 60, 64]);
    expect(chordNotes('G7')).toEqual([67, 71, 74, 77]);
    expect(() => chordNotes('Cx')).toThrow();
    expect(scaleNotes('C major')).toEqual([60, 62, 64, 65, 67, 69, 71, 72]);
    expect(scaleNotes('A harmonic minor', 1, 3)).toEqual([57, 59, 60, 62, 64, 65, 68, 69]);
    expect(parseKey('Am')).toMatchObject({ tonicPc: 9, minor: true });
    expect(cadence(parseKey('C'))[2]).toContain(59); // V has the leading note
  });

  it('resolves degrees to the tonic: 2 3 4 down, 5 6 7 up', () => {
    const C = parseKey('C');
    expect(resolution(C, 64)).toEqual([64, 62, 60]);
    expect(resolution(C, 71)).toEqual([71, 72]);
    expect(resolution(C, 67)).toEqual([67, 69, 71, 72]);
  });
});

describe('content format for the new kinds', () => {
  it('parses tap rhythms as timed exercises where any key counts', () => {
    const t = ex<{ kind: string; tap: boolean; pitchMatch: string; bars: number }>(`
id: tap-1
kind: tap
tempo: 80
meter: 4/4
rhythm: "x:q x:q x:h | x:q x:e x:e x:h"`);
    expect(t).toMatchObject({ kind: 'timed', tap: true, pitchMatch: 'any', bars: 2 });
    expect(() => ex(`{id: t, kind: tap, tempo: 80, meter: 4/4, rhythm: "C4:q x:q x:h"}`)).toThrow(/x for every note/);
    expect(() => ex(`{id: t, kind: tap, tempo: 80, meter: 4/4, rhythm: "x:q x:q"}`)).toThrow(/2 beats/);
  });

  it('scores a tap on any key', () => {
    const t = ex<Parameters<typeof expectedNotes>[0]>(`{id: t, kind: tap, tempo: 60, meter: 4/4, rhythm: "x:q x:q x:q x:q"}`);
    const played = [0, 1000, 2000, 3000].map((on, i) => ({ midi: 70 + i, on, off: on + 500 }));
    const r = scoreTimed(expectedNotes(t), played, { tempo: 60, pitchMatch: 'any' });
    expect(r.score).toBe(100);
  });

  it('taps with two hands: right from middle C up, left below, scored per hand', () => {
    const t = ex<Parameters<typeof expectedNotes>[0] & { hand: string; pitchMatch: string }>(`
id: t2
kind: tap
tempo: 60
meter: 4/4
right: "x:q x:q x:h"
left: "x:h x:h"`);
    expect(t).toMatchObject({ kind: 'timed', tap: true, pitchMatch: 'side', hand: 'together' });
    const want = expectedNotes(t);
    expect(want.map((n) => n.midi).sort()).toEqual([48, 48, 60, 60, 60]);
    // Right hand on any keys above middle C, left hand anywhere below; one left beat on the wrong side.
    const played = [
      { midi: 72, on: 0, off: 900 }, { midi: 65, on: 1000, off: 1900 }, { midi: 61, on: 2000, off: 3900 },
      { midi: 40, on: 0, off: 1900 }, { midi: 62, on: 2000, off: 3900 },
    ];
    const r = scoreTimed(want, played, { tempo: 60, pitchMatch: 'side' });
    expect(r.hands.find((h) => h.hand === 'right')!.score).toBe(100);
    expect(r.hands.find((h) => h.hand === 'left')!.score).toBeLessThan(100);
    expect(() => ex(`{id: t, kind: tap, tempo: 60, meter: 4/4, rhythm: "x:w", right: "x:w"}`)).toThrow(/either/);
    expect(() => ex(`{id: t, kind: tap, tempo: 60, meter: 4/4, right: "x:w", left: "C3:w"}`)).toThrow(/x for every note/);
  });

  it('parses build shorthands', () => {
    const b = ex<BuildExercise>(`
id: b
kind: build
tasks:
  - chord: Cm
  - interval: M3
    from: D4
  - scale: G major
  - notes: [C4, G4]
    order: any
  - chord: F
    together: false`);
    expect(b.tasks.map((t) => t.mode)).toEqual(['together', 'any', 'listed', 'any', 'any']);
    expect(b.tasks[0]).toMatchObject({ ask: 'Play a C minor chord', notes: [60, 63, 67] });
    expect(b.tasks[1]).toMatchObject({ ask: 'Play a major 3rd up from D4', notes: [62, 66] });
    expect(b.tasks[2].notes).toHaveLength(8);
    expect(() => ex(`{id: b, kind: build, tasks: [{ chord: Hm }]}`)).toThrow(/task 1/);
  });

  it('parses quiz questions and checks the answers', () => {
    const q = ex<QuizExercise>(`
id: q
kind: quiz
questions:
  - ask: How many beats is a half note?
    choices: ["1", "2", "4"]
    correct: 1
  - ask: Play the note shown
    staff: "G4:q"
    play: G4`);
    expect(q.questions[1].play).toHaveLength(1);
    expect(() => ex(`{id: q, kind: quiz, questions: [{ ask: x, choices: [a, b], correct: 2 }]}`)).toThrow(/correct/);
    expect(() => ex(`{id: q, kind: quiz, questions: [{ ask: x }]}`)).toThrow(/either/);
  });

  it('parses every ear item type', () => {
    const e = ex<EarExercise>(`
id: e
kind: ear
cadence: C
questions: 6
items:
  - { type: note, pool: [C4, E4, G4] }
  - { type: interval, pool: [M3, P5], answer: name }
  - { type: chord, pool: [maj, min] }
  - { type: degree, pool: [1, 3, 5] }
  - { type: melody, notes: "C4 D4 E4" }
  - { type: compare }`);
    expect(e.items.map((i) => i.type)).toEqual(['note', 'interval', 'chord', 'degree', 'melody', 'compare']);
    expect(e.items[3]).toMatchObject({ key: 'C', resolve: true });
    expect(e.items[4]).toMatchObject({ plays: 2 });
    expect(() => ex(`{id: e, kind: ear, items: [{ type: interval, pool: [M9] }]}`)).toThrow(/item 1/);
    expect(() => ex(`{id: e, kind: ear, items: [{ type: compare, pool: [louder] }]}`)).toThrow(/louder/);
  });
});

describe('ear session', () => {
  it('takes the first key as the answer, through calibration', () => {
    const e = ex<EarExercise>(`{id: e, kind: ear, questions: 2, items: [{ type: note, pool: [E4] }]}`);
    const s = new EarSession(e, calLow, seq(0));
    expect(s.current.keys!.expect).toEqual([52]); // E4 is an octave lower on this board
    expect(s.press(52)).toBe('correct');
    expect(s.press(53)).toBe('ignored'); // already answered
    s.next();
    expect(s.press(53)).toBe('wrong');
    expect(s.done).toBe(true);
    expect(s.result()).toMatchObject({ right: 1, total: 2, score: 50 });
  });

  it('asks missed items more often, and never the same one twice running', () => {
    const e = ex<EarExercise>(`{id: e, kind: ear, questions: 50, items: [{ type: interval, pool: [M2, M3, P5], answer: name }]}`);
    const s = new EarSession(e, cal88);
    const asked: string[] = [];
    for (let i = 0; i < 50; i++) {
      const q = s.current;
      asked.push(q.slot);
      // Always miss the major 3rd, get the rest right.
      s.pick(q.slot.endsWith('M3') ? (q.correct! + 1) % 3 : q.correct!);
      s.next();
    }
    asked.forEach((a, i) => { if (i) expect(a).not.toBe(asked[i - 1]); });
    expect(asked.filter((a) => a.endsWith('M3')).length).toBeGreaterThan(20);
    expect(s.weights.get('0:M3')).toBeGreaterThan(s.weights.get('0:M2')!);
  });

  it('plays the cadence first for degrees and accepts any octave', () => {
    const e = ex<EarExercise>(`{id: e, kind: ear, questions: 1, items: [{ type: degree, key: G, pool: [5] }]}`);
    const s = new EarSession(e, cal88, seq(0));
    expect(s.current.play.length).toBe(5); // four chords, then the note
    expect(s.current.after.map((x) => x.notes[0])).toEqual([62, 64, 66, 67]); // D up to G
    expect(s.press(62 + 24)).toBe('correct');
  });

  it('scores a melody echo note by note', () => {
    const e = ex<EarExercise>(`{id: e, kind: ear, questions: 1, items: [{ type: melody, notes: "C4 D4 E4" }]}`);
    const s = new EarSession(e, cal88);
    s.press(60); s.press(61); s.press(64);
    expect(s.result().score).toBe(67);
  });

  it('builds higher / lower / same pairs inside the range', () => {
    const e = ex<EarExercise>(`{id: e, kind: ear, questions: 30, items: [{ type: compare, range: [C4, G4] }]}`);
    const s = new EarSession(e, cal88);
    for (let i = 0; i < 30; i++) {
      const q = s.current;
      const [a, b] = q.prompt.map((x) => x.notes[0]);
      expect(Math.min(a, b)).toBeGreaterThanOrEqual(60);
      expect(Math.max(a, b)).toBeLessThanOrEqual(67);
      expect(['higher', 'lower', 'same'][q.correct!]).toBe(b > a ? 'higher' : b < a ? 'lower' : 'same');
      s.pick(q.correct!); s.next();
    }
  });
});

describe('ear items for a beginner ear', () => {
  const run = (yaml: string, n: number, check: (q: EarSession['current']) => void) => {
    const s = new EarSession(ex<EarExercise>(yaml), cal88);
    for (let i = 0; i < n; i++) { check(s.current); s.pick(s.current.correct ?? 0); s.next(); }
    return s;
  };

  it('parses the new items and rejects bad ones', () => {
    const e = ex<EarExercise>(`
id: e
kind: ear
items:
  - { type: compare, pool: [same, different], gap: [1, 3] }
  - { type: note, pool: [C4, G4], lit: true, reference: C4 }
  - { type: contour, length: 4 }
  - { type: motion, pool: [step, leap] }
  - { type: count, pool: [1, 2] }
  - { type: rhythm, pool: ["x:q x:q x:h", "x:h x:h", "x:q r:q x:h"], meter: 4/4, tempo: 90 }
  - { type: loudness, notes: "C4 E4 G4" }
  - { type: melody, notes: "C4 D4", lit: true }`);
    expect(e.items.map((i) => i.type)).toEqual(['compare', 'note', 'contour', 'motion', 'count', 'rhythm', 'loudness', 'melody']);
    expect(e.items[0]).toMatchObject({ gap: [1, 3] });
    expect(e.items[2]).toMatchObject({ length: 4 });
    expect((e.items[2] as { pool: string[] }).pool).toHaveLength(8);
    expect(() => ex(`{id: e, kind: ear, items: [{ type: compare, pool: [higher, different] }]}`)).toThrow();
    expect(() => ex(`{id: e, kind: ear, items: [{ type: contour, length: 3, pool: [up] }]}`)).toThrow(/up-down/);
    expect(() => ex(`{id: e, kind: ear, items: [{ type: rhythm, pool: ["x:q x:q", "x:h x:h"] }]}`)).toThrow(/bar 1/);
    expect(() => ex(`{id: e, kind: ear, items: [{ type: rhythm, pool: ["C4:w", "x:w"] }]}`)).toThrow(/x for every note/);
    expect(() => ex(`{id: e, kind: ear, items: [{ type: count, pool: [5] }]}`)).toThrow(/1 to 4/);
  });

  it('compare: Same / Different with gaps in the asked range', () => {
    run(`{id: e, kind: ear, questions: 40, items: [{ type: compare, pool: [same, different], gap: [3, 4], range: [C4, C5] }]}`, 40, (q) => {
      expect(q.choices).toEqual(['Same', 'Different']);
      const [a, b] = q.prompt.map((x) => x.notes[0]);
      if (q.correct === 0) expect(a).toBe(b);
      else expect([3, 4]).toContain(Math.abs(a - b));
    });
  });

  it('note: lights the pool keys and plays the reference first', () => {
    run(`{id: e, kind: ear, questions: 5, items: [{ type: note, pool: [C4, G4], lit: true, reference: C4 }]}`, 5, (q) => {
      expect(q.lit).toEqual([60, 67]);
      expect(q.prompt[0].notes).toEqual([60]);
      expect(q.prompt).toHaveLength(2);
      expect(q.ask).toMatch(/first note was C/);
    });
  });

  it('contour: notes move the way the right arrows say, inside the range', () => {
    run(`{id: e, kind: ear, questions: 30, items: [{ type: contour, length: 3, range: [C4, C5], gap: [2, 5] }]}`, 30, (q) => {
      const ns = q.prompt.map((x) => x.notes[0]);
      expect(ns).toHaveLength(3);
      ns.forEach((n) => { expect(n).toBeGreaterThanOrEqual(60); expect(n).toBeLessThanOrEqual(72); });
      const shape = ns.slice(1).map((n, i) => (n > ns[i] ? '↗' : '↘')).join(' ');
      expect(q.choices![q.correct!]).toBe(shape);
      expect(q.choices).toHaveLength(4);
    });
  });

  it('motion: same, a step of 1-2 or a leap of 5 or more', () => {
    run(`{id: e, kind: ear, questions: 40, items: [{ type: motion }]}`, 40, (q) => {
      const [a, b] = q.prompt.map((x) => x.notes[0]);
      const d = Math.abs(a - b);
      const want = q.choices![q.correct!];
      if (want === 'The same') expect(d).toBe(0);
      else if (want === 'A step') expect([1, 2]).toContain(d);
      else expect(d).toBeGreaterThanOrEqual(5);
    });
  });

  it('count: that many different notes at once', () => {
    run(`{id: e, kind: ear, questions: 30, items: [{ type: count, pool: [1, 2, 3, 4] }]}`, 30, (q) => {
      const notes = q.prompt[0].notes;
      expect(new Set(notes).size).toBe(notes.length);
      expect(q.choices![q.correct!]).toBe(notes.length === 1 ? '1 note' : `${notes.length} notes`);
      notes.forEach((n) => { expect(n).toBeGreaterThanOrEqual(48); expect(n).toBeLessThanOrEqual(72); });
    });
  });

  it('rhythm: a bar of clicks, then the rhythm on one pitch; up to four pictures', () => {
    const s = new EarSession(ex<EarExercise>(`{id: e, kind: ear, questions: 1, items: [{ type: rhythm, tempo: 60, pool: ["x:q x:q x:h", "x:h x:h", "x:w", "x:q x:q x:q x:q", "x:h x:q x:q"] }]}`), cal88);
    const q = s.current;
    expect(q.prompt.filter((x) => x.click)).toHaveLength(4);
    expect(q.prompt.filter((x) => x.click === 'accent')).toHaveLength(1);
    const notes = q.prompt.filter((x) => !x.click);
    expect(notes[0].at).toBe(4000); // after the count-in bar, at 60 bpm
    notes.forEach((x) => expect(x.notes).toEqual([72]));
    expect(q.pictures).toHaveLength(4);
    const beats = q.pictures![q.correct!].map((t) => t.beats);
    expect(notes.length).toBe(beats.length);
  });

  it('rhythm in 6/8: the tempo counts dotted quarters', () => {
    const s = new EarSession(ex<EarExercise>(`{id: e, kind: ear, questions: 1, items: [{ type: rhythm, meter: 6/8, tempo: 60, pool: ["x:q. x:q.", "x:q x:e x:q x:e"] }]}`), cal88);
    const clicks = s.current.prompt.filter((x) => x.click);
    expect(clicks.map((x) => x.at)).toEqual([0, 1000]);
  });

  it('loudness: the same phrase twice, the second louder or softer', () => {
    run(`{id: e, kind: ear, questions: 20, items: [{ type: loudness, notes: "C4 E4" }]}`, 20, (q) => {
      expect(q.prompt).toHaveLength(4);
      const [first, second] = [q.prompt[0].vol!, q.prompt[2].vol!];
      expect(q.choices![q.correct!]).toBe(second > first ? 'Louder' : 'Softer');
    });
  });

  it('melody: lights the keys the phrase uses', () => {
    const s = new EarSession(ex<EarExercise>(`{id: e, kind: ear, questions: 1, items: [{ type: melody, notes: "C4 E4 C4", lit: true }]}`), cal88);
    expect(s.current.lit).toEqual([60, 64]);
  });
});

describe('quiz and build sessions', () => {
  it('quiz: buttons and played answers', () => {
    const q = ex<QuizExercise>(`
id: q
kind: quiz
questions:
  - { ask: a, choices: [x, y], correct: 1 }
  - { ask: b, play: "C4 E4" }`);
    const s = new QuizSession(q, cal88);
    expect(s.pick(0)).toBe('wrong');
    s.next();
    expect(s.press(60)).toBe('correct');
    expect(s.press(64)).toBe('correct');
    expect(s.done).toBe(true);
    expect(s.result().score).toBe(50);
  });

  it('build: a chord counts once all of it is held, and a wrong key spoils the first try', () => {
    const b = ex<BuildExercise>(`{id: b, kind: build, tasks: [{ chord: C }, { chord: F }]}`);
    const s = new BuildSession(b, cal88);
    s.press(60); s.press(64);
    expect(s.index).toBe(0);
    s.press(67);
    expect(s.index).toBe(1);
    expect(s.clean).toEqual([true]);
    // Old keys still held do not spoil the next chord.
    s.press(65); s.press(70); // B flat: wrong
    s.press(69); s.press(72);
    expect(s.index).toBe(1); // the wrong key is still down
    s.release(70);
    expect(s.done).toBe(true);
    expect(s.clean).toEqual([true, false]);
    expect(s.result().score).toBe(50);
  });

  it('build: scales in order, intervals in any order, repeats ignored', () => {
    const b = ex<BuildExercise>(`{id: b, kind: build, pitchMatch: pitchClass, tasks: [{ interval: P5, from: C4 }, { notes: "C4 D4 C5", order: listed }]}`);
    const s = new BuildSession(b, cal88);
    expect(s.press(67)).toBe('correct');
    expect(s.press(67 + 12)).toBe('ignored');
    expect(s.press(48)).toBe('correct'); // any C
    expect(s.index).toBe(1);
    expect(s.press(62)).toBe('wrong');
    s.press(60); s.press(62); s.press(48);
    expect(s.done).toBe(true);
    expect(s.clean).toEqual([true, false]);
  });
});

describe('exercise fields', () => {
  it('reads title and feedback, and leaves a tap without a hand', () => {
    const ear = parseExercise({ id: 'cp', kind: 'ear', title: 'Checkpoint', feedback: 'none', items: [{ type: 'note', pool: ['C4'] }] });
    expect(ear.title).toBe('Checkpoint');
    expect(ear.kind === 'ear' && ear.feedback).toBe('none');
    const quiz = parseExercise({ id: 'q', kind: 'quiz', questions: [{ ask: 'a?', choices: ['x', 'y'], correct: 0 }] });
    expect(quiz.kind === 'quiz' && quiz.feedback).toBe('normal');
    expect(() => parseExercise({ id: 'q', kind: 'quiz', feedback: 'quiet', questions: [{ ask: 'a?', choices: ['x', 'y'], correct: 0 }] })).toThrow();
    const tap = parseExercise({ id: 't', kind: 'tap', tempo: 80, meter: '4/4', rhythm: 'x:q x:q x:h' });
    expect(tap.hand).toBeUndefined();
    expect(parseExercise({ id: 't2', kind: 'tap', hand: 'left', tempo: 80, meter: '4/4', rhythm: 'x:q x:q x:h' }).hand).toBe('left');
  });
});
