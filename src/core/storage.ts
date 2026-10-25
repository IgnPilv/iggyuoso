import { PREVIEW, prefixedBackend, previewPrefix, seedPreview } from './preview';
import { PREFIX, tracked } from './sync/tracker';

export { PREFIX };

// Everything the app saves lives on the device (localStorage) under `iggyuoso.`, as a guest. It
// goes through a small key-value backend; the device's backend notes each change so a signed-in
// account can copy it to the server and back (src/core/sync/). Every module shares this storage
// and the one account: a module keeps its records under its own namespace (`moduleRecords`), so
// one account holds the progress of every module. The piano module predates modules and keeps its
// records without a prefix (src/modules/piano/progress/records.ts).

export interface Backend {
  get(key: string): string | null;
  set(key: string, value: string): void;
  /** Every key saved, for sync. */
  keys?(): string[];
  /** Forget a key (wiping progress). */
  remove?(key: string): void;
}

const browserStorage: Required<Backend> = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage full or blocked */ } },
  keys: () => {
    try { return Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!).filter(Boolean); } catch { return []; }
  },
  remove: (k) => { try { localStorage.removeItem(k); } catch { /* blocked */ } },
};

/** The device's storage; a preview build keeps its own copy (src/core/preview.ts). */
export const localBackend: Backend = PREVIEW ? prefixedBackend(browserStorage, previewPrefix(PREVIEW)) : browserStorage;
if (PREVIEW) seedPreview(browserStorage, localBackend as Required<Backend>);

export function memoryBackend(): Backend {
  const m = new Map<string, string>();
  return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v), keys: () => [...m.keys()], remove: (k) => void m.delete(k) };
}

/**
 * Version of everything saved under PREFIX, for every module (the account's rows carry it). When a
 * module changes the shape of its saved records, bump this and add the upgrade step to that
 * module's `upgradeFrom` (the piano's are in progress/store.ts).
 */
export const SCHEMA_VERSION = 1;

/** This device's saved data, with changes noted for sync. */
export const deviceData = tracked(localBackend);

/** JSON records of one module, saved as `iggyuoso.<namespace>.<key>`, synced with the account. */
export class ModuleRecords {
  constructor(readonly namespace: string, private backend: Backend = deviceData) {}

  private full(key: string) { return `${PREFIX}${this.namespace}.${key}`; }

  get<T>(key: string): T | undefined {
    const v = this.backend.get(this.full(key));
    if (v === null) return undefined;
    try { return (JSON.parse(v) ?? undefined) as T | undefined; } catch { return undefined; }
  }

  put(key: string, v: unknown) { this.backend.set(this.full(key), JSON.stringify(v)); }
}

/** The shared, device-only settings record (`iggyuoso.settings`); modules add their own fields. */
export function readSettings(): Record<string, unknown> {
  try { return JSON.parse(deviceData.get(`${PREFIX}settings`) ?? '{}') ?? {}; } catch { return {}; }
}
export function patchSettings(patch: Record<string, unknown>) {
  deviceData.set(`${PREFIX}settings`, JSON.stringify({ ...readSettings(), ...patch }));
}
