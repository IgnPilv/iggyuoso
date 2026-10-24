---
title: Spelling intervals, and augmented and diminished
stage: 6
lessons: [theory-spelling-intervals, reading-interval-fluency]
summary: To write an interval correctly you need both its number and its quality, and the letter names must match the number. This is where augmented and diminished intervals come from, and why two intervals that sound the same can have different names.
---

## Building an interval from a note

So far you have mostly **named** intervals: given two notes, say what the interval is. The reverse skill is **spelling** them: given a note and an interval, write the other note. "A minor 6th above E", "a perfect 4th below B♭", "a major 7th above F♯". Spelling intervals is essential for building chords and scales on paper, for transposing, and for reading quickly.

## Two steps: letter first, then size

Spelling an interval is the same two-step method as spelling a scale:

1. **Get the letter right** from the interval's number. Count letters from the starting note, including it. A 6th above E: E F G A B **C**. So the answer is some kind of C.
2. **Adjust the size** with a sharp, flat or natural so the semitone count matches the quality. A minor 6th is 8 semitones; E up to C is 8 semitones. So: **C** (natural).

Another: a major 3rd above B♭. Letters: B, C, **D**. A major 3rd is 4 semitones; B♭ to D is 4 semitones. So **D**.

And a major 3rd above B: letters B, C, **D**; but B to D is only 3 semitones. Raise it: **D♯**.

> **Spell an interval**: 1) count the letters to find the letter name; 2) add a sharp, flat or natural to make the right number of semitones. Never change the letter to fix the size.

The major-scale test helps with step 2: build the major scale on the lower note. Its notes are the major and perfect intervals above it. Lower a major interval by a semitone to get minor.

```figure
staff: { notes: "E4+C5:h Bb4+D5:h | B4+D#5:h F#4+E5:h", labels: names }
sound: "E4+C5:h Bb4+D5:h B4+D#5:h F#4+E5:h"
caption: E–C (minor 6th), B flat–D (major 3rd), B–D sharp (major 3rd), F sharp–E (minor 7th). Letters first, then size.
```

## Augmented and diminished

What if you need an interval one semitone wider than major or perfect, or one semitone narrower than minor or perfect? Those sizes have names too:

- **Augmented** (aug, or +): a semitone **larger** than major or perfect.
- **Diminished** (dim, or °): a semitone **smaller** than minor or perfect.

| Starting from | Larger by a semitone | Smaller by a semitone |
| --- | --- | --- |
| perfect (4th, 5th, octave) | augmented | diminished |
| major (2nd, 3rd, 6th, 7th) | augmented | (minor) |
| minor | (major) | diminished |

So the full ladder for a 3rd is: diminished 3rd (2 semitones) – minor 3rd (3) – major 3rd (4) – augmented 3rd (5). For a 5th: diminished 5th (6) – perfect 5th (7) – augmented 5th (8).

## Same sound, different name

Here is the important consequence. On the keyboard, C up to G♯ (augmented 5th) is exactly the same keys as C up to A♭ (minor 6th). Both are 8 semitones. Why have two names? Because the letter names are different: C to G is a 5th (C D E F G), C to A is a 6th. The names tell you how the notes function: in an augmented chord (C E G♯) the G♯ is a raised fifth that wants to rise to A; in an F minor chord (F A♭ C) the A♭ is a third.

The most famous example is the **tritone**, 6 semitones: F up to B is an **augmented 4th** (F G A B, four letters), B up to F is a **diminished 5th** (B C D E F, five letters). In C major these two notes are degrees 4 and 7, the two tendency tones, and the tritone between them is the tension at the heart of the dominant 7th chord.

```figure
staff: { notes: "C4+G#4:h C4+Ab4:h | F4+B4:h B4+F5:h", labels: names }
sound: "C4+G#4:h C4+Ab4:h F4+B4:h B4+F5:h"
caption: Augmented 5th and minor 6th sound alike but are spelled differently. F–B is an augmented 4th, B–F a diminished 5th.
check:
  ask: "What is a perfect 5th above B?"
  choices: ["F♯", "F", "G♭"]
  correct: 0
  why: "Letters: B C D E **F**, so some kind of F. A perfect 5th is 7 semitones; B to F is only 6 (a diminished 5th), so raise it: **F♯**. G♭ has the wrong letter (it would be a 6th)."
```

## Intervals below a note

To spell an interval **below** a note, count letters downwards (including the starting note), then adjust the size. A major 3rd below E: E, D, **C**; C up to E is 4 semitones, a major 3rd. So **C**. A perfect 4th below B♭: B, A, G, **F**; F up to B♭ is 5 semitones, perfect. So **F**. Another trick: use inversion. A major 3rd below E is the same letter as a minor 6th above E (3 + 6 = 9, major ↔ minor), an octave lower.

## Why it matters

Correct spelling is not pedantry. It is what makes music readable. A chord spelled in 3rds (C E G♯) looks like a chord on the staff, a neat snowman; misspelled (C E A♭) it looks like something else entirely. A scale spelled with every letter once looks like a staircase. Fluent readers rely on these shapes, so composers spell carefully to help them. Once you spell intervals well, you can build any chord: a major triad is a major 3rd plus a perfect 5th above the root; a dominant 7th adds a minor 7th; and so on.

## Common confusions

- **Fixing the size by changing the letter.** The letter comes from the number; only accidentals change the size.
- **Diminished 5th = augmented 4th.** Same keys, different spellings and functions.
- **Augmented means very large.** Only one semitone more than major or perfect.

## In short

To spell an interval, count letters to get the letter, then adjust with an accidental to get the right number of semitones. Augmented is a semitone larger than major or perfect; diminished a semitone smaller than minor or perfect. Intervals that sound alike, like an augmented 5th and a minor 6th, are spelled differently because they do different jobs. The tritone is an augmented 4th or diminished 5th.
