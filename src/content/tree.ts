import { parse as parseYaml } from 'yaml';
import type { Lesson } from './types';

// The mastery tree: content/tree/year-N.yaml. Years hold units in path order; a unit is either
// built (a list of nodes) or still an outline (topics per strand). The format is described in
// content/README.md, the design in docs/mastery-curriculum.md.

export const STRANDS = ['technique', 'reading', 'rhythm', 'theory', 'ear', 'repertoire', 'creativity'] as const;
export type Strand = (typeof STRANDS)[number];

export const NODE_TYPES = ['lesson', 'drill', 'piece', 'checkpoint', 'side-quest'] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export interface TreeNode {
  id: string;
  type: NodeType;
  /** `all` only for checkpoints, which sample every strand. */
  strand: Strand | 'all';
  title: string;
  /** Lesson id under content/lessons, once the node is written. */
  lesson?: string;
  requires: string[];
  /** Designed but not written yet. */
  planned: boolean;
  year: number;
  unit: string;
}

export interface TreeUnit {
  id: string;
  title: string;
  nodes: TreeNode[];
  outline: Partial<Record<Strand, string[]>>;
  /** Checkpoint id for an outlined unit (built units list theirs as nodes). */
  checkpoint?: string;
}

export interface TreeYear {
  year: number;
  title: string;
  level: string;
  goal: string;
  units: TreeUnit[];
}

export interface TreeResult {
  years: TreeYear[];
  nodes: Map<string, TreeNode>;
  errors: string[];
}

export const CHECKPOINTS_PER_YEAR = 3;

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
  const years: TreeYear[] = [];
  const nodes = new Map<string, TreeNode>();
  const checkpointIds = new Set<string>();

  const entries = Object.entries(files)
    .filter(([path]) => path.includes('/tree/'))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  for (const [path, body] of entries) {
    const where = path.slice(path.indexOf('content/'));
    try {
      const raw = parseYaml(body) as Raw;
      if (!raw || typeof raw !== 'object') throw new FieldError('file is empty or not a mapping');
      const year = Number(raw.year);
      if (!Number.isInteger(year) || year < 1) throw new FieldError('"year" should be a whole number');
      if (!Array.isArray(raw.units) || raw.units.length === 0) throw new FieldError('"units" should be a non-empty list');
      const units = raw.units.map((u) => parseUnit(u as Raw, year, nodes, checkpointIds, errors));
      const checkpoints = units.reduce(
        (n, u) => n + u.nodes.filter((x) => x.type === 'checkpoint').length + (u.checkpoint ? 1 : 0), 0);
      if (checkpoints !== CHECKPOINTS_PER_YEAR) {
        errors.push(`${where}: year ${year} has ${checkpoints} checkpoints, should have ${CHECKPOINTS_PER_YEAR}`);
      }
      years.push({ year, title: text(raw, 'title', 'year'), level: text(raw, 'level', 'year'), goal: text(raw, 'goal', 'year'), units });
    } catch (e) {
      errors.push(`${where}: ${(e as Error).message}`);
    }
  }

  years.sort((a, b) => a.year - b.year);
  years.forEach((y, i) => {
    if (y.year !== i + 1) errors.push(`tree: year ${i + 1} is missing`);
  });

  for (const n of nodes.values()) {
    if (n.lesson && !lessons.has(n.lesson)) errors.push(`node ${n.id}: lesson "${n.lesson}" not found`);
  }
  const placed = new Set([...nodes.values()].map((n) => n.lesson).filter(Boolean));
  for (const id of lessons.keys()) {
    if (!placed.has(id)) errors.push(`tree: lesson "${id}" is not placed in the tree`);
  }
  return { years, nodes, errors };
}

function parseUnit(raw: Raw, year: number, nodes: Map<string, TreeNode>, checkpointIds: Set<string>, errors: string[]): TreeUnit {
  const id = text(raw, 'id', 'unit');
  const title = text(raw, 'title', `unit ${id}`);
  const hasNodes = Array.isArray(raw.nodes);
  const hasOutline = raw.outline !== undefined;
  if (hasNodes === hasOutline) throw new FieldError(`unit ${id}: give either "nodes" or "outline"`);

  const outline: TreeUnit['outline'] = {};
  if (hasOutline) {
    for (const [strand, topics] of Object.entries(raw.outline as Raw)) {
      if (!STRANDS.includes(strand as Strand)) throw new FieldError(`unit ${id}: unknown strand "${strand}"`);
      outline[strand as Strand] = list(topics, `unit ${id}: outline.${strand}`);
    }
  }
  const checkpoint = raw.checkpoint === undefined ? undefined : String(raw.checkpoint);
  if (checkpoint) {
    if (checkpointIds.has(checkpoint) || nodes.has(checkpoint)) errors.push(`unit ${id}: duplicate checkpoint "${checkpoint}"`);
    checkpointIds.add(checkpoint);
  }

  const unitNodes: TreeNode[] = [];
  for (const n of hasNodes ? (raw.nodes as Raw[]) : []) {
    try {
      const node = parseNode(n, year, id);
      if (nodes.has(node.id)) throw new FieldError(`duplicate node id "${node.id}"`);
      // Prerequisites must come earlier in path order, which also rules out cycles.
      for (const r of node.requires) {
        if (!nodes.has(r)) throw new FieldError(`requires "${r}", which is not an earlier node`);
      }
      nodes.set(node.id, node);
      unitNodes.push(node);
    } catch (e) {
      errors.push(`node ${String((n as Raw)?.id ?? '?')} (unit ${id}): ${(e as Error).message}`);
    }
  }
  return { id, title, nodes: unitNodes, outline, checkpoint };
}

function parseNode(raw: Raw, year: number, unit: string): TreeNode {
  const id = text(raw, 'id', 'node');
  const type = text(raw, 'type', 'node') as NodeType;
  if (!NODE_TYPES.includes(type)) throw new FieldError(`"type" should be one of ${NODE_TYPES.join(', ')}`);
  const strand = text(raw, 'strand', 'node') as Strand | 'all';
  if (strand === 'all' ? type !== 'checkpoint' : !STRANDS.includes(strand)) {
    throw new FieldError(`"strand" should be one of ${STRANDS.join(', ')} (or all, for checkpoints)`);
  }
  const planned = raw.planned === true;
  const lesson = raw.lesson === undefined ? undefined : String(raw.lesson);
  if (!planned && !lesson) throw new FieldError('a node that is not planned needs a "lesson"');
  return { id, type, strand, title: text(raw, 'title', 'node'), lesson, requires: list(raw.requires, '"requires"'), planned, year, unit };
}

