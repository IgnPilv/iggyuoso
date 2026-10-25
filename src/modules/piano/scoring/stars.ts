export const STAR_THRESHOLDS = [65, 80, 92] as const;
/** Records only count at this fraction of the written tempo or faster. */
export const RECORD_TEMPO_FRACTION = 0.9;

export function stars(score: number): 0 | 1 | 2 | 3 {
  if (score >= STAR_THRESHOLDS[2]) return 3;
  if (score >= STAR_THRESHOLDS[1]) return 2;
  if (score >= STAR_THRESHOLDS[0]) return 1;
  return 0;
}

export const passed = (score: number) => score >= STAR_THRESHOLDS[0];
