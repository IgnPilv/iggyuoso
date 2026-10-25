import type { Hand } from './notes';
import { midiName, parseMeter } from './notes';
import { keyName, type MidiFile } from './midiFile';
import { keySignature } from './theory';
import { transcribe, type CapturedNote } from './transcribe';

// A MIDI file turned into a song to practise: its parts (one per track and channel), which hand
// plays each, and the note strings the timed player reads. Pure, so it is unit-tested; the
// screens are in src/ui/mySongsView.ts and the saved records in src/progress/mySongs.ts.

/** One note of a part: written MIDI number, start and length in quarter beats, velocity. */
export type PartNote = [midi: number, at: number, beats: number, velocity: number];

export interface SongPart {
  /** The track's name, or "Part n". */
  name: string;
  notes: PartNote[];
}

/** Who plays a part: one hand, both (split at middle C), or nobody. */
export type PartHand = Hand | 'split' | 'off';

export interface SongSettings {
  /** Beats per minute of the meter's beat (the app's tempo). */
  tempo: number;
  meter: string;
  key: string;
  /** The grid notes are written on, in quarter beats (0.5 = eighths, 0.25 = sixteenths). */
  grid: number;
  parts: SongPart[];
  hands: PartHand[];
}

export interface SongDraft extends SongSettings {
  title: string;
  /** Said to the player: tempo changes flattened, notes left out, drums dropped... */
  notes: string[];
}

/** An imported song keeps at most this many notes (so it stays small enough to sync). */
export const SONG_MAX_NOTES = 4000;
const DRUMS = 9;

const round = (x: number, step: number) => Math.round(x / step) * step;

/** Read the parts, tempo, meter and key out of a MIDI file. */
export function readSong(file: MidiFile, title: string): SongDraft {
  const notes: string[] = [];
  const parts: SongPart[] = [];
  let drums = false;
  file.tracks.forEach((t) => {
    const channels = [...new Set(t.notes.map((n) => n.channel))].sort((a, b) => a - b);
    for (const ch of channels) {
      if (ch === DRUMS) { drums = true; continue; }
      const list = t.notes.filter((n) => n.channel === ch)
        .map((n): PartNote => [n.midi, round(n.on / file.ppq, 1 / 960), round(Math.max(1, n.off - n.on) / file.ppq, 1 / 960), n.velocity])
        .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
      if (!list.length) continue;
      const clean = (t.name ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 40);
      const name = clean && !/^(untitled|track \d+)$/i.test(clean) ? clean : '';
      parts.push({ name: channels.length > 1 && name ? `${name} (${ch + 1})` : name, notes: list });
    }
  });
  const named = parts.map((p) => p.name);
  parts.forEach((p, i) => { if (!p.name || named.filter((n) => n === p.name).length > 1) p.name = `${p.name || 'Part'} ${i + 1}`; });
  if (drums) notes.push('The drum part is left out.');

  let total = parts.reduce((s, p) => s + p.notes.length, 0);
  if (total > SONG_MAX_NOTES) {
    const end = parts.flatMap((p) => p.notes.map((n) => n[1])).sort((a, b) => a - b)[SONG_MAX_NOTES];
    for (const p of parts) p.notes = p.notes.filter((n) => n[1] < end);
    notes.push(`The song is long, so only its first ${SONG_MAX_NOTES} notes are kept.`);
    total = SONG_MAX_NOTES;
  }

  const ts = file.timeSignatures[0];
  let meter = ts ? `${ts.numerator}/${ts.denominator}` : '4/4';
  try { parseMeter(meter); } catch { notes.push(`The time signature ${meter} is not supported, so it is written in 4/4.`); meter = '4/4'; }
  if (file.timeSignatures.some((t) => `${t.numerator}/${t.denominator}` !== meter)) notes.push(`The time signature changes in the file; it is all written in ${meter}.`);

  const us = file.tempos[0]?.usPerQuarter ?? 500_000;
  const bpmQuarter = 60_000_000 / us;
  const tempo = Math.max(30, Math.min(240, Math.round(bpmQuarter / parseMeter(meter).pulse)));
  if (new Set(file.tempos.map((t) => t.usPerQuarter)).size > 1) notes.push(`The tempo changes in the file (slowing down here and there); it is played at one steady tempo, ${tempo}.`);

  const ks = file.keySignatures[0];
  let key = ks ? keyName(ks.sf, ks.minor) : 'C';
  try { keySignature(key); } catch { notes.push(`The key ${key} has no key signature here, so the staff is written in C.`); key = 'C'; }

  // Eighths when nearly every note starts on one, else sixteenths.
  const onsets = parts.flatMap((p) => p.notes.map((n) => n[1]));
  const onEighth = onsets.filter((at) => Math.abs(at * 2 - Math.round(at * 2)) < 0.06).length;
  const grid = total && onEighth / total >= 0.95 ? 0.5 : 0.25;

  return { title, tempo, meter, key, grid, parts, hands: defaultHands(parts), notes };
}

const mean = (p: SongPart) => p.notes.reduce((s, n) => s + n[0], 0) / p.notes.length;

/**
 * Who plays what at first: one part is split at middle C; with more, the highest part is the
 * right hand and the lowest the left, and the rest are left out (they can be added).
 */
export function defaultHands(parts: SongPart[]): PartHand[] {
  if (parts.length <= 1) return parts.map(() => 'split');
  const byPitch = parts.map((p, i) => ({ i, m: mean(p) })).sort((a, b) => b.m - a.m);
  const hands: PartHand[] = parts.map(() => 'off');
  hands[byPitch[0].i] = 'right';
  hands[byPitch[byPitch.length - 1].i] = 'left';
  return hands;
}

/** The lowest and highest note of a part, by name. */
export function partRange(p: SongPart): string {
  const ms = p.notes.map((n) => n[0]);
  return `${midiName(Math.min(...ms))} to ${midiName(Math.max(...ms))}`;
}

export interface WrittenSong {
  right?: string;
  left?: string;
  bars: number;
}

/** The song in note strings, each part in its hand, on the song's grid and in its key. */
export function writeSong(s: SongSettings): WrittenSong {
  const meter = parseMeter(s.meter);
  const notes: CapturedNote[] = [];
  s.parts.forEach((p, i) => {
    const hand = s.hands[i] ?? 'off';
    if (hand === 'off') return;
    for (const [midi, at, beats, velocity] of p.notes) {
      notes.push({ midi, on: at, off: at + beats, velocity, ...(hand === 'split' ? {} : { hand }) });
    }
  });
  if (!notes.length) return { bars: 0 };
  // Times are already in quarter beats, so a "beat" is 1 ms.
  const w = transcribe(notes, { beatMs: 1, meter, grid: s.grid, key: s.key });
  return { right: w.right, left: w.left, bars: w.bars };
}
