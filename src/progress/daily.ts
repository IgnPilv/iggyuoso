import type { TreeNode } from '../content/tree';
import type { Content, Exercise, Lesson } from '../content/types';
import { parseMeter } from '../music/notes';
import { dayOf, type Mastery } from './mastery';
import { localDay, type Store } from './store';

// Today's practice: about 20 minutes, in the order a teacher would set it. First the reviews that
// are due (one exercise for each faded node), then the next lesson, then generated drills from
// what the player already knows. The plan is made once a day and saved, so it does not shift
// while the player works through it.

export const DAILY_MINUTES = 20;
/** Reviews take at most this much of the day; the rest goes to new work and drills. */
const REVIEW_MINUTES = 10;

export interface DailyItem {
  why: 'review' | 'lesson' | 'drill';
  /** The exercise to play (a review or drill), or the lesson to open. */
  exercise?: string;
  lesson: string;
  node?: string;
  minutes: number;
}

export interface DailyPlan {
  day: string;
  items: DailyItem[];
}

/** Rough minutes an exercise takes, with a second try. */
export function minutesFor(ex: Exercise): number {
  const take = (bars: number, meter: { quarters: number; pulse: number }, tempo: number, countIn = 1) =>
    ((bars + countIn) * meter.quarters * 60) / (tempo * meter.pulse);
  let secs: number;
  if (ex.kind === 'timed') secs = 2 * take(ex.bars, ex.meter, ex.tempo, ex.countIn) + 20;
  else if (ex.kind === 'generated') {
    secs = ex.generator === 'rhythm-read' || ex.generator === 'sight-read'
      ? 2 * take(ex.bars, parseMeter(ex.meter), ex.tempo) + 20
      : ex.questions * 4;
  } else if (ex.kind === 'ear') secs = ex.questions * 7;
  else if (ex.kind === 'quiz') secs = ex.questions.length * 8;
  else if (ex.kind === 'build') secs = ex.tasks.length * 12;
  else secs = 60;
  return Math.max(0.5, Math.round(secs / 30) / 2);
}

export interface PlanInput {
  content: Content;
  nodes: ReadonlyMap<string, TreeNode>;
  store: Store;
  mastery: Mastery;
  lessonGoals: (l: Lesson) => Exercise[];
  /** The open lessons of the tree, best first (the growing edge). */
  next: () => Lesson[];
  /** Every lesson in path order. */
  path: () => Lesson[];
}

export function makePlan(p: PlanInput, now = new Date()): DailyPlan {
  const items: DailyItem[] = [];
  let used = 0;
  const add = (item: DailyItem) => { items.push(item); used += item.minutes; };

  // 1. Reviews: for each due node, the exercise of its lesson with the weakest best take.
  for (const nodeId of p.mastery.reviewQueue(now)) {
    const node = p.nodes.get(nodeId);
    const lesson = node?.lesson ? p.content.lessons.get(node.lesson) : undefined;
    if (!lesson) continue;
    const exs = p.lessonGoals(lesson);
    if (!exs.length) continue;
    const weakest = [...exs].sort((a, b) => (p.store.exercise(a.id).best?.score ?? 0) - (p.store.exercise(b.id).best?.score ?? 0))[0];
    const minutes = minutesFor(weakest);
    if (items.length && used + minutes > REVIEW_MINUTES) break;
    add({ why: 'review', exercise: weakest.id, lesson: lesson.id, node: nodeId, minutes });
  }

  // 2. New work from the growing edge of the tree: the best open lesson, and if there is time a
  // second one from another branch, so a session trains more than one skill.
  const nodeOf = (l: Lesson) => [...p.nodes.values()].find((n) => n.lesson === l.id);
  const lessonMinutes = (l: Lesson) => {
    const left = p.lessonGoals(l).filter((e) => !p.store.reps(e).done);
    // Each exercise needs its clean takes still to come; a try often misses, so most of a try each.
    return left.reduce((s, e) => s + minutesFor(e) * 0.75 * Math.max(1, e.reps - p.store.reps(e).clean), 0);
  };
  const open = p.next();
  const picked: Lesson[] = [];
  for (const l of open) {
    if (picked.length >= 2 || used >= DAILY_MINUTES - 3) break;
    if (picked.some((x) => nodeOf(x)?.branch === nodeOf(l)?.branch)) continue;
    const minutes = Math.min(DAILY_MINUTES - used, Math.max(3, lessonMinutes(l)) * (picked.length ? 0.5 : 1));
    picked.push(l);
    add({ why: 'lesson', lesson: l.id, node: nodeOf(l)?.id, minutes: Math.max(1, Math.round(minutes)) });
  }

  // 3. Generated drills from lessons already reached (played, or on the edge), newest first.
  const lessons = p.path();
  const reached = lessons.filter((l) => picked.includes(l) || p.lessonGoals(l).some((e) => p.store.exercise(e.id).attempts > 0));
  for (const l of [...reached].reverse()) {
    for (const ex of p.lessonGoals(l)) {
      if (ex.kind !== 'generated' || used >= DAILY_MINUTES) continue;
      if (items.some((i) => i.exercise === ex.id)) continue;
      add({ why: 'drill', exercise: ex.id, lesson: l.id, minutes: minutesFor(ex) });
    }
  }
  return { day: dayOf(now), items };
}

/** Today's plan: the saved one if it was made today, else a new one (saved). */
export function todayPlan(p: PlanInput, now = new Date()): DailyPlan {
  const saved = p.store.get<DailyPlan>('daily.plan');
  if (saved?.day === dayOf(now)) return saved;
  const plan = makePlan(p, now);
  p.store.put('daily.plan', plan);
  return plan;
}

/** Whether an item has been played today: a take of the exercise, or of any exercise in the lesson. */
export function itemDone(p: PlanInput, item: DailyItem, now = new Date()): boolean {
  const today = dayOf(now);
  const playedToday = (id: string) => { const at = p.store.exercise(id).last?.at; return !!at && localDay(at) === today; };
  if (item.exercise) {
    // A review is done once the node is fresh again; anything else once it was played today.
    if (item.why === 'review' && item.node) return !p.mastery.isDue(item.node, now) && playedToday(item.exercise);
    return playedToday(item.exercise);
  }
  const lesson = p.content.lessons.get(item.lesson);
  if (!lesson) return true;
  return p.store.lessonDone(p.lessonGoals(lesson)) || p.lessonGoals(lesson).some((e) => playedToday(e.id));
}
