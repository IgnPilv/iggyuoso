import { keyWindow, toDevice, toWritten } from '../calibration';
import { midi } from '../midi/input';
import { brokenChord } from '../music/chordNames';
import { allReadings, findChord, inversions, keysOf, neighbours, parseChordName, pitchName, plainPitch, QUALITIES, ROOTS, specKeys, specName, suggestChords, type ChordSpec, type Found } from '../music/chordFinder';
import type { NoteToken, Pitch } from '../music/notes';
import { h, type View } from '../../../core/dom';
import { playSounds } from './drills';
import { KeyboardView } from './keyboard';
import { showHeld } from './players';
import { theoryStaff } from './theory';
import { needCalibration } from './views';
import { roomEyebrow } from './practiceRoom';

// The Chord finder (#/chords): hold down any keys and the app says what they make (C major,
// first inversion, C E G from the root), writes it on the grand staff and offers the chord's other
// positions and its neighbours (minor, seventh, sus) to try. Without a keyboard, keys can be tapped
// on the picture; a tapped key stays down until tapped again. It also works the other way: type a
// chord name (c#m7, bb maj7, f sharp minor) or pick a root and a kind, and the chord is built on the
// keys. Keys that go by several names (A♭ or G♯, C6 or Am7) show the main one and the others, with
// the keys each belongs to. A chord played one note at a time (an arpeggio) is named too, from the
// notes heard in the last moment (`brokenChord`). Nothing is saved.

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
  /** The name picked for the keys down, when they go by several. */
  let choice: string | undefined;
  /** The constructor's root and kind, as last picked or typed. */
  let picked: ChordSpec | undefined;
  /** Keys struck lately (written MIDI numbers), for a chord played one note at a time. */
  const heard: { midi: number; at: number }[] = [];
  let fade: number | undefined;
  const brokenNote = h('p', { class: 'small chord-broken' });

  const big = h('p', { class: 'chord-big', 'aria-live': 'polite' });
  const symbol = h('span', { class: 'chord-symbol' });
  const about = h('p', { class: 'chord-about' });
  const staffBox = h('div', { class: 'chord-staff' });
  const facts = h('ul', { class: 'chord-tones' });
  const tries = h('div', { class: 'chord-tries' });
  const recentBox = h('div', { class: 'chord-recent' });
  const others = h('div', { class: 'chord-try-row chord-others' });
  const typed = h('input', { type: 'text', class: 'chord-input', placeholder: 'Type a chord: c#m7, bb maj7, f sharp minor…', 'aria-label': 'chord name', autocomplete: 'off', autocapitalize: 'off', spellcheck: false });
  const suggestions = h('div', { class: 'chord-try-row chord-suggest' });
  const rootPicks = h('div', { class: 'chord-picks' });
  const kindPicks = h('div', { class: 'chord-picks' });
  const hear = h('button', { class: 'secondary' }, 'Hear it');
  const clear = h('button', { class: 'secondary' }, 'Let go of tapped keys');

  const keysDown = () => [...new Set([...[...midi.held].map((k) => toWritten(cal, k)), ...tapped])].sort((a, b) => a - b);
  const sound = (keys: number[]) => playSounds([{ notes: keys, at: 0, dur: 1600 }]);
  /** Hold these keys as if tapped (from a suggestion), and play them. */
  const take = (keys: number[], play = true) => {
    for (const k of tapped) kb.set(toDevice(cal, k), 'target', false);
    tapped.clear();
    for (const k of keys) { tapped.add(k); kb.set(toDevice(cal, k), 'target', true); }
    if (play && keys.length) sound(keys);
    draw();
  };
  /** Builds a chord from the constructor: its keys from middle C up, under the name it was asked by. */
  const build = (spec: ChordSpec, play = true) => {
    picked = spec;
    choice = specName(spec);
    showPicks();
    take(specKeys(spec), play);
  };
  const showPicks = () => {
    for (const b of rootPicks.querySelectorAll<HTMLButtonElement>('button')) b.setAttribute('aria-pressed', String(!!picked && b.dataset.root === `${picked.letter}${picked.accidental}`));
    for (const b of kindPicks.querySelectorAll<HTMLButtonElement>('button')) b.setAttribute('aria-pressed', String(!!picked && b.dataset.kind === picked.quality));
  };
  rootPicks.append(...ROOTS.map((r) => h('button', {
    class: 'secondary chip-button', 'data-root': `${r.letter}${r.accidental}`,
    onclick: () => { build({ ...r, quality: picked?.quality ?? 'major' }); typed.value = choice ?? ''; suggestions.replaceChildren(); },
  }, pitchName({ ...r, octave: 4 }))));
  kindPicks.append(...QUALITIES.map((q) => h('button', {
    class: 'secondary chip-button', 'data-kind': q.id,
    onclick: () => { build({ letter: picked?.letter ?? 'C', accidental: picked?.accidental ?? 0, quality: q.id }); typed.value = choice ?? ''; suggestions.replaceChildren(); },
  }, q.label)));
  // Typing builds as soon as the name reads as a chord (quietly; Enter or a suggestion plays it).
  typed.addEventListener('input', () => {
    const spec = parseChordName(typed.value);
    if (spec) build(spec, false);
    suggestions.replaceChildren(...suggestChords(typed.value).map((sp) => h('button', {
      class: 'secondary chip-button', onclick: () => { build(sp); typed.value = specName(sp); suggestions.replaceChildren(); },
    }, specName(sp))));
  });
  typed.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const spec = parseChordName(typed.value) ?? suggestChords(typed.value)[0];
    if (spec) { build(spec); typed.value = specName(spec); suggestions.replaceChildren(); }
  });
  const tryButton = (label: string, keys: number[]) =>
    h('button', { class: 'secondary chip-button', onclick: () => take(keys), title: keys.map((k) => midiLabel(k)).join(' ') }, label);

  const draw = () => {
    const down = keysDown();
    // Fewer than three different notes held, but a chord's notes heard one after another: that chord.
    const broken = new Set(down.map((k) => k % 12)).size < 3 ? brokenChord(heard, performance.now()) : undefined;
    const keys = broken ? [...new Set(broken)].sort((a, b) => a - b) : down;
    brokenNote.textContent = broken ? 'Heard one note at a time: a broken chord (arpeggio).' : '';
    clearTimeout(fade);
    if (broken) fade = window.setTimeout(draw, 2600);
    const readings = allReadings(keys);
    const f = (readings.find((r) => r.name === choice) ?? readings[0] ?? findChord(keys)) as Found;
    const alts = readings.filter((r) => r !== f);
    others.replaceChildren(...(alts.length ? [
      h('span', { class: 'small' }, 'The same keys also go by'),
      ...alts.map((a) => h('button', {
        class: 'secondary chip-button', title: keysOf(a).slice(0, 4).join(', ') || a.words,
        onclick: () => { choice = a.name; draw(); },
      }, a.name)),
    ] : []));
    hear.disabled = !keys.length;
    clear.hidden = !tapped.size;
    symbol.textContent = f.kind === 'chord' && f.name !== f.words ? f.name : '';
    big.replaceChildren(headline(f), symbol);
    about.textContent = describe(f);
    const pitches = spelled(f, keys);
    const tokens: NoteToken[] = [{ pitches, beats: 4, bar: 0, value: 4 }];
    staffBox.replaceChildren(theoryStaff({ notes: tokens, clef: 'grand', labels: 'names' }, 3));
    facts.replaceChildren(...(f.kind === 'chord'
      ? [h('li', {}, h('b', {}, 'Notes from the root: '), f.spelling.join(' ')), h('li', {}, f.position), h('li', {}, h('b', {}, 'Each key: '), f.tones.map((t) => `${pitchName(t.pitch)}${t.pitch.octave} ${t.role}`).join(' · ')),
        h('li', {}, h('b', {}, 'Found in: '), keysOf(f).slice(0, 8).join(' · ') || 'no major or minor key as spelled; try another name below.')]
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
  const offNote = midi.onNote((e) => {
    if (e.type === 'on') {
      heard.push({ midi: toWritten(cal, e.note), at: performance.now() });
      if (heard.length > 32) heard.shift();
    }
    draw();
  });
  draw();

  root.append(h('section', { class: 'card chord-finder' },
    roomEyebrow('chords'),
    h('h1', {}, 'Chord finder'),
    h('p', { class: 'small' }, 'Hold down any keys and see what chord they make, in any position, or play its notes one after another. No keyboard at hand? Tap keys on the picture: a tapped key stays down until you tap it again. Or build one: type its name (no ♯ or ♭ needed: c#m7, bb maj7, f sharp minor) or pick a root and a kind.'),
    h('div', { class: 'chord-build' }, typed, suggestions, rootPicks, kindPicks),
    h('div', { class: 'chord-panel' }, h('div', {}, big, brokenNote, others, about, facts), staffBox),
    h('div', { class: 'stage' }, kb.el),
    h('div', { class: 'controls' }, hear, clear),
    tries,
    recentBox,
  ));
  return () => { offNote(); offHeld(); clearTimeout(settle); clearTimeout(fade); };
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
