# Roadmaps

*Written 2026-10-26, after Ignas asked for "3 more plans, roadmaps for improvement". Nothing here
is built yet: Ignas picks a roadmap (or parts of several), and the decision goes in `CLAUDE.md`.*

Where the app stands today: a mastery tree of seven branches over nine stages, about 400 lessons
and 1,850 exercises, the Book (65 chapters), a Songbook of 382 songs, the practice room (three
games and five tools), Scored / Practice / Wait for me modes, sheet and falling notes with fingers,
hands and chord names, guest or account (Google sign-in waiting on its setup), and a shell that
can hold more modules. What is thin: the first ten minutes and the home tree are hard to read
("not very user friendly"), statistics stop at "last 10 takes against the 10 before", releases
and staccato are not scored, the app does not install or work offline as an app, and there is no
way yet to earn money or to know how many people use it.

The three roadmaps below go in three different directions. Each can be started on its own; they
only share small pieces, named under "Depends on".

**Effort** is counted in pull requests of the size sessions have been shipping (one feature with
its tests, docs and demo scene): small = 1 PR, medium = 2–4, large = 5 or more.

---

## Roadmap A: Easy to start, easy to come back to

**Goal.** A new player knows what to do within a minute, and a returning player opens the app to
one clear next step. The richness stays, but it is unfolded only when asked for. This is the
"Duolingo but better" half of the vision: the curriculum is already deep; the way into it is not.

### Phase A1: The first ten minutes and a clearer home (medium, 3–4 PRs)

- **First-run path.** One guided flow instead of a page of cards: plug in (or choose the computer
  keyboard), calibrate, meet middle C, play the first lesson, see the first result, and land on
  home with "Your next step" already filled in. Skippable, never shown again once done.
- **Home leads with one button.** A big "Continue: <lesson>" (or "Today's practice, 18 min") at
  the top; the drawn tree under it as the picture of progress; "Growing now" trimmed to three
  items; the stage weave behind a "See how skills connect" button instead of always open.
- **Tree on a phone.** The weave as a vertical list per branch (no sideways scroll), nodes as
  tappable rows with their state and "needs" in words.
- **Plain names.** One pass over home, branch pages and recaps so every word a beginner meets is
  explained or replaced (Practised / Solid / Mastered get a one-line tooltip and a legend).

### Phase A2: A daily habit that does not nag (medium, 3 PRs)

- **Today's practice as the front door.** The plan shown as a short checklist on home with time
  left, and one "Start" that plays it through without going back to menus between items.
- **Weekly goal instead of only a streak.** The player picks minutes per week (for example 60,
  100, 150); a ring fills through the week; missing a day never resets it. The streak stays.
- **Session summary.** On leaving (or after 20 minutes) a card says what grew today: clean takes,
  nodes that moved, the hand that improved, and what is waiting tomorrow.
- **Reminders (optional).** Once the app installs (Roadmap C1), an opt-in daily reminder at a
  time the player picks. Off by default.

### Phase A3: A story of progress (medium to large, 3–5 PRs)

- **Then and now.** Takes keep their notes (they already can be played back in the Sketchbook);
  the app keeps the first clean take of each piece and offers "hear your first try" next to the
  latest, so progress is heard, not only scored.
- **Milestone moments.** Reaching a milestone gets a proper screen: what was learned, the pieces
  that can now be played, the songs that opened, and a card that can be saved as an image.
- **Monthly report.** A page per month: time played, pieces finished, each hand's timing trend,
  what to work on next (feeds from Roadmap B1 when it exists).
- **Accessibility pass.** Keyboard navigation, screen-reader labels and colour contrast checked
  on every main page, and a reduced-motion setting for the falling notes and the tree.

**Depends on.** Nothing for A1. Reminders in A2 need the installable app (C1). The monthly report
in A3 is richer with B1's statistics, but works without them.

**What Ignas would do.** Try the first-run flow on a fresh browser (or a preview) and say what
felt slow or unclear; pick the weekly-goal numbers; say whether reminders are wanted at all. The
design thread's look stays: these are layout and wording changes, no restyle.

---

## Roadmap B: Hear yourself like a teacher would

**Goal.** Make the app's ears as good as a good teacher's: it remembers how each hand and each bar
has gone over weeks, scores the things a teacher listens for that it does not hear yet (releases,
balance, legato, pedal in free playing), and turns what it hears into the next exercise. This
builds on what Ignas likes most: modes that listen to free playing and say, hand by hand, where
it was held back or hurried.

### Phase B1: Statistics over time (medium, 3–4 PRs)

- **Per-note timing kept.** Each scored take saves, per note, its offset and velocity (compact,
  last few takes per exercise), not only the hand's mean and spread. Schema step with an upgrade.
- **Bar heatmap.** On an exercise and a song, a strip of bars coloured by how often they go wrong
  across takes (misses, wrong notes, early, late), with "Practise bars 5–6" from it.
- **Timing over weeks.** The Profile's Timing card becomes a page: each hand's lean and spread
  per week, rushing and dragging trends, the weaker hand over time, and the Timing mirror and
  Play report results folded in when the player keeps them.
- **Per-lesson statistics.** A lesson's recap shows how its numbers moved from the first take to
  the last (the "timing deltas per lesson" wish from the first day).

### Phase B2: Hearing more of the playing (large, 4–6 PRs)

- **Releases and articulation.** Staccato and legato scored from note-off: staccato notes released
  in the first half of their length, legato with no gap and at most a short overlap; habits
  "held too long", "choppy legato", "blurred" (overlap). Content stops writing staccato as note +
  rest.
- **Balance between hands.** Melody over accompaniment: the tune's hand should be louder by a
  margin (relative velocities, as dynamics already are; off when velocities are all equal).
  Habit "accompaniment covers the tune".
- **Even runs.** Scales and Alberti basses scored for evenness of loudness as well as time (the
  Scale gym already measures it; bring it into lessons).
- **Pedal everywhere it listens.** The Play report, Sketchbook and Duet read the pedal: pedal held
  through chord changes, missing between changes, late presses, and the pedal written into
  transcribed ideas.
- **Acoustic pianos (optional, larger).** Microphone input with pitch detection for players
  without MIDI. Hard to make reliable for chords; only worth it if Ignas wants players without a
  digital piano.

### Phase B3: The app plans the practice (medium, 3 PRs)

- **Weak-spot drills.** From B1's history the app makes a short drill on what goes wrong most
  (for example: left-hand leaps late → a two-bar loop at 70% with Wait for me, then at tempo).
- **Today's practice uses it.** One slot of the daily plan is "Your weak spot", explained in a
  line ("your left hand drags on the jump in bar 6 of Minuet in G").
- **A teacher's note on a performance.** A performance take ends with three sentences written
  from the numbers (strongest thing, one habit, one exercise), in the plain style of the result
  cards. Rules first; a language model only if Ignas wants one later (it would need a server and
  costs money per use).

**Depends on.** B1 first: B2's new habits and B3's drills both read its saved history. Nothing
from the other roadmaps.

**What Ignas would do.** Play real pieces on the Steiner and send the results that feel wrong (a
legato marked choppy, a balance judged unfairly), since keyboards differ in velocity curves and
key-release sensors; decide whether microphone input is worth it; decide whether a language
model teacher's note is wanted (and paid for) or rules are enough.

---

## Roadmap C: From a project to a product

**Goal.** Make iggyuoso something other people find, install, trust and can pay for, without
losing "free for everyone": the whole curriculum stays free, and money comes from extras. Then
grow it past piano with a real second module.

### Phase C1: Foundations (medium, 3–4 PRs)

- **Finish sign-in.** Google sign-in switched on (Ignas's setup, below) and tested end to end.
- **Install and offline.** A service worker so the site installs as an app on phone and desktop
  (the manifest and icons exist already) and works with no network: the app, the Book and the
  piano samples cached, updates shown as "New version, reload".
- **Lighter start.** Split the bundle so home loads first and the Book, songs and practice room
  come on demand; measure and keep a size budget in CI.
- **Know it is used, privately.** A privacy-friendly, cookie-free page counter (for example
  GoatCounter or Plausible) and an error report from the browser, so broken pages are noticed.
- **Search Console and, if wanted, a custom domain** (steps already in `docs/dev/seo.md`).
- **Privacy page and terms.** Plain pages saying what is stored, where, and how to delete it
  (the Wipe button exists); needed before any payment.

### Phase C2: Paying for extras, server-gated (large, 4–6 PRs)

- **What is paid.** Everything taught stays free. Paid: "By request" songs and premium song
  packs (arranged in steps, like Canon in D), and perhaps a supporter tier with nothing locked
  behind it.
- **Merchant of record.** Lemon Squeezy, Paddle or Polar sells and handles VAT and invoices, so
  no company or payment provider of our own is needed at the start.
- **Entitlements on the server.** The checkout's webhook goes to a Supabase Edge Function that
  writes a row "this account owns pack X"; row-level security lets only owners read the pack's
  lessons. Paid songs then live in Supabase, not in this public repository or the public bundle
  (anything in the repo can be read by anyone).
- **Buying needs an account.** Guest players see paid songs as previews with "Sign in to buy";
  purchases follow the account to every device.
- **Copyright before money.** Copyrighted titles shipped "by request" are fine for Ignas's own
  use but must not be sold, or shown to the public, without a licence; paid packs are public
  domain in our own arrangements, or properly licensed.

### Phase C3: Reach and the second module (large, 5+ PRs)

- **A real second module** in place of the Sums sample, on the same account: the math tutor or
  the painting course, scoped as its own small roadmap first (`docs/modules.md` has the recipe).
- **Another language.** Text moved into a translation file per language; a second language for
  the app and the first stages of lessons (the Book last, it is 73,000 words).
- **Sharing.** A take or a milestone shared as a link with its score card and a short playback,
  which also brings new players in.
- **Landing page.** A short page for people arriving from search, with the demo playing, before
  the app itself.

**Depends on.** C1 before C2 (accounts working, privacy page, knowing how many use it). C3's
module and language can start any time. Reminders in Roadmap A need C1's service worker.

**What Ignas would do.** The Google Cloud and Supabase setup for sign-in (about 15 minutes, in
`docs/accounts.md`); the Search Console tag; pick a merchant of record and open an account there
(identity and payout details are his to give); decide prices and what goes in the first pack;
choose the page counter; write or approve the privacy page's facts (who runs the site, a contact
address); pick the second module and the second language.

---

## How they fit, and a suggestion

- A makes what exists easy to use; B makes the app hear more and remember it; C turns it into a
  product others can find and pay for.
- They overlap in two places only: A2's reminders need C1, and A3's monthly report is better with
  B1. Everything else is independent.
- Suggestion: **A1** first, since the tree's usability is the open complaint and every new player
  meets it; then **C1** (small, and it unblocks reminders, offline and any money later); then
  **B1**, which is the start of the listening features Ignas has liked most. Phases can be mixed
  across roadmaps.
