import { branches, content, songOf, stages, stepTitle, treeNodes } from '../content';
import type { BranchId, TreeNode, TreeStage } from '../content/tree';
import { frontier, lessonGoals, mastery as realMastery } from '../progress';
import type { Mastery, NodeState } from '../progress/mastery';
import { store as realStore, type Store } from '../progress/store';
import { h, s as svgEl } from './dom';

// The mastery tree on screen: a drawn tree that grows with the player (branches lengthen and leaf
// out as their nodes are practised, buds show what is open), the growing edge as tiles, the trunk
// of stages and milestones, one page per branch, and the Songs page. Nothing is ever closed: a
// node that has not grown yet still opens, with advice on what comes first.

export const BRANCH_LABEL: Record<string, string> = {
  technique: 'Technique', reading: 'Reading', rhythm: 'Rhythm', theory: 'Theory', ear: 'Ear',
  repertoire: 'Pieces', creativity: 'Creativity', milestones: 'Milestones', songs: 'Songs', all: 'Milestone',
};

/** The seven branches drawn on the tree (milestones are the trunk, songs the blossom). */
export const GROWING: BranchId[] = ['technique', 'reading', 'rhythm', 'theory', 'ear', 'repertoire', 'creativity'];

type Progress = { store: Store; mastery: Mastery };

export interface NodeView {
  node: TreeNode;
  state: NodeState;
  done: boolean;
  /** Its requirements are far enough along. */
  open: boolean;
  /** Exercises with their clean takes, out of all. */
  reps: [number, number];
}

/** Every node's state, worked out once per screen. */
export function snapshot(p: Progress = { store: realStore, mastery: realMastery }): Map<string, NodeView> {
  const states = p.mastery.states();
  const out = new Map<string, NodeView>();
  for (const n of treeNodes.values()) {
    const l = n.lesson ? content.lessons.get(n.lesson) : undefined;
    const goals = l ? lessonGoals(l) : [];
    const reps = goals.filter((e) => p.store.reps(e).done).length;
    const state = states.get(n.id) ?? 'locked';
    out.set(n.id, { node: n, state, done: !!l && reps === goals.length && goals.length > 0, open: state !== 'locked', reps: [reps, goals.length] });
  }
  return out;
}

const grown = (v: NodeView) => v.state === 'practised' || v.state === 'solid' || v.state === 'mastered' || v.done;

/** The stage the player is in: the first one whose milestone is not Practised yet. */
export function currentStage(snap: Map<string, NodeView>): TreeStage {
  return stages.find((s) => !s.milestone || !grown(snap.get(s.milestone.id)!)) ?? stages[stages.length - 1];
}

// ---------------------------------------------------------------- the drawn tree

const W = 640;
const H = 420;
const GROUND = 396;

/**
 * The player's tree. The trunk grows a ring for every milestone passed; each branch grows longer
 * and leafier as its nodes are practised (Solid and Mastered leaves are full, Practised ones
 * pale); a glowing bud at a branch tip means something new is open there; songs blossom.
 */
export function growingTree(snap: Map<string, NodeView>, onBranch?: (b: BranchId) => void): SVGSVGElement {
  const passed = stages.filter((s) => s.milestone && grown(snap.get(s.milestone.id)!)).length;
  const reached = [...snap.values()].filter(grown).length;
  // The whole tree is always drawn faintly, so a beginner sees what they are growing; colour
  // climbs the trunk with the milestones and runs out along each branch as its nodes grow.
  const fullH = 320;
  const top = GROUND - fullH;
  const grownH = reached ? 60 + (fullH - 60) * (passed / Math.max(1, stages.length)) : 40;
  const parts: SVGElement[] = [];

  parts.push(svgEl('ellipse', { cx: W / 2, cy: GROUND + 6, rx: 180, ry: 12, class: 'tree-ground' }));
  const trunk = (h: number, cls: string) => {
    const t = GROUND - h;
    const bw = 30;
    const tw = 12 + 18 * (1 - h / fullH);
    return svgEl('path', {
      class: cls,
      d: `M ${W / 2 - bw / 2} ${GROUND} C ${W / 2 - bw / 2 + 4} ${GROUND - h * 0.5}, ${W / 2 - tw / 2} ${t + 30}, ${W / 2 - tw / 2} ${t}
        L ${W / 2 + tw / 2} ${t} C ${W / 2 + tw / 2} ${t + 30}, ${W / 2 + bw / 2 - 4} ${GROUND - h * 0.5}, ${W / 2 + bw / 2} ${GROUND} Z`,
    });
  };
  parts.push(trunk(fullH, 'tree-trunk ghost'));
  parts.push(trunk(grownH, 'tree-trunk'));
  // A ring on the trunk for every milestone: filled once passed, faint until then.
  stages.forEach((s, i) => {
    if (!s.milestone) return;
    const y = GROUND - 26 - i * ((fullH - 50) / Math.max(1, stages.length));
    parts.push(svgEl('circle', { cx: W / 2, cy: y, r: 5, class: `tree-ring${i < passed ? '' : ' ghost'}` }));
  });

  if (!reached) {
    // A seedling at the foot of the tree: two small leaves and a bud.
    const sy = GROUND - grownH;
    parts.push(svgEl('ellipse', { cx: W / 2 - 16, cy: sy + 6, rx: 16, ry: 7, transform: `rotate(-25 ${W / 2 - 16} ${sy + 6})`, class: 'tree-leaf strand-fill-ear' }));
    parts.push(svgEl('ellipse', { cx: W / 2 + 16, cy: sy + 6, rx: 16, ry: 7, transform: `rotate(25 ${W / 2 + 16} ${sy + 6})`, class: 'tree-leaf strand-fill-technique' }));
    parts.push(svgEl('circle', { cx: W / 2, cy: sy - 4, r: 7, class: 'tree-bud' }));
  }

  GROWING.forEach((b, i) => {
    const nodes = [...snap.values()].filter((v) => v.node.branch === b && v.node.lesson);
    if (!nodes.length) return;
    const leaves = nodes.filter(grown);
    const share = leaves.length / nodes.length;
    const side = b === 'creativity' ? 0 : i % 2 === 0 ? -1 : 1;
    const at = b === 'creativity' ? top : GROUND - fullH * (0.3 + 0.17 * Math.floor(i / 2));
    const len = side ? 175 : 0;
    const x0 = W / 2;
    const y0 = at;
    const x1 = x0 + side * len;
    const y1 = y0 - (side ? 40 + len * 0.35 : 80);
    const cx = x0 + side * len * 0.45;
    const cy = y0 - (side ? 8 : 40);
    const point = (t: number) => ({
      x: (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1,
      y: (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1,
    });
    // How far along the colour has grown; the first part of the curve, split at t.
    const t = leaves.length ? 0.2 + 0.8 * Math.sqrt(share) : 0;
    const end = point(t);
    const mid = { x: x0 + (cx - x0) * t, y: y0 + (cy - y0) * t };
    const g = svgEl('g', { class: `tree-branch branch-${b}`, role: 'link', tabindex: '0', 'aria-label': `${BRANCH_LABEL[b]} branch` });
    g.append(svgEl('path', { d: `M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y1}`, class: `tree-limb ghost strand-stroke-${b}` }));
    if (t) g.append(svgEl('path', { d: `M ${x0} ${y0} Q ${mid.x} ${mid.y} ${end.x} ${end.y}`, class: `tree-limb strand-stroke-${b}` }));
    // Leaves along the grown part, alternating sides; at most 16, each standing for a share of the nodes.
    const shown = Math.min(16, leaves.length);
    for (let k = 0; k < shown; k++) {
      const v = leaves[Math.floor((k * leaves.length) / shown)];
      const p = point(0.12 + ((t - 0.12) * (k + 1)) / (shown + 1));
      const flip = k % 2 ? 1 : -1;
      const angle = side ? side * -30 + flip * 45 : flip * 60;
      const full = v.state === 'solid' || v.state === 'mastered';
      g.append(svgEl('ellipse', {
        cx: p.x + flip * 7, cy: p.y - 6, rx: full ? 11 : 9, ry: full ? 5.5 : 4.5,
        transform: `rotate(${angle} ${p.x + flip * 7} ${p.y - 6})`,
        class: `tree-leaf strand-fill-${b}${full ? '' : ' pale'}`,
      }));
    }
    // A glowing bud where something is open: at the tip of the colour, or at the branch's foot.
    const open = nodes.filter((v) => v.open && !v.done).length;
    const bud = t ? end : point(0.16);
    if (open) g.append(svgEl('circle', { cx: bud.x, cy: bud.y, r: 7, class: `tree-bud strand-fill-${b}` }));
    const label = svgEl('text', {
      x: x1 + (side === 0 ? 0 : side * 14), y: y1 + (side === 0 ? -16 : 5),
      'text-anchor': side < 0 ? 'end' : side > 0 ? 'start' : 'middle', class: 'tree-label',
    });
    // Name over count, so the labels stay short enough for a phone.
    const lx = label.getAttribute('x')!;
    const name = svgEl('tspan', { x: lx, dy: side === 0 ? '-0.6em' : '-0.15em' });
    name.textContent = BRANCH_LABEL[b];
    const count = svgEl('tspan', { x: lx, dy: '1.15em', class: 'tree-count' });
    count.textContent = `${leaves.length}/${nodes.length}`;
    label.append(name, count);
    g.append(label);
    if (onBranch) {
      g.addEventListener('click', () => onBranch(b));
      g.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter') onBranch(b); });
    }
    parts.push(g);
  });

  // Songs blossom in the crown.
  const songs = [...snap.values()].filter((v) => v.node.branch === 'songs' && grown(v));
  songs.slice(0, 24).forEach((_, k) => {
    const a = (k * 137.5 * Math.PI) / 180;
    const r = 30 + 9 * Math.sqrt(k);
    parts.push(svgEl('circle', { cx: W / 2 + Math.cos(a) * r * 1.6, cy: top - 10 + Math.sin(a) * r * 0.6, r: 4.5, class: 'tree-blossom' }));
  });

  return svgEl('svg', { viewBox: `-50 -70 ${W + 100} ${H + 70}`, class: 'growing-tree', role: 'img', 'aria-label': 'Your tree' }, ...parts);
}

// ---------------------------------------------------------------- tiles

const stateBadge = (v: NodeView, isDue: boolean) =>
  isDue ? h('span', { class: 'state-badge due' }, 'Review')
    : v.state === 'mastered' ? h('span', { class: 'state-badge mastered' }, 'Mastered')
      : v.state === 'solid' ? h('span', { class: 'state-badge solid' }, 'Solid')
        : !v.done && v.reps[0] ? h('span', { class: 'state-badge' }, `${v.reps[0]} / ${v.reps[1]}`) : '';

/** A node as a tile: strand dot, title, a badge worth acting on. */
export function nodeTile(v: NodeView, opts: { next?: boolean; branch?: boolean; mastery?: Mastery } = {}): HTMLElement {
  const n = v.node;
  const dot = h('span', { class: `strand-dot strand-${n.strand}`, title: BRANCH_LABEL[n.branch] });
  const cls = [v.done ? 'done' : '', opts.next ? 'next' : '', !v.open && !v.done ? 'bud' : '', `type-${n.type}`].filter(Boolean).join(' ');
  if (!n.lesson) return h('li', { class: 'planned' }, h('span', { class: 'tile' }, dot, n.title, h('span', { class: 'state-badge' }, 'Soon')));
  const m = opts.mastery ?? realMastery;
  return h('li', { class: cls },
    h('a', { href: `#/lesson/${n.lesson}`, title: !v.open && !v.done ? 'Not grown yet: best after what it needs. You can open it any time.' : undefined },
      dot,
      h('span', { class: 'tile-text' },
        h('span', { class: 'tile-title' }, n.title),
        opts.branch ? h('span', { class: 'tile-meta' }, `${BRANCH_LABEL[n.branch]} · stage ${n.stage}`) : ''),
      stateBadge(v, m.isDue(n.id))));
}

/** "Growing now": the open nodes, best first, at most two per branch. */
export function growingNow(snap: Map<string, NodeView>, p: Progress = { store: realStore, mastery: realMastery }, limit = 8): HTMLElement {
  const per = new Map<string, number>();
  const picks = frontier(p).filter((n) => {
    const k = per.get(n.branch) ?? 0;
    per.set(n.branch, k + 1);
    return k < 2;
  }).slice(0, limit);
  return h('section', { class: 'card growing-card' },
    h('div', { class: 'unit-head' },
      h('h2', {}, 'Growing now'),
      h('span', { class: 'unit-progress' }, 'Open on your tree. Pick any; the first is the suggestion.')),
    picks.length
      ? h('ol', { class: 'lessons path-nodes growing-list' }, ...picks.map((n, i) => nodeTile(snap.get(n.id)!, { next: i === 0, branch: true, mastery: p.mastery })))
      : h('p', { class: 'small' }, 'Everything open is done. Take the milestone, or review what is due.'));
}

/** The trunk: each stage with its branches' nodes and the milestone that closes it. */
export function stageList(snap: Map<string, NodeView>, p: Progress = { store: realStore, mastery: realMastery }): HTMLElement {
  const current = currentStage(snap);
  return h('section', { class: 'card path-card' },
    h('div', { class: 'unit-head' },
      h('h2', {}, 'The whole tree'),
      h('span', { class: 'unit-progress' }, 'Stage by stage, with the threads between branches. Each milestone grows the next stage.')),
    h('ol', { class: 'path' }, ...stages.map((s) => stageStation(s, s === current, snap, p))));
}

function stageStation(s: TreeStage, current: boolean, snap: Map<string, NodeView>, p: Progress): HTMLElement {
  const nodes = [...snap.values()].filter((v) => v.node.stage === s.stage && v.node.branch !== 'songs' && v.node.lesson);
  const done = nodes.filter((v) => v.done).length;
  const ms = s.milestone && snap.get(s.milestone.id);
  const passed = !!ms && grown(ms);
  const pct = nodes.length ? Math.round((done / nodes.length) * 100) : 0;
  const state = passed ? 'done' : current ? 'current' : done ? 'started' : 'todo';
  const head = h('div', { class: 'station-head' },
    h('span', { class: 'station-disc', style: `--pct: ${pct}` }, h('span', {}, passed ? '✓' : String(s.stage))),
    h('span', { class: 'station-text' },
      h('span', { class: 'station-title' }, s.title),
      h('span', { class: 'station-meta' }, `Stage ${s.stage} · ${done} of ${nodes.length} done${passed ? ' · milestone passed' : ''}`)));
  const details = h('details', { open: current }, h('summary', {}, head),
    s.summary ? h('p', { class: 'small stage-summary' }, s.summary) : '');
  // The weave is built when the stage is first opened (it measures itself to draw the links).
  const fill = () => { if (details.open && !details.querySelector('.weave')) details.append(stageWeave(nodes, p)); };
  details.addEventListener('toggle', fill);
  fill();
  return h('li', { class: `station ${state}` }, details);
}

// ---------------------------------------------------------------- the weave

/**
 * One stage as a woven map: a column per branch, each node placed one row below the deepest node
 * it needs in this stage, and a line drawn for every requirement, so links between branches show
 * as threads crossing the columns. The milestone sits across the bottom. Pointing at a node lights
 * what it needs and what it opens.
 */
export function stageWeave(nodes: NodeView[], p: Progress = { store: realStore, mastery: realMastery }): HTMLElement {
  const byId = new Map(nodes.map((v) => [v.node.id, v]));
  const inStage = (v: NodeView) => v.node.requires.filter((r) => byId.has(r) && byId.get(r)!.node.type !== 'checkpoint');
  const depth = new Map<string, number>();
  const depthOf = (v: NodeView): number => {
    if (depth.has(v.node.id)) return depth.get(v.node.id)!;
    depth.set(v.node.id, 0);
    const d = Math.max(-1, ...inStage(v).map((r) => depthOf(byId.get(r)!))) + 1;
    depth.set(v.node.id, d);
    return d;
  };
  const milestone = nodes.find((v) => v.node.type === 'checkpoint');
  const rest = nodes.filter((v) => v !== milestone);
  rest.forEach(depthOf);
  const cols = GROWING.filter((b) => rest.some((v) => v.node.branch === b));
  const rows = Math.max(0, ...rest.map((v) => depth.get(v.node.id)!)) + 1;

  const tiles = new Map<string, HTMLElement>();
  const tile = (v: NodeView) => {
    const n = v.node;
    const cls = ['weave-node', `branch-${n.branch}`, v.done ? 'done' : '', !v.open && !v.done ? 'bud' : '', p.mastery.isDue(n.id) ? 'due' : '']
      .filter(Boolean).join(' ');
    const a = h('a', { href: `#/lesson/${n.lesson}`, class: cls, 'data-id': n.id, title: n.title },
      h('span', { class: `strand-dot strand-${n.strand}` }), h('span', { class: 'weave-title' }, n.title));
    tiles.set(n.id, a);
    return a;
  };
  const grid = h('div', { class: 'weave-grid', style: `--cols: ${cols.length}; --rows: ${rows + (milestone ? 1 : 0)}` },
    ...cols.map((b, c) => h('a', { class: 'weave-head', href: `#/branch/${b}`, style: `grid-column: ${c + 1}; grid-row: 1` },
      h('span', { class: `strand-dot strand-${b}` }), BRANCH_LABEL[b])),
    ...cols.flatMap((b, c) => Array.from({ length: rows }, (_, r) => {
      const here = rootsFirst(rest.filter((v) => v.node.branch === b && depth.get(v.node.id) === r));
      return here.length ? h('div', { class: 'weave-cell', style: `grid-column: ${c + 1}; grid-row: ${r + 2}` }, ...here.map(tile)) : '';
    })),
    milestone ? h('div', { class: 'weave-cell weave-milestone', style: `grid-column: 1 / -1; grid-row: ${rows + 2}` }, tile(milestone)) : '');
  const svg = svgEl('svg', { class: 'weave-links', 'aria-hidden': 'true' });
  const box = h('div', { class: 'weave' }, svg, grid);

  // Links, drawn from the bottom of what is needed to the top of what it opens.
  const links: { from: string; to: string; cross: boolean; path: SVGPathElement }[] = [];
  for (const v of nodes) {
    for (const r of v.node.requires) {
      const req = byId.get(r);
      if (!req) continue;
      const cross = req.node.branch !== v.node.branch;
      const path = svgEl('path', { class: `weave-link strand-stroke-${req.node.branch}${cross ? ' cross' : ''}${v === milestone ? ' to-milestone' : ''}` });
      links.push({ from: r, to: v.node.id, cross, path });
      svg.append(path);
    }
  }
  const draw = () => {
    const o = box.getBoundingClientRect();
    svg.setAttribute('width', String(box.scrollWidth));
    svg.setAttribute('height', String(box.scrollHeight));
    for (const l of links) {
      const a = tiles.get(l.from)!.getBoundingClientRect();
      const b = tiles.get(l.to)!.getBoundingClientRect();
      const x1 = a.left + a.width / 2 - o.left;
      const y1 = a.bottom - o.top;
      const x2 = b.left + b.width / 2 - o.left;
      const y2 = b.top - o.top;
      const bend = Math.max(18, (y2 - y1) / 2);
      l.path.setAttribute('d', `M ${x1} ${y1} C ${x1} ${y1 + bend}, ${x2} ${y2 - bend}, ${x2} ${y2}`);
    }
  };
  new ResizeObserver(draw).observe(grid);

  // Point at a node: light it, what it needs and what it opens.
  const light = (id: string | null) => {
    box.classList.toggle('lit', !!id);
    const near = new Set<string>();
    for (const l of links) {
      const on = !!id && (l.from === id || l.to === id);
      l.path.classList.toggle('on', on);
      if (on) { near.add(l.from); near.add(l.to); }
    }
    tiles.forEach((t, k) => t.classList.toggle('near', near.has(k) || k === id));
  };
  tiles.forEach((t, id) => {
    t.addEventListener('mouseenter', () => light(id));
    t.addEventListener('focus', () => light(id));
    t.addEventListener('mouseleave', () => light(null));
    t.addEventListener('blur', () => light(null));
  });
  return h('div', { class: 'weave-scroll' }, box,
    h('p', { class: 'small weave-key' }, 'Lines join what a lesson needs to what it opens; coloured threads cross between branches. Point at a lesson to see its links.'));
}

/** Songs that opened with the milestones passed and are not done yet. */
export function songsCard(snap: Map<string, NodeView>): HTMLElement | '' {
  const songs = songList(snap).map((x) => x.steps[0]);
  if (!songs.length) return '';
  const open = songs.filter((v) => v.open);
  const fresh = open.filter((v) => !v.done && !v.reps[0]);
  return h('section', { class: 'card songs-teaser' },
    h('div', { class: 'unit-head' },
      h('h2', {}, 'Songs'),
      h('span', { class: 'unit-progress' }, `${open.length} of ${songs.length} open`)),
    h('p', { class: 'small' }, open.length
      ? `${fresh.length ? `${fresh.length} new to try. ` : ''}Each milestone you pass opens more songs to play for fun.`
      : 'Songs open as you pass milestones. Pass Milestone 1 to open the first ones (or peek any time).'),
    h('div', { class: 'controls' }, h('button', { class: 'secondary', onclick: () => { location.hash = '/songs'; } }, 'Open the songbook')));
}

// ---------------------------------------------------------------- pages

/** Nodes in an order where everything a node needs inside the list comes before it. */
function rootsFirst(vs: NodeView[]): NodeView[] {
  const left = new Map(vs.map((v) => [v.node.id, v]));
  const out: NodeView[] = [];
  while (left.size) {
    const ready = [...left.values()].filter((v) => !v.node.requires.some((r) => left.has(r)));
    for (const v of ready.length ? ready : [...left.values()]) { out.push(v); left.delete(v.node.id); }
  }
  return out;
}

/** One branch from its first node to its last, stage by stage. */
export function branchPage(id: BranchId, p: Progress = { store: realStore, mastery: realMastery }): HTMLElement {
  const b = branches.find((x) => x.id === id);
  if (!b) return h('p', {}, 'Branch not found. ', h('a', { href: '#/' }, 'Home'));
  const snap = snapshot(p);
  const vs = b.nodes.map((n) => snap.get(n.id)!).filter(Boolean);
  const done = vs.filter((v) => v.done).length;
  const byStage = stages.map((s) => ({ s, vs: rootsFirst(vs.filter((v) => v.node.stage === s.stage)) })).filter((x) => x.vs.length);
  return h('section', { class: 'card branch-page' },
    h('div', { class: 'unit-head' },
      h('h2', {}, h('span', { class: `strand-dot strand-${id === 'milestones' ? 'all' : id}` }), ' ', BRANCH_LABEL[id]),
      h('span', { class: 'unit-progress' }, `${done} of ${vs.length} done`)),
    b.summary ? h('p', {}, b.summary) : '',
    h('nav', { class: 'branch-nav small' }, ...[...GROWING, 'songs' as BranchId].map((x) =>
      h('a', { href: x === 'songs' ? '#/songs' : `#/branch/${x}`, class: x === id ? 'current' : '' }, BRANCH_LABEL[x]))),
    ...byStage.map(({ s, vs: list }) => h('div', { class: 'branch-stage' },
      h('h3', {}, `Stage ${s.stage} · ${s.title}`),
      h('ol', { class: 'lessons path-nodes vine' }, ...list.map((v) => {
        const tile = nodeTile(v, { mastery: p.mastery });
        const text = tile.querySelector('.tile-text');
        if (!v.open && !v.done) {
          // Missing nodes of other branches show on the threads line below.
          const need = p.mastery.missing(v.node).map((r) => treeNodes.get(r)).filter((r) => r && (r.branch === id || r.branch === 'milestones'));
          if (need.length) text?.append(h('span', { class: 'tile-needs' }, `Grows after: ${need.map((r) => r!.title).join(', ')}`));
        }
        // What it takes from the other branches, always shown: the threads of the weave.
        const from = v.node.requires.map((r) => treeNodes.get(r)).filter((r) => r && r.branch !== id && r.branch !== 'milestones');
        if (from.length) text?.append(h('span', { class: 'tile-links' }, ...from.map((r) =>
          h('span', { class: 'tile-link' }, h('span', { class: `strand-dot strand-${r!.strand}` }), r!.title))));
        return tile;
      })))));
}

/** Each song once, with its steps in order (a song without steps is its own single step). */
export function songList(snap: Map<string, NodeView>): { song: NodeView; steps: NodeView[] }[] {
  return [...snap.values()]
    .filter((v) => v.node.branch === 'songs' && !v.node.song)
    .map((v) => { const g = songOf(v.node.id)!; return { song: v, steps: g.steps.map((n) => snap.get(n.id)!) }; });
}

/** The milestone a song step opens after, if any. */
const openedBy = (v: NodeView) => treeNodes.get(v.node.requires.find((r) => treeNodes.get(r)?.type === 'checkpoint') ?? '');

/** The songbook: songs grouped by the milestone that opens them (a song in steps: its first step). */
export function songsPage(p: Progress = { store: realStore, mastery: realMastery }): HTMLElement {
  const snap = snapshot(p);
  const songs = songList(snap);
  const groups = new Map<string, typeof songs>();
  for (const x of songs) {
    const ms = openedBy(x.steps[0])?.id ?? '';
    groups.set(ms, [...(groups.get(ms) ?? []), x]);
  }
  const learned = (x: (typeof songs)[number]) => x.steps.every((v) => v.done);
  return h('section', { class: 'card songs-page' },
    h('div', { class: 'unit-head' },
      h('h2', {}, 'Songbook'),
      h('span', { class: 'unit-progress' }, `${songs.filter(learned).length} of ${songs.length} learned`)),
    h('p', {}, 'Tunes to play for fun, nearly all old enough to be free for everyone. Each milestone you pass opens a new shelf. Each song comes in steps: the tune, the left hand, then both together; a bigger song is learned in several steps, each with its own lesson.'),
    h('p', { class: 'banner' }, 'Have a song of your own? ', h('a', { href: '#/mysongs' }, 'Import its MIDI file into My songs'), ' and practise it like any piece.'),
    ...[...groups].map(([msId, list]) => {
      const ms = treeNodes.get(msId);
      const passed = ms ? grown(snap.get(msId)!) : true;
      return h('div', { class: `song-shelf${passed ? '' : ' closed'}` },
        h('h3', {}, ms ? `After ${ms.title}` : 'Any time',
          h('span', { class: `state-badge${passed ? ' solid' : ''}` }, passed ? 'Open' : 'Opens with this milestone')),
        h('ol', { class: 'song-grid' }, ...list.map((x) => {
          const v = x.song;
          const many = x.steps.length > 1;
          const at = x.steps.findIndex((st) => !st.done);
          return h('li', { class: learned(x) ? 'done' : '' },
            h('a', { href: many ? `#/song/${v.node.id}` : `#/lesson/${v.node.lesson}` },
              h('span', { class: 'song-title' }, v.node.title),
              v.node.about ? h('span', { class: 'song-about' }, v.node.about) : '',
              many
                ? h('span', { class: 'state-badge' }, at < 0 ? `${x.steps.length} steps learned` : `Step ${at + 1} of ${x.steps.length}`)
                : stateBadge(v, p.mastery.isDue(v.node.id))));
        })));
    }));
}

/** A song taught in steps: its steps in order, each a lesson, with the milestone it opens after. */
export function songPage(id: string, p: Progress = { store: realStore, mastery: realMastery }): HTMLElement {
  const g = songOf(id);
  if (!g) return h('p', {}, 'Song not found. ', h('a', { href: '#/songs' }, 'Songbook'));
  const snap = snapshot(p);
  const steps = g.steps.map((n) => snap.get(n.id)!);
  const at = steps.findIndex((v) => !v.done);
  return h('section', { class: 'card songs-page song-steps' },
    h('div', { class: 'unit-head' },
      h('h2', {}, g.song.title),
      h('span', { class: 'unit-progress' }, at < 0 ? 'Learned' : `Step ${at + 1} of ${steps.length}`)),
    g.song.about ? h('p', { class: 'small' }, g.song.about) : '',
    h('p', {}, `Learned in ${steps.length} steps, one lesson each, from the first notes to the whole song. Later steps open with later milestones; you can peek ahead any time.`),
    h('ol', { class: 'lessons path-nodes growing-list' }, ...steps.map((v, i) => {
      const ms = openedBy(v);
      const ahead = ms && !grown(snap.get(ms.id)!);
      return h('li', { class: [v.done ? 'done' : '', i === at ? 'next' : '', !v.open && !v.done ? 'bud' : ''].filter(Boolean).join(' ') },
        h('a', { href: `#/lesson/${v.node.lesson}` },
          h('span', { class: 'strand-dot strand-songs' }),
          h('span', { class: 'tile-text' },
            h('span', { class: 'tile-title' }, `Step ${i + 1}: ${stepTitle(v.node, g.song)}`),
            ahead ? h('span', { class: 'tile-meta' }, `Best after ${ms.title}`) : ''),
          stateBadge(v, p.mastery.isDue(v.node.id))));
    })),
    h('div', { class: 'controls' }, h('button', { class: 'secondary', onclick: () => { location.hash = '/songs'; } }, 'Songbook')));
}
