import { describe, expect, it } from 'vitest';
import { barLengths, midiName, parseMeter, parsePitch, parseTimedNotes, pitchToMidi } from '../src/music/notes';

describe('notes', () => {
  it('maps written pitches with C4 = 60', () => {
    expect(pitchToMidi(parsePitch('C4'))).toBe(60);
    expect(pitchToMidi(parsePitch('A0'))).toBe(21);
    expect(pitchToMidi(parsePitch('F#3'))).toBe(54);
    expect(pitchToMidi(parsePitch('Bb2'))).toBe(46);
    expect(midiName(108)).toBe('C8');
  });

  it('parses bars, rests, chords and dotted notes', () => {
    const t = parseTimedNotes('C4:q r:q C4+E4:h | D4:h. E4:q');
    expect(t.map((x) => x.beats)).toEqual([1, 1, 2, 3, 1]);
    expect(t[1].pitches).toEqual([]);
    expect(t[2].pitches).toHaveLength(2);
    expect(barLengths(t)).toEqual([4, 4]);
  });

  it('rejects malformed notes', () => {
    expect(() => parseTimedNotes('C4')).toThrow();
    expect(() => parseTimedNotes('H4:q')).toThrow();
    expect(() => parseTimedNotes('C4:x')).toThrow();
  });

  it('reads meters in quarter beats', () => {
    expect(parseMeter('3/4').quarters).toBe(3);
    expect(parseMeter('6/8').quarters).toBe(3);
  });
});
