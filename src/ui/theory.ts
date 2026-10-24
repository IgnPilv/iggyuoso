import { loadPiano, stopAll } from '../audio/audio';
import { keyWindow, toDevice, toWritten, type Calibration } from '../calibration';
import type { ExplainStep, PlaygroundStep, TheoryCheck, TheoryKeys, TheoryStaff } from '../content/types';
import { demo } from '../demo/demo';
import { midi } from '../midi/input';
import { pitchClass, pitchToMidi, type NoteToken, type Pitch } from '../music/notes';
import { keySignature } from '../music/theory';
import { h } from './dom';
import { playSounds } from './drills';
import { KeyboardView } from './keyboard';
import { markdown } from './markdown';
import { showHeld } from './players';
import { renderStaff, type StaffNote, type StaffPart } from './staff';

// Theory screens: the text of an explain step with its pictures (staff, lit keys), a sound
// button, a rule box, key terms and a check question; and the playground, where any key pressed
// shows up on the staff with its name.

const ACC = { 1: '♯', [-1]: '♭', 0: '' } as const;
const nameOf = (p: Pitch) => `${p.letter}${ACC[p.accidental]}`;

/** A staff picture: notes spaced evenly, with their written values; `grand` splits at middle C. */
/** `pad`: empty places on each side, so a picture of one chord keeps a staff's width. */
export function theoryStaff(st: TheoryStaff, pad = 0): HTMLElement {
  const note = (t: NoteToken, i: number, pitches: Pitch[], spacer: boolean): StaffNote => ({
    pitches, value: t.value ?? t.beats, dotted: t.dotted, key: String(i), spacer,
    // With a meter the picture is drawn in time, with bar lines, ties and triplets.
    ...(st.meter ? { beats: t.beats, tie: t.tie, triplet: t.triplet } : {}),
    label: st.labels === 'names' && pitches.length ? pitches.map(nameOf).join(' ') : undefined,
  });
  let parts: StaffPart[];
  if (st.clef === 'grand') {
    const split = (upper: boolean) => st.notes.map((t, i) => {
      const ps = t.pitches.filter((p) => (pitchToMidi(p) >= 60) === upper);
      // A rest is drawn once, on the upper staff; a note on the other staff leaves a gap.
      return note(t, i, ps, t.pitches.length > 0 || !upper);
    });
    parts = [{ clef: 'treble', notes: split(true) }, { clef: 'bass', notes: split(false) }];
  } else {
    parts = [{ clef: st.clef, notes: st.notes.map((t, i) => note(t, i, t.pitches, false)) }];
  }
  const space = (k: string): StaffNote => ({ pitches: [], key: k, spacer: true });
  if (pad) for (const part of parts) part.notes = [...Array.from({ length: pad }, (_, i) => space(`a${i}`)), ...part.notes, ...Array.from({ length: pad }, (_, i) => space(`b${i}`))];
  // Short notes get room: at least 26 px a note, so sixteenths do not crowd.
  const shortest = Math.min(1, ...st.notes.map((t) => t.beats));
  const { svg, width } = renderStaff(parts, { key: st.key, ...(st.meter ? { time: [st.meter.beats, st.meter.unit] as [number, number], barQuarters: st.meter.quarters, beatW: Math.max(46, 26 / shortest) } : {}) });
  // Never blown up past a comfortable reading size.
  svg.style.maxWidth = `${Math.round(width * 1.6)}px`;
  return h('div', { class: 'theory-staff staff-wrap' }, svg);
}

/** A keyboard picture with keys lit, named or fingered. */
export function theoryKeys(tk: TheoryKeys, cal: Calibration): HTMLElement {
  const keys = tk.notes.map((p) => toDevice(cal, pitchToMidi(p)));
  const [lo, hi] = keyWindow(cal, keys, 4);
  const kb = new KeyboardView(lo, hi, { middleC: cal.middleC, cal, labels: 'none' });
  tk.notes.forEach((p, i) => {
    const label = tk.labels === 'names' ? nameOf(p) : tk.labels === 'fingers' ? String(tk.fingers![i]) : '';
    kb.set(keys[i], 'target', true, label);
  });
  return h('div', { class: 'theory-keys' }, kb.el);
}

/** A play button for notes written as a note string (600 ms a quarter). */
export function soundButton(tokens: NoteToken[], label = '▶ Hear it'): HTMLElement {
  void loadPiano(tokens.flatMap((t) => t.pitches.map(pitchToMidi)));
  const sounds = tokens.flatMap((t, i, all) => {
    const beat = all.slice(0, i).reduce((a, x) => a + x.beats, 0);
    return t.pitches.length ? [{ notes: t.pitches.map(pitchToMidi), at: beat * 600, dur: t.beats * 600 * 0.92 }] : [];
  });
  return h('button', { class: 'secondary sound', onclick: () => playSounds(sounds) }, label);
}

export interface TheoryBlock {
  el: HTMLElement;
  /** False while a check question waits for the right answer. */
  ready: () => boolean;
  destroy: () => void;
}

/**
 * An explain step with everything it carries. `onReady` runs once its check is answered right
 * (straight away when there is none).
 */
export function explainBlock(step: ExplainStep, cal: Calibration, onReady: () => void): TheoryBlock {
  const text = h('div', { class: 'explain' });
  text.innerHTML = markdown(step.explain);
  const callout = step.callout ? h('div', { class: 'callout' }) : '';
  if (callout) callout.innerHTML = markdown(step.callout!);
  const pictures = step.staff || step.keys || step.sound
    ? h('div', { class: 'theory-pictures' },
      step.staff ? theoryStaff(step.staff) : '',
      step.keys ? theoryKeys(step.keys, cal) : '',
      step.sound ? h('div', { class: 'controls' }, soundButton(step.sound)) : '')
    : '';
  const terms = step.terms ? h('div', { class: 'terms' }, h('span', { class: 'small' }, 'Key terms'), ...step.terms.map((t) => h('span', { class: 'term-chip' }, t))) : '';
  const check = step.check ? checkQuestion(step.check, cal, onReady) : undefined;
  const el = h('div', { class: 'theory-block' }, h('div', { class: 'theory-text' }, text, callout, terms), pictures, check?.el ?? '');
  if (!check) onReady();
  return { el, ready: () => !check || check.solved(), destroy: () => { check?.destroy(); stopAll(); } };
}

/** An inline question: buttons or keys; a wrong answer shows `why` and can be tried again. */
export function checkQuestion(c: TheoryCheck, cal: Calibration, onSolved: () => void) {
  let solved = false;
  let tries = 0;
  const feedback = h('p', { class: 'drill-feedback' });
  const why = h('div', { class: 'why', hidden: true });
  if (c.why) why.innerHTML = markdown(c.why);
  const right = () => {
    if (solved) return;
    solved = true;
    feedback.textContent = tries ? '✓ That\'s it.' : '✓ Right!';
    feedback.className = 'drill-feedback ok';
    why.hidden = !c.why;
    off();
    onSolved();
  };
  const wrong = (what: string) => {
    tries++;
    feedback.textContent = `✗ ${what} Try again.`;
    feedback.className = 'drill-feedback bad';
    why.hidden = !c.why;
  };
  let off = () => {};
  let answer: HTMLElement | '' = '';
  if (c.choices) {
    const buttons = c.choices.map((label, i) => h('button', {
      class: 'secondary choice', 'data-choice': i,
      onclick: () => {
        if (solved) return;
        if (i === c.correct) {
          buttons[i].classList.add('right');
          buttons.forEach((b) => { b.disabled = true; });
          right();
        } else {
          buttons[i].classList.add('wrong');
          buttons[i].disabled = true;
          wrong('Not that one.');
        }
      },
    }, label));
    answer = h('div', { class: 'choices' }, ...buttons);
  } else {
    // Played answers: the notes in order; a wrong key starts again from the first.
    const want = c.play!.map((p) => toDevice(cal, pitchToMidi(p)));
    const same = (a: number, b: number) => (c.pitchMatch === 'pitchClass' ? pitchClass(a) === pitchClass(b) : a === b);
    const [lo, hi] = keyWindow(cal, want);
    const kb = new KeyboardView(lo, hi, { middleC: cal.middleC, cal, labels: 'c' });
    const offHeld = showHeld(kb);
    let at = 0;
    const offNote = midi.onNote((e) => {
      if (e.type !== 'on' || solved) return;
      if (same(e.note, want[at])) {
        kb.flash(e.note, 'hit', 450);
        at++;
        if (at === want.length) right();
      } else {
        kb.flash(e.note, 'wrong', 350);
        at = 0;
        wrong(want.length > 1 ? 'Not quite.' : 'Not that key.');
      }
    });
    off = () => { offNote(); offHeld(); };
    answer = h('div', { class: 'stage' }, kb.el);
    queueMicrotask(() => demo.onCheck?.({ keys: want }));
  }
  if (c.choices) queueMicrotask(() => demo.onCheck?.({ correct: c.correct, choose: (i) => (answer as HTMLElement).querySelector<HTMLButtonElement>(`[data-choice="${i}"]`)?.click() }));
  const el = h('div', { class: 'check' },
    h('span', { class: 'eyebrow' }, 'Quick check'),
    h('p', { class: 'check-ask' }, c.ask),
    c.staff ? theoryStaff(c.staff) : '',
    c.keys ? theoryKeys(c.keys, cal) : '',
    answer, feedback, why);
  return { el, solved: () => solved, destroy: () => off() };
}

/** The written note for a key, spelled with flats in flat keys. */
export function pitchOf(written: number, key?: string): Pitch {
  const flats = key ? keySignature(key).count < 0 : false;
  const names = flats
    ? [['C', 0], ['D', -1], ['D', 0], ['E', -1], ['E', 0], ['F', 0], ['G', -1], ['G', 0], ['A', -1], ['A', 0], ['B', -1], ['B', 0]]
    : [['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0], ['F', 1], ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0]];
  const [letter, accidental] = names[pitchClass(written)] as [Pitch['letter'], -1 | 0 | 1];
  // B#/Cb never come up: the octave follows the letter.
  return { letter, accidental, octave: Math.floor(written / 12) - 1 };
}

/** Press any key: it shows on the staff, named. */
export function playground(step: PlaygroundStep, cal: Calibration): TheoryBlock {
  const pg = step.playground;
  const [lo, hi] = keyWindow(cal, pg.range.map((p) => toDevice(cal, pitchToMidi(p))), 0);
  const kb = new KeyboardView(lo, hi, { middleC: cal.middleC, cal, labels: 'c' });
  const offHeld = showHeld(kb);
  const staffBox = h('div');
  const name = h('p', { class: 'playground-name' }, 'Press any key.');
  const draw = () => {
    const held = [...midi.held].filter((k) => k >= lo && k <= hi).sort((a, b) => a - b);
    const ps = held.map((k) => pitchOf(toWritten(cal, k), pg.key));
    const tokens: NoteToken[] = [{ pitches: ps, beats: 4, bar: 0, value: 4 }];
    staffBox.replaceChildren(theoryStaff({ notes: tokens, clef: pg.clef, key: pg.key, labels: 'names' }, 3));
    name.textContent = ps.length ? ps.map((p) => `${nameOf(p)}${p.octave}`).join(' + ') + (held.some((k) => k === cal.middleC) ? ' (middle C)' : '') : 'Press any key.';
  };
  const offNote = midi.onNote(draw);
  draw();
  const prompt = h('div', { class: 'explain' });
  prompt.innerHTML = markdown(pg.prompt ?? 'Try it: press any key and watch where it sits on the staff.');
  const el = h('div', { class: 'theory-block playground' }, prompt, staffBox, name, h('div', { class: 'stage' }, kb.el));
  return { el, ready: () => true, destroy: () => { offNote(); offHeld(); } };
}
