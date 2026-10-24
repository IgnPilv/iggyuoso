---
title: The grand staff and its landmarks
stage: 1
lessons: [grand-staff-map, reading-landmarks, c-position-reading]
summary: Piano music joins the treble and bass staves with a brace into one great map of the keyboard. With a handful of landmark notes you can find any note on it quickly.
---

## Two staves, one instrument

A pianist plays both high and low notes at the same time, so piano music uses both staves at once, stacked on top of each other and joined at the left by a curly bracket called a **brace**. This pair is the **grand staff** (or great stave). The treble staff on top is usually for the right hand, the bass staff underneath usually for the left.

```figure
staff: { notes: "C4+E4+G4:w | C3+G3:w", clef: grand }
caption: The grand staff: treble on top, bass below, joined by a brace and a line at the left.
```

Things that happen at the same time are written directly above one another. Read the grand staff the way you read a sentence, left to right, but take in each column top to bottom: everything in a column sounds together.

## Middle C sits in the gap

The two staves are not separate worlds. They are one continuous ladder with a gap in the middle, and **middle C lives in the gap**. Written on the treble staff it hangs on a ledger line below; written on the bass staff it sits on a ledger line above. Either way it is the same key.

```figure
staff: { notes: "A3:q B3:q C4:q D4:q E4:q", clef: grand, labels: names }
keys: { notes: "A3 B3 C4 D4 E4", labels: names }
caption: Climbing from the top of the bass staff, through middle C, onto the treble staff.
```

So if you walk up the bass staff from its top line (A3), the next step is B3 hanging above it, then middle C on its ledger line, then D4 hanging below the treble staff, then E4 on the treble's bottom line. It is one ladder, eleven lines long, with the middle line (middle C) only drawn when it is needed.

## The landmark map

Reading every note by counting from middle C would be slow. Instead, good readers carry a small set of **landmarks** in their heads, spread across the whole grand staff, and count at most a step or two from the nearest one. Here is a good set to start with:

| Landmark | Where | Staff |
| --- | --- | --- |
| G2 | bottom line | bass |
| C3 | second space | bass |
| F3 | fourth line (between the dots) | bass |
| Middle C (C4) | ledger line between the staves | both |
| G4 | second line (where the clef curls) | treble |
| C5 | third space | treble |
| F5 | top line | treble |

```figure
staff: { notes: "G2:q C3:q F3:q C4:q G4:q C5:q F5:q", clef: grand, labels: names }
sound: "G2:q C3:q F3:q C4:q G4:q C5:q F5:q"
caption: The landmark notes, from low G to high F.
```

Notice the pattern: there is a C in the second space of the bass (C3), middle C between the staves (C4), and a C in the third space of the treble (C5). Three Cs, an octave apart, spread neatly over the grand staff. The G and F clefs add their own lines: G4 and F3. With those six or seven notes you are never more than two steps from something you know.

> **Read by landmarks, then by steps.** Find the nearest note you know instantly, then count up or down one line-or-space at a time. With practice the counting disappears and you simply see the note.

## Steps from a landmark

Try this with a note in the top space of the treble staff (the fourth space). Two landmarks are close. From F5 on the top line just above it, step down one: E5. Or from C5 in the third space, step up twice: D5 on the fourth line, E5 in the fourth space. Either way the answer is E5. The landmark you choose does not matter; picking the nearest one simply means fewer steps.

```figure
staff: { notes: "C5:q D5:q E5:h", labels: names }
caption: From the landmark C5, two steps up: D5, then E5 in the top space.
check:
  ask: "A note sits on the line just below the bass clef's F line (the third line). Which note is it?"
  choices: ["D3", "E3", "A3"]
  correct: 0
  why: "From the landmark F3 go down: E3 in the space below, then **D3** on the third line. Two steps down from F."
```

## Hands and staves

As a rule of thumb the right hand plays the treble staff and the left hand the bass staff. In real music the hands wander. A tune may dip below middle C, and then its notes may be written on the bass staff even though the right hand plays them, or written on the treble staff with ledger lines. In later pieces you will see small signs saying which hand to use: *R.H.* and *L.H.*, or *m.d.* and *m.s.* (Italian for right and left hand). For now, treble = right, bass = left.

## Common confusions

- **Thinking the staves are separate.** They are one continuous ladder joined at middle C.
- **Reading the bass with treble names.** Each staff has its own names; use its own landmarks.
- **Losing your place between the staves.** Keep your eyes moving left to right and take each column as one moment.

## In short

The grand staff joins treble and bass with a brace; things in the same column sound together. Middle C lives on a ledger line in the gap and belongs to both. Carry a landmark map, G2, C3, F3, C4, G4, C5 and F5, and reach every other note by counting a step or two from the nearest one.
