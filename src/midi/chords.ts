// Near-simultaneous note-ons count as one chord hit, timed from the first note.

export const CHORD_WINDOW_MS = 60;

export interface TimedHit {
  midi: number;
  on: number;
  off?: number;
}

/** Returns copies with each note's `on` moved to the start of its chord cluster. */
export function groupChords<T extends TimedHit>(notes: readonly T[], windowMs = CHORD_WINDOW_MS): T[] {
  const sorted = [...notes].sort((a, b) => a.on - b.on);
  let clusterStart = -Infinity;
  return sorted.map((n) => {
    if (n.on - clusterStart > windowMs) clusterStart = n.on;
    return { ...n, on: clusterStart };
  });
}
