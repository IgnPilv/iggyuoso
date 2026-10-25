import { describe, expect, it } from 'vitest';
import { MODULES } from '../src/app/modules';
import { treeNodes } from '../src/modules/piano/content';

import { ROOM, roomFor } from '../src/modules/piano/ui/practiceRoom';

describe('practice room', () => {
  it('lists the eight games and tools, each with a page', () => {
    expect(ROOM.map((t) => t.route).sort()).toEqual(['byear', 'chords', 'duet', 'jam', 'noterush', 'pulse', 'report', 'scales']);
    for (const t of ROOM) expect(MODULES[0].routes[t.route], t.route).toBeTypeOf('function');
  });

  it('points at real milestones and nodes of a written lesson', () => {
    for (const t of ROOM) {
      if (t.after) expect(treeNodes.get(t.after)?.type, t.after).toBe('checkpoint');
      expect(t.nodes.length, t.route).toBeGreaterThan(0);
      for (const id of t.nodes) expect(treeNodes.get(id)?.lesson, `${t.route}: ${id}`).toBeTruthy();
    }
  });

  it('is suggested on the lessons it fits', () => {
    const lessonOf = (id: string) => treeNodes.get(id)!.lesson!;
    expect(roomFor(lessonOf('steady-beat')).map((t) => t.name)).toEqual(['Timing mirror']);
    expect(roomFor(lessonOf('c-scale-hands-together')).map((t) => t.name)).toEqual(['Scale gym']);
    expect(roomFor(lessonOf('recital-three-pieces')).map((t) => t.name)).toEqual(['Duet', 'Play report']);
    expect(roomFor(lessonOf('high-and-low'))).toEqual([]);
  });
});
