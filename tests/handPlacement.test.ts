import { describe, expect, it } from 'vitest';
import { HandPlan, whiteIndex, whiteKey, type PlacedNote } from '../src/modules/piano/music/handPlacement';
import { realContent } from './helpers';
import { expectedNotes } from '../src/modules/piano/music/timeline';
import type { TimedExercise } from '../src/modules/piano/content/types';

const line = (keys: number[], fingers: number[], hand: 'right' | 'left' = 'right'): PlacedNote[] =>
  keys.map((key, i) => ({ key, beat: i, beats: 1, hand, finger: fingers[i] }));

describe('hand placement', () => {
  it('counts white keys', () => {
    expect(whiteIndex(60) + 1).toBe(whiteIndex(62));
    expect(whiteIndex(61)).toBe(whiteIndex(60) + 0.5);
    expect(whiteKey(whiteIndex(65))).toBe(65);
    expect(whiteKey(whiteIndex(59))).toBe(59);
  });

  it('keeps a five-finger tune in one position, every finger on its key', () => {
    const plan = new HandPlan(line([60, 62, 64, 62, 60], [1, 2, 3, 2, 1]));
    for (const p of plan.poses('right')) expect(p.keys).toEqual([60, 62, 64, 65, 67]);
  });

  it('passes the thumb under in a scale: the hand moves once', () => {
    const plan = new HandPlan(line([60, 62, 64, 65, 67, 69, 71, 72], [1, 2, 3, 1, 2, 3, 4, 5]));
    const poses = plan.poses('right').map((p) => p.keys);
    expect(poses[0]).toEqual([60, 62, 64, 65, 67]);
    expect(poses[3]).toEqual([65, 67, 69, 71, 72]);
    expect(poses[7]).toEqual(poses[3]);
  });

  it('mirrors the left hand: finger 1 is its highest', () => {
    const plan = new HandPlan(line([48, 50, 52, 53, 55], [5, 4, 3, 2, 1], 'left'));
    expect(plan.poses('left')[0].keys).toEqual([55, 53, 52, 50, 48]);
    expect(plan.hands).toEqual(['left']);
  });

  it('slides to a new position just before the note that needs it', () => {
    const plan = new HandPlan(line([60, 62, 64, 65], [1, 2, 3, 1]));
    const thumb = (beat: number) => plan.at(beat)[0].fingers[0];
    expect(thumb(2).t).toBe(0);
    expect(thumb(2.7).t).toBeGreaterThan(0);
    expect(thumb(2.7).to).toBe(65);
    expect(thumb(3).from).toBe(65);
    // The note sounding is down; the next note's finger is marked.
    expect(plan.at(0.5)[0].fingers[0].state).toBe('down');
    expect(plan.at(0.5)[0].fingers[1].state).toBe('next');
    expect(plan.at(-1)[0].fingers[0].state).toBe('next');
  });

  it('places a chord by its fingers', () => {
    const notes: PlacedNote[] = [60, 64, 67].map((key, i) => ({ key, beat: 0, beats: 2, hand: 'right', finger: [1, 3, 5][i] }));
    expect(new HandPlan(notes).poses('right')[0].keys).toEqual([60, 62, 64, 65, 67]);
  });

  it('draws no hand without fingering', () => {
    expect(new HandPlan(line([60, 62], [])).hands).toEqual([]);
  });

  it('gives every timed exercise a hand position in order of pitch', () => {
    const { content } = realContent();
    for (const ex of content.exercises.values()) {
      if (ex.kind !== 'timed' || (ex as TimedExercise).tap) continue;
      const exp = expectedNotes(ex as TimedExercise);
      const plan = new HandPlan(exp.map((e) => ({ key: e.midi, beat: e.beat, beats: e.beats, hand: e.hand, finger: e.finger })));
      for (const hand of plan.hands) {
        for (const p of plan.poses(hand)) {
          expect(p.keys.length).toBe(5);
          for (const k of p.keys) expect(Number.isInteger(k)).toBe(true);
        }
      }
    }
  });
});
