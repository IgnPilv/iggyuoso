import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { calibrate, type Calibration } from '../src/calibration';
import { parseExercise } from '../src/content/load';
import type { FindExercise, SequenceExercise } from '../src/content/types';
import { FindSession, SequenceSession } from '../src/scoring/untimed';

const cal = (lo: number, hi: number): Calibration => {
  const r = calibrate(lo, hi);
  if (!r.ok) throw new Error(r.error);
  return r.calibration;
};
const find = (y: string) => parseExercise(parse(y)) as FindExercise;
const seq = (y: string) => parseExercise(parse(y)) as SequenceExercise;

describe('find', () => {
  it('asks for all 8 Cs on an 88-key board, in any order', () => {
    const s = new FindSession(find('id: f\nkind: find\ncoverAll: true\ntargets: [{ pitchClass: C }]'), cal(21, 108));
    expect(s.steps).toHaveLength(8);
    expect(s.press(62)).toBe('wrong');
    expect(s.press(108)).toBe('correct');
    expect(s.press(108)).toBe('again');
    for (const k of [24, 36, 48, 60, 72, 84, 96]) s.press(k);
    expect(s.done).toBe(true);
    expect(s.result().score).toBe(89); // 8 right, 1 wrong
  });

  it('counts black-key groups, including a cut-off group at the bottom', () => {
    const c = cal(21, 108);
    const threes = new FindSession(find('id: f\nkind: find\ncoverAll: true\ntargets: [{ blackGroup: 3 }]'), c);
    expect(threes.steps).toHaveLength(8); // A#0 alone, then 7 full groups
    const twos = new FindSession(find('id: f\nkind: find\ncoverAll: true\ntargets: [{ blackGroup: 2 }]'), c);
    expect(twos.steps).toHaveLength(7);
    expect(twos.press(61)).toBe('correct');
    expect(twos.press(63)).toBe('again'); // same group as 61
    expect(twos.press(66)).toBe('wrong');
  });

  it('follows the calibration on a shifted board', () => {
    const s = new FindSession(find('id: f\nkind: find\ntargets: [{ pitchClass: D }]'), cal(33, 120));
    expect(s.press(74)).toBe('correct');
  });

  it('asks named keys one at a time, any octave', () => {
    const s = new FindSession(find('id: f\nkind: find\ntargets: [{ pitchClass: G }, { pitchClass: A }]'), cal(21, 108));
    expect(s.steps[0].label).toBe('G');
    expect(s.press(45)).toBe('wrong');
    expect(s.press(31)).toBe('correct');
    expect(s.press(45)).toBe('correct');
    expect(s.done).toBe(true);
  });

  it('knows low and high', () => {
    const s = new FindSession(find('id: f\nkind: find\ntargets: [{ region: low }, { region: high }]'), cal(21, 108));
    expect(s.press(60)).toBe('wrong');
    expect(s.press(40)).toBe('correct');
    expect(s.press(70)).toBe('wrong');
    expect(s.press(90)).toBe('correct');
  });
});

describe('sequence', () => {
  it('waits for the right note and counts stumbles', () => {
    const s = new SequenceSession(seq('id: s\nkind: sequence\nnotes: "C4 E4 D4"\nfingers: "1 3 2"'), cal(21, 108));
    expect(s.hint()).toBe('C4 with finger 1');
    expect(s.press(60)).toBe('correct');
    expect(s.press(65)).toBe('wrong');
    expect(s.press(64)).toBe('correct');
    expect(s.press(62)).toBe('correct');
    expect(s.done).toBe(true);
    expect(s.result()).toMatchObject({ steps: 3, wrong: 1, score: 75 });
    expect([...s.stumbles]).toEqual([1]);
  });

  it('maps notes through calibration', () => {
    const s = new SequenceSession(seq('id: s\nkind: sequence\nnotes: "C4"'), cal(33, 120));
    expect(s.press(60)).toBe('wrong');
    expect(s.press(72)).toBe('correct');
  });
});
