# Building, testing and deploying

## Running it on a computer

Needs Node.js 22 (what CI uses) and npm.

```
npm install        # once: fetch the tools and libraries
npm run dev        # a local server with live reload (open the address it prints)
npm test           # all tests (vitest)
npm run typecheck  # TypeScript only
npm run build      # type-check, then build the site into dist/
npm run preview    # serve the built dist/ locally
```

Web MIDI needs https or `localhost`, so a MIDI keyboard works with `npm run dev` on the same
computer. Without a keyboard, use `#/demo` or Settings → Computer keyboard.

## What the tests cover

`tests/*.test.ts`, run by vitest in Node (no browser). They cover the parts that decide things:

- scoring: `timed`, `untimed`, `pedal`, `dynamics`, `drills`, `improvise`;
- the session clock and practice: `timedSession`, `practice`, `jam` (the Jam room);
- music: `notes`, `noteStrings`, `theory`, `chords`, `fingering`, `handPlacement`, `chordNames`,
  `transcribe`, `octaves` (middle C = C4 everywhere), `midi` and `computerKeys` decoding,
  `calibration`, `keys`;
- progress: `store`, `mastery`, `profile`, `daily`, `advice`, `sketches`, `mySongs`, `sync`;
- the site: `modules` (ids, routes);
- generated drills: `generate`;
- **content**: `content`, `tree`, `book` load the real `content/` folder and fail on
  any problem, so a broken lesson can never be deployed.

Screens are not unit-tested; they are checked by hand and in the demo (sessions often take
screenshots with the pre-installed Playwright browser).

## Continuous integration and deploying

Two GitHub Actions workflows in `.github/workflows/`:

- `ci.yml`: on every pull request (and every branch push except main): `npm ci`, `npm test`,
  `npm run build`. A pull request is only merged when this is green.
- `pages.yml`: on every push to `main` (or by hand: Actions → Deploy to GitHub Pages → Run
  workflow): test, build with the account server's address and key from the repository secrets
  `SUPABASE_URL` / `SUPABASE_ANON_KEY`, and publish `dist/` to GitHub Pages at
  https://ignpilv.github.io/iggyuoso/.

Pull requests labelled `preview` are also built into the same deployment, each at
`preview/pr-<n>/`, as a guest-only copy with its own saved data (`tools/previews.sh`,
`preview-trigger.yml`, `src/core/preview.ts`; details in [docs/previews.md](../previews.md)).

The build uses a relative base (`vite.config.ts`) and hash addresses, so the same files work on
GitHub Pages under `/iggyuoso/` and locally. Fonts are bundled from npm; piano samples are in
`public/piano/`.

## How changes are made

Ignas has no local git: every change is made by a Claude session on a branch, opened as a pull
request, checked by CI, and merged by the session itself (`CLAUDE.md`, decision log of
2026-10-23). Each decision goes into the decision log at the bottom of `CLAUDE.md`, and each
user-facing change also gets a demo scene.
