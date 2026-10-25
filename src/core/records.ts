// What each module tells the shared account about its saved records (keys without `iggyuoso.`).
// Modules declare these in `Module.records`; the app registers them at start (src/app/modules.ts).

/** Merges a record changed on this device and on the account since the last sync. */
export type MergeRule = (local: any, remote: any, localNewer: boolean) => unknown;

export interface RecordRules {
  /** Records that grow (takes, logs, XP) and keep the most of both sides; the rest: newer wins. */
  merge?: [test: (key: string) => boolean, rule: MergeRule][];
  /** Key prefixes "Wipe progress" keeps: the player's own work, which is not progress. */
  keepOnWipe?: string[];
  /** What is kept, in words, for the wipe confirmation ("your sketches"). */
  keptLabel?: string;
  /** Records that stay on this device and never sync (exact keys). */
  localOnly?: string[];
  /**
   * Upgrade this module's records saved by an older app, from schema version `v` (also run on
   * records pulled from the account, so it must leave upgraded records as they are).
   */
  upgrade?: (v: number) => void;
}

/** Records of the shell itself: the device's look, which module is open, sync state. */
const SHELL: RecordRules = { localOnly: ['schema', 'settings', 'account', 'module'] };

const all: RecordRules[] = [SHELL];

export function addRecordRules(r: RecordRules | undefined) {
  if (r && !all.includes(r)) all.push(r);
}

export const mergeRules = () => all.flatMap((r) => r.merge ?? []);
export const keepOnWipe = () => all.flatMap((r) => r.keepOnWipe ?? []);
export const keptLabels = () => all.flatMap((r) => (r.keptLabel ? [r.keptLabel] : []));
export const localOnly = () => new Set(all.flatMap((r) => r.localOnly ?? []));
export const upgradeAll = (v: number) => all.forEach((r) => r.upgrade?.(v));
