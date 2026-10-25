# Vision

*Last brought up to date: 2026-10-25.*

## In one line

iggyuoso is one free learning website with one account and several **modules**. The first and main
one is a piano trainer (iggy + virtuoso) that takes an adult who thinks they are "not musical" from
their first key to a proper intermediate player who reads, hears, improvises and writes their own
music. Slogan: **easy as C D E**.

Ignas's own words for it: *"Simply Piano but better, Duolingo but better"*, free for everyone, with a
gorgeous design.

## What makes it different

- **A trainer, not a song player.** Short exercises that each train one skill. Both hands work
  together from the first stage. Each hand is scored on its own, and the feedback says which hand
  or which habit gave way (early, late, rushing, uneven, wrong notes, short holds, pedal, dynamics).
- **Music school, from scratch.** Theory and playing go hand in hand, in the order of first- and
  second-year music-school textbooks, in our own words. The **Book** is a real textbook (65
  chapters, about 73,000 words) read alongside the lessons.
- **A growing mastery tree, not a course with years.** Seven branches (technique, reading, rhythm,
  theory, ear, pieces, creativity) grow side by side over nine stages, joined by a trunk of
  milestones. Requirements cross branches the way real skills depend on each other. Nothing is ever
  locked: the tree only advises what comes first.
- **Mastery takes days, not minutes.** A lesson is played through after one clean take of each
  exercise; it is finished after repeated clean takes on different days. Skills fade and come back
  for review, and Today's practice plans about 20 minutes a day.
- **The ear from zero.** Ear training assumes no sense of pitch at all, starting from "same or
  different?", and answers are played on the keyboard.
- **Making music, not only copying it.** A Sketchbook keeps ideas played freely, improvising is
  judged by musical rules, and a composing path runs through the creativity branch.
- **Songs, taught in steps.** Songs open after milestones. Bigger ones (Where Is My Mind, Can't Help
  Falling in Love, Pachelbel's Canon) are one song with a path of steps inside it. Players can also
  import their own MIDI files (My songs).
- **A practice room beside the lessons.** Three games (Note Rush, Play by ear, Duet) and five
  tools (Chord finder, Timing mirror, Scale gym, Jam room, Play report), each tied to a branch of the
  tree and suggested by the lessons it fits. Several listen to free playing and say, hand by hand,
  where it was held back or hurried.
- **Practise the hard bars.** Every played exercise has a Scored mode (takes count) and a Practice
  mode that loops the bars picked on a slider, at any tempo, and saves nothing; Wait for me makes
  the music stop at each note or chord until it is played.
- **See the music three ways.** Sheet music, Synthesia-style falling notes (with the sheet as a
  strip above), finger numbers, both hands drawn on the keys (beta), and chord names over the
  music.
- **MIDI keyboard first.** A calibration step learns any keyboard. A computer-keyboard emulator
  exists for trying the app without a piano, and `#/demo` shows every feature with a virtual
  pianist, so the app can be seen without any keyboard at all.
- **Guest or account.** Progress lives on the device by default; a free account copies it across
  devices, and the app keeps working offline.

## Where it is going

- More modules on the same site and account (ideas so far: a math tutor, a painting course). The
  "Sums" module is only a sample that shows how one fits, to be replaced by a real one.
- Ideas tried quickly: an idea can be built on a preview branch with its own preview address
  (`docs/previews.md`, log in `docs/ideas.md`), and Ignas says go (merge) or no-go (close). The
  first run (2026-10-25, eight ideas) was kept whole and became the practice room; any of it can
  still be cut.
- Earlier wishes still open: more statistics over time (timing
  per note), more songs (public domain by default; copyrighted titles only when Ignas asks for one
  by name, written as our own arrangement).

## How the work is organised

- Ignas owns the project and has no local git: every change is made by Claude sessions as branches
  and pull requests, which sessions validate and merge themselves (except hourly-idea previews).
- `CLAUDE.md` is the source of truth for decisions; every decision is appended to its log.
- Every user-facing feature also appears in the demo (`#/demo`).
- How the code works: [docs/README.md](README.md) lists every document.
