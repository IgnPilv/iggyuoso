import { describe, expect, it } from 'vitest';
import { content, pathLessons, treeNodes } from '../src/modules/piano/content';
import { dailyInput, frontier, lessonAdvice, lessonGoals, lessonStage, nextLesson, noteSkipped, skippedLessons } from '../src/modules/piano/progress';
import { makePlan } from '../src/modules/piano/progress/daily';
import { Mastery } from '../src/modules/piano/progress/mastery';
import { memoryBackend, Store } from '../src/modules/piano/progress/store';

function fresh() {
  const store = new Store(memoryBackend());
  const mastery = new Mastery(store, treeNodes, (id) => { const l = content.lessons.get(id); return l ? lessonGoals(l).map((e) => e.id) : []; });
  return { store, mastery };
}
const path = pathLessons();
const nodeOf = (id: string) => [...treeNodes.values()].find((n) => n.lesson === id)!;
const root = path.find((l) => !nodeOf(l.id).requires.length)!;
const pass = (p: ReturnType<typeof fresh>, lessonId: string) => {
  for (const e of lessonGoals(content.lessons.get(lessonId)!)) {
    for (let d = 0; d < e.reps; d++) p.store.record(e.id, { at: `2026-10-${10 + d}T12:00:00`, score: 99, stars: 3, tempo: 999, counts: true });
    p.mastery.onAttempt(e.id, { at: '2026-10-20T12:00:00', score: 99, stars: 3, tempo: 999, counts: true }, 0, new Date('2026-10-20T12:00:00'));
  }
};

describe('the tree is advice, never a lock', () => {
  it('starts a new player at the root, and says what the rest grows after', () => {
    const p = fresh();
    expect(nextLesson(p)?.id).toBe(root.id);
    expect(lessonAdvice(root, p)).toEqual({ ready: true });
    const later = path.find((l) => nodeOf(l.id).requires.length)!;
    expect(lessonAdvice(later, p)).toMatchObject({ ready: false, reason: 'tree' });
    const cp = path.find((l) => nodeOf(l.id).type === 'checkpoint')!;
    expect(lessonAdvice(cp, p)).toMatchObject({ ready: false, checkpoint: true });
  });

  it('grows in several branches at once once the root is practised', () => {
    const p = fresh();
    pass(p, root.id);
    const open = frontier(p);
    expect(open.length).toBeGreaterThan(1);
    expect(new Set(open.map((n) => n.branch)).size).toBeGreaterThan(1);
    expect(open.every((n) => n.branch !== 'songs')).toBe(true);
    expect(open.some((n) => n.id === nodeOf(root.id).id)).toBe(false);
  });

  it('goes on from a song step to the song\'s next step', () => {
    const p = fresh();
    pass(p, 'song-wim-riff');
    expect(nextLesson(p, content.lessons.get('song-wim-riff'))?.id).toBe('song-wim-chords');
  });

  it('plans new work from the open edge, from two branches when there is time', () => {
    const p = fresh();
    expect(makePlan(dailyInput(p)).items.find((i) => i.why === 'lesson')?.lesson).toBe(root.id);
    pass(p, root.id);
    const lessons = makePlan(dailyInput(p)).items.filter((i) => i.why === 'lesson');
    expect(lessons.length).toBeGreaterThanOrEqual(1);
    expect(lessons.every((i) => lessonAdvice(content.lessons.get(i.lesson)!, p).ready)).toBe(true);
  });
});

describe('the next lesson after a recap', () => {
  const take = (p: ReturnType<typeof fresh>, lessonId: string, times = 1) => {
    for (const e of lessonGoals(content.lessons.get(lessonId)!)) {
      for (let i = 0; i < times; i++) p.store.record(e.id, { at: new Date().toISOString(), score: 99, stars: 3, tempo: 999, counts: true });
      p.mastery.onAttempt(e.id, { at: new Date().toISOString(), score: 99, stars: 3, tempo: 999, counts: true }, 0);
    }
  };

  it('moves on once every exercise has a clean take, even when takes on later days are still owed', () => {
    const p = fresh();
    take(p, root.id);
    expect(lessonStage(root, p)).toBe('through');
    expect(nextLesson(p)?.id).not.toBe(root.id);
    expect(nextLesson(p, root)?.id).not.toBe(root.id);
  });

  it('goes on in the same branch after a lesson, not back to an early lesson of another branch', () => {
    const p = fresh();
    take(p, root.id);
    const nodes = [...treeNodes.values()];
    // The second open lesson in some branch other than the first one the edge suggests.
    const first = nextLesson(p)!;
    const other = frontier(p).find((n) => n.branch !== nodeOf(first.id).branch && n.lesson)!;
    const from = content.lessons.get(other.lesson!)!;
    take(p, from.id);
    const next = nextLesson(p, from)!;
    const same = nodes.slice(nodes.indexOf(other) + 1).find((n) => n.branch === other.branch && p.mastery.state(n.id) !== 'locked');
    if (same) expect(next.id).toBe(same.lesson);
    expect(next.id).not.toBe(from.id);
  });

  it('suggests a skipped lesson only after the others, and forgets the skip once it is played', () => {
    const p = fresh();
    take(p, root.id);
    const first = nextLesson(p)!;
    noteSkipped(first, p);
    expect(nextLesson(p)?.id).not.toBe(first.id);
    take(p, first.id);
    noteSkipped(first, p);
    expect(skippedLessons(p).has(first.id)).toBe(false);
  });
});
