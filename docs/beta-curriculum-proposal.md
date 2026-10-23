# iggyuoso beta curriculum: proposal (draft 1, 2026-10-23)

Two things to agree on before I write many files: the **lesson order** and the **data format**.

## 1. Approach

- Teach like a first-year music-school pupil: every lesson pairs one small piece of theory
  with one small playing skill, and the playing uses only what the theory has already taught.
- Order follows the common progression of beginner piano methods used in music schools
  (keyboard geography → finger numbers → pulse → note names → note values → middle C
  position → staff reading → hands taking turns → hands together). The texts are our own
  wording; we follow the order and ideas of the textbooks, we don't copy their pages.
- Hands apart first, always. Each playing step exists as RH, then LH, then (later) together.
- Small lessons (5–10 minutes): explain → try → scored exercise → short recap.
- Before lesson 1 the app runs **calibration** (press lowest white key, then highest key).

## 2. First lessons (unit 1: "Meet the keyboard")

| # | Theory | Playing |
|---|--------|---------|
| 1 | High and low: left = low, right = high. Black keys come in groups of 2 and 3. | Find every group of 2 black keys, then every group of 3. Play low vs high on request. |
| 2 | Finger numbers 1–5, same on both hands (thumb = 1). Hand shape, relaxed curved fingers. | "Play finger 3" style drills on a fixed five-key spot, RH then LH. |
| 3 | The musical alphabet A B C D E F G repeats. C sits just left of the 2-black-key group. | Find all the Cs. Then D (between the 2 blacks) and E. |
| 4 | F G A B around the 3-black-key group. Now every white key has a name. | Name-the-key drills: the app says a letter, you press any key with that name. |
| 5 | Steady beat. Quarter note = 1 beat ("ta"). Metronome and count-in. | Repeat one key on the beat, RH then LH. Scored on timing only. |
| 6 | Half note (2 beats) and whole note (4 beats). Bar lines and 4/4 time. | Mixed quarter/half/whole patterns on one key, then on two keys. |
| 7 | Middle C (the C closest to the middle of the keyboard). Middle C position: both thumbs share middle C, RH C D E F G, LH C B A G F. | Five-finger walks up and down, RH then LH, slow tempo. |
| 8 | The staff: 5 lines, 4 spaces, treble clef, middle C on its own little line (ledger line). C D E on the staff. | Read-and-play: notes shown on the staff, play them in rhythm, RH. |
| 9 | Bass clef; middle C, B, A from the bass side. | Same drill for LH. |
| 10 | Rests (quarter rest), hands taking turns (RH bar, LH bar). | First mini-tune split between hands, never at the same moment. |

Unit 2 would bring hands together on simple rhythms (the "together" tier of the brief), plus
dynamics (f / p), legato vs staccato, and the C major five-finger tunes.

## 3. Data format (proposal)

YAML files, one per lesson and one per exercise, so lessons can reuse exercises.

```
content/
  units/01-meet-the-keyboard.yaml      # unit: title, ordered list of lesson ids
  lessons/01-high-and-low.yaml         # lesson: theory text + steps
  exercises/find-two-black-groups.yaml # exercise: what to play and how it's scored
```

**Lesson**

```yaml
id: high-and-low
title: High and low
unit: meet-the-keyboard
skills: [keyboard-geography]
steps:
  - explain: |
      Sounds can be **low** (like a bear) or **high** (like a bird).
      On the piano, keys to the **left** sound lower and keys to the **right** sound higher.
  - exercise: play-low-play-high
  - explain: |
      Look at the black keys. They come in groups of **two** and **three**.
  - exercise: find-two-black-groups
  - exercise: find-three-black-groups
recap: Left is low, right is high. Black keys come in groups of 2 and 3.
```

**Exercise** — a `kind` field says how it's played and scored:

- `find`: press keys matching a target, anywhere (or in a region). Untimed. For lessons 1–4.
- `sequence`: play given notes in order, untimed. For first five-finger walks.
- `timed`: notes with durations against a metronome; scored per hand (timing, wrong notes,
  misses, extras) as in the brief.

```yaml
id: find-two-black-groups
kind: find
prompt: Press one key from every group of two black keys.
target: { blackGroup: 2 }       # also: { pitchClass: C }, { region: low | high }
coverAll: true                  # must find every one on the keyboard (uses calibration range)
```

```yaml
id: middle-c-walk-rh
kind: timed
hand: right
tempo: 60
meter: 4/4
countIn: 1
right: "C4:q D4:q E4:q F4:q | G4:w"
```

Notes are written as note name + octave (C4 = middle C) and a duration (`w` whole, `h` half,
`q` quarter, `e` eighth, `r` = rest, e.g. `r:q`). Bars are separated by `|` and checked to add
up to the meter. The app maps note names to the player's real keys through calibration, so
nothing hard-codes MIDI 60. (The brief's 8-slot rhythm strings stay an option for the later
rhythm-heavy tiers.)

## 4. Questions for Ignas

1. Is this lesson order OK, or do you have specific textbooks in mind whose order we should follow?
2. Format: YAML with note-name tokens as above, OK?
3. Lesson language: English for now (translation later), or Lithuanian?
