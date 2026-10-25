import { describe, expect, it } from 'vitest';
import { MODULES } from '../src/app/modules';
import { moduleProblems, resolveRoute } from '../src/app/router';
import { keepOnWipe } from '../src/core/records';
import { memoryBackend, ModuleRecords, PREFIX } from '../src/core/storage';
import { isSynced, tracked } from '../src/core/sync/tracker';
import { PIANO_RECORD_WORDS, piano } from '../src/modules/piano/module';
import { sums, sumsRound } from '../src/modules/sums/module';

describe('modules', () => {
  it('fit together: ids, homes, no route answering twice, no clash with piano records', () => {
    expect(moduleProblems(MODULES, PIANO_RECORD_WORDS)).toEqual([]);
    expect(MODULES[0]).toBe(piano);
  });

  it('flags clashes', () => {
    const view = () => {};
    const bad = [
      { ...piano },
      { ...sums, id: 'book', routes: { '': view } },
      { ...sums, id: 'ex', routes: { x: view } },
      { ...sums, id: 'profile', topLevel: true, routes: { '': view, songs: view } },
    ];
    const p = moduleProblems(bad, PIANO_RECORD_WORDS).join('\n');
    expect(p).toMatch(/"book" is also a route of "piano"/);
    expect(p).toMatch(/"ex" is the first word of piano records/);
    expect(p).toMatch(/"ex" has no home route/);
    expect(p).toMatch(/"profile" is a shared page/);
    expect(p).toMatch(/route "songs" is in "piano" and "profile"/);
  });
});

describe('routes', () => {
  const r = (hash: string, open = 'piano') => {
    const x = resolveRoute(hash, MODULES, open);
    return [x.kind, x.module.id, x.route, x.arg ?? ''].join(' ');
  };

  it('keeps every old piano address', () => {
    expect(r('#/')).toBe('module piano  ');
    expect(r('#/lesson/finger-numbers', 'sums')).toBe('module piano lesson finger-numbers');
    expect(r('#/song/song%20x')).toBe('module piano song song x');
    expect(r('#/book', 'sums')).toBe('module piano book ');
  });

  it('opens a module by its id, with or without a page', () => {
    expect(r('#/sums')).toBe('module sums  ');
    expect(r('#/sums/about')).toBe('module sums about ');
    expect(r('#/piano/book', 'sums')).toBe('module piano book ');
    expect(r('#/sums/nothing')).toBe('module sums  ');
  });

  it('shares profile, settings and demo with the open module', () => {
    expect(r('#/profile', 'sums')).toBe('shell sums profile ');
    expect(r('#/demo/start')).toBe('shell piano demo start');
    expect(r('#/settings', 'gone')).toBe('shell piano settings ');
  });

  it('sends unknown addresses to the open module home', () => {
    expect(r('#/nowhere', 'sums')).toBe('module sums  ');
  });
});

describe('records per module on one account', () => {
  it('saves a module under its own name, and it syncs', () => {
    const raw = memoryBackend();
    const rec = new ModuleRecords('sums', raw);
    rec.put('best', { score: 4, of: 5 });
    expect(raw.get(`${PREFIX}sums.best`)).toBe('{"score":4,"of":5}');
    expect(rec.get('best')).toEqual({ score: 4, of: 5 });
    expect(isSynced(`${PREFIX}sums.best`)).toBe(true);
    expect(isSynced(`${PREFIX}module`)).toBe(false);
    expect(isSynced(`${PREFIX}calibration`)).toBe(false);
  });

  it('a wipe clears every module but keeps the piano player\'s own work', () => {
    expect(keepOnWipe()).toEqual(expect.arrayContaining(['sketch.', 'mysong.']));
    const data = tracked(memoryBackend());
    for (const k of ['sums.best', 'ex.a', 'sketch.1', 'mysong.2', 'settings']) data.set(PREFIX + k, '1');
    data.wipeLocal();
    expect(data.keys!().filter((k) => !k.includes('sync.')).sort()).toEqual([`${PREFIX}mysong.2`, `${PREFIX}settings`, `${PREFIX}sketch.1`]);
  });
});

describe('sample module', () => {
  it('asks five sums, the answer always among four choices', () => {
    let seed = 3;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const round = sumsRound(rnd);
    expect(round).toHaveLength(5);
    for (const q of round) {
      expect(q.choices).toHaveLength(4);
      expect(q.choices).toContain(q.a + q.b);
    }
  });
});
