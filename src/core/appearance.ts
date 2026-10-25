import { h } from './dom';
import { setThemeChoice, THEME_CHOICE_EVENT, themeChoice, type ThemeChoice } from './theme';

// Settings → Appearance, shared by every module.

const THEME_CHOICES: [ThemeChoice, string][] = [['system', 'Follow the device'], ['dark', 'Dark'], ['light', 'Light']];

/** Appearance card: System / Dark / Light, kept in sync with the header button. */
export function themeSetting() {
  const buttons = THEME_CHOICES.map(([v, label]) =>
    h('button', { class: 'seg', 'data-theme-choice': v, onclick: () => setThemeChoice(v) }, label));
  const sync = () => buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeChoice === themeChoice())));
  sync();
  window.addEventListener(THEME_CHOICE_EVENT, sync);
  const el = h('section', { class: 'card' },
    h('h2', {}, 'Appearance'),
    h('div', { class: 'setting-row' },
      h('p', { class: 'small' }, 'Dark is easy on the eyes. "Follow the device" switches with your system.'),
      h('div', { class: 'segmented', role: 'group', 'aria-label': 'theme' }, ...buttons)));
  return { el, off: () => window.removeEventListener(THEME_CHOICE_EVENT, sync) };
}

