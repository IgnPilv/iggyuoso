import { chordName } from '../music/chordNames';
import { parsePitch, pitchClass } from '../music/notes';
import { parseKey, romanChord, SCALES, type Key } from '../music/theory';
import { spell } from '../music/transcribe';

// The Jam room (#/jam): a backing band (drums, bass, chords) loops a progression and the player
// improvises over it. Everything here is plain data so it can be tested: which chords, what the
// band plays in each bar, and how a played note fits the chord and the key at that moment.

export interface Backing {
  id: string;
  name: string;
  /** One numeral per bar (romanChord: I, vi, V7, ...). */
  bars: string[];
  /** Major or minor key. */
  minor: boolean;
  /** The scale suggested for improvising (a SCALES name). */
  scale: string;
  /** A groove that suits it. */
  groove: GrooveId;
}

export const BACKINGS: Backing[] = [
  { id: 'pop', name: 'Pop: I V vi IV', bars: ['I', 'V', 'vi', 'IV'], minor: false, scale: 'major pentatonic', groove: 'pop' },
  { id: 'doowop', name: '50s: I vi IV V', bars: ['I', 'vi', 'IV', 'V'], minor: false, scale: 'major pentatonic', groove: 'ballad' },
  { id: 'blues', name: '12-bar blues', bars: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'], minor: false, scale: 'blues', groove: 'swing' },
  { id: 'canon', name: 'Canon: I V vi iii IV I IV V', bars: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'], minor: false, scale: 'major', groove: 'ballad' },
  { id: 'minor', name: 'Minor: i VI III VII', bars: ['i', 'VI', 'III', 'VII'], minor: true, scale: 'minor pentatonic', groove: 'pop' },
  { id: 'dorian', name: 'Dorian vamp: i IV', bars: ['i7', 'IV7'], minor: true, scale: 'dorian', groove: 'swing' },
];

export type GrooveId = 'ballad' | 'pop' | 'swing';
export const GROOVES: { id: GrooveId; name: string }[] = [
  { id: 'ballad', name: 'Ballad' },
  { id: 'pop', name: 'Pop' },
  { id: 'swing', name: 'Swing' },
];

/** Keys offered, written as parseKey takes them; minor backings add the m. */
export const JAM_KEYS = ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb'];
export const JAM_MINOR_KEYS = ['A', 'E', 'B', 'D', 'G', 'C', 'F#'];

export interface JamChord {
  numeral: string;
  /** As on a lead sheet: C, Am, G7. */
  name: string;
  /** Root position, from the root above the tonic in octave 4 (written MIDI). */
  notes: number[];
  pcs: Set<number>;
}

export interface JamPlan {
  key: Key;
  keyText: string;
  backing: Backing;
  chords: JamChord[];
  /** Pitch classes of the suggested scale. */
  scale: Set<number>;
  /** Pitch classes of the key's own scale (major or natural minor), also "inside". */
  keyScale: Set<number>;
}

export function jamPlan(backing: Backing, keyRoot: string): JamPlan {
  const keyText = backing.minor ? `${keyRoot}m` : keyRoot;
  const key = parseKey(keyText);
  const chords = backing.bars.map((numeral) => {
    const notes = romanChord(key, numeral);
    const name = chordName(notes.map((m) => parsePitch(spell(m, keyText)))) ?? numeral;
    return { numeral, name, notes, pcs: new Set(notes.map(pitchClass)) };
  });
  const pcsOf = (steps: number[]) => new Set(steps.map((s) => pitchClass(key.tonicPc + s)));
  return { key, keyText, backing, chords, scale: pcsOf(SCALES[backing.scale]), keyScale: pcsOf(SCALES[backing.minor ? 'minor' : 'major']) };
}

/** One thing the band plays, in quarter beats from the start of the bar. */
export interface BandEvent {
  beat: number;
  part: 'kick' | 'snare' | 'hat' | 'bass' | 'chord';
  /** Written MIDI notes (bass and chord). */
  notes?: number[];
  /** How long the notes ring, in beats. */
  beats?: number;
  /** 0–1. */
  level: number;
}

/** The bass note: the chord's root in octave 2 (E2 to D#3). */
export const bassRoot = (c: JamChord) => 40 + pitchClass(c.notes[0] - 40);

/** The chord in close position around middle C (between F3 and F4), the way a left hand would hold it. */
export function comp(c: JamChord): number[] {
  const tones = c.notes.map((m) => {
    let n = 53 + pitchClass(m - 53);
    if (n > 65) n -= 12;
    return n;
  });
  return [...new Set(tones)].sort((a, b) => a - b);
}

/** What the band plays in one bar of 4/4 (`next` = the chord of the bar after, for walking up to it). */
export function barEvents(groove: GrooveId, chord: JamChord, next: JamChord): BandEvent[] {
  const root = bassRoot(chord);
  const fifth = root + 7;
  const chordNotes = comp(chord);
  const out: BandEvent[] = [];
  const add = (beat: number, part: BandEvent['part'], level: number, notes?: number[], beats?: number) =>
    out.push({ beat, part, level, ...(notes ? { notes, beats } : {}) });
  if (groove === 'ballad') {
    add(0, 'kick', 0.8); add(2, 'kick', 0.5);
    add(1, 'snare', 0.35); add(3, 'snare', 0.35);
    for (let b = 0; b < 4; b++) add(b, 'hat', b % 2 ? 0.2 : 0.3);
    add(0, 'bass', 0.8, [root], 2); add(2, 'bass', 0.6, [fifth], 2);
    add(0, 'chord', 0.35, chordNotes, 3.8);
  } else if (groove === 'pop') {
    add(0, 'kick', 0.9); add(1.5, 'kick', 0.5); add(2, 'kick', 0.8);
    add(1, 'snare', 0.6); add(3, 'snare', 0.6);
    for (let b = 0; b < 8; b++) add(b / 2, 'hat', b % 2 ? 0.15 : 0.28);
    add(0, 'bass', 0.8, [root], 1.4); add(1.5, 'bass', 0.55, [root], 0.4); add(2, 'bass', 0.7, [root], 1); add(3, 'bass', 0.6, [fifth], 0.9);
    for (const b of [0, 1, 2, 3]) add(b, 'chord', b ? 0.22 : 0.3, chordNotes, 0.8);
  } else {
    // Swing: a ride on 1, 2-and-a (swung), 3, 4-and-a; walking bass root, third, fifth, a step to the next root.
    for (const b of [0, 1, 1 + 2 / 3, 2, 3, 3 + 2 / 3]) add(b, 'hat', Number.isInteger(b) ? 0.3 : 0.18);
    add(0, 'kick', 0.5); add(2, 'kick', 0.35);
    add(1, 'snare', 0.25); add(3, 'snare', 0.3);
    const third = root + (chord.notes[1] - chord.notes[0]);
    const target = bassRoot(next);
    // A half step below the next root leads into it (from above when below would repeat the fifth).
    const approach = target - 1 === fifth ? target + 1 : target - 1;
    [root, third, fifth, approach].forEach((n, b) => add(b, 'bass', 0.7, [n], 0.95));
    add(1 + 2 / 3, 'chord', 0.25, chordNotes, 0.5); add(3 + 2 / 3, 'chord', 0.22, chordNotes, 0.4);
  }
  return out;
}

export type Fit = 'chord' | 'scale' | 'key' | 'outside';

/** How a played note sits on this chord: a chord note, a note of the suggested scale or the key, or outside both. */
export function fitOf(plan: JamPlan, chord: JamChord, writtenMidi: number): Fit {
  const p = pitchClass(writtenMidi);
  if (chord.pcs.has(p)) return 'chord';
  if (plan.scale.has(p)) return 'scale';
  if (plan.keyScale.has(p)) return 'key';
  return 'outside';
}

/** Where a moment of the song falls: bar of the progression, beat in the bar (quarters). */
export function position(songBeats: number, bars: number): { bar: number; loopBar: number; beat: number } {
  const bar = Math.floor(songBeats / 4);
  return { bar, loopBar: ((bar % bars) + bars) % bars, beat: songBeats - bar * 4 };
}

/**
 * Which chord a note belongs to. A note played a little before the bar line (in the last eighth
 * of the bar) is heard with the chord that is coming, as players anticipate the change.
 */
export function chordAt(songBeats: number, bars: number): number {
  return position(songBeats + 0.5, bars).loopBar;
}

export interface JamTally {
  chord: number;
  scale: number;
  key: number;
  outside: number;
  /** Notes on beat 1 (± an eighth), and how many of them were chord notes. */
  downbeats: number;
  downbeatChord: number;
}

export const emptyTally = (): JamTally => ({ chord: 0, scale: 0, key: 0, outside: 0, downbeats: 0, downbeatChord: 0 });

export function tallyNote(t: JamTally, fit: Fit, songBeats: number) {
  t[fit]++;
  const beat = ((songBeats % 4) + 4) % 4;
  if (beat < 0.5 || beat > 3.5) {
    t.downbeats++;
    if (fit === 'chord') t.downbeatChord++;
  }
}

/** A few words on the take so far, or undefined while too little was played to say. */
export function jamAdvice(t: JamTally): string | undefined {
  const all = t.chord + t.scale + t.key + t.outside;
  if (all < 8) return undefined;
  const outside = t.outside / all;
  const chord = t.chord / all;
  if (outside > 0.25) return 'Lots of notes outside the key. Try the lit keys only for a while: every one of them fits.';
  if (t.downbeats >= 4 && t.downbeatChord / t.downbeats < 0.5) return 'Land on a bright key (a chord note) on beat 1 when the chord changes: it makes the tune follow the band.';
  if (chord > 0.85) return 'Nearly every note is a chord note. Safe! Now walk between them on the softer lit keys.';
  if (t.downbeats >= 4) return 'Nice: you land on the chord when it changes and move freely in between. That is how improvising sounds right.';
  return 'Good: almost everything fits. Try leaving a rest now and then, like a singer taking a breath.';
}
