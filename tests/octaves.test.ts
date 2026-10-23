import { describe, expect, it } from 'vitest';
import { calibrate, keyName, keyWindow, toDevice, type Calibration } from '../src/calibration';
import type { Exercise } from '../src/content/types';
import { noteFor } from '../src/midi/computerKeys';
import { diatonicStep, isTieEnd, midiName, parsePitch, pitchToMidi } from '../src/music/notes';
import { chordNotes, scaleNotes } from '../src/music/theory';
import { realContent } from './helpers';

// One octave convention everywhere: middle C = C4 = written MIDI 60. Content, labels, the staff,
// sounds and the emulator all use written numbers; only calibration turns them into the player's
// device keys (always by whole octaves).

const cal = (low: number, high: number): Calibration => {
  const r = calibrate(low, high);
  if (!r.ok) throw new Error(r.error);
  return r.calibration;
};
const BOARDS: Record<string, Calibration> = {
  '88 keys': cal(21, 108),
  '88 keys sending an octave high': cal(33, 120),
  '88 keys sending an octave low': cal(9, 96),
  '76 keys': cal(28, 103),
  '61 keys': cal(36, 96),
  '49 keys': cal(36, 84),
};

describe('middle C = C4 = MIDI 60', () => {
  it('names, parses and places C4 as middle C', () => {
    expect(pitchToMidi(parsePitch('C4'))).toBe(60);
    expect(midiName(60)).toBe('C4');
    expect(midiName(59)).toBe('B3');
    expect(midiName(72)).toBe('C5');
    // Treble bottom line is E4, so C4 is two steps below it (the ledger line); bass top line is A3.
    expect(diatonicStep(parsePitch('E4')) - diatonicStep(parsePitch('C4'))).toBe(2);
    expect(diatonicStep(parsePitch('C4')) - diatonicStep(parsePitch('A3'))).toBe(2);
  });

  it('builds chords and scales from octave 4 = the middle C octave', () => {
    expect(chordNotes('C')).toEqual([60, 64, 67]);
    expect(scaleNotes('C major')[0]).toBe(60);
  });

  for (const [name, c] of Object.entries(BOARDS)) {
    it(`calls the middle key C4 on ${name}`, () => {
      expect(keyName(c, c.middleC)).toBe('C4');
      expect(toDevice(c, 60)).toBe(c.middleC);
      expect(Math.abs(c.offset % 12)).toBe(0);
      // The computer-keyboard emulator's A is middle C.
      expect(noteFor('KeyA', c.middleC, 0)).toBe(c.middleC);
    });
  }
});

describe('keyWindow', () => {
  it('always shows middle C with room for its label', () => {
    for (const c of Object.values(BOARDS)) {
      for (let a = c.low; a <= c.high; a += 5) {
        for (const span of [0, 4, 7, 12, 19]) {
          const keys = [a, Math.min(c.high, a + span)];
          const [lo, hi] = keyWindow(c, keys);
          expect(lo).toBeGreaterThanOrEqual(c.low);
          expect(hi).toBeLessThanOrEqual(c.high);
          for (const k of keys) expect(k >= lo && k <= hi).toBe(true);
          expect(c.middleC - lo).toBeGreaterThanOrEqual(Math.min(5, c.middleC - c.low));
          expect(hi - c.middleC).toBeGreaterThanOrEqual(Math.min(5, c.high - c.middleC));
        }
      }
    }
  });

  it('does not start on middle C for tunes above it (G position)', () => {
    const c = BOARDS['88 keys'];
    const [lo, hi] = keyWindow(c, [67, 74]);
    expect(lo).toBeLessThan(60);
    expect(hi).toBeGreaterThanOrEqual(74);
  });
});

/** Written notes per hand in an exercise that names its notes. */
function parts(ex: Exercise): { right: number[]; left: number[]; all: number[] } {
  const right: number[] = [];
  const left: number[] = [];
  const all: number[] = [];
  if (ex.kind === 'timed' && !ex.tap) {
    for (const [hand, toks] of [['right', ex.right], ['left', ex.left]] as const) {
      toks?.forEach((t, i) => { if (!isTieEnd(toks, i)) (hand === 'right' ? right : left).push(...t.pitches.map(pitchToMidi)); });
    }
  } else if (ex.kind === 'sequence') {
    (ex.hand === 'left' ? left : right).push(...ex.notes.map(pitchToMidi));
  } else if (ex.kind === 'build') {
    all.push(...ex.tasks.flatMap((t) => t.notes));
  }
  return { right, left, all: [...all, ...right, ...left] };
}

describe('content octaves', () => {
  const { content } = realContent();
  const exercises = [...content.exercises.values()];
  const lessonText = new Map<string, string>();
  for (const l of content.lessons.values()) {
    for (const s of l.steps) if ('exercise' in s) lessonText.set(s.exercise, l.title);
  }

  it('keeps each hand on its side of the keyboard', () => {
    const bad: string[] = [];
    for (const ex of exercises) {
      const { right, left } = parts(ex);
      // Middle C is C4 (60): a right hand below C3 or a left hand above C5 is an octave slip.
      if (right.length && Math.min(...right) < 48) bad.push(`${ex.id}: right hand goes down to ${midiName(Math.min(...right))}`);
      if (left.length && Math.max(...left) > 72) bad.push(`${ex.id}: left hand goes up to ${midiName(Math.max(...left))}`);
    }
    expect(bad).toEqual([]);
  });

  it('plays middle C (C4) wherever an exercise or its lesson is about middle C', () => {
    const bad: string[] = [];
    for (const ex of exercises) {
      const text = [ex.id, ex.title, ex.prompt, lessonText.get(ex.id)].join(' ').toLowerCase();
      if (!/middle[ -]c\b/.test(text)) continue;
      const { all } = parts(ex);
      if (all.length && !all.includes(60)) bad.push(`${ex.id}: about middle C but never plays C4`);
    }
    expect(bad).toEqual([]);
  });
});
