import { describe, expect, it } from 'vitest';
import { deleteSketch, getSketch, saveSketch, sketches, sketchExercise, updateSketch } from '../src/progress/sketches';
import { memoryBackend, Store } from '../src/progress/store';
import { isSynced } from '../src/sync/tracker';

const idea = { title: 'Climb', tempo: 80, meter: '4/4', key: 'G', grid: 0.5, notes: [{ midi: 67, on: 0, off: 700 }], right: 'G4:q F#4:q G4:h', bars: 1 };

describe('sketchbook', () => {
  it('keeps, lists, renames and deletes ideas', () => {
    const s = new Store(memoryBackend());
    const a = saveSketch(s, idea);
    const b = saveSketch(s, { ...idea, title: 'Second' });
    expect(sketches(s).map((x) => x.id).sort()).toEqual([a.id, b.id].sort());
    updateSketch(s, a.id, { title: 'Climb higher', memo: 'try it in D' });
    expect(getSketch(s, a.id)).toMatchObject({ title: 'Climb higher', memo: 'try it in D' });
    deleteSketch(s, b.id);
    expect(sketches(s).map((x) => x.id)).toEqual([a.id]);
    expect(getSketch(s, b.id)).toBeUndefined();
  });

  it('syncs with an account', () => {
    expect(isSynced('iggyuoso.sketch.abc')).toBe(true);
  });

  it('turns an idea into an exercise to practise', () => {
    const ex = sketchExercise({ ...idea, id: 'x', created: '', updated: '' })!;
    expect(ex).toMatchObject({ id: 'sketch-x', kind: 'timed', tempo: 80, key: 'G', hand: 'right', bars: 1 });
  });
});
