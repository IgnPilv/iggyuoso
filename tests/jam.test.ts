import { describe, expect, it } from 'vitest';
import { BACKINGS, barEvents, bassRoot, chordAt, comp, emptyTally, fitOf, jamAdvice, jamPlan, JAM_KEYS, JAM_MINOR_KEYS, position, tallyNote } from '../src/modules/piano/engine/jam';

const backing = (id: string) => BACKINGS.find((b) => b.id === id)!;

describe('jam plans', () => {
  it('names the chords of a progression in its key', () => {
    expect(jamPlan(backing('pop'), 'C').chords.map((c) => c.name)).toEqual(['C', 'G', 'Am', 'F']);
    expect(jamPlan(backing('pop'), 'Bb').chords.map((c) => c.name)).toEqual(['B♭', 'F', 'Gm', 'E♭']);
    expect(jamPlan(backing('blues'), 'G').chords.slice(3, 6).map((c) => c.name)).toEqual(['G7', 'C7', 'C7']);
    expect(jamPlan(backing('minor'), 'A').chords.map((c) => c.name)).toEqual(['Am', 'F', 'C', 'G']);
    expect(jamPlan(backing('dorian'), 'D').chords.map((c) => c.name)).toEqual(['Dm7', 'G7']);
  });

  it('builds every backing in every key it offers', () => {
    for (const b of BACKINGS) for (const k of b.minor ? JAM_MINOR_KEYS : JAM_KEYS) {
      const p = jamPlan(b, k);
      expect(p.chords).toHaveLength(b.bars.length);
      for (const c of p.chords) expect(c.name).not.toBe(c.numeral);
    }
  });

  it('keeps the bass low and the chords around middle C', () => {
    for (const c of jamPlan(backing('canon'), 'E').chords) {
      expect(bassRoot(c)).toBeGreaterThanOrEqual(40);
      expect(bassRoot(c)).toBeLessThan(52);
      for (const n of comp(c)) { expect(n).toBeGreaterThanOrEqual(53); expect(n).toBeLessThanOrEqual(65); }
      expect(new Set(comp(c).map((n) => n % 12))).toEqual(c.pcs);
    }
  });
});

describe('the band', () => {
  const p = jamPlan(backing('pop'), 'C');
  it('plays inside the bar, with the root on beat 1', () => {
    for (const g of ['ballad', 'pop', 'swing'] as const) {
      const ev = barEvents(g, p.chords[0], p.chords[1]);
      for (const e of ev) { expect(e.beat).toBeGreaterThanOrEqual(0); expect(e.beat).toBeLessThan(4); }
      expect(ev.find((e) => e.part === 'bass' && e.beat === 0)!.notes).toEqual([bassRoot(p.chords[0])]);
      expect(ev.some((e) => e.part === 'kick' && e.beat === 0)).toBe(true);
    }
  });
  it('walks the swing bass up to the next root by a half step', () => {
    const ev = barEvents('swing', p.chords[0], p.chords[1]).filter((e) => e.part === 'bass');
    expect(ev).toHaveLength(4);
    expect(Math.abs(ev[3].notes![0] - bassRoot(p.chords[1]))).toBe(1);
  });
});

describe('how notes fit', () => {
  const p = jamPlan(backing('pop'), 'C');
  it('sorts notes into chord, scale, key and outside', () => {
    const C = p.chords[0];
    expect(fitOf(p, C, 64)).toBe('chord'); // E
    expect(fitOf(p, C, 62)).toBe('scale'); // D, in the pentatonic
    expect(fitOf(p, C, 65)).toBe('key'); // F, in C major but not the pentatonic
    expect(fitOf(p, C, 66)).toBe('outside'); // F#
  });
  it('hears a note just before the bar line with the coming chord', () => {
    expect(position(5, 4)).toEqual({ bar: 1, loopBar: 1, beat: 1 });
    expect(position(17, 4).loopBar).toBe(0);
    expect(chordAt(3.4, 4)).toBe(0);
    expect(chordAt(3.6, 4)).toBe(1);
    expect(chordAt(15.7, 4)).toBe(0);
  });
  it('counts downbeats and gives advice once enough is played', () => {
    const t = emptyTally();
    for (let i = 0; i < 7; i++) tallyNote(t, 'chord', i * 4);
    expect(jamAdvice(t)).toBeUndefined();
    tallyNote(t, 'outside', 1);
    expect(t.downbeats).toBe(7);
    expect(t.downbeatChord).toBe(7);
    expect(jamAdvice(t)).toMatch(/Nearly every note/);
    for (let i = 0; i < 4; i++) tallyNote(t, 'outside', 2);
    expect(jamAdvice(t)).toMatch(/outside the key/);
  });
});
