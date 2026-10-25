import { mergeRules } from '../records';

// When the same record changed on this device and on the account since the last sync (two
// devices used offline), the two versions are merged. Each module gives rules for its records
// that grow (src/core/records.ts); everything else takes the newer version.

/** Merge a record (store key without the prefix) changed on both sides. */
export function mergeRecord(key: string, local: unknown, remote: unknown, localNewer: boolean): unknown {
  if (local === null || local === undefined) return remote;
  if (remote === null || remote === undefined) return local;
  const rule = mergeRules().find(([test]) => test(key))?.[1];
  if (rule && typeof local === 'object' && typeof remote === 'object') {
    try { return rule(local, remote, localNewer); } catch { /* odd shape: fall back to newer wins */ }
  }
  return localNewer ? local : remote;
}
