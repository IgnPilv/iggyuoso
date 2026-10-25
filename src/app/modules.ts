import type { Module } from '../core/module';
import { addRecordRules } from '../core/records';
import { deviceData, PREFIX } from '../core/storage';
import { piano } from '../modules/piano/module';
import { sums } from '../modules/sums/module';

// Every module on the site, in switcher order. The first is the default for a new visitor.
// To add one: write src/modules/<id>/module.ts and list it here (docs/modules.md).
export const MODULES: Module[] = [piano, sums];

for (const m of MODULES) addRecordRules(m.records);

const OPEN_KEY = `${PREFIX}module`;

/** The module open on this device (saved on the device only). */
export function openModule(): Module {
  let id: unknown;
  try { id = JSON.parse(deviceData.get(OPEN_KEY) ?? 'null'); } catch { /* unreadable: the default */ }
  return MODULES.find((m) => m.id === id) ?? MODULES[0];
}
export function saveOpenModule(id: string) {
  if (openModule().id !== id) deviceData.set(OPEN_KEY, JSON.stringify(id));
}
