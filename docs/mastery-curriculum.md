# Mastery curriculum (design)

The readable version, with tables and a diagram, is the Claude Doc
["iggyuoso mastery curriculum"](https://claude.ai/artifact/LzZ9Uyapp3qz8WtDm11XUL). The research
behind it is in `docs/research/`. This file is the short form the code and content follow.

## Target
Five years at 20–40 minutes a day takes an adult beginner to about **ABRSM Grade 6** (RCM Level
6–7) in playing, theory and ear. That is high intermediate. Grade 7 is a stretch goal for players
who practise 40 minutes a day. The app shows each player where their own pace projects them.

## Structure
- **Seven strands:** technique, reading, rhythm, theory, ear, repertoire, creativity.
- **Year (5) → unit (about 6 a year) → node → exercise.** The data is in `content/tree/`.
  Year 1 is designed node by node; Years 2–5 are unit outlines until they are built.
- **Node types:** lesson, drill, piece, checkpoint (3 a year, 15 in all), side quest.
- **Path over tree:** "Start today's session" follows the path; the full tree is visible, and
  side quests are optional.
- **Cross-strand gates:** a key opens for playing only after its theory and ear nodes are
  Practised. Every node runs hear → name → see → play → create.
- **Repertoire mix from Year 2:** etude, polyphony, large form, character piece. Pieces are public
  domain or our own arrangements. Sight-reading sits 1–2 levels below the player's pieces.

## Mastery states
Locked → Introduced → Practised (★, 65+) → Solid (★★★, 92+ at ≥90% tempo) → Mastered (passed again
on a later day in mixed review or a checkpoint). Solid and Mastered skills fade; at half freshness
they come due for review, and a failed review drops one state. Start with review boxes; move to a
memory model once there is data.

## Rewards
- XP only for clean takes, new stars, reviews done on time and promotions; none for minutes or
  replaying easy material. Daily cap with a break prompt (wrists).
- Readiness dials open checkpoints. Checkpoints use exam formats, retry freely; ear parts give no
  feedback until the end.
- Tempo ladder: up a rung after 3 clean takes at 92%+, down after repeated misses. Loop the 1–2
  bars where mistakes cluster. "Wait for me" never counts toward Solid.
- Gentle streak (one short review set keeps it; rest days allowed), personal bests, no leagues.
- Daily session: ~3 min warm-up, 30% reviews, 40% new lesson, 15% ear, 15% fun piece.
- The guide: a calm teacher voice that explains why and turns scores into specific advice; never
  threatens a streak. Placement tests let players skip ahead (skipped nodes count as Practised).

## Ear track
Relative pitch in a key, answered on the keyboard: cadence → note → play it back → hear it resolve.
Only the first key pressed counts. Mix 3–6 categories; add one at 85–90% over the last 20–30 tries.
Perfect pitch is the "note naming" side quest and never blocks progress. Thresholds are design
choices to tune from logged data.

## Engine needs (for the technical thread)
`kind: ear`, `kind: quiz`, `kind: build`, `kind: tap`, a sampled piano for prompts, `tempoLadder`,
looping bars, richer note strings (sixteenths, triplets, ties, compound metre, key signature, clef
change, pedal), the mastery store (states, freshness, review queue, XP, streak, per-note timing),
the session planner, and the tree screen (design thread). The first four kinds plus the store
unlock all of Year 1.
