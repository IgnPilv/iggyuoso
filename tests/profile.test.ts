import { describe, expect, it } from 'vitest';
import type { TreeNode } from '../src/content/tree';
import { Mastery } from '../src/progress/mastery';
import { FIRST_TAKE_MS, levelOf, Profile, strandMastery, xpForLevel } from '../src/progress/profile';
import { memoryBackend, Store } from '../src/progress/store';

const take = (at: string, timing?: { right?: { mean: number; spread: number | null } }) =>
  ({ at, score: 95, stars: 3 as const, tempo: 60, counts: true, timing });

describe('profile', () => {
  it('levels up every 100 XP more than the last', () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 100, 300, 600, 1000]);
    expect(levelOf(0)).toEqual({ level: 1, into: 0, span: 100 });
    expect(levelOf(99).level).toBe(1);
    expect(levelOf(100).level).toBe(2);
    expect(levelOf(450)).toEqual({ level: 3, into: 150, span: 300 });
  });

  it('logs practice per day, counting the gaps between takes in one sitting', () => {
    const p = new Profile(new Store(memoryBackend()));
    p.log(take('2026-11-01T10:00:00'), 10, true, '2026-11-01');
    p.log(take('2026-11-01T10:02:00'), 5, false, '2026-11-01');
    p.log(take('2026-11-01T11:00:00'), 0, false, '2026-11-01'); // a new sitting
    const d = p.days['2026-11-01'];
    expect(d).toMatchObject({ xp: 15, takes: 3, clean: 1 });
    expect(d.ms).toBe(FIRST_TAKE_MS + 120_000 + FIRST_TAKE_MS);
    expect(p.totals()).toEqual({ days: 1, takes: 3, clean: 1, minutes: 4 });
    const cal = p.calendar('2026-11-01', 1);
    expect(cal).toHaveLength(7);
    expect(cal[6].day).toBe('2026-11-01');
    expect(cal[6].log?.takes).toBe(3);
    expect(cal[0].log).toBeUndefined();
  });

  it('sums up timing per hand, recent takes against the ones before', () => {
    const p = new Profile(new Store(memoryBackend()));
    for (let i = 0; i < 20; i++) p.log(take(`2026-11-01T10:${String(i).padStart(2, '0')}:00`, { right: { mean: i < 10 ? 40 : 10, spread: 20 } }), 0, true, '2026-11-01');
    expect(p.timingSummary().right).toEqual({ takes: 20, mean: 10, spread: 20, before: 40 });
    expect(p.timingSummary().left).toBeUndefined();
  });

  it('counts written nodes per strand and state, and keeps the best streak', () => {
    const n = (id: string, strand: TreeNode['strand'], lesson?: string): TreeNode =>
      ({ id, type: 'lesson', strand, title: id, lesson, requires: [], planned: !lesson, year: 1, unit: 'u' });
    const rows = strandMastery([n('a', 'reading', 'la'), n('b', 'reading', 'lb'), n('c', 'ear'), n('d', 'all', 'ld')], (id) => (id === 'a' ? 'solid' : 'introduced'));
    expect(rows.get('reading')).toMatchObject({ solid: 1, introduced: 1, total: 2 });
    expect(rows.get('ear')?.total).toBe(0);

    const store = new Store(memoryBackend());
    const m = new Mastery(store, new Map(), () => []);
    for (const day of ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-08']) {
      m.onAttempt('x', take(`${day}T12:00:00`), 0, new Date(`${day}T12:00:00`));
    }
    expect(m.meta.bestStreak).toBe(3);
    expect(m.meta.streak).toBe(1);
    expect(m.currentStreak(new Date('2026-11-09T12:00:00'))).toBe(1);
    expect(m.currentStreak(new Date('2026-11-12T12:00:00'))).toBe(0);
    expect(m.profile.totals().days).toBe(4);
  });
});
