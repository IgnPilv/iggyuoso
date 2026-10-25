import { describe, expect, it } from 'vitest';
import { chordName, chordSymbols, chordWords } from '../src/modules/piano/music/chordNames';
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

describe('chordWords', () => {
  it('says triads in words and leaves the rest as written', () => {
    expect(['C', 'F♯m', 'B♭', 'G7', 'Bdim'].map(chordWords)).toEqual(['C major', 'F♯ minor', 'B♭ major', 'G7', 'Bdim']);
  });
});
