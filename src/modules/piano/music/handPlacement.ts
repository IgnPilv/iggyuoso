import { isBlack, pitchClass, type Hand } from './notes';

// Where each hand sits on the keys: for every note onset, the key under each of the five fingers.
// A played finger is on its key; the others rest where the hand will need them next (looking
// ahead until a finger would have to move), else where they just were, else on the white keys
// beside their neighbours, as in a five-finger position. Between two positions the hand slides
// over in the time just before the note that needs the new one. Works on device keys, so the
// drawing needs no calibration of its own.

export interface PlacedNote { key: number; beat: number; beats: number; hand: Hand; finger?: number }

export type FingerState = 'rest' | 'down' | 'next';

/** One finger at a moment: sliding from one key to another (`t` from 0 to 1), and what it is doing. */
export interface FingerFrame { finger: number; from: number; to: number; t: number; state: FingerState }

export interface HandFrame { hand: Hand; fingers: FingerFrame[] }

interface HandEvent { beat: number; end: number; set: Map<number, number>; pose: number[] }

const WHITE_OF = [0, -1, 1, -1, 2, 3, -1, 4, -1, 5, -1, 6];
const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];

/** A key's place counted in white keys (C-1 = 0); a black key sits half way between its neighbours. */
export function whiteIndex(m: number): number {
  const oct = Math.floor(m / 12) * 7;
  const pc = pitchClass(m);
  return isBlack(m) ? oct + WHITE_OF[pc - 1] + 0.5 : oct + WHITE_OF[pc];
}

/** The white key at a whole white index. */
export function whiteKey(wi: number): number {
  return Math.floor(wi / 7) * 12 + WHITE_PCS[((wi % 7) + 7) % 7];
}

/** Fingers in order of pitch: 1 to 5 go up in the right hand, down in the left. */
function inOrder(set: Map<number, number>, hand: Hand): boolean {
  const fs = [...set.keys()].sort((a, b) => a - b);
  for (let i = 1; i < fs.length; i++) {
    const a = set.get(fs[i - 1])!, b = set.get(fs[i])!;
    if (hand === 'right' ? b <= a : b >= a) return false;
  }
  // A hand spans about a ninth at most.
  const keys = [...set.values()];
  return Math.max(...keys) - Math.min(...keys) <= 14;
}

/** Adds what `more` says about fingers not yet placed, if it fits; false where a finger would have to move. */
function absorb(set: Map<number, number>, more: Map<number, number>, hand: Hand): boolean {
  const next = new Map(set);
  for (const [f, k] of more) {
    if (next.has(f)) { if (next.get(f) !== k) return false; continue; }
    next.set(f, k);
  }
  if (!inOrder(next, hand)) return false;
  for (const [f, k] of next) set.set(f, k);
  return true;
}

/** Puts the fingers nobody placed beside the ones that are, on white keys. */
function fill(set: Map<number, number>, hand: Hand): number[] {
  const dir = hand === 'right' ? 1 : -1;
  const placed = [...set.keys()].sort((a, b) => a - b);
  const pose: number[] = [];
  for (let f = 1; f <= 5; f++) {
    if (set.has(f)) { pose.push(set.get(f)!); continue; }
    const below = placed.filter((p) => p < f).pop();
    const above = placed.find((p) => p > f);
    let wi: number;
    if (below !== undefined && above !== undefined) {
      const a = whiteIndex(set.get(below)!), b = whiteIndex(set.get(above)!);
      wi = Math.round(a + ((b - a) * (f - below)) / (above - below));
    } else {
      const near = below ?? above!;
      const w = whiteIndex(set.get(near)!) + (f - near) * dir;
      wi = (f - near) * dir > 0 ? Math.ceil(w) : Math.floor(w);
    }
    pose.push(whiteKey(wi));
  }
  return pose;
}

export class HandPlan {
  private events = new Map<Hand, HandEvent[]>();
  /** The hands that have fingering to show. */
  readonly hands: Hand[] = [];

  constructor(private notes: PlacedNote[]) {
    for (const hand of ['left', 'right'] as Hand[]) {
      const own = notes.filter((n) => n.hand === hand && n.finger && n.finger >= 1 && n.finger <= 5);
      const evs: HandEvent[] = [];
      for (const n of [...own].sort((a, b) => a.beat - b.beat)) {
        const last = evs[evs.length - 1];
        if (last && Math.abs(last.beat - n.beat) < 1e-6) {
          last.set.set(n.finger!, n.key);
          last.end = Math.max(last.end, n.beat + n.beats);
        } else evs.push({ beat: n.beat, end: n.beat + n.beats, set: new Map([[n.finger!, n.key]]), pose: [] });
      }
      if (!evs.length) continue;
      evs.forEach((ev, i) => {
        const set = new Map(ev.set);
        // Look a few dozen onsets either way at most: past that it no longer says where the hand is now.
        for (let j = i + 1; j < Math.min(evs.length, i + 24) && set.size < 5 && absorb(set, evs[j].set, hand); j++);
        for (let j = i - 1; j >= Math.max(0, i - 24) && set.size < 5 && absorb(set, evs[j].set, hand); j--);
        ev.pose = fill(set, hand);
      });
      this.events.set(hand, evs);
      this.hands.push(hand);
    }
  }

  /** Each hand's fingers at a beat (before the first note: where the hand starts). */
  at(beat: number): HandFrame[] {
    return this.hands.map((hand) => {
      const evs = this.events.get(hand)!;
      let i = -1;
      while (i + 1 < evs.length && evs[i + 1].beat <= beat + 1e-9) i++;
      const cur = evs[Math.max(0, i)];
      const nxt = i >= 0 ? evs[i + 1] : undefined;
      // Slide over in the last part of the gap: at most three quarters of a beat, at most 60% of it.
      let t = 0;
      if (nxt && i >= 0 && nxt.pose.some((k, f) => k !== cur.pose[f])) {
        const gap = nxt.beat - cur.beat;
        const start = nxt.beat - Math.min(0.75, gap * 0.6);
        const x = Math.max(0, Math.min(1, (beat - start) / (nxt.beat - start)));
        t = x * x * (3 - 2 * x);
      }
      const down = new Set(this.notes.filter((n) => n.hand === hand && n.finger && n.beat <= beat + 1e-9 && beat < n.beat + n.beats).map((n) => n.finger!));
      const coming = i < 0 ? evs[0] : nxt;
      const next = coming ? new Set(coming.set.keys()) : new Set<number>();
      return {
        hand,
        fingers: cur.pose.map((from, f) => ({
          finger: f + 1, from, to: nxt && t > 0 ? nxt.pose[f] : from, t,
          state: down.has(f + 1) ? 'down' : next.has(f + 1) ? 'next' : 'rest',
        })),
      };
    });
  }

  /** The key under each finger at each onset of a hand (for tests). */
  poses(hand: Hand): { beat: number; keys: number[] }[] {
    return (this.events.get(hand) ?? []).map((e) => ({ beat: e.beat, keys: e.pose }));
  }
}
