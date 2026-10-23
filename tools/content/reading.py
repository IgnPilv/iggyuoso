# The reading branch: from "line or space?" to sight-reading both hands in any key. Most drills are
# generated fresh every run, so they can be practised for weeks without learning the answers.
from lib import *

def L(id, stage, title, requires, steps, recap, type='lesson'):
    lesson(id, title, steps, recap, skills=['reading'])
    node(id, 'reading', stage, title, requires, type=type)

def NOTES(id, title, notes, clef='treble', keys=None, answer=None, questions=30, accuracy=90, ms=3000, reps=4, days=2, prompt=None):
    kw = dict(clef=clef, notes=notes, questions=questions, mastery={'accuracy': accuracy, 'medianMs': ms})
    if keys: kw['keys'] = keys
    if answer: kw['answer'] = answer
    if prompt: kw = dict(prompt=prompt, **kw)
    return X(gen(id, title, 'read-notes', reps=reps, days=days, **kw))

def INTERVALS(id, title, intervals, notes='C4-C5', clef='treble', keys=None, questions=25, accuracy=90, ms=3500, reps=3, days=2):
    kw = dict(clef=clef, notes=notes, intervals=intervals, questions=questions, mastery={'accuracy': accuracy, 'medianMs': ms})
    if keys: kw['keys'] = keys
    return X(gen(id, title, 'intervals', reps=reps, days=days, **kw))

def SIGHT(id, title, notes, hand='right', clef=None, keys=None, durations=('q', 'h'), bars=4, tempo=66, meter=None, left=None, reps=4, days=2, prompt=None):
    clef = clef or ('bass' if hand == 'left' else 'grand' if hand == 'together' else 'treble')
    kw = dict(hand=hand, clef=clef, notes=notes, durations=list(durations), bars=bars, tempo=tempo, mastery={'accuracy': 90})
    if keys: kw['keys'] = keys
    if meter: kw['meter'] = meter
    if left: kw['left'] = left
    if prompt: kw = dict(prompt=prompt, **kw)
    return X(gen(id, title, 'sight-read', reps=reps, days=days, **kw))

LINE = ['E4', 'G4', 'B4', 'D5', 'F5']
SPACE = ['F4', 'A4', 'C5', 'E5']

def run(base):
    # ------------------------------------------------------------ stage 1
    qs = []
    for i, n in enumerate(['E4', 'A4', 'G4', 'C5', 'B4', 'F4', 'D5', 'E5', 'F5', 'A4', 'G4', 'E4']):
        on_line = n in LINE
        qs.append(QO('Line or space?', 'On a line' if on_line else 'In a space', ['On a line', 'In a space'],
                     f'The {"line runs through the middle of the note" if on_line else "note sits between two lines"}.', staff=f'{n}:w', clef='treble'))
    for a, b in [('E4', 'G4'), ('G4', 'E4'), ('C5', 'D5'), ('F5', 'D5'), ('A4', 'B4'), ('B4', 'G4')]:
        up = midi(b) > midi(a)
        skip = abs(LETTERS.index(a[0]) + 7 * octave_of(a) - LETTERS.index(b[0]) - 7 * octave_of(b)) == 2
        qs.append(QO('Where does the second note go?', ('Up' if up else 'Down') + (' a skip' if skip else ' a step'),
                     ['Up a step', 'Up a skip', 'Down a step', 'Down a skip'],
                     'A step goes from a line to the next space (or space to line); a skip goes line to line or space to space.', staff=f'{a}:h {b}:h', clef='treble'))
    L('reading-lines-and-spaces', 1, 'Lines and spaces', [], [
        S("""**Music is written on five lines.** Notes sit **on a line** (the line goes through the middle) or **in a
        space** (between two lines). Higher on the page means higher on the piano. That is all you need to read
        the direction of a tune, before you know any note names.""",
          staff=staff('E4:w F4:w G4:w A4:w'), terms=['staff', 'line', 'space'],
          check=check('The first note above is...', 'On a line', ['In a space'], 'The bottom line runs through it.', staff='E4:w')),
        S("""From a line to the next space is a **step** (the next key); from a line to the next line is a **skip** (one key
        missed out). Reading by steps and skips is how fluent readers read: they look at the **distance**, not every name.""",
          staff=staff('E4:q F4:q G4:q A4:q | E4:q G4:q B4:q D5:q'), sound='E4:q F4:q G4:q A4:q | E4:q G4:q B4:q D5:q',
          check=check('Line to the next line is a...', 'Skip', ['Step'], 'Line to line skips over the space between.')),
        X(quiz('reading-lines-spaces-quiz', 'Lines, spaces, steps and skips', qs, reps=2, days=1)),
    ], 'Line or space, up or down, step or skip: the three questions behind all reading.')

    L('reading-landmarks', 1, 'Landmark notes', ['grand-staff-map'], [
        S("""Fluent readers do not count lines for every note. They know a few **landmarks** by heart and read the rest
        as steps and skips from them: middle C, treble G (the line the treble clef curls round) and bass F (the line
        between the bass clef's dots).""", staff=staff('F3:w C4:w G4:w', clef='grand', labels='names')),
        NOTES('rd-landmarks', 'Find the landmarks', 'F3 C4 G4', clef='grand', questions=20, ms=2500, reps=3, days=1),
        NOTES('rd-landmarks-near', 'Landmarks and their neighbours', 'E3 F3 G3 B3 C4 D4 F4 G4 A4', clef='grand', questions=30),
    ], 'Know three notes cold; read the rest as steps and skips.')

    # ------------------------------------------------------------ stage 2
    L('reading-steps-and-skips-sight', 2, 'Reading by steps and skips', ['c-position-reading', 'reading-landmarks'], [
        S("""Short tunes in C position, a new one every time. Find the first note, then read only the **direction and
        distance**: step up, skip down. Keep going even if you slip."""),
        SIGHT('rd-sight-c-rh', 'Right hand in C position', 'C4-G4', prompt='Look at the first note, then follow the steps and skips.'),
        SIGHT('rd-sight-c-lh', 'Left hand in C position', 'C3-G3', hand='left'),
        NOTES('rd-c-position-bass', 'Name the left-hand notes', 'C3-G3', clef='bass', questions=25),
    ], 'Read the shape, not every letter.')

    L('reading-two-hands-first', 2, 'Reading both hands', ['reading-steps-and-skips-sight', 'hands-together-held'], [
        S("""Your first two-hand reading: the right hand plays a tune, the left hand holds the key note or the fifth. Read
        the **top line**; glance down only when the left hand changes."""),
        SIGHT('rd-sight-together-c', 'Tune over the key note', 'C4-G4', hand='together', keys=['C'], left='roots', tempo=60),
        SIGHT('rd-sight-together-c-g', 'Tunes in C and G', 'C4-D5', hand='together', keys=['C', 'G'], left='roots', tempo=60),
    ], 'Read the tune, feel the bass.')

    L('reading-g-and-f-positions', 2, 'Reading in G and F', ['reading-steps-and-skips-sight', 'key-of-g', 'f-position-key-of-f'], [
        S("""Same skill in G position (G to D) and F position (F to C). Mind the F♯ in G and the B♭ in F: the key signature
        at the start of each line reminds you."""),
        SIGHT('rd-sight-g-rh', 'G position, right hand', 'G4-D5', keys=['G']),
        SIGHT('rd-sight-f-rh', 'F position, right hand', 'F4-C5', keys=['F']),
        SIGHT('rd-sight-g-f-lh', 'G and F, left hand', 'F3-D4', hand='left', keys=['G', 'F']),
    ], 'New positions, same reading.')

    # ------------------------------------------------------------ stage 3
    L('reading-intervals-on-staff', 3, 'Intervals on the staff', ['intervals-to-fifth', 'reading-steps-and-skips-sight'], [
        S("""An interval is the distance between two notes. On the staff: a **2nd** is line to space, a **3rd** line to line,
        a **4th** line to space further, a **5th** line to line with one line between.""",
          staff=staff('E4:h F4:h | E4:h G4:h | E4:h A4:h | E4:h B4:h'), sound='E4:h F4:h | E4:h G4:h | E4:h A4:h | E4:h B4:h'),
        INTERVALS('rd-intervals-2-3', '2nds and 3rds', ['M2', 'M3'], notes='C4-C5'),
        INTERVALS('rd-intervals-2-5', '2nds to 5ths', ['M2', 'M3', 'P4', 'P5'], notes='C4-C5'),
        INTERVALS('rd-intervals-bass', '2nds to 5ths in the bass', ['M2', 'M3', 'P4', 'P5'], notes='C3-C4', clef='bass'),
    ], 'Read the distance: 2nd, 3rd, 4th, 5th.')

    L('reading-ledger-lines', 3, 'Ledger lines around middle C', ['reading-landmarks', 'bass-staff'], [
        S("""Notes just above or below the staff get short extra lines: **ledger lines**. Middle C sits on one between
        the staves. Below the treble staff: D, C, B, A; above the bass staff: B, C, D, E.""",
          staff=staff('A3:q B3:q C4:q D4:q', clef='treble', labels='names')),
        NOTES('rd-ledger-treble-low', 'Below the treble staff', 'A3 B3 C4 D4 E4', clef='treble', questions=25),
        NOTES('rd-ledger-bass-high', 'Above the bass staff', 'A3 B3 C4 D4 E4', clef='bass', questions=25),
    ], 'Ledger lines: the staff, extended.')

    L('reading-two-hands-fifths', 3, 'Both hands: root and fifth', ['reading-two-hands-first', 'technique-triads-c-f-g'], [
        S("""The left hand now moves within each bar: root, then fifth. Read both staves in one glance: the left hand pattern repeats."""),
        SIGHT('rd-sight-together-fifths', 'Tunes over root and fifth', 'C4-A4', hand='together', keys=['C', 'G', 'F'], left='fifths', tempo=60),
        SIGHT('rd-sight-eighths', 'Reading eighths', 'C4-G4', keys=['C', 'G'], durations=('q', 'h', 'e'), tempo=66),
    ], 'One glance, two staves.')

    # ------------------------------------------------------------ stage 4
    L('reading-high-and-low', 4, 'High treble, low bass', ['reading-ledger-lines', 'y1-exit'], [
        S("""Higher in the treble (up to two ledger lines above: A5, B5, C6) and lower in the bass (down to C2)."""),
        NOTES('rd-high-treble', 'High in the treble', 'C5-C6', clef='treble', questions=30),
        NOTES('rd-low-bass', 'Low in the bass', 'C2-C3', clef='bass', questions=30),
        NOTES('rd-grand-wide', 'Anywhere on the grand staff', 'C2-C6', clef='grand', questions=30, ms=3500),
    ], 'The whole grand staff.')

    L('reading-chords-sight', 4, 'Reading with chords in the left hand', ['two-note-chords', 'reading-two-hands-fifths'], [
        S("""The left hand holds whole triads. Read them as shapes: three notes stacked line-line-line or space-space-space are a root-position triad."""),
        SIGHT('rd-sight-together-chords', 'Tunes over triads', 'C4-C5', hand='together', keys=['C', 'G', 'F'], left='chords', tempo=56),
        SIGHT('rd-sight-together-eight-bars', 'Eight bars, both hands', 'C4-C5', hand='together', keys=['C', 'G', 'F'], left='fifths', bars=8, tempo=60),
    ], 'Chords are shapes on the staff.')

    L('reading-minor-sight', 4, 'Sight-reading in minor keys', ['natural-minor', 'reading-two-hands-fifths'], [
        S("""Minor tunes in A, D and E minor. The raised 7th (G♯ in A minor) appears as an accidental in the music."""),
        SIGHT('rd-sight-minor-rh', 'Minor tunes, right hand', 'A4-E5', keys=['Am', 'Dm', 'Em']),
        SIGHT('rd-sight-minor-together', 'Minor tunes, both hands', 'A4-E5', hand='together', keys=['Am', 'Dm', 'Em'], left='roots', tempo=60),
    ], 'Minor reads like major, with different home notes.')

    # ------------------------------------------------------------ stage 5
    L('reading-key-signatures', 5, 'Reading with key signatures', ['keys-and-signatures', 'reading-high-and-low'], [
        S("""With a key signature, the sharps or flats apply to **every** note on that letter, on every line, all the way through.
        Play the note as the key says, even though no ♯ or ♭ stands next to it."""),
        NOTES('rd-keys-g-d', 'Read in G and D', 'C4-C6', keys=['G', 'D'], questions=30, ms=3500),
        NOTES('rd-keys-f-bb', 'Read in F and B♭', 'C4-C6', keys=['F', 'Bb'], questions=30, ms=3500),
        NOTES('rd-keys-bass', 'Bass clef with key signatures', 'C2-C4', clef='bass', keys=['G', 'D', 'F', 'Bb'], questions=30, ms=3500),
    ], 'The key signature is in force everywhere.')

    L('reading-wide-intervals', 5, 'Wide intervals', ['interval-map', 'reading-intervals-on-staff'], [
        S("""6ths, 7ths and octaves: a 6th goes line to space with two in between; a 7th line to line with two lines between; an octave line to space far away."""),
        INTERVALS('rd-intervals-to-octave', 'Every interval to the octave', ['M2', 'M3', 'P4', 'P5', 'M6', 'm7', 'P8'], notes='C4-C5'),
        INTERVALS('rd-intervals-quality', 'Major or minor?', ['m2', 'M2', 'm3', 'M3', 'm6', 'M6'], notes='C4-C5', ms=4500),
    ], 'Wide intervals read at a glance.')

    L('reading-sight-many-keys', 5, 'Sight-reading in six keys', ['reading-chords-sight', 'reading-minor-sight', 'reading-key-signatures'], [
        S("""Both hands, six keys, a new piece every time."""),
        SIGHT('rd-sight-six-keys', 'Six keys, both hands', 'C4-D5', hand='together', keys=['C', 'G', 'F', 'D', 'Am', 'Dm'], left='fifths', tempo=60, durations=('q', 'h', 'e')),
        SIGHT('rd-sight-six-keys-lh', 'Six keys, left hand', 'C3-D4', hand='left', keys=['C', 'G', 'F', 'D', 'Am', 'Dm']),
    ], 'Any of six keys, cold.')

    # ------------------------------------------------------------ stage 6
    L('reading-other-meters', 6, 'Reading in 3/4 and 6/8', ['reading-sight-many-keys', 'rhythm-six-eight'], [
        S("""Sight-reading in waltz time and in 6/8."""),
        SIGHT('rd-sight-34', 'Waltz time', 'C4-C5', hand='together', keys=['C', 'G', 'F'], left='roots', meter='3/4', durations=('q', 'h', 'h.'), tempo=80),
        SIGHT('rd-sight-68', 'In 6/8', 'C4-C5', keys=['C', 'G', 'F'], meter='6/8', durations=('q', 'e', 'q.'), tempo=56),
    ], 'Meters change; reading stays the same.')

    L('reading-fluency', 6, 'Fluent note reading', ['reading-key-signatures'], [
        S("""Speed matters now: under two seconds a note, anywhere on the grand staff, with a key signature."""),
        NOTES('rd-fluency-grand', 'Grand staff, fast', 'C2-C6', clef='grand', keys=['C', 'G', 'D', 'F', 'Bb'], questions=40, ms=2000, reps=5, days=3),
    ], 'Reading fast frees the eyes to look ahead.')

    # ------------------------------------------------------------ stage 7
    L('reading-flat-keys-sight', 7, 'Sight-reading in flat keys', ['reading-other-meters', 'y2-exit'], [
        S("""B♭ and E♭ major, G and C minor."""),
        SIGHT('rd-sight-flats', 'Flat keys, both hands', 'C4-D5', hand='together', keys=['Bb', 'Eb', 'Gm', 'Cm'], left='fifths', tempo=60, durations=('q', 'h', 'e')),
        SIGHT('rd-sight-flats-chords', 'Flat keys over chords', 'C4-D5', hand='together', keys=['F', 'Bb', 'Eb', 'Dm', 'Gm'], left='chords', tempo=56),
    ], 'Flats read just like sharps.')

    L('reading-sharp-keys-sight', 7, 'Sight-reading in sharp keys', ['reading-other-meters'], [
        S("""A and E major, E and B minor."""),
        SIGHT('rd-sight-sharps', 'Sharp keys, both hands', 'C4-E5', hand='together', keys=['A', 'E', 'Em', 'Bm'], left='fifths', tempo=60, durations=('q', 'h', 'e')),
        NOTES('rd-keys-a-e', 'Read in A and E', 'C4-C6', keys=['A', 'E'], questions=30, ms=3000),
    ], 'Three and four sharps.')

    # ------------------------------------------------------------ stage 8
    L('reading-eight-bars', 8, 'Eight bars, both hands', ['reading-flat-keys-sight', 'reading-sharp-keys-sight'], [
        S("""Eight-bar pieces with chords. Look one bar ahead; never stop to fix a note."""),
        SIGHT('rd-sight-eight-chords', 'Eight bars over chords', 'C4-E5', hand='together', keys=['C', 'G', 'D', 'F', 'Bb', 'Am', 'Em', 'Dm'], left='chords', bars=8, tempo=60, durations=('q', 'h', 'e'), reps=5, days=3),
        SIGHT('rd-sight-eight-lh', 'Eight bars, left hand', 'E2-C4', hand='left', keys=['C', 'G', 'D', 'F', 'Bb'], bars=8, durations=('q', 'h', 'e')),
    ], 'Look ahead and keep going.')

    # ------------------------------------------------------------ stage 9
    L('reading-any-key', 9, 'Sight-reading in any key', ['reading-eight-bars', 'reading-fluency'], [
        S("""Every key you know, dotted rhythms, three meters."""),
        SIGHT('rd-sight-any-key', 'Any key, both hands', 'C4-E5', hand='together', keys=['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab', 'Am', 'Em', 'Bm', 'Dm', 'Gm', 'Cm'], left='fifths', bars=8, tempo=60, durations=('q', 'h', 'e', 'q.'), reps=6, days=3),
        SIGHT('rd-sight-any-key-34', 'Any key, waltz time', 'C4-E5', hand='together', keys=['C', 'G', 'D', 'F', 'Bb', 'Am', 'Dm', 'Gm'], left='roots', meter='3/4', bars=8, durations=('q', 'h', 'h.', 'e'), tempo=76),
    ], 'Any key, any time.')

    L('reading-find-anywhere', 2, 'Find it anywhere', ['reading-landmarks', 'sharps-flats-naturals'], [
        S("""Every letter appears many times on the keyboard. Find the note named, in any octave: fast."""),
        X(gen('rd-find-white', 'Find the white keys', 'find-notes', reps=3, days=2, notes='C4-B4', questions=30, mastery={'accuracy': 95, 'medianMs': 2000})),
        X(gen('rd-find-black', 'Find the black keys', 'find-notes', reps=3, days=2, notes='C#4 D#4 F#4 G#4 A#4 Db4 Eb4 Gb4 Ab4 Bb4', questions=30, mastery={'accuracy': 95, 'medianMs': 2500})),
    ], 'Any octave, any key, without counting.')

    L('reading-interval-fluency', 6, 'Intervals at a glance', ['reading-wide-intervals'], [
        S("""Intervals in both clefs and in keys, fast."""),
        INTERVALS('rd-intervals-bass-wide', 'Every interval in the bass', ['M2', 'M3', 'P4', 'P5', 'M6', 'm7', 'P8'], notes='C2-C4', clef='bass', ms=3000),
        INTERVALS('rd-intervals-keys', 'Intervals with key signatures', ['m2', 'M2', 'm3', 'M3', 'P4', 'P5', 'm6', 'M6'], notes='C4-C5', keys=['G', 'F', 'D', 'Bb'], ms=3500),
        INTERVALS('rd-intervals-fast', 'Intervals, fast', ['M2', 'M3', 'P4', 'P5', 'M6', 'P8'], notes='C4-C5', ms=2000, reps=4, days=3),
    ], 'Read the distance in a glance.')

    L('reading-ledger-fluency', 8, 'Ledger lines, fast', ['reading-high-and-low', 'reading-fluency'], [
        S("""Two and three ledger lines above the treble and below the bass."""),
        NOTES('rd-ledger-high', 'High ledger lines', 'A5-E6', clef='treble', questions=30, ms=3000),
        NOTES('rd-ledger-low', 'Low ledger lines', 'C1-E2', clef='bass', questions=30, ms=3000),
        NOTES('rd-ledger-mixed', 'Ledger lines everywhere', 'C1-E6', clef='grand', questions=40, ms=2500, reps=5, days=3),
    ], 'Ledger lines read like the staff, extended.')
