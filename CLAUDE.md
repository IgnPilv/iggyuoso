# iggyuoso

**Read this file before doing anything. Append every decision to the Decision log at the bottom.**

## What it is
One learning website with one account and several **modules** (see "Modules" below). The first and
main module is a browser-based piano tutor (iggy + virtuoso) for an adult beginner who is "not musical", using a
MIDI keyboard. Not a song player; a **trainer**: short exercises that each isolate one skill, with
both hands working together early. Each hand is scored separately and the feedback says which hand
or which habit gave way. Slogan: *easy as C D E.*

The curriculum teaches from scratch, like a first-year music-school pupil: music theory and playing
go hand in hand, following the order of standard music-school piano textbooks (our own wording,
never copied pages). Start small, adapt as we go.

The current vision (modules, the mastery tree, the Book, songs in steps, practice mode, hourly
ideas) is written out in `docs/vision.md`; keep it current when the direction changes.

## Docs
- `docs/README.md` is the index of every document. Developer docs (how the app is programmed and
  how it works, written for a non-expert owner) are in `docs/dev/`: architecture, content and the
  generator, input and timing, scoring, drawing, progress and sync, build and test, how-to recipes.
- **Keep them current**: a PR that changes how something works (a new exercise kind, a scoring
  number, a saved record, a new folder or page) updates the matching `docs/dev/` page in the same PR.

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

## Modules
- The site is a shell (`src/app/`) around modules (`src/modules/<id>/`), with shared code in
  `src/core/` (Module interface, storage, account + sync, account card, theme, Appearance). Shared
  code never imports from a module. Architecture and **how to add a module**: `docs/modules.md`.
- The header's module switcher (next to the logo) swaps the module's links, home and pages;
  Profile, Demo, Settings and the theme button are shared. `#/<id>/<route>` addresses a module's
  page; the piano keeps its old top-level addresses (`#/lesson/<id>`, `#/book`, ...).
- One account for all modules: a module saves `iggyuoso.<id>.*` records (`ModuleRecords`) that sync
  as they are; the piano keeps its old record names. Each module declares merge / wipe rules.
- Piano code lives in `src/modules/piano/` (paths in the decision log before 2026-10-25 are
  relative to it: `src/ui/x.ts` is now `src/modules/piano/ui/x.ts`, except `src/ui/theme.ts`,
  `dom.ts`, `accountView.ts` and `src/sync/`, now in `src/core/`). `src/modules/sums/` is a tiny
  sample module, clearly marked as such, to be replaced by a real second module.

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
  extend a scene in `src/modules/piano/ui/demoView.ts` (and `src/modules/piano/demo/pianist.ts` if
  the pianist needs a new move) in the same PR. `#/demo` shows the open module's demo
  (`Module.demo`); a new module brings its own. The demo never saves progress or calibration.

## Previews and ideas
- An open pull request labelled `preview` is deployed to
  `https://ignpilv.github.io/iggyuoso/preview/pr-<n>/` next to main (guest only, its own copy of
  saved data). How: `docs/previews.md`. Ideas built for Ignas to try wait there for his go / no-go;
  log every idea and its verdict in `docs/ideas.md`.

## Content
- A **growing mastery tree**, no years: seven branches (technique, reading, rhythm, theory, ear,
  pieces, creativity) over nine stages, a trunk of milestones, and songs that open after them.
  Requirements cross branches. Data in `content/tree/`, format in `content/README.md`, design in
  `docs/mastery-curriculum.md`.
- Most lessons are **generated** by `tools/content/build.py` (see `content/README.md`). Change
  generated lessons in the scripts, and commit hand edits before running `rebuild.sh`.
- **Songs are public domain** (traditional, or the composer died 70+ years ago and it was published
  before 1930), always in **our own arrangement**: never copied from a published, YouTube or online
  arrangement, never from a downloaded MIDI. A copyrighted title ships only when Ignas names it
  himself (group "By request"). The catalogue is `tools/content/catalogue.py` + `cat_*.py`
  (format in `docs/dev/content.md`).

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
- 2026-10-23: After Ignas's UX audit (design thread): phone layout with icon-only nav and no
  sideways scroll; the exercise screen leads with Listen / Play / Stop, with tempo, click, guide
  and loops in an Options drawer; the home page shows a path map (years → unit stations with
  progress rings → lesson tiles with strand dots, only the current unit open, no "Ahead" badges)
  and a shorter hero for returning players; the practice calendar has month and weekday labels.

- 2026-10-23: Theory blocks (after Ignas's "theory should be bigger, there should be quizzes";
  shape agreed with the curriculum thread, in `content/README.md`). An `explain` step can carry
  `staff` (picture, clef treble/bass/grand, `labels: names`), `keys` (lit keys, names or fingers),
  `sound` (play button), `callout` (rule box), `terms` (chips) and `check` (inline question by
  button or key; Next waits for the right answer; a wrong one shows `why` and can be retried).
  New step kind `playground` (press any key, see it on the staff, named). Drawn by
  `src/ui/theory.ts`. Quiz questions take `why` (shown after any answer; with one, the quiz waits
  for Next, which now sits under the feedback), per-choice `why` (`{ text, why }`) and a picture
  (`whyStaff`, `whyKeys`). Also from the UX audit: finger numbers on the sheet (over the upper
  staff, under the lower or bass one), quizzes with staff pictures always open on the sheet, the
  timed result card has Try again (and New tune for generated ones), the "Ahead of your path"
  note sits small under the first step only, and a short day-one Today's practice says why.
  Demo scenes "Theory screens" and "Theory quiz". The home path map, tree view and exercise
  controls drawer belong to the design thread.
- 2026-10-23: Theory pass (Ignas's audit: "theory should be bigger, there should be quizzes... not just
  1 line"). Every exercise has a `title`. Year 1 theory is written as several screens per idea using
  the theory blocks (picture on the staff or keys, a sound, a callout, key terms, a quick check that
  must be answered right). Each theory lesson ends with a 10–20 question quiz mixing pick, read the
  staff, hear and play questions, and **every quiz question carries a `why`**. Checkpoints and exams
  open with a theory paper (`feedback: none`, reps 1). Theory quizzes default to `reps: 2, days: 2`.
  Scratch scripts mix choice order with a seeded shuffle (the app shuffles questions only).
- 2026-10-23: Year 2 theory pass, same shape as Year 1: lessons as screens with pictures, sound and a
  check; new quizzes for ties, sixteenths, inversions, triplets, transposing, pedal and key
  signatures (order of sharps F C G D A E B, flats B E A D G C F); every older Year 2 quiz has a
  `why` on each question; theory papers open both Year 2 checkpoints and the exam.
- 2026-10-23: Standalone "Big idea" theory lessons, each with a playground step and a 12–15 question
  quiz: the grand staff map (landmarks and line/space rhymes; after the bass staff), counting any
  rhythm (after dotted quarters), why music has keys (after the key of F), the interval map (all
  intervals to the octave, inversions add to 9; Year 2 after perfect intervals) and the circle of
  fifths (after A major and G minor). Placed in their units and in the tree.
- 2026-10-23: Exercise options carry over (Ignas: "remember default options, if I go 100% do next
  also"). The tempo picked (`settings.tempo`, percent), Click, Guide notes and whether the Options
  drawer is open (`settings.optionsOpen`) are saved when changed and are where the next exercise
  starts. A remembered tempo wins over the tempo ladder's step (the ladder line still says which
  tempo counts); a ladder moving by itself does not change the remembered tempo. The demo keeps
  its own options and never saves them. Demo scene "Options carry over".
- 2026-10-23: Slogan is now "Easy as C D E" (Ignas: "lose the hands apart then together slogan,
  easy as C D E is better"), in the home hero and the header tagline. Practising hands apart stays
  as teaching advice in lessons.
- 2026-10-23: Ear items for a beginner ear (asked by the tree thread, `content/README.md`): `compare`
  takes `gap` and a Same / Different pool; `note` takes `lit` (pool keys lit as options) and
  `reference` (a named note first); `melody` takes `lit`; new `contour` (arrow buttons), `motion`
  (same / step 1–2 / leap 5–9), `count` (1–4 notes at once), `rhythm` (a bar of clicks, then the
  rhythm on one note; answers are rhythm pictures, 3–4 shown) and `loudness` (the phrase twice:
  was the second louder or softer, since one sound alone has nothing to compare with). Lit option
  keys use the `--key-option` token. Demo scenes "First ear steps" and "Hearing rhythms".
- 2026-10-23: Two-hand sight-reading (tree thread's main fix for "one note at a time"): generated
  `sight-read` with `hand: together` writes a tune over a left hand on I, IV, V (`left: roots |
  fifths | chords`), grand staff, each bar's first tune note a chord note (`progression`,
  `src/engine/generate.ts`). Demo scene "Sight-reading, both hands".
- 2026-10-23: Guest and accounts (Ignas: "use an account to track across devices or just use a
  guest session which is local"; no import/export). Guest is the default: progress on this
  device only, and the profile opens with a "Guest" card saying so. A signed-in account copies
  progress to a server and back (`src/sync/`, `docs/accounts.md`); the app always plays from the
  device's copy, so it works offline. Backend: **Supabase free plan**, over plain HTTPS (no SDK),
  email-link sign-in, one `progress` table (one row per store key, `jsonb` value, `schema`,
  server `updated_at`) under row-level security (`docs/supabase.sql`). The server sits behind
  `SyncProvider`, so it can be swapped. Config from repository variables `SUPABASE_URL` /
  `SUPABASE_ANON_KEY` at build time; without them the app is guest only ("accounts are
  coming"). Every `iggyuoso.*` record syncs except `schema`, `calibration`, `settings`,
  `account`, `sync.*` (new records sync with no change). Changes are stamped by a wrapper on the
  store's backend; sync = pull rows changed since the last pull (1 min overlap), merge records
  changed on both sides (exercise records, practice log, timing, XP keep the most of both, so
  counts never double but can undercount if both devices practise offline at once; everything
  else newer wins), push local changes. Rows from a newer schema are skipped with a reload
  prompt; older ones run `Store.upgradeFrom`, so migration steps must accept upgraded data.
  Signing in adds the guest's progress to the account; signing out keeps it on the device as a
  guest. The sign-in link returns to the app with the session in the hash, turned into
  `#/profile`. Demo scene "Guest or account" (pretend server, never saves).
- 2026-10-23: Count-in choice (Ignas: "the full 1 2 3 4 is a very long wait"): Options → Count-in
  Full bar / Short / None, remembered like tempo (`settings.countIn`). Short = the last two beats of
  the bar ("3 4"; one beat in 2/4, 6/8, 2/2), counted on screen as those beats; None = one silent
  beat to get ready, no clicks. Content `click: count-in` (clicks only in the count-in, for the inner
  pulse) and `click: off` on timed and tap. Demo scene "Options carry over" sets a short count-in.
- 2026-10-23: Two-hand tapping and rhythm echo (tree thread asks 9, 11, 12): `tap` with `right:` /
  `left:` rhythms (placeholders C4 / C3, `pitchMatch: side`: any key from middle C up is the right
  hand, below the left; scored per hand). Generated `rhythm-read` takes `hands: both`. New generator
  `rhythm-echo` (`tap` with `echo: true`): Play sounds the rhythm unseen, a full bar of count-in,
  the player taps it back (no Listen button, no falling notes, no lit keys, no loops); the staff
  appears on the result, marked. Demo scenes "Two-hand tapping" and "Rhythm echo".
- 2026-10-23: The growing tree (Ignas: "drop year1 year2 format, just mastery trees... a tree that
  grows"; "branch out theory and playing and pitch training and rhythm but combine them as starting
  points... prerequisites for one another"). Years and units are gone. `content/tree/` has one file
  per branch (technique, reading, rhythm, theory, ear, repertoire shown as Pieces, creativity), plus
  `milestones.yaml` (the trunk), `songs.yaml` and `stages.yaml` (nine stages, one milestone each).
  Requirements cross branches and never point to a later stage (nor to a milestone of the same
  stage). The old Year 1–2 nodes were restructured by hand (`tools/content/tree_base.py`); the old
  checkpoints are milestones 1–6, now also needing nodes from every new branch; milestones 7–9 are
  new. Nothing is locked (unchanged).
- 2026-10-23: Home is the tree (`src/ui/treeView.ts`): a drawn tree whose whole shape shows faintly
  from day one while colour grows along it (trunk with milestones, branches and leaves with nodes,
  buds where something is open, songs as blossom); "Growing now" (open nodes, at most two per
  branch); the Songs card; "The whole tree" by stage (current open, the next four nodes per
  branch). Pages: `#/branch/<id>` (nodes after what they need, with "Grows after") and `#/songs`
  (songbook shelves per milestone). Demo scene "Your tree".
- 2026-10-23: Songs section: public-domain songs (folk, carols, classics such as Ode to Joy and
  Greensleeves) and our own, each opening after a milestone and recommended there. A song has a
  rhythm tap, two-hand tap, by-ear echo, hands separately, together, other accompaniments, other
  keys and a performance take.
- 2026-10-23: Difficulty curve (Ignas: "should it at year 2 have one note at a time content?"):
  two hands from stage 1 (mirror hands, taking turns, held bass, two-hand taps); after stage 2
  nearly every playing exercise is hands together, with one-hand takes only as the first steps of
  a piece. Chords and cadences early; scales hands together from stage 3.
- 2026-10-23: Ear from zero ("assume the person has no pitch"): the ear branch starts with same or
  different (far, then closer), higher or lower, contour, step or leap, loud or soft, how many
  notes and two-note echoes on lit keys, and climbs through degrees, intervals (together, down, by
  playing), chord qualities to sevenths and sus chords, cadences, chromatic degrees and eight-note
  echoes (55 nodes).
- 2026-10-23: Rhythm branch (55 nodes): tap the beat to odd meters, two hands from stage 1, inner
  pulse with clicks only in the count-in, upbeats, syncopation, compound time, three against two,
  hemiola, swing; a "rhythm workout" per stage of generated reading and echo drills.
- 2026-10-23: Content ×6 (Ignas: "increase content by at least 500%"): 116 → 394 lessons, 308 →
  1848 exercises; estimated time to finish everything cleanly about 19 → 110 hours (played once:
  about 7 → 40 hours). Key studies and musicianship lessons for 23 keys, pieces as five-step
  ladders (tap, RH, LH, together, polish), études, songs with arrangements, reading and spelling
  drills. Generated by `tools/content/` (see `content/README.md`); G♯ minor is left out because
  the note parser has no double sharps.
- 2026-10-23: Full audit (Ignas: "someone who uses this a few hours a day should become a proper
  intermediate... build his ideas, think about composing"). Main before the audit's changes is kept
  as branch `rollback/pre-audit-2026-10-23` (f03b4d2; tag pushes are blocked from sessions). Gaps
  found: nowhere to play freely or keep an idea; improvising scored as tapping (any key counts);
  harmony stops at I, IV, V and progressions are never heard; no words for styles, periods,
  texture, modulation; dynamics and releases never scored. One PR per fix.
- 2026-10-23: Sketchbook (`#/sketchbook`, header link; `src/ui/sketchbookView.ts`). Free play with a
  tempo, meter, key and grid (eighths or sixteenths), click on or count-in only: a bar of count-in,
  then everything played is kept until Stop (64 bars at most) by `Recorder`
  (`src/engine/recorder.ts`) and written down by `transcribe` (`src/music/transcribe.ts`): onsets
  snap to the grid, notes that snap together are a chord, a note lasts to its release but never
  past the next note of its hand (a lift under 0.9 of a step early still counts as legato), right
  hand from middle C up on the treble staff, left below on the bass, ties over bar lines, rests in
  between, empty bars before the first note dropped, spelled in the key. Playback uses the take's
  own timing. Kept ideas are records `sketch.<id>` (title, memo, take and note strings; deleted =
  null), so they sync with an account; each opens at `#/sketchbook/<id>` with the staff, a memo,
  and "Practise it" (the idea as a timed exercise, `sketch-<id>`). Demo scene "Sketchbook".
- 2026-10-23: Improvising that listens (audit gap 2). New exercise kind `improvise`
  (`src/engine/improvise.ts`, `src/ui/improvise.ts`, format in `content/README.md`): the player
  makes up the notes inside a frame (lit scale keys, a chord chart the app plays, a call to answer,
  a rhythm) and the take is checked by rules (in the scale, chord notes on strong beats, start/end
  note, question and answer, repeat, sequence, contrast, steps, rests, variety, range, rhythm, bass
  roots, every bar played). Each rule is worth 0–1, the score is their average, and a take is clean
  only when every rule holds. The take is written on the staff and can go to the Sketchbook. No
  falling-notes view (nothing is written to fall). Every former tap improvisation (black keys,
  question and answer, C position, A minor pentatonic, blues) is now `improvise`, same ids. A
  composing path joins the creativity branch (`tools/content/compose.py`, runs after the other
  generators so older lesson files keep their numbers): motif, sequence, contour, full and half
  close, a tune over I vi IV V, the eight-bar period, both hands, minor, A B A, Dorian and
  Mixolydian, plus a blues head in AAB form; milestones 2–9 each need one composing node. Scales
  gain blues, dorian, mixolydian, lydian, phrygian. Demo scene "Improvising that listens".
- 2026-10-23: Harmony and musician's vocabulary (audit gaps 3 and 4). Ear items `function` (one chord
  after the cadence, named by Roman numeral, then resolved home) and `progression` (four chords, pick
  the progression), on `romanChord` / `voiceProgression` in `src/music/theory.ts`. Content
  (`tools/content/harmony.py`, runs after compose): ii, iii and vi; the common progressions played
  hands together (root in the left hand, voice-led chords in the right) and heard; chord function in
  major and minor; modulation; secondary dominants; the modes; texture; the four eras tied to the
  app's pieces; and how to talk about a piece (form, Italian terms, analysis). Milestones 6–9 now
  also need these. Demo scene "Hearing harmony".
- 2026-10-23: Dynamics scored from key velocity (audit gap 5). `dynamics:` on timed exercises, one mark
  per bar (pp to ff, `<` / `>` hairpins, `-`), in `src/scoring/dynamics.ts`. Judged relatively, since
  keyboards differ: a change of level must be heard as a change (median velocities, 7 per level, at
  most 24) and a hairpin must grow or fade through its own notes. A fifth of the take score; not
  scored (and said so) when every key has the same velocity, so the computer keyboard is never
  marked down. Drawn under the staff (marks and wedges) and next to the bar numbers in falling notes;
  the result card has a Dynamics line. Loops leave dynamics out. Content (`tools/content/expression.py`,
  technique branch): forte and piano echoes, crescendo and diminuendo, terraced dynamics, shaping a
  phrase; milestones 3, 4 and 6 need them. Demo scene "Loud and soft" (the pianist plays the
  crescendo flat).
- 2026-10-24: Intertwined tree (Ignas: "the tree seems very linear, not intertwined"; "you don't go
  learning ear in chords while you don't know how they are structured... there are prerequisites").
  Data: `tools/content/links.py` adds about 115 cross-branch requirements (181 → 295 between branches) by what each lesson uses
  (ear ← theory, technique and key studies ← theory and rhythm, reading ← theory and rhythm, pieces
  ← reading, rhythm, keys and harmony, creativity ← theory and ear), moves seventh-chord theory and
  ear to stage 7, and puts the modes theory before composing in modes. Screen: each stage on home
  opens as a woven map (`stageWeave`, a column per branch, a thread per requirement, pointing lights
  a node's threads); branch pages show every node's threads from other branches.
- 2026-10-24: Generated rhythms always have a rhythm to hear (Ignas: "Rhythm workout: first values, I
  can't hear the rhythm"; a run could draw a whole note in every bar). Only the last bar may be one
  note filling the bar, a line mixes at least two note values, and the bars before the last are
  never all the same (`rhythm` in `src/engine/generate.ts`; also used by sight-reading).
- 2026-10-24: Sound unlock (Ignas: "ear-same-different doesn't play sound"; it plays in desktop Chrome,
  so most likely a phone). `audio()` asks iOS to play like media (`navigator.audioSession.type =
  'playback'`, so the ring/silent switch no longer mutes the app) and resumes the context from any
  state but running (iOS also has 'interrupted'). Every tap and key press wakes the context, and the
  first also plays a silent buffer (older iOS needs it), since samples make the context before any tap.
- 2026-10-24: Clear progression (Ignas: "strange progression, what am I supposed to click? come back
  next day? it throws me to an initial lesson, but I have skipped"). The 2-day rule stays (a skill
  sticks after sleep) but never holds the path: a lesson is **played through** once every exercise
  has one clean take (`lessonStage`: new / started / through / done, `src/progress/index.ts`).
  The recap (`src/ui/recap.ts`) says it in words (Not finished yet / Played through / Lesson done),
  lists each exercise with what is left ("2 more clean takes, one of them tomorrow or later";
  `Store.reps` gives `left`, `later`, `today`), rows that can still count today play that exercise,
  and there is one main button: "Play / Practise again: <exercise> (n more clean takes)" until the
  lesson is played through, then "Next lesson: <title>". Next = the next open lesson of the same
  branch not yet played through, else the growing edge; lessons whose recap was reached with no
  take are noted as skipped (`path.skipped`, cleared by a take) and suggested last in their stage.
  The edge balances branches by lessons played through. Today's practice puts played-through
  lessons with takes still owed today first, and those waiting only for tomorrow last. The result
  line says when an exercise can count nothing more today. Demo scene "Clean takes and the path".
- 2026-10-24: My songs (Ignas sent a MIDI file of a song he wants in the app; shipped songs stay
  public domain, so his file is never committed). `#/mysongs`, linked from the Songbook page:
  import a `.mid` from the device, read in the browser by `parseMidiFile` (`src/music/midiFile.ts`;
  running status, note-on 0 as release, SMPTE files refused). `readSong` / `writeSong`
  (`src/music/importSong.ts`) make one part per track and channel (drums dropped), take the first
  tempo (counted in the meter's beat), time and key signature (changes flattened, and said so),
  write on eighths when ≥95% of onsets fall on one, else sixteenths, and give the highest part to
  the right hand and the lowest to the left (one part: split at middle C; extra parts left out);
  the player can change who plays each part, before and after import. Written with `transcribe`
  (which now takes a `hand` per note). Records `mysong.<id>` keep the parts (≤4000 notes) and the
  song as written, not the file, and sync like sketches. A song plays as a timed piece (falling
  notes or sheet, per-hand scoring, tempo ladder 50–100%, looping bars) as both hands
  (`mysong-<id>`) or one (`-right` / `-left`), reps 3 on 2 days. Demo scene "My songs" imports a
  generated Ode to Joy file (`demo.midiFile`) and plays it.
- 2026-10-24: "Where Is My Mind" (Pixies, 1988), Maxence Cyrin's piano version, added to Songs at Ignas's
  explicit request, **overriding the public-domain rule for this title only** (he was told it is under
  copyright). Transcribed from his two-track MIDI (E major, 4/4, quarter = 72 as recorded (the file says 120); fermatas left out, the
  32nd-note turn as two sixteenths, one empty bar dropped; 43 bars) in `tools/content/wim.py`. Unlike the
  one-lesson songs it is a ladder of seven song lessons, each a `songs` node needing the one before plus
  cross-branch requirements: 1 the riff (stage 4: tap, riff, bass roots, together), 2 the four chords
  E C♯m G♯ A = I vi III IV (B♯ = the key C; build, ear progression and function, held chords, bass and
  chord, intro), 3 the verse (sixteenth syncopation tapped first, echo, roots, then bass and two-note
  chords), 4 the "ooh" and the break (A minor borrowed, B major; first half of the song), 5 the rolling
  left hand (root–fifth–tenth–fifth, fifths first; second verse), 6 the chorus (turn, sixteenth runs,
  octaves), 7 the whole song in three versions (bass notes, bass and chord, full arrangement with the
  tempo ladder) and a pedalled performance. No lyrics anywhere. Demo scene "A song in steps".
- 2026-10-24: My songs tempo (Ignas: "too fast, the midi file is supposed to be 72 bpm"; his file
  says 120, a common default). The import screen has a Tempo box filled from the file, with a
  note that files often carry a made-up tempo, and each song page has "Song tempo" (saved on the
  song; the tempo ladder and records count from it). Tempo changes inside a file stay flattened.
- 2026-10-24: Songs taught in steps are one song (Ignas: "it shouldn't be 7 different songs, it should
  just have steps to learn"). Tree nodes take `song: <id>` (the whole-song node); the Songbook lists
  such a song once, on the shelf of its first step, with "Step n of m", and opens `#/song/<id>`
  (`songPage`): the steps in order, each a lesson with its badge and "Best after Milestone N" while
  that milestone is not grown. A step's lesson says "Song · step n of m" and links back there, and its
  recap's Next goes to the next step not played through. `songOf` / `stepTitle` in `src/content`.
  Where Is My Mind's six earlier steps point at `song-wim`. Demo scene "A song in steps" opens on the
  song page.
- 2026-10-24: Clickable step bar (Ignas: "make the progress bar clickable to skip also, and show
  progress if it's done as marked"). The bar at the top of a lesson (`src/ui/stepBar.ts`) is a row
  of buttons, one per step plus the recap: tapping (or Enter on) a segment jumps there, forward or
  back; leaving an exercise stops it, and its takes are already saved. Segments are marked green
  when the exercise is done, pale green after a clean take, grey once a theory screen was seen;
  the current step keeps its mark as a line under it. Each has a tooltip and label ("Step 4: C, E
  or G? (clean take, not finished)"). The marks update right after a take. Demo scene "Clean takes
  and the path" shows the marked bar.
- 2026-10-24: The Book (Ignas: "the theory is really not sufficient, it should have texts to read to
  understand; core understanding of music is not 1 paragraph per lesson"). `#/book` (header link):
  theory as a textbook of chapters in parts that follow the tree's stages, about 1,000 words each,
  written for real (what, why, how it sounds and looks, history, common confusions, links to
  playing, ear and rhythm, "In short"), with playable staff and key pictures and quick checks in the
  text. Content in `content/book/` (`book.yaml` + one Markdown file per chapter, format in
  `content/README.md`); loaded by `src/content/book.ts`, drawn by `src/ui/bookView.ts`. A chapter's
  `lessons` open with it: a `read` step is put first at load time (the whole chapter the first time,
  a short "Read it again" card once read). Reaching the end of a chapter, or leaving its lesson
  step, marks it read (`book.read`, synced; the demo never saves). Staff pictures take `meter`
  (time signature and bar lines). Written in chunks, one PR per part group. Demo scene "The Book".
  Complete for stages 1–9: 9 parts, 65 chapters, about 73,000 words (first- and second-year
  music-school theory: notation, rhythm and meter, intervals, scales and every key, chords to
  sevenths, cadences, modulation, secondary dominants, non-chord tones, form up to sonata, the
  eras, analysis, blues and swing, melody writing, modes, polyrhythm, hemiola, odd meters). Theory
  pictures draw one line of notes, so two hands with different rhythms are shown one after the
  other (or as two pictures), never stacked.
- 2026-10-24: Accounts switched on. Supabase project created by Ignas (free plan, SQL from
  `docs/supabase.sql`). Its URL and publishable key are repository **secrets** `SUPABASE_URL` /
  `SUPABASE_ANON_KEY` (Ignas: keep the key out of the repo's files), read by `pages.yml` at deploy
  time; variables of the same names also work. Sign-in is by email link only.
- 2026-10-24: Keys and the way forward (Ignas: "spacebar pauses and resumes, next lesson should also
  be visible at the top and enter key should do it"). Space plays a timed exercise, and while it
  runs pauses and resumes it (also a Pause / Resume button): `TimedSession.pause` holds the clock
  (position, live score, presses and pedal ignored), `resume` moves the whole schedule on so the
  music picks up at the beat it stopped, after a bar of count-back clicks (or the rest of the
  count-in when paused before the downbeat). A take with a pause is practice: shown, never saved.
  Space is left to the computer keyboard's pedal only in exercises with a pedal line, and is
  ignored in form fields and for real keys during the demo. In a lesson the forward button is
  mirrored at the top next to the step bar (Next / Skip on a step, Next lesson on the recap), and
  Enter presses the main (non-secondary) button, unless a control was reached with the keyboard
  (a clicked or tapped button doesn't keep Enter). Demo scene "Pause and keys".
- 2026-10-24: Wipe progress (Ignas: "add a wipe progress button"). On the Profile's account card, with
  a confirm step that says what goes and what stays. It deletes every progress record (takes, stars,
  XP, streak, practice log, reviews, path, ladder, Book reads) on the device and, when signed in, in
  the account: a DELETE of the account's rows except `sketch.*` and `mysong.*` (the player's own
  work), then a `wiped` row with the time. Devices that synced before it wipe on their next sync; a
  device signing in for the first time later keeps its guest progress. Calibration and settings
  stay. Offline, nothing is wiped. `wiped` never syncs as an ordinary change. Demo scene "Guest or
  account" ends with a wipe.
- 2026-10-24: "Can't Help Falling in Love" (Elvis Presley, 1961) added to Songs at Ignas's explicit request,
  **overriding the public-domain rule for this title too** (the coordinator flagged the copyright; its tune
  comes from Martini's "Plaisir d'amour", 1784, which is public domain). No MIDI could be downloaded from
  the session (MIDI sites are blocked), so the melody was checked against published letter notes and chord
  charts and written as **our own arrangement** in `tools/content/chfl.py`: **D major** (Ignas: "do it in D
  major key", Elvis's key), 6/8, dotted quarter = 66, verse ×2, bridge, last verse and the closing line again
  (66 bars). Verse chords I iii vi IV V (D F♯m Bm G A); bridge F♯m–C♯7 (secondary dominant) ×3, then F♯m B7
  Em A7. Left hand three ways (roots; bass and chord; rolling eighths), kept under the tune's lowest note;
  the script checks that no key is held by both hands at once. Seven steps under `song: song-chfl` (the tune,
  the chords, the verse with both hands, the bridge, the rolling left hand, the ending and the pedal, the
  whole song in three versions plus a pedalled performance), stages 6–8, each needing a milestone and
  cross-branch nodes (6/8, compound time, D major, ii/iii/vi, accompaniment, B minor, the dominant seventh,
  arpeggios, legato pedal, secondary dominants). No lyrics. The demo's "A song in steps" scene already
  covers songs taught in steps, so it is unchanged.
- 2026-10-24: Space never presses a button (Ignas: "space both starts and skips to next"). The top
  Next button keeps focus after a click, and Space on a focused button presses it in browsers, so on
  a step without Play, Space skipped on. `guardSpace` (`src/ui/keys.ts`, used by the lesson and
  exercise pages) holds back Space on focused buttons, links and checkboxes (keydown and keyup);
  Space stays Play / Pause / Resume and the computer keyboard's pedal, Enter still presses buttons.
- 2026-10-24: Phone on its side = falling notes only (Ignas: "on phone it must really be just the
  falling notes when its in landscape"). When `PHONE_LANDSCAPE` matches (landscape, short side ≤
  500 px, touch: `hover: none` and `pointer: coarse`; media query, no user agent), timed (not echo),
  step-by-step and find-the-key exercises switch to falling notes (without changing the saved view
  pick) and move into a full-screen layer (`src/ui/fullScreen.ts`): 100dvh, safe-area padding
  (`viewport-fit=cover`; pages keep side insets as before), page underneath set aside. No header,
  step bar, options, ladder line or sheet strip; the falling view fills the height (keys at most a
  third). The live score (or the question) stays small top left; a tap on the notes shows Listen /
  Play or Pause / Stop, Next (mirrors the lesson's top button) and ✕ Leave full screen, hiding
  again after 3.5 s while a take runs (always shown when idle or paused). The result shows as a
  card over the notes. ✕ lasts until the phone is turned upright again. Space and Enter work as
  before. Not used in the demo except its "Phone on its side" scene, drawn in a phone frame.
- 2026-10-24: Lessons no longer jump back to step 1 (Ignas: "after listening if you press space or ok it
  throws back to stage 1"). Not the keys: when signed in, every sync a few seconds after a change pulled
  back the player's own records within the 1-minute overlap, and since Postgres `jsonb` hands objects back
  with their keys reordered, the text differed and the sync said "progress came in", which redrew the
  page and restarted the lesson. Sync now compares records by value (`sameValue`, key order ignored),
  and a sync never redraws a lesson page (home, Today and Profile still redraw).
- 2026-10-24: The piano is the main attraction (Ignas: "once you are looking at the piano it's in the
  focus, as big as possible"; "like screens that lock into segments when you scroll: one is theory,
  the other the exercise"). A lesson fills the window (`lessonView`, site header hidden): a slim bar
  (✕ leave, title, ‹ Intro on exercise steps, step count, the top Next, the step bar) over a column of
  full-height panels, one per step plus the recap, that snap into place as it scrolls
  (`scroll-snap-type: y mandatory`). Only the panel in view is built; the others show their step's
  name and keep their height. Scrolling by hand settles on the panel across the upper part of the
  window (moving forward counts as leaving, so a chapter is marked read); Next, Back, the step bar,
  Intro and the recap's rows scroll to their panel. Intro panels read like a page (a long chapter
  scrolls inside its panel, then snaps on); the last one's button says "Start playing". An exercise
  panel is exactly the window: header, transport, view switch and Options (now a pop-over) in one
  slim row, ladder line, status and live score in the next, then the stage takes the rest (falling
  notes fill the height, keys at most a third; on the sheet view the staff fills the space above the
  keys; a keyboard alone is as big as it fits; a quiz with nothing to play sits big in the middle).
  The result card comes up over the stage. While a take runs the lesson does not scroll. Space never
  pages the lesson. `#/exercise/<id>` uses the same exercise panel. The phone-on-its-side full screen
  is unchanged. Demo scene "A lesson in panels".
- 2026-10-24: Finger numbers on the falling notes (Ignas: "should we add which finger should play what in
  falling piano?"). Each falling note carries its finger in a dark chip at its front edge (shown even on short
  notes and in the phone's full-screen view; the note name sits above it when there is room). Chords get a
  finger per note (`chordFingers`), stacked on the sheet like the notes (highest note's number on top). Where
  a hand has no written fingering (about 700 exercises), the loader fills in a suggested one
  (`suggestFingers`, `src/music/fingering.ts`): a line that fits under the hand (≤ 5 keys within a minor
  sixth, no chords) stays in one five-finger position, lowest key on the right thumb or the left fifth finger;
  anything else is a dynamic-programming search over finger spans (after Parncutt), thumb passing, reused
  fingers, hand moves and thumbs on black keys. It agrees with 95% of the hand-written fingering in pieces and
  studies (`tests/fingering.test.ts` guards ≥ 90%). Written fingering always wins; taps get none; sketch and
  My songs pages show their staff without fingers. Options → Fingers (`settings.fingers`, unset = on,
  remembered like the other options) switches them off on the notes, the sheet and the lit keys. Demo scene
  "Fingers on the notes".
- 2026-10-25: Pachelbel's Canon (public domain) as two songs taught in steps (Ignas: "add canon in d same as where is
  my mind and cant help, a simple version for stage 2 progress and one for later"), our own arrangements in
  `tools/content/canon.py`. **Pachelbel's Canon, easy** (`song-canon-easy`, stage 2, after milestone 1): moved to
  **C major** so every key is white, 4/4 at 72; the ground C G A E F C F G in half notes (left hand in one stretched
  position), close-shape chords, three lines of tune (two falling by step in half notes with one written hand shift each,
  one in quarters in C position), all fingering written; five steps (the bass, the chords, the tune, both hands, the
  whole piece of 17 bars). **Canon in D** (`song-canon`, stages 5–7, needs the stage 4 piece "Canon in D: the theme"):
  D major, 4/4 at 60; the ground in quarters, then root and fifth in eighths; the lines in quarters, the eighth line,
  the sixteenth run and the singing line (eighth and two sixteenths, then scales), the first lines again and a D chord
  (19 bars); six steps (the ground and its chords with the I V vi iii progression by ear, the first lines and the canon
  idea, the eighths, the run, the singing line, the whole canon in two versions plus a performance with a pedal change
  on every bass note). Every step needs the milestone before its stage plus cross-branch nodes. The script checks that
  tune notes starting with a bass note belong to its chord (the singing line's passing notes excepted) and that no key
  is held by both hands. Play buttons in theory screens play both hands (`together`). The demo's "A song in steps"
  scene already covers stepped songs, so it is unchanged.
- 2026-10-25: Modules (Ignas: "imagine if piano is one of iggyuoso modules... another module, for
  example math tutor or painter... shared account, same website... when you swap modules content in
  bar changes"). The site is now a shell (`src/app/`: header, module switcher, router, shared
  Profile / Settings / Demo pages) around modules (`src/modules/<id>/`, each a `Module` from
  `src/core/module.ts`: id, name, icon, tagline, routes with a home, header links, profile and
  settings parts, demo, records rules, activate / deactivate). Shared code is in `src/core/`
  (storage, account and sync, account card, theme, Appearance). The whole piano app moved, unchanged,
  to `src/modules/piano/`; its addresses and saved records keep their old names (no migration, no
  change on the account), and it starts MIDI and the computer keyboard only while it is open.
  New modules use `#/<id>/<route>` and `iggyuoso.<id>.*` records, which sync on the same account;
  merge rules, what a wipe keeps and upgrades come from each module (`src/core/records.ts`); the
  schema version is app-wide. The open module is saved on the device (`iggyuoso.module`). The
  Profile shows the account card, the open module's part and a line per other module with
  progress; "Wipe progress" clears every module. A sample module "Sums" (five additions, best
  round saved), marked Sample in the switcher, proves the switch and is to be replaced. Phone
  header: icon-only links up to 860 px wide, logo mark only under 440 px. Demo scene "One app,
  many modules". How to add a module: `docs/modules.md`.
- 2026-10-25: Options never covers the result (Ignas: "overlap", a screenshot of the Options pop-over
  over the take's result card). In a lesson panel the Options pop-over shuts when a take starts
  (Listen or Play), when a result comes up, and on a tap outside it (closing it this way saves it
  closed, like a click). The result card starts where the stage starts (`--result-top`, set by
  `keepResultClear` in `src/modules/piano/ui/players.ts`), so the controls row stays clear; Options
  opened again over a result moves the card down below it. Outside the panels (the demo) the
  drawer is unchanged.
- 2026-10-25: Hands on the keys, beta (Ignas: "lets show a visualization of hand placement not only finger
  numbers"). Both hands are drawn over the keyboard, in falling notes (canvas, also the phone's full screen)
  and on the keyboard under the sheet (SVG): a palm along the front edge and five fingers reaching to the keys
  they rest on, the thumb shorter and from the side, finger numbers on the tips (left off with Options →
  Fingers). The finger playing lights up, the one that plays next is ringed, and the hand slides to a new
  place in the last part of the gap before the note that needs it (at most ¾ of a beat). Positions come from
  the fingering already there (written or suggested, `src/modules/piano/music/handPlacement.ts`, tested): at
  each onset the played fingers sit on their keys; the others rest where the hand will need them next (up
  to 24 onsets ahead while nothing has to move and fingers stay in pitch order within a ninth), else where
  they were, else on white keys beside their neighbours. Drawn by `src/modules/piano/ui/hands.ts` (one
  outline around palm and fingers). Options → Hands (beta) (`settings.hands`, unset = on, remembered); step-
  by-step exercises follow the same setting. Not shown for taps, echoes, a reading drill's keys while it is
  played, or step-by-step reading from the sheet (the hand would give the key away). Demo scene "Hands on
  the keys (beta)".
- 2026-10-25: Chord names on the sheet (Ignas: "on sheets if its a chord add a note on top"; read as a
  lead-sheet chord symbol over the staff). Wherever notes sound together as a chord, its name (C, Am, G7,
  F♯m, Bdim, Fmaj7...) is written over the upper staff, in the sheet view, the sheet strip over the falling
  notes, Sketchbook ideas and My songs. Named by `chordSymbols` (`src/modules/piano/music/chordNames.ts`,
  tested) from both hands together: any inversion is named by its root (no slash chords), the root keeps
  its written spelling, held notes and a lone bass struck just before (bass then chord) count, a melody
  note on top makes no new chord (6, sus and aug only from one hand's own chord), and a name is written
  only where the chord changes (notes that all belong to the chord before stay that chord, so a boogie bass
  under E B♭ reads C7). The labels rise over high notes and their fingers. Options → Chord names
  (`settings.chords`, unset = on, remembered like Fingers; shown only when the exercise has chords). Not on
  taps, nor on drills with a `goal` (reading tests), where they would give the chords away. Theory pictures
  and quiz staves have none. Demo scene "Chord names" (the easy Canon's chords over the bass).
- 2026-10-25: Practice mode with bar sliders (Ignas: "make the bar slider on sheet music with final notes
  slideable... in every play there is a play lesson but there is also practice... use sliders to set the
  repeating loops"). Every timed exercise (not echoes) has a Scored / Practice switch before the transport.
  Scored is the take as before (records, clean takes, ladder, XP). Practice saves nothing: Play goes round the
  chosen bars until Stop, each round shown as a small result (score, stars, the main habit) and a chip in a
  row of the last 8 scores; the sheet keeps the round's marks; tempo, count-in, click, guide, fingers, hands
  and Pause still work. The bars are picked with a bar slider over the stage (a cell per bar, a handle at each
  end, drag or tap, arrow keys; `src/modules/piano/ui/barRange.ts`) and with the same handles on the sheet's
  bar lines (bars outside fade, bar numbers on top); both views and the falling notes' sheet strip show the
  whole piece, and the falling notes play only the bars picked, numbered as in the piece. Changing the bars
  while practice goes round applies from the next round. On a phone on its side the switch sits with the
  controls and the slider under them. The result card's "Practise bars 2–3" opens Practice on those bars;
  Options no longer has the "Loop bars" selects. Mode and bars are remembered per exercise until the page
  reloads (not in the demo). `sliceMap` (`engine/practice.ts`) maps a slice's notes back onto the whole
  sheet; `sliceBars` now cuts the pedal line too. Demo scene "Practice mode"; "Tempo ladder and loops" uses
  the new button.
- 2026-10-25: Chord names on the falling notes too (Ignas: "can we do an indication on the falling ones as
  well... C E G falling but it also indicates c major"). The same chords as the sheet (`chordSymbols`) ride
  down in a pill beside the notes that strike them (left of the group, right of it at the lane's edge) and
  land with them on the hit line, in words for triads (`chordWords`: C major, F♯ minor; G7, Bdim stay as
  written). Same Options → Chord names switch and the same exceptions (taps, reading tests). Practice mode
  names the chords of the bars being practised. Demo scene "Chord names" now plays in falling notes.
- 2026-10-25: UX review fixes (Ignas: "test and review ux"). Phone header: with the computer keyboard on,
  the pill shows only ⌨ under 560 px and links are tighter under 440 px, so Settings and the theme
  button no longer fall off the edge. In lesson panels the Options pop-over never opens by itself
  (the remembered open state is only for the drawer outside lessons). Computer-keyboard letters on
  white keys sit just above the black keys' ends, so the hands (beta) no longer cover them. Steps
  not reached yet show on the step bar (they were invisible on the dark lesson page). Home says
  "Start: <lesson>" for a lesson never played ("Continue" once started). The demo scrolls to the
  scene being played (the scene list is long), also from "Watch any exercise".
- 2026-10-25: Previews (Ignas: "every hour you come up with something, make an environment where I
  can test it and I say go or no to go into main"). Every open pull request labelled `preview` is
  built into the same Pages deployment at `preview/pr-<n>/` (`tools/previews.sh`, run by
  `pages.yml` on pushes to main and, through `preview-trigger.yml` and `workflow_run`, whenever such
  a pull request changes; only main may deploy). Same-repo branches only. A preview is guest only
  (no account server) and stores its data under `iggyuoso-preview-pr-<n>.`, copied once from the
  main site's records (not the account) when first opened (`src/core/preview.ts`); a corner tag
  says "Preview" and links back. Ideas wait there, unmerged, for Ignas's go (merge) or no-go
  (close); several can be live at once. Log: `docs/ideas.md`. How-to: `docs/previews.md`.
- 2026-10-25: Docs brought up to date and developer docs added (Ignas: "is the vision updated and
  docs up to date? can we add docs explaining how it's programmed and how it works"). New
  `docs/vision.md` (current vision) and `docs/README.md` (index, linked from README and here);
  `docs/dev/` explains the app for a non-expert owner: architecture, content and generator, input
  and timing, scoring, drawing, progress and sync, build and test, how-to recipes. Stale bits fixed:
  `content/README.md` no longer lists units and describes Practice mode instead of loop boxes, the
  curriculum's engine wish list is marked done, the beta proposal is marked historical. Rule: a PR
  that changes how something works updates its `docs/dev/` page.
- 2026-10-25: Note Rush, a mini game (idea #1 of the hourly ideas): `#/noterush`, a card on home. A
  note shows on the staff (the next three faded after it); play it before its time bar runs out.
  One-minute rounds; white keys from the clef (treble, bass, both on a grand staff) and level (C
  position, the whole staff, with ledger lines). A streak shortens each note's time (6 s, −0.25 s a
  note, at least 2 s) and raises its points (×1, +1 every five in a row, at most ×5); a wrong key
  ends the streak. The result gives notes found, accuracy, middle time and the three slowest notes.
  Best score per clef and level saved as `game.noterush` (synced). Engine `engine/noteRush.ts`
  (tested), screen `ui/noteRush.ts`. Demo scene "Note Rush" (a 16 s round).
  After Ignas's try ("make it slide via the sheet like guitar hero... the jumps are too hard to
  see"): by default the notes slide along the staff, a gap apart, to a line at the left; a note
  that reaches the line is missed, a gap takes the note's time, so a streak speeds the music up;
  playing ahead is fine, and then the notes catch up until the next is a gap away (a gap per
  0.3 s). "Notes jump in place" (the first version) stays as an option (`settings.noteRushMode`).
- 2026-10-25: Hourly idea 2, **Chord finder** (Ignas: go, "for now implement all"). `#/chords`, linked
  from the Book and the Sketchbook: hold down any keys (or tap them on the picture, where a tapped key
  stays down until tapped again) and the page says what they make: the chord in words and as a symbol
  (triads, sus, sixths, sevenths, half-diminished, diminished seventh; the bass decides between two
  readings), what kind of chord it is, its notes spelled from the root (C E G B♭, F♯ A♯ C♯; G♭ aug
  rather than a double sharp), its position (root position, first, second, third inversion) and what each
  key is to the root, on the grand staff. Two notes are named as an interval, one as a note. Buttons
  play the chord in each position and the chords one change away (minor / major, 7, maj7, sus4, m7,
  dim); the last 8 chords found are chips to play again. Nothing is saved. `music/chordFinder.ts`
  (tested), `ui/chordFinderView.ts`. Demo scene "Chord finder".
- 2026-10-25: Chord finder, round 2 (Ignas: "give me also ability to write the chord name and it finds it,
  like a constructor, i dont want to type # or flat symbol"; "A-flat major and G-sharp major sound the
  same... how to address multiple chords under one?"). A constructor at the top: type a name and the
  chord is built on the keys from middle C up (`parseChordName`: any case and spacing, # / s / is /
  sharp (also half typed) and b / flat / es for the accidental, kinds by symbol or in words: m, min,
  minor, -, maj7, M7, dom7, dominant seventh, half diminished, ø, o, +, sus...), with suggestions as
  it is typed (`suggestChords`; Enter or a suggestion plays it), or pick one of 12 roots and 12 kinds.
  Keys that go by several names show one main name (the spelling usual in keys: A♭ rather than G♯,
  F♯ for minor-type chords; the bass decides between readings such as C6 / Am7) and the others as
  buttons under "The same keys also go by" (`allReadings`: other spellings without double sharps or
  flats, then other roots, so each note of a diminished seventh); a tap respells the name, staff and
  notes. "Found in" lists the major and (harmonic) minor keys whose scale holds the chord as spelled,
  with its Roman numeral there, home chord first (`keysOf`: A♭ = A♭ major (I), D♭ major (V)...; G♯ = C♯
  major (V), C♯ minor (V)). The demo scene also types "f sharp minor" and "ab" and switches to G♯.
- 2026-10-25: Timing mirror (hourly idea 3; Ignas: go). `#/pulse`, linked
  from the Profile's Timing card and the Sketchbook: a metronome that listens. Tempo (±4, tap
  tempo), beats in a bar (2, 3, 4, 6), presses on beats or beats and halves, silent bars (2 on 2
  off, 3 on 1 off, 1 on 1 off). Each press is matched to the nearest beat after latency
  (`engine/pulse.ts`, tested), hands split at middle C, a hand's chord counted once. Shown as dots
  around "on the beat" (one row per hand, last 12, hollow in silent bars, ±150 ms or half a step),
  a timeline of the last 40 presses, and per hand its lean and steadiness (from clicked bars, last
  24) plus whether it rushed or dragged in the silent bars. Nothing is saved. Demo scene "Timing
  mirror".
- 2026-10-25: UX review, second round (Ignas: "yeah implement all so its better"). One tempo message: the
  result card no longer says "Takes count at full tempo" and "Records count from N bpm" next to the
  ladder; the clean-takes line says "Only takes from N bpm count toward them; this one was slow
  practice", a clean take on a ladder step says so ("clean take at 60%, 2 of 3 to move up"), and the
  ladder line adds "The lesson's clean takes count from 90%" while below it. The recap says "at 90% of
  the full tempo or faster". In lesson panels the result card has "See the marks", which folds it
  to its score in the corner so the marked sheet or notes show ("Show the result" opens it again;
  each new result opens in full). The lesson's top button on the recap mirrors the recap's main
  button (Play / Practise again until played through, then Next lesson). Phone upright: the
  exercise controls are three slim rows (hand and Scored / Practice; the transport; Sheet /
  Falling and Options), with short view labels. Among equally open lessons the path suggests the
  one whose Book chapter comes first, so a new player starts at chapter 1 ("High and low") rather
  than chapter 3. Finger numbers: the left hand is pictured where the drill puts it (thumb on
  middle C). Sample modules (Sums) stay out of the header's switcher; they still open by address
  and in the demo. Demo scene "A lesson in panels" folds and opens the result.
- 2026-10-25: Jam room (hourly idea 4; Ignas: go, "for now implement all"). `#/jam`, linked from the
  Sketchbook: a band loops a progression while the player improvises. Chords: pop I V vi IV, 50s
  I vi IV V, 12-bar blues, the Canon, minor i VI III VII, Dorian i7 IV7; a key (8 major or 7
  minor); groove Ballad / Pop / Swing (synthetic kick, snare and hi-hat, `drum` in `audio.ts`;
  bass and chords on the sampled piano); tempo. One bar of count-in clicks, then it loops until
  Stop; changes apply from the next bar. The chart lights the bar playing, the keys light its chord
  (bright) and the rest of the suggested scale (soft) an eighth before the change, and each note
  played is counted as a chord note, in the scale, in the key or outside (a note in the last eighth
  of a bar counts with the next chord), plus how often beat 1 lands on the chord, with a tip
  (`engine/jam.ts`, tested). Nothing is saved. Demo scene "Jam room".
- 2026-10-25: Scale gym (hourly idea 5; merged directly under Ignas's "for now implement all"). `#/scales`,
  linked from the Timing mirror and the Profile's Timing card: major, natural / harmonic minor,
  chromatic, major / minor arpeggios, in any key (minor ones and arpeggios on white-key tonics), right,
  left or both hands (the left hand as many octaves below as the run is long), one or two octaves,
  1 / 2 / 4 notes a click, tempo; Listen plays it. Keys show **textbook fingering** (`gymFingers`, not
  the suggested-fingering search, which picks odd fingerings over two octaves). One bar of count-in,
  then up and back down; each note is matched to its place (`engine/scaleGym.ts`, tested) and drawn on
  a chart (late above, early below, ▲ at thumb passes, × for missed). Per hand: lean, evenness, thumb
  passes against the other notes, loudness spread and a bumping thumb (only with real velocities), the
  notes furthest off, and at most two tips. Score: each note full within 20 ms, nothing at half a step
  (60 to 100 ms). Nothing is saved (best per setup until reload). Demo scene "Scale gym".
- 2026-10-25: Play by ear (hourly idea 6; merged directly under Ignas's "for now implement all"). `#/byear`,
  a second button on home's Mini game card: the app plays the opening of a public-domain tune (20: nursery
  and folk songs, carols, Ode to Joy, Brahms's Lullaby, Greensleeves, Korobeiniki, Für Elise; easy, medium,
  hard), lights its first note, and the player finds the rest one note at a time. A wrong key says higher or
  lower than it; from the second, also how far the tune moves from the last note found (a step, a skip, a
  leap); the right note in another octave is pointed out, not counted; playing from the start (or the last
  note found) again is never a guess. Hear it all, Hear the next notes, Show me (no credit). Notes found are
  written on the staff; at the end the score (1 / 0.6 / 0.3 / 0.15 by try, 0 shown), first-try count, where
  the tune comes from and a playback. Near middle C or on any key (C D F G A B♭, spelled letter by letter);
  mystery mode hides the name. Rhythm is not judged. Nothing is saved (`engine/byEar.ts`, tested;
  `ui/byEarView.ts`). Demo scene "Play by ear".
- 2026-10-25: Scale gym, round 2 (Ignas: "only set tempo mode is not good enough... a mode where it picks
  up your wanted tempo and just records and says how good you were... where you were late and where you
  hurried"; "it could recognize the scale you're doing"; "two hands scales (zoomed out)"; and a bug:
  "selecting other scales bugs out and you can't restart, it says coming down"). Modes: With the click
  (as before), **Free tempo, any scale (recognised)** and Free tempo, the scale picked. Free tempo has no
  count-in or click: the first right note starts, 3 s of silence (or Stop) ends; the tempo is the
  middle gap between notes, each note's gap is measured against the beat around it (up to four gaps
  either side), so held-back and hurried notes stand out without blaming a gentle drift; it also says
  the tempo going up and coming down and, with both hands, which hand lands first. `recognise` names
  the scale from the notes (kind, key, one hand or both, one or two octaves; closest line by edit
  distance, at most 35% different), puts it on the keys and in the boxes, and measures it.
  "Practise at N with the click" carries the found tempo over. The keyboard never grows taller than a
  third of the window, so two hands and two octaves stay in view. Bug: `animate` (now
  `ui/animate.ts`) kept asking for frames when its drawing stopped it, so a run that ended on its own
  kept running; it now stops for good, and changing any setting fully resets the page. Tested.
- 2026-10-25: Play report (hourly idea 7; merged directly under Ignas's "for now implement all"; after his
  Scale gym ask for modes that pick up your own tempo and say where you were late or hurried, here
  for anything played). `#/report`, linked from the Profile's Timing card, the Timing mirror, the Scale
  gym and the Sketchbook. No click and no settings: the page always listens, the first key starts a
  take, 5 s with no key down (or Finish) ends it. `engine/playReport.ts` (tested) groups notes within
  60 ms, finds the grid step (the shortest common gap, fitted to the gaps that are whole steps; the
  beat is it doubled to at least 430 ms), follows a drifting tempo, reads short notes as half or
  quarter steps and dotted rhythms as written, and sets each gap against the middle step of up to six
  gaps either side: over 20% of a step (45 to 120 ms) longer = held back, shorter = hurried; a gap over
  five steps and 1.5 s = a stop. Report: tempo and its curve (sped up / slowed down: first third
  against last, ≥ 4 a minute and 6%), every note charted, the biggest held-back and hurried notes,
  each hand's spread (worst tenth left out) and which hand lands first, the key (Krumhansl–Kessler,
  runner-up when close), the chords (the sheet's `chordSymbols`) with Roman numerals, loudness when
  velocities vary, up to three tips, Play it back, and "Timing mirror at N". Nothing is saved. Demo
  scene "Play report".
- 2026-10-25: Scale gym key box fixed (Ignas: "the key selection dropdown doesn't work"). Reading the boxes
  rebuilt the key list for the scale kind before reading the key picked, which put the old key back, so a
  new key never took (in every mode, since the first version). The key picked is now read first and kept
  unless the kind has no such key here (`pickRoot`, tested).
- 2026-10-25: Duet (hourly idea 8, the last; merged directly under Ignas's "for now implement all"). `#/duet`,
  a third button on home's Mini game card: the player plays a public-domain tune's melody (11 of Play
  by ear's tunes, each given a chord per bar or half bar) and the app plays the left hand on the
  sampled piano (held chords, bass and chord, or rolling eighths) and **follows the player**: nothing
  sounds before the first note, the band keeps to the player's tempo (learnt from each gap; a gap
  over 1.5 beats of the tempo is the band waiting and teaches nothing) and never plays at or past the
  next melody note until it is played; band notes run past are dropped. The right note an octave away
  counts; keys more than a fifth under the tune are ignored. The next note is lit (switchable). The
  report sets each gap against the player's own beat around it: held back over 0.25 of a beat,
  hurried over 0.2, waits marked; score (full within 0.08 beat, none at 0.5, −3 a wrong key), tempo
  start and end, up to three tips. Nothing is saved (`engine/duet.ts`, tested; `ui/duetView.ts`).
  Demo scene "Duet".
- 2026-10-25: The eight hourly ideas are kept (Ignas: "sure add all", after the run's wrap-up; any can
  still be cut later) and become the **practice room**, part of the app rather than loose pages. One
  list (`ROOM`, `src/modules/piano/ui/practiceRoom.ts`, tested): three games (Note Rush, Play by ear,
  Duet) and five tools (Chord finder, Timing mirror, Scale gym, Jam room, Play report), each with a
  one-line description, a branch (reading, ear, pieces, theory, rhythm, rhythm, technique, creativity)
  and the milestone it is best after (none for Note Rush, Play by ear and Timing mirror; 1 for Duet,
  Chord finder and Play report; 2 for Scale gym and Jam room; advice only, nothing locks). Home's
  "Mini game" card is replaced by a "Practice room" card with all eight (after Songs); each branch
  page ends with its own ("In the practice room"); a lesson whose tree node is listed for a tool
  says "Also try, in the practice room: ..." on its recap (at most two). Every page's heading
  carries "Practice room · Game" or "· Tool". Their addresses are unchanged. Demo scene "Practice
  room". How to add one: `docs/dev/how-to.md`.
- 2026-10-25: Search engines and link previews (Ignas: "handle SEO, this is a web browser based learning
  tool for midi keyboard"). The app is one page with `#` addresses, so everything is in `index.html`:
  title "iggyuoso: learn piano in your browser with a MIDI keyboard", a meta description, canonical
  link, Open Graph and Twitter card tags with a drawn share picture (`public/og-image.png`, 1200 × 630,
  from `tools/seo/card.html` by `tools/seo/images.mjs`), SVG favicon, PNG icons and a web manifest,
  and JSON-LD (`WebSite` + `WebApplication`, free, educational; no `Course`, whose rich result needs
  a provider and offers we don't have). A plain-HTML "About iggyuoso" section (what it is, what you
  learn, how it works, which browsers do MIDI) sits after `#app`, shown under the piano's home only
  (hidden on other pages by the shell), quiet styling with existing tokens. The site's address is
  one constant, `SITE_URL` in `vite.config.ts` (now the Pages URL; change it for a custom domain):
  the build fills it into `index.html` and writes `robots.txt` and `sitemap.xml` (home page only).
  Preview builds are `noindex` with no canonical, robots or sitemap. The tab title follows the
  page: the page's first heading + " · iggyuoso" (`src/app/title.ts`, tested). Lighthouse SEO 100.
  Not in the demo: nothing for a player to see beyond the About text on home. Ignas's own steps
  (Search Console, custom domain): `docs/dev/seo.md`.
- 2026-10-25: Tap the keys on the screen (Ignas, on an ear question with a drawn keyboard: "on such
  exercises allow to click the piano"). The keyboard picture and the falling notes' keys can be
  played with a mouse or a finger (`ui/tapKeys.ts`, `KeyboardView.playable()` /
  `FallingView.playable()`): a tap goes in through `midi.inject` (port "On-screen keys"), so it is an
  answer wherever a key is, and sounds the sampled piano until the finger lifts; sliding along the
  keys plays each one. On in every exercise kind, theory checks and the playground, Note Rush and
  Play by ear (not the timing tools, nor the Chord finder, which has its own tap-to-hold). Untimed
  answers by tap count as usual; a timed or improvised take with a tap is **practice** (shown, never
  saved, like a paused take), since taps can't keep time like keys. Ear questions now ignore keys
  pressed before Start (they used to answer the first question unheard). Demo scene "Tap the keys
  on the screen" (the pianist taps, with a fingertip shown).
- 2026-10-25: Songbook ×10, batch 1 (Ignas: "for songs increase the amount tenfold, simplypiano has a great
  collection... whatever is legal"). Rule written under "Content": public domain only, our own
  arrangements. Song nodes carry `genre` (Children's songs, Folk songs, Sea shanties, Carols and
  holidays, Hymns and spirituals, Anthems and marches, Dances and fiddle tunes, Classical, Ragtime and
  early jazz, By request), required on every song; the Songbook page has a chip per group and a search
  box (title and source, accents ignored), shelves still by milestone. New song catalogue
  (`tools/content/catalogue.py`, tunes in `cat_*.py` in a short form with carried durations, nearest
  octaves and the key's accidentals): each tune is one lesson with the rhythm (to stage 5), a by-ear
  echo (to stage 4), the tune, the left hand, both hands, a fuller left hand (pedal from stage 6) and a
  performance; songs open after the milestone before their stage and ask for their key study. Checks:
  bar lengths, no key in both hands (left hand, else tune, moved an octave), and a report of tunes that
  fit their chords badly. Batch 1 adds 38 songs (76 entries in all). Ignas's "Sea Shanty 2" (RuneScape,
  copyrighted) waits for his MIDI file: its notes can't be written from memory reliably. Demo scene
  "The Songbook".
- 2026-10-25: Songbook batch 2: carols and hymns (Amazing Grace, Old Hundredth, The First Noel, Angels We
  Have Heard on High, We Three Kings, Ding Dong Merrily, Good King Wenceslas, When the Saints), anthems
  (God Save the King, The Star-Spangled Banner), jigs (Irish Washerwoman, Swallowtail), Moldau, Mozart's
  Sonata facile (Alberti bass), Bach's Prelude in C (chords written out, both hands), and the early
  songbook-lesson tunes as songs of their own (London Bridge, Frère Jacques, Au clair de la lune, Go Tell
  Aunt Rhody): 95 entries. `au-claire-fontaine` renamed `a-la-claire-fontaine` (no one had played it yet).
- 2026-10-25: Wait for me (Ignas: "a mode in practice that just stops and waits and doesn't move until
  the correct keys are pressed; it indicates which were pressed and which are remaining"). A checkbox
  in Options, "Wait for me", in every timed exercise and song step but taps and echoes; it is a way
  to practise, so ticking it switches to Practice, and it only changes Practice (Scored takes are as
  before). Remembered like the other options (`settings.wait`, unset = off). A round runs on
  `WaitSession` (`engine/waitSession.ts`, tested): notes starting on the same beat are one step; the
  music moves at the tempo but stands still at each step until all its keys are pressed (any order,
  one at a time is fine; playing ahead makes it jump on). The keys still to play are lit (orange on
  the sheet), the ones pressed turn green (dimmed notes and a ✓ on the key in falling notes), wrong
  keys flash red, and the status line names them ("Waiting for: G3 C5 · ✓ C3 E3"). No click,
  count-in, guide notes, timing, pedal or dynamics; reading drills keep their keys dark. Works on
  the bars picked with the slider, in both views and the phone's full screen, with MIDI, the computer
  keyboard and tapped keys. Each round ends with notes, wrong keys, how often the music waited and
  the time; the round chip is the share of steps with no wrong key. Nothing is saved. Duet's
  follower was not reused (it follows tempo; this only gates on keys). Demo scene "Wait for me".
- 2026-10-25: Sign in with Google (Ignas: "google sign in sounds better can we swap to it"; Supabase's
  built-in email sends about two links an hour). The Profile's Guest card leads with "Continue with
  Google"; "Use email instead" opens the old email-link form, kept as a fallback. OAuth with PKCE over
  plain fetch (no SDK, no server of ours): `Account.signInWithGoogle` keeps a random verifier on the
  device (`iggyuoso.sync.pkce`, never synced; `src/core/sync/pkce.ts`) and sends the browser to
  `/auth/v1/authorize?provider=google` with its S256 challenge; Supabase returns to the app's own
  address with `?code=` in the query (the `#/...` router is untouched), the shell cleans it to
  `#/profile`, and `completeOAuth` trades code + verifier at `/auth/v1/token?grant_type=pkce`. Then
  sessions, refresh, sync and sign-out are as before. `SyncProvider` gains `oauthUrl` and
  `exchangeCode`. Preview copies stay guest only. Google Cloud and Supabase setup is Ignas's
  (`docs/accounts.md`, "Switching on Google sign-in"). Demo scene "Guest or account" signs in with a
  pretend Google.
- 2026-10-25: Songbook batch 3: 106 traditional and old tunes (201 songs in all), imported rather than
  recalled: `tools/content/import_abc.py` (run by hand, needs music21) reads the free Nottingham Music
  Database of traditional tunes in ABC with chord names, keeps the melody once through and the chords,
  and writes `cat_trad.py`; the tunes taken and their words are listed in `trad_list.py` (traditional or
  long out of copyright only; the collection also holds modern tunes). Left hands are ours (plainer
  ones when the fuller ones would cross the tune); stages 3–9 by a difficulty rank, with children's
  songs, carols and hymns kept early. Scottish, Northumbrian, English, Irish, Welsh, American and
  European tunes: pipe marches, airs, music-hall songs, fiddle tunes, jigs, reels, hornpipes, carols,
  and Rossini's William Tell finale, Weber's Huntsmen's Chorus and Handel's Water Music jig. Long
  pieces on the sheet view now keep a readable size and scroll sideways with the music (`longSheet`)
  instead of shrinking to fit. Demo scene "A long song on the sheet".
- 2026-10-25: Faster start. Lessons and exercises are read from YAML at build time (`?data` imports,
  `yamlData` plugin in `vite.config.ts`) and reach the app as JSON; reading ~3,500 YAML files in the
  browser took over a second at every start (2.0 → 1.25 s to the Songbook on a test machine). The
  tree and the Book stay text. Tests still load the YAML text. Nothing a player sees changes, so no
  demo scene.
