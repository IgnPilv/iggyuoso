import type { Calibration } from '../calibration';
import { demo } from '../demo/demo';
import { readSong, partRange, writeSong, type PartHand, type SongDraft, type SongSettings } from '../music/importSong';
import { MidiFileError, parseMidiFile } from '../music/midiFile';
import { addMySong, deleteMySong, getMySong, mySongs, songExercise, songExerciseId, songTakes, updateMySong, type SongTake } from '../progress/mySongs';
import { demoProgress } from '../progress';
import { store, type Store } from '../progress/store';
import { h, type View } from './dom';
import { mountExercise, staffParts, starText } from './players';
import { renderStaff } from './staff';
import { needCalibration } from './views';

// My songs (#/mysongs): the player's own MIDI files. A file is read in the browser (nothing is
// uploaded), its parts are given to the hands, and the song is practised like any piece:
// falling notes or the sheet, each hand scored, the tempo ladder and looping bars.
// The demo keeps its songs in throwaway progress.

const songStore = (): Store => (demo.active ? demoProgress().store : store);

const HAND_LABEL: Record<PartHand, string> = { right: 'Right hand', left: 'Left hand', split: 'Both hands (split at middle C)', off: 'Leave out' };
const TAKE_LABEL: Record<SongTake, string> = { together: 'Both hands', right: 'Right hand', left: 'Left hand' };
const keyLabel = (k: string) => k.replace('b', '♭').replace('#', '♯').replace(/m$/, ' minor').replace(/^([A-G♭♯]+)$/, '$1 major');
const info = (s: Pick<SongSettings, 'tempo' | 'meter' | 'key'> & { bars: number }) =>
  `${s.bars} ${s.bars === 1 ? 'bar' : 'bars'} · ${keyLabel(s.key)} · ${s.meter} at ${s.tempo}`;
/** A tempo box: MIDI files often carry a tempo that is not the song's (120 is many programs' default). */
const tempoInput = (value: number) => h('input', { type: 'number', min: 30, max: 240, step: 1, value, class: 'num', 'aria-label': 'song tempo' });
const readTempo = (el: HTMLInputElement, fallback: number) => {
  const v = Math.round(Number(el.value));
  return Number.isFinite(v) && v >= 30 && v <= 240 ? v : fallback;
};

const titleOf = (file: string) => file.replace(/\.(mid|midi|kar)$/i, '').replace(/[_]+/g, ' ').trim().slice(0, 60) || 'My song';

/** The first bars of a song on the staff, to check the import looks right. */
function preview(s: SongSettings & { title: string }, bars = 4): Element | '' {
  const w = writeSong(s);
  const cut = (x?: string) => x?.split('|').slice(0, bars).join('|');
  const ex = songExercise({ ...s, id: 'preview', created: '', updated: '', right: cut(w.right), left: cut(w.left), bars: Math.min(bars, w.bars) }, w.right && w.left ? 'together' : w.right ? 'right' : 'left');
  if (!ex) return h('p', { class: 'small' }, 'No part is played by a hand yet.');
  return h('div', { class: 'staff-wrap' }, renderStaff(staffParts(ex), { barQuarters: ex.meter.quarters, key: ex.key }).svg);
}

/** Who plays each part: a select per part. `onChange` gets the new hands. */
function partsEditor(s: SongSettings, onChange: (hands: PartHand[]) => void): HTMLElement {
  const hands = [...s.hands];
  return h('ul', { class: 'sketch-items song-parts' }, ...s.parts.map((p, i) => {
    const sel = h('select', { 'aria-label': `who plays ${p.name}` }, ...(['right', 'left', 'split', 'off'] as const).map((v) => h('option', { value: v, selected: hands[i] === v }, HAND_LABEL[v])));
    sel.onchange = () => { hands[i] = sel.value as PartHand; onChange([...hands]); };
    return h('li', {}, h('span', { class: 'sketch-title' }, p.name), h('span', { class: 'small' }, `${p.notes.length} notes, ${partRange(p)}`), sel);
  }));
}

export const mySongsView: View = (root, id?: string) => {
  const cal = needCalibration(root);
  if (!cal) return;
  if (id) return songPage(root, cal, id);

  const fileInput = h('input', { type: 'file', accept: '.mid,.midi,.kar,audio/midi,audio/x-midi', hidden: true });
  const importBtn = h('button', {}, 'Import a MIDI file');
  const draftBox = h('div', { class: 'sketch-take' });
  const list = h('div', { class: 'sketch-list' });
  let cleanup: (() => void) | void;

  const showDraft = (d: SongDraft, file: string) => {
    const title = h('input', { type: 'text', value: d.title, 'aria-label': 'name', maxlength: 60 });
    const grid = h('select', { 'aria-label': 'grid' }, h('option', { value: '0.5', selected: d.grid === 0.5 }, 'Eighths'), h('option', { value: '0.25', selected: d.grid === 0.25 }, 'Sixteenths'));
    const look = h('div');
    const meta = h('p', { class: 'small' });
    const add = h('button', {}, 'Add to My songs');
    const redraw = () => {
      const w = writeSong(d);
      meta.textContent = info({ ...d, bars: w.bars });
      look.replaceChildren(h('h3', {}, 'The first bars'), preview({ ...d, title: d.title }));
      add.disabled = !w.bars;
    };
    grid.onchange = () => { d.grid = Number(grid.value); redraw(); };
    const tempo = tempoInput(d.tempo);
    tempo.onchange = () => { d.tempo = readTempo(tempo, d.tempo); tempo.value = String(d.tempo); redraw(); };
    add.onclick = () => {
      const s = addMySong(songStore(), { ...d, title: title.value.trim() || d.title }, file);
      if (demo.active) { root.replaceChildren(); cleanup = songPage(root, cal, s.id); } else location.hash = `#/mysongs/${s.id}`;
    };
    draftBox.replaceChildren(
      h('h3', {}, `From ${file}`),
      meta,
      ...d.notes.map((n) => h('p', { class: 'small' }, n)),
      h('p', { class: 'small' }, 'Who plays which part? A part for both hands is split at middle C.'),
      partsEditor(d, (hands) => { d.hands = hands; redraw(); }),
      h('div', { class: 'controls' }, h('label', {}, 'Tempo ', tempo), h('label', {}, 'Write in ', grid)),
      h('p', { class: 'small' }, `The file says ${d.tempo}. Many files carry a made-up tempo (120 is a common default), so set the song's real tempo here; the tempo ladder and records count from it. You can change it later too.`),
      look,
      h('div', { class: 'controls' }, h('label', {}, 'Name ', title), add),
    );
    redraw();
  };

  const load = (bytes: Uint8Array, file: string) => {
    try {
      const d = readSong(parseMidiFile(bytes), titleOf(file));
      if (!d.parts.length) throw new MidiFileError('There are no notes in this file.');
      showDraft(d, file);
    } catch (e) {
      draftBox.replaceChildren(h('p', { class: 'banner' }, e instanceof MidiFileError ? e.message : 'This file could not be read as MIDI.'));
      if (!(e instanceof MidiFileError)) console.error(e);
    }
  };
  fileInput.onchange = async () => {
    const f = fileInput.files?.[0];
    if (f) load(new Uint8Array(await f.arrayBuffer()), f.name);
    fileInput.value = '';
  };
  // The demo has no file picker: it imports its own file.
  importBtn.onclick = () => { if (demo.active && demo.midiFile) load(demo.midiFile.bytes, demo.midiFile.name); else fileInput.click(); };

  const all = mySongs(songStore());
  list.replaceChildren(
    h('h3', {}, 'Your songs'),
    all.length
      ? h('ul', { class: 'sketch-items' }, ...all.map((s) => h('li', {},
        h('a', { href: `#/mysongs/${s.id}`, class: 'sketch-title' }, s.title),
        h('span', { class: 'small' }, info(s)))))
      : h('p', { class: 'small' }, 'No songs yet.'),
  );

  root.append(h('section', { class: 'card sketchbook' },
    h('p', { class: 'small' }, h('a', { href: '#/songs' }, '← Songbook')),
    h('h2', {}, 'My songs'),
    h('p', {}, 'Bring a song you love as a MIDI file (.mid). The app reads it right here in the browser, gives its parts to your hands, and turns it into a piece to practise: falling notes or the sheet, each hand scored, slow tempos to climb, and any bars on a loop.'),
    h('p', { class: 'small' }, 'Your songs are kept with your progress: on this device, and in your account if you sign in. They are never shared.'),
    h('div', { class: 'controls' }, importBtn, fileInput),
    draftBox,
  ), h('section', { class: 'card' }, list));
  return () => { if (cleanup) cleanup(); };
};

/** One song: practise it with both hands or one, change the parts, rename or delete it. */
function songPage(root: HTMLElement, cal: Calibration, id: string): () => void {
  let s = getMySong(songStore(), id);
  if (!s) { root.append(h('p', {}, 'That song is not in My songs. ', h('a', { href: '#/mysongs' }, 'Back to My songs'))); return () => {}; }
  let cleanup = () => {};
  const practice = h('div');
  const takes = h('div', { class: 'controls' });
  const meta = h('p', { class: 'small' });
  const title = h('input', { type: 'text', value: s.title, 'aria-label': 'name', maxlength: 60, class: 'sketch-name' });
  title.onchange = () => { s = updateMySong(songStore(), id, { title: title.value.trim() || s!.title }) ?? s; };
  const tempo = tempoInput(s.tempo);
  tempo.onchange = () => {
    const v = readTempo(tempo, s!.tempo);
    tempo.value = String(v);
    if (v === s!.tempo) return;
    cleanup();
    practice.replaceChildren();
    s = updateMySong(songStore(), id, { tempo: v }) ?? s;
    showTakes();
  };
  const best = (take: SongTake) => songStore().exercise(songExerciseId(id, take)).best?.stars;
  const play = (take: SongTake) => {
    const ex = songExercise(s!, take);
    if (!ex) return;
    cleanup();
    cleanup = mountExercise(practice, ex, cal, () => showTakes());
    for (const b of takes.querySelectorAll('button')) b.classList.toggle('secondary', b.dataset.take !== take);
  };
  const showTakes = () => {
    const song = s!;
    meta.textContent = `${info(song)}${song.file ? ` · from ${song.file}` : ''}`;
    takes.replaceChildren(...songTakes(song).map((t) => {
      const stars = best(t);
      return h('button', { class: 'secondary', 'data-take': t, onclick: () => play(t) }, TAKE_LABEL[t], stars !== undefined ? h('span', { class: 'stars' }, ` ${starText(stars)}`) : '');
    }));
  };
  const parts = h('details', { class: 'song-parts-edit' },
    h('summary', {}, 'Parts and hands'),
    h('p', { class: 'small' }, 'Change who plays which part. The song is written again (your records stay).'),
    partsEditor(s, (hands) => {
      cleanup();
      practice.replaceChildren();
      s = updateMySong(songStore(), id, { hands }) ?? s;
      showTakes();
    }));
  const del = h('button', { class: 'secondary danger' }, 'Delete');
  // Two steps instead of a browser dialog.
  del.onclick = () => {
    if (del.dataset.sure) { deleteMySong(songStore(), id); cleanup(); if (!demo.active) location.hash = '#/mysongs'; return; }
    del.dataset.sure = '1';
    del.textContent = 'Really delete?';
  };
  showTakes();
  root.append(h('section', { class: 'card sketchbook' },
    h('p', { class: 'small' }, h('a', { href: '#/mysongs' }, '← My songs')),
    h('h2', {}, title),
    meta,
    h('div', { class: 'controls' }, h('label', {}, 'Song tempo ', tempo), h('span', { class: 'small' }, 'beats a minute at 100%')),
    h('p', { class: 'small' }, 'Pick what to practise. Start with one hand, slowly, and loop the hard bars.'),
    takes,
    practice,
    parts,
    h('div', { class: 'controls' }, del),
  ));
  return () => cleanup();
}
