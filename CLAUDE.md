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
  - **Design**: look, feel, copy. Design system in `docs/design.md`; tokens in `src/styles/tokens.css`.

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
- **MIDI keyboard first.** An optional **computer-keyboard emulator** (off by default, Settings →
  Computer keyboard) plays notes through the same input path, for trying the app without a piano:
  A S D F G H J K L ; ' = white keys from middle C, W E T Y U O P = black keys, Z / X = octave
  down / up. It is for testing, not a replacement for real keys.
- Use MIDI event timestamps for timing; sanity-check against `performance.now()`.
- Treat near-simultaneous note-ons (~60 ms) as one chord hit, timed from the first note.
- Keep a permanent MIDI tester page in settings (keys lighting up + raw message log).

## Scoring (from the prototype, ideas only)
- Per-hand score, a "hands together" number (how far apart hands land on shared beats), timing
  tendency (early/late ms), misses, wrong notes, extras.
- Stars: ★ 65 (pass), ★★ 80, ★★★ 92. Practice slow freely; records only at ≥90% tempo.
- Flow: listen → count-in → play → scored result → next. Guide track on/off.

## Demo (keep it current)
- `#/demo` is a no-keyboard showcase: a demo pianist plays the real screens on a virtual 88-key
  keyboard (with deliberate mistakes), plus a "watch any exercise" list built from `content/`.
- **Every user-facing feature must show up in the demo.** When you add or change a feature, add or
  extend a scene in `src/ui/demoView.ts` (and `src/demo/pianist.ts` if the pianist needs a new
  move) in the same PR. The demo never saves progress or calibration.

## Content
- Lessons are grouped in units; each lesson pairs one piece of theory with one playing skill.
  Format: `content/README.md`. 5-year design: `docs/mastery-curriculum.md` (tree data in
  `content/tree/`). Original unit 1 plan: `docs/beta-curriculum-proposal.md`.

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
- 2026-10-23: Engine v1 (technical thread). Plain TypeScript + DOM/SVG, no UI framework; hash
  routing so the build works under `/iggyuoso/` with a relative base. Deploy via GitHub Actions
  (`pages.yml`, Pages source "GitHub Actions"); PRs run tests + build (`ci.yml`).
- 2026-10-23: Middle C = the C nearest the middle of the calibrated range (lower one on a tie, as
  on 61-key boards); the player confirms it and can move it by an octave. Note names map to keys
  through `offset = middleC - 60`.
- 2026-10-23: Timed scoring: hit window ±45% of a beat (150–350 ms), full marks within 50 ms,
  half at the edge; wrong note = leftover press near an unplayed note; extras −0.5; long notes
  (≥ half) released before 75% lose 30%. Habits reported per hand: missed, wrong, extra, early,
  late, rushing, dragging, uneven, short holds; plus weaker hand and hands-together gap (≥ 50 ms).
- 2026-10-23: Untimed `find` with `coverAll` accepts any order (prompt can still suggest bottom to
  top); black-key groups cut off at the keyboard edge count. Score = right / (right + wrong).
  `low`/`high` = an octave or more from middle C, or the outer third of the keyboard.
- 2026-10-23: Note strings also accept chords (`C4+E4:q`), dotted durations (`h.`) and sharps/flats.
- 2026-10-23: Latency: played times are corrected by the AudioContext output latency plus a user
  setting (Settings → Timing). The app plays clicks and optional guide notes; the piano makes its
  own sound.
- 2026-10-23: After Ignas's first test ("very dry"): timed exercises show **Synthesia-style falling
  notes** by default (canvas, notes coloured by hand: right blue, left green; note name + finger on
  each note; keys light with what the app plays or expects). `display: staff` exercises start on
  sheet music; the player can switch views. Live scoring while playing: running score, ✓ / wrong /
  missed / extra counts, and each mistake named the moment it happens (wrong key, early, late).
- 2026-10-23: Timing lives in `src/engine/timedSession.ts` (clock, count-in, latency, capture,
  live judgement, live score), unit-tested; screens only draw from it.
- 2026-10-23: Chords are grouped per hand only, so a 30–59 ms gap between hands is measured, not
  hidden. Presses during the count-in are ignored. Two-hand fingering: `rightFingers` / `leftFingers`.
- 2026-10-23: Saved data carries a schema version (`iggyuoso.schema`) with an upgrade step per
  version. A lesson is done when every exercise in it has been passed (★ or better, at a tempo that
  counts). Calibration ends with a "meet middle C" step: the player must press it before saving.
- 2026-10-23: Demo mode (`#/demo`, linked from home and the header) so the app can be seen without
  a MIDI keyboard; the demo pianist injects notes through the same MIDI path (`midi.inject`).
  Rule: every new feature updates the demo in the same PR (see "Demo" above).
- 2026-10-23: Every exercise (find, sequence, timed) has a toggle between "Keyboard & sheet" and
  "Falling notes", one view at a time. Step-by-step exercises in falling notes use wait mode (the
  next note falls to the keyboard and waits until it is played). The player's pick is remembered
  for all exercises (`settings.view`, also in Settings); until then reading exercises start on
  the sheet and other timed ones on falling notes. The demo flips the toggle to show both.
- 2026-10-23: Design system v1 (design thread). Dark-first "new-wave" look: near-black with soft
  aurora glows, glass cards, brand gradient coral → pink → violet for brand and main actions;
  type Space Grotesk (display) + Inter (body) + JetBrains Mono (data), bundled via npm. All
  colours are tokens in `src/styles/tokens.css` (light and dark sets); canvas reads them through
  `palette()` in `src/ui/theme.ts`. No hard-coded colours in components. Rules: `docs/design.md`.
- 2026-10-23: Theme = Follow the device / Dark / Light (`settings.theme`, header button and
  Settings → Appearance), applied before first paint by `index.html`. The falling-notes stage
  stays dark in both themes. Demo scene "Dark and light" flips themes without saving.
- 2026-10-23: Computer-keyboard emulator (Ignas: "use a to ' keys as white"), replacing "MIDI only".
  Off by default; switch in Settings or from the "no MIDI keyboard / blocked" banner. Keys are read
  by `KeyboardEvent.code` (layout independent), A = middle C of the current calibration, Z / X shift
  by an octave (±4); key repeat, modifier combos and typing in form fields are ignored. Notes go
  through `midi.inject(..., 'Computer keyboard')`, which also shows as an input. While it is on,
  on-screen keys show their letter (not in "find the key" drills) and setup offers a standard
  88-key piano instead of pressing the ends. The demo ignores real typing.
- 2026-10-23: 5-year mastery curriculum designed from research (`docs/mastery-curriculum.md`,
  `docs/research/`): target ≈ ABRSM Grade 6 after 5 years; seven strands; path over a visible
  tree; 3 checkpoints a year; mastery states with a later-day retest and decay; XP for clean takes
  only; gentle streaks, no leagues; functional ear training answered on the keyboard; perfect
  pitch as an optional side quest.
- 2026-10-23: Tree data lives in `content/tree/year-N.yaml` (format in `content/README.md`), checked
  by `npm test`. Year 1 is designed node by node (existing unit 1 placed in it); Years 2–5 are unit
  outlines. Every new lesson must be placed in the tree.
- 2026-10-23: Year 1 engine kinds for the mastery curriculum (shapes agreed with the curriculum
  thread, described in `content/README.md`): `tap` (rhythm only, any key; parsed into a timed
  exercise with `pitchMatch: any`), `ear` (note, interval by key or by name, chord quality,
  scale degree with cadence and resolution, melody echo, higher/lower; first answer counts; missed
  items weigh +2, clean answers −0.5, never the same item twice running), `quiz` (buttons or
  play, optional staff picture and sound), `build` (chord held together, interval any order,
  scale in order; score = clean first tries; "Show me" spoils the first try). Scoring in
  `src/engine/drills.ts`, theory in `src/music/theory.ts`. They have the same view toggle; answer
  keys are never lit while a question sounds. The demo has a scene for each, using content
  exercises when there are some and built-in samples until then.
- 2026-10-23: Year 1 content complete (units 1–6, 51 lessons, 3 checkpoints, Year 1 exit exam),
  every Year 1 tree node linked to its lesson. Pieces are public domain (folk tunes, Beethoven's
  Ode to Joy) or our own (waltz in G, D minor song, call and answer). Improvising uses `tap`
  (any keys in a given rhythm) until there is a free-play kind. Ear checkpoints reuse normal
  `ear` exercises (no "no-feedback" mode yet).
