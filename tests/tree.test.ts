import { describe, expect, it } from 'vitest';
import { loadTree } from '../src/modules/piano/content/tree';
import { readContentFiles, realContent } from './helpers';

const lessons = () => realContent().content.lessons;

describe('content/tree/', () => {
  it('loads every branch and stage without problems', () => {
    const { stages, branches, nodes, errors } = loadTree(readContentFiles(), lessons());
    expect(errors).toEqual([]);
    expect(stages.length).toBeGreaterThanOrEqual(6);
    expect(stages.every((s) => s.milestone)).toBe(true);
    expect(branches.map((b) => b.id)).toEqual(['technique', 'reading', 'rhythm', 'theory', 'ear', 'repertoire', 'creativity', 'milestones', 'songs']);
    expect(nodes.size).toBeGreaterThan(100);
  });

  it('lists nodes in path order: by stage, then branch', () => {
    const { nodes } = loadTree(readContentFiles(), lessons());
    const stages = [...nodes.values()].map((n) => n.stage);
    expect(stages).toEqual([...stages].sort((a, b) => a - b));
  });

  it('opens every song with a milestone', () => {
    const { nodes } = loadTree(readContentFiles(), lessons());
    for (const n of nodes.values()) {
      if (n.branch !== 'songs') continue;
      expect(n.requires.some((r) => nodes.get(r)?.type === 'checkpoint'), n.id).toBe(true);
    }
  });
  it('puts every song in a Songbook group', () => {
    const { nodes } = loadTree(readContentFiles(), lessons());
    for (const n of nodes.values()) if (n.branch === 'songs' && !n.song) expect(n.genre, n.id).toBeDefined();
  });
  it('keeps a song taught in steps together: its steps point at the whole song, in order', () => {
    const { nodes } = loadTree(readContentFiles(), lessons());
    const steps = [...nodes.values()].filter((n) => n.song === 'song-wim').map((n) => n.id);
    expect(steps).toEqual(['song-wim-riff', 'song-wim-chords', 'song-wim-verse', 'song-wim-hook', 'song-wim-arpeggios', 'song-wim-chorus']);
    expect(nodes.get('song-wim')?.song).toBeUndefined();
  });
});

describe('tree validation', () => {
  const stages = 'stages:\n  - { stage: 1, title: One }\n  - { stage: 2, title: Two }\n';
  const milestones = 'branch: milestones\ntitle: M\nnodes:\n  - { id: m1, stage: 1, title: M1, planned: true }\n  - { id: m2, stage: 2, title: M2, planned: true, requires: [m1] }\n';
  const errs = (branch: string, extra: Record<string, string> = {}) =>
    loadTree({ 'content/tree/stages.yaml': stages, 'content/tree/milestones.yaml': milestones, 'content/tree/ear.yaml': `branch: ear\ntitle: Ear\nnodes:\n${branch}`, ...extra }, new Map()).errors;

  it('accepts a small tree', () => {
    expect(errs('  - { id: a, stage: 1, title: A, planned: true }\n  - { id: b, stage: 2, title: B, planned: true, requires: [a, m1] }\n')).toEqual([]);
  });

  it('needs one milestone per stage', () => {
    const e = loadTree({ 'content/tree/stages.yaml': stages, 'content/tree/milestones.yaml': milestones.split('  - { id: m2')[0] }, new Map()).errors;
    expect(e).toContain('tree: stage 2 has 0 milestones, should have 1');
  });

  it('catches requirements that are unknown, later or in a loop', () => {
    const e = errs([
      '  - { id: a, stage: 1, title: A, planned: true, requires: [zz] }',
      '  - { id: b, stage: 1, title: B, planned: true, requires: [c] }',
      '  - { id: c, stage: 2, title: C, planned: true }',
      '  - { id: d, stage: 1, title: D, planned: true, requires: [m1] }',
      '  - { id: e, stage: 2, title: E, planned: true, requires: [f] }',
      '  - { id: f, stage: 2, title: F, planned: true, requires: [e] }',
    ].join('\n') + '\n').join('\n');
    expect(e).toMatch(/node a: requires "zz", which is not a node/);
    expect(e).toMatch(/node b \(stage 1\): requires "c" from stage 2/);
    expect(e).toMatch(/node d \(stage 1\): requires "m1" from stage 1/);
    expect(e).toMatch(/go round in a loop/);
  });

  it('catches bad branches, types and missing lessons', () => {
    const e = errs([
      '  - { id: a, stage: 1, title: A, planned: true, type: song }',
      '  - { id: c, stage: 1, title: C }',
      '  - { id: d, stage: 1, title: D, lesson: nope }',
      '  - { id: g, stage: 9, title: G, planned: true }',
    ].join('\n') + '\n', { 'content/tree/singing.yaml': 'branch: singing\ntitle: S\nnodes: []' }).join('\n');
    expect(e).toMatch(/"branch" should be one of/);
    expect(e).toMatch(/songs.yaml holds the songs/);
    expect(e).toMatch(/needs a "lesson"/);
    expect(e).toMatch(/node d: lesson "nope" not found/);
    expect(e).toMatch(/node g: stage 9 is not in stages.yaml/);
  });

  it('catches lessons that are not placed in the tree, or placed twice', () => {
    const lesson = { id: 'lonely', title: '', skills: [], steps: [], recap: '' };
    expect(loadTree({ 'content/tree/stages.yaml': stages, 'content/tree/milestones.yaml': milestones }, new Map([['lonely', lesson]])).errors)
      .toContain('tree: lesson "lonely" is not placed in the tree');
    const twice = errs('  - { id: a, stage: 1, title: A, lesson: lonely }\n  - { id: b, stage: 1, title: B, lesson: lonely }\n');
    expect(twice.join('\n')).toMatch(/placed twice/);
  });
});
