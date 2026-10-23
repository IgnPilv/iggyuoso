import { branches, content, stages, treeNodes } from '../content';
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
  // A seedling until something is practised; then the trunk rises with the milestones.
  const trunkH = reached ? 150 + 170 * (passed / Math.max(1, stages.length)) : 70;
  const top = GROUND - trunkH;
  const parts: SVGElement[] = [];

  parts.push(svgEl('ellipse', { cx: W / 2, cy: GROUND + 6, rx: 180, ry: 12, class: 'tree-ground' }));
  // Trunk: a tapering shape, wide at the roots.
  const bw = reached ? 30 : 12;
  const tw = reached ? 12 : 6;
  parts.push(svgEl('path', {
    class: 'tree-trunk',
    d: `M ${W / 2 - bw / 2} ${GROUND} C ${W / 2 - bw / 2 + 4} ${GROUND - trunkH * 0.5}, ${W / 2 - tw / 2} ${top + 30}, ${W / 2 - tw / 2} ${top}
        L ${W / 2 + tw / 2} ${top} C ${W / 2 + tw / 2} ${top + 30}, ${W / 2 + bw / 2 - 4} ${GROUND - trunkH * 0.5}, ${W / 2 + bw / 2} ${GROUND} Z`,
  }));
  // Milestone rings on the trunk.
  for (let i = 0; i < passed; i++) {
    const y = GROUND - 26 - i * ((trunkH - 50) / Math.max(1, stages.length));
    parts.push(svgEl('circle', { cx: W / 2, cy: y, r: 5, class: 'tree-ring' }));
  }

  if (!reached) {
    // A seedling: two small leaves and a bud.
    parts.push(svgEl('ellipse', { cx: W / 2 - 16, cy: top + 6, rx: 16, ry: 7, transform: `rotate(-25 ${W / 2 - 16} ${top + 6})`, class: 'tree-leaf strand-fill-ear' }));
    parts.push(svgEl('ellipse', { cx: W / 2 + 16, cy: top + 6, rx: 16, ry: 7, transform: `rotate(25 ${W / 2 + 16} ${top + 6})`, class: 'tree-leaf strand-fill-technique' }));
    parts.push(svgEl('circle', { cx: W / 2, cy: top - 4, r: 7, class: 'tree-bud' }));
  }

  GROWING.forEach((b, i) => {
    const nodes = [...snap.values()].filter((v) => v.node.branch === b && v.node.lesson);
    if (!nodes.length || !reached) return;
    const share = nodes.filter(grown).length / nodes.length;
    const side = b === 'creativity' ? 0 : i % 2 === 0 ? -1 : 1;
    const at = b === 'creativity' ? top : GROUND - trunkH * (0.38 + 0.1 * Math.floor(i / 2));
    const len = 60 + 190 * Math.sqrt(share);
    const x0 = W / 2;
    const y0 = at;
    const x1 = x0 + side * len;
    const y1 = y0 - (side ? 40 + len * 0.35 : len * 0.55);
    const cx = x0 + side * len * 0.45;
    const cy = y0 - (side ? 8 : len * 0.4);
    const point = (t: number) => ({
      x: (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1,
      y: (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1,
    });
    const g = svgEl('g', { class: `tree-branch branch-${b}`, role: 'link', tabindex: '0', 'aria-label': `${BRANCH_LABEL[b]} branch` });
    g.append(svgEl('path', { d: `M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y1}`, class: `tree-limb strand-stroke-${b}` }));
    // Leaves along the limb, alternating sides; at most 16, each standing for a share of the nodes.
    const leaves = nodes.filter(grown);
    const shown = Math.min(16, leaves.length);
    for (let k = 0; k < shown; k++) {
      const v = leaves[Math.floor((k * leaves.length) / shown)];
      const t = 0.18 + (0.78 * (k + 1)) / (shown + 1);
      const p = point(t);
      const flip = k % 2 ? 1 : -1;
      const angle = (side || 1) * -30 + flip * 45;
      const full = v.state === 'solid' || v.state === 'mastered';
      g.append(svgEl('ellipse', {
        cx: p.x + flip * 7, cy: p.y - 6, rx: full ? 11 : 9, ry: full ? 5.5 : 4.5,
        transform: `rotate(${angle} ${p.x + flip * 7} ${p.y - 6})`,
        class: `tree-leaf strand-fill-${b}${full ? '' : ' pale'}`,
      }));
    }
    const open = nodes.filter((v) => v.open && !v.done).length;
    if (open) g.append(svgEl('circle', { cx: x1, cy: y1, r: 8, class: `tree-bud strand-fill-${b}` }));
    const label = svgEl('text', {
      x: x1 + (side === 0 ? 0 : side * 14), y: y1 + (side === 0 ? -16 : 5),
      'text-anchor': side < 0 ? 'end' : side > 0 ? 'start' : 'middle', class: 'tree-label',
    });
    label.textContent = `${BRANCH_LABEL[b]} ${nodes.filter(grown).length}/${nodes.length}`;
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
    parts.push(svgEl('circle', { cx: W / 2 + Math.cos(a) * r * 1.6, cy: top - 30 + Math.sin(a) * r * 0.6, r: 4.5, class: 'tree-blossom' }));
  });

  return svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'growing-tree', role: 'img', 'aria-label': 'Your tree' }, ...parts);
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
      h('span', { class: 'unit-progress' }, 'Stages up the trunk; each milestone grows the next one.')),
    h('ul', { class: 'strand-legend', 'aria-label': 'Branches' },
      ...GROWING.map((k) => h('li', {}, h('span', { class: `strand-dot strand-${k}` }), BRANCH_LABEL[k]))),
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
  const rows = [...GROWING, 'milestones' as BranchId].map((b) => {
    const vs = nodes.filter((v) => v.node.branch === b);
    if (!vs.length) return '';
    return h('div', { class: 'stage-row' },
      h('span', { class: 'stage-row-label' }, h('span', { class: `strand-dot strand-${b === 'milestones' ? 'all' : b}` }), h('a', { href: `#/branch/${b}` }, BRANCH_LABEL[b])),
      h('ol', { class: 'lessons path-nodes' }, ...vs.map((v) => nodeTile(v, { mastery: p.mastery }))));
  });
  return h('li', { class: `station ${state}` },
    h('details', { open: current }, h('summary', {}, head),
      s.summary ? h('p', { class: 'small stage-summary' }, s.summary) : '',
      ...rows));
}

/** Songs that opened with the milestones passed and are not done yet. */
export function songsCard(snap: Map<string, NodeView>): HTMLElement | '' {
  const songs = [...snap.values()].filter((v) => v.node.branch === 'songs' && v.node.lesson);
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

/** One branch from its first node to its last, stage by stage. */
export function branchPage(id: BranchId, p: Progress = { store: realStore, mastery: realMastery }): HTMLElement {
  const b = branches.find((x) => x.id === id);
  if (!b) return h('p', {}, 'Branch not found. ', h('a', { href: '#/' }, 'Home'));
  const snap = snapshot(p);
  const vs = b.nodes.map((n) => snap.get(n.id)!).filter(Boolean);
  const done = vs.filter((v) => v.done).length;
  const byStage = stages.map((s) => ({ s, vs: vs.filter((v) => v.node.stage === s.stage) })).filter((x) => x.vs.length);
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
        if (!v.open && !v.done) {
          const need = p.mastery.missing(v.node).map((r) => treeNodes.get(r)?.title ?? r);
          tile.append(h('span', { class: 'tile-needs' }, `Grows after: ${need.join(', ')}`));
        }
        return tile;
      })))));
}

/** The songbook: songs grouped by the milestone that opens them. */
export function songsPage(p: Progress = { store: realStore, mastery: realMastery }): HTMLElement {
  const snap = snapshot(p);
  const songs = [...snap.values()].filter((v) => v.node.branch === 'songs');
  const groups = new Map<string, NodeView[]>();
  for (const v of songs) {
    const ms = v.node.requires.find((r) => treeNodes.get(r)?.type === 'checkpoint') ?? '';
    groups.set(ms, [...(groups.get(ms) ?? []), v]);
  }
  return h('section', { class: 'card songs-page' },
    h('div', { class: 'unit-head' },
      h('h2', {}, 'Songbook'),
      h('span', { class: 'unit-progress' }, `${songs.filter((v) => v.done).length} of ${songs.length} learned`)),
    h('p', {}, 'Tunes to play for fun, old enough to be free for everyone. Each milestone you pass opens a new shelf. Each song comes in steps: the tune, the left hand, then both together.'),
    ...[...groups].map(([msId, list]) => {
      const ms = treeNodes.get(msId);
      const passed = ms ? grown(snap.get(msId)!) : true;
      return h('div', { class: `song-shelf${passed ? '' : ' closed'}` },
        h('h3', {}, ms ? `After ${ms.title}` : 'Any time',
          h('span', { class: `state-badge${passed ? ' solid' : ''}` }, passed ? 'Open' : 'Opens with this milestone')),
        h('ol', { class: 'song-grid' }, ...list.map((v) => h('li', { class: v.done ? 'done' : '' },
          h('a', { href: `#/lesson/${v.node.lesson}` },
            h('span', { class: 'song-title' }, v.node.title),
            v.node.about ? h('span', { class: 'song-about' }, v.node.about) : '',
            stateBadge(v, p.mastery.isDue(v.node.id)))))));
    }));
}
