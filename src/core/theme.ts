// Light / dark theme, shared by every module. The choice (System, Light, Dark) is saved in the
// device's settings record; the resolved theme is the data-theme attribute on <html>, set before
// first paint by index.html and kept in sync here. Canvas views read colours through palette(), which follows the CSS tokens.

import { patchSettings, readSettings } from './storage';

export type ThemeChoice = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: light)') : undefined;
const listeners = new Set<(t: Theme) => void>();
let override: Theme | undefined;

export function themeChoice(): ThemeChoice {
  const t = readSettings().theme;
  return t === 'light' || t === 'dark' ? t : 'system';
}

/** Save and apply the player's choice. */
export function setThemeChoice(choice: ThemeChoice) {
  patchSettings({ theme: choice });
  applyTheme(choice);
  window.dispatchEvent(new Event(THEME_CHOICE_EVENT));
}

/** Fired on window when the saved choice changes (the header button and Settings both listen). */
export const THEME_CHOICE_EVENT = 'iggyuoso:theme-choice';

export function resolveTheme(choice: ThemeChoice = themeChoice()): Theme {
  if (override) return override;
  if (choice !== 'system') return choice;
  return media?.matches ? 'light' : 'dark';
}

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

/** Apply the saved choice (or a temporary override) to the page. */
export function applyTheme(choice: ThemeChoice = themeChoice()) {
  const t = resolveTheme(choice);
  const root = document.documentElement;
  if (root.dataset.theme === t) return;
  root.dataset.theme = t;
  cached = undefined;
  tokenCache.clear();
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t === 'light' ? '#f6f3ee' : '#08070d');
  for (const f of listeners) f(t);
}

/**
 * Show a theme without saving it (the demo uses this to show both looks). Pass undefined to go
 * back to the saved choice.
 */
export function previewTheme(t: Theme | undefined) {
  override = t;
  applyTheme();
}

export function onThemeChange(f: (t: Theme) => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

media?.addEventListener('change', () => applyTheme());

// ---------------------------------------------------------------- canvas palette

const PALETTE_VARS = {
  laneBg: '--lane-bg', laneLine: '--lane-line', laneC: '--lane-c', laneBeat: '--lane-beat',
  laneBar: '--lane-bar', laneText: '--lane-text', laneBig: '--lane-big', laneMiddleC: '--lane-middle-c',
  hitLine: '--hit-line', noteInk: '--note-ink',
  rh: '--rh', rhBright: '--rh-bright', rhKey: '--rh-key',
  lh: '--lh', lhBright: '--lh-bright', lhKey: '--lh-key',
  ok: '--ok', bad: '--bad', target: '--target',
  keyWhite: '--key-white', keyBlack: '--key-black', keyStroke: '--key-stroke', keyLabel: '--key-label',
  keyPos: '--key-pos', keyPressed: '--key-pressed', middleC: '--middle-c',
  fontDisplay: '--font-display', fontBody: '--font-body', fontMono: '--font-mono',
} as const;

export type Palette = Record<keyof typeof PALETTE_VARS, string>;
let cached: Palette | undefined;

/** Current token values for drawing on a canvas. Cheap: cached until the theme changes. */
export function palette(): Palette {
  if (cached) return cached;
  const css = getComputedStyle(document.documentElement);
  cached = Object.fromEntries(
    Object.entries(PALETTE_VARS).map(([k, v]) => [k, css.getPropertyValue(v).trim()]),
  ) as Palette;
  return cached;
}

/** A colour for canvas drawing: a CSS token name ('--ok') is looked up, anything else passes through. */
export function tokenColor(c: string): string {
  if (!c.startsWith('--')) return c;
  let v = tokenCache.get(c);
  if (v === undefined) {
    v = getComputedStyle(document.documentElement).getPropertyValue(c).trim();
    tokenCache.set(c, v);
  }
  return v;
}
const tokenCache = new Map<string, string>();
