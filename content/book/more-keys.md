---
title: Keys with two and three sharps or flats
stage: 4
lessons: [theory-keys-two-and-three, technique-scales-d-a-one-octave, technique-positions-d-a-e]
summary: D and A major, B flat and E flat major, and their relative minors. The sharps and flats always arrive in the same order, and two quick tricks name a key from its signature in a second.
---

## Building new keys from the pattern

You already know how to work out a major key: start the pattern **T T S T T T S** on the new tonic and adjust any notes that do not fit. Try it on **D**: D–E tone, E–F♯ tone (F must be raised), F♯–G semitone, G–A tone, A–B tone, B–C♯ tone (C must be raised), C♯–D semitone. So **D major has two sharps: F♯ and C♯**.

```figure
staff: { notes: "D4:q E4:q F#4:q G4:q A4:q B4:q C#5:q D5:q", key: D, labels: names }
keys: { notes: "D4 E4 F#4 G4 A4 B4 C#5 D5", labels: names }
sound: "D4:q E4:q F#4:q G4:q A4:q B4:q C#5:q D5:h"
caption: D major: two sharps, F sharp and C sharp.
```

Do the same on **A** and you will find three sharps: **F♯, C♯ and G♯**. On **B♭**, two flats: **B♭ and E♭**. On **E♭**, three flats: **B♭, E♭ and A♭**.

```figure
staff: { notes: "Bb3:q C4:q D4:q Eb4:q F4:q G4:q A4:q Bb4:q", key: Bb, labels: names }
sound: "Bb3:q C4:q D4:q Eb4:q F4:q G4:q A4:q Bb4:h"
caption: B flat major: two flats, B flat and E flat.
```

## The order of sharps and flats

Look at which sharps appeared: G major had F♯; D major had F♯ and C♯; A major had F♯, C♯ and G♯. Each new key **keeps** the sharps of the one before and **adds one more**. The sharps always arrive in the same order:

**F C G D A E B** ("**F**ather **C**harles **G**oes **D**own **A**nd **E**nds **B**attle")

The flats arrive in exactly the reverse order:

**B E A D G C F** ("**B**attle **E**nds **A**nd **D**own **G**oes **C**harles' **F**ather")

That is why a key signature with two sharps always has F♯ and C♯, never F♯ and G♯. You will never meet a key signature with only C♯; F♯ always comes first. In a key signature the sharps or flats are always written in this order, from left to right, on fixed lines and spaces.

```figure
staff: { notes: "A4:w", key: A }
caption: The key signature of A major. Read left to right: F sharp, C sharp, G sharp, in their fixed order.
```

> **Order of sharps: F C G D A E B. Order of flats: B E A D G C F** (the same, backwards). Each key keeps the previous key's sharps or flats and adds the next one.

## Naming a key from its signature

Two quick tricks let you read off the major key at a glance:

- **Sharps**: look at the **last sharp** (the one furthest right). The major key is **a semitone above** it. Last sharp C♯ → D major. Last sharp G♯ → A major.
- **Flats**: the major key is the **second-to-last flat**. Flats B♭ E♭ A♭ → second-to-last is E♭ → E♭ major. (One flat is the exception to learn by heart: F major.)

| Signature | Major key | Relative minor |
| --- | --- | --- |
| no sharps or flats | C | A minor |
| 1 sharp (F♯) | G | E minor |
| 2 sharps (F♯ C♯) | D | B minor |
| 3 sharps (F♯ C♯ G♯) | A | F♯ minor |
| 1 flat (B♭) | F | D minor |
| 2 flats (B♭ E♭) | B♭ | G minor |
| 3 flats (B♭ E♭ A♭) | E♭ | C minor |

The relative minors come from the previous chapter: count down a minor 3rd from the major tonic. Remember that the signature alone does not tell you major or minor; check the last bass note and look for raised 7ths.

```figure
check:
  ask: "A key signature has three flats. What is the major key, and its relative minor?"
  choices: ["E♭ major / C minor", "A♭ major / F minor", "B♭ major / G minor"]
  correct: 0
  why: "Flats B♭ E♭ A♭: the second-to-last is **E♭**, so E♭ major. Down a minor 3rd from E♭: D, D♭, **C**. C minor."
```

## Why sharps go up in fifths

There is a beautiful pattern hidden here. The keys that add one sharp at a time, C, G, D, A, E, B, are each **a 5th higher** than the last: C to G is a 5th, G to D is a 5th, and so on. The flat keys go the other way, each a 5th lower: C, F, B♭, E♭, A♭. Even the order of sharps itself goes up in 5ths: F, C, G, D, A, E, B. This pattern, arranged in a circle, is called the **circle of fifths**, and it has its own big chapter later. For now, notice that each new sharp is the leading note of its key: F♯ in G, C♯ in D, G♯ in A. The last sharp is always a semitone below the tonic, which is exactly why the first trick works.

## Keys and the hand

New keys feel strange at first because the black keys sit in new places under the fingers. A good habit: before playing in a new key, play its five-finger position and its scale, and say the sharps or flats out loud. D major position puts F♯ under the middle finger; A major puts C♯ under the middle finger; E major puts G♯ there. In flat keys, the thumb often starts on a white key next to a black one. The technique branch has positions and scales for every key.

## Common confusions

- **Writing sharps in any order.** The order is fixed: F C G D A E B.
- **The last sharp is the tonic.** It is a semitone below the tonic.
- **The last flat is the tonic.** The second-to-last flat is.

## In short

D major has two sharps (F♯ C♯), A major three (F♯ C♯ G♯); B♭ major has two flats (B♭ E♭), E♭ major three (B♭ E♭ A♭). Sharps always come in the order F C G D A E B, flats in the reverse. The major key is a semitone above the last sharp, or the second-to-last flat. Each relative minor sits a minor 3rd below. Sharp keys rise in 5ths and flat keys fall in 5ths, the start of the circle of fifths.
