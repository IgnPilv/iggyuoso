# Content format

All lessons and exercises are YAML data. The app reads them; no code lives here.

```
content/
  units/NN-<unit-id>.yaml      # id, title, summary, ordered list of lesson ids
  lessons/NN-<lesson-id>.yaml  # id, title, unit, skills, steps, recap
  exercises/<exercise-id>.yaml # one exercise; file name = id
```

## Lesson
`steps` is an ordered list; each step is either `explain:` (short Markdown text, written for a
complete beginner, as if to a child) or `exercise: <exercise-id>`. Exercises can be reused by
several lessons.

## Exercise kinds
- `find`: untimed. Press keys matching `targets`. A target is one of
  `{ blackGroup: 2|3 }`, `{ pitchClass: C }`, `{ region: low|high }`.
  `coverAll: true` = find every match on the calibrated keyboard; `order: random` = ask targets in
  random order.
- `sequence`: untimed. Play `notes` in order. Optional `fingers` (one per note), `position`
  (keys to light as the hand position).
- `timed`: notes with durations against a metronome; scored per hand. Fields: `tempo` (bpm),
  `meter`, `countIn` (bars), `right` / `left` note strings, optional `fingers`,
  `pitchMatch: pitchClass` (any octave counts).

Common fields: `hand` (`right`, `left`, `alternating`, later `together`), `display`
(`keys` = light keys on the keyboard, `staff` = notation; with `clef: treble|bass`), `prompt`.

## Note strings
`<Note><octave>:<duration>` separated by spaces, bars separated by `|`. C4 is middle C.
Durations: `w` whole (4), `h` half (2), `q` quarter (1), `e` eighth (0.5). Rest: `r:q`.
Each bar must add up to the meter; in a two-hand exercise both hands have the same bar count.
Note names are mapped to the player's real keys through calibration, never to fixed MIDI numbers.
