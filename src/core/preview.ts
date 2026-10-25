import type { Backend } from './storage';

// Preview builds (docs/previews.md): a branch named `preview/<name>` is built into
// /iggyuoso/preview/<name>/ with VITE_PREVIEW=<name>. A preview shares the site's origin, so it
// keeps its own copy of the saved data, under `iggyuoso-preview-<name>.` in localStorage, and
// runs as a guest (no account server): trying an idea never touches the real progress or account.
// The first time a preview opens it copies the device's progress from the main site, so it can be
// tried with real progress.

const env = import.meta.env.VITE_PREVIEW;
export const PREVIEW: string = typeof env === 'string' ? env.trim() : '';

const REAL = 'iggyuoso.';
const SEEDED = 'preview.seeded';
// Never copied: the account and its sync state belong to the main site.
const NOT_COPIED = /^iggyuoso\.(account|sync\.)/;

/** `base` with every `iggyuoso.` key stored under `<prefix>` instead. */
export function prefixedBackend(base: Required<Backend>, prefix: string): Required<Backend> {
  const to = (k: string) => (k.startsWith(REAL) ? prefix + k.slice(REAL.length) : k);
  return {
    get: (k) => base.get(to(k)),
    set: (k, v) => base.set(to(k), v),
    keys: () => base.keys().filter((k) => k.startsWith(prefix)).map((k) => REAL + k.slice(prefix.length)),
    remove: (k) => base.remove(to(k)),
  };
}

/** Copies the main site's records into the preview's own space, once. */
export function seedPreview(base: Required<Backend>, preview: Required<Backend>) {
  if (preview.get(REAL + SEEDED)) return;
  for (const k of base.keys()) {
    if (!k.startsWith(REAL) || NOT_COPIED.test(k)) continue;
    const v = base.get(k);
    if (v !== null) preview.set(k, v);
  }
  preview.set(REAL + SEEDED, new Date().toISOString());
}

export const previewPrefix = (name: string) => `iggyuoso-preview-${name}.`;
