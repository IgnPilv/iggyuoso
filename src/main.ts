import './style.css';
import { midi, MidiInput } from './midi/input';
import { computerKeys } from './midi/computerKeys';
import { demo, DEMO_CALIBRATION } from './demo/demo';
import { store } from './progress/store';
import { account, isSignInReturn } from './sync';
import { h, type View } from './ui/dom';
import { demoView } from './ui/demoView';
import { profileView } from './ui/profileView';
import { todayView } from './ui/todayView';
import { applyTheme, setThemeChoice, THEME_CHOICE_EVENT, themeChoice, type ThemeChoice } from './ui/theme';
import { calibrateView, exerciseView, homeView, lessonView, settingsView, testerView } from './ui/views';

const routes: Record<string, View> = {
  '': homeView,
  calibrate: calibrateView,
  lesson: lessonView,
  exercise: exerciseView,
  settings: settingsView,
  profile: profileView,
  today: todayView,
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

// Nav links carry an icon; on a phone only the icons show.
const NAV_ICONS: Record<string, string> = {
  profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.8 4.2-5.6 7.5-5.6s6.3 1.8 7.5 5.6"/></svg>',
  demo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z" fill="currentColor"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
};
const navLink = (route: string, label: string) => {
  const icon = h('span', { class: 'nav-icon', 'aria-hidden': 'true' });
  icon.innerHTML = NAV_ICONS[route];
  return h('a', { href: `#/${route}`, title: label, 'aria-label': label }, icon, h('span', { class: 'nav-label' }, label));
};
const navLinks = [navLink('profile', 'Profile'), navLink('demo', 'Demo'), navLink('settings', 'Settings')];

computerKeys.middleC = () => (demo.active ? DEMO_CALIBRATION : store.calibration)?.middleC ?? 60;
computerKeys.allow = () => !demo.active;
computerKeys.enable(!!store.settings.computerKeys);

// While the computer keyboard is on, the header says where it plays and how to shift it.
const keysPill = h('a', { href: '#/settings', class: 'keys-pill', title: 'Computer keyboard is on (Settings)' });
const showPill = () => {
  keysPill.hidden = !computerKeys.enabled;
  keysPill.textContent = `⌨ A = C${4 + computerKeys.shift} · Z X octave`;
};
showPill();
computerKeys.onChange(showPill);

const main = h('main');
document.getElementById('app')!.append(
  h('header', {},
    h('a', { href: '#/', class: 'brand' }, brandMark, 'iggyuoso'),
    h('span', { class: 'tagline' }, 'easy as C D E'),
    h('nav', {}, keysPill, ...navLinks, themeBtn),
  ),
  main,
);

let cleanup: (() => void) | void;
function render() {
  signInReturn();
  cleanup?.();
  main.replaceChildren();
  const [name = '', arg] = location.hash.replace(/^#\/?/, '').split('/');
  for (const a of navLinks) a.classList.toggle('current', a.getAttribute('href') === `#/${name}`);
  cleanup = (routes[name] ?? homeView)(main, arg && decodeURIComponent(arg));
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
// Progress from another device: redraw pages that show progress (never a running exercise).
account.onChange((changed) => {
  const name = location.hash.replace(/^#\/?/, '').split('/')[0];
  if (changed && !demo.active && ['', 'today', 'lesson', 'profile'].includes(name)) render();
});

window.addEventListener('hashchange', render);
if (MidiInput.supported()) {
  midi.start().then(render, (e) => {
    console.error(e);
    render(); // the banner now says access was blocked
  });
}
render();
