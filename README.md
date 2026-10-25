# iggyuoso

A learning site whose first module is a browser piano tutor for adult beginners with a MIDI
keyboard: short exercises that each train one skill, scored per hand. More modules (a math tutor,
a painting course) can join it on the same account (`docs/modules.md`). See `CLAUDE.md` for the full brief.

Live: https://ignpilv.github.io/iggyuoso/ (Chrome or Edge; Web MIDI needs https).
No keyboard? Open https://ignpilv.github.io/iggyuoso/#/demo to watch the app play itself, or switch
on Settings → Computer keyboard to play with A S D F G H J K L ; ' (white keys), W E T Y U O P (black
keys) and Z / X (octave).
Every new feature must also appear in the demo (see CLAUDE.md).

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

iggyuoso is one site with one account and several learning modules; the piano tutor is the first.
How modules work and how to add one: `docs/modules.md`.

```
content/                     the piano's lessons, tree and Book (YAML/Markdown, format in content/README.md)
src/main.ts                  starts the shell
src/app/                     shell: header with module switcher, router, shared pages, module list
src/core/                    shared by every module: Module interface, storage, account + sync,
                             account card, theme and Appearance, dom helper
src/modules/piano/           the piano tutor
  music/  content/  calibration.ts  midi/  engine/  scoring/  progress/  audio/  demo/  ui/
src/modules/sums/            a tiny SAMPLE module that shows how a second module fits
src/styles/                  design tokens (light/dark), shared; rules in docs/design.md
tests/                       vitest
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
- Near-simultaneous presses (60 ms) in one hand count as one chord hit; gaps between hands are
  kept, since that is what "hands together" measures. Presses during the count-in are ignored.
- Times use MIDI event timestamps (falling back to `performance.now()` when a timestamp looks
  wrong), corrected for the audio output latency plus the player's own setting.

Piano samples: Salamander Grand Piano V3 by Alexander Holm, CC BY 3.0 (see `public/piano/CREDITS.txt`).
