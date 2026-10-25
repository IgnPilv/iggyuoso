import { describe, expect, it } from 'vitest';
import { EAR_KEYS, EAR_TUNES, EarHunt, earNotes, moveSize, movePitch, nextTune, tuneTokens } from '../src/modules/piano/engine/byEar';
import { midiName, parsePitch, pitchToMidi } from '../src/modules/piano/music/notes';

const hunt = (id: string, key = 'C') => new EarHunt(earNotes(tuneTokens(EAR_TUNES.find((t) => t.id === id)!, key)!));

describe('Play by ear tunes', () => {
  it('every tune parses, moves to every key, and stays in a comfortable range', () => {
    for (const t of EAR_TUNES) for (const key of Object.keys(EAR_KEYS)) {
      const tokens = tuneTokens(t, key);
      expect(tokens, `${t.id} in ${key}`).toBeDefined();
      const notes = earNotes(tokens!);
      expect(notes.length).toBeGreaterThanOrEqual(8);
      for (const n of notes) expect(n.midi, `${t.id} in ${key}: ${midiName(n.midi)}`).toBeGreaterThanOrEqual(50);
      for (const n of notes) expect(n.midi, `${t.id} in ${key}: ${midiName(n.midi)}`).toBeLessThanOrEqual(84);
    }
    expect(new Set(EAR_TUNES.map((t) => t.id)).size).toBe(EAR_TUNES.length);
  });

  it('moves notes letter by letter, spelled right', () => {
    const name = (s: string, key: string) => { const p = movePitch(parsePitch(s), EAR_KEYS[key].letters, EAR_KEYS[key].semis)!; return `${p.letter}${['b', '', '#'][p.accidental + 1]}${p.octave}`; };
    expect(name('E4', 'D')).toBe('F#4');
    expect(name('B3', 'F')).toBe('E4');
    expect(name('F4', 'Bb')).toBe('Eb4');
    expect(name('C4', 'G')).toBe('G3');
    expect(name('G#4', 'A')).toBe('E#4');
    expect(movePitch(parsePitch('F#4'), 0, 1)).toBeUndefined();
    // Every key keeps the tune's shape.
    const ode = earNotes(tuneTokens(EAR_TUNES[2], 'C')!).map((n) => n.midi);
    const odeA = earNotes(tuneTokens(EAR_TUNES[2], 'A')!).map((n) => n.midi);
    expect(odeA.map((m, i) => m - ode[i])).toEqual(ode.map(() => -3));
    expect(pitchToMidi(parsePitch('A3'))).toBe(57);
  });

  it('places notes in time, rests leaving gaps', () => {
    const elise = earNotes(tuneTokens(EAR_TUNES.find((t) => t.id === 'fur-elise')!)!);
    const a = elise.findIndex((n) => n.midi === 57 + 12);
    expect(elise[a + 1].at - elise[a].at).toBeCloseTo(0.75);
  });

  it('sizes melodic moves', () => {
    expect([moveSize(60, 60), moveSize(60, 62), moveSize(60, 64), moveSize(60, 67), moveSize(67, 60)]).toEqual(['same', 'step', 'skip', 'leap', 'leap']);
  });
});

describe('EarHunt', () => {
  it('gives the first note and finds the rest in order', () => {
    const h = hunt('ode-to-joy');
    expect(h.index).toBe(1);
    expect(h.press(64)).toEqual({ kind: 'right', index: 1, done: false });
    expect(h.press(65).kind).toBe('right');
  });

  it('a wrong key says higher or lower, then how far from the last note', () => {
    const h = hunt('ode-to-joy');
    h.press(64); // E E
    expect(h.press(62)).toEqual({ kind: 'wrong', higher: true, tries: 1 }); // F is higher than D
    expect(h.press(69)).toEqual({ kind: 'wrong', higher: false, tries: 2, size: 'step', from: 64 });
    expect(h.press(65).kind).toBe('right');
    expect(h.tries[2]).toBe(2);
  });

  it('replaying from the start or the last note found is not a guess', () => {
    const h = hunt('hot-cross-buns'); // E D C E D C
    h.press(62);
    expect(h.index).toBe(2);
    for (const m of [64, 62]) expect(h.press(m).kind).toBe('replay');
    expect(h.press(62).kind).toBe('replay'); // the last note found
    expect(h.press(60).kind).toBe('right');
    // Halfway through a replay, the target still counts when it comes.
    expect(h.press(64).kind).toBe('right');
    expect(h.tries.every((t) => t === 0)).toBe(true);
  });

  it('the right note in another octave is pointed out, not counted', () => {
    const h = hunt('ode-to-joy');
    h.press(64);
    expect(h.press(77)).toEqual({ kind: 'octave', higher: false });
    expect(h.tries[2]).toBe(0);
  });

  it('scores first tries fully, later ones less and shown notes not at all', () => {
    const h = hunt('hot-cross-buns'); // E D C E D C ...
    const n = h.notes.length - 1;
    while (!h.done) {
      if (h.index === 2) h.press(65); // one wrong try on C
      if (h.index === 3) { h.show(); continue; }
      h.press(h.target!.midi);
    }
    expect(h.summary()).toEqual({ first: n - 2, later: 1, shown: 1, wrong: 1 });
    expect(h.score()).toBe(Math.round(((n - 2 + 0.6) / n) * 100));
  });

  it('picks a tune not played lately', () => {
    const easy = EAR_TUNES.filter((t) => t.level === 'easy').map((t) => t.id);
    const recent = easy.slice(1);
    for (let i = 0; i < 5; i++) expect(nextTune('easy', recent, () => i / 5).id).toBe(easy[0]);
    expect(nextTune('easy', easy, () => 0.99).id).not.toBe(easy[easy.length - 1]);
  });
});
