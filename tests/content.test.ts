import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/content/load';
import { realContent } from './helpers';

describe('content/', () => {
  it('loads every unit, lesson and exercise without problems', () => {
    const { content, errors } = realContent();
    expect(errors).toEqual([]);
    expect(content.units.length).toBeGreaterThan(0);
    expect(content.lessons.size).toBeGreaterThan(0);
    expect(content.exercises.size).toBeGreaterThan(0);
  });
});

describe('content validation', () => {
  const ex = (body: string) => loadContent({ 'content/exercises/x.yaml': `id: x\n${body}` }).errors;

  it('catches bars that do not add up', () => {
    expect(ex('kind: timed\nhand: right\ntempo: 60\nmeter: 4/4\nright: "C4:q C4:q | C4:w"')[0]).toMatch(/bar 1 has 2 beats/);
  });

  it('catches hands with different bar counts', () => {
    expect(ex('kind: timed\ntempo: 60\nmeter: 4/4\nright: "C4:w | C4:w"\nleft: "C3:w"')[0]).toMatch(/different bar counts/);
  });

  it('catches finger counts that do not match the notes', () => {
    expect(ex('kind: sequence\nnotes: "C4 D4"\nfingers: "1"')[0]).toMatch(/1 fingers for 2 notes/);
  });

  it('catches an id that does not match the file name', () => {
    expect(loadContent({ 'content/exercises/y.yaml': 'id: x\nkind: find\ntargets: [{ pitchClass: C }]' }).errors[0]).toMatch(/match the file name/);
  });

  it('catches missing lessons and exercises', () => {
    const { errors } = loadContent({
      'content/units/01-u.yaml': 'id: u\ntitle: U\nlessons: [a, b]',
      'content/lessons/01-a.yaml': 'id: a\ntitle: A\nunit: u\nsteps:\n  - exercise: nope',
    });
    expect(errors).toContain('unit u: lesson "b" not found');
    expect(errors).toContain('lesson a: exercise "nope" not found');
  });
});
