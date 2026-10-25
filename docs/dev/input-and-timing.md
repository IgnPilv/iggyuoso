# Input and timing: keys in, clock, latency

*How a key press on the piano reaches the app, how the app knows which key it was, and how it
knows when it was played. Code in `src/modules/piano/`.*

## Four ways to press a key, one path

```
 MIDI keyboard ──(Web MIDI)──▶ midi/input.ts ──▶ midi.onNote / midi.onPedal ──▶ every screen
 computer keyboard ─(keydown)─▶ midi/computerKeys.ts ──▶ midi.inject(...)  ─┘
 on-screen keys ─(pointer)──▶ ui/tapKeys.ts ─────────▶ midi.inject(...)  ─┘
 demo pianist ──────────────▶ demo/pianist.ts ───────▶ midi.inject(...)  ─┘
```

- **A real keyboard** speaks MIDI: short messages such as "note 60 on, strength 80". The browser
  hands them over through Web MIDI (Chrome and Edge; it needs https, which is why the site is on
  GitHub Pages). `MidiInput` (`midi/input.ts`) listens to every connected input, decodes notes
  and the sustain pedal (controller 64, down at 64 and above), keeps the set of keys held, and
  calls whoever listens (`midi.onNote`, `midi.onPedal`). The MIDI tester page (`#/midi`) shows
  the raw messages.
- **The computer keyboard** (Settings → Computer keyboard, off by default) turns A S D F ... into
  white keys and W E T ... into black keys, Z / X shift an octave, Space is the pedal
  (`midi/computerKeys.ts`). It reads the physical key (`KeyboardEvent.code`), so it works on any
  keyboard layout, and ignores typing in text boxes.
- **The keys drawn on the screen** can be tapped with a mouse or a finger (`ui/tapKeys.ts`). A
  screen turns them on with `KeyboardView.playable()` or `FallingView.playable()` (on the falling
  notes only the keys at the bottom react, not the lane). A tap sends the note in as port
  "On-screen keys" and, since a picture makes no sound, plays the sampled piano until the finger
  lifts (`pianoHold` in `audio/audio.ts`); sliding along the keys plays each key crossed. Turned on
  in exercises (ear, quiz, build, find, step-by-step, timed, improvise), theory checks and the
  playground, Note Rush and Play by ear. Answers given by tapping count like any other, but a timed
  or improvised take that saw a tap (`tapCount()`) is practice: shown, never saved, since a mouse
  or a finger can't keep time like a key. The style `.tappable` keeps vertical swipes scrolling.
- **The demo pianist** (`demo/pianist.ts`) plays exercises with a few deliberate slips. With
  `tapIn` set it taps the drawn keys instead (real pointer events, with a fingertip shown).

The last three send their notes through `midi.inject`, so every screen handles all three the same
way and nothing has a special case for "not a real piano".

## Calibration: which key is middle C

Keyboards do not agree on numbers: one sends 60 for middle C, another 48 or 72. So the first run
asks the player to press the **lowest white key** and then the **highest key**
(`calibration.ts`). From that the app knows the range and picks middle C as the C nearest the
middle; the player confirms it by pressing it.

Inside the app every note is a **written** number with middle C = 60 (`C4`). Calibration stores
one `offset`, and `toDevice` / `toWritten` convert between written notes and the player's real
keys. Content never mentions device numbers.

`keyWindow` picks which part of the keyboard to draw for an exercise: always with middle C in
view, at least two octaves.

## Near-together presses are one chord

Fingers never land at exactly the same moment. Presses of one hand within 60 ms count as one chord,
timed from the first (`midi/chords.ts`). Hands are not merged, so the gap between the hands is
still measured (that is the "hands together" number).

## The clock

All times are milliseconds on the browser's `performance.now()` clock. MIDI messages carry their
own timestamp on that clock; if a driver sends nonsense (0, or more than a second off), the time
of arrival is used instead (`sanitizeTimestamp`).

## Latency: why "now" is not now

Sound takes time to come out of the speakers: the audio system has an output delay, and Bluetooth
adds more. The player plays along with what they **hear**. So the app subtracts that delay:

- `outputLatencyMs()` (`audio/audio.ts`) asks the browser for the audio delay;
- Settings → Timing adds the player's own correction;
- `TimedSession` treats a key pressed at time T as belonging to song time `T − t0 − latency`, and
  draws the music where the player hears it (`now − latency`).

The piano makes its own sound for what the player plays, so the app's sounds are only the
metronome clicks, guide notes and prompts (a sampled Salamander grand, `public/piano/`).

## The timing loop: one session, every view

`TimedSession` (`engine/timedSession.ts`) is one run of a timed exercise. It has **no screen and
no sound code**, which is why it can be tested on its own (`tests/timedSession.test.ts`). It knows:

- the notes each hand should play, flattened from the note strings into beats (`music/timeline.ts`:
  ties joined, upbeats padded so bar lines stay whole);
- the tempo, count-in (full bar, short "3 4", or none) and when the first downbeat is;
- `clicks()` and `guide()`: what to play when, which the screen hands to the audio module;
- `position(now)`: the phase (waiting, count-in, playing, done) and the beat, a fraction such as
  `5.25`;
- `noteOn` / `noteOff` / `pedalChange`: records each press and judges it at once for live
  feedback (hit with its early/late ms, wrong key, extra);
- `liveState` and `liveScore`: what to colour and the running score while playing;
- `pause` / `resume`: the clock holds, and resuming moves the whole schedule on so the music picks
  up at the same beat after a bar of count-back. A paused take is shown but never saved;
- `result()`: the full score at the end ([scoring.md](scoring.md)).

The timed player (`ui/players.ts`, `timedPlayer`) runs a frame about 60 times a second
(`requestAnimationFrame`). Each frame asks the session for the position and the note states and
hands them to whatever is on screen: the falling notes, the sheet's playhead and marks, the lit
keys, the hands. Because **every view draws from the same session clock**, the sheet and the
falling notes can never disagree, and switching views mid-take is safe.

## Untimed and question exercises

`find` and `sequence` use small state machines in `scoring/untimed.ts` (`FindSession`,
`SequenceSession`): each takes device key numbers and says correct, wrong or again. Ear, quiz and
build questions use `EarSession`, `QuizSession` and `BuildSession` (`engine/drills.ts`) the same
way; they describe the sounds to play, and the screen plays them. Free play (Sketchbook,
improvising) records with `Recorder` (`engine/recorder.ts`) on the same clock, and
`music/transcribe.ts` writes the take down as notes.

## Practice mode and the tempo ladder

- **Practice mode** cuts the chosen bars out of the exercise as an exercise of their own
  (`sliceBars` in `engine/practice.ts`) and plays it round until Stop. `sliceMap` maps the slice's
  notes back to the whole piece so the sheet marks the right notes. Nothing is saved.
- **The tempo ladder** (`climb`): three clean takes at the current step move up, two failed takes
  in a row move down. Saved per exercise as `ladder.<id>`.

## The Timing mirror (`#/pulse`)
A metronome page that measures every press, separate from exercises. `engine/pulse.ts` (`Pulse`,
tested in `tests/pulse.test.ts`) schedules the clicks (one bar of count-in, then a click a beat,
none in silent bars: `silent: { play, rest }` bars), and matches each press to the nearest beat or
half beat after taking latency off, as an offset in ms (minus = early). Hands are split at middle
C (written MIDI 60); notes of one hand within 60 ms are one chord. `pulseStats` gives each hand's
mean and spread, `silentDrift` compares silent bars with clicked ones (needs 3 of each),
`tapTempo` turns taps into a tempo. `ui/pulseView.ts` draws the dots and the timeline as SVG and
saves nothing; its settings last until the page reloads (the demo uses its own copy).

## The Jam room (`#/jam`)
A backing band to improvise over, separate from exercises. `engine/jam.ts` (tested in
`tests/jam.test.ts`) holds the data: the progressions (`BACKINGS`, one Roman numeral per bar, built
with `romanChord` and named with `chordName`), what the band plays in a bar of each groove
(`barEvents`: drums, a bass in octave 2, the chord in close position around middle C), and how a
played note fits (`fitOf`: chord note, suggested scale, key, outside; `chordAt` gives a note in the
last eighth of a bar to the next chord). `ui/jamView.ts` schedules one bar at a time a quarter of a
second ahead (a 50 ms timer), so tempo, key and groove changes apply from the next bar; each
scheduled bar keeps its start, beat length and plan, and a press is placed against them after
taking latency off. Drums are synthesised (`drum` in `audio/audio.ts`); bass and chords use the
sampled piano. Nothing is saved; settings last until the page reloads (the demo uses its own copy).

## The Scale gym (`#/scales`)
Scales and arpeggios up and back down on the click, measured note by note. `engine/scaleGym.ts`
(tested in `tests/scaleGym.test.ts`): `gymPlan` builds the run (major, natural and harmonic minor,
chromatic, major and minor arpeggios; one or two octaves; right hand from the tonic in octave 4, the
left hand as many octaves lower as the run is long, so the hands never share a key) with textbook
fingering from `gymFingers` (scales: the place of the fourth finger per key decides the 1 2 3 /
1 2 3 4 groups; chromatic: 3 on black keys; arpeggios 1 2 3 5 / 5 3 2 1, or 1 2 3 1 2 3 5 / 5 4 2 1
4 2 1 for two octaves; minor keys and arpeggios on white-key tonics only). `isPass` marks the thumb
passing under or a finger crossing over it, in the direction of travel. `ScaleGym` schedules one bar
of count-in and clicks up to the last note, and matches each press to the nearest unplayed note on
that key within 1.5 steps (200 to 700 ms), keeping its offset and velocity; other keys are wrong.
`gymReport` scores the run (each note full marks within 20 ms, nothing at half a step, 60 to 100 ms;
a wrong key costs half a note) and gives each hand its lean, spread, thumb passes against the other
notes, loudness spread and thumb loudness (only when velocities vary), the notes furthest off, and
at most two tips. `ui/scaleGymView.ts` lights the keys with their fingers, draws the per-note chart
as SVG and saves nothing; settings and the best score of each setup last until the page reloads.

**Free tempo** (no click). `FreeGym` lets each hand work through its notes in order: the first note
of a hand starts the run, a key up to two notes ahead counts (the notes skipped are missed), any
other key is wrong, and the page ends the run 3 s after the last note (or on Stop). `freeTempo`
then finds the player's step (the middle gap between notes, a skipped note counting as two gaps;
shown as beats a minute at the chosen notes a beat) and measures each note's gap against the
middle of up to four gaps either side, so a slow start or a gentle drift is not blamed on every
note while a hesitation (held back, plotted up) or a rushed note (hurried, plotted down) stands out.
It also gives the tempo going up and coming down and, hands together, how far apart the hands land.
`gymReport` takes these offsets like the clicked ones; `freeTips` adds "sped up / slowed down on the
way down" and "one hand ahead". The result offers "Practise at N with the click".

**Any scale, recognised.** In the mode "Free tempo, any scale" the page records every key and, when the
run ends, `recognise` works out what it was: `splitHands` calls it both hands when most keys come in
pairs within 60 ms (the lower key is the left hand's), else the left hand when the notes sit mostly
below middle C; then every kind of `GYM_KINDS`, starting on the first or lowest note, one or two
octaves by the span played, is compared with what was played by `lineDistance` (notes added, left
out or changed), and the closest wins if at most 35% of its notes differ. The plan is moved to the
octaves the hands played in, the run is fed again into a `FreeGym` (`replay`) and measured as above,
and the boxes show what was heard.

`ui/animate.ts` (`animate`, used by the players and these pages) stops for good even when the drawing
function stops it from inside; before, a run that ended on its own kept drawing ("Coming down") and
broke the next run.

## Play by ear (`#/byear`)
Find a known tune on the keys. `engine/byEar.ts` (tested in `tests/byEar.test.ts`) holds 20
public-domain openings (`EAR_TUNES`, easy / medium / hard; written in C major or A minor as note
strings, bar lines only for reading) and moves them to another key letter by letter (`movePitch`,
`EAR_KEYS`: C, D, F, G, A, B♭, kept near middle C), so they stay spelled right. `EarHunt` gives the
first note and takes presses (written MIDI): the next note is right; the tune again from its start,
or the last note found, is a replay and never a guess; the right note in another octave is only
pointed out; anything else is a wrong try, answered with higher or lower and, from the second try,
how far the tune moves from the last note found (`moveSize`: step 1–2 half steps, skip 3–4, leap 5+).
"Show me" finds the note for no credit. Score: each note after the first counts 1 on the first
try, 0.6, 0.3, then 0.15; shown 0. Rhythm is not judged. `ui/byEarView.ts` plays the tune with its
rhythm on the sampled piano (keys dark until it is found), writes the notes found on the staff, and
saves nothing; settings, the last four tunes (not repeated) and best scores last until reload.

## The Play report (`#/report`)
Play anything, with no click and nothing picked first, and get a report on it. `engine/playReport.ts`
(tested in `tests/playReport.test.ts`) works on the notes of a take (written MIDI, on and off times,
velocity):
- `events` groups notes struck within 60 ms (`CHORD_MS`) into one event, timed from the first.
- `unitOf` finds the grid step: the shortest gap that at least an eighth of the gaps (two at least)
  sit within 20% of, then fitted by least squares to every gap that is close to a whole number of
  steps (1 to 8). The beat is that step doubled until it is at least 430 ms (140 a minute at most).
- `placeOnGrid` walks the events left to right and gives each gap a number of steps (`stepsOf`:
  rounded leaning short, so a hesitation reads as held back; under 0.7 of a step it is a half or a
  quarter step; a dotted note followed by a short one gets its half step), following the recent
  tempo (middle step of the last six gaps, kept within −25% / +33% of the whole take's step). A gap
  over five steps and 1.5 s is a **stop**. Then each gap is set against the beat around it (middle
  step of up to six gaps either side): longer by more than 20% of a step (45 to 120 ms, plus a little
  per extra step) is **held back**, shorter by as much is **hurried**. So a gentle drift is never
  blamed on every note, while a wait or a rushed note stands out.
- The tempo curve is the local tempo at each note; the first third against the last third says
  sped up or slowed down (at least 4 a minute and 6%).
- Each hand (split at middle C) gets how often it struck and its spread (root mean square of its
  events' deviations, the worst tenth left out, since a single hesitation is listed on its own);
  events with both hands give how far apart they land.
- `detectKey`: Krumhansl–Kessler profiles against a pitch-class weight (time sounding up to 2 s plus
  a little per note; the lowest note of the first and last events counts extra); the runner-up is
  named when it is within 0.05.
- `chordsHeard` writes the two hands as lines on the grid (a note lasts to its release or its hand's
  next note) and names the chords with the sheet's own `chordSymbols`, with a Roman numeral in the
  key found (`numeral`; lower case for minor and diminished).
- Loudness from velocities (10th and 90th percentile as pp to ff, and each hand's middle level),
  only when velocities vary; `reportTips` gives up to three tips (stops, tempo drift, a note held back
  before more than once, hands apart, left hand louder, mostly hurried) or one word of praise.

`ui/playReportView.ts` listens all the time: the first key starts a take, five seconds with no key
down (or Finish) ends it, and the next key starts a new one. It shows the report, a tempo line and a
note-by-note chart (held back up, hurried down, by hand; stops as dashed lines), plays the take back
on the sampled piano, and hands its starting tempo to the Timing mirror (`presetPulse`). Nothing is
saved.

## The Duet (`#/duet`)
The player plays a tune's melody and the app plays the left hand, following them. `engine/duet.ts`
(tested in `tests/duet.test.ts`):
- `DUET_TUNES` are Play by ear's public-domain tunes (all in 4/4) with a chord per bar, or two
  for half a bar each (`'C G'`). `voice` puts the root low (C2 to B2) and the triad close in C3 to
  B3; `accompaniment` turns the chords into band notes in one of three styles: held chords, bass and
  chord (oom-pah: bass on beats 1 and 3, chord on 2 and 4), rolling eighths (root, top, middle, top).
- `Duet` follows the player. Nothing sounds before the first melody note; each right note becomes
  the anchor (its beat and the time it was played), and band notes are handed out (`due(until)`) at
  the anchor's time plus their beats at the learnt tempo, but **never at or past the next melody
  note**: those wait until it is played, and band notes the player has run past are dropped. The
  tempo starts at the tune's own and learns from each gap (40% of the new gap's beat), except a gap
  over 1.5 times the tempo, which counts as the band waiting and teaches nothing. The right note an
  octave away counts; keys more than a fifth under the tune are left alone (the player's own left
  hand); other keys are wrong keys.
- `duetReport` sets each gap against the player's own beat around it (middle of up to three gaps
  either side), in beats: over 0.25 of a beat long is **held back**, over 0.2 short **hurried**, and a
  wait of the band is its own mark. Score: each note full marks within 0.08 of a beat, nothing at 0.5,
  a wait nothing, −3 a wrong key. Tempo: first third against last third (waits left out), sped up or
  slowed down at 4 a minute and 6%. Up to three tips (waits, long notes cut short, holding back
  before jumps, tempo drift, wrong keys) or a word of praise.

`ui/duetView.ts` runs the band on animation frames with a 120 ms lookahead on the sampled piano,
shows the band's keys faintly as they sound, lights the next melody note (switchable), says when the
band is waiting, and shows the report when the tune's last beat is over. Hear it plays tune and band
at the tune's tempo. Nothing is saved.
