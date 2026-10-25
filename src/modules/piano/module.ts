import type { Module } from '../../core/module';
import { h } from '../../core/dom';
import { demo, DEMO_CALIBRATION } from './demo/demo';
import { computerKeys } from './midi/computerKeys';
import { midi, MidiInput } from './midi/input';
import { mastery } from './progress';
import { PIANO_RECORD_WORDS, PIANO_RECORDS } from './progress/records';
import { store } from './progress/store';
import { bookView } from './ui/bookView';
import { chordFinderView } from './ui/chordFinderView';
import { demoView } from './ui/demoView';
import { jamView } from './ui/jamView';
import { scaleGymView } from './ui/scaleGymView';
import { byEarView } from './ui/byEarView';
import { mySongsView } from './ui/mySongsView';
import { noteRushView } from './ui/noteRush';
import { pianoProfile } from './ui/profileView';
import { playReportView } from './ui/playReportView';
import { pulseView } from './ui/pulseView';
import { sketchbookView } from './ui/sketchbookView';
import { todayView } from './ui/todayView';
import { branchView, songsView, songView } from './ui/treePages';
import { calibrateView, exerciseView, homeView, lessonView, settingsView, testerView } from './ui/views';

// The piano tutor, the first module. Its pages keep their addresses from before modules
// (`#/lesson/<id>`, `#/book`, ...), so `topLevel` is on; `#/piano/<route>` works too.

const ICON = {
  piano: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M8 4.5v15M12 4.5v15M16 4.5v15"/><path d="M6.5 4.5h3v8h-3zM14.5 4.5h3v8h-3z" fill="currentColor"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5c-2-1.6-4.6-2.2-8-2v13c3.4-.2 6 .4 8 2 2-1.6 4.6-2.2 8-2v-13c-3.4-.2-6 .4-8 2z"/><path d="M12 6.5v13"/></svg>',
  songs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg>',
  sketchbook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3.5h11.5a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5z"/><path d="M8.5 3.5v17"/><path d="M12 9.5h3.5M12 13h3.5"/></svg>',
};

computerKeys.middleC = () => (demo.active ? DEMO_CALIBRATION : store.calibration)?.middleC ?? 60;
computerKeys.allow = () => !demo.active;

// While the computer keyboard is on, the header says where it plays and how to shift it.
let keysPill: HTMLAnchorElement | undefined;
const pill = () => (keysPill ??= h('a', { href: '#/settings', class: 'keys-pill', title: 'Computer keyboard is on (Settings)' }));
const showPill = () => {
  if (!keysPill) return;
  keysPill.hidden = !computerKeys.enabled;
  keysPill.replaceChildren('⌨', h('span', { class: 'keys-pill-text' }, ` A = C${4 + computerKeys.shift} · Z X octave`));
};
computerKeys.onChange(showPill);

let midiStarted = false;

export const piano: Module = {
  id: 'piano',
  name: 'Piano',
  description: 'Piano trainer for a MIDI keyboard',
  tagline: 'easy as C D E',
  icon: ICON.piano,
  routes: {
    '': homeView,
    calibrate: calibrateView,
    lesson: lessonView,
    exercise: exerciseView,
    today: todayView,
    branch: branchView,
    songs: songsView,
    book: bookView,
    song: songView,
    sketchbook: sketchbookView,
    mysongs: mySongsView,
    midi: testerView,
    noterush: noteRushView,
    chords: chordFinderView,
    pulse: pulseView,
    jam: jamView,
    scales: scaleGymView,
    byear: byEarView,
    report: playReportView,
  },
  topLevel: true,
  nav: [
    { href: 'book', label: 'Book', icon: ICON.book },
    { href: 'songs', label: 'Songs', icon: ICON.songs },
    { href: 'sketchbook', label: 'Sketchbook', icon: ICON.sketchbook },
  ],
  headerExtras: () => { pill(); showPill(); return [pill()]; },
  activate: (rerender) => {
    computerKeys.enable(!!store.settings.computerKeys);
    showPill();
    if (!midiStarted && MidiInput.supported()) {
      midiStarted = true;
      midi.start().then(rerender, (e) => {
        console.error(e);
        rerender(); // the banner now says access was blocked
      });
    }
  },
  // Letters typed in another module are not piano keys.
  deactivate: () => computerKeys.enable(false),
  settings: settingsView,
  profile: pianoProfile,
  summary: () => {
    const m = mastery.meta;
    return m.xp ? `${m.xp} XP, ${mastery.currentStreak()} day streak` : undefined;
  },
  demo: demoView,
  redrawOnSync: ['', 'today'],
  records: { ...PIANO_RECORDS, upgrade: (v) => store.upgradeFrom(v) },
};

export { PIANO_RECORD_WORDS };
