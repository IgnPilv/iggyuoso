import { isBlack, midiName } from '../music/notes';

// Note Rush, a mini game: a note appears on the staff, play it before its time runs out. A round
// lasts a minute. Every right key in a row builds a streak, which raises the points per note
// (×1 to ×5) and shortens the time each note gets. The ui is src/modules/piano/ui/noteRush.ts.

export type RushClef = 'treble' | 'bass' | 'grand';
export type RushLevel = 'position' | 'staff' | 'ledger';

export const ROUND_MS = 60_000;
const QUEUE = 4; // the note to play and the three after it

const whites = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((m) => !isBlack(m));

/** Written MIDI notes (middle C = 60) for each clef and level: white keys only. */
const RANGES: Record<Exclude<RushClef, 'grand'>, Record<RushLevel, [number, number]>> = {
  // C position (C4–G4), the lines and spaces (E4–F5), then ledger lines (A3–C6).
  treble: { position: [60, 67], staff: [64, 77], ledger: [57, 84] },
  // C position for the left hand (C3–G3), the staff (G2–A3), ledger lines (C2–C4).
  bass: { position: [48, 55], staff: [43, 57], ledger: [36, 60] },
};

export function rushPool(clef: RushClef, level: RushLevel): number[] {
  if (clef !== 'grand') return whites(...RANGES[clef][level]);
  return [...new Set([...rushPool('bass', level), ...rushPool('treble', level)])].sort((a, b) => a - b);
}

/** Time a note gets: 6 s, a quarter of a second less for every note of the streak, at least 2 s. */
export const limitMs = (streak: number) => Math.max(2000, 6000 - streak * 250);
/** Points multiplier: ×1, one more for every 5 in a row, at most ×5. */
export const multiplier = (streak: number) => 1 + Math.min(4, Math.floor(streak / 5));

export type PressResult = 'hit' | 'wrong' | 'ignored';
export type TickResult = 'timeout' | 'over' | undefined;

export interface RushSummary {
  score: number;
  hits: number;
  wrong: number;
  timeouts: number;
  bestStreak: number;
  /** Right notes out of everything tried (wrong keys and timeouts count against). */
  accuracy: number;
  /** Middle time to find a note, in ms (0 with no hits). */
  medianMs: number;
  /** The notes that took longest on average (or were missed), slowest first, at most 3. */
  slowest: { name: string; ms: number }[];
}

export class NoteRush {
  readonly queue: number[] = [];
  score = 0;
  streak = 0;
  bestStreak = 0;
  hits = 0;
  wrong = 0;
  timeouts = 0;
  /** When the round started and when the current note appeared (performance.now() ms). */
  startedAt = 0;
  shownAt = 0;
  over = false;
  private times: { note: number; ms: number; hit: boolean }[] = [];

  constructor(readonly pool: number[], private rand: () => number = Math.random, readonly roundMs = ROUND_MS) {
    if (pool.length < 2) throw new Error('Note Rush needs at least two notes');
    while (this.queue.length < QUEUE) this.queue.push(this.draw());
  }

  get current() { return this.queue[0]; }
  /** Time left for the current note, and for the round. */
  noteLeft(now: number) { return Math.max(0, this.shownAt + limitMs(this.streak) - now); }
  roundLeft(now: number) { return Math.max(0, this.startedAt + this.roundMs - now); }

  start(now: number) {
    this.startedAt = this.shownAt = now;
  }

  /** Never the same note twice running. */
  private draw(): number {
    const last = this.queue[this.queue.length - 1];
    const choices = this.pool.filter((n) => n !== last);
    return choices[Math.floor(this.rand() * choices.length) % choices.length];
  }

  private advance(now: number) {
    this.queue.shift();
    this.queue.push(this.draw());
    this.shownAt = now;
  }

  /** A key went down (written MIDI). */
  press(note: number, now: number): PressResult {
    if (this.over || this.tick(now) === 'over') return 'ignored';
    if (note === this.current) {
      this.times.push({ note, ms: now - this.shownAt, hit: true });
      this.hits++;
      this.score += 10 * multiplier(this.streak);
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.advance(now);
      return 'hit';
    }
    this.wrong++;
    this.streak = 0;
    return 'wrong';
  }

  /** Call every frame: the note runs out (it counts as slow as its whole time), or the round ends. */
  tick(now: number): TickResult {
    if (this.over) return 'over';
    if (this.roundLeft(now) <= 0) { this.over = true; return 'over'; }
    if (this.noteLeft(now) <= 0) {
      this.times.push({ note: this.current, ms: limitMs(this.streak), hit: false });
      this.timeouts++;
      this.streak = 0;
      this.advance(now);
      return 'timeout';
    }
    return undefined;
  }

  summary(): RushSummary {
    const found = this.times.filter((t) => t.hit).map((t) => t.ms).sort((a, b) => a - b);
    const tries = this.hits + this.wrong + this.timeouts;
    const byNote = new Map<number, number[]>();
    for (const t of this.times) byNote.set(t.note, [...(byNote.get(t.note) ?? []), t.ms]);
    const slowest = [...byNote].map(([n, ms]) => ({ name: midiName(n), ms: ms.reduce((a, b) => a + b, 0) / ms.length }))
      .sort((a, b) => b.ms - a.ms).slice(0, 3);
    return {
      score: this.score,
      hits: this.hits,
      wrong: this.wrong,
      timeouts: this.timeouts,
      bestStreak: this.bestStreak,
      accuracy: tries ? Math.round((100 * this.hits) / tries) : 0,
      medianMs: found.length ? Math.round(found[Math.floor((found.length - 1) / 2)]) : 0,
      slowest,
    };
  }
}
