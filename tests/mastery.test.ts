import { describe, expect, it } from 'vitest';
import type { TreeNode } from '../src/content/tree';
import { Mastery, REVIEW_DAYS, XP } from '../src/progress/mastery';
import { memoryBackend, Store } from '../src/progress/store';
import { stars } from '../src/scoring/stars';

const node = (id: string, lesson: string, requires: string[] = []): TreeNode =>
  ({ id, type: 'lesson', strand: 'technique', title: id, lesson, requires, planned: false, year: 1, unit: 'u' });

function setup() {
  const store = new Store(memoryBackend());
  const nodes = new Map([['a', node('a', 'la')], ['b', node('b', 'lb', ['a'])]]);
  const lessons: Record<string, string[]> = { la: ['e1', 'e2'], lb: ['e3'] };
  const m = new Mastery(store, nodes, (l) => lessons[l] ?? []);
  const play = (ex: string, score: number, day: string, counts = true) => {
    const now = new Date(`${day}T12:00:00`);
    const before = store.exercise(ex).best?.stars ?? 0;
    const a = { at: now.toISOString(), score, stars: stars(score), tempo: 60, counts };
    store.record(ex, a);
    return m.onAttempt(ex, a, before, now);
  };
  return { m, play };
}

describe('mastery', () => {
  it('climbs Introduced -> Practised -> Solid -> Mastered, and unlocks what needs it', () => {
    const { m, play } = setup();
    expect(m.state('a')).toBe('introduced');
    expect(m.state('b')).toBe('locked');
    play('e1', 70, '2026-11-01');
    expect(m.state('a')).toBe('introduced'); // e2 not passed yet
    const r = play('e2', 75, '2026-11-01');
    expect(r.promoted).toEqual([{ node: 'a', to: 'practised' }]);
    expect(m.state('b')).toBe('introduced');
    play('e1', 95, '2026-11-01');
    expect(m.state('a')).toBe('practised'); // e2's best is still below 92
    play('e2', 93, '2026-11-01');
    expect(m.state('a')).toBe('solid');
    play('e1', 80, '2026-11-01');
    expect(m.state('a')).toBe('solid'); // same day does not count
    play('e1', 80, '2026-11-02');
    expect(m.state('a')).toBe('mastered');
  });

  it('slow practice never promotes', () => {
    const { m, play } = setup();
    play('e1', 99, '2026-11-01', false);
    play('e2', 99, '2026-11-01', false);
    expect(m.state('a')).toBe('introduced');
  });

  it('fades, comes due at half freshness, and a failed review drops one state', () => {
    const { m, play } = setup();
    play('e1', 95, '2026-11-01');
    play('e2', 95, '2026-11-01');
    expect(m.state('a')).toBe('solid');
    const due = new Date(`2026-11-0${1 + REVIEW_DAYS[0]}T12:00:00`);
    expect(m.freshness('a', new Date('2026-11-02T12:00:00'))).toBeCloseTo(2 ** -0.5);
    expect(m.isDue('a', due)).toBe(true);
    expect(m.reviewQueue(due)).toEqual(['a']);
    const r = play('e1', 50, '2026-11-03');
    expect(r.dropped).toEqual([{ node: 'a', to: 'practised' }]);
    expect(m.state('a')).toBe('practised');
    // Back to Solid only with a clean take, not on old bests.
    play('e1', 70, '2026-11-03');
    expect(m.state('a')).toBe('practised');
    play('e1', 94, '2026-11-03');
    expect(m.state('a')).toBe('solid');
  });

  it('a good review moves up a box, so the next one comes later', () => {
    const { m, play } = setup();
    play('e1', 95, '2026-11-01');
    play('e2', 95, '2026-11-01');
    const r = play('e1', 80, '2026-11-03'); // due after 2 days: reviewed (and Mastered)
    expect(r.reviewed).toEqual(['a']);
    expect(m.state('a')).toBe('mastered');
    expect(m.isDue('a', new Date('2026-11-06T12:00:00'))).toBe(false);
    expect(m.isDue('a', new Date('2026-11-07T12:00:00'))).toBe(true);
  });

  it('gives XP for clean takes, new stars and promotions only, with a daily cap', () => {
    const { m, play } = setup();
    expect(play('e1', 70, '2026-11-01').xp).toBe(XP.star); // one new star
    expect(play('e1', 70, '2026-11-01').xp).toBe(0); // replaying the same is worth nothing
    expect(play('e1', 50, '2026-11-01').xp).toBe(0);
    expect(play('e2', 95, '2026-11-01').xp).toBe(XP.cleanTake + 3 * XP.star + XP.promotion);
    for (let i = 0; i < 40; i++) play('e2', 95, '2026-11-01');
    expect(m.meta.xpToday).toBeLessThanOrEqual(XP.dailyCap);
    expect(m.meta.xpToday).toBe(XP.dailyCap);
  });

  it('keeps the streak over one rest day, not two', () => {
    const { m, play } = setup();
    play('e1', 70, '2026-11-01');
    play('e1', 70, '2026-11-02');
    play('e1', 70, '2026-11-04'); // one day off
    expect(m.meta.streak).toBe(3);
    play('e1', 70, '2026-11-07'); // two days off
    expect(m.meta.streak).toBe(1);
  });
});
