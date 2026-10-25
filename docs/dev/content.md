# Content: lessons, exercises, the tree and the Book

*How the teaching material is stored and how the app reads it (code in `src/modules/piano/`). The exact file format, field by
field, is in [content/README.md](../../content/README.md); this page explains the moving parts.*

## The idea

Everything the app teaches is **data, not code**. A lesson is a text file that says "show this
explanation, then this exercise, then that one". An exercise is a text file that says "play these
notes at this tempo with this hand". The code knows how to show and score each *kind* of exercise,
so new lessons need no programming.

The files are YAML (a readable format of `name: value` lines) and, for the Book, Markdown (plain
text with `**bold**` and `## headings`).

```
content/
  lessons/NN-<id>.yaml     about 450 lessons: id, title, skills, steps, recap
  exercises/<id>.yaml      about 2,000 exercises, one per file, file name = id
  tree/*.yaml              the mastery tree: stages, one file per branch, milestones, songs
  book/book.yaml + *.md    the Book: parts and chapter order, one Markdown file per chapter
```

## Lessons and steps

A lesson is a list of **steps**, shown one per screen (in "panels", see
[rendering.md](rendering.md)):

- `explain`: a theory screen. Text, plus optional pictures (`staff`, `keys`), a `sound` to play, a
  `callout` box, `terms` chips and a `check` question that must be answered before Next.
- `playground`: press any key and see it on the staff, named.
- `exercise: <id>`: one exercise, played and scored.
- `read`: a Book chapter. These are not written in the lesson file: a chapter lists its `lessons`,
  and the loader puts a read step at the front of each of them.

The lesson ends with a `recap` screen (written in the file; the app adds what is left to do).

## Exercise kinds

Each exercise has a `kind`, and each kind has its own player (screen) and scorer:

| Kind | What the player does | Scored by |
| --- | --- | --- |
| `find` | find keys (all the Cs, the groups of two black keys) | `scoring/untimed.ts` |
| `sequence` | play notes in order, no clock (wait mode) | `scoring/untimed.ts` |
| `timed` | play along with a metronome, one or both hands, maybe pedal and dynamics | `scoring/timed.ts`, `pedal.ts`, `dynamics.ts` |
| `tap` | a rhythm on any key (stored as a timed exercise with `pitchMatch: any` or `side`) | `scoring/timed.ts` |
| `ear` | listen, answer on the keys or with buttons | `engine/drills.ts` |
| `quiz` | theory questions by button or by playing | `engine/drills.ts` |
| `build` | play a named chord, interval or scale | `engine/drills.ts` |
| `improvise` | make up music inside a frame, judged by musical rules | `engine/improvise.ts` |
| `generated` | a fresh drill each run (reading, finding notes, rhythms, sight-reading) | becomes a quiz or timed exercise |

Notes are written as compact **note strings**: `C4:q D4:q E4:h | F4:w` means C, D (quarters), E
(half), bar line, F (whole). Chords are `C4+E4+G4:h`, ties `E4:h~`, dotted `h.`, triplets `q3`.
Middle C is always written `C4`; calibration moves it to the player's real key. The parser is
`music/notes.ts`.

## How the app reads the files

`src/modules/piano/content/index.ts` bundles every YAML and Markdown file into the site at build time (Vite's
`import.meta.glob`), then:

1. `loadContent` (`src/modules/piano/content/load.ts`) turns each lesson and exercise into typed data
   (`src/modules/piano/content/types.ts`). It checks everything it can: bars that do not add up, hands with different bar counts,
   finger counts that do not match the notes, exercises a lesson names but that do not exist. Each
   problem is reported with its file name. It also fills in a suggested fingering where none is
   written (`music/fingering.ts`).
2. `loadBook` (`src/modules/piano/content/book.ts`) reads the Book and attaches each chapter to its lessons.
3. `loadTree` (`src/modules/piano/content/tree.ts`) reads the tree and checks it: one milestone per stage, every
   requirement exists and is not from a later stage, no loops, every lesson placed exactly once.

`npm test` runs the same loaders over the real `content/` (`tests/content.test.ts`,
`tests/tree.test.ts`, `tests/book.test.ts`), so **a broken content file fails the build** before
it can reach the live site.

## The mastery tree

The tree decides the order of lessons and what is recommended next. Each **node** sits in a
branch (technique, reading, rhythm, theory, ear, repertoire shown as "Pieces", creativity; plus
the milestones trunk and songs), has a stage (1 to 9), names the lesson that teaches it, and lists
the nodes it `requires`, from any branch. Requirements are advice: nothing is locked.

A song taught in steps is several song nodes; each step names the whole-song node with
`song: <id>`, and the Songbook shows them as one song (`songOf` in `src/modules/piano/content/index.ts`).

## The content generator

Most lessons are **written by Python scripts** in `tools/content/`, so that families of lessons
(a scale in every key, a song in seven steps, a rhythm workout per stage) stay consistent.

- `python3 tools/content/build.py` deletes the files it wrote last time (listed in
  `tools/content/generated.txt`), runs each branch's script (`ear.py`, `rhythm.py`, `keys.py`,
  `songs.py`, `wim.py`, `canon.py`, ...), and writes the lessons, exercises and all tree files.
- `tools/content/lib.py` holds the helpers the scripts share (`timed`, `tap`, `ear`, `quiz`, ...).
- `tools/content/links.py` adds the cross-branch requirements last (what each lesson really uses).
- `tools/content/rebuild.sh` first resets `content/` to the last commit, then runs the build. So:
  **commit hand edits before running it**, and change a generated lesson in its script, not in
  the YAML (the next build would overwrite the YAML).

### The song catalogue

Most of the Songbook comes from `tools/content/catalogue.py` and its tune files, one per group
(`cat_nursery.py`, `cat_folk.py`, `cat_classical.py`, ...). Each `tune(...)` call is one song: title,
where it comes from, key, meter, tempo, the tune, one chord per bar (or several, split evenly), the
stage it belongs to (its milestone is worked out from that), the group, and a short story. Tunes are
written in a short form (`M` in `catalogue.py`): a duration carries on until a new one is written, a
note without an octave goes to the nearest note of that letter (a fourth or less), and the key's
sharps and flats are added (write `Fn` for F natural). So `G4:q B D5 | C:h` is `G4:q B4:q D5:q | C5:h`
in G major. Watch leaps of a fifth or more: they need their octave written.

From one tune the writer makes the song's lesson: the rhythm to tap (up to stage 5), a by-ear echo
of the opening (up to stage 4), the tune, the left hand from the chords, both hands on the tempo
ladder, a fuller left hand (or one written out with `left=`) with the pedal from stage 6, and a
performance. It checks every bar's length, moves the left hand (or, failing that, the tune) an octave
so that no key is played by both hands at once, and prints any tune whose notes fit their chords
less than 60% of the time on chord changes, as a check on the transcription.

**Licensing rule.** Catalogue songs are public domain: traditional, or by a composer who died more
than 70 years ago and published before 1930. Every arrangement is our own; nothing is copied from a
published or online arrangement or a downloaded MIDI file. Copyrighted songs are added only when
Ignas names the title himself (group `requests`).

Hand-written files (the early lessons, the Book) are left alone by the build.
