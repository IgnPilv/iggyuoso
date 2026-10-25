import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/modules/piano/content/load';
import type { TimedExercise } from '../src/modules/piano/content/types';
import { chordFingers, suggestFingers } from '../src/modules/piano/music/fingering';
import { parseTimedNotes } from '../src/modules/piano/music/notes';
import { expectedNotes } from '../src/modules/piano/music/timeline';
import { realContent } from './helpers';

const line = (notes: string, hand: 'right' | 'left' = 'right') => suggestFingers(parseTimedNotes(notes), hand);

describe('suggested fingering', () => {
  it('keeps a tune that fits under the hand in one five-finger position', () => {
    expect(line('E4:q D4:q C4:q D4:q | E4:q E4:q E4:h')).toEqual([3, 2, 1, 2, 3, 3, 3]);
    expect(line('C4:q D4:q E4:q F4:q | G4:w')).toEqual([1, 2, 3, 4, 5]);
    // The left hand's fifth finger on the lowest key.
    expect(line('C3:q D3:q E3:q F3:q | G3:w', 'left')).toEqual([5, 4, 3, 2, 1]);
  });

  it('passes the thumb under in a scale', () => {
    expect(line('C4:e D4:e E4:e F4:e G4:e A4:e B4:e C5:e')).toEqual([1, 2, 3, 1, 2, 3, 4, 5]);
  });

  it('gives chords their usual shapes', () => {
    expect(chordFingers([60, 64, 67], 'right')).toEqual([1, 3, 5]);
    expect(chordFingers([48, 52, 55], 'left')).toEqual([5, 3, 1]);
    expect(chordFingers([64, 67, 72], 'right')).toEqual([1, 2, 5]); // first inversion
    expect(chordFingers([59, 65, 67], 'right')).toEqual([1, 4, 5]); // V7 under C
    // The written number is the lowest note's finger.
    expect(chordFingers([62, 65], 'right', 2)).toEqual([2, 4]);
  });

  it('is filled in where content has no fingering, and never replaces written fingering', () => {
    const { content } = loadContent({
      'content/exercises/a.yaml': 'id: a\nkind: timed\ntempo: 60\nmeter: 4/4\nright: "C4:q D4:q E4:h"\nleft: "C3+G3:w"\nrightFingers: "2 3 4"',
      'content/exercises/b.yaml': 'id: b\nkind: tap\ntempo: 60\nmeter: 4/4\nrhythm: "x:q x:q x:h"',
    });
    const a = content.exercises.get('a') as TimedExercise;
    expect(a.fingers).toEqual({ right: [2, 3, 4], left: [5] });
    // Each note of a chord gets its own finger.
    expect(expectedNotes(a).filter((n) => n.hand === 'left').map((n) => [n.midi, n.finger])).toEqual([[48, 5], [55, 1]]);
    expect((content.exercises.get('b') as TimedExercise).fingers).toEqual({ right: [], left: [] });
  });

  it('agrees with the hand-written fingering in content on most notes', () => {
    // Scales and arpeggios have their fixed fingerings written in; this checks pieces and studies.
    const { content } = realContent();
    let notes = 0, same = 0;
    for (const ex of content.exercises.values()) {
      if (ex.kind !== 'timed' || ex.tap || /scale|major|minor|arp|chromatic|2oct|contrary|blues|dorian|lydian|mixo|phryg/.test(ex.id)) continue;
      for (const h of ['right', 'left'] as const) {
        const tokens = ex[h];
        if (!tokens || !ex.fingers[h].length) continue;
        const s = suggestFingers(tokens, h);
        ex.fingers[h].forEach((f, i) => { notes++; if (s[i] === f) same++; });
      }
    }
    expect(notes).toBeGreaterThan(1000);
    expect(same / notes).toBeGreaterThan(0.9);
  });
});
