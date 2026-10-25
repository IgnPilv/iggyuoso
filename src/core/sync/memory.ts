import type { AccountSession, OutRow, RemoteRow, SyncProvider } from './types';

// A pretend account server kept in memory, for tests and the demo. A sign-in link "arrives" at
// once: completeSignIn takes `#memory-sign-in=<email>`.

export interface MemoryServer extends SyncProvider {
  rows: Map<string, Map<string, RemoteRow>>;
  /** Emails a sign-in link was sent to. */
  sent: string[];
  /** Make the next calls fail as if offline. */
  offline: boolean;
}

export function memoryProvider(): MemoryServer {
  let clock = Date.parse('2026-01-01T00:00:00Z');
  const tick = () => new Date((clock += 1000)).toISOString();
  const up = (srv: MemoryServer) => { if (srv.offline) throw new Error('Failed to fetch'); };
  const table = (srv: MemoryServer, id: string) => {
    if (!srv.rows.has(id)) srv.rows.set(id, new Map());
    return srv.rows.get(id)!;
  };
  const srv: MemoryServer = {
    name: 'Demo server',
    rows: new Map(),
    sent: [],
    offline: false,
    async sendSignInLink(email) { up(srv); srv.sent.push(email); },
    async completeSignIn(hash) {
      const email = new URLSearchParams(hash.replace(/^#/, '')).get('memory-sign-in');
      if (!email) return null;
      up(srv);
      return { userId: `user:${email}`, email, accessToken: 'memory', refreshToken: 'memory', expiresAt: Date.now() + 3_600_000 };
    },
    async refresh(s: AccountSession) { up(srv); return { ...s, expiresAt: Date.now() + 3_600_000 }; },
    async pull(s, since) {
      up(srv);
      return [...table(srv, s.userId).values()].filter((r) => !since || r.updatedAt > since).sort((a, b) => (a.updatedAt < b.updatedAt ? -1 : 1));
    },
    async push(s, rows: OutRow[]) {
      up(srv);
      const t = table(srv, s.userId);
      for (const r of rows) t.set(r.key, { ...r, value: structuredClone(r.value), updatedAt: tick() });
    },
    async wipe(s, keep) {
      up(srv);
      const t = table(srv, s.userId);
      for (const k of [...t.keys()]) if (!keep.some((p) => k.startsWith(p))) t.delete(k);
    },
    async signOut() {},
  };
  return srv;
}
