# How the app is built: the big picture

*For anyone who wants to understand the code, including a non-programmer. Each section starts with
the idea in plain words, then names the files. Paths are from the repository root.*

## The short version

iggyuoso is a **static website**: a set of files (HTML, JavaScript, CSS, sound samples) that any
web host can serve. There is no server of our own. Everything happens in the player's browser:

- the lessons are **data files** (YAML and Markdown under `content/`) bundled into the site;
- the browser listens to the **MIDI keyboard** (Web MIDI), works out what was played and when,
  and **scores** it;
- progress is saved **in the browser** (localStorage) and, if the player signs in, copied to a
  small database (Supabase) so it follows them to other devices.

The code is **TypeScript** (JavaScript with types, which catch many mistakes before the app runs),
built with **Vite** (a tool that bundles the files for the browser). There is no UI framework such
as React: pages are built with plain DOM calls through a tiny helper, `h()` in `src/core/dom.ts`
(`h('button', { onclick }, 'Play')` makes a button). Pictures are SVG (sheet music, keyboards, the
tree) or a canvas (falling notes).

## Three layers

```
 index.html ─▶ src/main.ts ─▶ src/app/   the shell: header, module switcher, router, shared pages
                                 │
                 ┌───────────────┴────────────────┐
                 ▼                                ▼
         src/core/                         src/modules/<id>/
         shared by every module:           one learning module each:
         Module interface, storage,        piano/  the piano tutor (almost all the code)
         account + sync, account card,     sums/   a tiny sample module
         theme, Appearance, h()
```

- **The shell** (`src/app/`) draws the header and decides which page to show. It knows nothing
  about pianos.
- **Core** (`src/core/`) is what every module shares: saving data, the account, the theme. Core
  never imports from a module, so modules can come and go.
- **Modules** (`src/modules/<id>/`) are the subjects. Each one describes itself with the `Module`
  interface (`src/core/module.ts`): its name, icon, pages, header links, its part of the Profile
  and Settings pages, its demo, and rules for its saved records. The list of modules is
  `src/app/modules.ts`. More: [docs/modules.md](../modules.md).

## How a page gets on screen

1. `index.html` sets the theme (dark or light) before anything is drawn, so there is no flash, and
   loads `src/main.ts`.
2. `main.ts` calls `startShell` (`src/app/shell.ts`), which builds the header and listens for
   address changes.
3. Addresses use the part after `#` (hash routing, e.g. `#/lesson/high-and-low`), so GitHub Pages needs
   no special setup. `resolveRoute` (`src/app/router.ts`, tested) turns the address into "this
   page of this module, with this argument". The piano keeps short addresses (`#/book`), other
   modules use `#/<id>/<page>`.
4. A page is a **View**: a function that gets an empty element to fill and the argument from the
   address, and may return a cleanup function (stop sounds, timers, key listeners). When the
   address changes, the shell runs the old page's cleanup and draws the new page.
5. When progress arrives from another device, the shell redraws only pages that show progress
   (home, Today, Profile), never a lesson, which would restart it.

## Inside the piano module

```
src/modules/piano/
  module.ts        the Module: pages, header links, starts MIDI when the piano is opened
  content/         reads content/ (lessons, exercises, tree, Book) into typed data   → content.md
  music/           notes and note strings, theory (keys, chords, intervals), timelines,
                   fingering, hand placement, chord names, MIDI files, transcription
  calibration.ts   which physical key is middle C on this keyboard                   → input-and-timing.md
  midi/            Web MIDI input, the computer-keyboard emulator, chord grouping
  engine/          sessions: one run of an exercise (clock, judging), drills, generator,
                   improvising, recorder, practice helpers (tempo ladder, bar slices)
  scoring/         scores and feedback: timed, untimed, pedal, dynamics, stars, goals  → scoring.md
  progress/        saved progress: takes, mastery tree states, XP, Today's plan,
                   profile, sketches, my songs                                         → progress.md
  audio/           metronome clicks, sampled piano (public/piano/)
  ui/              every screen: players, sheet, falling notes, keyboard, hands,
                   lesson panels, tree, Book, demo, the practice room's games and tools → rendering.md
  demo/            demo mode and the virtual pianist
```

The **practice room** is the piano's eight games and tools beside the lessons: Note Rush
(`#/noterush`), Play by ear (`#/byear`), Duet (`#/duet`), Chord finder (`#/chords`), Timing mirror
(`#/pulse`), Scale gym (`#/scales`), Jam room (`#/jam`) and Play report (`#/report`). One list,
`ROOM` in `ui/practiceRoom.ts`, gives each its name, kind (game or tool), one-line description,
branch, the milestone it is best after (advice only), and the tree nodes whose lessons suggest it.
Home shows them all (the "Practice room" card), each branch page shows its own, and a lesson's recap
names the ones that fit it. Each page's heading carries the same "Practice room · Game / Tool" line.

The rule that keeps this manageable: **the parts that decide things have no screen code**. A
session (`engine/`) and a scorer (`scoring/`) take key presses with times and return judgements and
scores; they never draw. Screens (`ui/`) only read from them and draw. That is why the scoring can
be tested without a browser (`tests/`), and why the sheet view and the falling-notes view always
agree: both draw from the same session clock.

## A take, end to end

What happens when the player presses Play on a timed exercise:

1. The lesson page (`ui/views.ts`, `lessonView`) shows the exercise in its panel through
   `mountExercise` (`ui/players.ts`), which picks the player for the exercise's kind.
2. The timed player makes a `TimedSession` (`engine/timedSession.ts`) with the tempo, count-in and
   the measured audio latency. The session lists the clicks and guide notes, and the audio module
   (`audio/audio.ts`) schedules them.
3. Every key press from `midi.onNote` (`midi/input.ts`, the same path for a real keyboard, the
   computer keyboard and the demo pianist) goes to `session.noteOn`, which judges it at once
   (hit, early, late, wrong, extra) for the live feedback.
4. About 60 times a second, a frame asks the session where the music is (`position`) and each
   note's state, and draws the falling notes, the sheet's playhead, the lit keys and the hands.
5. At the end, `session.result()` runs the scorer (`scoring/timed.ts`, plus pedal and dynamics),
   the result card shows the score, stars and habits, and `record` saves the take
   (`progress/store.ts`) and updates the tree, XP and streak (`progress/mastery.ts`).
6. The saved records are noted as changed, and if the player is signed in they are copied to the
   account a few seconds later (`src/core/sync/`).

## Where to read next

- [content.md](content.md): lessons, exercises, the tree, the Book, and the content generator.
- [input-and-timing.md](input-and-timing.md): MIDI, the emulator, calibration, latency and the
  timing loop.
- [scoring.md](scoring.md): how every kind of exercise is scored.
- [rendering.md](rendering.md): sheet music, falling notes, hands, chord names, lesson panels.
- [progress.md](progress.md): what is saved, mastery, Today's practice, accounts.
- [build-and-test.md](build-and-test.md): running, testing, building and deploying.
- [how-to.md](how-to.md): recipes for adding a lesson, a song, a module, a demo scene, a setting.
