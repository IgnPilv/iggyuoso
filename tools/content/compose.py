# The composing path of the creativity branch: motif, repeat, sequence, contour, cadences, a tune
# over chords, the period, both hands, minor, A B A and modes, each tried on the spot as an
# improvising exercise (kind: improvise). Runs last so the older lessons keep their file numbers.
from lib import *
from creativity import L, BLUES, KEEP

def run(base):
    compose(base)

def compose(base):
    """The composing path: the tools composers use, one at a time, each tried on the spot."""
    L('compose-motif', 2, 'Your first motif', ['creativity-question-answer', 'c-d-e'], [
        S("""A **motif** is a tiny musical idea, two to five notes with a rhythm you can remember. The most famous one is four notes:
        da-da-da-**dum**, the start of Beethoven's Fifth Symphony. A whole symphony grows out of it.""", sound='G4:e G4:e G4:e Eb4:h r:e',
          terms=['motif'], callout='A motif is short, has a clear rhythm, and comes back.'),
        S("""Composers **repeat** a motif so the listener can catch it. "Ode to Joy" plays its first idea, then plays it again with a
        new ending. Listen for the repeat.""", sound='E4:q E4:q F4:q G4:q | G4:q F4:q E4:q D4:q | C4:q C4:q D4:q E4:q | E4:q. D4:e D4:h',
          check=check('Why repeat a motif straight away?', 'So the listener remembers it', ['Because the composer ran out of ideas', 'To make the piece longer'],
                      'Hearing an idea twice fixes it in the ear. Then, when it changes, the change can be heard.')),
        X(improv('cmp-motif-repeat', 'Make a motif, then repeat it', 2, ['inScale', {'repeat': 1}, {'variety': 2}], tempo=72, key='C', hand='right', scale='C D E F G',
                 example='C4:e D4:e E4:q G4:h | C4:e D4:e E4:q G4:h', reps=3, days=2,
                 prompt='Bar 1: make up a motif of 3 to 5 notes on C D E F G. Bar 2: play exactly the same again.')),
        S("""Now let it grow: the motif twice, then something new, then home. Four bars is already a little tune. """ + KEEP),
        X(improv('cmp-motif-tune', 'Motif, motif, something new, home', 4, ['inScale', {'repeat': 1}, {'endOn': 'C'}], tempo=72, key='C', hand='right', scale='C D E F G',
                 example='E4:e F4:e G4:h r:q | E4:e F4:e G4:h r:q | A4:q G4:q F4:q E4:q | D4:h C4:h', reps=3, days=2,
                 prompt='Bars 1 and 2: your motif twice. Bar 3: something new. Bar 4: come home to C.')),
    ], 'A motif is a seed: repeat it so it is heard.')

    L('compose-sequence', 3, 'Sequences: the same shape, higher', ['compose-motif', 'c-scale-hands-together'], [
        S("""A **sequence** repeats a motif starting on a different note: the same shape, moved up or down. It is one of the oldest
        tricks in music, and it makes a tune feel like it is going somewhere.""", sound='C4:e D4:e E4:q | D4:e E4:e F4:q | E4:e F4:e G4:q | F4:e G4:e A4:q', terms=['sequence'],
          staff=staff('C4:e D4:e E4:q r:h | D4:e E4:e F4:q r:h', labels='names')),
        S("""Repeat or sequence? A **repeat** starts on the same note; a **sequence** starts higher or lower, keeping the rhythm
        and the ups and downs.""", check=check('A motif C D E is played again as D E F. What is that?', 'A sequence', ['A repeat', 'A new motif'],
                                                 'Same shape and rhythm, one step higher: a sequence.')),
        X(improv('cmp-sequence-2', 'A motif and its sequence', 2, ['inScale', {'sequence': 1}], tempo=72, key='C', hand='right', scale='C major',
                 example='C4:e D4:e E4:q C4:h | D4:e E4:e F4:q D4:h', reps=3, days=2,
                 prompt='Bar 1: a motif in C major. Bar 2: the same shape, starting one step higher.')),
        X(improv('cmp-sequence-tune', 'A climbing tune', 4, ['inScale', {'sequence': 1}, {'endOn': 'C'}, {'steps': 60}], tempo=76, key='C', hand='right', scale='C major',
                 example='E4:e F4:e G4:q E4:h | F4:e G4:e A4:q F4:h | G4:q A4:q B4:q D5:q | C5:w', reps=3, days=2,
                 prompt='A motif, then its sequence one step higher, then climb on and come home to a C. ' + KEEP)),
    ], 'Same shape, new place: a sequence.')

    L('compose-shape', 3, 'Steps, leaps and the shape of a tune', ['compose-sequence'], [
        S("""Tunes people remember move mostly by **step** (next-door notes), with a few **leaps** for drama. After a leap, a good tune
        usually steps back the other way, like a ball that bounces and settles.""", sound='C4:q E4:q G4:q C5:q | B4:q A4:q G4:h', terms=['step', 'leap', 'contour'],
          callout='Leap, then step back. And give the tune one high point, not three.'),
        S("""The **contour** is the tune's shape in the air: an arch (up, then down) is the most common. Draw it with your hand as
        you listen.""", sound='C4:q D4:q E4:q G4:q | A4:q G4:q E4:q D4:q | C4:w',
          check=check('What shape is C D E G A G E D C?', 'An arch: up, then down', ['A straight line up', 'A zig-zag'], 'It climbs to A, its high point, and comes back down.')),
        X(improv('cmp-arch', 'An arch in C', 4, ['inScale', {'steps': 70}, {'variety': 5}, {'endOn': 'C'}, {'range': 'C4-C5'}], tempo=76, key='C', hand='right', scale='C major',
                 example='C4:q D4:q E4:q F4:q | G4:q A4:q G4:h | F4:q E4:q D4:q E4:q | D4:h C4:h', reps=3, days=2,
                 prompt='Four bars in C, mostly by step, rising to one high point and coming home to C. At least five different notes.')),
    ], 'Mostly steps, one high point, home at the end.')

    L('compose-endings', 4, 'Endings: home, and half-way', ['compose-shape', 'chord-symbols', 'y1-exit'], [
        S("""A phrase can end two ways. Ending on **home** (the tonic, over the I chord) sounds finished, like a full stop. Ending on
        the **V chord**, on G, B or D in C major, sounds half-way, like a comma: the listener waits for more.""",
          sound='E4:q D4:q C4:h | E4:q D4:q D4:h', terms=['full close', 'half close', 'cadence'],
          callout='Full close: end on 1 over I. Half close: end on V, with 2, 5 or 7 on top.'),
        X(improv('cmp-full-close', 'End on home', 4, ['inScale', 'chordTones', {'endOn': 'C'}], tempo=76, key='C', hand='right', scale='C major',
                 chords='C | F | G | C', backing='chords', reps=3, days=2,
                 prompt='The app plays C, F, G, C. Make up a tune: on beat 1 of each bar pick a note of that bar\'s chord, and end on C.')),
        X(improv('cmp-half-close', 'End half-way', 4, ['inScale', 'chordTones', {'endOn': 'D'}], tempo=76, key='C', hand='right', scale='C major',
                 chords='C | F | C | G', backing='chords', reps=3, days=2,
                 prompt='Over C, F, C, G: a tune that stops on D over the G chord. Hear how it waits for an answer?')),
    ], 'Full close: a full stop. Half close: a comma.')

    L('compose-over-chords', 5, 'A tune over chords', ['compose-endings', 'harmonise-i-iv-v', 'primary-triads'], [
        S("""Songwriters often start with the chords and find the tune on top. The rule of thumb: on the **strong beats**, use a note
        of the chord; between them, step through other notes of the scale (**passing notes**).""",
          sound='C4+E4+G4:h E5:q D5:q | A3+C4+E4:h C5:q B4:q | F3+A3+C4:h A4:q B4:q | G3+B3+D4:h D5:h', terms=['chord note', 'passing note', 'strong beat']),
        S("""This progression is in thousands of songs: **I vi IV V** (in C: C, Am, F, G). Each chord shares notes with the next, so
        the tune can move smoothly.""", sound='C4+E4+G4:w | A3+C4+E4:w | F3+A3+C4:w | G3+B3+D4:w',
          check=check('In C, what are the chords I, vi, IV and V?', 'C, Am, F, G', ['C, Dm, F, G', 'C, Am, G, F'], 'Count up the C scale: I = C, IV = F, V = G, and vi (A) is minor.')),
        X(improv('cmp-i-vi-iv-v', 'A tune over C, Am, F, G', 8, ['inScale', 'chordTones', {'steps': 50}, {'endOn': 'C'}], tempo=80, key='C', hand='right', scale='C major',
                 chords='C | Am | F | G | C | Am | G | C', backing='chords', reps=3, days=2,
                 prompt='The app plays the chords; the chart shows them. Chord notes on beats 1 and 3, steps between, home to C at the end.')),
        X(improv('cmp-over-chords-g', 'A tune over G, C and D', 8, ['inScale', 'chordTones', {'endOn': 'G'}], tempo=80, key='G', hand='right', scale='G major',
                 chords='G | C | D | G | Em | C | D | G', backing='chords', reps=3, days=2,
                 prompt='The same idea in G major (F♯ is lit). Chord notes on the strong beats, home to G. ' + KEEP)),
    ], 'Chords first, then the tune: chord notes on the strong beats.')

    L('compose-eight-bars', 5, 'An eight-bar song', ['compose-over-chords', 'theory-phrases-and-form'], [
        S("""Most songs are built from **phrases** of four bars. A classic eight-bar tune is a **question** (bars 1–4, ending half-way
        on V) and an **answer** (bars 5–8, starting like the question, ending at home). This is called a **period**.""",
          terms=['phrase', 'period', 'antecedent', 'consequent'],
          sound='C4:q E4:q G4:q E4:q | F4:q A4:q G4:h | E4:q C4:q D4:q E4:q | D4:w | C4:q E4:q G4:q E4:q | F4:q A4:q G4:h | E4:q D4:q B3:q D4:q | C4:w',
          callout='Question: ends on V. Answer: begins like the question, ends on I.'),
        X(improv('cmp-period', 'Your eight-bar song', 8, ['inScale', 'chordTones', {'questionAnswer': 4}, {'rests': 1}], tempo=80, key='C', hand='right', scale='C major',
                 chords='C | F | C | G | C | F | G | C', backing='chords', reps=3, days=2,
                 prompt='Bars 1–4: a question that ends on G or D (over the G chord). Bars 5–8: start the same way, end on C. Breathe between them. ' + KEEP)),
    ], 'Question and answer, four bars each: a period.')

    L('compose-two-hands', 6, 'Your own song, both hands', ['compose-eight-bars', 'accompaniment-patterns'], [
        S("""Now you play the chords too. The left hand plays the **root** of each chord on beat 1 (and holds it, or plays root and
        fifth); the right hand makes up the tune. Start slow: the hands have to think separately."""),
        X(improv('cmp-two-hands-c', 'Two hands in C', 4, ['bassRoots', 'chordTones', {'endOn': 'C'}], tempo=66, key='C', hand='together', scale='C major',
                 chords='C | F | G | C', reps=3, days=2,
                 prompt='Left hand: C, F, G, C, low, on beat 1 of each bar. Right hand: your tune, chord notes on the strong beats, ending on C.')),
        X(improv('cmp-two-hands-g', 'Two hands in G, eight bars', 8, ['bassRoots', 'chordTones', {'questionAnswer': 4}], tempo=66, key='G', hand='together', scale='G major',
                 chords='G | C | G | D | G | C | D | G', reps=3, days=2,
                 prompt='Left hand on the roots; right hand a question (bars 1–4) and its answer (bars 5–8). ' + KEEP)),
    ], 'Roots below, your tune above: a song of your own.')

    L('compose-minor', 7, 'A tune in a minor key', ['compose-two-hands', 'creativity-harmonise-minor', 'harmonic-minor'], [
        S("""Minor keys use **i, iv and V**: in A minor, Am, Dm and E. The V chord is major, so its G becomes **G♯**, the leading
        note that pulls up to A. Use G♯ over E, and G over the other chords.""", keys=keys('A4 B4 C5 D5 E5 F5 G#5', labels='names'),
          sound='A3+C4+E4:h E4:q A4:q | D4+F4+A4:h F4:q A4:q | E4+G#4+B4:h G#4:q B4:q | A3+C4+E4:w'),
        X(improv('cmp-minor-4', 'Four bars in A minor', 4, ['inScale', 'chordTones', {'endOn': 'A'}], tempo=72, key='Am', hand='right', scale='A harmonic minor',
                 chords='Am | Dm | E | Am', backing='chords', reps=3, days=2,
                 prompt='Over Am, Dm, E, Am: chord notes on the strong beats (G♯ over the E chord), home to A.')),
        X(improv('cmp-minor-8', 'An eight-bar minor song', 8, ['inScale', 'chordTones', {'questionAnswer': 4}, {'steps': 50}], tempo=72, key='Am', hand='right', scale='A harmonic minor',
                 chords='Am | Dm | Am | E | Am | Dm | E | Am', backing='chords', reps=3, days=2,
                 prompt='A minor-key period: the question stops on the E chord, the answer starts the same way and comes home to A. ' + KEEP)),
    ], 'Minor: i, iv, V, and the leading note pulls home.')

    L('compose-aba', 8, 'A B A: away and back', ['compose-minor', 'theory-phrases-and-form'], [
        S("""Many pieces have three parts: **A**, then something different, **B**, then **A** again. The return feels like coming home
        because the middle went somewhere else: a new rhythm, a new register, a new chord.""", terms=['ternary form', 'contrast', 'return'],
          callout='A B A: statement, contrast, return.',
          check=check('Why does B need to be different from A?', 'So that A coming back feels like a return', ['So the piece is longer', 'Because B is in a different tempo'],
                      'Without contrast there is nothing to come back from.')),
        X(improv('cmp-aba', 'Your own A B A', 12, ['inScale', {'repeat': {'bars': 4, 'at': 8}}, {'contrast': {'bars': 4, 'at': 4}}, {'endOn': 'C'}], tempo=80, key='C', hand='right',
                 scale='C major', chords='C | F | G | C | Am | Dm | G | G | C | F | G | C', backing='chords', reps=3, days=2,
                 prompt='Bars 1–4: your A, ending on C. Bars 5–8 (over Am and Dm): something different, higher or busier. Bars 9–12: A again, exactly. ' + KEEP)),
    ], 'Statement, contrast, return.')

    L('compose-modes', 9, 'Modes: Dorian and Mixolydian', ['compose-aba', 'creativity-minor-pentatonic'], [
        S("""The white keys from D to D make the **Dorian** mode: minor, but with a bright sixth (B). It is the sound of "Scarborough
        Fair" and of a lot of jazz and folk. From G to G they make **Mixolydian**: major with a flat seventh (F), the sound of
        rock and Celtic tunes.""", keys=keys('D4 E4 F4 G4 A4 B4 C5 D5', labels='names'), sound='D4:q E4:q F4:q G4:q | A4:q B4:q C5:q D5:q', terms=['mode', 'Dorian', 'Mixolydian']),
        X(improv('cmp-dorian', 'A Dorian tune', 8, ['inScale', 'chordTones', {'endOn': 'D'}, {'rests': 1}], tempo=84, key='C', hand='right', scale='D dorian',
                 chords='Dm | G | Dm | G | Dm | G | C | Dm', backing='chords', reps=3, days=2,
                 prompt='White keys only, home on D. The G chord brings out the Dorian B. End on D.')),
        X(improv('cmp-mixolydian', 'A Mixolydian tune', 8, ['inScale', 'chordTones', {'endOn': 'G'}], tempo=96, key='C', hand='right', scale='G mixolydian',
                 chords='G | F | G | F | G | F | C | G', backing='chords', reps=3, days=2,
                 prompt='White keys only, home on G, over G and F chords: a rock sound. End on G. ' + KEEP)),
    ], 'Modes: the white keys, a different home.')
