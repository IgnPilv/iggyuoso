import { describe, expect, it } from 'vitest';
import { accompaniment, Duet, DUET_TUNES, duetSetup, voice } from '../src/modules/piano/engine/duet';

const ode = DUET_TUNES.find((t) => t.tune.id === 'ode-to-joy')!;

/** Plays every melody note of a setup, the gap before note i being `gap(i, beats)` ms. */
function playAll(d: Duet, gap: (i: number, beats: number) => number, start = 1000) {
  let t = start;
  d.notes.forEach((n, i) => {
    if (i > 0) t += gap(i, n.at - d.notes[i - 1].at);
    d.press(n.midi, t);
  });
  return t;
}

describe('the tunes', () => {
  it('have a chord for every bar of 4 beats', () => {
    expect(DUET_TUNES.length).toBeGreaterThanOrEqual(10);
    for (const t of DUET_TUNES) {
      const s = duetSetup(t, 'held');
      const last = s.notes[s.notes.length - 1];
      expect(last.at + last.beats, t.tune.id).toBe(s.beats);
      // Every chord the band plays under a melody note on beat 1 holds that note's letter or is a common harmony.
      expect(s.events.length).toBeGreaterThan(0);
    }
  });

  it('voices chords under middle C, root low', () => {
    expect(voice('C')).toEqual({ bass: 36, triad: [48, 52, 55] });
    expect(voice('G')).toEqual({ bass: 43, triad: [50, 55, 59] });
    expect(voice('Am').triad).toEqual([48, 52, 57]);
    expect(voice('G7').triad).toHaveLength(4);
  });

  it('plays each style on its beats', () => {
    const held = accompaniment(ode, 'held');
    expect(held.map((e) => e.beat)).toEqual([0, 4, 8, 12, 14]);
    const oom = accompaniment(ode, 'oompah');
    expect(oom).toHaveLength(16);
    expect(oom[0].midi).toEqual([36]);
    expect(oom[1].midi).toEqual([48, 52, 55]);
    const roll = accompaniment(ode, 'rolling');
    expect(roll).toHaveLength(32);
    expect(roll.slice(0, 4).map((e) => e.midi[0])).toEqual([36, 55, 52, 55]);
  });
});

describe('following the player', () => {
  it('waits for the first note, then plays the chord with it', () => {
    const d = new Duet(duetSetup(ode, 'held'), 100);
    expect(d.due(1e9)).toEqual([]);
    expect(d.press(50, 500).kind).toBe('ignored');
    d.press(64, 1000);
    const now = d.due(1000);
    expect(now).toHaveLength(1);
    expect(now[0].time).toBe(1000);
  });

  it('never plays past the next melody note', () => {
    const d = new Duet(duetSetup(ode, 'oompah'), 60);
    d.press(64, 1000);
    // Only beat 0 (the note just played) is before the next note on beat 1.
    expect(d.due(1e9)).toHaveLength(1);
    d.press(64, 2000);
    expect(d.due(1e9).map((s) => s.event.beat)).toEqual([1]);
  });

  it('learns the player\'s tempo, but not from a long wait', () => {
    const d = new Duet(duetSetup(ode, 'held'), 120);
    playAll(d, (_i, beats) => beats * 750);
    expect(d.bpm).toBeGreaterThan(75);
    expect(d.bpm).toBeLessThan(85);
    const w = new Duet(duetSetup(ode, 'held'), 80);
    playAll(w, (i, beats) => beats * 750 + (i === 5 ? 3000 : 0));
    expect(w.bpm).toBe(80);
    expect(w.waited.has(5)).toBe(true);
  });

  it('counts wrong keys and the right note an octave away', () => {
    const d = new Duet(duetSetup(ode, 'held'), 80);
    d.press(64, 1000);
    expect(d.press(65, 1500).kind).toBe('wrong');
    expect(d.press(76, 1700).kind).toBe('right');
    expect(d.wrong[1]).toBe(1);
  });

  it('drops band notes the player has run past', () => {
    const d = new Duet(duetSetup(ode, 'rolling'), 60);
    d.press(64, 1000);
    d.due(1000);
    // The next note comes after a quarter of a beat: the eighth in between is never played.
    d.press(64, 1250);
    expect(d.due(1250).map((s) => s.event.beat)).toEqual([1]);
  });
});

describe('the report', () => {
  it('is clean for an even take', () => {
    const d = new Duet(duetSetup(ode, 'held'), 90);
    playAll(d, (_i, beats) => beats * 667);
    const r = d.report()!;
    expect(r.score).toBe(100);
    expect(r.tempo.change).toBe('steady');
    expect(r.held).toHaveLength(0);
    expect(r.hurried).toHaveLength(0);
  });

  it('marks a wait, a held-back note and a cut-short long note', () => {
    const d = new Duet(duetSetup(ode, 'held'), 90);
    // Note 4 (bar 2) after a long wait, note 8 a little late, and the D after the last half note early.
    playAll(d, (i, beats) => beats * 600 + (i === 4 ? 2500 : i === 8 ? 250 : 0));
    const r = d.report()!;
    expect(r.waits.map((n) => n.index)).toEqual([4]);
    expect(r.held.map((n) => n.index)).toContain(8);
    expect(r.tips[0]).toMatch(/waited for you once \(bar 2\)/);
    expect(r.score).toBeLessThan(92);
  });

  it('notices the tempo creeping up', () => {
    const d = new Duet(duetSetup(ode, 'held'), 90);
    playAll(d, (i, beats) => beats * (700 - i * 14));
    const r = d.report()!;
    expect(r.tempo.change).toBe('faster');
    expect(r.tempo.end).toBeGreaterThan(r.tempo.start);
  });
});
