import type { Letter, Pitch } from './notes';

// The Chord finder (#/chords): whatever keys are down, say what they make. A chord gets its name,
// what kind it is, every note spelled from the root (C E G B♭, never C E G A♯), its inversion and
// what each note is to the root; two notes are an interval; anything else is just named.

/** One chord shape: steps above the root, the letter each step sits on, and its role. */
interface Shape {
  id: string;
  suffix: string;
  words: string;
  about: string;
  steps: { semis: number; letters: number; role: string }[];
}

const T = (semis: number, letters: number, role: string) => ({ semis, letters, role });
const ROOT = T(0, 0, 'root');
const M3 = T(4, 2, 'major third');
const m3 = T(3, 2, 'minor third');
const P5 = T(7, 4, 'perfect fifth');

const SHAPES: Shape[] = [
  { id: 'major', suffix: '', words: 'major', about: 'A major triad: a root, the major third above it and the perfect fifth. It sounds bright and settled.', steps: [ROOT, M3, P5] },
  { id: 'minor', suffix: 'm', words: 'minor', about: 'A minor triad: a root, a minor third (one key lower than in major) and the perfect fifth. It sounds darker, softer, sadder.', steps: [ROOT, m3, P5] },
  { id: 'dim', suffix: 'dim', words: 'diminished', about: 'A diminished triad: two minor thirds stacked, so the fifth is a key short. Tense: it wants to move on.', steps: [ROOT, m3, T(6, 4, 'diminished fifth')] },
  { id: 'aug', suffix: 'aug', words: 'augmented', about: 'An augmented triad: two major thirds stacked, so the fifth is a key wide. Dreamy and unsettled.', steps: [ROOT, M3, T(8, 4, 'augmented fifth')] },
  { id: 'sus4', suffix: 'sus4', words: 'sus4', about: 'A suspended chord: the third is swapped for the fourth. Open and waiting; it usually falls back to the major chord.', steps: [ROOT, T(5, 3, 'perfect fourth'), P5] },
  { id: 'sus2', suffix: 'sus2', words: 'sus2', about: 'A suspended chord: the third is swapped for the second. Open and airy, neither major nor minor.', steps: [ROOT, T(2, 1, 'major second'), P5] },
  { id: '7', suffix: '7', words: 'dominant seventh', about: 'A dominant seventh: a major triad with a minor seventh on top. It pulls hard towards the chord a fifth below (G7 wants C).', steps: [ROOT, M3, P5, T(10, 6, 'minor seventh')] },
  { id: '7no5', suffix: '7', words: 'dominant seventh', about: 'A dominant seventh without its fifth, as pianists often play it: root, third and seventh carry the sound. It pulls towards the chord a fifth below.', steps: [ROOT, M3, T(10, 6, 'minor seventh')] },
  { id: 'maj7', suffix: 'maj7', words: 'major seventh', about: 'A major seventh: a major triad with a major seventh on top, one key below the octave. Soft and jazzy.', steps: [ROOT, M3, P5, T(11, 6, 'major seventh')] },
  { id: 'm7', suffix: 'm7', words: 'minor seventh', about: 'A minor seventh: a minor triad with a minor seventh on top. Mellow, at home in soul and jazz.', steps: [ROOT, m3, P5, T(10, 6, 'minor seventh')] },
  { id: 'm7b5', suffix: 'm7♭5', words: 'half-diminished', about: 'A half-diminished seventh: a diminished triad with a minor seventh. Sad and searching; in minor it leads to the dominant.', steps: [ROOT, m3, T(6, 4, 'diminished fifth'), T(10, 6, 'minor seventh')] },
  { id: 'dim7', suffix: 'dim7', words: 'diminished seventh', about: 'A diminished seventh: minor thirds stacked all the way up. As tense as a chord gets; any of its notes can be heard as the root.', steps: [ROOT, m3, T(6, 4, 'diminished fifth'), T(9, 6, 'diminished seventh')] },
  { id: '6', suffix: '6', words: 'major sixth', about: 'A major sixth chord: a major triad with the sixth added. Sweet, an old-fashioned ending.', steps: [ROOT, M3, P5, T(9, 5, 'major sixth')] },
];

const LETTERS: Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const pc = (m: number) => ((m % 12) + 12) % 12;
const pitchMidi = (p: Pitch) => (p.octave + 1) * 12 + NATURAL[LETTERS.indexOf(p.letter)] + p.accidental;
// How each root is usually spelled: flats for the black keys of major-ish chords, sharps (C♯, F♯,
// G♯) for minor ones, as they are met in keys.
const ROOT_FLAT: [Letter, -1 | 0 | 1][] = [['C', 0], ['D', -1], ['D', 0], ['E', -1], ['E', 0], ['F', 0], ['F', 1], ['G', 0], ['A', -1], ['A', 0], ['B', -1], ['B', 0]];
const ROOT_SHARP: [Letter, -1 | 0 | 1][] = [['C', 0], ['C', 1], ['D', 0], ['E', -1], ['E', 0], ['F', 0], ['F', 1], ['G', 0], ['G', 1], ['A', 0], ['B', -1], ['B', 0]];
const MINORISH = new Set(['minor', 'dim', 'm7', 'm7b5', 'dim7']);

export const pitchName = (p: Pitch) => `${p.letter}${p.accidental === 1 ? '♯' : p.accidental === -1 ? '♭' : ''}`;

/** The written note for a key, on a given letter; undefined when that would take a double sharp or flat. */
function onLetter(midi: number, letter: Letter): Pitch | undefined {
  const nat = NATURAL[LETTERS.indexOf(letter)];
  let acc = pc(midi) - nat;
  if (acc > 6) acc -= 12;
  if (acc < -6) acc += 12;
  if (acc < -1 || acc > 1) return undefined;
  return { letter, accidental: acc as -1 | 0 | 1, octave: Math.floor((midi - acc) / 12) - 1 };
}

const PLAIN_SHARP: Letter[] = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];

/** A key on its own, spelled the plain way (sharps, or flats when `flats`). */
export function plainPitch(midi: number, flats = false): Pitch {
  return onLetter(midi, flats ? ROOT_FLAT[pc(midi)][0] : PLAIN_SHARP[pc(midi)])!;
}

export interface ChordTone { pitch: Pitch; role: string; midi: number }

export type Found =
  | { kind: 'none' }
  | { kind: 'note'; pitch: Pitch; octaves: number }
  | { kind: 'interval'; low: Pitch; high: Pitch; name: string; semitones: number }
  | {
      kind: 'chord';
      shape: string;
      /** The symbol, as over a lead sheet: C, Am, G7, F♯dim. */
      name: string;
      /** In words: C major, A minor, G dominant seventh. */
      words: string;
      about: string;
      root: Pitch;
      /** Each key held, spelled from the root, low to high. */
      tones: ChordTone[];
      /** Root position, first inversion... or "<role> in the bass". */
      position: string;
      /** The chord's notes in order from the root, once each. */
      spelling: string[];
    }
  | { kind: 'unknown'; pitches: Pitch[] };

/** What these keys (written MIDI numbers) make; `prefer` spells the root on that letter when it can. */
export function findChord(keys: number[], prefer?: Letter): Found {
  const held = [...new Set(keys)].sort((a, b) => a - b);
  if (!held.length) return { kind: 'none' };
  const pcs = [...new Set(held.map(pc))];
  if (pcs.length === 1) return { kind: 'note', pitch: plainPitch(held[0]), octaves: held.length > 1 ? Math.round((held[held.length - 1] - held[0]) / 12) : 0 };
  if (pcs.length === 2) return intervalOf(held);
  // The bass's reading wins where a shape could have two roots (C6 or Am7).
  const bass = pc(held[0]);
  for (const root of [bass, ...pcs.filter((r) => r !== bass)]) {
    const above = pcs.map((p) => pc(p - root)).sort((a, b) => a - b).join();
    const shape = SHAPES.find((s) => s.steps.map((t) => t.semis).join() === above);
    const found = shape && chordOf(held, root, shape, prefer);
    if (found && found.kind === 'chord') return found;
  }
  return { kind: 'unknown', pitches: held.map((m) => plainPitch(m)) };
}

function chordOf(held: number[], root: number, shape: Shape, prefer?: Letter): Found {
  const tables = MINORISH.has(shape.id) ? [ROOT_SHARP, ROOT_FLAT] : [ROOT_FLAT, ROOT_SHARP];
  const black = { 1: ['C', 'D'], 3: ['D', 'E'], 6: ['F', 'G'], 8: ['G', 'A'], 10: ['A', 'B'] } as Record<number, Letter[]>;
  // Spell every note on the letter its step needs; if that takes a double accidental, try the
  // root's other name (F♯ aug would need C𝄪, so it is G♭ aug).
  for (const rootLetter of new Set([...(prefer && onLetter(root, prefer) ? [prefer] : []), ...tables.map((t) => t[root][0]), ...(black[root] ?? [])])) {
    const tones: ChordTone[] = [];
    let ok = true;
    for (const m of held) {
      const step = shape.steps.find((t) => t.semis === pc(m - root))!;
      const p = onLetter(m, LETTERS[(LETTERS.indexOf(rootLetter) + step.letters) % 7]);
      if (!p) { ok = false; break; }
      tones.push({ pitch: p, role: step.role, midi: m });
    }
    if (!ok) continue;
    const rootPitch = onLetter(root + 60, rootLetter)!;
    const spelling = shape.steps.map((t) => {
      const p = onLetter(root + t.semis + 60, LETTERS[(LETTERS.indexOf(rootLetter) + t.letters) % 7]);
      return p ? pitchName(p) : '?';
    });
    const bassRole = tones[0].role;
    const position = bassRole === 'root' ? 'Root position: the root is in the bass.'
      : shape.steps[1]?.role === bassRole && /third/.test(bassRole) ? `First inversion: the third (${pitchName(tones[0].pitch)}) is in the bass.`
      : /fifth/.test(bassRole) ? `Second inversion: the fifth (${pitchName(tones[0].pitch)}) is in the bass.`
      : /seventh/.test(bassRole) ? `Third inversion: the seventh (${pitchName(tones[0].pitch)}) is in the bass.`
      : `The ${bassRole} (${pitchName(tones[0].pitch)}) is in the bass.`;
    const name = pitchName(rootPitch) + shape.suffix;
    return { kind: 'chord', shape: shape.id, name, words: `${pitchName(rootPitch)} ${shape.words}`, about: shape.about, root: rootPitch, tones, position, spelling };
  }
  return { kind: 'unknown', pitches: held.map((m) => plainPitch(m)) };
}

// Interval names by semitones (1 to 12), with the letter distance that spells them.
const INTERVAL_NAMES = ['', 'minor second', 'major second', 'minor third', 'major third', 'perfect fourth', 'tritone', 'perfect fifth', 'minor sixth', 'major sixth', 'minor seventh', 'major seventh', 'octave'];
const INTERVAL_LETTERS = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6, 7];

function intervalOf(held: number[]): Found {
  const lowKey = held[0];
  const highKey = held.find((m) => pc(m) !== pc(lowKey))!;
  const semis = highKey - lowKey;
  const simple = ((semis - 1) % 12) + 1;
  const base = INTERVAL_NAMES[simple];
  const octaves = Math.floor((semis - 1) / 12);
  const name = octaves === 0 ? base : `${octaves === 1 ? 'an octave' : `${octaves} octaves`} and a ${base}`;
  const low = plainPitch(lowKey, [1, 3, 8, 10].includes(pc(lowKey)));
  const high = onLetter(highKey, LETTERS[(LETTERS.indexOf(low.letter) + INTERVAL_LETTERS[simple]) % 7]) ?? plainPitch(highKey);
  return { kind: 'interval', low, high, name, semitones: semis };
}

/** Keys for the chord in each position, close together, near where the hand already is. */
export function inversions(found: Extract<Found, { kind: 'chord' }>): { label: string; keys: number[] }[] {
  const shape = SHAPES.find((s) => s.id === found.shape)!;
  const root = pc(pitchMidi(found.root));
  const from = found.tones[0].midi - 5;
  const labels = ['Root position', 'First inversion', 'Second inversion', 'Third inversion'];
  return shape.steps.map((_, i) => {
    const order = [...shape.steps.slice(i), ...shape.steps.slice(0, i)];
    const keys: number[] = [];
    for (const t of order) {
      let k = (keys.length ? keys[keys.length - 1] + 1 : from);
      while (pc(k) !== pc(root + t.semis)) k++;
      keys.push(k);
    }
    return { label: labels[i], keys };
  });
}

/** Chords one change away (major ↔ minor, add a seventh), as keys in root position from the root. */
export function neighbours(found: Extract<Found, { kind: 'chord' }>): { label: string; keys: number[] }[] {
  // The root at or just below the lowest key held, so the hand stays where it is.
  let r = found.tones[0].midi;
  while (pc(r) !== pc(pitchMidi(found.root))) r--;
  const build = (steps: number[]) => steps.map((s) => r + s);
  const name = pitchName(found.root);
  const out: { label: string; keys: number[] }[] = [];
  const add = (id: string, label: string) => {
    if (found.shape === id) return;
    out.push({ label, keys: build(SHAPES.find((s) => s.id === id)!.steps.map((t) => t.semis)) });
  };
  if (['major', 'sus4', 'sus2', 'aug', '6', '7', '7no5', 'maj7'].includes(found.shape)) add('minor', `${name}m (minor)`);
  if (['minor', 'dim', 'sus4', 'sus2', 'aug', 'm7', 'm7b5', 'dim7'].includes(found.shape)) add('major', `${name} (major)`);
  if (found.shape === 'major') { add('7', `${name}7`); add('maj7', `${name}maj7`); add('sus4', `${name}sus4`); }
  if (found.shape === 'minor') { add('m7', `${name}m7`); add('dim', `${name}dim`); }
  return out;
}

// ---------------------------------------------------------------- the constructor

/** The chord kinds to pick from, in the order a player meets them. */
export const QUALITIES: { id: string; label: string }[] = [
  { id: 'major', label: 'Major' }, { id: 'minor', label: 'Minor' }, { id: '7', label: '7' },
  { id: 'maj7', label: 'maj7' }, { id: 'm7', label: 'm7' }, { id: 'dim', label: 'dim' },
  { id: 'aug', label: 'aug' }, { id: 'sus2', label: 'sus2' }, { id: 'sus4', label: 'sus4' },
  { id: '6', label: '6' }, { id: 'm7b5', label: 'm7♭5' }, { id: 'dim7', label: 'dim7' },
];

/** The twelve roots to pick from, spelled as they are usually met. */
export const ROOTS: { letter: Letter; accidental: -1 | 0 | 1 }[] = ROOT_FLAT.map(([letter, accidental]) => ({ letter, accidental }));

// Ways of writing each kind, after the root, with spaces, dashes and "chord" taken out.
const ALIASES: Record<string, string[]> = {
  major: ['', 'maj', 'major', 'ma', 'dur'],
  minor: ['m', 'min', 'minor', 'mi', '-', 'moll'],
  dim: ['dim', 'diminished', 'o', '°'],
  aug: ['aug', 'augmented', '+'],
  sus4: ['sus4', 'sus', 'suspended4', 'suspended'],
  sus2: ['sus2', 'suspended2'],
  '7': ['7', 'dom7', 'dominant7', 'dominant', 'dom'],
  maj7: ['maj7', 'major7', 'ma7', 'δ', 'δ7', '∆', '∆7'],
  m7: ['m7', 'min7', 'minor7', 'mi7', '-7'],
  m7b5: ['m7b5', 'min7b5', 'minor7b5', 'halfdiminished', 'halfdim', 'ø', 'ø7', 'm7flat5', 'm7-5'],
  dim7: ['dim7', 'diminished7', 'o7', '°7'],
  '6': ['6', 'maj6', 'major6', 'add6'],
};

export interface ChordSpec { letter: Letter; accidental: -1 | 0 | 1; quality: string }

/** The root and the rest of what was typed, made plain: lower case, words for sharp and flat read. */
function splitTyped(text: string): { letter: Letter; accidental: -1 | 0 | 1; rest: string; upperM: boolean } | undefined {
  const t = text.trim().replace(/♯/g, '#').replace(/♭/g, 'b');
  const m = /^([a-gA-G])\s*(#|sh(?:a(?:rp?)?)?|is|s(?!u)|b|flat|es)?(.*)$/i.exec(t);
  if (!m) return undefined;
  const acc = (m[2] ?? '').toLowerCase();
  const accidental = !acc ? 0 : acc === '#' || acc.startsWith('s') || acc === 'is' ? 1 : -1;
  const raw = m[3].replace(/chord/gi, '').replace(/[\s_]+/g, '');
  // A capital M on its own (CM, CM7) means major, as on lead sheets.
  const upperM = /^M(?!in|aj|i)/.test(raw);
  const rest = raw.toLowerCase()
    .replace(/seventh/g, '7').replace(/sixth/g, '6').replace(/second/g, '2').replace(/fourth/g, '4').replace(/fifth/g, '5')
    .replace(/flat/g, 'b').replace(/[–—]/g, '-');
  return { letter: m[1].toUpperCase() as Letter, accidental, rest, upperM };
}

/**
 * Reads a typed chord name, forgiving about case, spaces and how sharps and flats are written:
 * "c#m7", "Bb maj7", "f sharp minor", "ebsus4", "G dominant seventh", "A half diminished".
 * Undefined when it is not (yet) a chord name.
 */
export function parseChordName(text: string): ChordSpec | undefined {
  const s = splitTyped(text);
  if (!s) return undefined;
  if (s.upperM) {
    const after = s.rest.slice(1);
    if (after === '') return { ...s, quality: 'major' };
    if (after === '7') return { ...s, quality: 'maj7' };
  }
  const quality = Object.keys(ALIASES).find((q) => ALIASES[q].includes(s.rest));
  return quality ? { letter: s.letter, accidental: s.accidental, quality } : undefined;
}

/** Chords that what was typed could become, best first (the exact one, then those it starts). */
export function suggestChords(text: string, max = 6): ChordSpec[] {
  const s = splitTyped(text);
  if (!s) return [];
  const exact = parseChordName(text);
  const out: ChordSpec[] = exact ? [exact] : [];
  for (const q of QUALITIES) {
    if (out.length >= max) break;
    if (out.some((o) => o.quality === q.id)) continue;
    if (ALIASES[q.id].some((a) => a.startsWith(s.rest))) out.push({ letter: s.letter, accidental: s.accidental, quality: q.id });
  }
  return out;
}

/** How a spec is written as a symbol: C♯m7, B♭maj7. */
export function specName(spec: ChordSpec): string {
  const shape = SHAPES.find((x) => x.id === spec.quality)!;
  return pitchName({ letter: spec.letter, accidental: spec.accidental, octave: 4 }) + shape.suffix;
}

/** The chord's keys in root position, with the root from middle C up (C4 to B4). */
export function specKeys(spec: ChordSpec): number[] {
  const root = 60 + pc(NATURAL[LETTERS.indexOf(spec.letter)] + spec.accidental);
  return SHAPES.find((x) => x.id === spec.quality)!.steps.map((t) => root + t.semis);
}

// ---------------------------------------------------------------- other names

export type ChordFound = Extract<Found, { kind: 'chord' }>;

/**
 * Every name these keys can go by: the main one first (as `findChord` reads it), then the same
 * chord spelled another way (A♭ or G♯), then other readings of the same keys (C6 or Am7; each
 * note of a diminished seventh as its root).
 */
export function allReadings(keys: number[]): ChordFound[] {
  const main = findChord(keys);
  if (main.kind !== 'chord') return [];
  const held = [...new Set(keys)].sort((a, b) => a - b);
  const pcs = [...new Set(held.map(pc))];
  const out: ChordFound[] = [main];
  const add = (f: Found | undefined) => { if (f?.kind === 'chord' && !out.some((o) => o.name === f.name)) out.push(f); };
  const rootPc = pc(pitchMidi(main.root));
  for (const root of [rootPc, ...pcs.filter((r) => r !== rootPc)]) {
    const above = pcs.map((p) => pc(p - root)).sort((a, b) => a - b).join();
    const shape = SHAPES.find((s) => s.steps.map((t) => t.semis).join() === above);
    if (!shape) continue;
    for (const letter of LETTERS) {
      if (!onLetter(root, letter)) continue;
      const f = chordOf(held, root, shape, letter);
      if (f.kind === 'chord' && f.root.letter === letter) add(f);
    }
  }
  return out;
}

const MAJOR_KEYS: [Letter, -1 | 0 | 1][] = [['C', 0], ['G', 0], ['D', 0], ['A', 0], ['E', 0], ['B', 0], ['F', 1], ['C', 1], ['F', 0], ['B', -1], ['E', -1], ['A', -1], ['D', -1], ['G', -1], ['C', -1]];
const MINOR_KEYS: [Letter, -1 | 0 | 1][] = [['A', 0], ['E', 0], ['B', 0], ['F', 1], ['C', 1], ['G', 1], ['D', 1], ['A', 1], ['D', 0], ['G', 0], ['C', 0], ['F', 0], ['B', -1], ['E', -1], ['A', -1]];
const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const LOWER = new Set(['minor', 'm7', 'dim', 'm7b5', 'dim7']);
const MARK: Record<string, string> = { dim: '°', aug: '+', '7': '7', '7no5': '7', maj7: 'maj7', m7: '7', m7b5: 'ø7', dim7: '°7', '6': '6', sus4: 'sus4', sus2: 'sus2' };

/**
 * The keys whose scale holds this chord as it is spelled, with its Roman numeral there: major keys,
 * then minor keys (harmonic minor, so V and V7 are major there, as they are played); where it is I first.
 */
export function keysOf(f: ChordFound): string[] {
  const out: { name: string; deg: number }[] = [];
  const check = (tonics: [Letter, -1 | 0 | 1][], steps: number[], kind: string) => {
    for (const [letter, acc] of tonics) {
      const t = NATURAL[LETTERS.indexOf(letter)] + acc;
      const scale = steps.map((st, i) => onLetter(t + st + 60, LETTERS[(LETTERS.indexOf(letter) + i) % 7]));
      const names = scale.map((p) => (p ? pitchName(p) : ''));
      if (!f.spelling.every((n) => names.includes(n))) continue;
      const deg = names.indexOf(f.spelling[0]);
      const numeral = LOWER.has(f.shape) ? NUMERALS[deg].toLowerCase() : NUMERALS[deg];
      out.push({ deg, name: `${pitchName({ letter, accidental: acc, octave: 4 })} ${kind} (${numeral}${MARK[f.shape] ?? ''})` });
    }
  };
  check(MAJOR_KEYS, [0, 2, 4, 5, 7, 9, 11], 'major');
  check(MINOR_KEYS, [0, 2, 3, 5, 7, 8, 11], 'minor');
  // Home chord first, then the dominant, the subdominant and the rest.
  const order = [0, 4, 3, 5, 1, 2, 6];
  return out.sort((a, b) => order.indexOf(a.deg) - order.indexOf(b.deg)).map((o) => o.name);
}
