import { parseExercise } from '../content/load';
import type { TimedExercise } from '../content/types';
import type { CapturedNote } from '../music/transcribe';
import type { Store } from './store';

// The Sketchbook: musical ideas the player recorded (free play, or a good improvising take), kept
// one record each as `sketch.<id>`, so they sync with an account like the rest of the progress.
// A deleted sketch is saved as null, so the deletion reaches other devices too.

export interface Sketch {
  id: string;
  title: string;
  /** ISO times. */
  created: string;
  updated: string;
  /** Beats per minute of the meter's beat. */
  tempo: number;
  meter: string;
  key: string;
  /** Grid it was written on, in quarter beats. */
  grid: number;
  /** As played (song ms from the first downbeat at `tempo`), for playback that keeps the feel. */
  notes: CapturedNote[];
  /** As written (note strings), for the staff and for practising it. */
  right?: string;
  left?: string;
  bars: number;
  /** The exercise it was played in, if any. */
  from?: string;
  /** A note the player wrote about it. */
  memo?: string;
}

/** A take keeps at most this many notes (a long improvisation stays small enough to sync). */
export const SKETCH_MAX_NOTES = 2000;
const PREFIX = 'sketch.';

export function newSketchId(now = Date.now(), rng = Math.random) {
  return `${now.toString(36)}${Math.floor(rng() * 36 ** 3).toString(36).padStart(3, '0')}`;
}

export function sketches(store: Store): Sketch[] {
  return store.keys(PREFIX)
    .map((k) => store.get<Sketch | null>(k))
    .filter((s): s is Sketch => !!s && typeof s === 'object' && Array.isArray(s.notes))
    .sort((a, b) => (a.created < b.created ? 1 : a.created > b.created ? -1 : 0));
}

export const getSketch = (store: Store, id: string) => store.get<Sketch | null>(PREFIX + id) ?? undefined;

export function saveSketch(store: Store, s: Omit<Sketch, 'id' | 'created' | 'updated'> & Partial<Pick<Sketch, 'id' | 'created'>>): Sketch {
  const now = new Date().toISOString();
  const out: Sketch = { ...s, id: s.id ?? newSketchId(), created: s.created ?? now, updated: now, notes: s.notes.slice(0, SKETCH_MAX_NOTES) };
  store.put(PREFIX + out.id, out);
  return out;
}

export function updateSketch(store: Store, id: string, change: Partial<Pick<Sketch, 'title' | 'memo'>>): Sketch | undefined {
  const s = getSketch(store, id);
  if (!s) return undefined;
  const out = { ...s, ...change, updated: new Date().toISOString() };
  store.put(PREFIX + id, out);
  return out;
}

export function deleteSketch(store: Store, id: string) {
  store.put(PREFIX + id, null);
}

/** A sketch as a timed exercise to practise, with falling notes, the staff and scoring. */
export function sketchExercise(s: Sketch): TimedExercise | undefined {
  if (!s.right && !s.left) return undefined;
  const ex = parseExercise({
    id: `sketch-${s.id}`, kind: 'timed', title: s.title, tempo: s.tempo, meter: s.meter, key: s.key === 'C' ? undefined : s.key,
    hand: s.right && s.left ? 'together' : s.right ? 'right' : 'left',
    prompt: `Your own idea, “${s.title}”. Play it back as written.`,
    ...(s.right ? { right: s.right } : {}), ...(s.left ? { left: s.left } : {}),
    reps: 1, display: 'staff',
  });
  return ex.kind === 'timed' ? ex : undefined;
}
