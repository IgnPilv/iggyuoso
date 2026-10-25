# Progress: what is saved, mastery, Today's practice, accounts

*Code in `src/modules/piano/progress/` and, for what every module shares, `src/core/storage.ts`
and `src/core/sync/`. Accounts in full: [docs/accounts.md](../accounts.md).*

## Where things are saved

Everything is saved **in the browser** (localStorage), as small JSON records whose names start
with `iggyuoso.`. The app always plays from this copy, so it works offline. A signed-in account
only copies the records to the server and back.

The piano's records (they predate modules, so they have no `piano.` in front;
`progress/records.ts`):

| Record | What it holds |
| --- | --- |
| `ex.<exercise id>` | takes of one exercise: best and last take, attempts, passed, clean takes and their days |
| `mastery.<node id>`, `mastery.meta` | each tree node's state, review box and freshness; XP, streak |
| `profile.days`, `profile.timing` | the practice log per day; each hand's timing over recent takes |
| `ladder.<id>` | the tempo ladder step of one exercise |
| `path.*`, `daily.plan` | lessons skipped; today's practice plan |
| `book.read` | Book chapters read |
| `sketch.<id>`, `mysong.<id>` | the player's own ideas and imported songs (kept by "Wipe progress") |
| `calibration`, `settings` | the keyboard and the app's options: stay on the device, never synced |

Other modules save through `ModuleRecords('<id>')` as `iggyuoso.<id>.<key>`
([docs/modules.md](../modules.md)). Records carry an app-wide **schema version**
(`SCHEMA_VERSION` in `src/core/storage.ts`); when a record's shape changes, bump it and add an
upgrade step (the piano's are in `Store.upgradeFrom`, `progress/store.ts`).

## From a take to progress

1. `record` (`ui/players.ts`) builds an `Attempt` (time, score, stars, tempo, per-hand scores and
   timing, whether the tempo counts) and saves it with `store.record` (`progress/store.ts`).
2. `store.reps` says how far the exercise is from done: clean takes so far, days, how many are
   still needed and whether one today can still count.
3. `mastery.onAttempt` (`progress/mastery.ts`) updates the tree node and returns the rewards
   shown on the result card (XP, new stars, promotions).

## Mastery states

A tree node climbs: **Locked → Introduced → Practised** (every exercise ★) **→ Solid** (every
exercise ★★★ on a clean take) **→ Mastered** (passed again on a later day). Solid and Mastered
fade: freshness halves every review interval (2, 4, 8, 16, 32, 64 days), the node comes due at
half, a pass on time moves it up a box, a fail drops it one state. "Locked" is a word for "not
grown yet": every lesson can always be opened.

XP: a clean take 10, each new star 5, a review on time 10, a promotion 25, at most 300 a day. The
streak forgives one rest day. Levels come from XP (`progress/profile.ts`).

## Lessons and the path (`progress/index.ts`)

- A lesson is **played through** once each of its exercises has one clean take, and **done** once
  every exercise has all its clean takes on enough days (`lessonStage`).
- `lessonAdvice` says what is recommended first (the requirements in the tree), never forbids.
- `nextLesson` picks the next lesson in the same branch, else the growing edge (`frontier`),
  balancing the branches.

## Today's practice (`progress/daily.ts`)

About 20 minutes, planned once a day and saved: first the reviews that are due, then the next
lesson, then generated drills from what the player already knows. Minutes per exercise are
estimated from its kind, length and tempo.

## Sketches and My songs

`progress/sketches.ts` keeps Sketchbook ideas, `progress/mySongs.ts` imported MIDI songs (their
parts and the song as written, not the file). A deleted one is saved as `null` so the deletion
reaches other devices.

## Accounts and sync, in short

- Every write to a synced record is stamped as changed (`src/core/sync/tracker.ts`).
- `Account` (`src/core/sync/account.ts`) syncs on start, a few seconds after a change, when the
  tab is hidden or focused and when the network returns: pull what changed on the server, merge
  records changed on both sides (`merge.ts`, with each module's rules: counts and logs keep the
  most of both, the rest takes the newer), push what changed here.
- The server is Supabase, spoken to over plain HTTPS (`supabase.ts`), behind the `SyncProvider`
  interface (`types.ts`), so it can be replaced. Tests and the demo use a pretend server in memory
  (`memory.ts`).
- The demo never saves: it uses throwaway progress (`demoProgress`) and a pretend account.
