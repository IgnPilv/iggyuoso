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
  `meter`, `countIn` (bars), `right` / `left` note strings, optional `fingers` (one-hand
  exercises) or `rightFingers` / `leftFingers` (both hands; one number per note or chord),
  `pitchMatch: pitchClass` (any octave counts). Shown as falling notes; `display: staff` starts on
  sheet music instead (the player can switch).

Common fields: `hand` (`right`, `left`, `alternating`, later `together`), `display`
(`keys` = light keys on the keyboard, `staff` = notation; with `clef: treble|bass`), `prompt`.

## Note strings
`<Note><octave>:<duration>` separated by spaces, bars separated by `|`. C4 is middle C.
Durations: `w` whole (4), `h` half (2), `q` quarter (1), `e` eighth (0.5); a dot adds half
(`h.` = 3). Rest: `r:q`. Chord: join notes with `+`, e.g. `C4+E4+G4:w`. Sharps and flats: `F#4`, `Bb3`.
Each bar must add up to the meter; in a two-hand exercise both hands have the same bar count.
Note names are mapped to the player's real keys through calibration, never to fixed MIDI numbers.

`npm test` loads every file here and fails on any problem (bad note, bar that doesn't add up,
finger count that doesn't match, missing lesson or exercise id).

## Mastery tree
`content/tree/year-N.yaml`, one file per year (1–5). The design is in `docs/mastery-curriculum.md`.

```yaml
year: 1
title: Hands apart, then together
level: ABRSM Initial–Grade 1, RCM Prep–Level 1
goal: What the player can do at the end of the year.
units:                 # in path order
  - id: meet-the-keyboard
    title: Meet the keyboard
    nodes:             # a built unit
      - { id: c-d-e, type: lesson, strand: theory, lesson: c-d-e, title: "C, D and E", requires: [high-and-low] }
      - { id: ear-high-low, type: drill, strand: ear, planned: true, title: Higher or lower?, requires: [high-and-low] }
  - id: minor-keys     # a unit that is still an outline
    title: Minor keys
    checkpoint: y2-checkpoint-a
    outline:
      theory: [Natural, harmonic and melodic minor]
```

- `type`: `lesson`, `drill`, `piece`, `checkpoint`, `side-quest` (optional, never blocks the path).
- `strand`: `technique`, `reading`, `rhythm`, `theory`, `ear`, `repertoire`, `creativity`;
  checkpoints use `all`.
- `requires`: node ids that must be Practised first. They must appear earlier in path order
  (any year), which keeps the tree free of loops.
- `lesson`: the lesson that teaches the node. A node without one must say `planned: true`.
- Every lesson in `content/lessons/` must be placed in the tree, and every year has exactly three
  checkpoints (as nodes, or `checkpoint:` on an outlined unit).

`npm test` checks all of this.
