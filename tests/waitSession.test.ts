import { describe, expect, it } from 'vitest';
import { WaitSession, waitSteps, waitSummary } from '../src/modules/piano/engine/waitSession';

// C4 then a C–E–G chord (with the left hand's C3) then D4.
const notes = [
  { beat: 0, beats: 1 }, // 0: C4
  { beat: 1, beats: 1 }, // 1: E4
  { beat: 1, beats: 1 }, // 2: G4
  { beat: 1, beats: 2 }, // 3: C3
  { beat: 2, beats: 1 }, // 4: D4
];
const devices = [60, 64, 67, 48, 62];
const BEAT = 500;

describe('wait for me', () => {
  it('groups notes that start together into one step', () => {
    expect(waitSteps(notes).map((s) => s.notes)).toEqual([[0], [1, 2, 3], [4]]);
  });

  it('runs at the tempo but stops at a step until it is played', () => {
    const w = new WaitSession(notes, devices, BEAT, 0, 1);
    expect(w.beat(0)).toBe(-1);
    expect(w.beat(250)).toBeCloseTo(-0.5);
    expect(w.waiting(250)).toBe(false);
    expect(w.beat(5000)).toBe(0); // held at the first note
    expect(w.waiting(5000)).toBe(true);
    expect(w.press(60, 5000)).toEqual({ kind: 'hit', note: 0, advanced: true });
    expect(w.beat(5000)).toBe(0);
    expect(w.beat(5250)).toBeCloseTo(0.5);
    expect(w.beat(9000)).toBe(1); // held at the chord
  });

  it('takes a chord one key at a time and shows what is left', () => {
    const w = new WaitSession(notes, devices, BEAT, 0, 0);
    w.press(60, 0);
    expect(w.press(64, 600)).toMatchObject({ kind: 'hit', advanced: false });
    expect(w.stepKeys()).toEqual({ pressed: [1], remaining: [2, 3] });
    expect(w.noteState(1)).toBe('hit');
    expect(w.noteState(2)).toBe('now');
    expect(w.noteState(4)).toBe('coming');
    expect(w.press(64, 700)).toEqual({ kind: 'again' }); // pressed again: nothing changes
    expect(w.press(65, 800)).toEqual({ kind: 'wrong' });
    expect(w.beat(5000)).toBe(1);
    w.press(48, 5000);
    expect(w.press(67, 5100)).toMatchObject({ kind: 'hit', advanced: true });
    expect(w.current).toBe(2);
  });

  it('jumps on when a step is played before the music gets there', () => {
    const w = new WaitSession(notes, devices, BEAT, 0, 1);
    w.press(60, 100); // the clock is still at -0.8
    expect(w.beat(100)).toBe(0);
    expect(w.beat(350)).toBeCloseTo(0.5);
  });

  it('holds still while paused', () => {
    const w = new WaitSession(notes, devices, BEAT, 0, 1);
    w.pause(250);
    expect(w.beat(2000)).toBeCloseTo(-0.5);
    expect(w.press(60, 2000)).toEqual({ kind: 'again' });
    w.resume(3000);
    expect(w.beat(3250)).toBeCloseTo(0);
  });

  it('counts wrong keys, clean steps and waits', () => {
    const w = new WaitSession(notes, devices, BEAT, 0, 1);
    w.press(60, 200); // ahead of the music: no wait
    w.press(65, 3000); // wrong, while waiting at the chord
    for (const d of [64, 67, 48]) w.press(d, 3100);
    w.press(62, 9000);
    expect(w.done).toBe(true);
    const r = w.result(20000);
    expect(r).toEqual({ notes: 5, steps: 3, wrong: 1, cleanSteps: 2, waits: 2, ms: 9000 });
    expect(waitSummary(r)).toBe('5 notes, 1 wrong key, the music waited 2 times, 0:09');
  });
});
