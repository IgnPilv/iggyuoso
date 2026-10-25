# Previews: try a change before it reaches main

Any open pull request with the **`preview`** label gets its own copy of the site:

    https://ignpilv.github.io/iggyuoso/preview/pr-<number>/

All previews are listed at https://ignpilv.github.io/iggyuoso/preview/. Main stays at the root, as
before. Several previews can be live at once.

## How it works
- `.github/workflows/pages.yml` builds main into `dist/`, then `tools/previews.sh` builds every open
  `preview` pull request into `dist/preview/pr-<n>/`, and the whole folder is one Pages deployment.
- It runs on every push to main and, through `.github/workflows/preview-trigger.yml`, whenever a
  pull request is opened, pushed to, labelled, unlabelled or closed. (The deploy itself always runs
  from main, because the Pages environment only lets main deploy.) A closed or unlabelled pull
  request disappears on the next run.
- Only branches of this repository are built, never forks.
- A preview that does not build is left out with a warning; main still deploys.
- The app uses a relative base and hash routes, so the same build works in a subfolder.

## What a preview is like
- It says so: a "Preview · pr-<n>" tag in the bottom corner, linking back to the main site.
- **Guest only**: it is built without the account server, so it never signs in or syncs.
- **Its own saved data**: it shares the site's origin, so it stores everything under
  `iggyuoso-preview-pr-<n>.` instead of `iggyuoso.` (`src/core/preview.ts`). The first time it
  opens it copies the device's progress, settings and calibration from the main site (not the
  account), so it can be tried with real progress. Nothing it does reaches the main site.
- Branch from main as it is now (the preview code must be in the branch).

## The hourly ideas
Ideas built for Ignas to try are each a pull request labelled `preview`, not merged until he says
go (then merge, with demo and CLAUDE.md current) or no-go (close it). They are logged in
`docs/ideas.md` with their verdict.
