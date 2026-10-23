# iggyuoso

**Read this file before doing anything. Append every decision to the Decision log at the bottom.**

## What it is
A browser-based piano tutor (iggy + virtuoso) for an adult beginner who is "not musical", using a
MIDI keyboard. Not a song player; a **trainer**: short exercises that each isolate one skill,
hands apart first, then together. Each hand is scored separately and the feedback says which hand
or which habit gave way. Slogan: *hands apart, then together.*

The curriculum teaches from scratch, like a first-year music-school pupil: music theory and playing
go hand in hand, following the order of standard music-school piano textbooks (our own wording,
never copied pages). Start small, adapt as we go.

## Owner and workflow
- Owner: Ignas (GitHub `IgnPilv`). No git installed locally; **every change goes through Claude
  sessions** on this repo, as branches and pull requests he reviews.
- Work is split into separate conversations on the same repo:
  - **Content**: curriculum, lessons, exercises, how lessons are written.
  - **Technical**: engine, MIDI, audio, scoring, rendering, data model, deployment.
  - **Design** (later): look, feel, copy.

## Stack and conventions
- Vite + TypeScript, built from scratch (the old single-file prototype is not reused).
- Lessons and exercises are data files (see `content/`), not code.
- Scoring engine is unit-tested (vitest).
- Hosted on GitHub Pages (public repo; https is required for Web MIDI).
- Progress stored in localStorage first; keep the store swappable for an account later.

## Hardware and input
- Owner's keyboard: a Chinese **Steiner** digital piano, 7 full octaves plus a few keys (most likely
  a standard 88-key A0–C8 range). Shows up over MIDI as "5704PIA-DK" (from the prototype).
- **Calibration step** on first run (and from settings): the player presses the **lowest white key**
  and then the **highest key**. From that the app works out the key count and range, and where
  middle C is. Never hard-code middle C = MIDI 60; keyboards are often octave-shifted.
- **MIDI input only for now.** No computer-keyboard input.
- Use MIDI event timestamps for timing; sanity-check against `performance.now()`.
- Treat near-simultaneous note-ons (~60 ms) as one chord hit, timed from the first note.
- Keep a permanent MIDI tester page in settings (keys lighting up + raw message log).

## Scoring (from the prototype, ideas only)
- Per-hand score, a "hands together" number (how far apart hands land on shared beats), timing
  tendency (early/late ms), misses, wrong notes, extras.
- Stars: ★ 65 (pass), ★★ 80, ★★★ 92. Practice slow freely; records only at ≥90% tempo.
- Flow: listen → count-in → play → scored result → next. Guide track on/off.

## Content
- Lessons are grouped in units; each lesson pairs one piece of theory with one playing skill.
  Format: `content/README.md`. Original proposal and lesson plan: `docs/beta-curriculum-proposal.md`.

## Decision log
- 2026-10-23: Repo `IgnPilv/iggyuoso`, public (free GitHub Pages for https/Web MIDI).
- 2026-10-23: Calibration = press lowest white key, then highest key (replaces the prototype's
  "press middle C"). MIDI only; the prototype's computer-keyboard fallback is dropped for now.
- 2026-10-23: Curriculum teaches from scratch with theory alongside playing, modelled on
  music-school textbooks; start with a small first unit and grow.
- 2026-10-23: Content format agreed: YAML units / lessons / exercises under `content/`, described
  in `content/README.md`. Exercise kinds `find`, `sequence`, `timed`; notes written as `C4:q`.
- 2026-10-23: Lessons are written in English for now (translation possible later).
- 2026-10-23: Unit 1 "Meet the keyboard" (10 lessons, 27 exercises) is the beta starting point.
- 2026-10-23: Ignas does not review PRs. Sessions have autonomy to open and merge their own PRs
  after validating the change; no review requests needed.
