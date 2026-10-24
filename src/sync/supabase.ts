import { SignedOutError, type AccountSession, type OutRow, type RemoteRow, type SyncProvider } from './types';

// Supabase as the account server, spoken to over its plain HTTP API (no SDK, so nothing is
// added to the bundle). Sign-in is by an emailed link; progress rows live in one table,
// `progress`, kept per account by row-level security (docs/accounts.md, docs/supabase.sql).

const PAGE = 1000;

export function supabaseProvider(cfg: { url: string; anonKey: string }, fetchFn: typeof fetch = (...a) => fetch(...a)): SyncProvider {
  const base = { apikey: cfg.anonKey, 'Content-Type': 'application/json' };
  const authed = (s: AccountSession) => ({ ...base, Authorization: `Bearer ${s.accessToken}` });

  async function call(path: string, init: RequestInit): Promise<Response> {
    const res = await fetchFn(`${cfg.url}${path}`, init);
    if (res.status === 401) throw new SignedOutError('Signed out: please sign in again.');
    if (!res.ok) {
      let msg = `${res.status}`;
      try {
        const b = await res.json();
        msg = b.msg ?? b.message ?? b.error_description ?? b.error ?? msg;
      } catch { /* not JSON */ }
      throw new Error(String(msg));
    }
    return res;
  }

  const session = (t: { access_token: string; refresh_token: string; expires_in?: number; expires_at?: number }, user: { id: string; email?: string }): AccountSession => ({
    userId: user.id,
    email: user.email ?? '',
    accessToken: t.access_token,
    refreshToken: t.refresh_token,
    expiresAt: t.expires_at ? t.expires_at * 1000 : Date.now() + (t.expires_in ?? 3600) * 1000,
  });

  return {
    name: 'Supabase',

    async sendSignInLink(email, redirectTo) {
      await call(`/auth/v1/otp?redirect_to=${encodeURIComponent(redirectTo)}`, {
        method: 'POST', headers: base, body: JSON.stringify({ email, create_user: true }),
      });
    },

    async completeSignIn(hash) {
      const q = new URLSearchParams(hash.replace(/^#/, ''));
      if (q.get('error') || q.get('error_description')) {
        throw new Error((q.get('error_description') ?? q.get('error') ?? 'Sign-in failed').replace(/\+/g, ' '));
      }
      const access = q.get('access_token');
      const refresh = q.get('refresh_token');
      if (!access || !refresh) return null;
      const res = await call('/auth/v1/user', { headers: { ...base, Authorization: `Bearer ${access}` } });
      const user = await res.json();
      return session({
        access_token: access,
        refresh_token: refresh,
        expires_in: Number(q.get('expires_in')) || undefined,
        expires_at: Number(q.get('expires_at')) || undefined,
      }, user);
    },

    async refresh(s) {
      let res: Response;
      try {
        res = await call('/auth/v1/token?grant_type=refresh_token', {
          method: 'POST', headers: base, body: JSON.stringify({ refresh_token: s.refreshToken }),
        });
      } catch (e) {
        // A refresh token that was revoked or used up means signing in again.
        if (e instanceof Error && /invalid|not found|revoked|expired/i.test(e.message)) throw new SignedOutError(e.message);
        throw e;
      }
      const t = await res.json();
      return session(t, t.user ?? { id: s.userId, email: s.email });
    },

    async pull(s, since) {
      const out: RemoteRow[] = [];
      for (let offset = 0; ; offset += PAGE) {
        const filter = since ? `&updated_at=gt.${encodeURIComponent(since)}` : '';
        const res = await call(`/rest/v1/progress?select=key,value,schema,updated_at&order=updated_at.asc,key.asc${filter}&limit=${PAGE}&offset=${offset}`, { headers: authed(s) });
        const rows: { key: string; value: unknown; schema: number; updated_at: string }[] = await res.json();
        out.push(...rows.map((r) => ({ key: r.key, value: r.value, schema: r.schema, updatedAt: r.updated_at })));
        if (rows.length < PAGE) return out;
      }
    },

    async push(s, rows: OutRow[]) {
      for (let i = 0; i < rows.length; i += 500) {
        await call('/rest/v1/progress?on_conflict=user_id,key', {
          method: 'POST',
          headers: { ...authed(s), Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(rows.slice(i, i + 500).map((r) => ({ user_id: s.userId, key: r.key, value: r.value, schema: r.schema }))),
        });
      }
    },

    async wipe(s, keep) {
      const filters = keep.map((k) => `&key=not.like.${encodeURIComponent(`${k}*`)}`).join('');
      await call(`/rest/v1/progress?user_id=eq.${encodeURIComponent(s.userId)}${filters}`, {
        method: 'DELETE', headers: { ...authed(s), Prefer: 'return=minimal' },
      });
    },

    async signOut(s) {
      try { await call('/auth/v1/logout', { method: 'POST', headers: authed(s) }); } catch { /* already gone */ }
    },
  };
}
