# Modules

iggyuoso is one website with one account and several learning **modules**. The piano tutor is the
first; a math tutor or a painting course could be next. Switching modules (the button next to the
logo) changes the header links, the home page and the pages; the account, the profile's account
card, the look of the app and Settings → Appearance stay shared.

## Where things live

```
src/main.ts              starts the shell
src/app/shell.ts         header (brand, module switcher, the open module's links, Profile, Demo,
                         Settings, theme button), router, shared pages, sync redraws
src/app/router.ts        hash address -> page (pure, tested in tests/modules.test.ts)
src/app/modules.ts       MODULES: every module, in switcher order; the open one is saved on the device
src/core/module.ts       the Module interface (read it: every field is documented)
src/core/storage.ts      device storage, ModuleRecords (a module's own records), shared settings
src/core/records.ts      what each module tells the account: merge rules, what a wipe keeps, upgrades
src/core/sync/           account and sync (Supabase), shared by every module
src/core/accountView.ts  account card (top of the Profile)
src/core/theme.ts, appearance.ts, dom.ts    look, Appearance card, element helper
src/modules/piano/       the piano tutor (everything piano: content loader, MIDI, engine, scoring,
                         progress, audio, demo, views); module definition in module.ts
src/modules/sums/        a tiny SAMPLE module (a five-sum quiz) that proves the switch works
```

Shared code never imports from a module. A module may import from `src/core/`.

## Addresses

- `#/` is the open module's home.
- `#/<module id>` opens a module; `#/<module id>/<route>/<arg>` is one of its pages.
- `#/profile`, `#/settings`, `#/demo` are shared pages. They show the account card / Appearance
  plus the open module's part (`Module.profile`, `Module.settings`), and the open module's demo.
- The piano's pages keep their old addresses (`#/lesson/<id>`, `#/book`, ...) because it sets
  `topLevel: true`. New modules do not; their links are `#/<id>/<route>`.

## Saved progress on one account

Everything is saved under `iggyuoso.` in localStorage and, when signed in, copied to the same
account (`docs/accounts.md`). A module saves through `new ModuleRecords('<id>')`, so its records are
`iggyuoso.<id>.<key>` and sync with no extra work. The piano keeps its old record names (`ex.*`,
`mastery.*`, `profile.*`, ...), so a new module's id must not be one of those first words
(`PIANO_RECORD_WORDS`; the test checks it).

`Module.records` says what the account needs to know:
- `merge`: records that grow (counts, logs) and should keep the most of both devices; anything
  without a rule takes the newer version.
- `keepOnWipe` and `keptLabel`: the player's own work that "Wipe progress" keeps.
- `localOnly`: records that belong to the device (the piano's `calibration`).
- `upgrade(v)`: upgrade steps when the app-wide `SCHEMA_VERSION` (src/core/storage.ts) is bumped.

## Adding a module

1. Make `src/modules/<id>/module.ts` exporting a `Module` (see `src/modules/sums/module.ts`):
   `id`, `name`, `description`, `tagline`, `icon` (24×24 SVG with `currentColor`), `routes` with a
   home `''`, `nav` links (hrefs like `<id>/<route>`), and as needed `profile`, `summary`,
   `settings`, `demo`, `activate` / `deactivate`, `redrawOnSync`, `records`.
2. Save progress with `ModuleRecords('<id>')`.
3. List it in `MODULES` in `src/app/modules.ts`.
4. Use the shared design tokens and classes (`docs/design.md`); no hard-coded colours.
5. Give it a demo (`Module.demo`) or a scene, as the demo rule in CLAUDE.md asks.
6. `npm test`: `tests/modules.test.ts` checks ids, homes and that no address answers twice.
7. When it is real, drop the sample: remove `sums` from `MODULES` and delete `src/modules/sums/`
   (and the "One app, many modules" demo scene's use of it).
