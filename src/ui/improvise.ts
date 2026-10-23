import { audio, click, piano, stopAll } from '../audio/audio';
import { keyWindow, toDevice, type Calibration } from '../calibration';
import type { ImproviseExercise } from '../content/types';
import { demo } from '../demo/demo';
import { judgeImprovisation } from '../engine/improvise';
import type { Recorder } from '../engine/recorder';
import { pitchClass, pitchToMidi, type NoteToken } from '../music/notes';
import { transcribe } from '../music/transcribe';
import { saveSketch } from '../progress/sketches';
import { h } from './dom';
import { KeyboardView } from './keyboard';
import { header, record, showHeld, starText, type OnDone } from './players';
import { playBack, recordButton, startTake, type BackingNote } from './recordPanel';
import { sketchStaff, sketchStore } from './sketchbookView';
import { renderStaff } from './staff';

// Improvising (`kind: improvise`): the frame (notes to use, the chords, a phrase to answer, a
// rhythm) is shown and played; the player makes the notes up, and the take is checked for its
// musical choices (src/engine/improvise.ts). The take is written on the staff and can be kept in
// the Sketchbook. There is nothing written to fall, so there is no falling-notes view.

/** Note strings as notes on a timeline (ties joined), from `offset` quarter beats. */
export function tokenNotes(tokens: NoteToken[], offset = 0): BackingNote[] {
  const out: BackingNote[] = [];
  let beat = offset;
  let held: BackingNote[] = [];
  for (const t of tokens) {
    if (held.length) held.forEach((n) => { n.beats += t.beats; });
    else if (t.pitches.length) { held = t.pitches.map((p) => ({ midi: pitchToMidi(p), beat, beats: t.beats })); out.push(...held); }
    if (!t.tie) held = [];
    beat += t.beats;
  }
  return out;
}

const RULE_ICON = (ok: boolean) => (ok ? '✓' : '✗');

export function improvisePlayer(root: HTMLElement, ex: ImproviseExercise, cal: Calibration, onDone: OnDone) {
  const quarters = ex.meter.quarters;
  const callBars = ex.call ? Math.round(ex.call.reduce((a, t) => a + t.beats, 0) / quarters) : 0;
  const callNotes = ex.call ? tokenNotes(ex.call) : [];
  const backing = ex.backing ? tokenNotes(ex.backing, callBars * quarters) : [];
  // Keys to choose from: the scale's notes from C3 to C6 (a hand together part reaches lower).
  const low = ex.hand === 'together' ? 36 : 48;
  const [lo, hi] = keyWindow(cal, [toDevice(cal, low), toDevice(cal, 84)]);
  const kb = new KeyboardView(lo, hi, { middleC: cal.middleC, cal, labels: 'c' });
  const offHeld = showHeld(kb);
  if (ex.scale) for (let d = lo; d <= hi; d++) if (ex.scale.pcs.includes(pitchClass(d - cal.offset))) kb.set(d, 'option', true);

  // The chord chart: one box per bar (the call's bars first), lit while it is played.
  const cells: HTMLElement[] = [];
  for (let b = 0; b < callBars + ex.bars; b++) {
    const mine = b >= callBars;
    const chord = mine ? ex.chords?.[(b - callBars) % ex.chords.length] : undefined;
    cells.push(h('span', { class: `bar-cell${mine ? '' : ' call'}` }, mine ? (chord ?? '·').replace('b', '♭') : 'listen'));
  }
  const chart = h('div', { class: 'chord-chart', 'aria-label': 'bars' }, ...cells);
  const lightBar = (b: number) => cells.forEach((c, i) => c.classList.toggle('now', i === b));

  const rules = h('ul', { class: 'improv-rules' }, ...ex.rules.map((r) => h('li', {}, labelOf(r))));
  const frame = h('div', { class: 'improv-frame' },
    ex.scale ? h('p', { class: 'small' }, h('strong', {}, 'Notes: '), ex.scale.name, ' (lit keys)') : '',
    chart,
    ex.rhythm ? h('div', { class: 'staff-wrap' }, renderStaff([{ clef: 'treble', notes: ex.rhythm.map((t, i) => ({ pitches: t.pitches, beats: t.beats, value: t.value, dotted: t.dotted, triplet: t.triplet, key: String(i) })) }], { barQuarters: quarters }).svg) : '',
    h('p', { class: 'small' }, h('strong', {}, 'A good take: '), 'the app listens for these.'),
    rules,
  );

  const listenBtn = h('button', { class: 'secondary' }, ex.example ? 'Hear an example' : ex.call || backing.length ? 'Listen' : 'Hear the click');
  const playBtn = recordButton('Play');
  const stopBtn = h('button', { class: 'secondary', disabled: true }, 'Stop');
  const status = h('span', { class: 'small rec-status', 'aria-live': 'polite' });
  const result = h('div');
  let run: ReturnType<typeof startTake> | undefined;
  let stopListen: (() => void) | undefined;
  const beatMs = 60000 / (ex.tempo * ex.meter.pulse);

  listenBtn.onclick = () => {
    stopListen?.();
    run?.stop();
    audio();
    const t0 = performance.now() + 400;
    const all = [...callNotes, ...backing, ...(ex.example ? tokenNotes(ex.example, callBars * quarters) : [])];
    for (const n of all) piano(n.midi, t0 + n.beat * beatMs, n.beats * beatMs * 0.95, 0.5);
    const total = (callBars + ex.bars) * quarters;
    if (ex.click !== 'off') for (let b = 0; b < total; b += ex.meter.pulse) click(t0 + b * beatMs, Math.abs(b / quarters - Math.round(b / quarters)) < 1e-6);
    const timers = Array.from({ length: callBars + ex.bars }, (_, b) => window.setTimeout(() => lightBar(b), t0 + b * quarters * beatMs - performance.now()));
    timers.push(window.setTimeout(() => lightBar(-1), t0 + total * beatMs - performance.now()));
    stopListen = () => { timers.forEach(clearTimeout); stopAll(); lightBar(-1); };
  };

  playBtn.onclick = () => {
    stopListen?.();
    result.replaceChildren();
    playBtn.disabled = true;
    listenBtn.disabled = true;
    stopBtn.disabled = false;
    run = startTake(cal, {
      tempo: ex.tempo, meter: ex.meter, click: ex.click ?? 'on', countInBars: Math.max(1, ex.countIn), maxBars: callBars + ex.bars,
      backing: [...callNotes, ...backing],
      barText: (bar) => {
        lightBar(bar);
        return bar < callBars ? 'Listen to the question…' : `Your turn · bar ${bar - callBars + 1} of ${ex.bars}`;
      },
    }, status, (rec) => {
      run = undefined;
      playBtn.disabled = false;
      listenBtn.disabled = false;
      stopBtn.disabled = true;
      lightBar(-1);
      showResult(rec);
    }, (rec) => demo.onRecord?.(rec));
  };
  stopBtn.onclick = () => run?.stop();

  function showResult(rec: Recorder) {
    const shift = callBars * quarters * rec.beatMs;
    const notes = rec.take().map((n) => ({ ...n, on: n.on - shift, off: n.off === undefined ? undefined : n.off - shift })).filter((n) => n.on >= -rec.beatMs / 2);
    const r = judgeImprovisation(ex, notes, rec.beatMs);
    const key = ex.key ?? 'C';
    const w = transcribe(notes, { beatMs: rec.beatMs, meter: ex.meter, key, trimStart: false });
    const draft = { right: w.right, left: w.left, tempo: ex.tempo, meter: `${ex.meter.beats}/${ex.meter.unit}`, key, title: ex.title ?? 'Improvisation', id: 'take' };
    const keep = h('button', { class: 'secondary', disabled: !w.bars }, 'Keep in Sketchbook');
    keep.onclick = () => {
      const s = saveSketch(sketchStore(), { ...draft, title: `${ex.title ?? 'Improvisation'} (${new Date().toLocaleDateString()})`, grid: 0.5, notes, bars: w.bars, from: ex.id });
      keep.replaceWith(h('span', { class: 'small' }, 'Kept. ', h('a', { href: `#/sketchbook/${s.id}` }, 'Open it in the Sketchbook')));
    };
    let stopPlay: (() => void) | undefined;
    const hear = h('button', { class: 'secondary', disabled: !notes.length, onclick: () => { stopPlay?.(); stopPlay = playBack(notes); } }, 'Hear your take');
    result.replaceChildren(h('div', { class: 'result' },
      h('div', { class: 'score' }, h('span', { class: 'stars' }, starText(r.stars)), ` ${r.score}`),
      h('ul', { class: 'improv-checks' }, ...r.checks.map((c) => h('li', { class: c.ok ? 'ok' : 'miss' }, h('span', { class: 'mark', 'aria-hidden': 'true' }, RULE_ICON(c.ok)), ' ', c.message))),
      w.bars ? sketchStaff(draft) : '',
      record(ex, r.score, r.stars, ex.tempo),
      h('div', { class: 'controls' }, h('button', { onclick: () => playBtn.click() }, 'Try again'), hear, keep),
    ));
    onDone({ score: r.score, stars: r.stars });
  }

  root.append(
    header(ex, 'Make up your own music inside the frame below.'),
    frame,
    h('div', { class: 'controls transport' }, listenBtn, playBtn, stopBtn, status),
    h('div', { class: 'stage' }, kb.el),
    result,
  );
  return () => { run?.stop(); stopListen?.(); offHeld(); };
}

function labelOf(r: ImproviseExercise['rules'][number]): string {
  switch (r.rule) {
    case 'inScale': return 'Notes from the scale';
    case 'chordTones': return 'Chord notes on the strong beats';
    case 'startOn': return `Start on ${r.name}`;
    case 'endOn': return `End on ${r.name}`;
    case 'questionAnswer': return `Bars 1–${r.split} ask a question; the rest answer it and come home`;
    case 'repeat': return r.at === r.bars ? `A motif in ${r.bars === 1 ? 'bar 1' : `bars 1–${r.bars}`}, then the same again` : `Bars ${r.at + 1}–${r.at + r.bars} bring back bars 1–${r.bars}`;
    case 'sequence': return `A motif, then the same shape starting on another note`;
    case 'contrast': return `Bars ${r.at + 1}–${r.at + r.bars}: something different from the opening`;
    case 'steps': return `Mostly steps (${r.percent}% or more)`;
    case 'rests': return `Leave space between phrases`;
    case 'variety': return `At least ${r.notes} different notes`;
    case 'range': return 'Stay in the range';
    case 'rhythm': return 'Keep the rhythm shown';
    case 'bassRoots': return 'Left hand: the chord root on beat 1';
    default: return 'Keep playing through every bar';
  }
}
