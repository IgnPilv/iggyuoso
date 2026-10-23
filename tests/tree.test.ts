import { describe, expect, it } from 'vitest';
import { loadTree } from '../src/content/tree';
import { readContentFiles, realContent } from './helpers';

const lessons = () => realContent().content.lessons;

describe('content/tree/', () => {
  it('loads all five years without problems', () => {
    const { years, nodes, errors } = loadTree(readContentFiles(), lessons());
    expect(errors).toEqual([]);
    expect(years.map((y) => y.year)).toEqual([1, 2, 3, 4, 5]);
    expect(nodes.size).toBeGreaterThan(40);
  });
});

describe('tree validation', () => {
  const year = (units: string) =>
    `year: 1\ntitle: T\nlevel: L\ngoal: G\nunits:\n${units}`;
  const errs = (units: string, extra: Record<string, string> = {}) =>
    loadTree({ 'content/tree/year-1.yaml': year(units), ...extra }, new Map()).errors;
  const cps = `
  - id: z
    title: Z
    outline: { ear: [x] }
    checkpoint: c1
  - id: y
    title: Y
    outline: { ear: [x] }
    checkpoint: c2
  - id: x
    title: X
    outline: { ear: [x] }
    checkpoint: c3`;

  it('accepts a year with three checkpoints', () => {
    expect(errs(cps)).toEqual([]);
  });

  it('needs three checkpoints a year', () => {
    expect(errs(cps.split('  - id: x')[0])[0]).toMatch(/has 2 checkpoints/);
  });

  it('catches prerequisites that are unknown or come later', () => {
    const e = errs(`
  - id: u
    title: U
    nodes:
      - { id: a, type: drill, strand: ear, planned: true, title: A, requires: [b] }
      - { id: b, type: drill, strand: ear, planned: true, title: B }${cps}`);
    expect(e[0]).toMatch(/requires "b", which is not an earlier node/);
  });

  it('catches bad strands, types and missing lessons', () => {
    const e = errs(`
  - id: u
    title: U
    nodes:
      - { id: a, type: drill, strand: singing, planned: true, title: A }
      - { id: b, type: song, strand: ear, planned: true, title: B }
      - { id: c, type: drill, strand: ear, title: C }
      - { id: d, type: lesson, strand: ear, lesson: nope, title: D }${cps}`);
    expect(e.join('\n')).toMatch(/"strand" should be/);
    expect(e.join('\n')).toMatch(/"type" should be/);
    expect(e.join('\n')).toMatch(/needs a "lesson"/);
    expect(e).toContain('node d: lesson "nope" not found');
  });

  it('catches lessons that are not placed in the tree', () => {
    const lessons = new Map([['lonely', { id: 'lonely', title: '', unit: '', skills: [], steps: [], recap: '' }]]);
    expect(loadTree({ 'content/tree/year-1.yaml': year(cps) }, lessons).errors).toContain('tree: lesson "lonely" is not placed in the tree');
  });
});
