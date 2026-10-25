import { describe, expect, it } from 'vitest';
import { calibrate, keyName, shiftMiddleC, toDevice } from '../src/modules/piano/calibration';

const ok = (lo: number, hi: number) => {
  const r = calibrate(lo, hi);
  if (!r.ok) throw new Error(r.error);
  return r.calibration;
};

describe('calibration', () => {
  it('finds middle C on a standard 88-key board', () => {
    const c = ok(21, 108);
    expect(c.keyCount).toBe(88);
    expect(c.middleC).toBe(60);
    expect(c.offset).toBe(0);
  });

  it('handles a board that sends everything an octave up', () => {
    const c = ok(33, 120);
    expect(c.middleC).toBe(72);
    expect(toDevice(c, 60)).toBe(72);
    expect(keyName(c, 72)).toBe('C4');
  });

  it('picks the lower C on a 61-key tie', () => {
    expect(ok(36, 96).middleC).toBe(60);
  });

  it('works for 49 and 76 keys', () => {
    expect(ok(36, 84).middleC).toBe(60);
    expect(ok(28, 103).middleC).toBe(60);
  });

  it('rejects a black first key, reversed keys and tiny ranges', () => {
    expect(calibrate(22, 108).ok).toBe(false);
    expect(calibrate(60, 50).ok).toBe(false);
    expect(calibrate(60, 65).ok).toBe(false);
  });

  it('lets the player move middle C by an octave', () => {
    const c = ok(21, 108);
    expect(shiftMiddleC(c, 1).middleC).toBe(72);
    expect(shiftMiddleC(c, 1).offset).toBe(12);
    expect(shiftMiddleC(ok(48, 72), 2).middleC).toBe(60); // off the board: unchanged
  });
});
