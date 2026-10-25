import { account, isSignInReturn } from '../core/sync';
import { accountCard } from '../core/accountView';
import { themeSetting } from '../core/appearance';
import { h, type View } from '../core/dom';
import type { Module, NavItem } from '../core/module';
import { applyTheme, setThemeChoice, THEME_CHOICE_EVENT, themeChoice, type ThemeChoice } from '../core/theme';
import { MODULES, openModule, saveOpenModule } from './modules';
import { resolveRoute, type ShellRoute } from './router';

// The shell every module shares: the header (brand, module switcher, the open module's links,
// then Profile, Demo, Settings and the theme button), the router, and the shared pages.

const ICONS: Record<ThemeChoice, string> = {
  system: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
  light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>',
  dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
};
const NEXT_THEME: Record<ThemeChoice, ThemeChoice> = { system: 'dark', dark: 'light', light: 'system' };
const THEME_LABEL: Record<ThemeChoice, string> = { system: 'Theme: follow the device', dark: 'Theme: dark', light: 'Theme: light' };

const SHARED_NAV: NavItem[] = [
  { href: 'profile', label: 'Profile', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.8 4.2-5.6 7.5-5.6s6.3 1.8 7.5 5.6"/></svg>' },
  { href: 'demo', label: 'Demo', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z" fill="currentColor"/></svg>' },
  { href: 'settings', label: 'Settings', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>' },
];

const CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10l5 5 5-5"/></svg>';

const iconEl = (svg: string, cls = 'nav-icon') => {
  const el = h('span', { class: cls, 'aria-hidden': 'true' });
  el.innerHTML = svg;
  return el;
};

export const navLink = (item: NavItem) =>
  h('a', { href: `#/${item.href}`, title: item.label, 'aria-label': item.label }, iconEl(item.icon), h('span', { class: 'nav-label' }, item.label));

/**
 * The module switcher: the open module's icon and name, opening a list of every module. Also
 * used by the demo with `onPick`, so picking there switches nothing.
 */
export function moduleSwitcher(current: Module, modules: Module[] = MODULES, onPick?: (m: Module) => void): HTMLElement {
  const btn = h('button', { class: 'module-btn', 'aria-haspopup': 'true', 'aria-expanded': 'false', title: `${current.name}: switch module` },
    iconEl(current.icon, 'module-icon'), h('span', { class: 'module-name' }, current.name), iconEl(CHEVRON, 'module-chevron'));
  const menu = h('div', { class: 'module-menu', role: 'menu', hidden: true },
    h('p', { class: 'small module-menu-head' }, 'Modules · one account for all'),
    ...modules.map((m) => h('a', {
      href: `#/${m.id}`, role: 'menuitem', class: m.id === current.id ? 'module-item current' : 'module-item',
      onclick: (e: Event) => { close(); if (onPick) { e.preventDefault(); onPick(m); } },
    },
    iconEl(m.icon, 'module-icon'),
    h('span', {}, h('strong', {}, m.name, m.sample ? h('span', { class: 'module-sample' }, 'Sample') : ''), h('span', { class: 'small' }, m.description)))));
  const wrap = h('div', { class: 'module-switch' }, btn, menu);
  const outside = (e: Event) => { if (!wrap.contains(e.target as Node)) close(); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { close(); btn.focus(); } };
  function close() {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside);
    document.removeEventListener('keydown', onKey);
  }
  btn.onclick = () => {
    if (!menu.hidden) return close();
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', onKey);
  };
  return wrap;
}

// ---------------------------------------------------------------- shared pages

const profilePage = (m: Module): View => (root, arg) => {
  root.append(h('div', { class: 'profile' }, accountCard(account)));
  const off = m.profile?.(root, arg);
  const others = MODULES.filter((x) => x !== m).map((x) => ({ x, line: x.summary?.() })).filter((o) => o.line);
  if (others.length) {
    root.append(h('section', { class: 'card' },
      h('h2', {}, 'Also on this account'),
      ...others.map(({ x, line }) => h('p', {}, h('a', { href: `#/${x.id}` }, x.name), `: ${line}.`))));
  }
  return off;
};

const settingsPage = (m: Module): View => (root, arg) => {
  const off = m.settings?.(root, arg);
  const appearance = themeSetting();
  root.append(appearance.el);
  return () => { off?.(); appearance.off(); };
};

const demoPage = (m: Module): View => (root, arg) => {
  if (m.demo) return m.demo(root, arg);
  const piano = MODULES.find((x) => x.demo);
  root.append(h('section', { class: 'card' },
    h('h2', {}, 'Demo'),
    h('p', {}, `${m.name} has no demo of its own yet.`),
    piano ? h('p', {}, h('a', { href: `#/${piano.id}`, onclick: () => setTimeout(() => { location.hash = '#/demo'; }) }, `Watch the ${piano.name} demo`), ', which also shows how modules are switched.') : ''));
};

const SHARED: Record<ShellRoute, (m: Module) => View> = { profile: profilePage, settings: settingsPage, demo: demoPage };

// ---------------------------------------------------------------- start

export function startShell(app: HTMLElement) {
  applyTheme();
  const themeBtn = h('button', { class: 'icon-btn theme-toggle' });
  const showThemeBtn = () => {
    const c = themeChoice();
    themeBtn.innerHTML = ICONS[c];
    themeBtn.title = `${THEME_LABEL[c]} (click to change)`;
    themeBtn.setAttribute('aria-label', themeBtn.title);
  };
  themeBtn.onclick = () => setThemeChoice(NEXT_THEME[themeChoice()]);
  window.addEventListener(THEME_CHOICE_EVENT, showThemeBtn);
  showThemeBtn();

  const brandMark = h('span', { class: 'brand-mark' });
  brandMark.innerHTML = '<svg viewBox="0 0 16 16"><rect x="2" y="2" width="3" height="12" rx="1.5" fill="#fff"/><rect x="6.5" y="2" width="3" height="8" rx="1.5" fill="#fff"/><rect x="11" y="2" width="3" height="12" rx="1.5" fill="#fff"/></svg>';

  const switchSlot = h('span', { class: 'module-slot' });
  const tagline = h('span', { class: 'tagline' });
  const nav = h('nav');
  const shared = SHARED_NAV.map(navLink);
  const main = h('main');
  app.append(h('header', {}, h('a', { href: '#/', class: 'brand', 'aria-label': 'iggyuoso' }, brandMark, h('span', { class: 'brand-word' }, 'iggyuoso')), switchSlot, tagline, nav), main);

  let current: Module | undefined;
  let moduleLinks: HTMLAnchorElement[] = [];
  const open = (m: Module) => {
    if (current === m) return;
    current?.deactivate?.();
    current = m;
    saveOpenModule(m.id);
    document.documentElement.dataset.module = m.id;
    switchSlot.replaceChildren(moduleSwitcher(m));
    tagline.textContent = m.tagline;
    moduleLinks = m.nav.map(navLink);
    nav.replaceChildren(...(m.headerExtras?.() ?? []), ...moduleLinks, ...shared, themeBtn);
    m.activate?.(render);
  };

  let cleanup: (() => void) | void;
  let page: { module: Module; route: string } | undefined;
  function render() {
    signInReturn();
    cleanup?.();
    main.replaceChildren();
    const r = resolveRoute(location.hash, MODULES, openModule().id);
    open(r.module);
    page = { module: r.module, route: r.route };
    // The link for this page: the longest one the address starts with.
    let path = location.hash.replace(/^#\/?/, '');
    if (r.module.topLevel && path.startsWith(`${r.module.id}/`)) path = path.slice(r.module.id.length + 1);
    const links = [...moduleLinks, ...shared];
    const hrefOf = (a: HTMLAnchorElement) => a.getAttribute('href')!.slice(2);
    const best = links.filter((a) => path === hrefOf(a) || path.startsWith(`${hrefOf(a)}/`)).sort((a, b) => hrefOf(b).length - hrefOf(a).length)[0];
    for (const a of links) a.classList.toggle('current', a === best);
    cleanup = r.kind === 'shell' ? SHARED[r.route](r.module)(main, r.arg) : r.module.routes[r.route](main, r.arg);
    window.scrollTo(0, 0);
  }

  // A sign-in link comes back with the sign-in in the hash: finish it on the profile page.
  function signInReturn() {
    if (!isSignInReturn(location.hash)) return;
    const hash = location.hash;
    history.replaceState(null, '', '#/profile');
    void account.completeSignIn(hash);
  }
  signInReturn();
  account.start();
  // Progress from another device: redraw pages that show progress (the profile, and the pages
  // the open module names). Never a lesson: a redraw would start it again from step 1.
  account.onChange((changed) => {
    if (!changed || !page) return;
    if (page.route === 'profile' || (page.module.redrawOnSync ?? []).includes(page.route)) render();
  });

  window.addEventListener('hashchange', render);
  render();
}
