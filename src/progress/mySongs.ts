import { parseExercise } from '../content/load';
import type { TimedExercise } from '../content/types';
import { writeSong, type SongDraft, type SongSettings } from '../music/importSong';
import { newSketchId } from './sketches';
import type { Store } from './store';

// My songs: MIDI files the player imported, kept one record each as `mysong.<id>`, so they stay in
// this browser and sync with an account like the rest of the progress. The file itself is not
// kept, only its parts (so the hands can be changed later) and the song as written. A deleted
// song is saved as null, so the deletion reaches other devices too.

export interface MySong extends SongSettings {
  id: string;
  title: string;
  /** ISO times. */
  created: string;
  updated: string;
  /** The file it came from. */
  file?: string;
  right?: string;
  left?: string;
  bars: number;
}

/** What a song can be practised as: both hands, or one. */
export type SongTake = 'together' | 'right' | 'left';

const PREFIX = 'mysong.';

export function mySongs(store: Store): MySong[] {
  return store.keys(PREFIX)
    .map((k) => store.get<MySong | null>(k))
    .filter((s): s is MySong => !!s && typeof s === 'object' && Array.isArray(s.parts))
    .sort((a, b) => (a.created < b.created ? 1 : a.created > b.created ? -1 : 0));
}

export const getMySong = (store: Store, id: string) => store.get<MySong | null>(PREFIX + id) ?? undefined;

/** Save a new song from an import, written out with its hands. */
export function addMySong(store: Store, d: SongDraft, file?: string): MySong {
  const now = new Date().toISOString();
  const { notes: _said, ...settings } = d;
  const s: MySong = { ...settings, ...writeSong(d), id: newSketchId(), created: now, updated: now, ...(file ? { file } : {}) };
  store.put(PREFIX + s.id, s);
  return s;
}

/** Rename it, or change who plays which part (the song is written again). */
export function updateMySong(store: Store, id: string, change: Partial<Pick<MySong, 'title' | 'hands' | 'grid' | 'tempo' | 'key'>>): MySong | undefined {
  const s = getMySong(store, id);
  if (!s) return undefined;
  const next = { ...s, ...change, updated: new Date().toISOString() };
  const out: MySong = { ...next, ...writeSong(next) };
  if (!out.right) delete out.right;
  if (!out.left) delete out.left;
  store.put(PREFIX + id, out);
  return out;
}

export function deleteMySong(store: Store, id: string) {
  store.put(PREFIX + id, null);
}

/** Which takes a song has: both hands only when both have notes. */
export function songTakes(s: Pick<MySong, 'right' | 'left'>): SongTake[] {
  return [...(s.right && s.left ? ['together' as const] : []), ...(s.right ? ['right' as const] : []), ...(s.left ? ['left' as const] : [])];
}

/** Exercise ids: `mysong-<id>` for both hands, `mysong-<id>-right` / `-left` for one. */
export const songExerciseId = (id: string, take: SongTake) => `mysong-${id}${take === 'together' ? '' : `-${take}`}`;

/**
 * A song as a timed exercise: falling notes and the sheet, per-hand scoring, the tempo ladder
 * and looping bars, like any piece. Records are kept under its own id.
 */
export function songExercise(s: MySong, take: SongTake): TimedExercise | undefined {
  const right = take !== 'left' ? s.right : undefined;
  const left = take !== 'right' ? s.left : undefined;
  if (!right && !left) return undefined;
  const ex = parseExercise({
    id: songExerciseId(s.id, take), kind: 'timed', title: s.title, tempo: s.tempo, meter: s.meter,
    ...(s.key === 'C' ? {} : { key: s.key }),
    hand: right && left ? 'together' : right ? 'right' : 'left',
    prompt: take === 'together' ? `“${s.title}”, both hands.` : `“${s.title}”, the ${take} hand on its own.`,
    ...(right ? { right } : {}), ...(left ? { left } : {}),
    tempoLadder: [50, 60, 70, 80, 90, 100], reps: 3, days: 2, display: 'keys',
  });
  return ex.kind === 'timed' ? ex : undefined;
}
