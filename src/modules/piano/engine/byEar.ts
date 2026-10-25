import { LETTERS, parseTimedNotes, pitchClass, pitchToMidi, type NoteToken, type Pitch } from '../music/notes';

// Play by ear (#/byear): the app plays the opening of a well-known tune, gives its first note, and
// the player finds the rest on the keys, one note at a time. A wrong key is never "wrong" only: it
// says whether the tune goes higher or lower than that, then how far from the last note found (a
// step, a skip, a leap), and "Show me" lights the key. Playing the tune again from its start, or the
// last note found, to get one's bearings is not a guess, and the right note in another octave only
// says so. Rhythm is not judged. The ui is src/modules/piano/ui/byEarView.ts.
//
// Every tune is public domain (folk songs, carols, Beethoven, Brahms). Notes are written in C major
// or A minor (or near) and moved to another key letter by letter, so they stay spelled right.

export type EarLevel = 'easy' | 'medium' | 'hard';

export interface EarTune {
  id: string;
  title: string;
  /** Where it comes from, said when it is found. */
  origin: string;
  level: EarLevel;
  /** Quarter notes a minute, for listening. */
  tempo: number;
  /** The opening, as a timed note string (bar lines only for reading; never drawn). */
  notes: string;
}

export const EAR_TUNES: EarTune[] = [
  { id: 'hot-cross-buns', title: 'Hot Cross Buns', origin: 'English street cry', level: 'easy', tempo: 104,
    notes: 'E4:q D4:q C4:h | E4:q D4:q C4:h | C4:e C4:e C4:e C4:e D4:e D4:e D4:e D4:e | E4:q D4:q C4:h' },
  { id: 'mary', title: 'Mary Had a Little Lamb', origin: 'American nursery song, 1830s', level: 'easy', tempo: 104,
    notes: 'E4:q D4:q C4:q D4:q | E4:q E4:q E4:h | D4:q D4:q D4:h | E4:q G4:q G4:h' },
  { id: 'ode-to-joy', title: 'Ode to Joy', origin: 'Beethoven, Symphony No. 9, 1824', level: 'easy', tempo: 104,
    notes: 'E4:q E4:q F4:q G4:q | G4:q F4:q E4:q D4:q | C4:q C4:q D4:q E4:q | E4:q. D4:e D4:h' },
  { id: 'au-clair', title: 'Au clair de la lune', origin: 'French folk song, 18th century', level: 'easy', tempo: 100,
    notes: 'C4:q C4:q C4:q D4:q | E4:h D4:h | C4:q E4:q D4:q D4:q | C4:w' },
  { id: 'frere-jacques', title: 'Frère Jacques', origin: 'French round, 18th century', level: 'easy', tempo: 104,
    notes: 'C4:q D4:q E4:q C4:q | C4:q D4:q E4:q C4:q | E4:q F4:q G4:h | E4:q F4:q G4:h' },
  { id: 'lightly-row', title: 'Lightly Row', origin: 'German folk song', level: 'easy', tempo: 104,
    notes: 'G4:q E4:q E4:h | F4:q D4:q D4:h | C4:q D4:q E4:q F4:q | G4:q G4:q G4:h' },
  { id: 'jingle-bells', title: 'Jingle Bells', origin: 'James Lord Pierpont, 1857', level: 'easy', tempo: 120,
    notes: 'E4:q E4:q E4:h | E4:q E4:q E4:h | E4:q G4:q C4:q. D4:e | E4:w' },
  { id: 'twinkle', title: 'Twinkle Twinkle Little Star', origin: 'French tune "Ah! vous dirai-je, maman", 1761', level: 'medium', tempo: 104,
    notes: 'C4:q C4:q G4:q G4:q | A4:q A4:q G4:h | F4:q F4:q E4:q E4:q | D4:q D4:q C4:h' },
  { id: 'london-bridge', title: 'London Bridge', origin: 'English nursery song', level: 'medium', tempo: 108,
    notes: 'G4:q. A4:e G4:q F4:q | E4:q F4:q G4:h | D4:q E4:q F4:h | E4:q F4:q G4:h' },
  { id: 'saints', title: 'When the Saints Go Marching In', origin: 'American spiritual', level: 'medium', tempo: 132,
    notes: 'C4:q E4:q F4:q | G4:w | C4:q E4:q F4:q | G4:w | C4:q E4:q F4:q | G4:h E4:h | C4:h E4:h | D4:w' },
  { id: 'row-your-boat', title: 'Row, Row, Row Your Boat', origin: 'American round, 1852', level: 'medium', tempo: 120,
    notes: 'C4:q. C4:q. | C4:q D4:e E4:q. | E4:q D4:e E4:q F4:e | G4:h.' },
  { id: 'old-macdonald', title: 'Old MacDonald Had a Farm', origin: 'Folk song, 1917 in print', level: 'medium', tempo: 116,
    notes: 'G4:q G4:q G4:q D4:q | E4:q E4:q D4:h | B4:q B4:q A4:q A4:q | G4:w' },
  { id: 'yankee-doodle', title: 'Yankee Doodle', origin: 'American song, 18th century', level: 'medium', tempo: 120,
    notes: 'C4:q C4:q D4:q E4:q | C4:q E4:q D4:q G3:q | C4:q C4:q D4:q E4:q | C4:h B3:h' },
  { id: 'oh-susanna', title: 'Oh! Susanna', origin: 'Stephen Foster, 1848', level: 'medium', tempo: 120,
    notes: 'C4:e D4:e | E4:q G4:q G4:q. A4:e | G4:q E4:q C4:q. D4:e | E4:q E4:q D4:q C4:q | D4:h.' },
  { id: 'brahms-lullaby', title: 'Lullaby (Wiegenlied)', origin: 'Brahms, 1868', level: 'hard', tempo: 96,
    notes: 'E4:e E4:e | G4:h. E4:e E4:e | G4:h. E4:e G4:e | C5:q B4:q. A4:e | A4:q G4:h' },
  { id: 'amazing-grace', title: 'Amazing Grace', origin: 'Hymn tune "New Britain", 1829', level: 'hard', tempo: 96,
    notes: 'G3:q | C4:h E4:e C4:e | E4:h D4:q | C4:h A3:q | G3:h G3:q | C4:h E4:e C4:e | E4:h D4:q | G4:h.' },
  { id: 'auld-lang-syne', title: 'Auld Lang Syne', origin: 'Scottish folk tune, words by Robert Burns, 1788', level: 'hard', tempo: 96,
    notes: 'G3:q | C4:q. C4:e C4:q E4:q | D4:q. C4:e D4:q E4:q | C4:q. C4:e E4:q G4:q | A4:h.' },
  { id: 'greensleeves', title: 'Greensleeves', origin: 'English ballad, 16th century', level: 'hard', tempo: 120,
    notes: 'A4:q | C5:h D5:q | E5:q. F5:e E5:q | D5:h B4:q | G4:q. A4:e B4:q | C5:h A4:q | A4:q. G#4:e A4:q | B4:h G#4:q | E4:h.' },
  { id: 'korobeiniki', title: 'Korobeiniki', origin: 'Russian folk song, 1861', level: 'hard', tempo: 120,
    notes: 'E5:q B4:e C5:e D5:q C5:e B4:e | A4:q A4:e C5:e E5:q D5:e C5:e | B4:q. C5:e D5:q E5:q | C5:q A4:q A4:h' },
  { id: 'fur-elise', title: 'Für Elise', origin: 'Beethoven, 1810', level: 'hard', tempo: 72,
    notes: 'E5:s D#5:s | E5:s D#5:s E5:s B4:s D5:s C5:s | A4:e r:s C4:s E4:s A4:s | B4:e r:s E4:s G#4:s B4:s | C5:e' },
];

/** Keys a tune can be moved to: letters to move, half steps to move (kept near middle C). */
export const EAR_KEYS: Record<string, { name: string; letters: number; semis: number }> = {
  C: { name: 'C', letters: 0, semis: 0 },
  D: { name: 'D', letters: 1, semis: 2 },
  F: { name: 'F', letters: 3, semis: 5 },
  G: { name: 'G', letters: -3, semis: -5 },
  A: { name: 'A', letters: -2, semis: -3 },
  Bb: { name: 'B♭', letters: -1, semis: -2 },
};

/** A pitch moved by letters and half steps, spelled from the new letter; undefined if it would need a double sharp or flat. */
export function movePitch(p: Pitch, letters: number, semis: number): Pitch | undefined {
  const idx = LETTERS.indexOf(p.letter) + letters;
  const letter = LETTERS[((idx % 7) + 7) % 7];
  const octave = p.octave + Math.floor(idx / 7);
  const plain = pitchToMidi({ letter, accidental: 0, octave });
  const accidental = pitchToMidi(p) + semis - plain;
  if (accidental < -1 || accidental > 1) return undefined;
  return { letter, accidental: accidental as -1 | 0 | 1, octave };
}

/** The tune's notes (rests kept for listening), moved to a key; undefined if a note cannot be spelled there. */
export function tuneTokens(tune: EarTune, key = 'C'): NoteToken[] | undefined {
  const k = EAR_KEYS[key] ?? EAR_KEYS.C;
  const out: NoteToken[] = [];
  for (const t of parseTimedNotes(tune.notes)) {
    const pitches: Pitch[] = [];
    for (const p of t.pitches) {
      const m = movePitch(p, k.letters, k.semis);
      if (!m) return undefined;
      pitches.push(m);
    }
    out.push({ ...t, pitches });
  }
  return out;
}

export interface EarNote {
  midi: number;
  pitch: Pitch;
  /** When it starts, in quarter beats from the start. */
  at: number;
  beats: number;
}

/** The notes to find, in order, with their place in time (rests leave gaps). */
export function earNotes(tokens: NoteToken[]): EarNote[] {
  const out: EarNote[] = [];
  let at = 0;
  for (const t of tokens) {
    if (t.pitches.length) out.push({ midi: pitchToMidi(t.pitches[0]), pitch: t.pitches[0], at, beats: t.beats });
    at += t.beats;
  }
  return out;
}

export type EarSize = 'same' | 'step' | 'skip' | 'leap';
/** How far a melody moves: the same note, a step (1–2 half steps), a skip (3–4), a leap (5 or more). */
export function moveSize(from: number, to: number): EarSize {
  const d = Math.abs(to - from);
  return d === 0 ? 'same' : d <= 2 ? 'step' : d <= 4 ? 'skip' : 'leap';
}

export type PressResult =
  | { kind: 'right'; index: number; done: boolean }
  | { kind: 'replay' }
  | { kind: 'octave'; higher: boolean }
  | { kind: 'wrong'; higher: boolean; tries: number; size?: EarSize; from?: number };

/** Credit for a note found on the 1st, 2nd, 3rd... try (shown = nothing). */
const CREDIT = [1, 0.6, 0.3, 0.15];

export class EarHunt {
  /** Index of the note to find next (the first note is given). */
  index = 1;
  /** Wrong tries on each note. */
  readonly tries: number[];
  /** Notes the player asked to be shown. */
  readonly shown = new Set<number>();
  /** Where a replay from the start (or from the last note found) has got to. */
  private replay = 0;

  constructor(readonly notes: EarNote[]) {
    this.tries = notes.map(() => 0);
    if (notes.length < 2) this.index = notes.length;
  }

  get done() { return this.index >= this.notes.length; }
  get target(): EarNote | undefined { return this.notes[this.index]; }
  get last(): EarNote { return this.notes[Math.max(0, this.index - 1)]; }

  /** A key pressed (written MIDI number). */
  press(midi: number): PressResult {
    if (this.done) return { kind: 'replay' };
    const target = this.notes[this.index];
    if (midi === target.midi) {
      const index = this.index++;
      this.replay = 0;
      return { kind: 'right', index, done: this.done };
    }
    // Finding one's way: the tune again from its start, or the last note found, is not a guess.
    if (this.replay < this.index && midi === this.notes[this.replay].midi) { this.replay++; return { kind: 'replay' }; }
    if (midi === this.notes[0].midi) { this.replay = 1; return { kind: 'replay' }; }
    if (midi === this.last.midi) { this.replay = this.index; return { kind: 'replay' }; }
    this.replay = 0;
    if (pitchClass(midi) === pitchClass(target.midi)) return { kind: 'octave', higher: target.midi > midi };
    const tries = ++this.tries[this.index];
    const from = this.last.midi;
    return { kind: 'wrong', higher: target.midi > midi, tries, ...(tries >= 2 ? { size: moveSize(from, target.midi), from } : {}) };
  }

  /** "Show me": the note is found for the player, for no credit. */
  show(): EarNote | undefined {
    if (this.done) return undefined;
    this.shown.add(this.index);
    this.replay = 0;
    return this.notes[this.index++];
  }

  /** 0–100: each note after the first, full marks on the first try, less after each wrong one, none if shown. */
  score(): number {
    const n = this.notes.length - 1;
    if (n <= 0) return 100;
    let sum = 0;
    for (let i = 1; i < this.index; i++) sum += this.shown.has(i) ? 0 : CREDIT[Math.min(this.tries[i], CREDIT.length - 1)];
    return Math.round((sum / n) * 100);
  }

  /** Notes found on the first try, after wrong tries, and shown. */
  summary() {
    let first = 0, later = 0;
    for (let i = 1; i < this.index; i++) if (!this.shown.has(i)) { if (this.tries[i]) later++; else first++; }
    return { first, later, shown: this.shown.size, wrong: this.tries.reduce((a, b) => a + b, 0) };
  }
}

/** Tunes of a level, in a fresh order that avoids the ones just played. */
export function nextTune(level: EarLevel, recent: string[], rand = Math.random): EarTune {
  const pool = EAR_TUNES.filter((t) => t.level === level);
  const fresh = pool.filter((t) => !recent.includes(t.id));
  const from = fresh.length ? fresh : pool.filter((t) => t.id !== recent[recent.length - 1]);
  return from[Math.floor(rand() * from.length)] ?? pool[0];
}
