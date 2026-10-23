# Mastery curriculum (design)

The readable version, with tables and a diagram, is the Claude Doc
["iggyuoso mastery curriculum"](https://claude.ai/artifact/LzZ9Uyapp3qz8WtDm11XUL). The research
behind it is in `docs/research/`. This file is the short form the code and content follow.

## Target
Five years at 20–40 minutes a day takes an adult beginner to about **ABRSM Grade 6** (RCM Level
6–7) in playing, theory and ear. That is high intermediate. Grade 7 is a stretch goal for players
who practise 40 minutes a day. The app shows each player where their own pace projects them.

## Structure (2026-10-23: a growing tree, no years)
- **Seven branches** grow side by side: technique, reading, rhythm, theory, ear, pieces
  (repertoire), creativity. A **trunk of milestones** joins them, and **songs** open after milestones.
  Data in `content/tree/` (format in `content/README.md`).
- **Stages, not years.** Nine stages, each closed by one milestone: first notes; two hands; scales
  and eighths; two octaves and minor keys; chords and harmony; pedal and four kinds of piece; flat
  keys and compound time; arpeggios and the dominant seventh; form, sonatinas and the blues. A stage is a few
  months at the planned pace; nobody is told how long a stage "should" take.
- **Intertwined requirements.** Requirements cross branches: reading a key needs its theory node,
  a piece needs its technique and rhythm nodes, an ear drill needs the notes it uses on the keys.
  The four roots (playing, reading, rhythm, ear) start together in stage 1 and feed each other.
- **Both hands early.** Two hands from stage 1 (mirror hands, taking turns, a held bass); after
  stage 2, nearly every playing exercise is hands together. Hands-alone takes stay only as the first
  steps of a new piece.
- **Each milestone** has a theory paper, technique takes, an ear test and a sight-read, and needs a
  few nodes from every branch of its stage. Passing it grows the next stage and opens new songs.
- **Node types:** lesson, drill, piece, checkpoint (milestone), side quest, song. Nothing is locked:
  a node that has not grown yet still opens, with advice on what comes first.
- **Families in every key:** from stage 5, each key gets a key study (scale, contrary motion,
  cadence, arpeggio, inversions, accompaniments, a waltz) and a musicianship lesson (key quiz,
  reading, sight-reading, intervals, degrees, echo).
- **Repertoire mix:** etude, polyphony, large form, character piece; public domain or our own.
  Every piece runs rhythm tap → right hand → left hand → together (tempo ladder) → polish.

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
Assumes no pitch sense at all. It starts with same or different (far apart, then closer), higher or
lower, which way a tune moves, step or leap, loud or soft, how many notes, and echoing two notes on
lit keys; only then single notes against a reference, intervals, chords and melodies.
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
