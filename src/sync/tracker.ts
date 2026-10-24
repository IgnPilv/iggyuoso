import type { Backend } from '../progress/store';

// Notes which saved records changed since the last sync, so only those are sent. Wraps the
// store's backend: every write to a synced key stamps it in `iggyuoso.sync.changes`.

export const PREFIX = 'iggyuoso.';
/** Records that belong to this device: the keyboard, its timing and the look of the app. */
export const LOCAL_ONLY = new Set(['schema', 'calibration', 'settings', 'account']);
export const CHANGES_KEY = `${PREFIX}sync.changes`;
/** When progress was last wiped (ISO), synced so every device wipes too. */
export const WIPED_KEY = `${PREFIX}wiped`;
/** Kept by "Wipe progress": the player's own ideas and songs, which are work, not progress. */
export const KEEP_ON_WIPE = ['sketch.', 'mysong.'];

/** Whether a full storage key is copied to the account. Unknown new records sync by default. */
export function isSynced(fullKey: string) {
  if (!fullKey.startsWith(PREFIX)) return false;
  const k = fullKey.slice(PREFIX.length);
  // `wiped` reaches the server only from Account.wipe, never as a changed record.
  return !LOCAL_ONLY.has(k) && !k.startsWith('sync.') && k !== 'wiped';
}

/** Whether a full storage key is progress that "Wipe progress" deletes. */
export function isProgress(fullKey: string) {
  const k = fullKey.slice(PREFIX.length);
  return isSynced(fullKey) && !KEEP_ON_WIPE.some((p) => k.startsWith(p));
}

export interface TrackedBackend extends Backend {
  /** The wrapped backend: writes through it are not stamped (pulled data, sync state). */
  readonly raw: Backend;
  /** Changed synced keys (full keys) and when they changed, ms since 1970. */
  changes(): Record<string, number>;
  /** Mark keys changed now (all synced keys, when a guest signs in). */
  touch(fullKeys: string[]): void;
  /** Forget changes that were sent, unless the key changed again after `sent`. */
  settle(sent: Record<string, number>): void;
  /** Every synced key saved on this device. */
  syncedKeys(): string[];
  /** Called after every stamped write. */
  onChange(fn: () => void): () => void;
  /** Delete every progress record on this device (not stamped: nothing to send). */
  wipeLocal(): void;
}

export function tracked(raw: Backend, now = () => Date.now()): TrackedBackend {
  const listeners = new Set<() => void>();
  const changes = (): Record<string, number> => {
    try { return JSON.parse(raw.get(CHANGES_KEY) ?? '{}'); } catch { return {}; }
  };
  const save = (c: Record<string, number>) => raw.set(CHANGES_KEY, JSON.stringify(c));
  const touch = (keys: string[]) => {
    if (!keys.length) return;
    const c = changes();
    const t = now();
    for (const k of keys) c[k] = t;
    save(c);
    listeners.forEach((fn) => fn());
  };
  return {
    raw,
    get: (k) => raw.get(k),
    set: (k, v) => {
      raw.set(k, v);
      if (isSynced(k)) touch([k]);
    },
    keys: () => raw.keys?.() ?? [],
    changes,
    touch,
    settle: (sent) => {
      const c = changes();
      for (const [k, t] of Object.entries(sent)) if (c[k] === t) delete c[k];
      save(c);
    },
    syncedKeys: () => (raw.keys?.() ?? []).filter(isSynced),
    wipeLocal: () => {
      const gone = (raw.keys?.() ?? []).filter(isProgress);
      for (const k of gone) {
        if (raw.remove) raw.remove(k);
        else raw.set(k, 'null');
      }
      const c = changes();
      for (const k of gone) delete c[k];
      save(c);
    },
    onChange: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
