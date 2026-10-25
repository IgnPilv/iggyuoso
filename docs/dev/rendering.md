# Drawing: sheet music, falling notes, keys, hands, chord names, screens

*How the screens are drawn. Code in `src/modules/piano/ui/` (screens) and `music/` (the musical
decisions the screens draw). Look and colours follow [docs/design.md](../design.md): every colour
is a token from `src/styles/tokens.css`, also on the canvas (through `palette()` in
`src/core/theme.ts`).*

## Two views of the same music

Every played exercise can be seen as **Keyboard & sheet** or as **Falling notes**, with a switch
on the exercise (the player's choice is remembered in `settings.view`). Both views draw from the
same session clock (see [input-and-timing.md](input-and-timing.md)), so they always agree.

### Sheet music (`ui/staff.ts`)

`renderStaff` draws an SVG staff: one clef or the grand staff, with clefs, key signature, time
signature, note heads, stems, flags, rests, ties, triplet 3s, accidentals by bar rules,
finger numbers, the pedal line, dynamics marks and chord names. It returns handles to **mark**
notes while playing (current, hit, missed, wrong) and to follow a playhead. In falling notes the
same staff shows as a strip above the lane that scrolls with the music (`staffStrip` in
`ui/players.ts`).

### Falling notes (`ui/falling.ts`)

`FallingView` is a canvas, redrawn every frame from a `FrameState` (the beat, held keys, each
note's state, flashes for hits and mistakes, pedal). Notes fall towards the keyboard drawn at the
bottom and reach it on their beat; colour says the hand (right blue, left green), a chip on each
note gives its finger, a pill beside a chord gives its name, the pedal is a strip on the right.
The view keeps no time of its own. Step-by-step exercises use **wait mode**: the next note falls
to the keys and waits until it is played.

### The keyboard (`ui/keyboard.ts`)

`KeyboardView` is an SVG keyboard for a range of keys. Each key's look is a CSS class (target,
pressed, right, wrong, hand position), so screens only say "light this key".

## Fingers, hands and chord names

These are worked out in `music/` (tested) and only drawn by `ui/`:

- **Fingering** (`music/fingering.ts`): written fingering always wins. Where none is written, the
  loader suggests one: a five-finger position when the line fits under the hand, otherwise a
  search over finger stretches, thumb passing and hand moves. `tests/fingering.test.ts` checks it
  agrees with at least 90% of the hand-written fingering.
- **Hands on the keys, beta** (`music/handPlacement.ts`, drawn by `ui/hands.ts`): `HandPlan` says,
  for any beat, where each finger of each hand rests, which one is playing and which plays next,
  and slides the hand to a new position just before it is needed. The same outline is drawn on the
  canvas and on the SVG keyboard.
- **Chord names** (`music/chordNames.ts`): `chordSymbols` names chords from both hands together
  (C, Am, G7, F♯m...), by root, and writes a name only where the chord changes. The sheet writes
  them over the staff; falling notes use words for triads ("C major", `chordWords`).

Each has an Options switch (Fingers, Hands, Chord names), saved in `settings`, and each is hidden
where it would give an answer away (reading tests, taps).

## The screens around the music

- **Players** (`ui/players.ts`): `mountExercise` picks a player by kind. The timed player holds the
  transport (Listen, Play, Pause, Stop), the Scored / Practice switch, the Options pop-over (tempo,
  count-in, click, guide notes, fingers, hands, chord names), the live score and the result card.
  Question kinds are in `ui/drills.ts`, improvising in `ui/improvise.ts`, the bar slider for
  practice in `ui/barRange.ts`.
- **Lesson panels** (`lessonView` in `ui/views.ts`): a lesson fills the window as a column of
  full-height panels that snap as it scrolls, one per step plus the recap. Only the panel in view
  is built. The step bar on top (`ui/stepBar.ts`) jumps to any step and marks what is done.
  Enter presses the main button, Space plays or pauses (`ui/keys.ts` stops Space from pressing
  buttons).
- **Phone on its side** (`ui/fullScreen.ts`): falling notes only, edge to edge, with controls that
  show on a tap.
- **Theory screens** (`ui/theory.ts`): explain steps with staff and key pictures, sounds, rule
  boxes, terms and check questions; the playground.
- **Home and the tree** (`ui/treeView.ts`, `ui/treePages.ts`): the drawn growing tree, "Growing
  now", the stage map with threads between branches, branch pages, the Songbook and song pages.
- **Other pages**: the Book (`ui/bookView.ts`, with `ui/markdown.ts`), Today (`ui/todayView.ts`),
  Profile (`ui/profileView.ts`), Sketchbook (`ui/sketchbookView.ts`), My songs
  (`ui/mySongsView.ts`), the Chord finder (`ui/chordFinderView.ts` over `music/chordFinder.ts`:
  names whatever keys are held, spells them from the root, gives the position and offers the other
  positions and nearby chords, other names for the same keys (`allReadings`) and the keys each belongs to
  (`keysOf`); keys can be tapped on the picture; and the other way round, a typed chord name
  (`parseChordName`, `suggestChords`) or picked root and kind is built on the keys; nothing saved), the recap (`ui/recap.ts`), calibration, Settings and the MIDI tester
  (`ui/views.ts`).
- **Note Rush** (`ui/noteRush.ts`, game rules in `engine/noteRush.ts`): the note-reading game. In
  its default mode each note is cut out of a one-note `renderStaff` drawing and slid along an
  empty staff by an SVG `transform` every frame; the other mode redraws a four-note staff.
- **The demo** (`ui/demoView.ts`): a list of scenes, each running real screens with the virtual
  pianist ([how-to.md](how-to.md#add-a-demo-scene)).
