import type { ImproviseExercise, ImproviseRule } from '../content/types';
import { pitchClass } from '../music/notes';
import type { CapturedNote } from '../music/transcribe';
import { chordNotes } from '../music/theory';
import { hitWindowMs } from '../scoring/timed';
import { stars } from '../scoring/stars';

// Judging an improvisation. The player chose the notes; the rules check the musical choices
// (staying in the scale, chord notes on strong beats, ending at home, answering a question,
// repeating or moving a motif, steps and leaps, leaving space, keeping a rhythm). Each rule is
// worth a value from 0 to 1 and the score is their average; a take is clean (92+) only when
// every check holds. Times are song ms from the first downbeat of the player's bars.

export interface Check {
  rule: ImproviseRule['rule'];
  /** 0 to 1. */
  value: number;
  ok: boolean;
  /** What it looked for, in a few words ("Notes from C major pentatonic"). */
  label: string;
  /** What happened, said to the player. */
  message: string;
}

export interface ImproviseResult {
  score: number;
  stars: 0 | 1 | 2 | 3;
  checks: Check[];
  /** Melody notes in the player's bars (lowest-first chords reduced to their top note). */
  melody: { midi: number; beat: number }[];
}

const CHORD_MS = 60;
const PC = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

/** Onsets of one part as events: notes within 60 ms are one (the top note is the tune). */
function eventsOf(notes: CapturedNote[], beatMs: number) {
  const sorted = [...notes].sort((a, b) => a.on - b.on);
  const out: { midi: number; beat: number; on: number; off: number }[] = [];
  for (const n of sorted) {
    const last = out[out.length - 1];
    if (last && n.on - last.on < CHORD_MS) {
      if (n.midi > last.midi) last.midi = n.midi;
      last.off = Math.max(last.off, n.off ?? n.on);
      continue;
    }
    out.push({ midi: n.midi, beat: n.on / beatMs, on: n.on, off: n.off ?? n.on + beatMs / 2 });
  }
  return out;
}

/** Strong beats of a bar, in quarter beats: 1 and 3 in 4/4, the two dotted beats in 6/8, else beat 1. */
function strongBeats(quarters: number, pulse: number): number[] {
  if (pulse !== 1) return [0, ...(quarters / pulse > 2 ? [] : [pulse])];
  return quarters === 4 ? [0, 2] : [0];
}

type Ev = ReturnType<typeof eventsOf>[number];

/** How alike two groups of notes are: same rhythm inside the bars and the same moves (0 to 1). */
function likeness(a: Ev[], b: Ev[], offset: number): { value: number; shift: number } {
  if (!a.length || !b.length) return { value: 0, shift: 0 };
  let matched = 0;
  const used = new Set<number>();
  for (const x of a) {
    const j = b.findIndex((y, k) => !used.has(k) && Math.abs(y.beat - offset - x.beat) <= 0.3);
    if (j >= 0) { used.add(j); matched++; }
  }
  const rhythm = matched / Math.max(a.length, b.length);
  const moves = (g: Ev[]) => g.slice(1).map((e, i) => e.midi - g[i].midi);
  const ma = moves(a);
  const mb = moves(b);
  const n = Math.min(ma.length, mb.length);
  let same = 0;
  for (let i = 0; i < n; i++) if (Math.sign(ma[i]) === Math.sign(mb[i]) && Math.abs(ma[i] - mb[i]) <= 1) same++;
  const shape = Math.max(ma.length, mb.length) ? same / Math.max(ma.length, mb.length) : 1;
  return { value: (rhythm + shape) / 2, shift: b[0].midi - a[0].midi };
}

export function judgeImprovisation(ex: ImproviseExercise, notes: CapturedNote[], beatMs: number): ImproviseResult {
  const { quarters, pulse } = ex.meter;
  const total = ex.bars * quarters;
  const inTake = notes.filter((n) => n.on >= -beatMs / 4 && n.on / beatMs < total);
  const together = ex.hand === 'together';
  const melodyNotes = together ? inTake.filter((n) => n.midi >= 60) : inTake;
  const bassNotes = together ? inTake.filter((n) => n.midi < 60) : [];
  const mel = eventsOf(melodyNotes, beatMs);
  const barOf = (beat: number) => Math.max(0, Math.min(ex.bars - 1, Math.floor(beat / quarters + 1e-6)));
  const chordAt = (bar: number) => ex.chords?.[bar % ex.chords.length];
  const tonicName = PC[ex.tonic];
  const checks: Check[] = [];
  const add = (rule: Check['rule'], value: number, okAt: number, label: string, good: string, bad: string) => {
    const v = Math.max(0, Math.min(1, value));
    const ok = v >= okAt - 1e-9;
    checks.push({ rule, value: ok ? 1 : v, ok, label, message: ok ? good : bad });
  };

  for (const r of ex.rules) {
    switch (r.rule) {
      case 'fill': {
        const played = new Set(mel.map((e) => barOf(e.beat)));
        const empty = ex.bars - played.size;
        add('fill', played.size / ex.bars, 1, 'Play in every bar',
          'You kept going through every bar.',
          mel.length ? `${empty} ${empty === 1 ? 'bar was' : 'bars were'} empty. Keep something going, even one long note.` : 'Nothing was played in your bars.');
        break;
      }
      case 'inScale': {
        const pcs = new Set(ex.scale!.pcs);
        const out = melodyNotes.filter((n) => !pcs.has(pitchClass(n.midi)));
        const share = melodyNotes.length ? 1 - out.length / melodyNotes.length : 0;
        const names = [...new Set(out.map((n) => PC[pitchClass(n.midi)]))].slice(0, 3).join(', ');
        add('inScale', share, 0.9, `Notes from ${ex.scale!.name}`,
          `Every note came from ${ex.scale!.name}.`,
          `${out.length} ${out.length === 1 ? 'note was' : 'notes were'} outside ${ex.scale!.name} (${names}). The lit keys are the ones to use.`);
        break;
      }
      case 'chordTones': {
        const strong = strongBeats(quarters, pulse);
        const onStrong = mel.filter((e) => strong.some((s) => Math.abs((e.beat % quarters) - s) <= 0.25));
        const fit = onStrong.filter((e) => {
          const sym = chordAt(barOf(e.beat));
          return !sym || chordNotes(sym).some((m) => pitchClass(m) === pitchClass(e.midi));
        });
        add('chordTones', onStrong.length ? fit.length / onStrong.length : 0, 0.75, 'Chord notes on the strong beats',
          'Your strong beats sat on the chord: the tune and the harmony agree.',
          onStrong.length
            ? `${onStrong.length - fit.length} of ${onStrong.length} strong-beat notes clashed with the chord. On beat 1, pick a note of the chord shown for that bar.`
            : 'Put notes on the strong beats (beat 1 of each bar) so the tune leans on the chords.');
        break;
      }
      case 'startOn': case 'endOn': {
        const e = r.rule === 'startOn' ? mel[0] : mel[mel.length - 1];
        const ok = !!e && pitchClass(e.midi) === r.pc;
        const where = r.rule === 'startOn' ? 'Start' : 'End';
        add(r.rule, ok ? 1 : 0, 1, `${where} on ${r.name}`,
          r.rule === 'endOn' ? `You ended on ${r.name}: it sounds finished.` : `You started on ${r.name}.`,
          e ? `${where === 'Start' ? 'The first' : 'The last'} note was ${PC[pitchClass(e.midi)]}. ${where} on ${r.name}${r.rule === 'endOn' ? ' to sound finished' : ''}.` : `${where} on ${r.name}.`);
        break;
      }
      case 'questionAnswer': {
        const qBeat = r.split * quarters;
        const q = mel.filter((e) => e.beat < qBeat - 0.25);
        const a = mel.filter((e) => e.beat >= qBeat - 0.25);
        const qEnd = q[q.length - 1];
        const aEnd = a[a.length - 1];
        const asks = !!qEnd && pitchClass(qEnd.midi) !== ex.tonic;
        const answers = !!aEnd && pitchClass(aEnd.midi) === ex.tonic;
        const alike = likeness(q.slice(0, 3), a.slice(0, 3), qBeat).value >= 0.5;
        const parts = [asks, answers, alike];
        const tips = [
          !asks && (qEnd ? `the question ended on ${tonicName}, which sounds finished already; end it somewhere else (D, E or G)` : 'play a question first'),
          !answers && `the answer should come home to ${tonicName}`,
          !alike && 'begin the answer like the question (same rhythm, similar notes), so it sounds like a reply',
        ].filter(Boolean);
        add('questionAnswer', parts.filter(Boolean).length / 3, 1, 'A question, then its answer',
          'A real question and answer: the question hangs in the air, the answer starts the same way and comes home.',
          `Nearly: ${tips.join('; ')}.`);
        break;
      }
      case 'repeat': case 'sequence': case 'contrast': {
        const span = r.bars * quarters;
        const from = r.at * quarters;
        const first = mel.filter((e) => e.beat < span - 0.25);
        const second = mel.filter((e) => e.beat >= from - 0.25 && e.beat < from + span - 0.25);
        const { value, shift } = likeness(first, second, from);
        const where = r.at === r.bars ? 'The second time' : `Bar ${r.at + 1} on`;
        if (r.rule === 'repeat') {
          const exact = value >= 0.8 && shift === 0;
          add('repeat', exact ? 1 : value * (shift === 0 ? 1 : 0.7), 1, `Play your motif, then repeat it`,
            r.at === r.bars ? 'You repeated your motif: the listener remembers it now.' : 'The opening came back: the piece feels whole.',
            first.length ? `${where} sounded different. Repeat the same notes in the same rhythm.` : 'Start with a short motif in the first bar.');
        } else if (r.rule === 'sequence') {
          const moved = value >= 0.75 && shift !== 0;
          add('sequence', moved ? 1 : value * (shift === 0 ? 0.5 : 1), 1, 'The motif again, higher or lower',
            `A sequence: the same shape, moved ${shift > 0 ? 'up' : 'down'} ${Math.abs(shift)} ${Math.abs(shift) === 1 ? 'semitone' : 'semitones'}.`,
            shift === 0 && value >= 0.75 ? 'That was a repeat. For a sequence, start the copy on a different note (try one step higher).' : 'Keep the rhythm and the up-and-down shape of your motif, starting on a different note.');
        } else {
          // New means a different rhythm and shape, or a different register (6 semitones away on average).
          const mean = (g: Ev[]) => g.reduce((a, e) => a + e.midi, 0) / Math.max(1, g.length);
          const differ = Math.max(1 - value, Math.min(1, Math.abs(mean(second) - mean(first)) / 6));
          add('contrast', second.length ? differ : 0, 0.4, 'Something new in the middle',
            'The middle brought something new: a contrast makes the return feel like coming home.',
            second.length ? 'The middle sounded too much like the opening. Change the rhythm, the register or the direction.' : 'Play something in the middle section too.');
        }
        break;
      }
      case 'steps': {
        const moves = mel.slice(1).map((e, i) => Math.abs(e.midi - mel[i].midi));
        const steps = moves.filter((m) => m <= 2).length;
        const share = moves.length ? steps / moves.length : 0;
        add('steps', share / (r.percent / 100), 1, 'Mostly steps',
          'Mostly steps, with a few leaps: easy to sing.',
          `${Math.round(share * 100)}% of the moves were steps. Tunes people remember move mostly by step; save leaps for moments.`);
        break;
      }
      case 'rests': {
        const need = Math.max(1, Math.floor(ex.bars / 4));
        let gaps = 0;
        let soundingTo = 0;
        for (const e of mel) {
          if (e.beat - soundingTo >= r.beats - 0.25 && soundingTo > 0) gaps++;
          soundingTo = Math.max(soundingTo, e.off / beatMs);
        }
        add('rests', gaps / need, 1, 'Leave space between phrases',
          'You left space between phrases, like a singer breathing.',
          `Leave a gap of ${r.beats === 1 ? 'a beat' : `${r.beats} beats`} or more between phrases${need > 1 ? `, about every four bars` : ''}: the silence makes the next phrase speak.`);
        break;
      }
      case 'variety': {
        const distinct = new Set(melodyNotes.map((n) => n.midi)).size;
        add('variety', distinct / r.notes, 1, `At least ${r.notes} different notes`,
          `${distinct} different notes: plenty of colour.`,
          `Only ${distinct} different ${distinct === 1 ? 'note' : 'notes'}. Use at least ${r.notes}.`);
        break;
      }
      case 'range': {
        const inside = melodyNotes.filter((n) => n.midi >= r.low && n.midi <= r.high).length;
        add('range', melodyNotes.length ? inside / melodyNotes.length : 0, 0.9, 'Stay in the range',
          'Every note stayed in the range.', 'Some notes went outside the lit keys.');
        break;
      }
      case 'rhythm': {
        const win = hitWindowMs(60000 / beatMs) / beatMs;
        const expected: number[] = [];
        let b = 0;
        for (const t of ex.rhythm!) { if (t.pitches.length) expected.push(b); b += t.beats; }
        const used = new Set<number>();
        let hits = 0;
        for (const x of expected) {
          const j = mel.findIndex((e, k) => !used.has(k) && Math.abs(e.beat - x) <= win);
          if (j >= 0) { used.add(j); hits++; }
        }
        const extras = mel.length - used.size;
        add('rhythm', hits / (expected.length + 0.5 * extras), 0.9, 'Keep to the rhythm',
          'Right on the rhythm.',
          `${expected.length - hits} of ${expected.length} beats of the rhythm were missed${extras ? ` and ${extras} ${extras === 1 ? 'note was' : 'notes were'} extra` : ''}. Choose the notes, but keep the rhythm.`);
        break;
      }
      case 'bassRoots': {
        const win = hitWindowMs(60000 / beatMs) / beatMs;
        let good = 0;
        for (let bar = 0; bar < ex.bars; bar++) {
          const root = pitchClass(chordNotes(chordAt(bar)!)[0]);
          if (bassNotes.some((n) => Math.abs(n.on / beatMs - bar * quarters) <= win && pitchClass(n.midi) === root)) good++;
        }
        add('bassRoots', good / ex.bars, 1, 'Left hand: the root on beat 1',
          'Your left hand found every root: the harmony is clear.',
          `${ex.bars - good} ${ex.bars - good === 1 ? 'bar' : 'bars'} had no root in the left hand on beat 1. Play the chord's letter name, low.`);
        break;
      }
    }
  }
  let score = checks.length ? Math.round((100 * checks.reduce((a, c) => a + c.value, 0)) / checks.length) : 0;
  // A clean take needs every check to hold.
  if (checks.some((c) => !c.ok)) score = Math.min(score, 91);
  return { score, stars: stars(score), checks, melody: mel.map((e) => ({ midi: e.midi, beat: e.beat })) };
}
