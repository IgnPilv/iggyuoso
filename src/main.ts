import './style.css';
import { midi, MidiInput } from './midi/input';
import { h, type View } from './ui/dom';
import { demoView } from './ui/demoView';
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

const main = h('main');
document.getElementById('app')!.append(
  h('header', {},
    h('a', { href: '#/', class: 'brand' }, 'iggyuoso'),
    h('span', { class: 'tagline' }, 'hands apart, then together'),
    h('nav', {}, h('a', { href: '#/demo' }, 'Demo'), ' ', h('a', { href: '#/settings' }, 'Settings')),
  ),
  main,
);

let cleanup: (() => void) | void;
function render() {
  cleanup?.();
  main.replaceChildren();
  const [name = '', arg] = location.hash.replace(/^#\/?/, '').split('/');
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
