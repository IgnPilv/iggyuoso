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
- 2026-10-23: The app's own sounds (ear prompts, quiz sounds, Listen and guide notes) use a sampled
  piano: Salamander Grand Piano V3 (Alexander Holm, CC BY 3.0, credited in Settings and
  `public/piano/CREDITS.txt`), 30 samples a minor third apart, cut to 3.5 s mono 96 kb/s (1.3 MB
  in all). Samples load on first use; a note whose sample is not ready yet uses the synth tone.
  Metronome clicks stay synthetic.
- 2026-10-23: Mastery store (`src/progress/mastery.ts`, saved as `mastery.<node>` and
  `mastery.meta`): Locked until every required node is Practised; Practised = every exercise of
  the node's lesson ★ at a counting tempo; Solid = every best ★★★ (92+), reached on a clean take;
  Mastered = a pass on a later day than Solid. Review boxes of 2/4/8/16/32/64 days; freshness =
  2^(−days/box), due at ½; a pass on a due node moves up a box (+10 XP), a fail drops one state
  and resets the box, and climbing back needs a fresh take. XP: clean take 10, each new star 5,
  promotion 25, daily cap 300. The streak forgives one rest day. The result card shows the XP and
  state changes; home shows XP, streak, reviews due and Solid / Mastered / Review badges. The
  demo uses throwaway progress, so it shows rewards without saving anything.
- 2026-10-23: Year 1 content complete (units 1–6, 51 lessons, 3 checkpoints, Year 1 exit exam),
  every Year 1 tree node linked to its lesson. Pieces are public domain (folk tunes, Beethoven's
  Ode to Joy) or our own (waltz in G, D minor song, call and answer). Improvising uses `tap`
  (any keys in a given rhythm) until there is a free-play kind. Ear checkpoints reuse normal
  `ear` exercises (no "no-feedback" mode yet).
- 2026-10-23: Exercises can have a `title`; without one, headings use the lesson's title and the
  exercise's number (never the raw id). A `tap` without `hand` shows no hand badge. `ear` and
  `quiz` take `feedback: none` for checkpoints: answers are only noted (no colours, no
  resolution), and the result lists the missed questions with their answers.
- 2026-10-23: Richer note strings (curriculum's Year 2 order): ties (`E4:h~ | E4:q`, one note held,
  one finger), upbeats (`pickup:`; the upbeat bar is padded at the front so bar lines, clicks and
  falling-notes bars stay on whole bars, and the last bar may be short by the same amount),
  sixteenths (`s`), triplets (`q3 e3 s3`), and compound meters: the tempo counts the meter's beat
  (`Meter.pulse` = 1.5 quarters in 6/8, 9/8, 12/8; 2 in 2/2), and clicks and the count-in follow
  it. Timing inside the engine stays in quarter beats. The staff draws ties, triplet 3s, sixteenth
  flags and rests.
- 2026-10-23: Checkpoint and exam ear exercises use `feedback: none` (`ear-checkpoint-a`,
  `ear-checkpoint-b`, `ear-year-1-exit`); pieces and scales carry `title:`.
- 2026-10-23: Tempo ladder (`tempoLadder`, `src/engine/practice.ts`): rungs in percent of the
  tempo, ending at 100; progress saved per exercise as `ladder.<id>`. Only takes at the current
  rung's tempo count: 3 clean takes (92+) up, 2 fails (under 65) in a row down; a pass in between
  resets the fails. Looping bars: any timed exercise of 2+ bars has "Loop bars [from] to [to]";
  the result card names the 1–2 bars with the most misses, wrong notes, short holds and extras
  and offers to loop them. A loop is the bars cut out as their own exercise (a tie into the loop
  becomes a fresh note), plays round until Stop at the tempo the player was on, and is never
  saved or counted (no records, ladder or XP). Demo scene "Tempo ladder and loops".
- 2026-10-23: Sustain pedal (curriculum Year 2). Input: CC 64 on any channel, down at 64+
  (`midi.onPedal`, `midi.pedalDown`; repeated values ignored); Space on the computer keyboard; the
  MIDI tester shows it. Content: `pedal:` line in the notes' bar format (`x` = down and pressed
  again at its start, `r` = up; `x x` = a change). Scoring (`src/scoring/pedal.ts`): per stretch,
  half a point for the press (at a change the pedal must be up some time from half a hit window
  before the chord to half a beat plus a window after it, then down again) and half for holding
  it 90% of the stretch and, before a rest, lifting within a window of its end. Habits: held
  through a change, changed early, pressed late, missing, lifted early, lifted late. The take
  score is 75% notes and 25% pedal. Drawn under the staff (Ped., line, change notches, lift tick)
  and as a strip down the right edge of the falling notes; the HUD shows a pedal light. Demo scene
  "Sustain pedal" (the pianist holds through one change).
- 2026-10-23: Key signatures: `key:` on any exercise (and quiz questions) draws the signature after
  the clef. Notes keep their full spelling (`F#4` in G); `key` changes only the drawing, never
  what is played or scored. The staff follows bar rules: an accidental shows where a note differs
  from the key or from an earlier note on that line or space in the bar, naturals included
  (also without a key). Untimed reading drills treat each note on its own. Demo "Key signatures".
- 2026-10-23: Octave audit (Ignas: "middle C5 is off in some exercises"). One convention everywhere:
  middle C = C4 = written MIDI 60 (content, labels, staff, samples, emulator); only calibration
  shifts to device keys, by whole octaves. Content and code already agreed; the bug was the
  on-screen keyboard window: for tunes above middle C (G and F position, scales) it started on
  middle C, cut its tag off and put C5 in the middle of the picture. Now `keyWindow`
  (`src/calibration.ts`) draws every partial keyboard with middle C in view and room around it,
  at least two octaves, on white-key edges. `tests/octaves.test.ts` checks the convention, the
  window, that a right hand never goes below C3 nor a left hand above C5, and that any exercise
  about middle C plays C4. G position: left hand from the G below middle C (G3), as in C position.
- 2026-10-23: Year 2 content complete (units 7–12, 56 lessons, checkpoints `y2-checkpoint-a`,
  `y2-checkpoint-b`, exam `y2-exit`); `content/tree/year-2.yaml` now has nodes for every unit.
  Two-octave scales use the tempo ladder; exam scales are harmonic minor. Pieces: our own studies
  and songs, plus public-domain Minuet in G (Petzold), Korobeiniki, Lightly Row and Twinkle
  Twinkle. The four exam genres are etude, polyphonic (minuet), large form (theme and variations)
  and character piece. Quiz choices are written in a mixed order (the app shuffles questions
  only). "Spot the change" uses a quiz with a sound of both versions until there is an ear item
  for it. Staccato is written as a note plus a rest, because release timing isn't scored yet.
  Staff pieces outside C carry `key:`.
- 2026-10-23: Pacing (Ignas: "lessons now are 10 seconds... the 1 year can be done in 45
  minutes"). Content target: about 4–6 practice days per Year 1 lesson. Every timed and tap
  exercise has `tempoLadder: true`. Ear drills ask 20 questions (25 in exams). Scales and pieces
  carry `days: 2` (clean takes on two different days); checkpoint-only tests carry `reps: 1`.
  `reps` and `days` take effect when the engine's progression rules land. Year 1 gains four
  songbook lessons (`songbook-1` to `songbook-4`: Au clair de la lune, Go Tell Aunt Rhody, Frère
  Jacques, Jingle Bells, When the Saints, London Bridge, and a Frère Jacques canon), which the
  checkpoints require. Generated daily drills come next.
- 2026-10-23: After Ignas's "falling notes should also visualise the sheet music": in falling notes,
  timed exercises (not `tap`) and step-by-step reading exercises (`display: staff`) show the staff
  as a strip above the lane. It scrolls so the music being played sits a third of the way in, with
  a playhead, and marks notes like the sheet view.
- 2026-10-23: Reps and locks (engine side of the pacing ask). Every exercise has `reps` (default 3)
  and `days` (default 1): it is done after that many clean takes (★★★, 92+, at a tempo that
  counts) on at least that many different days; `days` ≤ `reps`. Store keeps `clean` and
  `cleanDays` per exercise (a clean best saved earlier counts as one). A lesson is done when every
  exercise is done; lessons in a unit open one by one, and a lesson whose tree node is Locked stays
  closed. Checkpoint nodes need every required node Mastered (other nodes still need Practised).
  Mastery states themselves are unchanged. The result card says "n of m clean takes"; the recap
  and the locked-lesson card list each exercise's count. Settings → Defaults "Open every lesson"
  skips the order for trying things out. Demo scene "Clean takes and locks".
- 2026-10-23: Player profile (`#/profile`, header link; `src/progress/profile.ts`,
  `src/ui/profileView.ts`). Level from XP: level L starts at 50·L·(L−1) XP (100, 300, 600, …).
  Practice log per day (`profile.days`: XP, takes, clean takes, time); time = gaps between takes
  up to 5 min, plus 1 min for the first take of a sitting. Timed takes save each hand's mean
  offset and spread (`Attempt.timing`, last 200 in `profile.timing`). The page shows level, XP,
  current and best streak, a 12-week calendar, totals, each strand's nodes by state, and per-hand
  timing (last 10 timed takes against the 10 before). Node states are worked out with a memo per
  call (the requirement walk was exponential). Demo scene "Profile" uses made-up history.
- 2026-10-23: Generated drills (`kind: generated`, `src/engine/generate.ts`): `read-notes`,
  `find-notes`, `intervals`, `rhythm-read`, `sight-read`, drawn fresh each run from a pool
  (notes as a range in the key or a list, clef treble/bass/grand, keys, durations, meter, bars,
  tempo). Each run is built as raw content and parsed by the normal loader into a quiz or timed
  exercise that saves under the drill's id; "Try again" (and "New tune / New rhythm") makes a new
  one. Never the same note or interval twice running. `mastery: { accuracy, medianMs }` (defaults
  90 and 2500 ms; timed ones accuracy only): reaching the accuracy scores 92 (a clean take), and a
  middle answer time over `medianMs` caps the take at 91 (`src/scoring/goal.ts`). Quiz sessions
  time each answer. Demo scenes "Fresh drills" and "Sight-reading".
- 2026-10-23: Today's practice (`src/progress/daily.ts`, `src/ui/todayView.ts`, `#/today` and a
  card at the top of home). About 20 minutes, made once a day and saved (`daily.plan`): first the
  due reviews (for each faded node, its exercise with the weakest best take; up to 10 minutes),
  then the next open lesson on the path (estimated from the clean takes it still needs), then
  generated drills from lessons already reached. A review counts as done once the node is fresh
  again; the lesson once it was played today. A lesson never played stays locked while reviews
  are due (`lessonLock` reason `reviews`). Minutes per exercise are estimated from its kind,
  bars and tempo or number of questions. Demo scene "Today's practice".
- 2026-10-23: Generated daily drills placed in the curriculum: 33 `kind: generated` exercises
  (`gen-*`) added as the last steps of 30 Year 1 and Year 2 lessons. They cover finding keys, note
  reading (treble, bass, grand, with keys), naming notes, reading intervals, rhythm reading
  (quarters to sixteenths, rests, triplets, 3/4, 3/8) and sight-reading (one hand, 4–8 bars,
  every key met so far). Mastery bars: 90–95% accuracy, middle answer times of 2–3.5 s for the
  question drills, reps 3–7 on 2–4 days. Today's practice draws on them automatically.
- 2026-10-23: No hard locks (Ignas: "it says all are locked, lets not do that, lets give
  requirements, but not forbid to skip"). Every lesson and checkpoint can always be opened and
  played, and its takes count as usual. `lessonAdvice` (`src/progress/index.ts`, replacing
  `lessonLock`) only says what is recommended first: the previous lesson in the unit (not done
  yet), or the tree node's requirements (Practised; Mastered for a checkpoint). Home marks such
  lessons "Ahead" (still clickable); the lesson shows an "Ahead of your path" note with links.
  Reviews never hold a lesson back (Today's practice still puts them first). Settings "Open
  every lesson" is gone. Today's next lesson = the first not done whose requirements are met,
  else the first not done. Mastery states, reps, XP and rewards are unchanged. Demo scene
  "Clean takes and the path".
