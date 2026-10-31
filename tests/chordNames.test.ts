import { describe, expect, it } from 'vitest';
import { brokenChord, chordName, chordSymbols, chordWords } from '../src/modules/piano/music/chordNames';
import { pickupOffset } from '../src/modules/piano/music/timeline';
import type { TimedExercise } from '../src/modules/piano/content/types';
import { realContent } from './helpers';
import { parsePitchList, parseTimedNotes } from '../src/modules/piano/music/notes';

const name = (notes: string) => chordName(parsePitchList(notes));
const line = (text: string) => ({ notes: parseTimedNotes(text) });

describe('chordName', () => {
  it('names triads and sevenths in any inversion', () => {
    expect(name('C4 E4 G4')).toBe('C');
    expect(name('E3 G3 C4')).toBe('C');
    expect(name('A3 C4 E4')).toBe('Am');
    expect(name('G3 B3 D4 F4')).toBe('G7');
    expect(name('B3 F4 G4')).toBe('G7'); // no fifth
    expect(name('D4 F4 A4 C5')).toBe('Dm7');
    expect(name('F4 A4 C5 E5')).toBe('Fmaj7');
    expect(name('B3 D4 F4')).toBe('Bdim');
    expect(name('C4 F4 G4')).toBe('Csus4');
  });

  it('keeps the written spelling and lets the bass pick between two readings', () => {
    expect(name('F#3 A3 C#4')).toBe('F♯m');
    expect(name('Bb3 D4 F4')).toBe('B♭');
    expect(name('C4 E4 G4 A4')).toBe('C6');
    expect(name('A3 C4 E4 G4')).toBe('Am7');
  });

  it('leaves out what is not a chord', () => {
    expect(name('C4 G4')).toBeUndefined();
    expect(name('C4 C5 G4')).toBeUndefined();
    expect(name('C4 D4 E4')).toBeUndefined();
  });
});

describe('chordSymbols', () => {
  it('names block chords where they change', () => {
    const s = chordSymbols([line('C4+E4+G4:q C4+E4+G4:q C4+F4+A4:q B3+D4+G4:q')]);
    expect(s).toEqual([{ at: 0, name: 'C' }, { at: 2, name: 'F' }, { at: 3, name: 'G' }]);
  });

  it('reads a chord across both hands, with a held bass under it', () => {
    const s = chordSymbols([line('r:q E4+G4:q E4+G4:q r:q | A4:q A4+C5:q A4+C5:q r:q'), line('C3:h. r:q | F3:w')]);
    expect(s.map((c) => c.name)).toEqual(['C', 'F']);
    expect(s[0].at).toBe(1);
  });

  it('is not put off by a melody note off the chord', () => {
    const s = chordSymbols([line('D5:q E5:q'), line('C3+E3+G3:h')]);
    expect(s).toEqual([{ at: 0, name: 'C' }]);
  });

  it('keeps the chord under a melody note added over it, and under its own notes broken up', () => {
    expect(chordSymbols([line('A4:e G#4:e A4:q'), line('A3+C#4+E4:h')]).map((c) => c.name)).toEqual(['A']);
    expect(chordSymbols([line('E4+Bb4:w'), line('C3:q G3:q A3:q G3:q')]).map((c) => c.name)).toEqual(['C7']);
  });

  it('puts a lone bass with the chord after it', () => {
    expect(chordSymbols([line('C#3:q. E#3+G#3+B3:q. | F#2:q. A2+C#3+F#3:q.')]).map((c) => c.name)).toEqual(['C♯7', 'F♯m']);
  });

  it('names nothing in a single line of melody', () => {
    expect(chordSymbols([line('C4:q E4:q G4:q C5:q')])).toEqual([]);
  });
});

describe('broken chords, read by the bar', () => {
  const names = (parts: { notes: ReturnType<typeof parseTimedNotes> }[], barQuarters = 4, pulse = 1, left = false) =>
    chordSymbols(parts, { barQuarters, pulse, left }).map((c) => `${c.at}=${c.name}`);

  it('names a rolling left hand under a tune, at each bar', () => {
    const tune = line('A4:q. F#4:q. | E4:q. A4:q. | B4:h. | G4:q. B4:q.');
    const arps = line('D2:e A2:e F#3:e A2:e D3:e A2:e | A2:e E3:e G3:e E3:e C#3:e E3:e | B2:e F#3:e D3:e F#3:e B3:e F#3:e | G2:e D3:e B3:e D3:e G3:e D3:e');
    expect(names([tune, arps], 3, 1.5)).toEqual(['0=D', '3=A7', '6=Bm', '9=G']);
    expect(chordSymbols([tune, arps])).toEqual([]); // beat by beat, no chord is ever struck
  });

  it('reads oom-pah (bass, then chord) from the bass note, with a change mid-bar', () => {
    expect(names([line('E4:h G4:h | C5:w'), line('C3:q E3+G3:q G2:q B2+D3+F3:q | C3:q E3+G3:q C3:q E3+G3:q')])).toEqual(['0=C', '2=G7', '4=C']);
  });

  it('reads an Alberti bass and a left hand alone when told it is a left hand', () => {
    expect(names([line('C3:e G3:e E3:e G3:e C3:e G3:e E3:e G3:e | B2:e G3:e D3:e G3:e B2:e G3:e F3:e G3:e')], 4, 1, true)).toEqual(['0=C', '4=G7']);
  });

  it('leaves melodies, stepping basses and root-and-fifth bars alone', () => {
    // A lone right hand is a melody, even one that outlines a chord.
    expect(names([line('C4:q E4:q G4:q E4:q | D4:q F4:q A4:q F4:q')])).toEqual([]);
    // A bass walking by step is not a chord.
    expect(names([line('E5:w | E5:w'), line('C3:q D3:q E3:q F3:q | G3:q A3:q B3:q C4:q')])).toEqual([]);
    // B and F♯, then G and D: B minor going to G, not Gmaj7.
    expect(names([line('F#5:w'), line('B2:q F#3:q G2:q D3:q')])).toEqual([]);
  });

  it('lets a half bar that is a chord win over a whole bar with a lead-in', () => {
    // A, C♯ E, then E G♯ leading on: A, not Amaj7.
    expect(names([line('C#5:w'), line('A2:q C#3+E3:q E3:q G#3:q')])).toEqual(['0=A']);
  });

  it('keeps block chords as they were', () => {
    const parts = [line('E5:q D5:q C5:q D5:q | E5:w'), line('C3+E3+G3:q C3+E3+G3:q B2+D3+G3:q B2+D3+G3:q | C3+E3+G3:w')];
    expect(chordSymbols(parts, { barQuarters: 4 })).toEqual(chordSymbols(parts));
  });

  it("names every bar of Can't Help Falling in Love's rolling left hand", () => {
    const { content } = realContent();
    const read = (id: string) => {
      const ex = content.exercises.get(id) as TimedExercise;
      const parts = [ex.right, ex.left].filter((n) => !!n).map((notes) => ({ notes: notes! }));
      return chordSymbols(parts, { barQuarters: ex.meter.quarters, offset: pickupOffset(ex), pulse: ex.meter.pulse, left: !ex.right }).map((c) => c.name);
    };
    expect(read('song-chfl-arp-lh')).toEqual(['D', 'F♯m', 'Bm', 'G', 'D', 'A', 'G', 'A', 'Bm', 'G', 'D', 'A', 'D']);
    // The full arrangement rolls from the second verse on and names its chords like the bass-and-chord version.
    expect(read('song-chfl-full')).toEqual(read('song-chfl-medium'));
    expect(read('song-chfl-full')).toContain('C♯7');
  });
});

describe('brokenChord (live)', () => {
  const at = (midis: number[], gap = 300, start = 0) => midis.map((midi, i) => ({ midi, at: start + i * gap }));

  it('names a chord once three of its notes have been heard', () => {
    expect(brokenChord(at([50, 57]), 400)).toBeUndefined();
    expect(brokenChord(at([50, 57, 66]), 700)).toEqual([50, 57, 66]);
  });

  it('follows the newest chord and forgets after a pause', () => {
    // D A F♯ A, then A E G E C♯: A7.
    const heard = at([50, 57, 66, 57, 57, 64, 67, 64, 61]);
    expect([...new Set(brokenChord(heard, 2500)?.map((m) => m % 12))].sort((a, b) => a - b)).toEqual([1, 4, 7, 9]);
    expect(brokenChord(at([50, 57, 66]), 4000)).toBeUndefined();
  });
});

describe('chordWords', () => {
  it('says triads in words and leaves the rest as written', () => {
    expect(['C', 'F♯m', 'B♭', 'G7', 'Bdim'].map(chordWords)).toEqual(['C major', 'F♯ minor', 'B♭ major', 'G7', 'Bdim']);
  });
});
