import { keyWindow, toDevice, toWritten } from '../calibration';
import { midi } from '../midi/input';
import { findChord, inversions, neighbours, pitchName, plainPitch, type Found } from '../music/chordFinder';
import type { NoteToken, Pitch } from '../music/notes';
import { h, type View } from '../../../core/dom';
import { playSounds } from './drills';
import { KeyboardView } from './keyboard';
import { showHeld } from './players';
import { theoryStaff } from './theory';
import { needCalibration } from './views';

// The Chord finder (#/chords): hold down any keys and the app says what they make (C major,
// first inversion, C E G from the root), writes it on the grand staff and offers the chord's other
// positions and its neighbours (minor, seventh, sus) to try. Without a keyboard, keys can be tapped
// on the picture; a tapped key stays down until tapped again. Nothing is saved.

const RECENT = 8;

export const chordFinderView: View = (root) => {
  const cal = needCalibration(root);
  if (!cal) return;
  // About three octaves around middle C (two on a phone), inside the keyboard.
  const narrow = window.innerWidth < 600;
  const [lo, hi] = keyWindow(cal, narrow ? [cal.middleC - 7, cal.middleC + 12] : [cal.middleC - 12, cal.middleC + 19], 0);
  const kb = new KeyboardView(lo, hi, { middleC: cal.middleC, cal, labels: 'c' });
  const offHeld = showHeld(kb);
  /** Keys tapped on the picture (written MIDI numbers). */
  const tapped = new Set<number>();
  const recent: { name: string; keys: number[] }[] = [];
  let settle: number | undefined;

  const big = h('p', { class: 'chord-big', 'aria-live': 'polite' });
  const symbol = h('span', { class: 'chord-symbol' });
  const about = h('p', { class: 'chord-about' });
  const staffBox = h('div', { class: 'chord-staff' });
  const facts = h('ul', { class: 'chord-tones' });
  const tries = h('div', { class: 'chord-tries' });
  const recentBox = h('div', { class: 'chord-recent' });
  const hear = h('button', { class: 'secondary' }, 'Hear it');
  const clear = h('button', { class: 'secondary' }, 'Let go of tapped keys');

  const keysDown = () => [...new Set([...[...midi.held].map((k) => toWritten(cal, k)), ...tapped])].sort((a, b) => a - b);
  const sound = (keys: number[]) => playSounds([{ notes: keys, at: 0, dur: 1600 }]);
  /** Hold these keys as if tapped (from a suggestion), and play them. */
  const take = (keys: number[]) => {
    for (const k of tapped) kb.set(toDevice(cal, k), 'target', false);
    tapped.clear();
    for (const k of keys) { tapped.add(k); kb.set(toDevice(cal, k), 'target', true); }
    sound(keys);
    draw();
  };
  const tryButton = (label: string, keys: number[]) =>
    h('button', { class: 'secondary chip-button', onclick: () => take(keys), title: keys.map((k) => midiLabel(k)).join(' ') }, label);

  const draw = () => {
    const keys = keysDown();
    const f = findChord(keys);
    hear.disabled = !keys.length;
    clear.hidden = !tapped.size;
    symbol.textContent = f.kind === 'chord' && f.name !== f.words ? f.name : '';
    big.replaceChildren(headline(f), symbol);
    about.textContent = describe(f);
    const pitches = spelled(f, keys);
    const tokens: NoteToken[] = [{ pitches, beats: 4, bar: 0, value: 4 }];
    staffBox.replaceChildren(theoryStaff({ notes: tokens, clef: 'grand', labels: 'names' }, 3));
    facts.replaceChildren(...(f.kind === 'chord'
      ? [h('li', {}, h('b', {}, 'Notes from the root: '), f.spelling.join(' ')), h('li', {}, f.position), h('li', {}, h('b', {}, 'Each key: '), f.tones.map((t) => `${pitchName(t.pitch)}${t.pitch.octave} ${t.role}`).join(' · '))]
      : f.kind === 'interval' ? [h('li', {}, `${pitchName(f.low)} to ${pitchName(f.high)}: ${f.semitones} keys apart, counting black ones.`), h('li', {}, 'Add a third note to make a chord.')]
      : []));
    tries.replaceChildren();
    if (f.kind === 'chord') {
      tries.append(
        h('div', { class: 'chord-try-row' }, h('span', { class: 'small' }, 'Same chord, other positions'), ...inversions(f).map((i) => tryButton(i.label, i.keys))),
        h('div', { class: 'chord-try-row' }, h('span', { class: 'small' }, 'One change away'), ...neighbours(f).map((n) => tryButton(n.label, n.keys))),
      );
    }
    // A chord counts as found once it has been held a moment (not while a hand is landing on it).
    clearTimeout(settle);
    if (f.kind === 'chord') settle = window.setTimeout(() => {
      if (recent[0]?.name === f.name) return;
      const at = recent.findIndex((r) => r.name === f.name);
      if (at >= 0) recent.splice(at, 1);
      recent.unshift({ name: f.name, keys });
      recent.length = Math.min(recent.length, RECENT);
      recentBox.replaceChildren(h('span', { class: 'small' }, 'Found so far'), ...recent.map((r) => tryButton(r.name, r.keys)));
    }, 400);
  };

  // Tapping a key on the picture holds it down (and sounds it); tapping again lets go.
  kb.el.addEventListener('pointerdown', (e) => {
    const g = (e.target as Element).closest('[data-midi]');
    if (!g) return;
    const k = toWritten(cal, Number(g.getAttribute('data-midi')));
    const on = !tapped.has(k);
    if (on) { tapped.add(k); sound([k]); } else tapped.delete(k);
    kb.set(toDevice(cal, k), 'target', on);
    draw();
  });
  kb.el.classList.add('tappable');
  hear.onclick = () => sound(keysDown());
  clear.onclick = () => take([]);
  const offNote = midi.onNote(draw);
  draw();

  root.append(h('section', { class: 'card chord-finder' },
    h('span', { class: 'eyebrow' }, 'Tool'),
    h('h1', {}, 'Chord finder'),
    h('p', { class: 'small' }, 'Hold down any keys and see what chord they make, in any position. No keyboard at hand? Tap keys on the picture: a tapped key stays down until you tap it again.'),
    h('div', { class: 'chord-panel' }, h('div', {}, big, about, facts), staffBox),
    h('div', { class: 'stage' }, kb.el),
    h('div', { class: 'controls' }, hear, clear),
    tries,
    recentBox,
  ));
  return () => { offNote(); offHeld(); clearTimeout(settle); };
};

const midiLabel = (k: number) => `${pitchName(plainPitch(k))}${Math.floor(k / 12) - 1}`;

function headline(f: Found): string {
  switch (f.kind) {
    case 'none': return 'Hold down some keys';
    case 'note': return f.octaves ? `${pitchName(f.pitch)} in octaves` : pitchName(f.pitch);
    case 'interval': return f.name[0].toUpperCase() + f.name.slice(1);
    case 'chord': return f.words;
    case 'unknown': return f.pitches.map(pitchName).join(' ');
  }
}

function describe(f: Found): string {
  switch (f.kind) {
    case 'none': return 'Three or more different notes make a chord. Try C, E and G: the keys two white keys apart from middle C.';
    case 'note': return f.octaves ? 'The same note in different octaves: still one note name.' : 'One note. Add more to make an interval or a chord.';
    case 'interval': return 'Two notes make an interval: its name counts the letters from the lower note to the upper one, both included.';
    case 'chord': return f.about;
    case 'unknown': return 'Not one of the chords the app knows (triads, sevenths, sixths and sus chords). Clusters of neighbouring keys are colours rather than chords.';
  }
}

/** The keys as written on the staff, spelled as the chord or interval spells them. */
function spelled(f: Found, keys: number[]): Pitch[] {
  if (f.kind === 'chord') return f.tones.map((t) => t.pitch);
  if (f.kind === 'unknown') return f.pitches;
  if (f.kind === 'interval') {
    const low = keys[0] % 12;
    return keys.map((k) => {
      const p = k % 12 === low ? f.low : f.high;
      return { ...p, octave: Math.floor((k - p.accidental) / 12) - 1 };
    });
  }
  return keys.map((k) => plainPitch(k));
}
