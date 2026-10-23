# The ear branch, from zero. Nobody is born "unmusical": the ear is trained like a muscle, and it
# starts with comparisons anyone can make (same or different, higher or lower, up or down), long
# before note names. Each step makes the differences smaller or the patterns longer.
from lib import *

INTRO = 'Turn the sound on. There is no rush and no penalty for listening again: press Hear it as often as you like.'

def L(id, stage, title, requires, steps, recap, type='drill'):
    lesson(id, title, steps, recap, skills=['ear'])
    node(id, 'ear', stage, title, requires, type=type)

def run(base):
    # ------------------------------------------------------------ stage 1: before any note names
    L('ear-same-different', 1, 'Same or different?', [], [
        S(f"""**Your ear can learn this.** Many adults think they are "not musical". In fact, hearing
        music is a skill, trained like reading: it starts with differences you can already hear, and the
        differences get smaller.

        First game: two notes. Were they **the same note twice**, or **two different notes**? {INTRO}""",
          sound='C4:h C4:h | C4:h G4:h', terms=['pitch'],
          check=check('In the sound above, the first pair was the same note twice. The second pair was...', 'Different', ['The same'],
                      'The second note of the second pair was higher (G above C).', at=0)),
        S("""**Pitch** is how high or low a note sounds. Big differences are easy: we start with notes far
        apart and bring them closer each round.""", callout='Listen to the whole of both notes before you answer.'),
        X(ear('ear-sd-far', 'Same or different: far apart', [{'type': 'compare', 'pool': ['same', 'different'], 'range': ['C3', 'C6'], 'gap': [7, 12]}],
              prompt='Two notes. The same note twice, or two different notes?')),
        X(ear('ear-sd-closer', 'Same or different: closer', [{'type': 'compare', 'pool': ['same', 'different'], 'range': ['C3', 'C6'], 'gap': [3, 6]}],
              prompt='Closer now. Listen to both notes to the end.')),
        X(ear('ear-sd-close', 'Same or different: very close', [{'type': 'compare', 'pool': ['same', 'different'], 'range': ['C3', 'C5'], 'gap': [1, 2]}],
              prompt='Only one or two keys apart. This one takes practice; come back to it on another day.', reps=3, days=2)),
    ], 'Same or different is the root of all ear training. Every later step is a version of this question.')

    L('ear-higher-lower-closer', 1, 'Higher or lower, closer and closer', ['ear-high-low'], [
        S("""You can tell high from low when the notes are far apart. Now the notes come closer: a few
        keys apart, then neighbours. Sing or hum the two notes if it helps: your voice knows which way it moved.""",
          sound='C4:h D4:h | E4:h D4:h'),
        X(ear('ear-hl-medium', 'Higher or lower: a few keys apart', [{'type': 'compare', 'pool': ['higher', 'lower'], 'range': ['C3', 'C6'], 'gap': [3, 5]}])),
        X(ear('ear-hl-steps', 'Higher or lower: neighbours', [{'type': 'compare', 'pool': ['higher', 'lower'], 'range': ['C3', 'C5'], 'gap': [1, 2]}], reps=3, days=2)),
        X(ear('ear-hl-same-too', 'Higher, lower or the same?', [{'type': 'compare', 'pool': ['higher', 'lower', 'same'], 'range': ['C3', 'C5'], 'gap': [1, 4]}])),
    ], 'Up, down or the same: the three things a melody can do from one note to the next.')

    L('ear-which-way', 1, 'Which way did the tune go?', ['ear-higher-lower-closer'], [
        S("""A melody is a line of notes going up, down or staying. Here are **three** notes: two moves.
        Answer with the arrows: ↗ for up, ↘ for down. "↗ ↘" means up, then down.""",
          sound='C4:q E4:q G4:h | C4:q G4:q E4:h', terms=['melody', 'contour'],
          check=check('C, E, G: all going up. Which arrows?', '↗ ↗', ['↗ ↘', '↘ ↗', '↘ ↘'], 'Each note is higher than the one before: up, up.', at=0)),
        S("""The shape of a tune is called its **contour**. Drawing it in the air with your finger while you
        listen is a real musicians' trick."""),
        X(ear('ear-contour-3-wide', 'Three notes, big moves', [{'type': 'contour', 'length': 3, 'range': ['C4', 'C6'], 'gap': [4, 7]}])),
        X(ear('ear-contour-3-close', 'Three notes, small moves', [{'type': 'contour', 'length': 3, 'range': ['C4', 'C5'], 'gap': [2, 3]}])),
    ], 'A tune has a shape. Hear the shape first; the exact notes come later.')

    L('ear-step-or-leap', 1, 'Step or leap?', ['ear-which-way'], [
        S("""Melodies move by **step** (to the next key, like walking) or by **leap** (jumping over keys).
        Steps sound smooth and close; leaps sound like a jump.""",
          sound='C4:q D4:q E4:q F4:q | C4:q G4:q C4:q A4:q', terms=['step', 'leap'],
          check=check('C to D is a...', 'Step', ['Leap'], 'D is the very next white key after C: a step.', at=0)),
        X(ear('ear-motion-step-leap', 'Step or leap?', [{'type': 'motion', 'pool': ['step', 'leap'], 'range': ['C4', 'C5']}])),
        X(ear('ear-motion-all', 'The same, a step or a leap?', [{'type': 'motion', 'pool': ['same', 'step', 'leap'], 'range': ['C3', 'C5']}])),
    ], 'Steps and leaps: the two ways a melody travels.')

    L('ear-loud-soft', 1, 'Loud or soft?', ['ear-same-different'], [
        S("""Music is not only high and low; it is also **loud and soft**. You will hear the same notes twice.
        Was the second time louder or softer?""", sound='C4:q E4:q G4:h', terms=['dynamics']),
        X(ear('ear-loudness-one', 'Louder or softer: one note', [{'type': 'loudness', 'pool': ['loud', 'soft']}], questions=12, reps=2, days=1)),
        X(ear('ear-loudness-phrase', 'Louder or softer: a phrase', [{'type': 'loudness', 'pool': ['loud', 'soft'], 'notes': 'C4 D4 E4 F4 G4'}], questions=12, reps=2, days=1)),
    ], 'Loud and soft are called dynamics. Soon you will play them, too.')

    L('ear-find-the-note', 1, 'Find the note you heard', ['ear-step-or-leap', 'c-d-e'], [
        S("""Now the answer is on the keyboard. Two keys are lit: **C** and **G**. You hear one of them.
        Press the one you heard. First you hear C as a reference, so you have something to compare with.""",
          keys=keys('C4 G4', labels='names'), sound='C4:h G4:h | C4:h C4:h'),
        X(ear('ear-find-c-g', 'C or G?', [{'type': 'note', 'pool': ['C4', 'G4'], 'lit': True, 'reference': 'C4'}], questions=15, reps=3, days=1)),
        S("""Three keys now: C, E and G. Compare with the reference C: is the new note the same, a little higher (E) or higher still (G)?""",
          keys=keys('C4 E4 G4', labels='names')),
        X(ear('ear-find-c-e-g', 'C, E or G?', [{'type': 'note', 'pool': ['C4', 'E4', 'G4'], 'lit': True, 'reference': 'C4'}], questions=20)),
        X(ear('ear-find-c-d-e', 'C, D or E?', [{'type': 'note', 'pool': ['C4', 'D4', 'E4'], 'lit': True, 'reference': 'C4'}], questions=20)),
    ], 'Compare with C, then find the key. This is how everyone learns to play by ear.')

    L('ear-echo-two', 1, 'Echo two notes', ['ear-find-the-note'], [
        S("""Two notes, one after the other. Play them back. The keys you need are lit, so you only have to
        hear which comes first.""", keys=keys('C4 D4 E4', labels='names'), sound='C4:q E4:q | E4:q D4:q'),
        X(ear('ear-echo-two-lit', 'Echo two notes (lit keys)', [{'type': 'melody', 'notes': n, 'plays': 3, 'lit': True} for n in ['C4 E4', 'E4 C4', 'D4 C4', 'C4 D4', 'E4 D4', 'D4 E4', 'C4 C4', 'E4 E4']], questions=16)),
        X(ear('ear-echo-two-wider', 'Echo two notes, C to G', [{'type': 'melody', 'notes': n, 'plays': 3, 'lit': True} for n in ['C4 G4', 'G4 C4', 'E4 G4', 'G4 E4', 'C4 F4', 'F4 E4', 'D4 G4', 'G4 F4']], questions=16)),
    ], 'Hear it, then play it: the echo is the heart of the ear branch.')

    # ------------------------------------------------------------ stage 2
    L('ear-how-many', 2, 'How many notes at once?', ['ear-echo-three-notes'], [
        S("""Several notes can sound at once: that is a **chord**. First game: how many notes did you hear,
        one, two or three? After you answer, they are played one by one so you can check.""",
          sound='C4:h | C4+G4:h | C4+E4+G4:h', terms=['chord'],
          check=check('C, E and G together make...', 'A chord of three notes', ['One loud note', 'Two notes'], 'Three notes sounding at once: a three-note chord, a triad.', at=0)),
        X(ear('ear-count-1-2', 'One note or two?', [{'type': 'count', 'pool': [1, 2], 'range': ['C3', 'C5']}])),
        X(ear('ear-count-1-2-3', 'One, two or three?', [{'type': 'count', 'pool': [1, 2, 3], 'range': ['C3', 'C5']}], reps=3, days=2)),
    ], 'Chords are notes sounding together. Your ear can pull them apart.')

    L('ear-contour-four', 2, 'Four-note shapes', ['ear-which-way'], [
        S("""Longer shapes: four notes, three moves. Draw each one in the air as you listen.""", sound='C4:q E4:q D4:q G4:q'),
        X(ear('ear-contour-4', 'Four notes: which shape?', [{'type': 'contour', 'length': 4, 'range': ['C4', 'C6'], 'gap': [2, 5]}])),
        X(ear('ear-contour-4-steps', 'Four notes, small steps', [{'type': 'contour', 'length': 4, 'range': ['C4', 'G5'], 'gap': [1, 2]}], reps=3, days=2)),
    ], 'Four notes, three moves: the shape is the first thing you remember of a tune.')

    L('ear-five-keys', 2, 'Find it on five keys', ['ear-find-the-note', 'middle-c-position'], [
        S("""All five keys of C position are lit: C D E F G. After the reference C you hear one of them.
        Is it close to C (D, E) or far (F, G)? Then pick the key.""", keys=keys('C4 D4 E4 F4 G4', labels='names')),
        X(ear('ear-find-five-lit', 'One of five, lit', [{'type': 'note', 'pool': ['C4', 'D4', 'E4', 'F4', 'G4'], 'lit': True, 'reference': 'C4'}])),
        X(ear('ear-find-five', 'One of five, no help', [{'type': 'note', 'pool': ['C4', 'D4', 'E4', 'F4', 'G4'], 'reference': 'C4'}], reps=3, days=2)),
    ], 'The five keys under your hand, by ear.')

    L('ear-echo-in-g', 2, 'Echo three in G position', ['ear-echo-three-notes', 'g-position'], [
        S("""Same game, new place: G position, G A B C D.""", keys=keys('G4 A4 B4 C5 D5', labels='names')),
        X(ear('ear-echo-g-three', 'Echo three notes in G', [{'type': 'melody', 'notes': n, 'plays': 2, 'lit': True} for n in ['G4 A4 B4', 'B4 A4 G4', 'G4 B4 D5', 'D5 B4 G4', 'A4 B4 C5', 'C5 B4 A4', 'G4 D5 G4', 'B4 C5 D5']])),
    ], 'Echoing in a new position: the ear does not care where your hand is.')

    # ------------------------------------------------------------ stage 3
    L('ear-octave-or-fifth', 3, 'Big jumps: octave or fifth?', ['ear-degrees-1-5', 'intervals-to-fifth'], [
        S("""Two notes from C. The second is either the next **C** up (an **octave**: the same letter, higher)
        or **G** (a **fifth**). The octave sounds like one note doubled; the fifth sounds open and strong.""",
          sound='C4:h C5:h | C4:h G4:h', terms=['octave', 'fifth']),
        X(ear('ear-8-5', 'Octave or fifth?', [{'type': 'interval', 'pool': ['P8', 'P5'], 'from': 'C4', 'direction': 'up', 'answer': 'name'}])),
        X(ear('ear-8-5-4', 'Octave, fifth or fourth?', [{'type': 'interval', 'pool': ['P8', 'P5', 'P4'], 'from': 'C4', 'direction': 'up', 'answer': 'name'}], reps=3, days=2)),
    ], 'Octave: the same note higher. Fifth: open. Fourth: like the start of a wedding march.')

    L('ear-scale-steps', 3, 'One, two, three: steps of the scale', ['ear-degree-3-and-thirds'], [
        S("""After the chords that set the key, you hear degree 1, 2 or 3 of the scale: C, D or E in C major.
        1 sounds like home, 2 wants to move, 3 sounds sweet and stable.""", sound='C4:q D4:q E4:h'),
        X(ear('ear-degrees-123', 'Degrees 1, 2 and 3', [{'type': 'degree', 'key': 'C', 'pool': [1, 2, 3]}], cadence='C')),
        X(ear('ear-degrees-12345', 'Degrees 1 to 5', [{'type': 'degree', 'key': 'C', 'pool': [1, 2, 3, 4, 5]}], cadence='C', reps=3, days=2)),
    ], 'In a key, every note has a feeling. Learn the feeling and the note follows.')

    L('ear-melody-steps', 3, 'Echo scale fragments', ['ear-echo-four-notes', 'c-scale-hands-apart'], [
        S("""Four notes moving by step up or down the scale. No lit keys now: start from the first note you
        hear and follow the steps."""),
        X(ear('ear-echo-scale-four', 'Four-note scale fragments', [{'type': 'melody', 'notes': n, 'plays': 2} for n in ['C4 D4 E4 F4', 'G4 F4 E4 D4', 'E4 F4 G4 A4', 'A4 G4 F4 E4', 'D4 E4 F4 G4', 'C5 B4 A4 G4', 'F4 E4 D4 C4', 'G4 A4 B4 C5']])),
    ], 'Scale steps are the commonest moves in all melodies.')

    # ------------------------------------------------------------ stage 4
    L('ear-seconds-thirds', 4, 'Seconds and thirds by ear', ['ear-all-degrees', 'thirds-major-minor'], [
        S("""Two notes one after the other: a **second** (a step) or a **third** (a skip)? Then the four:
        minor and major second, minor and major third.""", sound='C4:h D4:h | C4:h E4:h'),
        X(ear('ear-seconds-thirds-up', 'Seconds and thirds', [{'type': 'interval', 'pool': ['m2', 'M2', 'm3', 'M3'], 'from': 'C4', 'direction': 'up', 'answer': 'name'}])),
        X(ear('ear-seconds-thirds-down', 'Seconds and thirds, going down', [{'type': 'interval', 'pool': ['m2', 'M2', 'm3', 'M3'], 'from': 'C5', 'direction': 'down', 'answer': 'name'}], reps=3, days=2)),
    ], 'Seconds walk, thirds skip; minor is narrower than major.')

    L('ear-minor-degrees', 4, 'Hearing in a minor key', ['ear-all-degrees', 'natural-minor'], [
        S("""After the chords of A minor, you hear 1, 3 or 5 of the A minor scale: A, C or E. Minor's home
        note feels just as much like home as major's.""", sound='A3+C4+E4:h E3+G#3+B3:h | A3+C4+E4:w'),
        X(ear('ear-am-135', 'A minor: 1, 3 or 5?', [{'type': 'degree', 'key': 'Am', 'pool': [1, 3, 5]}], cadence='Am')),
        X(ear('ear-am-1-to-5', 'A minor: degrees 1 to 5', [{'type': 'degree', 'key': 'Am', 'pool': [1, 2, 3, 4, 5]}], cadence='Am', reps=3, days=2)),
    ], 'Minor keys have a home too.')

    L('ear-together-intervals', 4, 'Two notes together', ['ear-seconds-thirds', 'two-note-chords'], [
        S("""Now the two notes sound **at once**. A third sounds sweet, a fifth open, an octave like one note.""",
          sound='C4+E4:h C4+G4:h | C4+C5:w'),
        X(ear('ear-harmonic-3-5-8', 'Third, fifth or octave, together', [{'type': 'interval', 'pool': ['M3', 'P5', 'P8'], 'from': 'C4', 'direction': 'up', 'answer': 'name', 'together': True}])),
        X(ear('ear-count-2-3-4', 'Two, three or four notes?', [{'type': 'count', 'pool': [2, 3, 4], 'range': ['C3', 'C5']}], reps=3, days=2)),
    ], 'Intervals played together are called harmonic intervals.')

    # ------------------------------------------------------------ stage 5
    L('ear-fourths-fifths-sixths', 5, 'Fourths, fifths and sixths', ['ear-melodic-intervals'], [
        S("""Wider intervals. Many musicians remember intervals by the start of a famous tune: a fourth starts
        "Here Comes the Bride", a fifth starts "Twinkle, Twinkle", a major sixth starts "My Bonnie Lies Over the Ocean".""",
          sound='C4:h F4:h | C4:h G4:h | C4:h A4:h'),
        X(ear('ear-4-5-6', 'Fourth, fifth or sixth?', [{'type': 'interval', 'pool': ['P4', 'P5', 'M6'], 'from': 'C4', 'direction': 'up', 'answer': 'name'}])),
        X(ear('ear-4-5-6-play', 'Play the second note', [{'type': 'interval', 'pool': ['P4', 'P5', 'M6'], 'from': 'C4', 'direction': 'up', 'answer': 'play'}], reps=3, days=2)),
    ], 'Tie every interval to a tune you know.')

    L('ear-triad-qualities', 5, 'Major, minor or diminished?', ['ear-major-minor', 'triads-on-every-degree'], [
        S("""Three kinds of triad: **major** (bright), **minor** (darker), **diminished** (tense, squeezed).""",
          sound='C4+E4+G4:h C4+Eb4+G4:h | C4+Eb4+Gb4:w'),
        X(ear('ear-maj-min-dim-roots', 'Triads on C, F and G', [{'type': 'chord', 'pool': ['maj', 'min', 'dim'], 'root': r} for r in ['C4', 'F4', 'G3']])),
    ], 'Bright, dark, tense: the three triads of the major scale.')

    L('ear-echo-g-five', 5, 'Echo five notes in G and F', ['ear-echo-five', 'key-of-g'], [
        S("""Five-note phrases in G major and F major."""),
        X(ear('ear-echo-five-g-f', 'Five notes in G and F', [{'type': 'melody', 'notes': n, 'plays': 2} for n in ['G4 A4 B4 D5 G4', 'D5 C5 B4 A4 G4', 'G4 B4 A4 F#4 G4', 'F4 G4 A4 C5 F4', 'C5 Bb4 A4 G4 F4', 'F4 A4 G4 E4 F4', 'B4 G4 A4 F#4 G4', 'A4 F4 G4 E4 F4']])),
    ], 'Phrases in new keys: the same ear, new home notes.')

    # ------------------------------------------------------------ stage 6
    L('ear-all-intervals', 6, 'Every interval to the octave', ['ear-fourths-fifths-sixths', 'interval-map'], [
        S("""All the intervals in one set. Missed ones come back more often until they stick."""),
        X(ear('ear-intervals-to-octave', 'All intervals, going up', [{'type': 'interval', 'pool': ['m2', 'M2', 'm3', 'M3', 'P4', 'P5', 'm6', 'M6', 'P8'], 'from': 'C4', 'direction': 'up', 'answer': 'name'}], questions=25)),
        X(ear('ear-intervals-to-octave-down', 'All intervals, going down', [{'type': 'interval', 'pool': ['m2', 'M2', 'm3', 'M3', 'P4', 'P5', 'm6', 'M6', 'P8'], 'from': 'C5', 'direction': 'down', 'answer': 'name'}], questions=25, reps=3, days=3)),
    ], 'Every interval, both ways.')

    L('ear-seventh-chords', 6, 'Four-note chords', ['ear-triad-qualities'], [
        S("""Add a fourth note and you get a **seventh chord**. The **dominant 7th** (G7) sounds like it must
        move on; the **major 7th** sounds dreamy.""", sound='G3+B3+D4+F4:h C4+E4+G4:h | C4+E4+G4+B4:w'),
        X(ear('ear-maj-dom7-maj7', 'Major, dominant 7th or major 7th?', [{'type': 'chord', 'pool': ['maj', 'dom7', 'maj7'], 'root': 'C4'}])),
    ], 'Sevenths add colour: restless or dreamy.')

    L('ear-rhythm-hearing', 6, 'Which rhythm did you hear?', ['ear-spot-the-change', 'syncopation'], [
        S("""Ears hear time as well as pitch. One bar of rhythm on one note: pick its picture."""),
        X(ear('ear-rhythm-syncopated', 'Straight or syncopated?', [{'type': 'rhythm', 'pool': ['x:q x:h x:q', 'x:q x:q x:q x:q', 'x:e x:q x:e x:h', 'x:h x:h'], 'meter': '4/4', 'tempo': 80}], questions=15)),
    ], 'Rhythm by ear: off-beat notes jump out once you count.')

    # ------------------------------------------------------------ stage 7
    L('ear-sixths-sevenths', 7, 'Sixths and sevenths', ['ear-all-intervals'], [
        S("""The wide intervals. A **minor 7th** is a step short of an octave ("Somewhere" from West Side Story); a
        **major 7th** is a half step short, and it rubs.""", sound='C4:h A4:h | C4:h Bb4:h | C4:h B4:h'),
        X(ear('ear-sixths-sevenths-up', 'Sixths and sevenths', [{'type': 'interval', 'pool': ['m6', 'M6', 'm7', 'M7'], 'from': 'C4', 'direction': 'up', 'answer': 'name'}])),
    ], 'Sevenths: one step short of home.')

    L('ear-seventh-qualities', 7, 'Dominant, major or minor 7th?', ['ear-seventh-chords'], [
        S("""Three seventh chords: **dominant 7th** (restless), **major 7th** (dreamy), **minor 7th** (soft, mellow)."""),
        X(ear('ear-dom7-maj7-min7', 'Three seventh chords', [{'type': 'chord', 'pool': ['dom7', 'maj7', 'min7'], 'root': r} for r in ['C4', 'F3', 'G3']])),
    ], 'Seventh chords, by colour.')

    L('ear-degrees-f-dm', 7, 'Every degree in F major and D minor', ['ear-minor-degrees', 'ear-echo-g-five'], [
        S("""Degrees in two new keys, all seven notes."""),
        X(ear('ear-degrees-f-all', 'F major, every degree', [{'type': 'degree', 'key': 'F', 'pool': [1, 2, 3, 4, 5, 6, 7]}], cadence='F')),
        X(ear('ear-degrees-dm-all', 'D minor, every degree', [{'type': 'degree', 'key': 'Dm', 'pool': [1, 2, 3, 4, 5, 6, 7]}], cadence='Dm', reps=3, days=2)),
    ], 'Every note of a key, major and minor.')

    L('ear-echo-seven', 7, 'Echo seven notes', ['ear-echo-six'], [
        S("""Seven-note phrases, the length of a real musical phrase. Sing it back silently first."""),
        X(ear('ear-echo-seven-notes', 'Seven notes', [{'type': 'melody', 'notes': n, 'plays': 3} for n in ['C4 E4 G4 F4 E4 D4 C4', 'G4 F4 E4 G4 C5 B4 C5', 'E4 F4 G4 A4 G4 E4 C4', 'A4 G4 F4 E4 F4 D4 C4', 'C4 D4 E4 C4 F4 E4 D4', 'G4 E4 C5 A4 G4 F4 E4']])),
    ], 'Phrases as long as real tunes.')

    # ------------------------------------------------------------ stage 8
    L('ear-tritone', 8, 'The tritone', ['ear-sixths-sevenths', 'dominant-seventh-theory'], [
        S("""Three whole tones: the **tritone**, the tense heart of the dominant 7th (B and F in G7). It sits
        right between a fourth and a fifth.""", sound='C4:h F4:h | C4:h F#4:h | C4:h G4:h'),
        X(ear('ear-4-tritone-5', 'Fourth, tritone or fifth?', [{'type': 'interval', 'pool': ['P4', 'TT', 'P5'], 'from': 'C4', 'direction': 'up', 'answer': 'name'}])),
    ], 'The tritone wants to resolve.')

    L('ear-four-triads', 8, 'All four triads', ['ear-seventh-qualities'], [
        S("""Major, minor, diminished and **augmented** (stretched, dreamlike, like a question)."""),
        X(ear('ear-maj-min-dim-aug', 'Four triads', [{'type': 'chord', 'pool': ['maj', 'min', 'dim', 'aug'], 'root': r} for r in ['C4', 'D4', 'G3']])),
    ], 'Four triads, four moods.')

    L('ear-cadence-types', 8, 'Four kinds of cadence', ['ear-cadences', 'cadence-types'], [
        S("""A cadence is how a phrase ends. **Perfect** (V–I, full stop), **plagal** (IV–I, "Amen"),
        **imperfect** (ends on V, a comma) and **interrupted** (V–vi, a surprise)."""),
        X(quiz('ear-cadence-quiz', 'Name the cadence', [
            Q(f'Listen ({i + 1}). Which cadence?', right, [c for c in ['Perfect', 'Plagal', 'Imperfect', 'Interrupted'] if c != right], why, sound=snd)
            for i, (right, snd, why) in enumerate([
                ('Perfect', 'C4+E4+G4:h F4+A4+C5:h | G4+B4+D5:h C4+E4+G4:h', 'V to I: the full stop.'),
                ('Plagal', 'C4+E4+G4:h G4+B4+D5:h | F4+A4+C5:h C4+E4+G4:h', 'IV to I: the "Amen".'),
                ('Imperfect', 'C4+E4+G4:h F4+A4+C5:h | C4+E4+G4:h G4+B4+D5:h', 'Ends on V: a comma, not a full stop.'),
                ('Interrupted', 'C4+E4+G4:h F4+A4+C5:h | G4+B4+D5:h A4+C5+E5:h', 'V then vi: you expected I and got a minor chord.'),
                ('Perfect', 'G3+B3+D4:h C4+E4+G4:h | D4+F#4+A4:h G3+B3+D4:h', 'V to I in G.'),
                ('Plagal', 'F3+A3+C4:h Bb3+D4+F4:h | Bb3+D4+F4:h F3+A3+C4:h', 'IV to I in F.'),
                ('Imperfect', 'F3+A3+C4:h Bb3+D4+F4:h | F3+A3+C4:h C4+E4+G4:h', 'Ends on V in F.'),
                ('Interrupted', 'G3+B3+D4:h C4+E4+G4:h | D4+F#4+A4:h E4+G4+B4:h', 'V to vi in G.'),
                ('Perfect', 'A3+C4+E4:h D4+F4+A4:h | E4+G#4+B4:h A3+C4+E4:h', 'V to i in A minor.'),
                ('Interrupted', 'A3+C4+E4:h D4+F4+A4:h | E4+G#4+B4:h F4+A4+C5:h', 'V to VI in A minor.'),
                ('Plagal', 'G3+B3+D4:h D4+F#4+A4:h | C4+E4+G4:h G3+B3+D4:h', 'IV to I in G.'),
                ('Imperfect', 'A3+C4+E4:h D4+F4+A4:h | A3+C4+E4:h E4+G#4+B4:h', 'Ends on V in A minor.'),
            ])], prompt='Hear each ending. Every answer comes with the reason.')),
    ], 'Full stop, Amen, comma, surprise.')

    # ------------------------------------------------------------ stage 9
    L('ear-chromatic-degrees', 9, 'Notes from outside the key', ['ear-degrees-f-dm', 'ear-tritone'], [
        S("""Music borrows notes from outside the key: the **♭3** (a touch of minor in major) and the **♯4** (a lift
        towards 5)."""),
        X(ear('ear-degrees-chromatic', 'Degrees with ♭3 and ♯4', [{'type': 'degree', 'key': 'C', 'pool': [1, 'b3', 3, '#4', 5]}], cadence='C')),
    ], 'Outside notes, heard against the key.')

    L('ear-echo-eight', 9, 'Echo eight-note phrases', ['ear-echo-seven'], [
        S("""Eight notes: a whole phrase. Break it into two halves in your head."""),
        X(ear('ear-echo-eight-notes', 'Eight notes', [{'type': 'melody', 'notes': n, 'plays': 3} for n in ['C4 D4 E4 G4 F4 E4 D4 C4', 'E4 G4 C5 B4 A4 G4 F4 E4', 'G4 F4 E4 F4 G4 A4 B4 C5', 'A4 C5 B4 G4 A4 F4 E4 D4', 'C5 G4 A4 E4 F4 D4 E4 C4']])),
    ], 'Whole phrases by ear.')

    L('ear-sus-chords', 9, 'Suspended chords', ['ear-four-triads'], [
        S("""A **sus** chord swaps the third for the second (sus2) or the fourth (sus4). It floats, neither major nor minor."""),
        X(ear('ear-sus2-sus4-maj', 'sus2, sus4 or major?', [{'type': 'chord', 'pool': ['sus2', 'sus4', 'maj'], 'root': r} for r in ['C4', 'D4', 'G3']])),
    ], 'Suspended: the third is missing, so the chord floats.')

    L('ear-perfect-pitch-c', 2, 'Side quest: remember C', ['note-naming'], [
        S("""Can you remember what C sounds like without a reference? Most people cannot at first, and it does not
        matter for playing. This side quest is just for fun: C, or not C?"""),
        X(ear('ear-absolute-c', 'C or not C?', [{'type': 'note', 'pool': ['C4', 'E4', 'G4', 'A4'], 'lit': True}], questions=20, reps=3, days=3)),
    ], 'A side quest: try it now and then, never worry about it.', type='side-quest')

    # ------------------------------------------------------------ more practice in every stage
    L('ear-intervals-by-playing', 5, 'Play the interval you hear', ['ear-fourths-fifths-sixths', 'ear-together-intervals'], [
        S("""Now answer on the keys: you hear two notes, the first one is shown; play the second. Starting notes change, so you
        have to hear the **distance**, not remember a key."""),
        X(ear('ear-play-2-3', 'Play seconds and thirds', [{'type': 'interval', 'pool': ['M2', 'm3', 'M3'], 'from': f, 'direction': 'up', 'answer': 'play'} for f in ('C4', 'F4', 'G4')])),
        X(ear('ear-play-4-5', 'Play fourths and fifths', [{'type': 'interval', 'pool': ['P4', 'P5'], 'from': f, 'direction': 'up', 'answer': 'play'} for f in ('C4', 'D4', 'A3')])),
        X(ear('ear-play-mixed', 'Play any interval to the sixth', [{'type': 'interval', 'pool': ['M2', 'm3', 'M3', 'P4', 'P5', 'M6'], 'from': f, 'direction': 'up', 'answer': 'play'} for f in ('C4', 'E4', 'G3', 'Bb3')], reps=3, days=3)),
    ], 'Hear the distance, find it from any key.')

    L('ear-chords-anywhere', 6, 'Major and minor anywhere', ['ear-triad-qualities'], [
        S("""Major or minor, on any root. The quality is the same wherever it sits."""),
        X(ear('ear-maj-min-roots', 'Major or minor, any root', [{'type': 'chord', 'pool': ['maj', 'min'], 'root': r} for r in ('C4', 'D4', 'E4', 'F3', 'G3', 'A3', 'Bb3')])),
        X(ear('ear-maj-min-dim-anywhere', 'Major, minor or diminished, any root', [{'type': 'chord', 'pool': ['maj', 'min', 'dim'], 'root': r} for r in ('C4', 'D4', 'E4', 'F3', 'G3', 'A3')], reps=3, days=3)),
    ], 'Chord colours stay the same in every key.')

    L('ear-minor-phrases', 6, 'Echo minor phrases', ['ear-minor-degrees', 'ear-echo-five'], [
        S("""Phrases in A minor and D minor. The raised 7th (G♯, C♯) leans up into the key note."""),
        X(ear('ear-echo-minor-five', 'Five-note phrases in minor', [{'type': 'melody', 'notes': n, 'plays': 2} for n in ['A4 B4 C5 B4 A4', 'E5 D5 C5 B4 A4', 'A4 C5 E5 C5 A4', 'C5 B4 A4 G#4 A4', 'D4 E4 F4 E4 D4', 'A4 G4 F4 E4 D4', 'D4 F4 A4 F4 D4', 'F4 E4 D4 C#4 D4']])),
    ], 'Minor phrases have a home too.')

    L('ear-bass-lines', 7, 'Hearing the bass', ['ear-minor-phrases', 'ear-seventh-chords'], [
        S("""Low notes are harder to hear. Echo bass lines below middle C with the left hand."""),
        X(ear('ear-echo-bass', 'Echo the bass', [{'type': 'melody', 'notes': n, 'plays': 3} for n in ['C3 G2 C3', 'C3 F2 G2 C3', 'A2 D3 E3 A2', 'G2 C3 D3 G2', 'C3 A2 F2 G2', 'F2 Bb2 C3 F2', 'D3 G2 A2 D3', 'E2 A2 B2 E2']])),
        X(ear('ear-count-low', 'How many notes, low down?', [{'type': 'count', 'pool': [1, 2, 3], 'range': ['C2', 'C4']}])),
    ], 'The bass is the floor of the harmony.')

    L('ear-intervals-down', 8, 'Intervals, up and down', ['ear-all-intervals'], [
        S("""Every interval, in either direction. Going down, a fourth sounds like the end of a phrase, a fifth like a horn call."""),
        X(ear('ear-intervals-both-ways', 'Every interval, both ways', [{'type': 'interval', 'pool': ['m2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'], 'from': 'G4', 'direction': 'both', 'answer': 'name'}], questions=25)),
        X(ear('ear-harmonic-all', 'Every interval, together', [{'type': 'interval', 'pool': ['m2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'], 'from': 'C4', 'direction': 'up', 'answer': 'name', 'together': True}], questions=25, reps=3, days=3)),
    ], 'Every interval, every way.')

    L('ear-echo-two-hands', 9, 'Echo a tune and its bass', ['ear-bass-lines', 'ear-echo-eight'], [
        S("""Tunes that cross middle C: the low notes go to the left hand, the high ones to the right."""),
        X(ear('ear-echo-wide', 'Echo across the keyboard', [{'type': 'melody', 'notes': n, 'plays': 3} for n in ['C3 G3 E4 C5', 'C5 G4 E4 C4 G3 C3', 'A2 E3 C4 A4', 'G2 D3 B3 G4 D5', 'F2 C3 A3 F4', 'E4 C4 G3 E3 C3']])),
    ], 'The whole keyboard, by ear.')

    L('ear-contour-five', 3, 'Five-note shapes', ['ear-contour-four'], [
        S("""Five notes, four moves. Draw them in the air."""),
        X(ear('ear-contour-5', 'Five notes: which shape?', [{'type': 'contour', 'length': 5, 'range': ['C4', 'C6'], 'gap': [2, 5]}])),
        X(ear('ear-contour-5-steps', 'Five notes, small steps', [{'type': 'contour', 'length': 5, 'range': ['C4', 'C5'], 'gap': [1, 2]}], reps=3, days=3)),
    ], 'Longer shapes, longer memory.')

    L('ear-half-steps', 4, 'The smallest step', ['ear-seconds-thirds'], [
        S("""The half step is the smallest distance on the piano. Hear it, both ways, in every register."""),
        X(ear('ear-sd-half-step', 'Same or a half step apart?', [{'type': 'compare', 'pool': ['same', 'different'], 'range': ['C2', 'C6'], 'gap': [1, 1]}])),
        X(ear('ear-hl-half-step', 'A half step up or down?', [{'type': 'compare', 'pool': ['higher', 'lower'], 'range': ['C2', 'C6'], 'gap': [1, 1]}], reps=3, days=3)),
    ], 'One key apart, and you can hear it.')
