import { describe, expect, it } from 'vitest';
import { findChord, inversions, neighbours, pitchName } from '../src/modules/piano/music/chordFinder';

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
