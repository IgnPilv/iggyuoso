import { describe, expect, it } from 'vitest';
import { detectKey, events, numeral, placeOnGrid, playReport, unitOf, type PlayedNote } from '../src/modules/piano/engine/playReport';

/** A line of notes, each `steps` grid steps after the one before. */
function line(midis: number[], stepMs: number, steps: number[] = [], opts: { start?: number; shift?: (i: number) => number; velocity?: number } = {}): PlayedNote[] {
  let t = opts.start ?? 1000;
  return midis.map((midi, i) => {
    if (i > 0) t += stepMs * (steps[i - 1] ?? 1);
    const on = t + (opts.shift?.(i) ?? 0);
    return { midi, on, off: on + stepMs * 0.9, velocity: opts.velocity ?? 70 };
  });
}

const ODE = [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62];

describe('finding the beat', () => {
  it('finds the step among longer notes', () => {
    expect(unitOf([500, 500, 1000, 500, 500, 1000, 500])).toBeCloseTo(500, 0);
    expect(unitOf([250, 500, 250, 250, 500, 250, 1000])).toBeCloseTo(250, 0);
    expect(unitOf([400, 400])).toBeUndefined();
  });

  it('reads steady quarters at 90 a minute', () => {
    const r = playReport(line(ODE, 667))!;
    expect(r.bpm).toBe(90);
    expect(r.perBeat).toBe(1);
    expect(r.tempo.change).toBe('steady');
    expect(r.held).toHaveLength(0);
    expect(r.hurried).toHaveLength(0);
  });

  it('counts eighths two to a beat', () => {
    const r = playReport(line([...ODE, ...ODE], 300))!;
    expect(r.perBeat).toBe(2);
    expect(r.bpm).toBe(100);
  });

  it('places mixed note values on the grid', () => {
    const evs = events(line(ODE, 300, [1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1]));
    placeOnGrid(evs);
    expect(evs.map((e) => e.pos).slice(0, 5)).toEqual([0, 1, 2, 4, 5]);
  });
});

describe('held back and hurried', () => {
  it('reads a dotted rhythm as written, not as hurried', () => {
    // Ode to Joy: quarters, then a dotted quarter, an eighth and a half to end each phrase.
    const phrase = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 0.5];
    const r = playReport(line([...ODE, ...ODE], 600, [...phrase, 2, ...phrase]))!;
    expect(r.bpm).toBe(100);
    expect(r.hurried).toHaveLength(0);
    expect(r.held).toHaveLength(0);
    expect(r.events[14].pos).toBe(14);
  });

  it('names a hesitation and a rushed note', () => {
    // A 180 ms wait before note 6, a note 120 ms early at 11.
    const notes = line([...ODE, ...ODE], 400, [], { shift: (i) => (i >= 6 ? 180 : 0) + (i === 11 ? -120 : 0) });
    const r = playReport(notes)!;
    expect(r.held[0].midis).toEqual([64]);
    expect(r.held[0].devMs).toBeGreaterThan(150);
    expect(r.hurried.some((e) => e === r.events[11])).toBe(true);
  });

  it('sees a stop as a stop', () => {
    const notes = line([...ODE, ...ODE], 400, [], { shift: (i) => (i >= 10 ? 4000 : 0) });
    const r = playReport(notes)!;
    expect(r.stops).toHaveLength(1);
    expect(r.tips[0]).toMatch(/stopped once/);
  });

  it('notices speeding up', () => {
    let t = 0;
    const notes = [...ODE, ...ODE, ...ODE].map((midi, i) => { t += 700 - i * 6; return { midi, on: t, off: t + 300, velocity: 70 }; });
    const r = playReport(notes)!;
    expect(r.tempo.change).toBe('faster');
    expect(r.tempo.end).toBeGreaterThan(r.tempo.start + 8);
    expect(r.tips.join(' ')).toMatch(/sped up/);
  });
});

describe('hands, key and chords', () => {
  it('says which hand lands first', () => {
    const right = line(ODE, 500);
    const left = right.filter((_, i) => i % 2 === 0).map((n) => ({ ...n, midi: 48, on: n.on - 40, off: n.on + 400 }));
    const r = playReport([...right, ...left])!;
    expect(r.gapMs).toBe(40);
    expect(r.hands.left?.count).toBe(8);
    expect(r.tips.join(' ')).toMatch(/left hand lands about 40 ms first/);
  });

  it('finds the key', () => {
    expect(detectKey(line([60, 62, 64, 65, 67, 69, 71, 72, 67, 64, 60], 400))?.key).toBe('C');
    expect(detectKey(line([57, 59, 60, 62, 64, 65, 68, 69, 64, 60, 57], 400))?.key).toBe('Am');
    expect(detectKey(line([62, 64, 66, 67, 69, 71, 73, 74, 69, 66, 62], 400))?.key).toBe('D');
  });

  it('names chords and their numerals', () => {
    const chords = [[48, 52, 55], [53, 57, 48], [55, 59, 50], [48, 52, 55]];
    const notes: PlayedNote[] = [];
    chords.forEach((c, bar) => {
      for (const m of c) notes.push({ midi: m, on: 1000 + bar * 2000, off: 1000 + bar * 2000 + 1900, velocity: 60 });
      for (let b = 0; b < 4; b++) notes.push({ midi: [72, 69, 71, 72][bar] + (b % 2 ? 0 : -5), on: 1000 + bar * 2000 + b * 500, off: 1000 + bar * 2000 + b * 500 + 450, velocity: 80 });
    });
    const r = playReport(notes)!;
    expect(r.key?.key).toBe('C');
    expect(r.chords.map((c) => c.numeral)).toEqual(['I', 'IV', 'V', 'I']);
    expect(r.dynamics).toEqual({ from: 'mp', to: 'mf', right: 80, left: 60 });
  });

  it('writes Roman numerals', () => {
    expect(numeral('Am', 'C')).toBe('vi');
    expect(numeral('G7', 'C')).toBe('V7');
    expect(numeral('Bdim', 'C')).toBe('vii°');
    expect(numeral('E', 'Am')).toBe('V');
    expect(numeral('F♯m', 'D')).toBe('iii');
    expect(numeral('B♭', 'C')).toBe('♭VII');
  });
});
