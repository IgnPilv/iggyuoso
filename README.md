# iggyuoso

A browser piano tutor for adult beginners with a MIDI keyboard: short exercises that each train
one skill, hands apart first, then together, scored per hand. See `CLAUDE.md` for the full brief.

Live: https://ignpilv.github.io/iggyuoso/ (Chrome or Edge; Web MIDI needs https).

## Develop

```
npm install
npm run dev      # local server
npm test         # vitest: scoring engine, calibration, MIDI decoding, content validation
npm run build    # type-check and build to dist/
```

Every push to `main` is tested, built and deployed to GitHub Pages by `.github/workflows/pages.yml`.
Pull requests run the same tests (`ci.yml`), including a check that every file in `content/` loads.

## Layout

```
content/            lessons and exercises (YAML, format in content/README.md)
src/music/          note strings, pitches, timeline of expected notes
src/content/        YAML loader + validation
src/calibration.ts  lowest white key + highest key -> range and middle C
src/midi/           Web MIDI input, chord grouping (60 ms)
src/scoring/        timed scoring (per hand, habits, feedback), find/sequence sessions, stars
src/progress/       localStorage store behind a swappable backend
src/audio/          metronome click and guide notes
src/ui/             minimal views: home, lesson, players, calibration, settings, MIDI tester
tests/              vitest
```

## How a timed exercise is scored

- Each expected note is paired with the closest key press of the same pitch within a window of
  ±45% of a beat (clamped to 150–350 ms). Within 50 ms is full marks, falling to half marks at the
  window edge.
- A leftover press near an unplayed note is a **wrong note**; anything else is an **extra**
  (−0.5 each). Long notes (half and longer) released before 75% of their length lose 30%.
- Each hand gets its own score, timing tendency (average early/late), drift (rushing or dragging)
  and spread (uneven beats). "Hands together" is the average gap between the hands on shared beats.
- Feedback names the weaker hand and each habit that slipped. Stars: ★ 65, ★★ 80, ★★★ 92.
  Slower practice is free; records only count at 90% of the written tempo or faster.
- Times use MIDI event timestamps (falling back to `performance.now()` when a timestamp looks
  wrong), corrected for the audio output latency plus the player's own setting.
