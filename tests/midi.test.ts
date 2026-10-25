import { describe, expect, it } from 'vitest';
import { decodeNote, sanitizeTimestamp } from '../src/modules/piano/midi/input';

describe('MIDI decoding', () => {
  it('reads note-on and note-off on any channel', () => {
    expect(decodeNote([0x90, 60, 100], 5)).toEqual({ type: 'on', note: 60, velocity: 100, time: 5 });
    expect(decodeNote([0x93, 60, 0], 5)?.type).toBe('off');
    expect(decodeNote([0x80, 60, 64], 5)?.type).toBe('off');
    expect(decodeNote([0xb0, 64, 127], 5)).toBeUndefined();
  });

  it('falls back to performance.now() for a bad timestamp', () => {
    expect(sanitizeTimestamp(995, 1000)).toEqual({ time: 995, fallback: false });
    expect(sanitizeTimestamp(0, 1000)).toEqual({ time: 1000, fallback: true });
    expect(sanitizeTimestamp(10, 50000)).toEqual({ time: 50000, fallback: true });
  });
});
