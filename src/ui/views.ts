import { calibrate, keyName, shiftMiddleC, type Calibration } from '../calibration';
import { content, contentErrors } from '../content';
import type { Lesson } from '../content/types';
import { midi, MidiInput } from '../midi/input';
import { store } from '../progress/store';
import { h, type View } from './dom';
import { KeyboardView } from './keyboard';
import { markdown } from './markdown';
import { mountExercise } from './players';

const lessonExercises = (l: Lesson) => l.steps.flatMap((s) => ('exercise' in s ? [s.exercise] : []));

export const go = (path: string) => { location.hash = path; };

function midiBanner(): HTMLElement | null {
  if (!MidiInput.supported()) {
    return h('p', { class: 'banner error' }, 'This browser cannot read MIDI keyboards. Please open iggyuoso in Chrome or Edge.');
  }
  if (!midi.ready) return h('p', { class: 'banner' }, 'Waiting for MIDI permission…');
  if (!midi.inputNames().length) return h('p', { class: 'banner' }, 'No MIDI keyboard found. Plug it in and switch it on; it will show up here.');
  return null;
}

function needCalibration(root: HTMLElement): Calibration | undefined {
  const c = store.calibration;
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
  if (!store.calibration) {
    root.append(h('section', { class: 'card hero' },
      h('h2', {}, 'Welcome'),
      h('p', {}, 'iggyuoso teaches piano in small steps: hands apart, then together. First, show the app your keyboard.'),
      h('button', { onclick: () => go('/calibrate') }, 'Set up the keyboard')));
  }
  for (const unit of content.units) {
    root.append(h('section', { class: 'card' },
      h('h2', {}, unit.title),
      h('p', { class: 'small' }, unit.summary),
      h('ol', { class: 'lessons' }, ...unit.lessons.map((id) => {
        const l = content.lessons.get(id);
        if (!l) return null;
        return h('li', { class: store.lessonDone(lessonExercises(l)) ? 'done' : '' }, h('a', { href: `#/lesson/${id}` }, l.title));
      })),
    ));
  }
  if (contentErrors.length) {
    root.append(h('details', { class: 'card small' }, h('summary', {}, `${contentErrors.length} content problems`), h('pre', {}, contentErrors.join('\n'))));
  }
  return off;
};

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
    const save = h('button', { disabled: true, onclick: () => { offTry(); store.calibration = c; go('/'); } }, 'Save');
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
        h('button', { class: 'secondary', onclick: () => confirm(shiftMiddleC(c, -1), notes) }, 'The real middle C is one octave lower'),
        h('button', { class: 'secondary', onclick: () => confirm(shiftMiddleC(c, 1), notes) }, 'one octave higher'),
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
  root.append(h('section', { class: 'card' }, h('h2', {}, 'Set up the keyboard'), banner, msg, detail));
  return () => { off(); offPorts(); offTry(); };
};

// ---------------------------------------------------------------- lesson

export const lessonView: View = (root, id?: string) => {
  const lesson = id ? content.lessons.get(id) : undefined;
  if (!lesson) { root.append(h('p', {}, 'Lesson not found. ', h('a', { href: '#/' }, 'Home'))); return; }
  const cal = needCalibration(root);
  if (!cal) return;
  const body = h('div');
  const nav = h('div', { class: 'controls' });
  const progress = h('span', { class: 'small' });
  let step = 0;
  let cleanup: (() => void) | undefined;

  const show = () => {
    cleanup?.();
    cleanup = undefined;
    body.replaceChildren();
    nav.replaceChildren();
    progress.textContent = step < lesson.steps.length ? `Step ${step + 1} of ${lesson.steps.length}` : 'Recap';
    if (step > 0) nav.append(h('button', { class: 'secondary', onclick: () => { step--; show(); } }, 'Back'));
    if (step >= lesson.steps.length) return showRecap(lesson);
    const s = lesson.steps[step];
    const next = h('button', { onclick: () => { step++; show(); } }, 'Next');
    if ('explain' in s) {
      const p = h('div', { class: 'explain' });
      p.innerHTML = markdown(s.explain);
      body.append(p);
    } else {
      const ex = content.exercises.get(s.exercise)!;
      const box = h('div');
      body.append(box);
      next.textContent = 'Skip';
      next.classList.add('secondary');
      cleanup = mountExercise(box, ex, cal, () => { next.textContent = 'Next'; next.classList.remove('secondary'); });
    }
    nav.append(next);
  };

  const showRecap = (l: Lesson) => {
    const p = h('div', { class: 'explain recap' });
    p.innerHTML = markdown(`**Recap.** ${l.recap}`);
    const ids = lessonExercises(l);
    const passed = ids.filter((x) => store.exercise(x).passed).length;
    body.append(p, h('p', { class: store.lessonDone(ids) ? 'banner ok' : 'banner' },
      store.lessonDone(ids) ? 'Lesson done: every exercise passed.' : `${passed} of ${ids.length} exercises passed. Go back to try the others (★ or better at full tempo).`));
    const order = content.units.find((u) => u.id === l.unit)?.lessons ?? [];
    const nextId = order[order.indexOf(l.id) + 1];
    nav.append(nextId ? h('button', { onclick: () => go(`/lesson/${nextId}`) }, 'Next lesson') : h('button', { onclick: () => go('/') }, 'Home'));
  };

  root.append(h('section', { class: 'card' }, h('div', { class: 'lesson-head' }, h('h2', {}, lesson.title), progress), body, nav));
  show();
  return () => cleanup?.();
};

export const exerciseView: View = (root, id?: string) => {
  const ex = id ? content.exercises.get(id) : undefined;
  if (!ex) { root.append(h('p', {}, 'Exercise not found.')); return; }
  const cal = needCalibration(root);
  if (!cal) return;
  const box = h('div');
  root.append(h('section', { class: 'card' }, h('h2', {}, ex.id), box));
  return mountExercise(box, ex, cal, () => {});
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
  root.append(
    h('section', { class: 'card' },
      h('h2', {}, 'Keyboard'),
      c ? h('p', {}, `${c.keyCount} keys, ${keyName(c, c.low)} to ${keyName(c, c.high)}. Middle C is MIDI ${c.middleC}.`) : h('p', {}, 'Not set up yet.'),
      h('div', { class: 'controls' },
        h('button', { onclick: () => go('/calibrate') }, c ? 'Set up again' : 'Set up the keyboard'),
        h('button', { class: 'secondary', onclick: () => go('/midi') }, 'MIDI tester'),
      ),
    ),
    h('section', { class: 'card' },
      h('h2', {}, 'Timing'),
      h('p', { class: 'small' }, 'If the app always says you are late (or early) although you play with the click, move this slider until it stops.'),
      h('label', {}, 'Extra latency ', latency, ' ', latencyText),
    ),
    h('section', { class: 'card' },
      h('h2', {}, 'Defaults'),
      h('div', { class: 'controls' }, toggle('metronome', 'Click while playing'), toggle('guide', 'Guide notes while playing')),
    ),
  );
};

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
  const offRaw = midi.onRaw((e) => {
    const hex = e.data.map((b) => b.toString(16).padStart(2, '0')).join(' ');
    const skew = Math.round(performance.now() - e.time);
    lines.unshift(`${e.time.toFixed(1).padStart(10)}  ${hex.padEnd(9)}  ${describe(e.data, c)}  lag ${skew} ms${e.fallbackClock ? '  (clock fallback)' : ''}  ${e.port}`);
    lines.length = Math.min(lines.length, 200);
    log.textContent = lines.join('\n');
  });
  root.append(h('section', { class: 'card' }, h('h2', {}, 'MIDI tester'), midiBanner() ?? '', ports, kb.el, log));
  return () => { offPorts(); offNote(); offRaw(); };
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
