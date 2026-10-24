# Design system

The look of iggyuoso: dark first, clean and calm while you read, neon when you play.
It should feel bold and new-wave while staying calm to read. Owned by the design thread; other threads use the tokens.

## Rules

1. **Never hard-code a colour, font or radius in a component.** Use a token from
   `src/styles/tokens.css`. If none fits, add one, in both themes.
2. **Canvas and SVG read the same tokens.** CSS/SVG use `var(--token)`. Canvas code calls
   `palette()` from `src/ui/theme.ts` (cached, refreshed on theme change), or `tokenColor('--ok')`
   for a token name passed around as data (for example falling notes' `marked` map).
3. **Both themes, always.** Dark is the reference look; check light too. `#/demo` → "Dark and
   light" flips between them.
4. **Meaning colours are fixed:** right hand `--rh` (blue), left hand `--lh` (green), expected key
   `--target` (amber), right `--ok`, wrong `--bad`, stars `--star`. Brand colours (coral → pink →
   violet, `--brand-gradient`) are for the brand and the main actions, never to mean right or wrong.
5. **The falling-notes stage is dark in both themes**, like a stage. Its `--lane-*` tokens only
   exist in the dark set.

## Tokens

| Group | Tokens |
| --- | --- |
| Surfaces | `--bg`, `--surface`, `--surface-2`, `--surface-solid`, `--surface-sunken`, `--line`, `--line-strong` |
| Text | `--ink`, `--ink-2`, `--muted`, `--on-accent` |
| Brand and action | `--brand-1..3`, `--brand-gradient`, `--accent`, `--accent-ink`, `--accent-soft`, `--focus` |
| Meaning | `--ok`, `--bad`, `--warn` (+ `-soft`), `--target`, `--star` |
| Hands | `--rh`, `--rh-bright`, `--rh-key`, `--rh-soft`, and the same for `--lh` |
| Instrument | `--key-white`, `--key-black`, `--key-stroke`, `--key-label`, `--key-pos`, `--key-pressed`, `--middle-c`, `--staff-ink`, `--staff-line` |
| Falling stage | `--lane-*`, `--hit-line`, `--note-ink` |
| Type | `--font-display` (Space Grotesk), `--font-body` (Inter), `--font-mono` (JetBrains Mono), `--font-music`; sizes `--text-xs` … `--text-hero` |
| Space, shape, motion | `--space-1..8`, `--radius-sm/md/lg/pill`, `--ease-out`, `--ease-spring`, `--dur-fast/dur/dur-slow`, `--shadow-1`, `--shadow-glow`, `--blur` |

Fonts are bundled from npm (`@fontsource-variable/*`), so nothing loads from a font CDN.

## Theme

- The player picks **Follow the device / Dark / Light** with the header button or Settings →
  Appearance. It is saved in `settings.theme`.
- `index.html` sets `<html data-theme>` before first paint, so the page never flashes the wrong theme.
  `src/ui/theme.ts` keeps it in sync and fires `iggyuoso:theme-choice` when the choice changes.
- `previewTheme()` shows a theme without saving it. Only the demo uses it.

## Components

- **Card** (`.card`): glass surface, large radius. Cards are not nested. Inside the demo stage, a card is drawn flat.
- **Buttons**: primary is the brand gradient with a glow, `.secondary` is a ghost button, `.chip` is
  small and monospaced, `.icon-btn` is a round icon. Use one primary button per area.
- **Segmented control** (`.segmented` / `.view-toggle .seg`): pick one of a few, with
  `aria-pressed`.
- **Toggle**: checkboxes are drawn as switches.
- **Hand badge** (`.hand-badge.right|left|together|alternating`): a dot in the hand colour.
- **Transport** (`.transport`): an exercise's first row is Listen, a large Play and Stop, plus the
  view toggle. Everything else (tempo, click, guide notes, looping) sits in an **Options drawer**
  (`details.drawer`), whose summary shows the meter and bpm. Status text is a small line
  (`.status-line`), never a headline.
- **Growing tree** (`src/ui/treeView.ts`): the home page draws the player's tree. The whole shape is
  always there faintly (trunk, a ring per milestone, dashed branches with name and count), and colour
  grows along it: the trunk climbs with milestones passed, each branch lengthens and leafs out with its
  nodes (pale leaf = Practised, full leaf = Solid or Mastered), a glowing bud marks something open, and
  songs blossom in the crown. Branch colours: the strand tokens (`strand-stroke-*`, `strand-fill-*`).
  Below it: "Growing now" (open nodes as tiles, at most two per branch), the Songs card, and "The whole
  tree": stages up the trunk, the current one open as a **weave** (`stageWeave`): a column per branch,
  each node one row below the deepest node it needs in that stage, and an SVG thread for every
  requirement (cross-branch threads stronger, in the colour of the branch they come from; links into
  the milestone dashed and faint). Pointing at a node lights it, its threads and its neighbours. On a
  phone the weave scrolls sideways inside the card. Branch pages list each node's threads from other
  branches under its title. Badges appear only for things worth acting on
  or celebrating (Review, Solid, Mastered, reps in progress); "not grown yet" is a quieter dashed tile,
  never a warning.
- **Theory screen** (`src/ui/theory.ts` builds it, design styles it): large text (about 1.2–1.35 rem)
  beside a picture panel (staff, lit keys, Hear it) on wide screens, stacked on phones. The rule is a
  callout with a gradient edge, key terms are chips, and the check question is its own card with a gradient top
  edge. In the playground the note name is set big in the display font.
- **Phone** (≤ 560 px): icon-only nav, tighter gutters, a full-width transport. No page may scroll
  sideways; wide music (the staff strip) clips or scrolls inside its own box.
- **Lesson tiles** (`ol.lessons`): numbered tiles. `.done` shows a green tick and `.next` gets the gradient
  border. This is the seed of the mastery map.
- **Big numbers** (score, live score, count-in) use the display font, tight and tabular.

## Scaling up

- **Mini games:** draw them on a canvas through `palette()`, on the dark stage. Use the hand and
  meaning colours for gameplay, and brand colours only for celebration (streaks, stars).
- **Motion:** use `--ease-spring` for rewards and `--ease-out` for everything else. Respect
  `prefers-reduced-motion`, which the base styles already switch off.
