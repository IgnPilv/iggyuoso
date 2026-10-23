import { describe, expect, it } from 'vitest';
import { content, pathLessons, treeNodes } from '../src/content';
import { dailyInput, frontier, lessonAdvice, lessonGoals, nextLesson } from '../src/progress';
import { makePlan } from '../src/progress/daily';
import { Mastery } from '../src/progress/mastery';
import { memoryBackend, Store } from '../src/progress/store';

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

  it('plans new work from the open edge, from two branches when there is time', () => {
    const p = fresh();
    expect(makePlan(dailyInput(p)).items.find((i) => i.why === 'lesson')?.lesson).toBe(root.id);
    pass(p, root.id);
    const lessons = makePlan(dailyInput(p)).items.filter((i) => i.why === 'lesson');
    expect(lessons.length).toBeGreaterThanOrEqual(1);
    expect(lessons.every((i) => lessonAdvice(content.lessons.get(i.lesson)!, p).ready)).toBe(true);
  });
});
