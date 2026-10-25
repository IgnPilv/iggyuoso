import { mergeRecord } from './merge';
import { challengeOf, makeVerifier } from './pkce';
import { KEEP_ON_WIPE, PREFIX, WIPED_KEY, type TrackedBackend } from './tracker';
import { SignedOutError, type AccountSession, type OutRow, type SyncProvider } from './types';

// Who is playing on this device: a guest (progress saved on this device only) or a signed-in
// account whose progress is copied to the account server and back. Signing in keeps the guest's
// progress and adds it to the account; signing out keeps everything on the device as a guest.
//
// A sync pulls what changed on the account since the last pull, merges records that changed on
// both sides (merge.ts), then pushes what changed here. Records saved by a newer app are left
// alone (the player is asked to reload); records from an older app are upgraded.

export type Identity = { kind: 'guest' } | { kind: 'account'; email: string };
export type SyncStatus = 'guest' | 'syncing' | 'synced' | 'offline' | 'error';

const SESSION_KEY = `${PREFIX}account`;
const STATE_KEY = `${PREFIX}sync.state`;
/** The PKCE verifier of a Google sign-in on its way (device only, like every `sync.*` record). */
const PKCE_KEY = `${PREFIX}sync.pkce`;
/** Pull a little before the last cursor, so a change saved at the same moment is not missed. */
const OVERLAP_MS = 60_000;
/** Wait this long after a change before sending it, so a run of takes goes as one sync. */
export const PUSH_DELAY_MS = 4000;

interface SyncState {
  /** Server time of the newest row pulled. */
  cursor?: string;
  /** When the last sync finished (ISO, device time). */
  lastSync?: string;
}

export interface AccountOptions {
  schema: number;
  /** Upgrade records saved by an older app (Store.upgradeFrom). */
  upgradeFrom: (v: number) => void;
  /** The address a sign-in link (and Google) comes back to. */
  redirectTo: () => string;
  /** Leave for the sign-in page (default: the browser goes there). */
  go?: (url: string) => void;
}

export class Account {
  status: SyncStatus = 'guest';
  /** Message for the last failed step, shown on the account card. */
  error = '';
  /** Some records came from a newer version of the app: reload to get them. */
  newerData = false;
  /** Email a sign-in link was just sent to. */
  linkSentTo = '';
  /** On the way to Google (the page is about to change). */
  leaving = false;
  private listeners = new Set<(changed: boolean) => void>();
  private running?: Promise<boolean>;
  private again = false;
  private timer?: ReturnType<typeof setTimeout>;

  constructor(private data: TrackedBackend, readonly provider: SyncProvider | null, private opts: AccountOptions) {
    if (this.session) this.status = 'synced';
  }

  /** Accounts can be used here (a server is set up). */
  get available() { return !!this.provider; }

  get session(): AccountSession | undefined {
    try { return JSON.parse(this.data.raw.get(SESSION_KEY) ?? 'null') ?? undefined; } catch { return undefined; }
  }
  private set session(s: AccountSession | undefined) { this.data.raw.set(SESSION_KEY, JSON.stringify(s ?? null)); }

  private get state(): SyncState {
    try { return JSON.parse(this.data.raw.get(STATE_KEY) ?? '{}'); } catch { return {}; }
  }
  private set state(s: SyncState) { this.data.raw.set(STATE_KEY, JSON.stringify(s)); }

  get lastSync() { return this.state.lastSync; }

  identity(): Identity {
    const s = this.session;
    return s ? { kind: 'account', email: s.email } : { kind: 'guest' };
  }

  /** Called with `true` when a sync brought in new progress (screens may redraw). */
  onChange(fn: (changed: boolean) => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private emit(changed = false) { this.listeners.forEach((fn) => fn(changed)); }

  /**
   * Sign in with Google: keep a PKCE verifier on the device and send the browser to the account
   * server, which passes it on to Google and back here with a code (`completeOAuth`).
   */
  async signInWithGoogle() {
    if (!this.provider) return;
    this.error = '';
    const verifier = makeVerifier();
    let url: string;
    try {
      url = this.provider.oauthUrl('google', this.opts.redirectTo(), await challengeOf(verifier));
    } catch (e) {
      this.error = `Could not start signing in: ${message(e)}`;
      this.emit();
      return;
    }
    this.data.raw.set(PKCE_KEY, JSON.stringify(verifier));
    this.leaving = true;
    this.emit();
    (this.opts.go ?? ((u) => location.assign(u)))(url);
  }

  /**
   * Finish a Google sign-in from the return address's query (`?code=...` or `?error=...`). True
   * when it was a sign-in return (worked or not).
   */
  async completeOAuth(search: string): Promise<boolean> {
    if (!this.provider) return false;
    const q = new URLSearchParams(search.replace(/^\?/, ''));
    const code = q.get('code');
    const err = q.get('error_description') ?? q.get('error');
    if (!code && !err) return false;
    let verifier: string | null = null;
    try { verifier = JSON.parse(this.data.raw.get(PKCE_KEY) ?? 'null'); } catch { /* none */ }
    this.data.raw.set(PKCE_KEY, 'null');
    this.leaving = false;
    let s: AccountSession;
    try {
      if (err) throw new Error(err.replace(/\+/g, ' '));
      if (!verifier) throw new Error('it was started in another browser or tab');
      s = await this.provider.exchangeCode(code!, verifier);
    } catch (e) {
      this.error = `Sign-in did not work: ${message(e)}. Try again.`;
      this.emit();
      return true;
    }
    await this.begin(s);
    return true;
  }

  async sendLink(email: string) {
    if (!this.provider) return;
    this.error = '';
    try {
      await this.provider.sendSignInLink(email.trim(), this.opts.redirectTo());
      this.linkSentTo = email.trim();
    } catch (e) {
      this.error = `Could not send the link: ${message(e)}`;
    }
    this.emit();
  }

  /**
   * Finish a sign-in from a link's return address. The guest's progress on this device is added
   * to the account, then the account's progress comes down. True when the hash was a sign-in.
   */
  async completeSignIn(hash: string): Promise<boolean> {
    if (!this.provider) return false;
    let s: AccountSession | null;
    try {
      s = await this.provider.completeSignIn(hash);
    } catch (e) {
      this.error = `Sign-in did not work: ${message(e)}. Ask for a new link.`;
      this.emit();
      return true;
    }
    if (!s) return false;
    await this.begin(s);
    return true;
  }

  /** A new session on this device: the guest's progress goes into the account, then a sync. */
  private async begin(s: AccountSession) {
    this.session = s;
    this.state = {};
    this.linkSentTo = '';
    this.error = '';
    this.data.touch(this.data.syncedKeys());
    await this.sync();
  }

  /** Sign out. Progress stays on this device, which carries on as a guest. */
  async signOut() {
    const s = this.session;
    clearTimeout(this.timer);
    this.session = undefined;
    this.state = {};
    this.data.settle(this.data.changes());
    this.status = 'guest';
    this.error = '';
    this.newerData = false;
    this.emit();
    if (s) await this.provider?.signOut(s);
  }

  /**
   * Wipe progress: every take, star, XP, streak, practice day and path record, on this device
   * and, when signed in, in the account (so every device wipes on its next sync). Sketches, the
   * player's songs, calibration and settings stay. Nothing is deleted if the account can't be
   * reached. True when wiped.
   */
  async wipe(): Promise<boolean> {
    const at = new Date().toISOString();
    this.error = '';
    if (this.session && this.provider) {
      try {
        const s = await this.fresh();
        await this.provider.wipe(s, KEEP_ON_WIPE());
        await this.provider.push(s, [{ key: WIPED_KEY.slice(PREFIX.length), value: at, schema: this.opts.schema }]);
      } catch (e) {
        this.error = `Nothing was wiped: the account could not be reached (${message(e)}). Try again when online.`;
        this.emit();
        return false;
      }
    }
    this.data.wipeLocal();
    this.data.raw.set(WIPED_KEY, JSON.stringify(at));
    this.emit(true);
    return true;
  }

  /** Sync soon (after a change), grouping changes close together. */
  schedule(delay = PUSH_DELAY_MS) {
    if (!this.session || !this.provider) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.sync(), delay);
  }

  /** Sync now. A sync asked for while one runs follows it. Resolves true if progress came in. */
  sync(): Promise<boolean> {
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = this.run().finally(() => {
      this.running = undefined;
      if (this.again) {
        this.again = false;
        void this.sync();
      }
    });
    return this.running;
  }

  private async fresh(): Promise<AccountSession> {
    let s = this.session!;
    if (s.expiresAt - Date.now() < 60_000) {
      s = await this.provider!.refresh(s);
      this.session = s;
    }
    return s;
  }

  private async run(): Promise<boolean> {
    if (!this.session || !this.provider) return false;
    clearTimeout(this.timer);
    this.status = 'syncing';
    this.emit();
    let changed = false;
    try {
      const s = await this.fresh();
      const st = this.state;
      const since = st.cursor ? new Date(Date.parse(st.cursor) - OVERLAP_MS).toISOString() : undefined;
      const rows = await this.provider.pull(s, since);
      // Progress wiped on another device since this one last synced: wipe here too before taking
      // anything in. A device signing in for the first time keeps its guest progress.
      const wiped = rows.find((r) => PREFIX + r.key === WIPED_KEY);
      if (wiped && JSON.stringify(wiped.value) !== (this.data.get(WIPED_KEY) ?? 'null')) {
        if (st.cursor && wiped.updatedAt > st.cursor) {
          this.data.wipeLocal();
          changed = true;
        }
        this.data.raw.set(WIPED_KEY, JSON.stringify(wiped.value));
      }
      const local = this.data.changes();
      let cursor = st.cursor;
      let oldest = this.opts.schema;
      this.newerData = false;
      for (const r of rows) {
        if (!cursor || r.updatedAt > cursor) cursor = r.updatedAt;
        if (r.schema > this.opts.schema) { this.newerData = true; continue; }
        const full = PREFIX + r.key;
        const mine = this.data.get(full);
        const remote = r.value ?? null;
        let value: unknown = remote;
        if (local[full] !== undefined) {
          value = mergeRecord(r.key, parse(mine), remote, local[full] > Date.parse(r.updatedAt));
        }
        // The server hands records back with their keys in its own order (Postgres jsonb sorts
        // them), so only a different value counts as a change, not a different spelling of it.
        if (!sameValue(value ?? null, parse(mine))) {
          this.data.raw.set(full, JSON.stringify(value ?? null));
          changed = true;
        }
        oldest = Math.min(oldest, r.schema);
      }
      if (oldest < this.opts.schema) this.opts.upgradeFrom(oldest);
      // Send what changed here (merged records included).
      const sent = this.data.changes();
      const out: OutRow[] = Object.keys(sent).map((full) => ({ key: full.slice(PREFIX.length), value: parse(this.data.get(full)) ?? null, schema: this.opts.schema }));
      if (out.length) await this.provider.push(s, out);
      this.data.settle(sent);
      this.state = { cursor, lastSync: new Date().toISOString() };
      this.status = 'synced';
      this.error = '';
    } catch (e) {
      if (e instanceof SignedOutError) {
        this.session = undefined;
        this.state = {};
        this.status = 'guest';
        this.error = 'You were signed out. Sign in again to keep syncing; your progress is safe on this device.';
      } else if (/fetch|network|offline/i.test(message(e))) {
        this.status = 'offline';
        this.error = '';
      } else {
        this.status = 'error';
        this.error = `Sync failed: ${message(e)}`;
      }
    }
    this.emit(changed);
    return changed;
  }

  /** Sync on start, after changes, when the tab is hidden and when the network comes back. */
  start(win: Window = window) {
    this.data.onChange(() => this.schedule());
    win.addEventListener('online', () => void this.sync());
    win.addEventListener('focus', () => this.schedule(500));
    win.document.addEventListener('visibilitychange', () => {
      if (win.document.visibilityState === 'hidden' && Object.keys(this.data.changes()).length) void this.sync();
    });
    if (this.session) void this.sync();
  }
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
function parse(v: string | null): unknown {
  if (v === null || v === 'undefined') return null;
  try { return JSON.parse(v); } catch { return null; }
}

/** The same JSON value, whatever the order of object keys. */
export function sameValue(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b);
}
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).filter((k) => (v as Record<string, unknown>)[k] !== undefined).sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}
