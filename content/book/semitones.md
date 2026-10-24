---
title: Semitones, sharps, flats and naturals
stage: 2
lessons: [sharps-flats-naturals]
summary: The black keys finally get names. The smallest step in Western music is the semitone; a sharp raises a note by one, a flat lowers it by one, and a natural cancels both.
---

## Twelve keys in every octave

So far we have named only the white keys. Count every key, black and white, from one C to the next and you get **twelve** different keys before the pattern repeats: seven white and five black. These twelve are all the notes that Western music uses; everything else is the same twelve in other octaves.

The distance from any key to the very next key, black or white, with nothing in between, is called a **semitone** (American books also say **half step**). It is the smallest step in our music. Two semitones make a **tone** (or **whole step**).

```figure
keys: { notes: "C4 C#4 D4 D#4 E4 F4 F#4 G4 G#4 A4 A#4 B4", labels: none }
sound: "C4:e C#4:e D4:e D#4:e E4:e F4:e F#4:e G4:e G#4:e A4:e A#4:e B4:e C5:h"
caption: All twelve keys from C to B, each a semitone above the last, then C again.
```

## The two white-key semitones

Remember the two places on the keyboard where white keys sit side by side with no black key between them: **E–F** and **B–C**. Now you can see why that matters. Everywhere else, two neighbouring white keys are a **tone** apart, with a black key in the middle. But E to F and B to C are only a **semitone** apart. They are already as close as two notes can be.

```figure
keys: { notes: "E4 F4 B4 C5", labels: names }
sound: "E4:q F4:q B4:q C5:q"
caption: E–F and B–C, the two semitones between white keys.
```

> **A semitone** is the distance to the very next key, black or white. **A tone** is two semitones. Between white keys, every step is a tone except **E–F** and **B–C**, which are semitones.

This one fact explains why the major scale sounds the way it does, why some keys need sharps and others flats, and why there are only five black keys and not seven. You will see it again and again.

## Sharps

A **sharp** (♯) raises a note by **one semitone**. To play C sharp (C♯), find C and go to the very next key to the right: the black key just above it. F sharp is the black key just above F.

The sharp sign looks like a little hash sign, #. On the staff it is written **before** the note, on the same line or space as the note, even though we say it after: we write ♯C but say "C sharp".

```figure
staff: { notes: "C4:q C#4:q F4:q F#4:q", labels: names }
keys: { notes: "C#4 F#4", labels: names }
caption: C, C sharp, F, F sharp. The sharp sits in front of the note, on its line or space.
```

## Flats

A **flat** (♭) lowers a note by **one semitone**: go to the very next key to the **left**. B flat (B♭) is the black key just below B. E flat is the black key just below E. The flat sign looks like a small, pointed letter b.

```figure
staff: { notes: "B4:q Bb4:q E4:q Eb4:q", labels: names }
keys: { notes: "Bb4 Eb4", labels: names }
caption: B, B flat, E, E flat. Flat means one key to the left.
```

## One key, two names

Look closely and you will see that the black key between C and D has two names. It is a semitone above C, so it is **C♯**. It is also a semitone below D, so it is **D♭**. Same key, same sound, two names. Every black key works like this:

| Black key between | Sharp name | Flat name |
| --- | --- | --- |
| C and D | C♯ | D♭ |
| D and E | D♯ | E♭ |
| F and G | F♯ | G♭ |
| G and A | G♯ | A♭ |
| A and B | A♯ | B♭ |

Which name is used depends on the music around it: in some keys the sharp name is correct, in others the flat name. A later chapter is about this ("one key, two names"), and the chapter on keys explains how to tell. For now, practise naming every black key both ways.

Sharps and flats can also land on white keys. Because E and F are a semitone apart, **E♯** is the same key as F, and **F♭** the same as E. B♯ is C, and C♭ is B. They look strange but they do turn up, and they follow the rule exactly: sharp is one key right, flat is one key left.

```figure
check:
  ask: "Which note is the same key as G flat?"
  choices: ["F sharp", "G sharp", "A flat"]
  correct: 0
  why: "G flat is one key **left** of G: the black key between F and G. That key is also a semitone above F, so it is **F sharp**."
```

## The natural sign and accidentals

A **natural** sign (♮) cancels a sharp or flat and brings the note back to its plain white-key self. If a bar has F♯ and then later F♮, the second one is plain F.

Sharps, flats and naturals written in front of individual notes are called **accidentals**. An accidental lasts **until the end of the bar** and applies to every later note on the same line or space in that bar. At the next bar line it is cancelled automatically. So if you see F♯ at the start of a bar, every F in that bar (on that same line) is F♯ unless a natural sign says otherwise.

```figure
staff: { notes: "F#4:q G4:q F#4:q F4:q", labels: names, meter: 4/4 }
caption: The sharp is written once; the third note is still F sharp. A natural turns the last one back into F.
```

> **Accidentals last until the bar line**, on the same line or space. A natural cancels them sooner.

## Why five black keys?

If you have ever wondered why the piano does not have a black key between every pair of white keys, now you know: the white keys E–F and B–C are already a semitone apart, so there is no room for another note between them. The black keys fill exactly the gaps where a tone needs splitting, five of them, giving twelve equal semitones to the octave. This arrangement settled into its modern form centuries ago, and the pattern of twos and threes you use to find your way is its direct result.

## Common confusions

- **Sharp means "black key".** Not always: E♯ is a white key (F). Sharp means one semitone up, whatever colour that key is.
- **Writing the sign after the note.** It is said after but written before.
- **Forgetting that accidentals carry through the bar.** They do, on the same line or space.

## In short

There are twelve keys to an octave, each a semitone from the next; two semitones make a tone. Between white keys, every step is a tone except E–F and B–C. A sharp raises a note one semitone, a flat lowers it one, and a natural cancels both. Every black key has two names, a sharp one and a flat one. Accidentals last until the end of the bar.
