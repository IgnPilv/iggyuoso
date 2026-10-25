import { describe, expect, it } from 'vitest';
import { memoryBackend, SCHEMA_VERSION, Store } from '../src/modules/piano/progress/store';
import { Account, sameValue } from '../src/core/sync/account';
import { mergeRecord } from '../src/core/sync/merge';
import { mergeDays, mergeExercise, mergeMeta, mergeTiming, PIANO_RECORDS } from '../src/modules/piano/progress/records';
import { addRecordRules } from '../src/core/records';
import { memoryProvider, type MemoryServer } from '../src/core/sync/memory';
import { supabaseProvider } from '../src/core/sync/supabase';
import { CHANGES_KEY, isSynced, tracked } from '../src/core/sync/tracker';
import { SignedOutError } from '../src/core/sync/types';

// The piano's merge and wipe rules, as the app registers them at start.
addRecordRules(PIANO_RECORDS);

const take = (at: string, score: number) => ({ at, score, stars: score >= 92 ? 3 : score >= 80 ? 2 : 1, tempo: 80, counts: true });

function device(server: MemoryServer) {
  const data = tracked(memoryBackend());
  const store = new Store(data);
  const account = new Account(data, server, { schema: SCHEMA_VERSION, upgradeFrom: (v) => store.upgradeFrom(v), redirectTo: () => 'https://x/' });
  return { data, store, account };
}

describe('change tracking', () => {
  it('syncs progress but keeps the keyboard, settings and sync state on the device', () => {
    expect(isSynced('iggyuoso.ex.a')).toBe(true);
    expect(isSynced('iggyuoso.mastery.meta')).toBe(true);
    expect(isSynced('iggyuoso.some-new-record')).toBe(true);
    for (const k of ['schema', 'calibration', 'settings', 'account', 'sync.state', 'sync.changes']) expect(isSynced(`iggyuoso.${k}`)).toBe(false);
    expect(isSynced('other.app')).toBe(false);
  });

  it('stamps writes to synced keys and forgets them once sent', () => {
    let t = 1000;
    const data = tracked(memoryBackend(), () => t);
    const s = new Store(data);
    s.settings = { ...s.settings, metronome: false };
    expect(data.changes()).toEqual({});
    s.record('a', take('2026-10-23T10:00:00Z', 95));
    const sent = data.changes();
    expect(sent).toEqual({ 'iggyuoso.ex.a': 1000 });
    t = 2000;
    s.record('a', take('2026-10-23T10:01:00Z', 95)); // changed again while sending
    data.settle(sent);
    expect(data.changes()).toEqual({ 'iggyuoso.ex.a': 2000 });
    expect(data.raw.get(CHANGES_KEY)).toBeTruthy();
  });
});

describe('merging a record changed on two devices', () => {
  it('keeps the better best, the later last take and every clean day', () => {
    const a = { attempts: 5, best: take('2026-10-20T10:00:00Z', 95), last: take('2026-10-22T10:00:00Z', 70), clean: 2, cleanDays: ['2026-10-20'], passed: true };
    const b = { attempts: 3, best: take('2026-10-21T10:00:00Z', 97), last: take('2026-10-21T10:00:00Z', 97), clean: 1, cleanDays: ['2026-10-21'] };
    const m = mergeExercise(a, b);
    expect(m.attempts).toBe(5);
    expect(m.best?.score).toBe(97);
    expect(m.last?.at).toBe('2026-10-22T10:00:00Z');
    expect(m.clean).toBe(2);
    expect(m.cleanDays).toEqual(['2026-10-20', '2026-10-21']);
    expect(m.passed).toBe(true);
  });

  it('keeps every practice day and timing entry, and the most XP', () => {
    const d = { xp: 10, takes: 2, clean: 1, ms: 60_000, lastAt: 5 };
    expect(mergeDays({ x: d }, { x: { ...d, xp: 30, lastAt: 9 }, y: d })).toEqual({ x: { ...d, xp: 30, lastAt: 9 }, y: d });
    const e = (at: string) => ({ at, hand: 'right' as const, mean: 1, spread: 2 });
    expect(mergeTiming([e('b'), e('a')], [e('b'), e('c')]).map((x) => x.at)).toEqual(['a', 'b', 'c']);
    const meta = mergeMeta({ xp: 100, xpDay: '2026-10-22', xpToday: 40, streak: 3, streakDay: '2026-10-22', bestStreak: 5 },
      { xp: 80, xpDay: '2026-10-23', xpToday: 20, streak: 4, streakDay: '2026-10-23' });
    expect(meta).toMatchObject({ xp: 100, xpDay: '2026-10-23', xpToday: 20, streak: 4, streakDay: '2026-10-23', bestStreak: 5 });
  });

  it('lets the newer version win for other records', () => {
    expect(mergeRecord('mastery.n1', { state: 'solid' }, { state: 'practised' }, true)).toEqual({ state: 'solid' });
    expect(mergeRecord('ladder.x', { rung: 1 }, { rung: 2 }, false)).toEqual({ rung: 2 });
    expect(mergeRecord('ex.a', null, { attempts: 1 }, true)).toEqual({ attempts: 1 });
  });
});

describe('guest and account', () => {
  it('starts as a guest and stays one without a server', async () => {
    const data = tracked(memoryBackend());
    const acct = new Account(data, null, { schema: SCHEMA_VERSION, upgradeFrom: () => {}, redirectTo: () => '' });
    expect(acct.identity()).toEqual({ kind: 'guest' });
    expect(acct.available).toBe(false);
    expect(await acct.completeSignIn('#access_token=x')).toBe(false);
    expect(await acct.sync()).toBe(false);
  });

  it('brings guest progress into the account and carries it to another device', async () => {
    const server = memoryProvider();
    const a = device(server);
    a.store.record('ex.1', take('2026-10-23T10:00:00Z', 95));
    a.store.put('mastery.meta', { xp: 50, xpToday: 50, streak: 1 });
    await a.account.sendLink('me@example.com');
    expect(server.sent).toEqual(['me@example.com']);
    expect(a.account.linkSentTo).toBe('me@example.com');
    expect(await a.account.completeSignIn('#memory-sign-in=me@example.com')).toBe(true);
    expect(a.account.identity()).toEqual({ kind: 'account', email: 'me@example.com' });
    expect(a.account.status).toBe('synced');
    expect(a.data.changes()).toEqual({});
    expect([...server.rows.get('user:me@example.com')!.keys()].sort()).toEqual(['ex.ex.1', 'mastery.meta']);

    const b = device(server);
    b.store.record('ex.2', take('2026-10-23T11:00:00Z', 80)); // played as a guest on the second device
    await b.account.completeSignIn('#memory-sign-in=me@example.com');
    expect(b.store.exercise('ex.1').best?.score).toBe(95);
    expect(b.store.exercise('ex.2').attempts).toBe(1);
    expect(b.store.calibration).toBeUndefined();

    // Back on the first device, the second device's practice arrives.
    expect(await a.account.sync()).toBe(true);
    expect(a.store.exercise('ex.2').attempts).toBe(1);
  });

  it('does not report a change when the server hands a record back with its keys reordered', async () => {
    // Postgres jsonb sorts object keys, so a record comes back spelled differently from how it
    // was sent. That is not progress from another device (it used to redraw a lesson to step 1).
    const server = memoryProvider();
    const pull = server.pull.bind(server);
    const sortKeys = (v: unknown): unknown => Array.isArray(v) ? v.map(sortKeys)
      : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().reverse().map((k) => [k, sortKeys((v as Record<string, unknown>)[k])])) : v;
    server.pull = async (s, since) => (await pull(s, since)).map((r) => ({ ...r, value: sortKeys(r.value) }));
    const a = device(server);
    await a.account.completeSignIn('#memory-sign-in=me@example.com');
    a.store.record('x', take('2026-10-23T10:00:00Z', 95));
    a.store.put('mastery.meta', { xp: 50, xpToday: 50, streak: 1 });
    expect(await a.account.sync()).toBe(false); // sends the take
    expect(await a.account.sync()).toBe(false); // gets it back (within the overlap), reordered
    expect(a.store.exercise('x').best?.score).toBe(95);
  });

  it('compares records by value, not by key order', () => {
    expect(sameValue({ a: 1, b: [{ c: 2, d: 3 }] }, { b: [{ d: 3, c: 2 }], a: 1 })).toBe(true);
    expect(sameValue({ a: 1, b: undefined }, { a: 1 })).toBe(true);
    expect(sameValue({ a: 1 }, { a: 2 })).toBe(false);
    expect(sameValue([1, 2], [2, 1])).toBe(false);
    expect(sameValue(null, null)).toBe(true);
  });

  it('merges a record practised on both devices while apart', async () => {
    const server = memoryProvider();
    const a = device(server);
    const b = device(server);
    await a.account.completeSignIn('#memory-sign-in=me@example.com');
    await b.account.completeSignIn('#memory-sign-in=me@example.com');
    a.store.record('x', take('2026-10-23T10:00:00Z', 95));
    b.store.record('x', take('2026-10-23T12:00:00Z', 97));
    await a.account.sync();
    await b.account.sync();
    await a.account.sync();
    for (const d of [a, b]) {
      const p = d.store.exercise('x');
      expect(p.best?.score).toBe(97);
      expect(p.clean).toBe(1);
      expect(p.last?.at).toBe('2026-10-23T12:00:00Z');
    }
  });

  it('keeps practice on the device while offline and sends it later', async () => {
    const server = memoryProvider();
    const a = device(server);
    await a.account.completeSignIn('#memory-sign-in=me@example.com');
    server.offline = true;
    a.store.record('x', take('2026-10-23T10:00:00Z', 95));
    await a.account.sync();
    expect(a.account.status).toBe('offline');
    expect(Object.keys(a.data.changes())).toEqual(['iggyuoso.ex.x']);
    server.offline = false;
    await a.account.sync();
    expect(a.account.status).toBe('synced');
    expect(server.rows.get('user:me@example.com')!.get('ex.x')).toBeTruthy();
  });

  it('leaves records from a newer app alone and asks for a reload', async () => {
    const server = memoryProvider();
    const a = device(server);
    await a.account.completeSignIn('#memory-sign-in=me@example.com');
    await server.push(a.account.session!, [{ key: 'ex.y', value: { attempts: 9, future: true }, schema: SCHEMA_VERSION + 1 }]);
    await a.account.sync();
    expect(a.account.newerData).toBe(true);
    expect(a.store.exercise('y').attempts).toBe(0);
  });

  it('signs out to a guest and keeps the progress on the device', async () => {
    const server = memoryProvider();
    const a = device(server);
    await a.account.completeSignIn('#memory-sign-in=me@example.com');
    a.store.record('x', take('2026-10-23T10:00:00Z', 95));
    await a.account.sync();
    await a.account.signOut();
    expect(a.account.identity()).toEqual({ kind: 'guest' });
    expect(a.store.exercise('x').attempts).toBe(1);
    a.store.record('x', take('2026-10-23T11:00:00Z', 95));
    expect(await a.account.sync()).toBe(false); // a guest does not sync
  });

  it('turns back into a guest when the server says the sign-in is gone', async () => {
    const server = memoryProvider();
    const a = device(server);
    await a.account.completeSignIn('#memory-sign-in=me@example.com');
    server.pull = async () => { throw new SignedOutError('gone'); };
    await a.account.sync();
    expect(a.account.identity()).toEqual({ kind: 'guest' });
    expect(a.account.error).toMatch(/sign in again/i);
  });
});

describe('wiping progress', () => {
  it('wipes a guest\'s progress but keeps sketches, songs, calibration and settings', async () => {
    const data = tracked(memoryBackend());
    const store = new Store(data);
    const acct = new Account(data, null, { schema: SCHEMA_VERSION, upgradeFrom: () => {}, redirectTo: () => '' });
    store.record('x', take('2026-10-23T10:00:00Z', 95));
    store.put('mastery.meta', { xp: 50, xpToday: 0, streak: 1 });
    store.put('sketch.a', { title: 'idea' });
    store.put('mysong.b', { title: 'song' });
    store.settings = { ...store.settings, metronome: false };
    expect(await acct.wipe()).toBe(true);
    expect(store.exercise('x').attempts).toBe(0);
    expect(store.get('mastery.meta')).toBeUndefined();
    expect(store.get('sketch.a')).toEqual({ title: 'idea' });
    expect(store.get('mysong.b')).toEqual({ title: 'song' });
    expect(store.settings.metronome).toBe(false);
    expect(data.changes()).toEqual({ 'iggyuoso.sketch.a': expect.any(Number), 'iggyuoso.mysong.b': expect.any(Number) });
  });

  it('wipes the account and every signed-in device, but not a device signing in later', async () => {
    const server = memoryProvider();
    const a = device(server);
    const b = device(server);
    await a.account.completeSignIn('#memory-sign-in=me@example.com');
    a.store.record('x', take('2026-10-23T10:00:00Z', 95));
    a.store.put('sketch.s', { title: 'idea' });
    await a.account.sync();
    await b.account.completeSignIn('#memory-sign-in=me@example.com');
    expect(b.store.exercise('x').attempts).toBe(1);

    expect(await a.account.wipe()).toBe(true);
    expect(a.store.exercise('x').attempts).toBe(0);
    expect([...server.rows.get('user:me@example.com')!.keys()].sort()).toEqual(['sketch.s', 'wiped']);

    expect(await b.account.sync()).toBe(true);
    expect(b.store.exercise('x').attempts).toBe(0);
    expect(b.store.get('sketch.s')).toEqual({ title: 'idea' });

    // A third device brings its guest progress in after the wipe and keeps it.
    const c = device(server);
    c.store.record('y', take('2026-10-24T10:00:00Z', 95));
    await c.account.completeSignIn('#memory-sign-in=me@example.com');
    expect(c.store.exercise('y').attempts).toBe(1);
    await a.account.sync();
    expect(a.store.exercise('y').attempts).toBe(1); // and the others get it, without wiping again
    expect(a.store.get('sketch.s')).toEqual({ title: 'idea' });
  });

  it('deletes nothing when the account cannot be reached', async () => {
    const server = memoryProvider();
    const a = device(server);
    await a.account.completeSignIn('#memory-sign-in=me@example.com');
    a.store.record('x', take('2026-10-23T10:00:00Z', 95));
    await a.account.sync();
    server.offline = true;
    expect(await a.account.wipe()).toBe(false);
    expect(a.account.error).toMatch(/Nothing was wiped/);
    expect(a.store.exercise('x').attempts).toBe(1);
  });
});

describe('Supabase provider', () => {
  const cfg = { url: 'https://abc.supabase.co', anonKey: 'anon' };
  function fake(responses: Record<string, unknown>) {
    const calls: { url: string; init: RequestInit }[] = [];
    const f = (async (url: string, init: RequestInit = {}) => {
      calls.push({ url, init });
      const hit = Object.entries(responses).find(([k]) => url.includes(k));
      return new Response(JSON.stringify(hit?.[1] ?? {}), { status: 200 });
    }) as unknown as typeof fetch;
    return { calls, f };
  }
  const session = { userId: 'u1', email: 'me@example.com', accessToken: 'tok', refreshToken: 'ref', expiresAt: Date.now() + 3_600_000 };

  it('sends a sign-in link that comes back to the app', async () => {
    const { calls, f } = fake({});
    await supabaseProvider(cfg, f).sendSignInLink('me@example.com', 'https://ignpilv.github.io/iggyuoso/');
    expect(calls[0].url).toBe('https://abc.supabase.co/auth/v1/otp?redirect_to=https%3A%2F%2Fignpilv.github.io%2Figgyuoso%2F');
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ email: 'me@example.com', create_user: true });
    expect((calls[0].init.headers as Record<string, string>).apikey).toBe('anon');
  });

  it('finishes sign-in from the returned hash', async () => {
    const { calls, f } = fake({ '/auth/v1/user': { id: 'u1', email: 'me@example.com' } });
    const p = supabaseProvider(cfg, f);
    expect(await p.completeSignIn('#/profile')).toBeNull();
    const s = await p.completeSignIn('#access_token=tok&expires_in=3600&refresh_token=ref&token_type=bearer&type=magiclink');
    expect(s).toMatchObject({ userId: 'u1', email: 'me@example.com', accessToken: 'tok', refreshToken: 'ref' });
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    await expect(p.completeSignIn('#error=access_denied&error_description=Email+link+is+invalid+or+has+expired')).rejects.toThrow('Email link is invalid or has expired');
  });

  it('pulls changed rows and upserts by key', async () => {
    const { calls, f } = fake({ '/rest/v1/progress?select': [{ key: 'ex.a', value: { attempts: 1 }, schema: 1, updated_at: '2026-10-23T10:00:00.123+00:00' }] });
    const p = supabaseProvider(cfg, f);
    const rows = await p.pull(session, '2026-10-23T09:00:00.000Z');
    expect(rows).toEqual([{ key: 'ex.a', value: { attempts: 1 }, schema: 1, updatedAt: '2026-10-23T10:00:00.123+00:00' }]);
    expect(calls[0].url).toContain('updated_at=gt.2026-10-23T09%3A00%3A00.000Z');
    await p.push(session, [{ key: 'ex.a', value: { attempts: 2 }, schema: 1 }]);
    const push = calls[1];
    expect(push.url).toBe('https://abc.supabase.co/rest/v1/progress?on_conflict=user_id,key');
    expect((push.init.headers as Record<string, string>).Prefer).toBe('resolution=merge-duplicates,return=minimal');
    expect(JSON.parse(String(push.init.body))).toEqual([{ user_id: 'u1', key: 'ex.a', value: { attempts: 2 }, schema: 1 }]);
  });

  it('wipes the account\'s rows but keeps sketches and songs', async () => {
    const { calls, f } = fake({});
    await supabaseProvider(cfg, f).wipe(session, ['sketch.', 'mysong.']);
    expect(calls[0].init.method).toBe('DELETE');
    expect(calls[0].url).toBe('https://abc.supabase.co/rest/v1/progress?user_id=eq.u1&key=not.like.sketch.*&key=not.like.mysong.*');
  });

  it('reports a lost session as signed out', async () => {
    const f = (async () => new Response('{}', { status: 401 })) as unknown as typeof fetch;
    await expect(supabaseProvider(cfg, f).pull(session)).rejects.toBeInstanceOf(SignedOutError);
  });
});
