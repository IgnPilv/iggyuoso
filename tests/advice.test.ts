import { describe, expect, it } from 'vitest';
import { content, treeNodes } from '../src/content';
import { dailyInput, lessonAdvice, lessonGoals } from '../src/progress';
import { makePlan } from '../src/progress/daily';
import { Mastery } from '../src/progress/mastery';
import { memoryBackend, Store } from '../src/progress/store';

function fresh() {
  const store = new Store(memoryBackend());
  const mastery = new Mastery(store, treeNodes, (id) => { const l = content.lessons.get(id); return l ? lessonGoals(l).map((e) => e.id) : []; });
  return { store, mastery };
}
const path = [...content.units].sort((a, b) => a.order - b.order).flatMap((u) => u.lessons).map((id) => content.lessons.get(id)!);

describe('the path is advice, never a lock', () => {
  it('recommends the first lesson to a new player and says what comes before the rest', () => {
    const p = fresh();
    expect(lessonAdvice(path[0], p)).toEqual({ ready: true });
    expect(lessonAdvice(path[1], p)).toMatchObject({ ready: false, reason: 'previous', lesson: { id: path[0].id } });
    const cp = path.find((l) => [...treeNodes.values()].some((n) => n.lesson === l.id && n.type === 'checkpoint'))!;
    expect(lessonAdvice(cp, p)).toMatchObject({ ready: false });
  });

  it('plans the first lesson not done, recommended or not', () => {
    const p = fresh();
    expect(makePlan(dailyInput(p)).items.find((i) => i.why === 'lesson')?.lesson).toBe(path[0].id);
    // Skipping ahead: lesson 3 done, lessons 1 and 2 not. The plan still suggests lesson 1.
    for (const e of lessonGoals(path[2])) for (let d = 0; d < e.reps; d++) {
      p.store.record(e.id, { at: `2026-10-${10 + d}T12:00:00`, score: 99, stars: 3, tempo: 999, counts: true });
    }
    expect(p.store.lessonDone(lessonGoals(path[2]))).toBe(true);
    expect(makePlan(dailyInput(p)).items.find((i) => i.why === 'lesson')?.lesson).toBe(path[0].id);
  });
});
