import { isBlack, isTieEnd, pitchToMidi, type Hand, type NoteToken } from './notes';

// Suggested fingering for a hand's line when the content gives none, like a teacher pencilling
// numbers in. A line that fits under the hand stays in one five-finger position. Anything else is
// a small search over the five fingers (dynamic programming): stretches, squeezes, the thumb
// passing under, reusing a finger on a new key, moving the hand and a thumb on a black key all
// cost something, and the cheapest way through wins. Everything is worked out for the right
// hand; the left hand is its mirror image. Checked against the hand-written fingering in
// content/ (tests/fingering.test.ts).

/**
 * Where each finger sits in a five-finger position, in semitones above the thumb. The middle
 * finger leans to a minor third, so C E G and A C E both take 1 3 5 (5 3 1 in the left hand).
 */
const FIT = [0, 2, 3.6, 5, 7];

interface State { fingers: number[]; anchor: number }

/** One finger number per note played (a chord takes the finger of its lowest note), as content writes them. */
export function suggestFingers(tokens: NoteToken[], hand: Hand): number[] {
  const events: { midi: number[]; rest: boolean }[] = [];
  let rest = false;
  tokens.forEach((t, i) => {
    if (!t.pitches.length) { rest = true; return; }
    if (isTieEnd(tokens, i)) return;
    events.push({ midi: t.pitches.map(pitchToMidi).sort((a, b) => a - b), rest });
    rest = false;
  });
  if (!events.length) return [];
  const fixed = position(events.map((e) => e.midi), hand);
  if (fixed) return events.map((e) => fixed.get(e.midi[0])!);
  // Mirror the left hand so its thumb is on the low side too: m -> -m.
  const side = hand === 'left' ? -1 : 1;
  const options = events.map((e) => statesFor(e.midi, side));
  // cost[i][s]: cheapest way to play events 0..i ending in state s.
  let cost = options[0].map((s) => startCost(s) + keyCost(s, events[0].midi));
  const back: number[][] = [options[0].map(() => -1)];
  for (let i = 1; i < events.length; i++) {
    const prev = options[i - 1];
    const next: number[] = [];
    const from: number[] = [];
    for (const s of options[i]) {
      let best = Infinity, arg = 0;
      prev.forEach((p, j) => {
        const c = cost[j] + move(p, events[i - 1].midi, s, events[i].midi, side, events[i].rest);
        if (c < best) { best = c; arg = j; }
      });
      next.push(best + keyCost(s, events[i].midi));
      from.push(arg);
    }
    cost = next;
    back.push(from);
  }
  let at = cost.indexOf(Math.min(...cost));
  const out: number[] = [];
  for (let i = events.length - 1; i >= 0; i--) {
    const s = options[i][at];
    out.push(s.fingers[0]); // the lowest note's finger
    at = back[i][at];
  }
  return out.reverse();
}

/**
 * A line that fits under one hand (five keys or fewer, no wider than a minor sixth, no chords)
 * stays in one five-finger position, lowest key on the thumb (right hand) or the fifth finger
 * (left hand), as beginners are taught. Returns each key's finger, or nothing.
 */
function position(events: number[][], hand: Hand): Map<number, number> | undefined {
  if (events.some((e) => e.length > 1)) return undefined;
  const keys = [...new Set(events.map((e) => e[0]))].sort((a, b) => a - b);
  if (keys.length > 5 || keys[keys.length - 1] - keys[0] > 8) return undefined;
  const side = hand === 'left' ? -1 : 1;
  let shape: number[] | undefined;
  if (keys.length === 1) shape = [side > 0 ? 1 : 5];
  else {
    const states = statesFor(keys, side, (fs) => (side > 0 ? fs[0] !== 1 : fs[fs.length - 1] !== 5) ? 1.5 : 0);
    shape = states[0]?.fingers;
  }
  if (!shape) return undefined;
  return new Map(keys.map((k, i) => [k, shape![i]]));
}

/**
 * Fingers for each note of a chord, low to high. `lowest` (the number content writes for a
 * chord) fixes the lowest note's finger when it fits.
 */
export function chordFingers(midi: number[], hand: Hand, lowest?: number): number[] {
  const sorted = [...midi].sort((a, b) => a - b);
  if (sorted.length === 1) return [lowest ?? 1];
  const side = hand === 'left' ? -1 : 1;
  const states = statesFor(sorted, side);
  return ((lowest !== undefined ? states.find((s) => s.fingers[0] === lowest) : undefined) ?? states[0]).fingers;
}

/**
 * Ways to play one event (a note or a chord), cheapest shape first. Fingers are listed low to
 * high in real pitch. A single note can take any finger; a chord takes its usual shape (thumb
 * and fifth finger on the outside, the middle by where the notes fall), plus that shape moved.
 */
function statesFor(midi: number[], side: number, extra: (fs: number[]) => number = (fs) => (fs[0] !== 1 ? 0.7 : 0)): State[] {
  // Thumb-side first: ascending in the mirrored hand.
  const m = midi.map((x) => x * side).sort((a, b) => a - b);
  if (m.length === 1) return [1, 2, 3, 4, 5].map((f) => ({ fingers: [f], anchor: m[0] - FIT[f - 1] }));
  if (m.length > 5) {
    // More keys than fingers (written for two hands in one line): spread the five over them.
    const fs = m.map((_, i) => 1 + Math.round((i * 4) / (m.length - 1)));
    return [{ fingers: side > 0 ? fs : [...fs].reverse(), anchor: m[0] }];
  }
  const span = m[m.length - 1] - m[0];
  const shapes: number[][] = [];
  // Every increasing choice of fingers, scored by how far each finger is from its spot.
  const choose = (k: number, from: number, acc: number[]) => {
    if (acc.length === k) { shapes.push(acc); return; }
    for (let f = from; f <= 5; f++) choose(k, f + 1, [...acc, f]);
  };
  choose(m.length, 1, []);
  const fit = (fs: number[]) => {
    const width = FIT[fs[fs.length - 1] - 1] - FIT[fs[0] - 1];
    // A chord is played with the hand opened to fit it: positions scale to the span.
    const scale = width ? span / width : 1;
    let c = Math.abs(span - width) * 0.6;
    fs.forEach((f, i) => { c += Math.abs((FIT[f - 1] - FIT[fs[0] - 1]) * scale - (m[i] - m[0])) * 0.5; });
    // A wide chord wants the thumb and fifth finger.
    if (span >= 7 && (fs[0] !== 1 || fs[fs.length - 1] !== 5)) c += 2;
    return c + extra(fs);
  };
  shapes.sort((a, b) => fit(a) - fit(b));
  return shapes.slice(0, 4).map((fs) => {
    const anchor = fs.reduce((a, f, i) => a + m[i] - FIT[f - 1], 0) / fs.length;
    // Back to real pitch order: the mirrored left hand reads its fingers high to low.
    return { fingers: side > 0 ? fs : [...fs].reverse(), anchor };
  });
}

/** The first event: a mild wish for the middle of the hand, so the line has room both ways. */
function startCost(s: State): number {
  return s.fingers.length === 1 ? [0.6, 0.2, 0, 0.3, 0.8][s.fingers[0] - 1] : 0;
}

/** A thumb (or fifth finger) on a black key is awkward among white keys. */
function keyCost(s: State, midi: number[]): number {
  if (s.fingers.length !== 1) return 0;
  const f = s.fingers[0];
  return isBlack(midi[0]) ? (f === 1 ? 2 : f === 5 ? 0.5 : 0) : 0;
}

// Comfortable and possible spans between two fingers of the right hand going up, in semitones
// (after Parncutt et al., 1997): [practical min, comfortable min, relaxed min, relaxed max,
// comfortable max, practical max]. Negative = the thumb passes under (or a finger over it).
const SPANS: Record<string, number[]> = {
  '12': [-5, -3, 1, 5, 8, 10], '13': [-4, -2, 3, 7, 10, 12], '14': [-3, -1, 5, 9, 12, 14], '15': [-1, 1, 7, 10, 13, 15],
  '23': [1, 1, 1, 2, 3, 5], '24': [1, 1, 3, 4, 5, 7], '25': [2, 2, 5, 6, 8, 10],
  '34': [1, 1, 1, 2, 2, 4], '35': [1, 1, 3, 4, 5, 7], '45': [1, 1, 1, 2, 3, 5],
};

/** Cost of one finger then another, `d` semitones up the (mirrored) hand. */
function pairCost(fa: number, fb: number, d: number): number {
  if (fa === fb) return d === 0 ? 0 : 6 + Math.abs(d) * 0.5;
  const [lo, hi, up] = fa < fb ? [fa, fb, d] : [fb, fa, -d];
  const [pMin, cMin, rMin, rMax, cMax, pMax] = SPANS[`${lo}${hi}`];
  const thumb = lo === 1;
  let c = 0;
  // Out of reach, then a stretch (or squeeze), then just off the hand's resting shape.
  if (up < pMin || up > pMax) c += 10 + Math.max(pMin - up, up - pMax) * 2;
  c += Math.max(0, cMin - up, up - cMax) * 2;
  c += Math.max(0, Math.min(rMin - up, rMin - cMin), Math.min(up - rMax, cMax - rMax)) * (thumb ? 0.5 : 0.8);
  // The thumb passing under a finger, or a finger over the thumb.
  if (thumb && up < 1) c += 2.5;
  // Fingers 3 and 4 next to each other are the least free.
  if (lo === 3 && hi === 4) c += 1;
  return c;
}

/** Cost of going from one event to the next. */
function move(a: State, am: number[], b: State, bm: number[], side: number, rest: boolean): number {
  // After a rest the hand has time to move.
  const calm = rest ? 0.3 : 1;
  if (a.fingers.length === 1 && b.fingers.length === 1) {
    const fb = b.fingers[0];
    // Staying in one hand position is easiest, so a moving hand costs a little on top.
    return (pairCost(a.fingers[0], fb, (bm[0] - am[0]) * side) + Math.abs(b.anchor - a.anchor) * 0.3) * calm + (fb >= 4 ? 0.5 : 0);
  }
  // A chord on either side: what counts is how far the hand moves.
  const shift = Math.abs(b.anchor - a.anchor);
  return (shift <= 1 ? shift * 0.4 : 1 + shift * 0.35) * calm;
}
