# Scoring: how a take becomes a number and a tip

*All scorers live in `src/modules/piano/scoring/` and `engine/`, have no screen code, and are
covered by tests in `tests/`. The numbers below are the ones in the code; if you change one,
change it here and in CLAUDE.md's decision log.*

## Stars and clean takes (every kind)

Every score is 0 to 100 (`scoring/stars.ts`):

| Score | Means |
| --- | --- |
| 65+ | ★ passed |
| 80+ | ★★ |
| 92+ | ★★★, a **clean take** |

A take only **counts** (records, clean takes, mastery) at 90% of the written tempo or faster;
slower practice is free. An exercise is done after `reps` clean takes (default 3) on at least
`days` different days (default 1), see [progress.md](progress.md).

## Timed exercises (`scoring/timed.ts`)

The heart of the app. Inputs: the notes expected (each with hand, pitch, beat, length) and the
notes played (pitch, time on, time off, strength), both in ms from the first downbeat with latency
already taken off.

1. **Hits.** Each expected note is paired with the closest press of the same pitch inside the hit
   window: 45% of a beat, at least 150 ms and at most 350 ms. Closest pairs are matched first, so
   one press never counts twice.
2. **Points for timing.** Within 50 ms: full marks. Further off, the mark falls smoothly to half
   at the edge of the window.
3. **Wrong notes.** A leftover press near a note nobody hit is that note, played wrong.
4. **Extras.** Any other leftover press costs half a note.
5. **Short holds.** A note of a half or longer released before 75% of its length keeps only 70%.
6. **Score** = points ÷ number of notes, per hand and for the whole take.

Then the **habits**, per hand: missed, wrong, extra, early or late on average (40 ms or more),
rushing or dragging (drifting 80 ms over the take), uneven (spread of 70 ms or more), short holds.
"Hands together" is the average gap between the hands on shared beats (flagged at 50 ms). The
feedback names the weaker hand and each habit that slipped (`feedbackFor`).

`pitchMatch` changes what counts as "the same pitch": `exact`, `pitchClass` (any octave), `any`
(rhythm taps) or `side` (two-hand taps: any key from middle C up is the right hand).

### Pedal and dynamics on top

- **Pedal** (`scoring/pedal.ts`), when the exercise has a pedal line: each stretch is worth half a
  point for pressing at the right moment (at a change: up as the chord sounds, then down again)
  and half for holding it and lifting in time. The take = 75% notes, 25% pedal.
- **Dynamics** (`scoring/dynamics.ts`), when the exercise has loud and soft marks: judged
  relatively, because keyboards differ. A change of mark must be heard as a change of the middle
  key strength, and a crescendo must grow through its bars. A fifth of the take. If every key had
  the same strength (the computer keyboard), dynamics are not scored, and the result says so.

## Untimed exercises (`scoring/untimed.ts`)

`find` and `sequence` count right and wrong presses: score = right ÷ (right + wrong). In `find`
with "find them all", any order is accepted.

## Ear, quiz and build (`engine/drills.ts`)

- The first answer to each question counts. Missed questions come back more often (weight +2),
  clean ones less (−0.5), and never the same question twice running.
- `build` (play a chord, interval or scale) scores clean first tries; "Show me" spoils the try.
- Checkpoints use `feedback: none`: answers are only noted, and the result lists what was missed.

## Generated drills (`scoring/goal.ts`)

A generated drill has a goal: an accuracy (default 90%) and, for questions, a middle answer time
(default 2.5 s). Reaching the accuracy scores 92 (clean); answering slower than the time keeps
the take at 91 at most.

## Improvising (`engine/improvise.ts`)

The player chose the notes, so there is no right note to compare with. Instead each rule of the
exercise (stay in the scale, chord notes on strong beats, end on home, answer the question, repeat
the motif, leave space, ...) is worth 0 to 1, the score is their average, and a take is clean only
when every rule holds.
