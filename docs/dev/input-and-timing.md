# Input and timing: keys in, clock, latency

*How a key press on the piano reaches the app, how the app knows which key it was, and how it
knows when it was played. Code in `src/modules/piano/`.*

## Three ways to press a key, one path

```
 MIDI keyboard ──(Web MIDI)──▶ midi/input.ts ──▶ midi.onNote / midi.onPedal ──▶ every screen
 computer keyboard ─(keydown)─▶ midi/computerKeys.ts ──▶ midi.inject(...)  ─┘
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
- **The demo pianist** (`demo/pianist.ts`) plays exercises with a few deliberate slips.

The last two send their notes through `midi.inject`, so every screen handles all three the same
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

