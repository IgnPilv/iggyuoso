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

### Theory blocks (on an `explain` step)
Next to its text, an `explain` step can carry pictures, a sound and a check question:

```yaml
- explain: |
    Markdown text
  staff: { notes: "C4:q E4:q G4:h", clef: treble, key: G, labels: names }  # or just "C4:q E4:q"
  keys: { notes: "C4 E4 G4", labels: fingers, fingers: "1 3 5" }           # or just "C4 E4 G4"
  sound: "C4:q E4:q G4:h"     # a play button (no sound: no button)
  callout: "**Rule.** The treble clef curls round the G line."
  terms: [staff, treble clef, ledger line]
  check: { ask: "Which line?", choices: [E, { text: G, why: "..." }], correct: 0, why: "..." }
```

- `staff`: `clef` is `treble`, `bass` or `grand` (split at middle C); `labels: names` writes each
  note's letter under it. Notes are evenly spaced and drawn with their values.
- `keys`: lit keys; `labels` is `names`, `fingers` (one number per key in `fingers`) or `none`.
- `check`: `{ ask, choices, correct, why }` or `{ ask, play: G4, why }` (exact pitch unless
  `pitchMatch: pitchClass`); it can carry its own `staff` / `keys` picture. Next waits until it is
  answered right; a wrong answer shows `why` and can be tried again.
- A step `- playground: { clef: treble, notes: C4-G5, prompt: "...", key: G }`: any key pressed in
  that range shows on the staff with its name. Next is always allowed.

## Reps and days (any exercise)
An exercise is **done** after `reps` clean takes (★★★, 92 or more, at a tempo that counts),
played on at least `days` different days. Defaults: `reps: 3`, `days: 1`; `days` cannot be more
than `reps`. A lesson is done when every exercise in it is done. Nothing is ever locked: a lesson whose
previous lesson is not done, or whose tree node still needs its `requires`, is marked *Ahead* and
says what is recommended first (for a checkpoint: every node it `requires` Mastered), but it can
be opened and played, and its takes count.
Mastery states on the tree are unchanged (Practised still means every exercise ★ once).

```yaml
reps: 5   # five clean takes
days: 2   # spread over at least two days
```

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
  `pitchMatch: pitchClass` (any octave counts), `tempoLadder: true` (steps 60 70 80 90 100% of
  `tempo`) or `tempoLadder: [60, 80, 100]`: the tempo starts on the player's step, three clean
  takes (92+) on it move up a step, two failed takes in a row move down. Any timed exercise of two
  bars or more can loop a few bars (the player picks them, or the result card suggests the bars
  with the most mistakes); loop takes are practice and are not saved.
  `pedal: "x:h x:h | x:h x:h"`: the sustain pedal, in the bars of the notes. `x:<duration>` =
  pedal down for that long, pressed again at its start; `r:<duration>` = pedal up. Two `x` in a row
  is a change (legato pedal: lift as the new chord sounds, press just after). Scored per stretch:
  held through a change, changed before the chord, pressed late, lifted early, lifted late before
  a rest. The pedal is a quarter of the take's score. Shown as falling notes; `display: staff` starts on
  sheet music instead (the player can switch).
  `dynamics: "p | - | < | f"`: loud and soft, one mark per bar: `pp p mp mf f ff`, `<` (or `cresc.`)
  crescendo and `>` (or `dim.`) diminuendo towards the next level, `-` as before. Bar 1 needs a level.
  Scored from key velocity, relatively (keyboards differ): each change of level must be heard as a
  change between the stretches' middle velocities (7 per level, at most 24), and a hairpin must grow or
  fade from its first third of notes to its last. A fifth of the take's score when the level changes;
  not scored when every key comes in at the same strength (computer keyboard, fixed velocity).
  `click: count-in` (timed and tap): the click sounds only during the count-in, then the player
  keeps the pulse inside; `click: off`: no clicks at all (the count still shows on screen). The
  player picks the count-in length in Options (a full bar of `countIn`, short = the last two beats,
  or none); content does not set that.

- `tap`: rhythm only, scored like `timed` but any key counts. `tempo`, `meter`, `countIn`, and
  `rhythm` written as a note string with `x` for every note: `"x:q x:q x:h | x:e x:e x:q r:q"`.
  Two hands: `right: "x:q x:q x:h"` and `left: "x:h x:h"` instead of `rhythm`; any key from
  middle C up is the right hand, any key below is the left, and each hand is scored on its own
  (a key on the wrong side is a wrong note). `echo: true`: Play sounds the rhythm without showing
  it, then after a bar of count-in the player taps it back; the staff shows on the result.
- `ear`: the app plays, the player answers. `cadence: C` (key of a I-IV-V-I played before each
  question; leave out for none), `questions` (default 10), and `items`, a mixed pool. Missed
  items come back more often. The first key (or button) is the answer. Item types:
  - `{ type: note, pool: [C4, E4, G4] }`: press the key you heard. `lit: true` lights the pool's
    keys to pick from; `reference: C4` plays that note first ("The first note was C", lit), then
    the question note.
  - `{ type: interval, pool: [M3, P5], from: C4, direction: up|down|both, answer: play|name, together: true }`:
    two notes (`together` = at once); press the second note, or (`answer: name`) pick the name.
    Intervals: P1 m2 M2 m3 M3 P4 TT P5 m6 M6 m7 M7 P8.
  - `{ type: chord, pool: [maj, min], root: C4 }`: name the chord with buttons
    (maj min dim aug sus2 sus4 dom7 maj7 min7).
  - `{ type: degree, key: C, pool: [1, 3, 5] }`: after the cadence in `key` (C, G, Am...),
    press the degree you heard (any octave); then it resolves to the tonic (`resolve: false` to skip).
    Degrees 1 to 7, also `b3`, `#4`.
  - `{ type: melody, notes: "C4 D4 E4", plays: 2 }`: play the phrase back; each note's first key
    counts. `plays` = how many times it can be heard. `lit: true` lights the keys the phrase uses.
  - `{ type: compare, pool: [higher, lower, same], range: [C4, C5], gap: [2, 7] }`: two notes,
    answer with buttons; `gap` = how far apart in semitones when they differ (default 2 to 7).
    `pool: [same, different]` gives Same / Different buttons instead (don't mix the two sets).
  - `{ type: contour, length: 3, range: [C4, C5], gap: [2, 5] }`: `length` notes (2 to 5), each a
    `gap` away from the last; answer with arrows (↗ ↘ per move). Optional
    `pool: [up-up, up-down]` limits the shapes (default: all of them).
  - `{ type: motion, pool: [same, step, leap], range: [C4, C5] }`: two notes; buttons The same /
    A step (1–2 semitones) / A leap (5–9). The range needs at least 9 semitones.
  - `{ type: count, pool: [1, 2, 3], range: [C3, C5] }`: how many notes sound at once (1 to 4,
    at least a minor third apart); after the answer they are played one by one.
  - `{ type: rhythm, pool: ["x:q x:q x:h", "x:h x:h"], meter: 4/4, tempo: 80, pitch: C5 }`: a bar
    of clicks, then one pool rhythm on `pitch`; the choices are rhythm pictures (the right one and
    up to three others). Every note is `x`, rests are `r`; each rhythm must fill whole bars.
    The tempo counts the meter's beat (dotted quarters in 6/8). At least two rhythms.
  - `{ type: loudness, pool: [loud, soft], notes: "C4 E4 G4" }`: the phrase (default one C4) is
    played twice; "The second time: louder or softer?" (`loud` = the second is louder).
  - `{ type: function, key: C, pool: [I, IV, V, vi] }`: after the cadence, one chord in the key; name it by its
    Roman numeral, then it resolves to I (i in minor). Numerals: upper case major, lower case minor, `°`
    diminished, `+` augmented, `7` / `maj7`, `b` / `#` in front for borrowed roots (`bVII`); in minor, `vii°`
    sits on the raised 7th.
  - `{ type: progression, key: [C, G, F], pool: ["I IV V I", "I V vi IV", "vi ii V I"], choices: 4 }`: a key
    from the list, then the progression's chords one a second (bass plus a smooth close voicing); pick
    it from the right one and up to `choices − 1` others from the pool.
- `quiz`: `questions`, each `{ ask, choices: [...], correct: <index from 0> }` or
  `{ ask, play: "G4" }` (answer by playing these notes in order). Optional `staff: "G4:w"`
  (a picture, with `clef`) and `sound: "C4:q E4:q"` (a play button). `shuffle: true` mixes the order.
  `why:` (Markdown) is shown after any answer, with an optional picture (`whyStaff`, `whyKeys`,
  shaped like the theory blocks); a choice can be `{ text: B, why: "..." }`, shown when that wrong
  choice is picked. With a `why`, the quiz waits for Next instead of moving on by itself.
- `build`: untimed, `tasks`, each one of `chord: Cm` (held together unless `together: false`),
  `interval: M3` + `from: D4` (+ `direction: down`), `scale: G major` (+ `octaves`), or
  `notes: "C4 E4 G4"`; optional `octave` (default 4), `order: listed|any`, `ask` (own wording).
  Scales: major, minor, harmonic minor, melodic minor, major/minor pentatonic, chromatic.
  Score = tasks right first time; "Show me" reveals the keys but the task no longer counts.
- `generated`: a drill made fresh every run, so it can be ground without learning the answers.
  `generator` is one of:
  - `read-notes`: a note on the staff; play it in the right octave (`answer: play`, default) or
    name it with buttons (`answer: name`).
  - `find-notes`: "Find F♯, any one"; any octave counts.
  - `intervals`: two notes on the staff (one after the other or together); name the interval.
    Needs `intervals: [M2, M3, P5]` (two or more).
  - `rhythm-read`: a rhythm on the staff to tap on any key (like `tap`). `hands: both`: two lines,
    tapped as a two-hand `tap` (the left line uses only the quarter-or-longer `durations`).
  - `rhythm-echo`: the same pool, played to the player unseen and tapped back (`tap` with
    `echo: true`); also takes `hands: both`.
  - `sight-read`: a short tune to play, mostly steps and some skips, ending on the key note.
    With `hand: together` it is a piece for both hands on the grand staff: the tune (from `notes`)
    in the right hand over a left hand on I, IV and V of the key (i, iv, V in minor; starts and
    ends on I, V in the bar before the end), and each bar's first tune note belongs to its chord.
    `left: roots` (default; the root held all bar), `left: fifths` (root, then the fifth, for half
    a bar each; the last bar holds the root) or `left: chords` (the triad held, root position).
    The left hand stays between E2 and middle C.
  The pool, at the top level or under `pool:`: `notes` (a range `C4-G5`, meaning every note of
  the key in between, or a list `"C4 E4 G4"`; default `C4-G4`), `clef: treble|bass|grand` (grand
  picks by the note), `keys: [C, G, F]` (one is picked per question or tune; default C).
  `rhythm-read`, `rhythm-echo` and `sight-read` also take `durations: [q, h, e, r:q]` (eighths come in pairs;
  `r:q`, `r:h`, `r:e` add rests, never at the very start; default `[q, h]`), `meter` (default 4/4), `bars` (default 4), `tempo` (default 72) and `hand`. The last
  bar is one long note.
  `questions` (default 30) for the question drills. `mastery: { accuracy: 90, medianMs: 2500 }`:
  reaching `accuracy` percent right counts as a clean take (score 92), and answering slower than
  `medianMs` (the middle answer time) keeps the take below clean. Timed ones use accuracy only.
  `reps` and `days` work as for any exercise.

  ```yaml
  id: read-treble-c-g
  kind: generated
  generator: read-notes
  notes: C4-G5
  keys: [C, G]
  questions: 30
  mastery: { accuracy: 90, medianMs: 2500 }
  reps: 5
  days: 3
  ```

- `improvise`: the player makes up the notes inside a frame, and the take is checked for its
  musical choices (not for matching written notes). Fields: `tempo`, `meter` (default 4/4),
  `countIn`, `click`, `bars` (the player's bars), `key` (home note and spelling, default C),
  `hand` (`together`: notes from middle C up are the tune, below are the bass), and any of:
  `scale` (`C major pentatonic`, `A blues`, `D dorian`, ..., or a list `C# D# F# G# A#`; its keys
  are lit), `chords` (one per bar, `C | Am | F | G`, repeated if shorter; shown as a chart),
  `backing: chords | roots | <note string>` (the app plays it under the player's bars),
  `call` (a phrase the app plays first; the player's bars follow), `rhythm` (x notes to improvise
  in, like `tap`), `example` (a model take for "Hear an example"). `rules` is a list, each worth
  0 to 1; the score is their average, and a take is clean only when every rule holds:
  `inScale`, `chordTones` (strong beats on the bar's chord), `startOn: C` / `endOn: tonic`,
  `questionAnswer: 2` (bars before 2 ask and end away from home; the rest begin like the question
  and come home), `repeat: 1` / `sequence: 1` (the next bar repeats the first, or moves its shape;
  `{ bars: 4, at: 8 }` compares bars 1–4 with bars 9–12), `contrast: { bars: 4, at: 4 }` (the
  middle is different), `steps: 60` (percent of moves by step), `rests: 2` (a silence of 2 beats
  in every four bars), `variety: 4` (different notes), `range: C4-G4`, `rhythm`, `bassRoots`
  (left hand on each chord's root at beat 1). `fill` (something in every bar) is always added.
  The result writes the take on the staff and can keep it in the Sketchbook.

  ```yaml
  id: cmp-full-close
  kind: improvise
  key: C
  tempo: 76
  bars: 4
  scale: C major
  chords: C | F | G | C
  backing: chords
  rules: [inScale, chordTones, { endOn: C }]
  ```

`ear`, `quiz` and `build` take `pitchMatch: pitchClass` too. `ear` and `quiz` take
`feedback: none` for checkpoints: no right / wrong after each question (and no resolution after a
degree), and the result card lists the missed questions with their answers.

Common fields: `key` (a key signature for the staff: `G`, `Bb`, `F#m`, `Dm`...; notes are still
written out in full, e.g. `F#4` in G, and the staff only draws a sign where a note differs from
the key or from an earlier note on that line in the bar; quiz questions take `key` too), `title` (a short name for headings and lists; without it the app uses the lesson's
title and the exercise's number), `hand` (`right`, `left`, `alternating`, later `together`; a
`tap` without `hand` shows no hand), `display` (`keys` = light keys on the keyboard, `staff` =
notation; with `clef: treble|bass`), `prompt`.

## Note strings
`<Note><octave>:<duration>` separated by spaces, bars separated by `|`. C4 is middle C.
Durations: `w` whole (4), `h` half (2), `q` quarter (1), `e` eighth (0.5), `s` sixteenth (0.25);
a dot adds half (`h.` = 3, `e.` = 0.75). Triplets: add `3` (`e3 e3 e3` = one beat, `q3 q3 q3` = two
beats, `s3` too). Rest: `r:q`. Chord: join notes with `+`, e.g. `C4+E4+G4:w`. Sharps and flats:
`F#4`, `Bb3`. Tie: put `~` after the duration and repeat the note: `E4:h~ | E4:q` is one E held
for three beats (also across a bar line; it is played once, and takes one finger number).
Each bar must add up to the meter; in a two-hand exercise both hands have the same bar count.
Upbeat: `pickup: q` (a duration, a sum like `"e e"`, or quarter beats) makes bar 1 that short; the
last bar may then be short by the same amount. Meters: any `n/2`, `n/4` or `n/8`. `tempo` counts
the meter's beat: quarters in 4/4 and 3/4, halves in 2/2, eighths in 3/8, and dotted quarters in
6/8, 9/8 and 12/8 (6/8 at `tempo: 60` = one click a second, two to a bar).
Note names are mapped to the player's real keys through calibration, never to fixed MIDI numbers.

`npm test` loads every file here and fails on any problem (bad note, bar that doesn't add up,
finger count that doesn't match, missing lesson or exercise id).

## Mastery tree
There are no years. The tree is a set of **branches** that grow side by side, joined by a trunk of
**milestones**. Files in `content/tree/`:

- `stages.yaml`: the stages between milestones, in order (`stage`, `title`, `summary`). Stage 1
  ends at milestone 1, stage 2 at milestone 2, and so on.
- One file per branch: `technique`, `reading`, `rhythm`, `theory`, `ear`, `repertoire` (shown as
  Pieces), `creativity`; plus `milestones` (the trunk) and `songs` (open after milestones).

```yaml
branch: ear
title: Ear
summary: "The ear from scratch: same or different, high or low, ..."
nodes:
  - { id: ear-high-low, stage: 1, lesson: ear-high-low, title: "Higher or lower?", type: drill, requires: [ear-same-different, high-and-low] }
```

- `type`: `lesson`, `drill`, `piece`, `checkpoint` (milestones only), `side-quest`, `song`.
- `requires`: node ids from **any** branch. This is how the branches intertwine: an ear node can
  need a theory node, a piece can need a technique node and a rhythm node. A node may only require
  nodes of its own stage or earlier, and a milestone only from an earlier stage. No loops.
- Each stage has exactly one milestone. A milestone requires a few nodes from every branch of its
  stage and the previous milestone; songs require the milestone they open after.
- Cross-branch prerequisites follow what a lesson really uses: an ear drill needs the theory that
  explains what it hears (chord ear training after chord theory), playing needs the rhythm and
  reading it relies on, composing needs the harmony it writes with. They live in
  `tools/content/links.py` (`NEEDS`), applied last; add a line there for every new lesson that uses
  another branch.
- `lesson`: the lesson that teaches the node. Every lesson in `content/lessons/` is placed in the
  tree exactly once.
- Nothing is ever closed: a node whose requirements are not grown yet still opens, with advice.

`npm test` checks all of this.

## Generated content (`tools/content/`)
Most lessons are written by Python scripts, not by hand, so families (scales in every key, key
studies, song arrangements, rhythm workouts) stay consistent. `python3 tools/content/build.py`
removes the files it wrote last time (`generated.txt`), runs the branch modules (`patch`, `ear`,
`rhythm`, `technique`, `reading`, `theory`, `pieces`, `creativity`, `keys`, `songs`,
`milestones`), and writes the lessons, exercises and every tree file in full (the original nodes
come from `tree_base.py`). `tools/content/rebuild.sh` first resets `content/` to the last commit,
so **commit hand edits to content before running it**, and change generated lessons in the
scripts, not in the YAML. Helpers live in `lib.py` (`timed`, `tap`, `tap2`, `ear`, `quiz`, `Q`,
`gen`, `rread`, `accompany`, `transpose_string`, ...).
