import { calibrate, keyName, shiftMiddleC, type Calibration } from '../calibration';
import { book, content, contentErrors, exerciseTitle, nodeOfLesson, songOf, stages, treeNodes } from '../content';
import type { Lesson } from '../content/types';
import { midi, MidiInput } from '../midi/input';
import { computerKeys, KEY_SEMITONES, letterOf, typing } from '../midi/computerKeys';
import { demo, DEMO_CALIBRATION } from '../demo/demo';
import { lessonAdvice, lessonGoals, lessonStage, mastery, nextLesson, noteSkipped, type LessonAdvice } from '../progress';
import { store } from '../progress/store';
import { h, s as svgEl, type View } from './dom';
import { KeyboardView } from './keyboard';
import { explainBlock, playground } from './theory';
import { readStep } from './bookView';
import { mountExercise } from './players';
import { lessonRecap } from './recap';
import { stepBar } from './stepBar';
import { guardSpace } from './keys';
import { BRANCH_LABEL, currentStage, growingNow, growingTree, snapshot, songsCard, stageList } from './treeView';
import { todayCard } from './todayView';
import { setThemeChoice, THEME_CHOICE_EVENT, themeChoice, type ThemeChoice } from './theme';

export const go = (path: string) => { location.hash = path; };

function setComputerKeys(on: boolean) {
  store.settings = { ...store.settings, computerKeys: on };
  computerKeys.enable(on);
}

const useComputerKeys = () =>
  h('button', { class: 'secondary', onclick: () => setComputerKeys(true) }, 'Use the computer keyboard instead');

function midiBanner(): HTMLElement | null {
  if (demo.active || computerKeys.enabled) return null;
  if (!MidiInput.supported()) {
    return h('p', { class: 'banner error' }, 'This browser cannot read MIDI keyboards. Please open iggyuoso in Chrome or Edge. ', useComputerKeys());
  }
  if (midi.blocked) {
    return h('p', { class: 'banner error' }, 'MIDI access was blocked. Allow MIDI for this site in the browser settings, then reload. ', useComputerKeys());
  }
  if (!midi.ready) return h('p', { class: 'banner' }, 'Waiting for MIDI permission…');
  if (!midi.inputNames().length) return h('p', { class: 'banner' }, 'No MIDI keyboard found. Plug it in and switch it on; it will show up here. ', useComputerKeys());
  return null;
}

export function needCalibration(root: HTMLElement): Calibration | undefined {
  const c = demo.active ? DEMO_CALIBRATION : store.calibration;
  if (!c) {
    root.append(h('p', { class: 'banner' }, 'First, let the app get to know your keyboard. ', h('a', { href: '#/calibrate' }, 'Set up the keyboard')));
  }
  return c;
}

// ---------------------------------------------------------------- home

export const homeView: View = (root) => {
  const banner = h('div');
  const showBanner = () => banner.replaceChildren(midiBanner() ?? '');
  showBanner();
  const off = midi.onPorts(showBanner);
  root.append(banner);
  const next = nextLesson();
  const title = h('h1', {}, 'Easy as ', h('span', { class: 'gradient-text' }, 'C D E.'));
  root.append(h('section', { class: store.calibration ? 'card hero compact' : 'card hero' },
    heroKeys(),
    h('span', { class: 'eyebrow' }, 'Piano trainer · MIDI keyboard'),
    title,
    h('p', {}, store.calibration
      ? 'Short exercises, each training one skill. Every hand gets its own score, and the feedback says which hand or habit gave way.'
      : 'Short exercises, each training one skill, scored hand by hand. First, show the app your keyboard.'),
    h('div', { class: 'controls' },
      !store.calibration
        ? h('button', { onclick: () => go('/calibrate') }, 'Set up the keyboard')
        : next ? h('button', { onclick: () => go(`/lesson/${next.id}`) }, `Continue: ${next.title}`) : null,
      h('button', { class: 'secondary', onclick: () => go('/demo') }, 'Watch the demo'),
      h('span', { class: 'small' }, 'The demo needs no keyboard.')),
  ));
  if (store.calibration) root.append(todayCard());
  root.append(progressCard());
  const snap = snapshot();
  root.append(h('section', { class: 'card tree-card' },
    h('div', { class: 'unit-head' },
      h('h2', {}, 'Your tree'),
      h('span', { class: 'unit-progress' }, `Stage ${currentStage(snap).stage} of ${stages.length} · ${currentStage(snap).title}`)),
    growingTree(snap, (b) => go(`/branch/${b}`)),
    h('p', { class: 'small tree-caption' }, 'Each branch grows a leaf for every lesson you practise, and a bud shows where something new is open. Milestones add rings to the trunk and open new songs. Tap a branch to see all of it.')));
  root.append(growingNow(snap));
  root.append(songsCard(snap));
  root.append(stageList(snap));
  if (contentErrors.length) {
    root.append(h('details', { class: 'card small' }, h('summary', {}, `${contentErrors.length} content problems`), h('pre', {}, contentErrors.join('\n'))));
  }
  return off;
};

/** XP, streak and what is due for review. Hidden until there is something to show. */
function progressCard(): HTMLElement | '' {
  const m = mastery.meta;
  const due = mastery.reviewQueue();
  const streak = mastery.currentStreak();
  if (!m.xp && !due.length) return '';
  const link = (nodeId: string) => {
    const n = treeNodes.get(nodeId);
    return n?.lesson ? h('a', { href: `#/lesson/${n.lesson}` }, n.title) : h('span', {}, n?.title ?? nodeId);
  };
  return h('section', { class: 'card progress-card' },
    h('div', { class: 'progress-stats' },
      h('span', {}, h('strong', {}, String(m.xp)), ' XP'),
      streak ? h('span', {}, h('strong', {}, String(streak)), streak === 1 ? ' day in a row' : ' days in a row') : '',
      h('span', {}, h('strong', {}, String(due.length)), due.length === 1 ? ' review due' : ' reviews due'),
      h('a', { href: '#/profile', class: 'small' }, 'Profile')),
    due.length ? h('p', { class: 'small' }, 'Due for review: ', ...due.slice(0, 5).flatMap((id, i) => [i ? ', ' : '', link(id)])) : '');
}

/** Decoration for the hero: one octave of keys, a few lit in the hand colours. */
function heroKeys(): SVGSVGElement {
  const lit: Record<number, string> = { 0: 'lit-l', 2: 'lit-l', 4: 'lit-r', 6: 'lit-r' };
  return svgEl('svg', { viewBox: '0 0 352 220', class: 'hero-keys', 'aria-hidden': 'true' },
    ...[0, 1, 2, 3, 4, 5, 6].map((i) => svgEl('rect', { x: i * 50 + 1, y: 0, width: 48, height: 218, rx: 8, class: `w ${lit[i] ?? ''}` })),
    ...[1, 2, 4, 5, 6].map((i) => svgEl('rect', { x: i * 50 - 15, y: 0, width: 30, height: 132, rx: 6, class: i === 5 ? 'b lit-r' : 'b' })));
}

// ---------------------------------------------------------------- calibration

export const calibrateView: View = (root) => {
  const msg = h('p', { class: 'ask' });
  const detail = h('div');
  const banner = h('div');
  const showBanner = () => banner.replaceChildren(midiBanner() ?? '');
  showBanner();
  const offPorts = midi.onPorts(showBanner);
  let low: number | undefined;
  let done = false;

  const ask = () => {
    low = undefined;
    done = false;
    detail.replaceChildren();
    msg.textContent = 'Press the lowest white key on your keyboard (the one furthest to the left).';
    if (computerKeys.enabled && !demo.active) {
      // The computer keyboard has no ends to press, so offer a full piano instead.
      detail.append(h('div', { class: 'controls' },
        h('button', { class: 'secondary', onclick: () => {
          const r = calibrate(21, 108);
          if (r.ok) confirm(r.calibration, r.notes);
        } }, 'Playing on the computer keyboard? Use a standard 88-key piano')));
    }
  };

  // Step 3: show middle C, explain it, and have the player press it.
  let offTry = () => {};
  const confirm = (c: Calibration, notes: string[]) => {
    done = true;
    offTry();
    const kb = new KeyboardView(c.low, c.high, { middleC: c.middleC, cal: c, labels: 'c' });
    kb.set(c.middleC, 'target', true, 'C');
    msg.textContent = 'Now meet middle C.';
    const check = h('p', { class: 'ask' }, 'Press the lit key: that is middle C.');
    const save = h('button', { disabled: true, onclick: () => { if (demo.active) return; offTry(); store.calibration = c; go('/'); } }, 'Save');
    offTry = midi.onNote((e) => {
      if (e.type !== 'on') return;
      if (e.note === c.middleC) {
        kb.flash(e.note, 'hit', 600);
        check.textContent = 'Yes! That is middle C. Both thumbs share it in your first pieces.';
        save.disabled = false;
      } else {
        kb.flash(e.note, 'wrong');
        check.textContent = e.note % 12 === c.middleC % 12
          ? `That is a C too (${keyName(c, e.note)}), but not the middle one. Find the lit key.`
          : `That is ${keyName(c, e.note)}. Middle C is the lit key, just left of the two black keys near the middle.`;
      }
    });
    detail.replaceChildren(
      h('p', {}, `${notes.join('. ')}.`),
      h('div', { class: 'explain' },
        h('p', {}, 'Middle C is the C closest to the middle of the keyboard. Every C sits just to the left of a group of two black keys; middle C is the one in the middle. On most pianos it is right in front of the brand name.'),
        h('p', {}, 'Every key is named from here: C4 is middle C, C3 is the C below, C5 the C above.')),
      kb.el,
      check,
      h('div', { class: 'controls' },
        save,
        h('button', { class: 'secondary', onclick: () => confirm(shiftMiddleC(c, -1), notes) }, 'Middle C is an octave lower'),
        h('button', { class: 'secondary', onclick: () => confirm(shiftMiddleC(c, 1), notes) }, 'Middle C is an octave higher'),
        h('button', { class: 'secondary', onclick: () => { offTry(); ask(); } }, 'Start again'),
      ),
    );
  };

  const off = midi.onNote((e) => {
    if (e.type !== 'on' || done) return;
    if (low === undefined) {
      low = e.note;
      msg.textContent = 'Now press the highest key (the one furthest to the right).';
      return;
    }
    const r = calibrate(low, e.note);
    if (!r.ok) {
      ask();
      detail.replaceChildren(h('p', { class: 'banner error' }, r.error));
      return;
    }
    confirm(r.calibration, r.notes);
  });

  ask();
  const offKeys = computerKeys.onChange(() => { if (!done && low === undefined) ask(); });
  root.append(h('section', { class: 'card' }, h('h2', {}, 'Set up the keyboard'), banner, msg, detail));
  return () => { off(); offPorts(); offTry(); offKeys(); };
};

// ---------------------------------------------------------------- lesson

// The last thing pressed with a mouse or finger, to tell a clicked button from one tabbed to.
let lastPointer: EventTarget | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', (e) => { lastPointer = e.target; }, { capture: true, passive: true });
  window.addEventListener('keydown', (e) => { if (e.key === 'Tab') lastPointer = null; }, { capture: true, passive: true });
}

export const lessonView: View = (root, id?: string) => {
  const lesson = id ? content.lessons.get(id) : undefined;
  if (!lesson) { root.append(h('p', {}, 'Lesson not found. ', h('a', { href: '#/' }, 'Home'))); return; }
  const cal = needCalibration(root);
  if (!cal) return;
  const advice = lessonAdvice(lesson);
  const body = h('div');
  const nav = h('div', { class: 'controls' });
  const progress = h('span', { class: 'small' });
  // The way forward, also at the top: it mirrors the Next (or Skip) button, and on the recap the
  // next lesson.
  const topNext = h('button', { class: 'chip top-next', type: 'button' });
  let forward: HTMLButtonElement | undefined;
  const syncTop = () => {
    topNext.hidden = !forward;
    if (!forward) return;
    topNext.textContent = `${forward.textContent} ›`;
    topNext.title = forward.classList.contains('secondary') ? forward.textContent ?? '' : `${forward.textContent} (Enter)`;
    topNext.disabled = forward.disabled;
    topNext.classList.toggle('go', !forward.classList.contains('secondary'));
  };
  topNext.onclick = () => forward?.click();
  // Enter presses the main button (the first one that is not secondary), unless a control has focus.
  const onEnter = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.repeat || !root.isConnected) return;
    const a = document.activeElement;
    // A control reached with the keyboard keeps its own Enter; one just clicked or tapped does not.
    const control = a instanceof HTMLElement && a !== document.body && a.matches('button, a, summary, input, select, textarea, [tabindex]');
    if (typing(e.target) || (control && !(lastPointer instanceof Node && a.contains(lastPointer)))) return;
    const main = [...nav.querySelectorAll<HTMLButtonElement>('button')].find((b) => !b.classList.contains('secondary') && !b.disabled);
    if (!main) return;
    e.preventDefault();
    main.click();
  };
  window.addEventListener('keydown', onEnter);
  const unguard = guardSpace();
  let step = 0;
  // Tapping a step jumps there, forward or back; leaving an exercise stops it (takes are saved as played).
  const bar = stepBar(lesson, store, (eid) => content.exercises.get(eid), (i) => { if (i !== step) { step = i; show(); } });
  let cleanup: (() => void) | undefined;

  const show = () => {
    cleanup?.();
    cleanup = undefined;
    body.replaceChildren();
    nav.replaceChildren();
    progress.textContent = step < lesson.steps.length ? `Step ${step + 1} of ${lesson.steps.length}` : 'Recap';
    bar.paint(step);
    if (step > 0) nav.append(h('button', { class: 'secondary', onclick: () => { step--; show(); } }, 'Back'));
    if (step >= lesson.steps.length) return showRecap(lesson);
    const s = lesson.steps[step];
    let leave = () => {};
    const next = h('button', { onclick: () => { leave(); step++; show(); } }, 'Next');
    forward = next;
    if ('read' in s) {
      const block = readStep(book.chapters.get(s.read)!, cal);
      body.append(block.el);
      cleanup = block.destroy;
      leave = block.leave;
    } else if ('explain' in s) {
      // A check question holds Next until it is answered right.
      next.disabled = true;
      const block = explainBlock(s, cal, () => { next.disabled = false; syncTop(); });
      body.append(block.el);
      cleanup = block.destroy;
    } else if ('playground' in s) {
      const block = playground(s, cal);
      body.append(block.el);
      cleanup = block.destroy;
    } else if ('exercise' in s) {
      const ex = content.exercises.get(s.exercise)!;
      const box = h('div');
      body.append(box);
      next.textContent = 'Skip';
      next.classList.add('secondary');
      cleanup = mountExercise(box, ex, cal, () => { next.textContent = 'Next'; next.classList.remove('secondary'); bar.paint(step); syncTop(); });
    }
    nav.append(next);
    syncTop();
    // The path note, once and quietly, under the first step.
    if (step === 0 && !advice.ready) body.after(adviceNote);
    else adviceNote.remove();
  };

  const showRecap = (l: Lesson) => {
    noteSkipped(l);
    const r = lessonRecap({
      lesson: l, goals: lessonGoals(l), stage: lessonStage(l), store, next: nextLesson(undefined, l),
      practise: (id) => { step = l.steps.findIndex((s) => 'exercise' in s && s.exercise === id); show(); },
      openLesson: (id) => go(`/lesson/${id}`),
      home: () => go('/'),
    });
    body.append(...r.body);
    forward = r.forward;
    syncTop();
    const node = nodeOfLesson(l.id);
    // A milestone opens songs: point at them once it is passed.
    if (node?.type === 'checkpoint' && mastery.state(node.id) !== 'introduced' && mastery.state(node.id) !== 'locked') {
      body.append(h('p', { class: 'banner ok' }, 'Milestone passed: new songs are open in the songbook. ', h('a', { href: '#/songs' }, 'Open the songbook')));
    }
    nav.append(...r.nav);
    if (node) nav.append(h('button', { class: 'secondary', onclick: () => go(songHome(node.id) ?? `/branch/${node.branch}`) }, node.branch === 'songs' ? (stepped(node.id) ? 'All steps' : 'Songbook') : `${BRANCH_LABEL[node.branch]} branch`));
  };

  const adviceNote = advice.ready ? h('div') : adviceBanner(advice);
  const node = nodeOfLesson(lesson.id);
  const songStep = node && stepped(node.id);
  const where = node ? h('a', { class: 'lesson-branch small', href: `#${songHome(node.id) ?? `/branch/${node.branch}`}` },
    h('span', { class: `strand-dot strand-${node.strand}` }),
    songStep ? `Song · step ${songStep.n} of ${songStep.of}` : node.branch === 'songs' ? 'Song' : `${BRANCH_LABEL[node.branch]} · stage ${node.stage}`) : '';
  root.append(h('section', { class: 'card' }, h('div', { class: 'lesson-head' }, h('div', {}, where, h('h2', {}, lesson.title)), h('div', { class: 'lesson-top' }, progress, topNext)), bar.el, body, nav));
  show();
  return () => { cleanup?.(); window.removeEventListener('keydown', onEnter); unguard(); };
};

/** A song taught in steps: this node's place in it. */
function stepped(nodeId: string): { n: number; of: number } | undefined {
  const g = songOf(nodeId);
  return g && g.steps.length > 1 ? { n: g.steps.findIndex((n) => n.id === nodeId) + 1, of: g.steps.length } : undefined;
}

/** Where a song lesson belongs: its song's steps page, or the songbook; undefined for other lessons. */
function songHome(nodeId: string): string | undefined {
  const g = songOf(nodeId);
  return g ? (g.steps.length > 1 ? `/song/${g.song.id}` : '/songs') : undefined;
}

/** What is recommended before this lesson. Only advice: the lesson below plays and counts as usual. */
function adviceBanner(advice: Extract<LessonAdvice, { ready: false }>) {
  const links = (ids: string[]) => ids.flatMap((id, i) => {
    const n = treeNodes.get(id);
    const title = n?.title ?? id;
    return [i ? ', ' : '', n?.lesson ? h('a', { href: `#/lesson/${n.lesson}` }, title) : title];
  });
  const why = advice.checkpoint
    ? ['A milestone works best when everything before it is Mastered (Solid, then passed again on a later day). Still to go: ', ...links(advice.nodes), '.']
    : ['It grows after: ', ...links(advice.nodes), ' (each played to ★ at least once).'];
  return h('div', { class: 'advice small' },
    h('p', {}, h('strong', {}, 'Not grown yet. '), ...why, ' You can play this now; your takes count all the same.'));
}

export const exerciseView: View = (root, id?: string) => {
  const ex = id ? content.exercises.get(id) : undefined;
  if (!ex) { root.append(h('p', {}, 'Exercise not found.')); return; }
  const cal = needCalibration(root);
  if (!cal) return;
  const box = h('div');
  root.append(h('section', { class: 'card' }, h('h2', {}, exerciseTitle(ex)), box));
  const unguard = guardSpace();
  const unmount = mountExercise(box, ex, cal, () => {});
  return () => { unmount(); unguard(); };
};

// ---------------------------------------------------------------- settings

export const settingsView: View = (root) => {
  const c = store.calibration;
  const s = store.settings;
  const latency = h('input', { type: 'range', min: -100, max: 250, step: 5, value: s.latencyMs });
  const latencyText = h('span', {}, `${s.latencyMs} ms`);
  latency.oninput = () => {
    latencyText.textContent = `${latency.value} ms`;
    store.settings = { ...store.settings, latencyMs: Number(latency.value) };
  };
  const toggle = (key: 'metronome' | 'guide', label: string) => {
    const box = h('input', { type: 'checkbox', checked: s[key] });
    box.onchange = () => { store.settings = { ...store.settings, [key]: box.checked }; };
    return h('label', {}, box, ` ${label}`);
  };
  const appearance = themeSetting();
  root.append(
    h('section', { class: 'card' },
      h('h2', {}, 'Keyboard'),
      c ? h('p', {}, `${c.keyCount} keys, ${keyName(c, c.low)} to ${keyName(c, c.high)}. Middle C is MIDI ${c.middleC}.`) : h('p', {}, 'Not set up yet.'),
      h('div', { class: 'controls' },
        h('button', { onclick: () => go('/calibrate') }, c ? 'Set up again' : 'Set up the keyboard'),
        h('button', { class: 'secondary', onclick: () => go('/midi') }, 'MIDI tester'),
      ),
    ),
    computerKeysCard(),
    h('section', { class: 'card' },
      h('h2', {}, 'Timing'),
      h('p', { class: 'small' }, 'If the app always says you are late (or early) although you play with the click, move this slider until it stops.'),
      h('label', {}, 'Extra latency ', latency, ' ', latencyText),
    ),
    h('section', { class: 'card' },
      h('h2', {}, 'Defaults'),
      h('div', { class: 'controls' }, toggle('metronome', 'Click while playing'), toggle('guide', 'Guide notes while playing')),
      h('div', { class: 'controls' }, h('label', {}, 'View ', viewPref())),
      h('p', { class: 'small' }, 'The piano you hear in the app is the Salamander Grand Piano by Alexander Holm (',
        h('a', { href: 'https://creativecommons.org/licenses/by/3.0/', target: '_blank', rel: 'noopener' }, 'CC BY 3.0'), ').'),
    ),
    appearance.el,
  );
  return appearance.off;
};

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
      h('p', { class: 'small' }, 'Dark is easy on the eyes at the piano. "Follow the device" switches with your system.'),
      h('div', { class: 'segmented', role: 'group', 'aria-label': 'theme' }, ...buttons)));
  return { el, off: () => window.removeEventListener(THEME_CHOICE_EVENT, sync) };
}

function computerKeysCard() {
  const box = h('input', { type: 'checkbox', checked: computerKeys.enabled });
  box.onchange = () => setComputerKeys(box.checked);
  return h('section', { class: 'card' },
    h('h2', {}, 'Computer keyboard'),
    h('p', { class: 'small' }, 'No MIDI keyboard at hand? Play on the computer keyboard instead. It is for trying things out: real piano practice needs real keys.'),
    h('label', {}, box, ' Play with the computer keyboard'),
    keyMap(),
  );
}

/** Which letters play which keys; each key cap has data-code so the demo can light it. */
export function keyMap() {
  const black = [1, 3, 6, 8, 10, 13, 15];
  const codes = Object.keys(KEY_SEMITONES);
  const cap = (code: string) => h('kbd', { 'data-code': code }, letterOf(code));
  return h('div', { class: 'keymap small' },
    h('p', {}, 'White keys from middle C up: ', ...codes.filter((c) => !black.includes(KEY_SEMITONES[c])).map(cap)),
    h('p', {}, 'Black keys: ', ...codes.filter((c) => black.includes(KEY_SEMITONES[c])).map(cap)),
    h('p', {}, cap('KeyZ'), ' one octave down, ', cap('KeyX'), ' one octave up, ', h('kbd', {}, 'Space'), ' the sustain pedal. The keys show their letter on the on-screen keyboard.'));
}

function viewPref() {
  const sel = h('select', {},
    h('option', { value: '' }, 'Each exercise decides'),
    h('option', { value: 'classic' }, 'Keyboard & sheet'),
    h('option', { value: 'falling' }, 'Falling notes'));
  sel.value = store.settings.view ?? '';
  sel.onchange = () => { store.settings = { ...store.settings, view: (sel.value || undefined) as 'classic' | 'falling' | undefined }; };
  return sel;
}

// ---------------------------------------------------------------- MIDI tester

export const testerView: View = (root) => {
  const c = store.calibration;
  const kb = new KeyboardView(c?.low ?? 21, c?.high ?? 108, { middleC: c?.middleC ?? 60, cal: c, labels: 'c' });
  const ports = h('p', { class: 'small' });
  const log = h('pre', { class: 'log' });
  const lines: string[] = [];
  const showPorts = () => {
    const names = midi.inputNames();
    ports.textContent = names.length ? `Inputs: ${names.join(', ')}` : 'No MIDI inputs connected.';
  };
  showPorts();
  const offPorts = midi.onPorts(showPorts);
  const offNote = midi.onNote((e) => {
    kb.set(e.note, 'pressed', e.type === 'on', e.type === 'on' && c ? keyName(c, e.note) : '');
  });
  const pedal = h('span', { class: 'pedal-pill' }, 'Sustain pedal');
  const showPedal = () => pedal.classList.toggle('down', midi.pedalDown);
  showPedal();
  const offPedal = midi.onPedal(showPedal);
  const offRaw = midi.onRaw((e) => {
    const hex = e.data.map((b) => b.toString(16).padStart(2, '0')).join(' ');
    const skew = Math.round(performance.now() - e.time);
    lines.unshift(`${e.time.toFixed(1).padStart(10)}  ${hex.padEnd(9)}  ${describe(e.data, c)}  lag ${skew} ms${e.fallbackClock ? '  (clock fallback)' : ''}  ${e.port}`);
    lines.length = Math.min(lines.length, 200);
    log.textContent = lines.join('\n');
  });
  root.append(h('section', { class: 'card' }, h('h2', {}, 'MIDI tester'), midiBanner() ?? '', ports, h('p', {}, pedal), kb.el, log));
  return () => { offPorts(); offNote(); offRaw(); offPedal(); };
};

function describe(d: number[], c?: Calibration): string {
  const kind = d[0] & 0xf0;
  const ch = (d[0] & 0x0f) + 1;
  const name = (n: number) => (c ? `${keyName(c, n)} (${n})` : String(n));
  if (kind === 0x90 && d[2] > 0) return `note on  ${name(d[1])} vel ${d[2]} ch ${ch}`;
  if (kind === 0x80 || kind === 0x90) return `note off ${name(d[1])} ch ${ch}`;
  if (kind === 0xb0) return d[1] === 64 ? `pedal ${d[2] >= 64 ? 'down' : 'up'} ch ${ch}` : `control ${d[1]} = ${d[2]} ch ${ch}`;
  if (kind === 0xc0) return `program ${d[1]} ch ${ch}`;
  return 'other';
}
