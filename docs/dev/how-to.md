# How to: common changes, step by step

*Recipes for the changes that come up most. Short paths such as `ui/players.ts` are inside
`src/modules/piano/`. Each ends with the same three checks: `npm test`
passes, the demo shows the change, and `CLAUDE.md`'s decision log has a line about it.*

## Add a lesson

1. **Hand-written or generated?** Families of lessons (a scale in every key, a rhythm workout,
   song steps) belong in a script in `tools/content/`; a one-off lesson can be written by hand.
2. Write the exercises: one file each in `content/exercises/<id>.yaml` (format in
   [content/README.md](../../content/README.md)). Give each a `title`. Timed and tap exercises
   get `tempoLadder: true`; quiz questions get a `why`.
3. Write the lesson: `content/lessons/NN-<id>.yaml` with `id`, `title`, `skills`, `steps`
   (`explain`, `playground`, `exercise: <id>`) and `recap`.
4. Place it in the tree: a node in the right branch file in `content/tree/` with its `stage`,
   `lesson` and `requires` (from any branch). If it is generated, add the node in the script and
   any cross-branch needs in `tools/content/links.py`.
5. If a Book chapter goes with it, add the lesson id to that chapter's `lessons`.
6. For generated content: commit hand edits first, then run `tools/content/rebuild.sh`.
7. `npm test` reports any problem with the file and line it came from.

## Add a song

- **A simple song** (one lesson): add it in `tools/content/songs.py`, as a node in `songs`
  that requires the milestone it opens after.
- **A song taught in steps** (one Songbook entry with a path inside): copy the shape of
  `tools/content/wim.py` or `tools/content/canon.py`. Each step is its own song node and lesson
  with `song: <id of the whole-song node>`; the whole-song node has no `song` itself. Each step
  needs a milestone plus the cross-branch nodes it uses.
- Songs are public domain or our own arrangements. A copyrighted title only when Ignas asks for
  it by name (see the decision log).
- MIDI files a player imports (My songs) never go into the repository.

## Add a Book chapter

Write `content/book/<id>.md` with its front matter (`title`, `stage`, `lessons`, `summary`) and
add the id to a part in `content/book/book.yaml`. Pictures and checks use the same blocks as
theory screens ([content/README.md](../../content/README.md), "The Book").

## Add an exercise kind (a new type of task)

1. Describe its fields in `src/modules/piano/content/types.ts` and parse them in `src/modules/piano/content/load.ts` (with clear
   error messages).
2. Write the logic without screen code: a session in `engine/` or a scorer in `scoring/`, with
   tests in `tests/`.
3. Write the player in `ui/` and add it to `mountExercise` (`ui/players.ts`).
4. Document the format in `content/README.md`.
5. Teach the demo pianist to play it if needed (`demo/pianist.ts`) and add a demo scene.

## Add an option or setting

1. Add the field to `Settings` (`progress/store.ts`) with a comment.
2. For an exercise option (like Fingers), read it through `exerciseOptions()` in `ui/players.ts`
   and save it when changed, so it carries over to the next exercise. The demo keeps its own
   options and never saves.
3. For a Settings page card, add it to `settingsView` (`ui/views.ts`).

## Add a game or tool to the practice room

Write the page (`ui/<name>View.ts`, with its rules in `engine/` and a test), add its route to
`routes` in `module.ts`, and add one entry to `ROOM` in `ui/practiceRoom.ts`: route, name, kind,
one-line blurb, branch, `after` (a milestone, or none) and the tree nodes whose lessons should
suggest it. Home, the branch page and the recaps then pick it up; `tests/practiceRoom.test.ts` checks
the route and node ids. Put `roomEyebrow('<route>')` over the page's heading and add a demo scene.

## Add a module (a new subject)

Follow [docs/modules.md](../modules.md), "Adding a module": a `src/modules/<id>/module.ts` that
exports a `Module`, records through `ModuleRecords('<id>')`, listed in `MODULES`
(`src/app/modules.ts`), with its own demo. When the first real module lands, remove the `sums`
sample.

## Add a demo scene

Every user-facing feature must show up in `#/demo`.

1. Open `src/modules/piano/ui/demoView.ts` and find `scenes()`.
2. Add a scene: `out.push({ title, caption, run })`. `run(box, next, pianist)` draws real screens
   into `box`, makes the pianist play, calls `next()` when the scene is over, and returns a
   cleanup function. For an exercise, `exerciseScene(ex, { view: 'falling', switchAt })` does all
   of that.
3. Prefer an exercise from the real content (`pick(...)`), so the demo follows the content; fall
   back to a small sample in `SAMPLES` when no exercise fits yet.
4. If the pianist needs a new move, add it to `demo/pianist.ts`, sending notes through
   `midi.inject` like a real keyboard.
5. The demo never saves: use `demoProgress()` and `demo.active` checks, as the other scenes do.

## Change a scoring rule

Change the scorer in `scoring/` (or `engine/drills.ts`), update or add a test in `tests/`, update
the numbers in [scoring.md](scoring.md) and the README's "How a timed exercise is scored", and add
a decision log line in `CLAUDE.md`.

## Change saved data

If a record changes shape, bump `SCHEMA_VERSION` (`src/core/storage.ts`) and add an upgrade step
(`Store.upgradeFrom` for the piano). Upgrades also run on records pulled from the account, so
they must leave already-upgraded records alone. Records that grow (counts, logs) need a merge rule
in `progress/records.ts` so two devices never lose practice.
