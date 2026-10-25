import { describe, expect, it } from 'vitest';
import { allReadings, findChord, inversions, keysOf, neighbours, parseChordName, pitchName, specKeys, specName, suggestChords } from '../src/modules/piano/music/chordFinder';

const chord = (keys: number[]) => {
  const f = findChord(keys);
  if (f.kind !== 'chord') throw new Error(`not a chord: ${f.kind}`);
  return f;
};

describe('chord finder', () => {
  it('names triads in any inversion, by their root', () => {
    expect(chord([60, 64, 67]).words).toBe('C major');
    expect(chord([64, 67, 72]).name).toBe('C');
    expect(chord([64, 67, 72]).position).toMatch(/^First inversion/);
    expect(chord([55, 60, 64]).position).toMatch(/^Second inversion/);
    expect(chord([57, 60, 64]).words).toBe('A minor');
    expect(chord([59, 62, 65]).name).toBe('Bdim');
  });

  it('spells the notes from the root', () => {
    expect(chord([60, 64, 67, 70]).spelling).toEqual(['C', 'E', 'G', 'B♭']);
    expect(chord([67, 71, 74, 77]).name).toBe('G7');
    expect(chord([61, 64, 68]).name).toBe('C♯m');
    expect(chord([61, 65, 68]).name).toBe('D♭');
    expect(chord([61, 65, 68]).tones.map((t) => pitchName(t.pitch))).toEqual(['D♭', 'F', 'A♭']);
    expect(chord([66, 70, 73]).spelling).toEqual(['F♯', 'A♯', 'C♯']);
    // F♯ augmented would need C double sharp: it is spelled G♭ augmented.
    expect(chord([66, 70, 74]).spelling).toEqual(['G♭', 'B♭', 'D']);
  });

  it('lets the bass decide between two readings', () => {
    expect(chord([60, 64, 67, 69]).name).toBe('C6');
    expect(chord([57, 60, 64, 67]).name).toBe('Am7');
  });

  it('counts doubled notes and keys an octave apart once', () => {
    const f = chord([48, 60, 64, 67, 72]);
    expect(f.name).toBe('C');
    expect(f.tones).toHaveLength(5);
  });

  it('says what one note or two notes are', () => {
    expect(findChord([])).toEqual({ kind: 'none' });
    expect(findChord([60]).kind).toBe('note');
    const i = findChord([60, 64]);
    expect(i.kind === 'interval' && i.name).toBe('major third');
    const c = findChord([60, 76]);
    expect(c.kind === 'interval' && c.name).toBe('an octave and a major third');
    const b = findChord([61, 65]);
    expect(b.kind === 'interval' && `${pitchName(b.low)} ${pitchName(b.high)}`).toBe('D♭ F');
    expect(findChord([60, 62, 64]).kind).toBe('unknown');
  });

  it('offers the other positions and nearby chords', () => {
    const f = chord([60, 64, 67]);
    expect(inversions(f).map((i) => i.keys)).toEqual([[60, 64, 67], [64, 67, 72], [55, 60, 64]]);
    for (const inv of inversions(f)) expect(chord(inv.keys).name).toBe('C');
    const n = neighbours(f);
    expect(n.map((x) => chord(x.keys).name)).toEqual(['Cm', 'C7', 'Cmaj7', 'Csus4']);
    expect(neighbours(chord([57, 60, 64])).map((x) => chord(x.keys).name)).toEqual(['A', 'Am7', 'Adim']);
  });
});

describe('chord constructor', () => {
  const name = (t: string) => { const s = parseChordName(t); return s && specName(s); };
  it('reads chord names typed any way', () => {
    expect(name('c')).toBe('C');
    expect(name('c#m7')).toBe('C♯m7');
    expect(name('Bb maj7')).toBe('B♭maj7');
    expect(name('bb')).toBe('B♭');
    expect(name('b')).toBe('B');
    expect(name('bm')).toBe('Bm');
    expect(name('bbmaj7')).toBe('B♭maj7');
    expect(name('abdim')).toBe('A♭dim');
    expect(name('f sharp minor')).toBe('F♯m');
    expect(name('Ebsus4')).toBe('E♭sus4');
    expect(name('e flat major seventh')).toBe('E♭maj7');
    expect(name('G dominant seventh')).toBe('G7');
    expect(name('A half diminished')).toBe('Am7♭5');
    expect(name('CM7')).toBe('Cmaj7');
    expect(name('Cm7')).toBe('Cm7');
    expect(name('d dim')).toBe('Ddim');
    expect(name('fis')).toBe('F♯');
    expect(name('xyz')).toBeUndefined();
    expect(name('c mi')).toBe('Cm');
  });
  it('suggests what a half-typed name could become', () => {
    expect(suggestChords('g su').map(specName)).toEqual(['Gsus2', 'Gsus4']);
    expect(suggestChords('a').map(specName)[0]).toBe('A');
    expect(suggestChords('')).toEqual([]);
  });
  it('builds the keys from middle C up', () => {
    expect(specKeys(parseChordName('c')!)).toEqual([60, 64, 67]);
    expect(specKeys(parseChordName('bb7')!)).toEqual([70, 74, 77, 80]);
    expect(findChord(specKeys(parseChordName('c#m')!)).kind).toBe('chord');
  });
});

describe('other names', () => {
  it('lists other spellings and readings, main first', () => {
    const r = allReadings([56, 60, 63]).map((f) => f.name);
    expect(r[0]).toBe('A♭');
    expect(r).toContain('G♯');
    expect(allReadings([60, 64, 67, 69]).map((f) => f.name).slice(0, 2)).toContain('C6');
    expect(allReadings([60, 64, 67, 69]).map((f) => f.name)).toContain('Am7');
    expect(allReadings([59, 62, 65, 68]).map((f) => f.name).filter((n) => n.endsWith('dim7')).length).toBeGreaterThanOrEqual(4);
  });
  it('names the keys a chord belongs to', () => {
    const c = allReadings([60, 64, 67])[0];
    expect(keysOf(c)).toEqual(expect.arrayContaining(['C major (I)', 'G major (IV)', 'F major (V)', 'F minor (V)']));
    const g7 = allReadings([67, 71, 74, 77])[0];
    expect(keysOf(g7)).toEqual(['C major (V7)', 'C minor (V7)']);
    expect(keysOf(allReadings([56, 60, 63])[0])[0]).toBe('A♭ major (I)');
  });
});

describe('half-typed sharps', () => {
  it('reads a sharp spelled out part way', () => {
    expect(suggestChords('g sh').map(specName)[0]).toBe('G♯');
    expect(specName(parseChordName('g sharp')!)).toBe('G♯');
    expect(specName(parseChordName('csus2')!)).toBe('Csus2');
    expect(specName(parseChordName('cs')!)).toBe('C♯');
  });
});
