import { parse as parseYaml } from 'yaml';
import type { Lesson } from './types';

// The mastery tree: content/tree/. One file per branch (technique, reading, rhythm, theory, ear,
// pieces, creativity), plus the milestones that make the trunk and the songs that open after them,
// and stages.yaml naming the stages between milestones. A node opens once the nodes it requires
// are far enough along, so the tree grows in every branch at once instead of along one line.
// The format is described in content/README.md, the design in docs/mastery-curriculum.md.

export const STRANDS = ['technique', 'reading', 'rhythm', 'theory', 'ear', 'repertoire', 'creativity', 'songs'] as const;
export type Strand = (typeof STRANDS)[number];

/** Branch files, in the order the tree shows them. `milestones` is the trunk. */
export const BRANCHES = ['technique', 'reading', 'rhythm', 'theory', 'ear', 'repertoire', 'creativity', 'milestones', 'songs'] as const;
export type BranchId = (typeof BRANCHES)[number];

export const NODE_TYPES = ['lesson', 'drill', 'piece', 'checkpoint', 'side-quest', 'song'] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export interface TreeNode {
  id: string;
  type: NodeType;
  branch: BranchId;
  /** The branch as a strand; `all` for milestones, which sample every strand. */
  strand: Strand | 'all';
  title: string;
  /** The stage the node belongs to (1 = the first, ending at milestone 1). */
  stage: number;
  /** Lesson id under content/lessons, once the node is written. */
  lesson?: string;
  requires: string[];
  /** Designed but not written yet. */
  planned: boolean;
  /** Songs: where the tune comes from ("Folk song, France", "Beethoven, 1824"). */
  about?: string;
  /** Songs taught in steps: the song this node is a step of (the node that plays the whole song). */
  song?: string;
}

export interface TreeBranch {
  id: BranchId;
  title: string;
  summary: string;
  nodes: TreeNode[];
}

export interface TreeStage {
  stage: number;
  title: string;
  summary: string;
  /** The milestone that closes the stage. */
  milestone?: TreeNode;
}

export interface TreeResult {
  stages: TreeStage[];
  branches: TreeBranch[];
  /** Every node, in path order: by stage, then branch, then as listed. */
  nodes: Map<string, TreeNode>;
  errors: string[];
}

const DEFAULT_TYPE: Partial<Record<BranchId, NodeType>> = { milestones: 'checkpoint', songs: 'song', repertoire: 'piece' };

type Raw = Record<string, unknown>;

class FieldError extends Error {}

function text(o: Raw, key: string, where: string): string {
  const v = o[key];
  if (typeof v !== 'string' && typeof v !== 'number') throw new FieldError(`${where}: missing "${key}"`);
  return String(v);
}

function list(v: unknown, where: string): string[] {
  if (v === undefined) return [];
  if (!Array.isArray(v)) throw new FieldError(`${where} should be a list`);
  return v.map(String);
}

export function loadTree(files: Record<string, string>, lessons: Map<string, Lesson>): TreeResult {
  const errors: string[] = [];
  const stages: TreeStage[] = [];
  const branches: TreeBranch[] = [];
  const all = new Map<string, TreeNode>();

  const entries = Object.entries(files).filter(([path]) => path.includes('/tree/')).sort(([a], [b]) => a.localeCompare(b));
  for (const [path, body] of entries) {
    const where = path.slice(path.indexOf('content/'));
    try {
      const raw = parseYaml(body) as Raw;
      if (!raw || typeof raw !== 'object') throw new FieldError('file is empty or not a mapping');
      if (raw.stages !== undefined) {
        if (!Array.isArray(raw.stages)) throw new FieldError('"stages" should be a list');
        for (const s of raw.stages as Raw[]) {
          stages.push({ stage: Number(text(s, 'stage', 'stage')), title: text(s, 'title', 'stage'), summary: s.summary ? String(s.summary) : '' });
        }
        continue;
      }
      const id = text(raw, 'branch', where) as BranchId;
      if (!BRANCHES.includes(id)) throw new FieldError(`"branch" should be one of ${BRANCHES.join(', ')}`);
      if (branches.some((b) => b.id === id)) throw new FieldError(`branch "${id}" is in two files`);
      if (!Array.isArray(raw.nodes)) throw new FieldError('"nodes" should be a list');
      const branch: TreeBranch = { id, title: text(raw, 'title', where), summary: raw.summary ? String(raw.summary) : '', nodes: [] };
      for (const n of raw.nodes as Raw[]) {
        try {
          const node = parseNode(n, id);
          if (all.has(node.id)) throw new FieldError(`duplicate node id "${node.id}"`);
          all.set(node.id, node);
          branch.nodes.push(node);
        } catch (e) {
          errors.push(`${where}: node ${String((n as Raw)?.id ?? '?')}: ${(e as Error).message}`);
        }
      }
      branches.push(branch);
    } catch (e) {
      errors.push(`${where}: ${(e as Error).message}`);
    }
  }
  branches.sort((a, b) => BRANCHES.indexOf(a.id) - BRANCHES.indexOf(b.id));
  stages.sort((a, b) => a.stage - b.stage);
  stages.forEach((s, i) => { if (s.stage !== i + 1) errors.push(`tree: stage ${i + 1} is missing`); });

  // Every stage ends with exactly one milestone; every node sits in a known stage.
  for (const s of stages) {
    const ms = [...all.values()].filter((n) => n.type === 'checkpoint' && n.stage === s.stage);
    if (ms.length !== 1) errors.push(`tree: stage ${s.stage} has ${ms.length} milestones, should have 1`);
    s.milestone = ms[0];
  }
  for (const n of all.values()) {
    if (!stages.some((s) => s.stage === n.stage)) errors.push(`node ${n.id}: stage ${n.stage} is not in stages.yaml`);
    if (n.type === 'checkpoint' && n.branch !== 'milestones') errors.push(`node ${n.id}: checkpoints belong in milestones.yaml`);
    if (n.song !== undefined) {
      const whole = all.get(n.song);
      if (n.branch !== 'songs') errors.push(`node ${n.id}: only songs can be steps of a song`);
      else if (!whole || whole.branch !== 'songs' || whole.song !== undefined) errors.push(`node ${n.id}: song "${n.song}" should be a song node that is not itself a step`);
    }
    for (const r of n.requires) {
      const req = all.get(r);
      if (!req) { errors.push(`node ${n.id}: requires "${r}", which is not a node`); continue; }
      // Requirements never point forward: a later stage, or a milestone of the same stage.
      if (req.stage > n.stage || (req.type === 'checkpoint' && req.stage >= n.stage)) {
        errors.push(`node ${n.id} (stage ${n.stage}): requires "${r}" from stage ${req.stage}`);
      }
    }
  }
  errors.push(...cycles(all));

  for (const n of all.values()) {
    if (n.lesson && !lessons.has(n.lesson)) errors.push(`node ${n.id}: lesson "${n.lesson}" not found`);
  }
  const placed = new Map<string, string>();
  for (const n of all.values()) {
    if (!n.lesson) continue;
    if (placed.has(n.lesson)) errors.push(`tree: lesson "${n.lesson}" is placed twice (${placed.get(n.lesson)}, ${n.id})`);
    placed.set(n.lesson, n.id);
  }
  for (const id of lessons.keys()) {
    if (!placed.has(id)) errors.push(`tree: lesson "${id}" is not placed in the tree`);
  }

  const ordered = [...all.values()].sort((a, b) =>
    a.stage - b.stage || BRANCHES.indexOf(a.branch) - BRANCHES.indexOf(b.branch));
  return { stages, branches, nodes: new Map(ordered.map((n) => [n.id, n])), errors };
}

function cycles(nodes: Map<string, TreeNode>): string[] {
  const state = new Map<string, 1 | 2>();
  const found: string[] = [];
  const visit = (id: string, trail: string[]) => {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) { found.push(`tree: requirements go round in a loop: ${[...trail, id].join(' → ')}`); return; }
    state.set(id, 1);
    for (const r of nodes.get(id)?.requires ?? []) if (nodes.has(r)) visit(r, [...trail, id]);
    state.set(id, 2);
  };
  for (const id of nodes.keys()) visit(id, []);
  return found;
}

function parseNode(raw: Raw, branch: BranchId): TreeNode {
  const id = text(raw, 'id', 'node');
  const type = (raw.type === undefined ? DEFAULT_TYPE[branch] ?? 'lesson' : text(raw, 'type', 'node')) as NodeType;
  if (!NODE_TYPES.includes(type)) throw new FieldError(`"type" should be one of ${NODE_TYPES.join(', ')}`);
  if ((type === 'checkpoint') !== (branch === 'milestones')) throw new FieldError('milestones.yaml holds the checkpoints, and only them');
  if ((type === 'song') !== (branch === 'songs')) throw new FieldError('songs.yaml holds the songs, and only them');
  const stage = Number(raw.stage);
  if (!Number.isInteger(stage) || stage < 1) throw new FieldError('"stage" should be a whole number from 1');
  const planned = raw.planned === true;
  const lesson = raw.lesson === undefined ? undefined : String(raw.lesson);
  if (!planned && !lesson) throw new FieldError('a node that is not planned needs a "lesson"');
  const strand: Strand | 'all' = branch === 'milestones' ? 'all' : branch;
  return {
    id, type, branch, strand, stage, title: text(raw, 'title', 'node'), lesson, requires: list(raw.requires, '"requires"'), planned,
    ...(raw.about !== undefined ? { about: String(raw.about) } : {}),
    ...(raw.song !== undefined ? { song: String(raw.song) } : {}),
  };
}
