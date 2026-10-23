import { describe, expect, it } from 'vitest';
import { parseExercise } from '../src/content/load';
import { parseMeter, parseTimedNotes } from '../src/music/notes';
import { spell, splitLength, transcribe, type CapturedNote } from '../src/music/transcribe';

const Q = 500; // 120 bpm
const meter = parseMeter('4/4');
const n = (midi: number, beat: number, beats: number, jitter = 0): CapturedNote => ({ midi, on: beat * Q + jitter, off: (beat + beats) * Q - 20 });

describe('spelling', () => {
  it('uses the key', () => {
    expect(spell(66, 'G')).toBe('F#4');
    expect(spell(70, 'F')).toBe('Bb4');
    expect(spell(65, 'G')).toBe('F4');
    expect(spell(61, 'C')).toBe('C#4');
    expect(spell(61, 'Bb')).toBe('Db4');
    expect(spell(71, 'Gb')).toBe('Cb5');
    expect(spell(63, 'Cm')).toBe('Eb4');
  });
});

describe('note lengths', () => {
  it('splits a length into written values', () => {
    expect(splitLength(3)).toEqual(['h.']);
    expect(splitLength(2.5)).toEqual(['h', 'e']);
    expect(splitLength(0.25)).toEqual(['s']);
  });
});

describe('transcribe', () => {
  it('writes a played tune on the grid, with small timing slips ironed out', () => {
    const t = transcribe([n(60, 0, 1, 30), n(62, 1, 1, -40), n(64, 2, 2, 10), n(67, 4, 4)], { beatMs: Q, meter });
    expect(t.right).toBe('C4:q D4:q E4:h | G4:w');
    expect(t.left).toBeUndefined();
    expect(t.bars).toBe(2);
  });

  it('puts low notes in the left hand, chords together, rests in the gaps', () => {
    const t = transcribe([n(48, 0, 4), n(52, 0, 4, 15), n(55, 0, 4, 25), n(72, 1, 1), n(76, 3, 1)], { beatMs: Q, meter });
    expect(t.left).toBe('C3+E3+G3:w');
    expect(t.right).toBe('r:q C5:q r:q E5:q');
  });

  it('ties a note over the bar line', () => {
    const t = transcribe([n(60, 3, 2)], { beatMs: Q, meter, trimStart: false });
    expect(t.right).toBe('r:h. C4:q~ | C4:q r:h.');
  });

  it('drops empty bars before the first note and keeps a note no longer than the next one', () => {
    const t = transcribe([n(60, 8, 3), n(62, 9, 1)], { beatMs: Q, meter });
    expect(t.skippedBars).toBe(2);
    expect(t.right).toBe('C4:q D4:q r:h');
  });

  it('reads eighths and spells in the key', () => {
    const t = transcribe([n(67, 0, 0.5), n(66, 0.5, 0.5), n(64, 1, 1), n(62, 2, 2)], { beatMs: Q, meter, key: 'G' });
    expect(t.right).toBe('G4:e F#4:e E4:q D4:h');
  });

  it('writes 3/4 and always fills whole bars, so the loader accepts it', () => {
    const m = parseMeter('3/4');
    const t = transcribe([n(60, 0, 1), n(64, 1, 1), n(67, 2, 1.5), n(72, 4, 0.5)], { beatMs: Q, meter: m });
    expect(t.right).toBe('C4:q E4:q G4:q~ | G4:e r:e C5:e r:q.');
    const ex = parseExercise({ id: 'x', kind: 'timed', tempo: 120, meter: '3/4', right: t.right });
    expect(ex.kind).toBe('timed');
    expect(parseTimedNotes(t.right!).length).toBeGreaterThan(0);
  });

  it('treats a slightly early lift as legato', () => {
    const t = transcribe([{ midi: 48, on: 0, off: 3.6 * Q }, { midi: 53, on: 4 * Q, off: 7.6 * Q }], { beatMs: Q, meter });
    expect(t.left).toBe('C3:w | F3:w');
  });

  it('returns nothing for an empty take', () => {
    expect(transcribe([], { beatMs: Q, meter })).toEqual({ bars: 0, skippedBars: 0 });
  });
});
