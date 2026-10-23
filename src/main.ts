import './style.css';
import { midi, MidiInput } from './midi/input';
import { h, type View } from './ui/dom';
import { demoView } from './ui/demoView';
import { applyTheme, setThemeChoice, THEME_CHOICE_EVENT, themeChoice, type ThemeChoice } from './ui/theme';
import { calibrateView, exerciseView, homeView, lessonView, settingsView, testerView } from './ui/views';

const routes: Record<string, View> = {
  '': homeView,
  calibrate: calibrateView,
  lesson: lessonView,
  exercise: exerciseView,
  settings: settingsView,
  midi: testerView,
  demo: demoView,
};

applyTheme();

const ICONS: Record<ThemeChoice, string> = {
  system: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
  light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>',
  dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
};
const NEXT_THEME: Record<ThemeChoice, ThemeChoice> = { system: 'dark', dark: 'light', light: 'system' };
const THEME_LABEL: Record<ThemeChoice, string> = { system: 'Theme: follow the device', dark: 'Theme: dark', light: 'Theme: light' };

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

const navLinks = [h('a', { href: '#/demo' }, 'Demo'), h('a', { href: '#/settings' }, 'Settings')];
const main = h('main');
document.getElementById('app')!.append(
  h('header', {},
    h('a', { href: '#/', class: 'brand' }, brandMark, 'iggyuoso'),
    h('span', { class: 'tagline' }, 'hands apart, then together'),
    h('nav', {}, ...navLinks, themeBtn),
  ),
  main,
);

let cleanup: (() => void) | void;
function render() {
  cleanup?.();
  main.replaceChildren();
  const [name = '', arg] = location.hash.replace(/^#\/?/, '').split('/');
  for (const a of navLinks) a.classList.toggle('current', a.getAttribute('href') === `#/${name}`);
  cleanup = (routes[name] ?? homeView)(main, arg && decodeURIComponent(arg));
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);
if (MidiInput.supported()) {
  midi.start().then(render, (e) => {
    console.error(e);
    main.prepend(h('p', { class: 'banner error' }, 'MIDI access was blocked. Allow MIDI for this site in the browser settings, then reload.'));
  });
}
render();
