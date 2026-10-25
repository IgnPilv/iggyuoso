import type { View } from './dom';
import type { RecordRules } from './records';

// iggyuoso is one website with one account and several learning modules (the piano tutor first;
// later perhaps a math tutor or a painting course). The shell (src/app/) draws the header with a
// module switcher, routes pages and holds what every module shares: the account and sync, the
// profile's account card, Settings → Appearance, the theme and the design tokens. Everything else
// belongs to a module, which describes itself with this interface and is listed in
// src/app/modules.ts. How to add one: docs/modules.md.

export interface NavItem {
  /** Hash path without `#/`, e.g. `book` or `math/practice`. */
  href: string;
  label: string;
  /** Inline SVG (24×24 viewBox, `currentColor`); on a phone only the icon shows. */
  icon: string;
}

export interface Module {
  /** Short lowercase id: its URLs (`#/<id>`, `#/<id>/<route>`) and its records (`iggyuoso.<id>.*`). */
  id: string;
  /** Name in the switcher, e.g. "Piano". */
  name: string;
  /** One line under the name in the switcher. */
  description: string;
  /** Tagline next to the brand while this module is open. */
  tagline: string;
  /** Inline SVG for the switcher (same rules as NavItem.icon). */
  icon: string;
  /** A placeholder that only shows how modules work; marked "Sample" in the switcher. */
  sample?: boolean;
  /**
   * Pages by route name; '' is the module's home (what `#/` shows while the module is open).
   * They answer at `#/<id>/<route>/<arg>`.
   */
  routes: Record<string, View>;
  /**
   * The routes also answer at `#/<route>/<arg>`, without the module id. Only for the piano, whose
   * links predate modules; new modules leave it off. Names must not clash across modules.
   */
  topLevel?: boolean;
  /** Links in the header while the module is open (before the shared Profile, Demo, Settings). */
  nav: NavItem[];
  /** Extra things at the start of the header's nav (the piano's computer-keyboard pill). */
  headerExtras?: () => HTMLElement[];
  /**
   * Called when the module becomes the open one (first page of it), and `deactivate` when another
   * module is opened. `rerender` redraws the current page (e.g. once MIDI access is granted).
   */
  activate?: (rerender: () => void) => void;
  deactivate?: () => void;
  /** Cards on the shared Settings page, above Appearance. */
  settings?: View;
  /** The module's part of the shared Profile page, under the account card. */
  profile?: View;
  /** One line about this module's progress, shown on the Profile while another module is open. */
  summary?: () => string | undefined;
  /** The module's demo, at `#/demo` while it is open (`#/demo/start` starts the tour). */
  demo?: View;
  /** Pages (route names) that redraw when progress comes in from another device. */
  redrawOnSync?: string[];
  /** Saved records: merge rules, what a wipe keeps, upgrades (src/core/records.ts). */
  records?: RecordRules;
}
