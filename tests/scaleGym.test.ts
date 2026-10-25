import { describe, expect, it } from 'vitest';
import {
  FreeGym, freeTempo, freeTips, gymFingers, gymLine, gymPlan, gymReport, gymTips, isPass, lineDistance, recognise, replay, rootsFor, ScaleGym,
  splitHands, type Played,
} from '../src/modules/piano/engine/scaleGym';

const fingers = (root: string, kind: Parameters<typeof gymFingers>[1], hand: 'right' | 'left', octaves = 1) => {
  const line = gymLine(root, kind, octaves, 4);
  return gymFingers(root, kind, hand, line.slice(0, (line.length + 1) / 2)).join('');
};

describe('gymLine and fingering', () => {
  it('goes up and back down', () => {
    expect(gymLine('C', 'major', 1, 4)).toEqual([60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62, 60]);
    expect(gymLine('A', 'major arpeggio', 2, 3)).toEqual([57, 61, 64, 69, 73, 76, 81, 76, 73, 69, 64, 61, 57]);
  });

  it('uses textbook scale fingering', () => {
    expect(fingers('C', 'major', 'right')).toBe('12312345');
    expect(fingers('C', 'major', 'left')).toBe('54321321');
    expect(fingers('C', 'major', 'right', 2)).toBe('123123412312345');
    expect(fingers('F', 'major', 'right')).toBe('12341234');
    expect(fingers('Bb', 'major', 'right')).toBe('41231234');
    expect(fingers('Bb', 'major', 'left')).toBe('32143213');
    expect(fingers('B', 'major', 'left')).toBe('43214321');
    expect(fingers('Eb', 'major', 'right')).toBe('31234123');
    expect(fingers('Db', 'major', 'right')).toBe('23123412');
    expect(fingers('F#', 'major', 'left')).toBe('43213214');
    expect(fingers('A', 'harmonic minor', 'right')).toBe('12312345');
    expect(fingers('D', 'natural minor', 'left')).toBe('54321321');
  });

  it('fingers chromatic scales and arpeggios', () => {
    expect(fingers('C', 'chromatic', 'right')).toBe('1313123131312');
    expect(fingers('C', 'chromatic', 'left')).toBe('1313213131321');
    expect(fingers('C', 'major arpeggio', 'right')).toBe('1235');
    expect(fingers('C', 'major arpeggio', 'left', 2)).toBe('5421421');
  });

  it('offers minor keys on white keys only', () => {
    expect(rootsFor('major')).toHaveLength(12);
    expect(rootsFor('harmonic minor')).not.toContain('Bb');
  });

  it('finds the thumb passes in the direction of travel', () => {
    expect(isPass('right', true, 3, 1)).toBe(true);
    expect(isPass('right', true, 1, 2)).toBe(false);
    expect(isPass('right', false, 1, 3)).toBe(true);
    expect(isPass('left', true, 1, 3)).toBe(true);
    expect(isPass('left', false, 3, 1)).toBe(true);
    const plan = gymPlan({ root: 'C', kind: 'major', octaves: 1, hands: 'right' });
    expect(plan.filter((s) => s.keys.right!.pass).map((s) => s.step)).toEqual([3, 12]);
  });

  it('puts the left hand below the right, never on the same key', () => {
    const plan = gymPlan({ root: 'G', kind: 'major', octaves: 2, hands: 'together' });
    expect(plan[0].keys.right!.midi).toBe(67);
    expect(plan[0].keys.left!.midi).toBe(43);
    expect(plan.every((s) => s.keys.left!.midi < s.keys.right!.midi)).toBe(true);
  });
});

describe('ScaleGym', () => {
  const plan = gymPlan({ root: 'C', kind: 'major', octaves: 1, hands: 'right' });
  const make = () => new ScaleGym(plan, { tempo: 60, perBeat: 2, startAt: 0, latencyMs: 0 });

  it('starts after a bar and matches each key to its place', () => {
    const g = make();
    expect(g.t0).toBe(4000);
    expect(g.press(60, 4020)).toMatchObject({ step: 0, offsetMs: 20 });
    expect(g.press(62, 4480)).toMatchObject({ step: 1, offsetMs: -20 });
    // E4 is due at 5000; the way down plays it again at 10000.
    expect(g.press(64, 10030)).toMatchObject({ step: 12, offsetMs: 30 });
    expect(g.press(64, 5010)).toMatchObject({ step: 2 });
  });

  it('counts wrong keys and ignores the count-in', () => {
    const g = make();
    expect(g.press(61, 4500)).toBeUndefined();
    expect(g.press(60, 1000)).toBeUndefined();
    expect(g.wrong).toBe(1);
  });

  it('clicks every beat up to the last note', () => {
    const g = make();
    const clicks = g.clicks(-1, 100000);
    expect(clicks[0]).toEqual({ time: 0, accent: true });
    expect(clicks[clicks.length - 1].time).toBe(4000 + 7000);
  });

  it('reports a late thumb and a bumping thumb', () => {
    const g = make();
    for (const n of g.notes) g.press(n.midi, g.t0 + n.step * g.stepMs + (n.pass ? 60 : 0), n.finger === 1 ? 100 : 70);
    const r = gymReport(g);
    const right = r.hands[0];
    expect(right.missed).toBe(0);
    expect(right.passLean).toBe(60);
    expect(right.otherLean).toBe(0);
    expect(right.thumbLouder).toBe(30);
    expect(r.tips[0]).toMatch(/60 ms late where the thumb passes/);
    expect(r.tips[1]).toMatch(/thumb bumps/);
    expect(r.score).toBeLessThan(100);
  });

  it('scores an even run 100 and leaves velocity out when it never changes', () => {
    const g = make();
    for (const n of g.notes) g.press(n.midi, g.t0 + n.step * g.stepMs + 10);
    const r = gymReport(g);
    expect(r.score).toBe(100);
    expect(r.hands[0].velSpread).toBeUndefined();
    expect(r.tips[0]).toMatch(/Even and on the click/);
  });

  it('counts missed notes only up to where the run stopped', () => {
    const g = make();
    g.press(60, 4000);
    expect(gymReport(g, 1).hands[0].missed).toBe(1);
    expect(gymReport(g).hands[0].missed).toBe(14);
  });

  it('says which hand trails', () => {
    const tips = gymTips([
      { hand: 'right', played: 8, missed: 0, lean: 40, spread: 10, worst: [] },
      { hand: 'left', played: 8, missed: 0, lean: 0, spread: 10, worst: [] },
    ], 0);
    expect(tips[0]).toMatch(/right hand trails the left hand by 40 ms/);
  });
});

describe('free tempo', () => {
  const plan = gymPlan({ root: 'C', kind: 'major', octaves: 1, hands: 'right' });
  const play = (g: FreeGym, times: number[], skip = new Set<number>()) =>
    g.notes.forEach((n, i) => { if (!skip.has(i)) g.press(n.midi, times[i], 80); });

  it('starts on the first note and follows the run in order', () => {
    const g = new FreeGym(plan);
    expect(g.press(62, 0)).toBeUndefined(); // not the first note: ignored, not wrong
    expect(g.wrong).toBe(0);
    expect(g.press(60, 1000)?.step).toBe(0);
    expect(g.press(64, 1500)?.step).toBe(2); // D skipped
    expect(g.press(70, 1700)).toBeUndefined();
    expect(g.wrong).toBe(1);
    expect(g.upcoming()[0].midi).toBe(65);
  });

  it('finds the tempo and marks a held-back note and a hurried one', () => {
    const g = new FreeGym(plan);
    const times = g.notes.map((n) => n.step * 300);
    times[3] += 90; // held back before the thumb on F
    for (let i = 4; i < times.length; i++) times[i] += 90;
    times[10] -= 80; // rushed into G on the way down
    for (let i = 11; i < times.length; i++) times[i] -= 80;
    play(g, times);
    expect(g.done).toBe(true);
    const t = freeTempo(g, 2)!;
    expect(t.stepMs).toBe(300);
    expect(t.bpm).toBe(100);
    expect(g.notes[3].offsetMs).toBe(90);
    expect(g.notes[10].offsetMs).toBe(-80);
    expect(g.notes[5].offsetMs).toBe(0);
    const r = gymReport(g, Infinity, t);
    expect(r.hands[0].passLean).toBeGreaterThan(30);
    expect(r.tips.join(' ')).toMatch(/hesitates .* longer where the thumb passes/);
  });

  it('notices speeding up on the way down', () => {
    const g = new FreeGym(plan);
    let t = 0;
    play(g, g.notes.map((n) => (t += n.step === 0 ? 0 : n.step <= 7 ? 400 : 300)));
    const ft = freeTempo(g, 1)!;
    expect(ft.upBpm).toBe(150);
    expect(ft.downBpm).toBe(200);
    expect(freeTips(ft)[0]).toMatch(/sped up on the way down/);
  });

  it('measures the gap between the hands', () => {
    const both = gymPlan({ root: 'C', kind: 'major', octaves: 1, hands: 'together' });
    const g = new FreeGym(both);
    for (const n of g.notes) g.press(n.midi, n.step * 300 + (n.hand === 'right' ? 40 : 0));
    expect(freeTempo(g, 2)!.gapMs).toBe(40);
  });
});

describe('recognising the scale', () => {
  const run = (midis: number[], gap = 250, from = 0): Played[] => midis.map((m, i) => ({ midi: m, time: from + i * gap, velocity: 80 }));
  const both = (right: number[], left: number[]): Played[] =>
    right.flatMap((m, i) => [{ midi: left[i], time: i * 300, velocity: 80 }, { midi: m, time: i * 300 + 15, velocity: 80 }]);

  it('names a one-hand scale and its octave', () => {
    const r = recognise(run(gymLine('G', 'major', 1, 2)))!;
    expect(r.setup).toEqual({ root: 'G', kind: 'major', octaves: 1, hands: 'left' });
    expect(r.plan[0].keys.left!.midi).toBe(43);
    const d = recognise(run(gymLine('D', 'harmonic minor', 2, 4)))!;
    expect(d.setup).toMatchObject({ root: 'D', kind: 'harmonic minor', octaves: 2, hands: 'right' });
    expect(d.plan[0].keys.right!.midi).toBe(62);
  });

  it('tells natural from harmonic minor, arpeggios and chromatic', () => {
    expect(recognise(run(gymLine('A', 'natural minor', 1, 4)))!.setup.kind).toBe('natural minor');
    expect(recognise(run(gymLine('F', 'minor arpeggio', 2, 4)))!.setup.kind).toBe('minor arpeggio');
    expect(recognise(run(gymLine('E', 'chromatic', 1, 4)))!.setup.kind).toBe('chromatic');
    expect(recognise(run(gymLine('Bb', 'major', 1, 4)))!.setup.root).toBe('Bb');
  });

  it('forgives a slip or two', () => {
    const line = gymLine('C', 'major', 1, 4);
    line.splice(4, 1); // G left out
    line[9] = 66; // F♯ for F on the way down
    expect(recognise(run(line))!.setup).toMatchObject({ root: 'C', kind: 'major' });
  });

  it('hears two hands together, the left an octave lower', () => {
    const r = recognise(both(gymLine('C', 'major', 1, 4), gymLine('C', 'major', 1, 3)))!;
    expect(r.setup.hands).toBe('together');
    expect(r.plan[0].keys.left!.midi).toBe(48);
    expect(splitHands(both([60, 62, 64], [48, 50, 52]).concat(run([65, 67, 69], 300, 900))).hands).toBe('together');
  });

  it('gives up on something that is not a scale', () => {
    expect(recognise(run([60, 67, 61, 70, 58, 72, 63, 66]))).toBeUndefined();
    expect(recognise(run([60, 62]))).toBeUndefined();
  });

  it('replays the run on the scale it found', () => {
    const presses = run(gymLine('F', 'major', 1, 4), 300);
    const r = recognise(presses)!;
    const g = replay(r.plan, presses);
    expect(g.done).toBe(true);
    expect(freeTempo(g, 2)!.stepMs).toBe(300);
  });

  it('measures how many changes turn one line into another', () => {
    expect(lineDistance([1, 2, 3], [1, 2, 3])).toBe(0);
    expect(lineDistance([1, 3], [1, 2, 3])).toBe(1);
    expect(lineDistance([1, 9, 3], [1, 2, 3])).toBe(1);
  });
});
