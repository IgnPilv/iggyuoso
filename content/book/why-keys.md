---
title: Why music has keys
stage: 2
lessons: [keys-and-signatures]
summary: The reason G needs a sharp and F needs a flat is one pattern of tones and semitones that every major scale follows. Once you see the pattern, you can work out any major key yourself.
---

## The question behind the sharps

In the last chapter you heard that the G scale on white keys sounds wrong until F becomes F♯, and the F scale sounds wrong until B becomes B♭. That was a matter of listening. This chapter explains **why**, and the explanation is one of the most useful ideas in all of music theory: every major scale follows exactly the same pattern of steps.

## The pattern of the major scale

Play the C major scale, C D E F G A B C, and look at the distance between each pair of neighbouring notes. Remember: between white keys every step is a **tone** (two semitones, with a black key between), except E–F and B–C, which are **semitones**.

| From | To | Step |
| --- | --- | --- |
| C | D | tone |
| D | E | tone |
| E | F | **semitone** |
| F | G | tone |
| G | A | tone |
| A | B | tone |
| B | C | **semitone** |

So the major scale goes: **tone, tone, semitone, tone, tone, tone, semitone**. Musicians write it as **T T S T T T S** (or W W H W W W H, for whole and half steps). The semitones fall between the 3rd and 4th notes, and between the 7th and 8th.

```figure
keys: { notes: "C4 D4 E4 F4 G4 A4 B4 C5", labels: names }
sound: "C4:q D4:q E4:q F4:q G4:q A4:q B4:q C5:h"
caption: C major: T T S T T T S. The semitones are E–F and B–C, where no black key sits between.
```

> **Every major scale** follows **T T S T T T S**. Semitones between notes 3–4 and 7–8, tones everywhere else. That pattern is what makes it sound "major".

It is no accident that C major uses only the white keys. The white keys were arranged, centuries ago, so that this pattern fits them exactly starting on C.

## Moving the pattern

Now start the same pattern on G, and watch what happens:

| Step | Pattern says | White keys give | Result |
| --- | --- | --- | --- |
| G → A | tone | tone ✓ | A |
| A → B | tone | tone ✓ | B |
| B → C | semitone | semitone ✓ | C |
| C → D | tone | tone ✓ | D |
| D → E | tone | tone ✓ | E |
| E → ? | tone | E→F is only a semitone ✗ | **F♯** |
| ? → G | semitone | F♯→G is a semitone ✓ | G |

To keep the pattern, the 7th note must be a tone above E, which is F♯, and that also makes the last step, F♯ to G, the semitone the pattern needs. One change fixes both. So G major has one sharp, F♯.

Start the pattern on F instead. F to G is a tone, G to A a tone, and then the pattern wants a **semitone**, but A to B is a tone. The 4th note must come down to **B♭**, a semitone above A. Then B♭ to C is a tone, as the pattern wants, and the rest fits. So F major has one flat, B♭.

```figure
staff: { notes: "G4:q A4:q B4:q C5:q D5:q E5:q F#5:q G5:q | F4:q G4:q A4:q Bb4:q C5:q D5:q E5:q F5:q", labels: names }
caption: The same pattern on G needs F sharp; on F it needs B flat.
```

That is the whole secret. A key's sharps or flats are just the changes needed to make the major-scale pattern fit when it starts on a new note. You can work out any major key this way, and in later chapters you will: D major (two sharps), B♭ major (two flats), and all the others.

## So why have keys at all?

A reasonable question: why not play everything in C, where there are no black keys to worry about? There are several good reasons.

- **Voices and instruments have ranges.** A song that sits nicely for one singer in C may be too high for another, who will want it in A or G. Moving a whole piece to a new key, keeping its shape, is called **transposing**, and it is only possible because every major key follows the same pattern.
- **Instruments have favourite keys.** Guitars love E and A; trumpets and clarinets love B♭ and F. Music for them is written in keys that sit well under the fingers.
- **Keys have colours.** On the piano, different keys feel different under the hands, and many musicians hear a different character in them: bright, warm, dark. Composers often choose keys for that reason.
- **Changing key is exciting.** Moving to a new home in the middle of a piece, called **modulation**, is one of music's great dramatic tools. The last chorus of many pop songs jumps up a key for a lift. You will study this much later.

## Keys and the ear

Because every major key has the same pattern, it also has the same sound relationships. The 7th note always leans hard up to the home note, because it is a semitone below it. The 4th note always leans gently down to the 3rd. The 5th note feels like a strong pillar. These feelings are the same in every key; only the height changes. The ear branch trains you to hear notes by their place in the key, called **scale degrees**, because it works in any key at once.

```figure
check:
  ask: "Where do the semitones fall in a major scale?"
  choices: ["Between notes 3–4 and 7–8", "Between notes 2–3 and 6–7", "Between notes 4–5 and 7–8"]
  correct: 0
  why: "T T **S** T T T **S**: the semitones are between the **3rd and 4th** notes (E–F in C) and the **7th and 8th** (B–C in C)."
```

## Common confusions

- **Keys are about black keys.** Not really. They are about the pattern. Black keys appear only because the pattern needs them when it starts on a new note.
- **A sharp key and a flat key at once.** A major key uses either sharps or flats in its signature, never both.
- **Mixing up tone and semitone.** A semitone is the very next key; a tone skips one key.

## In short

Every major scale follows the pattern T T S T T T S. C major fits it on white keys. Starting the pattern elsewhere needs some notes changed: G needs F♯, F needs B♭, and the key signature records those changes once. Keys exist because voices and instruments differ, keys have their own colours, and moving between them is one of music's great effects.
