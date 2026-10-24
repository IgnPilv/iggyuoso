---
title: Spelling any scale
stage: 5
lessons: [theory-scale-spelling, reading-key-signatures]
summary: With two rules, one letter per note and the right pattern of steps, you can write out any major or minor scale correctly on paper, without a keyboard and without guessing at sharps and flats.
---

## Why spell scales on paper?

You can play a scale by ear, or by following a fingering. Writing it out, naming each note correctly, is a different skill, and an important one. It is how you work out a key you have never played, check a key signature, transpose a tune, or build chords. It is also exactly what music-school theory exams ask for. And it trains you to think of a key as a set of named notes rather than a pattern of black and white keys.

## Rule 1: one letter per note

A seven-note scale uses each letter **exactly once**, in order. Before thinking about sharps or flats at all, write the letters. For a scale on E: E F G A B C D E. For B♭: B C D E F G A B. The accidentals come next, but the letters never change.

This rule alone prevents the most common spelling mistakes, such as writing A♭ where G♯ is needed, or having both a G and a G♯ in one scale.

## Rule 2: apply the pattern

Now go through the letters one step at a time and adjust each note with a sharp or flat so the step is the size the pattern requires.

- **Major**: T T S T T T S.
- **Natural minor**: T S T T S T T.
- **Harmonic minor**: natural minor with degree 7 raised by a semitone.
- **Melodic minor**: going up, degrees 6 and 7 raised; coming down, natural minor.

Let us spell **E major**. Letters: E F G A B C D E.

| Step | Needs | Note |
| --- | --- | --- |
| E → F? | tone | E to F is a semitone, so raise: **F♯** |
| F♯ → G? | tone | F♯ to G is a semitone, so raise: **G♯** |
| G♯ → A | semitone | G♯ to A is a semitone ✓ **A** |
| A → B | tone | ✓ **B** |
| B → C? | tone | B to C is a semitone, so raise: **C♯** |
| C♯ → D? | tone | raise: **D♯** |
| D♯ → E | semitone | ✓ **E** |

E major: **E F♯ G♯ A B C♯ D♯ E**, four sharps.

```figure
staff: { notes: "E4:q F#4:q G#4:q A4:q B4:q C#5:q D#5:q E5:q", labels: names }
sound: "E4:q F#4:q G#4:q A4:q B4:q C#5:q D#5:q E5:h"
caption: E major, spelled letter by letter: four sharps, F C G D, in the usual order.
```

Check: the sharps you found, F♯ C♯ G♯ D♯, are the first four in the order of sharps (F C G D A E B). Good. If your result does not match the order, something went wrong.

> **To spell a scale**: 1) write the seven letters from the tonic, 2) step through them adjusting each note so the step matches the pattern. Check the result against the order of sharps or flats.

## Spelling a minor scale

Spell **G harmonic minor**. Letters: G A B C D E F G. Natural minor pattern, T S T T S T T:

- G → A: tone ✓ A
- A → B?: needs a semitone, so lower B to **B♭**
- B♭ → C: tone ✓ C
- C → D: tone ✓ D
- D → E?: needs a semitone, so lower E to **E♭**
- E♭ → F: tone ✓ F
- F → G: tone ✓ G

G natural minor: G A B♭ C D E♭ F G (two flats, like its relative major B♭). For the **harmonic** minor, raise degree 7: F becomes **F♯**. G harmonic minor: **G A B♭ C D E♭ F♯ G**. It has flats and a sharp at once, which is perfectly normal for a harmonic minor. The F♯ is written as an accidental, never in the key signature.

```figure
staff: { notes: "G4:q A4:q Bb4:q C5:q D5:q Eb5:q F#5:q G5:q", labels: names }
sound: "G4:q A4:q Bb4:q C5:q D5:q Eb5:q F#5:q G5:h"
caption: G harmonic minor: two flats from the key, and F sharp, the raised 7th.
```

## The shortcut: from the key signature

Once you know the key signatures, spelling becomes faster: write the letters, then apply the key signature (for minor keys, the relative major's signature), then for harmonic or melodic minor, raise the right degrees. For D major: two sharps, F♯ and C♯, so D E F♯ G A B C♯ D. For F♯ minor: same signature as A major (three sharps), so F♯ G♯ A B C♯ D E F♯; harmonic minor raises E to **E♯**.

That last one surprises people: why E♯ and not F? Because of rule 1. The scale already uses F (as F♯). The 7th degree has the letter E, so raising it gives E♯. Writing F would put two kinds of F in the scale and no E at all.

```figure
check:
  ask: "What is the raised 7th in F♯ harmonic minor?"
  choices: ["E♯", "F", "F natural"]
  correct: 0
  why: "The letters run F♯ G♯ A B C♯ D **E** F♯. The 7th letter is E, so raising it gives **E♯** (the same key as F, but spelled with E so every letter appears once)."
```

## Writing scales on the staff

When writing a scale on the staff by hand:

- Place the notes on consecutive lines and spaces (one letter each).
- Put each accidental **before** its note, on the same line or space.
- If using a key signature, write it after the clef and add only the accidentals that differ from it (in minor, the raised 6th and 7th).

## Common confusions

- **Choosing accidentals by sound.** Choose by letter first; the sound is the same anyway.
- **Mixing sharps and flats in a major scale.** A major scale uses only sharps or only flats (C uses none).
- **Avoiding E♯, B♯, F♭ and C♭.** They are correct whenever the letter rule demands them.

## In short

To spell any scale, write the seven letters from the tonic, then adjust each note so the steps match the pattern: T T S T T T S for major, T S T T S T T for natural minor, then raise degree 7 (harmonic) or 6 and 7 going up (melodic). Check against the order of sharps or flats. The letter rule explains spellings like E♯ in F♯ minor.
