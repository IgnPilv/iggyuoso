import { describe, expect, it } from 'vitest';
import { parseExercise } from '../src/modules/piano/content/load';
import type { ImproviseExercise } from '../src/modules/piano/content/types';
import { judgeImprovisation } from '../src/modules/piano/engine/improvise';
import type { CapturedNote } from '../src/modules/piano/music/transcribe';

const Q = 500;
const imp = (extra: Record<string, unknown>) => parseExercise({ id: 'i', kind: 'improvise', tempo: 120, bars: 4, ...extra }) as ImproviseExercise;
/** [midi, beat, beats] */
const play = (xs: [number, number, number][]): CapturedNote[] => xs.map(([midi, b, d], i) => ({ midi, on: b * Q + (i % 2 ? 15 : -10), off: (b + d) * Q - 30 }));
const check = (r: ReturnType<typeof judgeImprovisation>, rule: string) => r.checks.find((c) => c.rule === rule)!;

describe('improvise: loading', () => {
  it('reads the frame and adds "fill"', () => {
    const ex = imp({ scale: 'C major pentatonic', chords: 'C | F | G | C', backing: 'chords', key: 'C', rules: ['inScale', 'chordTones', { endOn: 'tonic' }, { steps: 60 }] });
    expect(ex.scale!.pcs.sort((a, b) => a - b)).toEqual([0, 2, 4, 7, 9]);
    expect(ex.backing).toHaveLength(4);
    expect(ex.rules.map((r) => r.rule)).toEqual(['inScale', 'chordTones', 'endOn', 'steps', 'fill']);
    expect(ex.rules[2]).toMatchObject({ pc: 0 });
  });

  it('takes a list of notes as the scale', () => {
    expect(imp({ scale: 'C# D# F# G# A#', rules: ['inScale'] }).scale!.pcs).toEqual([1, 3, 6, 8, 10]);
  });

  it('refuses rules without what they need', () => {
    expect(() => imp({ rules: ['inScale'] })).toThrow(/scale/);
    expect(() => imp({ rules: ['chordTones'] })).toThrow(/chords/);
    expect(() => imp({ bars: 1, rules: [{ repeat: 1 }] })).toThrow(/2 bars/);
    expect(imp({ bars: 12, rules: [{ repeat: { bars: 4, at: 8 } }] }).rules[0]).toMatchObject({ bars: 4, at: 8 });
  });
});

describe('improvise: judging', () => {
  const frame = imp({ scale: 'C major', chords: 'C | F | G | C', key: 'C', rules: ['inScale', 'chordTones', { endOn: 'tonic' }, { steps: 60 }] });
  const good = play([[64, 0, 1], [65, 1, 1], [67, 2, 2], [65, 4, 1], [64, 5, 1], [60, 6, 2], [62, 8, 1], [64, 9, 1], [62, 10, 2], [60, 12, 4]]);

  it('a tune in the scale, chord notes on the strong beats, home at the end: clean', () => {
    // Bar 2 (F) starts on F, beat 3 on C; bar 3 (G) on D, then D on 3; bar 4 on C.
    const r = judgeImprovisation(frame, good, Q);
    expect(r.checks.every((c) => c.ok)).toBe(true);
    expect(r.score).toBe(100);
  });

  it('random keys are not music: notes outside the scale and no home', () => {
    const bad = play([[61, 0, 1], [70, 1, 1], [54 + 12, 2, 1], [75, 4, 2], [63, 6, 2], [73, 8, 4], [66, 12, 4]]);
    const r = judgeImprovisation(frame, bad, Q);
    expect(check(r, 'inScale').ok).toBe(false);
    expect(check(r, 'endOn').ok).toBe(false);
    expect(r.score).toBeLessThan(65);
  });

  it('one wrong check keeps the take below clean', () => {
    const r = judgeImprovisation(frame, good.slice(0, -1), Q);
    expect(check(r, 'fill').ok).toBe(false);
    expect(r.score).toBeLessThanOrEqual(91);
  });

  it('question and answer', () => {
    const ex = imp({ key: 'C', rules: [{ questionAnswer: 2 }] });
    const qa = play([[60, 0, 1], [62, 1, 1], [64, 2, 2], [62, 4, 2], [67, 6, 2], [60, 8, 1], [62, 9, 1], [64, 10, 2], [62, 12, 2], [60, 14, 2]]);
    expect(check(judgeImprovisation(ex, qa, Q), 'questionAnswer').ok).toBe(true);
    const noQuestion = play([[60, 0, 1], [62, 1, 1], [64, 2, 2], [60, 4, 4], [60, 8, 1], [62, 9, 1], [64, 10, 2], [60, 12, 4]]);
    const r = judgeImprovisation(ex, noQuestion, Q);
    expect(check(r, 'questionAnswer').ok).toBe(false);
    expect(check(r, 'questionAnswer').message).toMatch(/question ended on C/);
  });

  it('repeat and sequence', () => {
    const motif: [number, number, number][] = [[60, 0, 0.5], [62, 0.5, 0.5], [64, 1, 1], [60, 2, 2]];
    const again = motif.map(([m, b, d]) => [m, b + 4, d] as [number, number, number]);
    const higher = motif.map(([m, b, d]) => [m + 2, b + 4, d] as [number, number, number]);
    const rep = imp({ bars: 2, rules: [{ repeat: 1 }] });
    const seq = imp({ bars: 2, rules: [{ sequence: 1 }] });
    expect(check(judgeImprovisation(rep, play([...motif, ...again]), Q), 'repeat').ok).toBe(true);
    expect(check(judgeImprovisation(seq, play([...motif, ...higher]), Q), 'sequence').ok).toBe(true);
    expect(check(judgeImprovisation(seq, play([...motif, ...again]), Q), 'sequence').ok).toBe(false);
  });

  it('keeping a rhythm and leaving space', () => {
    const ex = imp({ bars: 4, rhythm: 'x:q x:q x:h | r:w | x:q x:q x:h | r:w', rules: ['rhythm', { rests: 2 }] });
    const r = judgeImprovisation(ex, play([[60, 0, 1], [64, 1, 1], [67, 2, 2], [65, 8, 1], [64, 9, 1], [60, 10, 2]]), Q);
    expect(check(r, 'rhythm').ok).toBe(true);
    expect(check(r, 'rests').ok).toBe(true);
    // Bars 2 and 4 are rests in the rhythm, so "fill" is not asked unless listed... but fill is always added:
    expect(check(r, 'fill').ok).toBe(false);
  });

  it('the left hand on the roots', () => {
    const ex = imp({ hand: 'together', chords: 'C | G', bars: 2, rules: ['bassRoots'] });
    const r = judgeImprovisation(ex, play([[48, 0, 4], [64, 0, 2], [62, 2, 2], [43, 4, 4], [62, 4, 4]]), Q);
    expect(check(r, 'bassRoots').ok).toBe(true);
  });
});

describe('improvise: form', () => {
  it('A B A: the opening comes back after something new', () => {
    const ex = imp({ bars: 6, rules: [{ repeat: { bars: 2, at: 4 } }, { contrast: { bars: 2, at: 2 } }] });
    const a: [number, number, number][] = [[60, 0, 1], [64, 1, 1], [67, 2, 2], [65, 4, 1], [64, 5, 1], [62, 6, 2]];
    const b: [number, number, number][] = [[72, 8, 0.5], [71, 8.5, 0.5], [69, 9, 0.5], [67, 9.5, 0.5], [65, 10, 2], [64, 12, 4]];
    const back = a.map(([m, x, d]) => [m, x + 16, d] as [number, number, number]);
    const r = judgeImprovisation(ex, play([...a, ...b, ...back]), Q);
    expect(r.checks.find((c) => c.rule === 'repeat')!.ok).toBe(true);
    expect(r.checks.find((c) => c.rule === 'contrast')!.ok).toBe(true);
    const same = judgeImprovisation(ex, play([...a, ...a.map(([m, x, d]) => [m, x + 8, d] as [number, number, number]), ...back]), Q);
    expect(same.checks.find((c) => c.rule === 'contrast')!.ok).toBe(false);
  });
});
