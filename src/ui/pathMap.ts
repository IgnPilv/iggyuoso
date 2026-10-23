import { content, tree } from '../content';
import type { Lesson } from '../content/types';
import type { TreeNode, TreeUnit, TreeYear } from '../content/tree';
import { lessonAdvice, lessonGoals, mastery } from '../progress';
import { store } from '../progress/store';
import { h } from './dom';

// The home page's path map: the mastery tree drawn as a road of unit stations, year by year.
// Only the unit you are in is open; the rest stay folded, so a first visit is one screen, not 111
// tiles. Styles: "path map" in style.css; patterns in docs/design.md.

const STRAND_LABEL: Record<string, string> = {
  technique: 'Technique', reading: 'Reading', rhythm: 'Rhythm', theory: 'Theory', ear: 'Ear',
  repertoire: 'Pieces', creativity: 'Creativity', all: 'Checkpoint',
};

const lessonOf = (n: TreeNode): Lesson | undefined => (n.lesson ? content.lessons.get(n.lesson) : undefined);
const nodeDone = (n: TreeNode) => {
  const l = lessonOf(n);
  return !!l && store.lessonDone(lessonGoals(l));
};

/** `nextLesson`: the lesson the Continue button points at; its unit opens and glows. */
export function pathMap(nextLesson?: string): HTMLElement {
  const unitOf = (y: TreeYear) => y.units.find((u) => u.nodes.some((n) => n.lesson === nextLesson));
  const currentYear = tree.find((y) => unitOf(y)) ?? tree[0];
  return h('section', { class: 'card path-card' },
    h('div', { class: 'unit-head' },
      h('h2', {}, 'Your path'),
      h('span', { class: 'unit-progress' }, 'Every lesson is open; the path is the suggested order.')),
    h('ul', { class: 'strand-legend', 'aria-label': 'Strands' },
      ...['technique', 'reading', 'rhythm', 'theory', 'ear', 'repertoire'].map((k) =>
        h('li', {}, h('span', { class: `strand-dot strand-${k}` }), STRAND_LABEL[k]))),
    ...tree.map((y) => yearBlock(y, y === currentYear, unitOf(y), nextLesson)));
}

function yearBlock(y: TreeYear, open: boolean, current: TreeUnit | undefined, nextLesson?: string): HTMLElement {
  const built = y.units.filter((u) => u.nodes.length);
  const lessons = built.flatMap((u) => u.nodes).filter((n) => n.lesson);
  const done = lessons.filter(nodeDone).length;
  const block = h('details', { class: 'path-year', open },
    h('summary', {},
      h('span', { class: 'year-badge' }, `Year ${y.year}`),
      h('span', { class: 'year-title' }, y.title),
      h('span', { class: 'year-meta' }, built.length ? `${done} / ${lessons.length}` : 'Coming later')),
    h('p', { class: 'small year-goal' }, y.goal),
    h('ol', { class: 'path' }, ...y.units.map((u, i) => station(u, i, u === current, nextLesson))));
  return block;
}

function station(u: TreeUnit, index: number, current: boolean, nextLesson?: string): HTMLElement {
  const lessons = u.nodes.filter((n) => n.lesson && content.lessons.has(n.lesson));
  const done = lessons.filter(nodeDone).length;
  const pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
  const state = !u.nodes.length ? 'outline' : done === lessons.length && lessons.length ? 'done' : current ? 'current' : done ? 'started' : 'todo';
  const disc = h('span', { class: 'station-disc', style: `--pct: ${pct}` }, h('span', {}, state === 'done' ? '✓' : String(index + 1)));
  const head = h('div', { class: 'station-head' },
    disc,
    h('span', { class: 'station-text' },
      h('span', { class: 'station-title' }, u.title),
      h('span', { class: 'station-meta' }, !u.nodes.length ? 'Being written' : `${done} of ${lessons.length} done`)));
  if (!u.nodes.length) return h('li', { class: `station ${state}` }, head);
  const details = h('details', { open: current }, h('summary', {}, head),
    h('ol', { class: 'lessons path-nodes' }, ...u.nodes.map((n) => nodeTile(n, n.lesson === nextLesson))));
  return h('li', { class: `station ${state}` }, details);
}

function nodeTile(n: TreeNode, next: boolean): HTMLElement {
  const l = lessonOf(n);
  const strand = h('span', { class: `strand-dot strand-${n.strand}`, title: STRAND_LABEL[n.strand] ?? n.strand });
  if (!l) return h('li', { class: 'planned' }, h('span', { class: 'tile' }, strand, n.title, h('span', { class: 'state-badge' }, 'Soon')));
  const goals = lessonGoals(l);
  const done = store.lessonDone(goals);
  const state = mastery.state(n.id);
  const reps = goals.filter((e) => store.reps(e).done).length;
  // Badges only for things worth acting on or celebrating; "not yet" is shown by a quieter tile.
  const badge = mastery.isDue(n.id) ? h('span', { class: 'state-badge due' }, 'Review')
    : state === 'mastered' ? h('span', { class: 'state-badge mastered' }, 'Mastered')
      : state === 'solid' ? h('span', { class: 'state-badge solid' }, 'Solid')
        : !done && reps ? h('span', { class: 'state-badge' }, `${reps} / ${goals.length}`) : '';
  const cls = done ? 'done' : next ? 'next' : !lessonAdvice(l).ready ? 'ahead' : '';
  return h('li', { class: `${cls} type-${n.type}` },
    h('a', { href: `#/lesson/${l.id}`, title: cls === 'ahead' ? 'Best after the lessons before it; open it any time' : undefined }, strand, n.title, badge));
}
