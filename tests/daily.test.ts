import { describe, expect, it } from 'vitest';
import { loadTree } from '../src/modules/piano/content/tree';
import type { Lesson } from '../src/modules/piano/content/types';
import { itemDone, makePlan, minutesFor, todayPlan, type PlanInput } from '../src/modules/piano/progress/daily';
import { Mastery } from '../src/modules/piano/progress/mastery';
import { memoryBackend, Store } from '../src/modules/piano/progress/store';
import { parseExercise } from '../src/modules/piano/content/load';
import { readContentFiles, realContent } from './helpers';

const files = readContentFiles();
const { content } = realContent();
const { nodes } = loadTree(files, content.lessons);
const goals = (l: Lesson) => l.steps.flatMap((s) => ('exercise' in s ? [content.exercises.get(s.exercise)!] : [])).filter(Boolean);
const path = [...nodes.values()].map((n) => n.lesson && content.lessons.get(n.lesson)).filter((l): l is Lesson => !!l);
const first = path.map((l) => l.id);

function setup() {
  const store = new Store(memoryBackend());
  const mastery = new Mastery(store, nodes, (id) => { const l = content.lessons.get(id); return l ? goals(l).map((e) => e.id) : []; });
  // Only the root of the tree is open, as for a new player.
  const input: PlanInput = { content, nodes, store, mastery, lessonGoals: goals, next: () => [path[0]], path: () => path };
  return { store, mastery, input };
}

describe("today's practice", () => {
  it('estimates minutes from the exercise', () => {
    const t = parseExercise({ id: 't', kind: 'timed', hand: 'right', tempo: 60, meter: '4/4', right: 'C4:w | C4:w | C4:w | C4:w' });
    expect(minutesFor(t)).toBe(1); // (4 bars + count-in) x 4 s = 20 s, twice, plus 20 s
    expect(minutesFor(parseExercise({ id: 'g', kind: 'generated', generator: 'read-notes', questions: 30 }))).toBe(2);
  });

  it('starts a new player on the first lesson, with no reviews', () => {
    const { input } = setup();
    const plan = makePlan(input, new Date('2026-11-01T12:00:00'));
    expect(plan.items[0]).toMatchObject({ why: 'lesson', lesson: first[0] });
    expect(plan.items.filter((i) => i.why === 'review')).toEqual([]);
  });

  it('puts due reviews first, the weakest exercise of each faded node', () => {
    const { store, input } = setup();
    const lesson = content.lessons.get(first[0])!;
    const node = [...nodes.values()].find((n) => n.lesson === lesson.id)!;
    const exs = goals(lesson);
    exs.forEach((e, i) => store.record(e.id, { at: '2026-10-20T12:00:00', score: i === 0 ? 93 : 99, stars: 3, tempo: 60, counts: true }));
    store.put(`mastery.${node.id}`, { state: 'solid', box: 0, lastGood: '2026-10-20' });
    const now = new Date('2026-10-25T12:00:00');
    const plan = makePlan(input, now);
    expect(plan.items[0]).toMatchObject({ why: 'review', node: node.id, exercise: exs[0].id });
    expect(itemDone(input, plan.items[0], now)).toBe(false);
    expect(plan.items.reduce((s, i) => s + i.minutes, 0)).toBeLessThanOrEqual(25);

    // The plan is kept for the day.
    const saved = todayPlan(input, now);
    store.put(`mastery.${node.id}`, { state: 'solid', box: 0, lastGood: '2026-10-25' });
    expect(todayPlan(input, now)).toEqual(saved);
    expect(todayPlan(input, new Date('2026-10-26T12:00:00')).day).toBe('2026-10-26');
  });
});
