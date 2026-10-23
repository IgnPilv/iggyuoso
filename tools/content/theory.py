# The theory branch: how music is built, a few screens and a quiz at a time. Questions whose answers
# can be worked out (key signatures, intervals, chords, degrees) are computed, so they are always right.
import random
from lib import *

def L(id, stage, title, requires, steps, recap):
    lesson(id, title, steps, recap, skills=['theory'])
    node(id, 'theory', stage, title, requires, type='lesson')

def pick(rng, items, n): return rng.sample(items, n)

SHARPS = 'F C G D A E B'.split()
FLATS = 'B E A D G C F'.split()
MAJ_SIG = {'C': 0, 'G': 1, 'D': 2, 'A': 3, 'E': 4, 'B': 5, 'F#': 6, 'F': -1, 'Bb': -2, 'Eb': -3, 'Ab': -4, 'Db': -5, 'Gb': -6}
REL_MINOR = {'C': 'Am', 'G': 'Em', 'D': 'Bm', 'A': 'F#m', 'E': 'C#m', 'B': 'G#m', 'F': 'Dm', 'Bb': 'Gm', 'Eb': 'Cm', 'Ab': 'Fm', 'Db': 'Bbm', 'Gb': 'Ebm'}

def pretty(n): return n.replace('#', '♯').replace('b', '♭') if len(n) > 1 else n
def key_name(k): return pretty(k[:-1]) + ' minor' if k.endswith('m') else pretty(k) + ' major'
def sig_text(c):
    if c == 0: return 'No sharps or flats'
    acc = SHARPS[:c] if c > 0 else FLATS[:-c]
    sym = '♯' if c > 0 else '♭'
    return ', '.join(a + sym for a in acc)

IV_NAMES = {(1, 1): 'm2', (1, 2): 'M2', (2, 3): 'm3', (2, 4): 'M3', (3, 5): 'P4', (3, 6): 'TT', (4, 6): 'TT', (4, 7): 'P5', (4, 8): 'aug5',
            (5, 8): 'm6', (5, 9): 'M6', (6, 10): 'm7', (6, 11): 'M7', (7, 12): 'P8', (4, 6): 'dim5', (3, 6): 'aug4'}
LONG = {'m2': 'minor 2nd', 'M2': 'major 2nd', 'm3': 'minor 3rd', 'M3': 'major 3rd', 'P4': 'perfect 4th', 'aug4': 'augmented 4th', 'dim5': 'diminished 5th',
        'P5': 'perfect 5th', 'aug5': 'augmented 5th', 'm6': 'minor 6th', 'M6': 'major 6th', 'm7': 'minor 7th', 'M7': 'major 7th', 'P8': 'octave'}

def interval_of(a, b):
    steps = (LETTERS.index(b[0]) + 7 * octave_of(b)) - (LETTERS.index(a[0]) + 7 * octave_of(a))
    return IV_NAMES[(steps, midi(b) - midi(a))]

def run(base):
    rng = random.Random(7)

    # ------------------------------------------------------------ stage 1
    qs = [
        Q('Which C is middle C?', 'C4', ['C3', 'C5', 'C2'], 'Middle C is C4: the C near the middle of the piano, and the start of octave 4.', whyKeys=keys('C4', labels='names')),
        Q('C4 to C5 is...', 'An octave', ['A step', 'A fifth'], 'From one C to the next C is eight white keys: an octave.'),
        Q('The note just below C4 is...', 'B3', ['B4', 'D4', 'C3'], 'Octave numbers change at C. The B just below middle C belongs to octave 3.'),
        Q('The note just above B3 is...', 'C4', ['C3', 'A3', 'B4'], 'After B comes C, and the octave number goes up.'),
        Q('Which is higher: G3 or E4?', 'E4', ['G3'], 'Octave 4 is above octave 3, whatever the letter.'),
        Q('Which is lower: A4 or C5?', 'A4', ['C5'], 'A4 is in octave 4; C5 starts octave 5.'),
        Q('How many C keys does an 88-key piano have?', '8', ['7', '5', '12'], 'From C1 to C8: eight of them.'),
        Q('The lowest key of an 88-key piano is...', 'A0', ['C1', 'C0', 'A1'], 'Below C1 there are just three keys: A0, B♭0, B0.'),
        Q('Two notes with the same letter, an octave apart, sound...', 'Like the same note, higher and lower', ['Clashing', 'Completely different'], 'Octaves blend so well they sound like one note doubled.', sound='C4:h C5:h'),
        Q('E4 is in the octave that starts on...', 'C4', ['E3', 'C5', 'A3'], 'Each octave runs from C up to B: E4 is between C4 and B4.'),
        Q('Which note is two octaves above C3?', 'C5', ['C4', 'C6', 'E3'], 'C3 → C4 is one octave, C4 → C5 is two.'),
        Q('The octave number tells you...', 'Which C to B stretch the note is in', ['How loud it is', 'How long it lasts'], 'Octave numbers name the register: where on the keyboard.'),
    ]
    L('theory-octaves', 1, 'Octaves and their numbers', ['f-g-a-b'], [
        S("""The seven letters repeat all the way up the keyboard. From one C to the next is an **octave**. To say
        **which** C, we number the octaves: middle C is **C4**, the C above it **C5**, the C below **C3**. The number
        changes at every C, so B3 is just below middle C.""", keys=keys('C3 B3 C4 D4 C5', labels='names'), terms=['octave', 'register'],
          check=check('The B just above middle C is...', 'B4', ['B3', 'B5'], 'Middle C starts octave 4, so the B above it is B4.')),
        S("""Octaves sound alike: C3, C4 and C5 sound like the same note at different heights.""", sound='C3:h C4:h | C5:h C6:h'),
        X(quiz('theory-octaves-quiz', 'Octaves quiz', qs)),
    ], 'Middle C is C4. Numbers change at C.')

    # ------------------------------------------------------------ stage 2
    qs = []
    for m, beats, val in [('2/4', 2, 'quarter'), ('3/4', 3, 'quarter'), ('4/4', 4, 'quarter'), ('2/2', 2, 'half'), ('3/8', 3, 'eighth'), ('3/2', 3, 'half')]:
        qs.append(Q(f'In {m}, how many beats are in a bar?', str(beats), [str(x) for x in (2, 3, 4, 6) if x != beats][:3], f'The top number: {beats} beats a bar.'))
        if m in ('2/4', '3/8', '2/2'):
            qs.append(Q(f'In {m}, which note gets one beat?', f'A {val} note', [f'A {x} note' for x in ('quarter', 'half', 'eighth', 'whole') if x != val][:3], f'The bottom number names the beat: {m.split("/")[1]} = {val} note.'))
    for bar, m in [('C5:q C5:q C5:q', '3/4'), ('C5:h C5:h', '4/4'), ('C5:q C5:q', '2/4'), ('C5:h.', '3/4'), ('C5:w', '4/4'), ('C5:q C5:h', '3/4')]:
        qs.append(Q('Which time signature fits this bar?', m, [x for x in ('2/4', '3/4', '4/4') if x != m], f'The bar adds up to {int(meter_quarters(m))} quarter beats.', staff=bar))
    L('theory-time-signatures', 2, 'Time signatures', ['three-four-time', 'rhythm-two-four'], [
        S("""The two numbers at the start are the **time signature**. The **top** number says how many beats in a bar;
        the **bottom** number says which note gets one beat: 4 = a quarter note, 2 = a half note, 8 = an eighth.""",
          staff=staff('C5:q C5:q C5:q | C5:h.'), terms=['time signature', 'bar', 'bar line'],
          check=check('3/4 means...', 'Three quarter-note beats a bar', ['Three bars of four', 'Four beats, three times'], 'Top: 3 beats. Bottom: 4 = quarter notes.')),
        X(quiz('theory-time-signatures-quiz', 'Time signatures quiz', qs[:16])),
    ], 'Top number: how many. Bottom number: what kind.')

    qs = []
    vals = {'whole': 4, 'half': 2, 'dotted half': 3, 'quarter': 1, 'eighth': 0.5, 'dotted quarter': 1.5}
    def beats(x): return str(int(x)) if x == int(x) else str(x).replace('.5', '½').replace('0½', '½')
    for a, b in [('half', 'quarter'), ('quarter', 'quarter'), ('whole', 'half'), ('dotted half', 'quarter'), ('eighth', 'eighth'), ('dotted quarter', 'eighth'), ('half', 'half'), ('quarter', 'eighth')]:
        s = vals[a] + vals[b]
        wrong = sorted({beats(s + 1), beats(s - 0.5) if s > 1 else beats(s + 2), beats(s * 2)} - {beats(s)})[:3]
        qs.append(Q(f'A {a} note plus a {b} note last how many beats (in 4/4)?', beats(s), wrong, f'{beats(vals[a])} + {beats(vals[b])} = {beats(s)}.'))
    qs += [
        Q('How many eighth notes fill one quarter note?', '2', ['3', '4', '1'], 'Two eighths = one quarter.'),
        Q('How many quarter notes fill a whole note?', '4', ['2', '3', '8'], 'A whole note is four beats.'),
        Q('A dot after a note adds...', 'Half its value', ['One beat', 'Double its value'], 'A dotted half = 2 + 1 = 3 beats; a dotted quarter = 1 + ½.'),
        Q('This bar in 4/4 is missing one note. Which?', 'A quarter note', ['A half note', 'An eighth note', 'A whole note'], '2 + 1 = 3 beats so far: one more beat is needed.', staff='C5:h C5:q'),
        Q('This bar in 3/4 is missing one note. Which?', 'A half note', ['A quarter note', 'A dotted half note'], 'One beat so far: two more.', staff='C5:q'),
        Q('A half rest lasts...', '2 beats', ['1 beat', '4 beats'], 'Rests have the same values as the notes they match.'),
    ]
    L('theory-note-value-maths', 2, 'Adding up note values', ['half-and-whole-notes', 'rhythm-quarter-rests'], [
        S("""Every bar adds up to the time signature. Whole = 4, half = 2, quarter = 1, eighth = ½. A **dot** adds half
        the value again: a dotted half lasts 3.""", staff=staff('C5:h. C5:q | C5:q. C5:e C5:h'), terms=['dot'],
          check=check('A dotted half note lasts...', '3 beats', ['2 beats', '2½ beats'], '2 + 1 (half of 2) = 3.')),
        X(quiz('theory-note-values-quiz', 'Note values quiz', qs)),
    ], 'Every bar adds up.')

    # ------------------------------------------------------------ stage 3
    words = [('Allegro', 'Fast and lively'), ('Andante', 'At a walking pace'), ('Adagio', 'Slow'), ('Moderato', 'At a moderate speed'),
             ('Presto', 'Very fast'), ('Largo', 'Very slow and broad'), ('Ritardando (rit.)', 'Gradually slower'), ('Accelerando', 'Gradually faster'),
             ('A tempo', 'Back to the speed before'), ('Crescendo (cresc.)', 'Gradually louder'), ('Diminuendo (dim.)', 'Gradually softer'),
             ('Legato', 'Smoothly connected'), ('Staccato', 'Short and detached'), ('Fermata', 'Hold the note longer'), ('Dolce', 'Sweetly'), ('Cantabile', 'In a singing style')]
    meanings = [m for _, m in words]
    qs = [Q(f'{w} means...', m, pick(random.Random(w), [x for x in meanings if x != m], 3), f'{w}: {m.lower()}.') for w, m in words]
    L('theory-tempo-words', 3, 'Tempo and expression words', ['dynamics'], [
        S("""Music uses **Italian** words for speed and character. Speed words from slow to fast: **largo, adagio, andante,
        moderato, allegro, presto**. "Andante" means walking, so it's in the middle.""", terms=['tempo', 'allegro', 'andante', 'adagio'],
          check=check('Which is faster?', 'Allegro', ['Andante', 'Adagio'], 'Allegro is lively; andante walks; adagio is slow.')),
        S("""Changes: **ritardando** slows down, **accelerando** speeds up, **a tempo** goes back. **Crescendo** grows louder,
        **diminuendo** softer. A **fermata** (𝄐) holds a note longer than written.""", terms=['ritardando', 'crescendo', 'fermata']),
        X(quiz('theory-tempo-words-quiz', 'Italian words quiz', qs)),
    ], 'Largo to presto, and how to change on the way.')

    qs = [
        Q('A repeat sign at the end means...', 'Go back to the start (or the facing repeat sign)', ['Stop', 'Play louder'], 'Two dots before a double bar line: play that section again.'),
        Q('With 1st and 2nd endings, the second time through you...', 'Skip the 1st ending and play the 2nd', ['Play both endings', 'Play the 1st ending twice'], 'The brackets tell you which ending to take each time.'),
        Q('D.C. al Fine means...', 'Go back to the beginning and end at Fine', ['Go to the sign', 'Repeat the last bar'], 'Da Capo = from the head (the start); Fine = the end.'),
        Q('D.S. means...', 'Go back to the sign 𝄋', ['Go back to the start', 'Play the coda'], 'Dal Segno = from the sign.'),
        Q('"To Coda" tells you to...', 'Jump to the coda ending', ['Play slower', 'Repeat'], 'The coda (tail) is a separate ending section, marked with ⊕.'),
        Q('Fine means...', 'The end', ['Fine and slow', 'A repeat'], 'Fine (Italian) = end.'),
        Q('A double bar line (thin, then thick) means...', 'The end of the piece', ['A key change', 'A repeat'], 'Without dots, the thick double bar is the final bar line.'),
        Q('A piece is 8 bars with a repeat sign at the end. You play...', '16 bars', ['8 bars', '24 bars'], 'Eight bars, then the same eight again.'),
        Q('Da Capo is Italian for...', 'From the head (the start)', ['From the sign', 'With the tail'], 'Capo = head.'),
        Q('Repeat signs facing each other enclose...', 'The section to repeat', ['A section to skip', 'A key change'], 'Only the bars between them repeat.'),
        Q('After D.C. al Fine, do you take the repeats again?', 'Usually not', ['Always', 'Only the first one'], 'By convention repeats are skipped after a D.C. unless the music says otherwise.'),
        Q('The 𝄋 sign is called...', 'Segno', ['Coda', 'Fermata'], 'Segno = sign.'),
    ]
    L('theory-road-map', 3, 'Repeats and the road map', ['y1-checkpoint-b'], [
        S("""Music saves paper with **repeat signs**: two dots facing a double bar line mean "go back". **1st and 2nd endings** play
        different last bars each time. **D.C. al Fine**: back to the start, stop at Fine.""", terms=['repeat', '1st ending', 'D.C.', 'Fine'],
          check=check('Repeat dots point...', 'At the bars to play again', ['At the next piece', 'At the coda'], 'The dots face into the section that repeats.')),
        X(quiz('theory-road-map-quiz', 'Road map quiz', qs)),
    ], 'Repeats, endings, D.C., D.S. and coda: the road map of a piece.')

    qs = []
    for sharp, flat in [('C#', 'Db'), ('D#', 'Eb'), ('F#', 'Gb'), ('G#', 'Ab'), ('A#', 'Bb')]:
        qs.append(Q(f'{pretty(sharp)} is the same key as...', pretty(flat), [pretty(x) for x in pick(random.Random(sharp), [f for _, f in [('C#', 'Db'), ('D#', 'Eb'), ('F#', 'Gb'), ('G#', 'Ab'), ('A#', 'Bb')] if f != flat], 3)],
                    f'{pretty(sharp)} and {pretty(flat)} are two names for the same black key: they are **enharmonic**.', whyKeys=keys(sharp + '4', labels='names')))
    qs += [
        Q('E♯ is the same key as...', 'F', ['E', 'F♯', 'D♯'], 'There is no black key between E and F, so E♯ is the white key F.'),
        Q('C♭ is the same key as...', 'B', ['C', 'B♭', 'D♭'], 'No black key between B and C: C♭ is the white key B.'),
        Q('B♯ is the same key as...', 'C', ['B', 'C♯', 'A♯'], 'B♯ is the white key C.'),
        Q('F♭ is the same key as...', 'E', ['F', 'E♭', 'G♭'], 'F♭ is the white key E.'),
        Q('Two names for the same key are called...', 'Enharmonic', ['Relative', 'Chromatic'], 'Enharmonic: same sound, different spelling.'),
        Q('In G major, the black key between F and G is written...', 'F♯', ['G♭'], 'G major has F♯ in its key signature, so it is spelled F♯.'),
        Q('In F major, the black key between A and B is written...', 'B♭', ['A♯'], 'F major has B♭: every letter used once, so it is B♭, not A♯.'),
        Q('Why can a scale not use both F and F♯?', 'Each letter appears once in a scale', ['They clash', 'It can, often'], 'A major or minor scale uses each letter once; that decides the spelling.'),
    ]
    L('theory-enharmonics', 3, 'One key, two names', ['sharps-flats-naturals'], [
        S("""Every black key has two names: the one above C is **C♯** (C raised) or **D♭** (D lowered). Same key, same sound:
        these names are **enharmonic**. Which one is used depends on the key the music is in.""",
          keys=keys('C#4 Eb4 F#4 Ab4 Bb4', labels='names'), terms=['enharmonic'],
          check=check('G♭ is also called...', 'F♯', ['G♯', 'A♭'], 'The black key between F and G: F♯ or G♭.')),
        S("""Even white keys have second names: **E♯ = F**, **B♯ = C**, **F♭ = E**, **C♭ = B**, because there is no black key between them."""),
        X(quiz('theory-enharmonics-quiz', 'Enharmonics quiz', qs)),
    ], 'Same key, two names; the key of the music decides.')

    # ------------------------------------------------------------ stage 4
    qs = []
    for k in ['C', 'G', 'D', 'F', 'Bb', 'A', 'Eb']:
        c = MAJ_SIG[k]
        others = [sig_text(x) for x in (0, 1, 2, -1, -2, 3, -3) if x != c]
        qs.append(Q(f'The key signature of {key_name(k)} is...', sig_text(c), pick(random.Random(k), others, 3), f'{key_name(k)}: {sig_text(c)}.'))
        if k != 'C':
            qs.append(Q('Which major key has this key signature?', key_name(k), [key_name(x) for x in pick(random.Random(k + 'x'), [x for x in ('G', 'D', 'F', 'Bb', 'A', 'Eb') if x != k], 3)],
                        f'{sig_text(c)}: {key_name(k)}. Sharps: the key is a half step above the last sharp. Flats: the key is the second-to-last flat.', staff='C5:w', key=k))
    L('theory-keys-two-and-three', 4, 'Keys with two and three sharps or flats', ['keys-and-signatures'], [
        S("""Sharps are added in the order **F C G D A E B**; flats in the reverse, **B E A D G C F**. D major has two sharps
        (F♯, C♯), A major three (F♯ C♯ G♯). B♭ major has two flats (B♭ E♭), E♭ major three (B♭ E♭ A♭).""",
          staff=staff('D5:w', key='D'), terms=['key signature'],
          check=check('With sharps, the major key is...', 'A half step above the last sharp', ['The last sharp', 'A fifth below the first sharp'], 'Last sharp C♯ → D major.')),
        S("""With flats, the key is the **second-to-last flat**: B♭ E♭ → B♭ major; B♭ E♭ A♭ → E♭ major. (F major, one flat, you just remember.)""",
          staff=staff('Bb4:w', key='Bb')),
        X(quiz('theory-keys-two-three-quiz', 'Key signatures quiz', qs)),
    ], 'Last sharp + half step; second-to-last flat.')

    names = ['tonic', 'supertonic', 'mediant', 'subdominant', 'dominant', 'submediant', 'leading note']
    qs = []
    for k in ['C', 'G', 'F', 'D', 'Bb', 'A']:
        for i in pick(random.Random(k), [0, 2, 3, 4, 6], 2):
            right = pretty(degree(tonic_note(k, 4), 'major', i + 1)[:-1])
            wrong = [pretty(degree(tonic_note(k, 4), 'major', j + 1)[:-1]) for j in pick(random.Random(k + str(i)), [x for x in range(7) if x != i], 3)]
            qs.append(Q(f'In {key_name(k)}, the {names[i]} is...', right, wrong, f'{key_name(k)}: {", ".join(pretty(x[:-1]) for x in scale(tonic_note(k, 4))[:7])}. Degree {i + 1}, the {names[i]}, is {right}.'))
    qs += [Q('The dominant is degree...', '5', ['4', '7', '3'], 'Dominant = 5, the second most important note.'),
           Q('The subdominant is degree...', '4', ['5', '2', '6'], 'Sub-dominant: the "under-dominant", one below 5.')]
    L('theory-degree-names', 4, 'The names of the degrees', ['major-scale-pattern', 'chord-symbols'], [
        S("""Each step of a scale has a number and a name. The three most important: **1 tonic** (home), **5 dominant**
        (the strongest pull home), **4 subdominant**. The **leading note** (7) leads up to the tonic.""",
          staff=staff('C4:q D4:q E4:q F4:q | G4:q A4:q B4:q C5:q', labels='names'), terms=names,
          check=check('In C major the dominant is...', 'G', ['F', 'B', 'E'], 'Degree 5 of C major: G.')),
        X(quiz('theory-degree-names-quiz', 'Degree names quiz', qs)),
    ], 'Tonic, dominant, subdominant: the pillars of a key.')

    qs = []
    for sym in ['Am', 'Dm', 'Em', 'C', 'F', 'G', 'D', 'Gm', 'Bb', 'A']:
        t = [pretty(x[:-1]) for x in chord_tones(sym, 4)]
        right = ' '.join(t)
        alt = sym[:-1] if sym.endswith('m') else sym + 'm'
        wrong = [' '.join(pretty(x[:-1]) for x in chord_tones(alt, 4))]
        root = chord_tones(sym, 4)[0]
        third = chord_tones(sym, 4)[1]
        wrong.append(' '.join(pretty(x[:-1]) for x in [root, third, step_up(root, 5, 9)]))  # a sixth instead of the fifth
        qs.append(Q(f'Which notes make {pretty(sym[:-1]) + "m" if sym.endswith("m") else pretty(sym)}?', right, wrong,
                    f'{right}: root, third and fifth. {"Minor: the third is three half steps above the root." if sym.endswith("m") else "Major: the third is four half steps above the root."}', whyKeys=keys(' '.join(chord_tones(sym, 4)), labels='names')))
    L('theory-minor-chords', 4, 'Minor chords and their symbols', ['chord-symbols', 'relative-minor'], [
        S("""A chord symbol with a small **m** is a **minor** chord: Am = A C E. The only difference from major is the
        middle note, one half step lower: A major is A C♯ E.""", keys=keys('A3 C4 E4', labels='names'), sound='A3+C#4+E4:h A3+C4+E4:h',
          check=check('Dm is...', 'D F A', ['D F♯ A', 'D E A'], 'Root D, minor third F, fifth A.')),
        X(quiz('theory-minor-chords-quiz', 'Chord spelling quiz', qs)),
    ], 'Small m, lower third.')

    # ------------------------------------------------------------ stage 5
    qs = []
    pairs = [('C4', 'E4'), ('C4', 'Eb4'), ('D4', 'F4'), ('D4', 'F#4'), ('E4', 'A4'), ('F4', 'C5'), ('C4', 'A4'), ('E4', 'C5'), ('G4', 'F5'),
             ('C4', 'B4'), ('A4', 'B4'), ('B4', 'C5'), ('F4', 'B4'), ('D4', 'A4'), ('E4', 'G4'), ('C4', 'G4')]
    allnames = list(dict.fromkeys(LONG.values()))
    for a, b in pairs:
        n = LONG[interval_of(a, b)]
        qs.append(Q('Name this interval.', n, pick(random.Random(a + b), [x for x in allnames if x != n], 3),
                    f'Count the letters {a[0]} to {b[0]} for the number, then the half steps ({midi(b) - midi(a)}) for the quality: {n}.', staff=f'{a}:h {b}:h', sound=f'{a}:h {b}:h'))
    L('theory-interval-quality', 5, 'Major, minor and perfect', ['perfect-intervals', 'thirds-major-minor'], [
        S("""Every interval has a **number** (count the letters, both ends included) and a **quality**: 2nds, 3rds, 6ths and 7ths
        are **major** or **minor**; unisons, 4ths, 5ths and octaves are **perfect**. Count half steps to tell which.""",
          callout="""m2 = 1, M2 = 2, m3 = 3, M3 = 4, P4 = 5, P5 = 7, m6 = 8, M6 = 9, m7 = 10, M7 = 11, P8 = 12 half steps.""",
          check=check('E to G is a...', 'Minor 3rd', ['Major 3rd', 'Perfect 4th'], 'Three letters (a 3rd), three half steps: minor.')),
        S("""A trick: a **major** interval above the tonic is always in the major scale. C to A? A is in C major, so it is a major 6th.""",
          staff=staff('C4:h A4:h'), sound='C4:h A4:h'),
        X(quiz('theory-interval-quality-quiz', 'Interval naming quiz', qs)),
    ], 'Number from letters, quality from half steps.')

    qs = [
        Q('A phrase is...', 'A musical sentence, often four bars', ['One note', 'A whole piece'], 'Phrases are like sentences: they breathe at the end.'),
        Q('A phrase that sounds unfinished is often called a...', 'Question', ['Answer', 'Coda'], 'It ends away from home, usually on 2 or 5.'),
        Q('An answering phrase usually ends on...', 'The tonic', ['The dominant', 'The leading note'], 'Coming home to 1 sounds finished.'),
        Q('Form AB is called...', 'Binary', ['Ternary', 'Rondo'], 'Two sections: binary (bi = two).'),
        Q('Form ABA is called...', 'Ternary', ['Binary', 'Theme and variations'], 'Three sections with the first coming back: ternary.'),
        Q('In ABA, the second A is...', 'The first section again (often exactly)', ['A new tune', 'The coda'], 'The return of A makes the shape.'),
        Q('Twinkle Twinkle has which form?', 'ABA', ['AB', 'ABAC'], '"Twinkle... are" (A), "Up above... high" (B), "Twinkle... are" again (A).'),
        Q('A minuet and trio usually makes the shape...', 'Minuet, trio, minuet: ABA', ['AB', 'ABAB'], 'The minuet comes back after the trio: ternary.'),
        Q('A, A, B, A is a common shape for...', 'A 32-bar song', ['A rondo', 'A sonata'], 'Many songs: two A phrases, a bridge B, A again.'),
        Q('Repeating a melody higher or lower is called a...', 'Sequence', ['Cadence', 'Canon'], 'A sequence repeats a pattern starting on another note.'),
        Q('A short repeated idea, like the four notes opening Beethoven\'s 5th, is a...', 'Motif', ['Cadence', 'Coda'], 'A motif is the smallest recognisable idea.'),
        Q('Two phrases that start the same but end differently are...', 'Parallel phrases', ['A canon', 'Contrary motion'], 'Same start, different endings: question and answer.'),
    ]
    L('theory-phrases-and-form', 5, 'Phrases and form', ['theory-road-map', 'stable-unstable'], [
        S("""Music is built from **phrases**, like sentences, usually four bars. A **question** phrase ends away from home;
        the **answer** ends on the tonic. Phrases group into sections, named with letters: **AB** (binary), **ABA** (ternary).""",
          sound='C4:q D4:q E4:q F4:q | G4:h D4:h | C4:q D4:q E4:q F4:q | E4:h C4:h', terms=['phrase', 'binary', 'ternary', 'motif'],
          check=check('In the sound, the first phrase ends on...', 'D: unfinished', ['C: finished'], 'D (degree 2) sounds like a question.')),
        X(quiz('theory-form-quiz', 'Form quiz', qs)),
    ], 'Phrases are sentences; form is the shape of the story.')

    # ------------------------------------------------------------ stage 6
    qs = [
        Q('6/8 is...', 'Compound duple: two beats of three eighths', ['Simple triple: six beats', 'The same as 3/4'], 'Six eighths grouped 3 + 3: two big beats.'),
        Q('9/8 has how many big beats?', '3', ['9', '2', '4'], '9 eighths in groups of three: three big beats.'),
        Q('12/8 has how many big beats?', '4', ['12', '3', '6'], '12 eighths in groups of three: four big beats.'),
        Q('In 6/8, one big beat is a...', 'Dotted quarter note', ['Quarter note', 'Half note'], 'Three eighths = one dotted quarter.'),
        Q('3/4 and 6/8 both have six eighths a bar. The difference is...', 'The grouping: 3/4 = 2+2+2, 6/8 = 3+3', ['Nothing', '6/8 is faster'], 'Three beats of two eighths vs two beats of three.'),
        Q('Simple time divides the beat into...', 'Two', ['Three', 'Four'], 'Simple: beats split in two. Compound: in three.'),
        Q('Compound time divides the beat into...', 'Three', ['Two', 'Four'], 'Compound beats split in three.'),
        Q('Which is compound?', '12/8', ['4/4', '3/4', '2/2'], 'Top numbers 6, 9, 12 mean compound time.'),
        Q('Which is simple triple?', '3/4', ['6/8', '9/8', '3/8'], '3/4: three beats, each split in two. (3/8 is usually felt in one.)'),
        Q('Which fills a bar of 6/8?', 'A quarter, an eighth, a dotted quarter', ['Three quarters and an eighth', 'Two half notes'], '1 + ½ + 1½ = 3 quarters = six eighths.'),
        Q('A slow blues in 12/8 feels like...', '4/4 with every beat split in three', ['3/4', '2/4'], 'Four big beats, each a triplet.'),
        Q('The count for 6/8 is...', '1-2-3 4-5-6, accents on 1 and 4', ['1-2 3-4 5-6', '1 2 3 4 5 6 all equal'], 'Two groups of three.'),
    ]
    L('theory-compound-time', 6, 'Simple and compound time', ['three-eight-time', 'theory-time-signatures'], [
        S("""In **simple time** (2/4, 3/4, 4/4) each beat splits in **two**. In **compound time** (6/8, 9/8, 12/8) each beat
        splits in **three**, and the beat is a dotted quarter. 6/8 has two beats, 9/8 three, 12/8 four.""",
          staff=staff('C5:e C5:e C5:e C5:e C5:e C5:e'), terms=['simple time', 'compound time', 'duple', 'triple', 'quadruple'],
          check=check('9/8 is...', 'Compound triple', ['Simple triple', 'Compound duple'], 'Three beats, each three eighths.')),
        X(quiz('theory-compound-time-quiz', 'Compound time quiz', qs)),
    ], 'Twos are simple, threes are compound.')

    qs = []
    for k in ['C', 'G', 'D', 'F', 'Bb', 'A', 'Eb', 'E']:
        m = REL_MINOR[k]
        qs.append(Q(f'The relative minor of {key_name(k)} is...', key_name(m), [key_name(REL_MINOR[x]) for x in pick(random.Random(k), [x for x in REL_MINOR if x != k], 3)],
                    f'Go down three half steps (a minor 3rd) from {pretty(k)}: {pretty(m[:-1])}. They share a key signature: {sig_text(MAJ_SIG[k])}.'))
    for k in ['Em', 'Dm', 'Bm', 'Gm']:
        maj = next(x for x, y in REL_MINOR.items() if y == k)
        qs.append(Q(f'The key signature of {key_name(k)} is...', sig_text(MAJ_SIG[maj]), [sig_text(x) for x in pick(random.Random(k), [y for y in (0, 1, 2, 3, -1, -2, -3) if y != MAJ_SIG[maj]], 3)],
                    f'{key_name(k)} borrows the signature of its relative major, {key_name(maj)}.'))
    qs += [Q('A piece has one sharp and ends on E. Its key is probably...', 'E minor', ['G major', 'E major'], 'One sharp is G major or E minor; ending on E points to E minor.'),
           Q('A piece has one flat and its melody has C♯ in it. The key is probably...', 'D minor', ['F major', 'C major'], 'C♯ is the raised 7th of D minor (harmonic minor).')]
    L('theory-minor-key-signatures', 6, 'Minor key signatures', ['circle-of-fifths', 'harmonic-minor'], [
        S("""Every major key has a **relative minor** sharing its key signature: three half steps down from the tonic. C major and
        A minor have none; G major and E minor one sharp. To tell them apart, look at the last note and for the raised 7th.""",
          staff=staff('E4:w', key='Em'), terms=['relative minor'],
          check=check('The relative minor of F major is...', 'D minor', ['A minor', 'F minor'], 'F down three half steps: D.')),
        X(quiz('theory-minor-signatures-quiz', 'Minor keys quiz', qs)),
    ], 'Each signature serves two keys: major and its relative minor.')

    qs = []
    for tune, k_from, k_to, st, se in [('C4 D4 E4', 'C', 'G', 4, 7), ('C4 E4 G4', 'C', 'F', 3, 5), ('G4 A4 B4', 'G', 'D', 4, 7), ('E4 D4 C4', 'C', 'D', 1, 2),
                                         ('F4 A4 C5', 'F', 'G', 1, 2), ('C4 G4 E4', 'C', 'A', 5, 9), ('D4 F#4 A4', 'D', 'C', -1, -2), ('A4 C5 E5', 'Am', 'Dm', 3, 5)]:
        notes = tune.split()
        right = ' '.join(pretty(transpose(n, st, se)[:-1]) for n in notes)
        wrong = [' '.join(pretty(transpose(n, st, se + dx)[:-1]) for n in notes) for dx in (1,)] + [' '.join(pretty(transpose(n, st + 1, se + 2)[:-1]) for n in notes)]
        qs.append(Q(f'Move {" ".join(pretty(n[:-1]) for n in notes)} from {key_name(k_from)} to {key_name(k_to)}.', right, [w for w in wrong if w != right][:2] + [' '.join(pretty(n[:-1]) for n in notes)],
                    f'Every note moves by the same interval, and the new key\'s sharps or flats apply: {right}.'))
    qs += [Q('Transposing changes...', 'The pitch, not the tune', ['The rhythm', 'The tune'], 'Same shape, new starting note.'),
           Q('To move a tune from C to G, every note goes up a...', 'Perfect 5th (or down a 4th)', ['Major 3rd', 'Half step'], 'C to G is a 5th.'),
           Q('A tune in C has an F. In G, that F becomes...', 'C', ['F♯', 'G'], 'Up a 5th: F → C.'),
           Q('Singers ask to "take it down a tone". That means...', 'Transpose down a whole step', ['Play more softly', 'Play slower'], 'A tone = a whole step.')]
    L('theory-transposition', 6, 'Transposing on paper', ['transposing', 'theory-keys-two-and-three'], [
        S("""To **transpose**, move every note by the same interval and use the new key's signature. Do it by **degrees**: in C, C E G
        is 1 3 5; in G, 1 3 5 is G B D.""", staff=staff('C4:q E4:q G4:h | G4:q B4:q D5:h'),
          check=check('C D E in F major becomes...', 'F G A', ['F G A♭', 'F G B♭'], '1 2 3 of F major: F G A.')),
        X(quiz('theory-transposition-quiz', 'Transposing quiz', qs)),
    ], 'Think in degrees, and the key does the rest.')

    # ------------------------------------------------------------ stage 7
    qs = []
    for k in ['C', 'G', 'F', 'D', 'Bb', 'A', 'Eb', 'E']:
        five = degree(tonic_note(k, 3), 'major', 5)
        t = [pretty(x[:-1]) for x in [five, step_up(five, 2, 4), step_up(five, 4, 7), step_up(five, 6, 10)]]
        right = ' '.join(t)
        wrong_m = ' '.join(t[:3] + [pretty(step_up(five, 6, 11)[:-1])])
        wrong_t = ' '.join([t[0], pretty(step_up(five, 2, 3)[:-1])] + t[2:])
        sym = pretty(five[:-1]) + '7'
        qs.append(Q(f'The dominant 7th chord in {key_name(k)} is {sym}. Its notes are...', right, [wrong_m, wrong_t], f'Root {t[0]}, major 3rd {t[1]}, 5th {t[2]}, minor 7th {t[3]}.'))
    qs += [Q('The dominant 7th is built on degree...', '5', ['7', '4', '1'], 'Dominant = 5; add the 7th above it.'),
           Q('In G7, the B usually resolves to...', 'C', ['A', 'B♭'], 'B is the leading note of C: it rises a half step.'),
           Q('In G7, the F usually resolves to...', 'E', ['G', 'F♯'], 'The 7th falls by step.'),
           Q('Between B and F in G7 is a...', 'Tritone', ['Perfect 5th', 'Major 6th'], 'B to F: three whole tones, the tense heart of V7.')]
    L('dominant-seventh-theory', 7, 'The dominant 7th chord', ['chord-symbols', 'theory-degree-names', 'y2-exit'], [
        S("""Add a fourth note to the dominant triad, a 7th above its root, and you get the **dominant 7th** (V7). In C: G B D **F**.
        It is the most restless chord in a key: the **B** wants to rise to C and the **F** wants to fall to E.""",
          staff=staff('G3+B3+D4+F4:h C4+E4+G4:h', clef='treble'), sound='G3+B3+D4+F4:h C4+E4+G4:h', terms=['dominant 7th', 'resolution', 'tritone'],
          check=check('V7 in F major is...', 'C7: C E G B♭', ['F7: F A C E♭', 'C7: C E G B'], 'Degree 5 of F is C; the 7th above C in F major is B♭.')),
        X(quiz('theory-dominant-seventh-quiz', 'Dominant 7th quiz', qs)),
    ], 'V7: four notes that must go home.')

    qs = []
    cads = [('V–I', 'Perfect'), ('IV–I', 'Plagal'), ('I–V', 'Imperfect'), ('ii–V', 'Imperfect'), ('V–vi', 'Interrupted'), ('V7–I', 'Perfect'), ('IV–V', 'Imperfect'), ('V7–vi', 'Interrupted')]
    for c, n in cads:
        qs.append(Q(f'A phrase ends {c}. That cadence is...', n, [x for x in ('Perfect', 'Plagal', 'Imperfect', 'Interrupted') if x != n],
                    {'Perfect': 'Ending V–I: the full stop.', 'Plagal': 'IV–I: the "Amen" cadence.', 'Imperfect': 'Ending on V: a comma, the music must go on.', 'Interrupted': 'V then vi instead of I: a surprise.'}[n]))
    qs += [Q('Which cadence sounds most final?', 'Perfect', ['Imperfect', 'Interrupted'], 'V–I is the full stop.'),
           Q('Which cadence is sung as "Amen" at the end of hymns?', 'Plagal', ['Perfect', 'Interrupted'], 'IV–I: A-men.'),
           Q('In C major, a perfect cadence is...', 'G to C', ['F to C', 'C to G'], 'V (G) to I (C).'),
           Q('In G major, an interrupted cadence is...', 'D to Em', ['D to G', 'C to G'], 'V (D) to vi (E minor).')]
    L('cadence-types', 7, 'Four cadences', ['cadence-in-f', 'theory-phrases-and-form'], [
        S("""A **cadence** is the chord pair that ends a phrase. **Perfect** V–I (full stop), **plagal** IV–I ("Amen"), **imperfect**
        ends on V (comma), **interrupted** V–vi (surprise).""", sound='C4+E4+G4:h G3+B3+D4:h | C4+E4+G4:w', terms=['perfect', 'plagal', 'imperfect', 'interrupted'],
          check=check('A phrase ending on V is...', 'Imperfect', ['Perfect', 'Plagal'], 'Ending on the dominant leaves it open.')),
        X(quiz('theory-cadences-quiz', 'Cadences quiz', qs)),
    ], 'Full stop, Amen, comma, surprise.')

    qs = []
    for sym, q in [('Cdim', 'dim'), ('Caug', 'aug'), ('Bdim', 'dim'), ('Faug', 'aug'), ('Ddim', 'dim'), ('Gaug', 'aug'), ('Ebaug', 'aug'), ('F#dim', 'dim')]:
        t = ' '.join(pretty(x[:-1]) for x in chord_tones(sym, 4))
        root = parse_chord(sym)[0]
        maj = ' '.join(pretty(x[:-1]) for x in chord_tones(root, 4)); mn = ' '.join(pretty(x[:-1]) for x in chord_tones(root + 'm', 4))
        nm = 'diminished' if q == 'dim' else 'augmented'
        qs.append(Q(f'{pretty(root)} {nm} is...', t, [maj, mn], f'{nm.capitalize()}: {"two minor 3rds (the 5th lowered)" if q == "dim" else "two major 3rds (the 5th raised)"}.'))
    qs += [Q('The triad on the leading note in a major key is...', 'Diminished', ['Minor', 'Augmented'], 'B D F in C major: two minor 3rds.'),
           Q('An augmented triad is made of...', 'Two major 3rds', ['Two minor 3rds', 'A 4th and a 3rd'], 'C E G♯: 4 + 4 half steps.'),
           Q('Which triad appears in the harmonic minor on degree 3?', 'Augmented', ['Diminished', 'Major'], 'C E G♯ in A harmonic minor.'),
           Q('A diminished triad sounds...', 'Tense and squeezed', ['Bright and stable', 'Dreamy and stretched'], 'Its 5th is a tritone.')]
    L('theory-aug-dim', 8, 'Augmented and diminished', ['dominant-seventh-theory', 'theory-interval-quality'], [
        S("""Two more triads. **Diminished**: two minor 3rds (B D F); its outer notes make a tritone. **Augmented**: two major 3rds
        (C E G♯); it sounds stretched and unresolved.""", sound='B3+D4+F4:h C4+E4+G#4:h', terms=['diminished', 'augmented'],
          check=check('C E♭ G♭ is...', 'C diminished', ['C minor', 'C augmented'], 'Minor 3rd + minor 3rd.')),
        X(quiz('theory-aug-dim-quiz', 'Triad types quiz', qs)),
    ], 'Four triads: major, minor, diminished, augmented.')

    qs = []
    for sym in ['Cmaj7', 'Dm7', 'G7', 'Fmaj7', 'Am7', 'Em7', 'D7', 'Bbmaj7']:
        t = ' '.join(pretty(x[:-1]) for x in chord_tones(sym, 3))
        root, q = parse_chord(sym)
        others = [s for s in (root + 'maj7', root + 'm7', root + '7') if s != sym]
        qs.append(Q(f'{pretty(sym)} is...', t, [' '.join(pretty(x[:-1]) for x in chord_tones(s, 3)) for s in others],
                    {'maj7': 'Major triad + major 7th.', 'm7': 'Minor triad + minor 7th.', '7': 'Major triad + minor 7th: the dominant 7th.'}[q]))
    qs += [Q('In C major, the 7th chord on degree 2 is...', 'Dm7', ['Dmaj7', 'D7'], 'D F A C: minor triad, minor 7th.'),
           Q('In C major, the 7th chord on degree 1 is...', 'Cmaj7', ['C7', 'Cm7'], 'C E G B: major 7th.'),
           Q('Which 7th chord occurs only on degree 5 of a major key?', 'The dominant 7th', ['The major 7th', 'The minor 7th'], 'Major triad + minor 7th happens only on V.'),
           Q('ii7–V7–Imaj7 in C is...', 'Dm7 G7 Cmaj7', ['D7 G7 C7', 'Dm7 Gmaj7 C'], 'The jazz standard progression.')]
    L('theory-seventh-chords', 8, 'Seventh chords', ['dominant-seventh-theory'], [
        S("""Any triad can take a 7th. Three common ones: **major 7th** (Cmaj7: C E G B), **dominant 7th** (C7: C E G B♭),
        **minor 7th** (Cm7: C E♭ G B♭).""", sound='C4+E4+G4+B4:h C4+E4+G4+Bb4:h | C4+Eb4+G4+Bb4:w', terms=['major 7th', 'minor 7th'],
          check=check('Am7 is...', 'A C E G', ['A C♯ E G', 'A C E G♯'], 'Minor triad A C E + minor 7th G.')),
        X(quiz('theory-seventh-chords-quiz', 'Seventh chords quiz', qs)),
    ], 'Maj7 dreams, 7 pulls, m7 relaxes.')

    qs = [
        Q('A passing note...', 'Moves by step between two chord notes', ['Is a chord note', 'Jumps away and back'], 'C (D) E over a C chord: D passes.'),
        Q('A neighbour note...', 'Steps away from a chord note and back', ['Passes between two chord notes', 'Is held over the bar'], 'E F E: F is an upper neighbour.'),
        Q('Over a C chord, which of these is a chord note?', 'G', ['D', 'F', 'A'], 'C chord: C E G.'),
        Q('Over a G chord, the melody goes B C D. C is a...', 'Passing note', ['Chord note', 'Neighbour note'], 'B and D are in G; C passes between them by step.'),
        Q('Over an F chord, the melody goes A B♭ A. B♭ is a...', 'Neighbour note', ['Passing note', 'Chord note'], 'From A, up a step, back to A.'),
        Q('Chord notes usually fall on...', 'Strong beats', ['Weak beats only', 'Rests'], 'Melodies usually put chord notes on the beat.'),
        Q('Over C: E F G. Which note is not in the chord?', 'F', ['E', 'G'], 'C E G; F passes.'),
        Q('Over Am: A B C. Which note is not in the chord?', 'B', ['A', 'C'], 'Am = A C E; B passes.'),
        Q('Over G7: F E. The F is...', 'A chord note (the 7th)', ['A passing note', 'A wrong note'], 'G7 = G B D F.'),
        Q('Non-chord notes make a melody...', 'Move smoothly between chord notes', ['Clash and stop', 'Louder'], 'They join chord notes by step.'),
        Q('Over C, the melody goes C D E F G. Passing notes are...', 'D and F', ['C and G', 'E only'], 'C E G are chord notes; D and F pass.'),
        Q('Choosing a chord for a bar, look for...', 'The notes on the strong beats', ['The highest note', 'The last note only'], 'Strong-beat notes usually belong to the chord.'),
    ]
    L('theory-passing-notes', 8, 'Chord notes and passing notes', ['stable-unstable', 'theory-seventh-chords'], [
        S("""A melody mixes **chord notes** with notes that join them. A **passing note** steps between two chord notes;
        a **neighbour note** steps away from one and comes back.""", staff=staff('C4:q D4:q E4:q F4:q | G4:h E4:h'), terms=['passing note', 'neighbour note', 'chord note'],
          check=check('Over C: C D E. D is...', 'A passing note', ['A chord note', 'A neighbour note'], 'C and E are in the chord; D passes between.')),
        X(quiz('theory-passing-notes-quiz', 'Non-chord notes quiz', qs)),
    ], 'Chord notes on the beat, passing notes between.')

    sigs = []
    for k in ['E', 'B', 'Ab', 'Db', 'F#', 'Eb', 'A', 'Bb']:
        c = MAJ_SIG[k]
        sigs.append(Q(f'How many {"sharps" if c > 0 else "flats"} has {key_name(k)}?', str(abs(c)), [str(x) for x in pick(random.Random(k), [y for y in range(1, 8) if y != abs(c)], 3)], f'{key_name(k)}: {sig_text(c)}.'))
    sigs += [Q('Going round the circle of fifths clockwise adds...', 'One sharp each step', ['One flat', 'Two sharps'], 'C G D A E B F♯: one more sharp each time.'),
             Q('F♯ major and G♭ major sound...', 'The same (enharmonic keys)', ['A half step apart', 'A fifth apart'], 'Six sharps or six flats: the same keys on the piano.'),
             Q('The last sharp in E major is...', 'D♯', ['G♯', 'A♯'], 'F♯ C♯ G♯ D♯: the key is a half step above, E.'),
             Q('The flats in A♭ major are...', 'B♭ E♭ A♭ D♭', ['B♭ E♭ A♭', 'B♭ E♭ A♭ D♭ G♭'], 'Second-to-last flat A♭ = the key.')]
    L('theory-all-key-signatures', 8, 'Every key signature', ['theory-minor-key-signatures', 'theory-keys-two-and-three'], [
        S("""The full set: up to seven sharps (C♯ major) or flats (C♭ major). In practice you meet up to six. The circle of fifths
        puts them in order: each step clockwise adds a sharp, each step anticlockwise a flat.""",
          staff=staff('E4:w', key='E'), check=check('Four sharps is...', 'E major', ['A major', 'B major'], 'F♯ C♯ G♯ D♯: D♯ + half step = E.')),
        X(quiz('theory-all-signatures-quiz', 'Key signatures quiz', sigs)),
    ], 'All the keys, in circle order.')

    # ------------------------------------------------------------ stage 9
    qs = [
        Q('A rondo has the shape...', 'A B A C A', ['A B', 'A A B A'], 'The main theme keeps coming back between new episodes.'),
        Q('Sonata form has three parts:', 'Exposition, development, recapitulation', ['Verse, chorus, bridge', 'Minuet, trio, minuet'], 'Present the themes, work them, bring them back.'),
        Q('In the exposition of a major-key sonata, the second theme is usually in...', 'The dominant key', ['The tonic', 'The relative minor'], 'In C major, the second theme comes in G.'),
        Q('In the recapitulation, the second theme returns in...', 'The tonic key', ['The dominant', 'A new key'], 'Everything comes home.'),
        Q('The development section...', 'Takes the themes through new keys', ['Repeats the exposition exactly', 'Ends the piece'], 'Fragments, sequences, new keys: the drama.'),
        Q('A sonatina is...', 'A small sonata', ['A song', 'A dance'], 'Shorter, simpler sonata form.'),
        Q('Theme and variations means...', 'A tune, then changed versions of it', ['Two unrelated tunes', 'A round'], 'Same tune, new rhythm, harmony or decoration.'),
        Q('A minuet is in...', '3/4', ['4/4', '6/8'], 'A dance in three.'),
        Q('A coda is...', 'An ending section', ['An opening', 'A repeat'], 'Coda = tail.'),
        Q('The first movement of a classical sonata is usually...', 'In sonata form', ['A rondo', 'A minuet'], 'Fast first movement, sonata form.'),
        Q('The last movement of a classical sonata is often...', 'A rondo', ['A fugue', 'A theme only'], 'Lively finales love rondo form.'),
        Q('A canon (round) is...', 'The same tune starting at different times', ['A tune with chords', 'A form ABA'], 'Frère Jacques is a canon.'),
    ]
    L('theory-sonata-and-rondo', 9, 'Rondo and sonata form', ['theory-phrases-and-form', 'cadence-types'], [
        S("""Bigger forms. **Rondo**: A B A C A, the main theme returns between episodes. **Sonata form**: an **exposition**
        (two themes, the second in a new key), a **development** (the themes travel), a **recapitulation** (both themes at home).""",
          terms=['rondo', 'sonata form', 'exposition', 'development', 'recapitulation'],
          check=check('In sonata form, the themes come home in the...', 'Recapitulation', ['Exposition', 'Development'], 'Recap = recap: everything returns in the tonic.')),
        X(quiz('theory-big-forms-quiz', 'Big forms quiz', qs)),
    ], 'Themes leave and come home.')

    qs = [
        Q('A twelve-bar blues uses which chords?', 'I, IV and V (often as 7ths)', ['I and V only', 'ii, V, I'], 'C7, F7, G7 in C.'),
        Q('Bars 1–4 of a twelve-bar blues are on...', 'I', ['IV', 'V'], 'Four bars of I.'),
        Q('Bars 5–6 move to...', 'IV', ['V', 'vi'], 'Two bars of IV.'),
        Q('Bar 9 is usually...', 'V', ['IV', 'I'], 'Bar 9 is V, bar 10 IV, bar 11 I.'),
        Q('The last bar (12) often has V, to...', 'Turn around to the start', ['End the song', 'Change key'], 'The turnaround leads back to bar 1.'),
        Q('In C, the blues chords are...', 'C7, F7, G7', ['C, Dm, G', 'Cmaj7, Fmaj7, G7'], 'Dominant 7ths on I, IV and V.'),
        Q('The blues scale on C is...', 'C E♭ F F♯ G B♭ C', ['C D E G A C', 'C D E F G A B C'], 'Minor pentatonic plus the "blue note" F♯ (G♭).'),
        Q('The "blue note" is...', 'The flattened 5th (or 3rd) bent against the major chord', ['The tonic', 'Any wrong note'], 'Bluesy tension.'),
        Q('Swing rhythm plays eighths...', 'Long-short', ['Even', 'Short-long'], 'Like a triplet with the middle tied.'),
        Q('In G, bar 5 of a blues is...', 'C7', ['D7', 'G7'], 'IV of G is C.'),
        Q('How many bars is one chorus of a twelve-bar blues?', '12', ['8', '16', '32'], 'Hence the name.'),
        Q('Blues usually uses...', 'Dominant 7th chords even on I', ['Only major triads', 'Only minor chords'], 'C7 as the home chord is what sounds bluesy.'),
    ]
    L('theory-twelve-bar-blues', 9, 'The twelve-bar blues', ['dominant-seventh-theory', 'theory-phrases-and-form'], [
        S("""The **twelve-bar blues**: I I I I | IV IV I I | V IV I V. Three chords, usually all dominant 7ths, and a scale with
        a "blue" note.""", callout="""| C7 | C7 | C7 | C7 |
        | F7 | F7 | C7 | C7 |
        | G7 | F7 | C7 | G7 |""",
          check=check('Bar 5 of a blues in C is...', 'F7', ['G7', 'C7'], 'Bars 5–6 move to IV.')),
        X(quiz('theory-blues-quiz', 'Blues quiz', qs)),
    ], 'Twelve bars, three chords.')

    qs = [
        Q('A good melody mostly moves...', 'By step, with a few leaps', ['Only by leaps', 'Only on one note'], 'Steps sing; leaps add interest.'),
        Q('After a big leap, a melody usually...', 'Steps back in the other direction', ['Leaps again the same way', 'Stops'], 'Filling the gap feels natural.'),
        Q('A melody that sounds finished ends on...', 'The tonic', ['The leading note', 'The 2nd'], 'Home.'),
        Q('The highest point of a phrase is called...', 'The climax', ['The cadence', 'The motif'], 'Usually only once per phrase.'),
        Q('A question phrase often ends on...', '2 or 5', ['1', '8'], 'Away from home.'),
        Q('Repeating a motif higher is a...', 'Sequence', ['Canon', 'Cadence'], 'Repetition gives unity.'),
        Q('Over a C chord on beat 1, a good melody note is...', 'E', ['F', 'B'], 'A chord note on the strong beat.'),
        Q('Two balanced phrases of 4 bars make...', 'An 8-bar period', ['A rondo', 'A sonata'], 'Question + answer = period.'),
        Q('The leading note (7) usually goes to...', '8 (the tonic)', ['6', '5'], 'It leads up by a half step.'),
        Q('A melody with too much repetition sounds...', 'Dull', ['Exciting', 'Unfinished'], 'Repeat, then vary.'),
        Q('In 4/4, the strongest beats are...', '1 and 3', ['2 and 4', 'All equal'], 'Beat 1 strongest, 3 next.'),
        Q('A rhythm motif can unify a melody by...', 'Coming back with different notes', ['Changing every bar', 'Never repeating'], 'Same rhythm, new pitches.'),
    ]
    L('theory-writing-melodies', 9, 'How melodies work', ['theory-passing-notes', 'cadence-types'], [
        S("""Good melodies are mostly **steps** with a few **leaps**; a leap is followed by a step back. Phrases rise to one **climax**,
        put chord notes on strong beats, and the last phrase comes home to the tonic.""", sound='C4:q D4:q E4:q G4:q | A4:h G4:h | F4:q E4:q D4:q B3:q | C4:w',
          check=check('After the leap E–A, the melody...', 'Steps back down', ['Leaps higher', 'Stops'], 'A–G, filling the gap.')),
        X(quiz('theory-melodies-quiz', 'Melody quiz', qs)),
    ], 'Steps, a leap, a peak, home.')

    # ------------------------------------------------------------ spelling drills
    qs = []
    for k in ['G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab']:
        right = ' '.join(pretty(x[:-1]) for x in scale(tonic_note(k, 4))[:7])
        wrong = [' '.join(pretty(x[:-1]) for x in scale(tonic_note(k, 4), 'minor')[:7]), ' '.join(pretty(x[:-1].replace('#', '').replace('b', '')) if len(x) > 2 else pretty(x[:-1]) for x in scale(tonic_note(k, 4))[:7])]
        qs.append(Q(f'Spell the {key_name(k)} scale.', right, [w for w in wrong if w != right], f'{key_name(k)}: {right}. Pattern W W H W W W H.'))
    mqs = []
    for k in ['Am', 'Em', 'Dm', 'Gm', 'Bm', 'Cm']:
        right = ' '.join(pretty(x[:-1]) for x in scale(tonic_note(k, 4), 'harmonic')[:7])
        nat = ' '.join(pretty(x[:-1]) for x in scale(tonic_note(k, 4), 'minor')[:7])
        maj = ' '.join(pretty(x[:-1]) for x in scale(tonic_note(k, 4), 'major')[:7])
        mqs.append(Q(f'Spell the {key_name(k)} harmonic scale.', right, [nat, maj], f'Natural minor with the 7th raised: {right}.'))
    L('theory-scale-spelling', 5, 'Spelling scales', ['theory-keys-two-and-three', 'harmonic-minor'], [
        S("""Spell a scale with **every letter once**, in order, and add the sharps or flats the pattern needs. That is why
        G major has F♯ and not G♭: G already has its letter.""", staff=staff('G4:q A4:q B4:q C5:q D5:q E5:q F#5:q G5:q', labels='names')),
        X(quiz('theory-major-spelling-quiz', 'Spell the major scales', qs, reps=2, days=2)),
        X(quiz('theory-minor-spelling-quiz', 'Spell the minor scales', mqs, reps=2, days=2)),
    ], 'Every letter once, then the accidentals.')

    qs_up, qs_down = [], []
    for base, iv in [('C4', 'M3'), ('D4', 'P5'), ('E4', 'm3'), ('F4', 'M6'), ('G4', 'P4'), ('A4', 'M2'), ('Bb4', 'M3'), ('Eb4', 'P5'), ('F#4', 'm3'), ('D4', 'M7'), ('A4', 'm7'), ('B4', 'P4')]:
        steps, semis = {'M2': (1, 2), 'm3': (2, 3), 'M3': (2, 4), 'P4': (3, 5), 'P5': (4, 7), 'M6': (5, 9), 'm7': (6, 10), 'M7': (6, 11)}[iv]
        up = step_up(base, steps, semis); dn = step_down(base, steps, semis)
        wr = lambda n, d: [pretty(spell(n[0], octave_of(n), midi(n) + d)[:-1]) for _ in (0,)][0]
        qs_up.append(Q(f'A {LONG[iv]} above {pretty(base[:-1])} is...', pretty(up[:-1]), [wr(up, 1) if '##' not in spell(up[0], octave_of(up), midi(up) + 1) else wr(up, -1), pretty(transpose(base, steps + 1, semis + 2)[:-1])],
                       f'{steps + 1} letters up from {pretty(base[:-1])} is {up[0]}; {semis} half steps makes it {pretty(up[:-1])}.', whyStaff=staff(f'{base}:h {up}:h')))
        qs_down.append(Q(f'A {LONG[iv]} below {pretty(base[:-1])} is...', pretty(dn[:-1]), [wr(dn, -1) if 'bb' not in spell(dn[0], octave_of(dn), midi(dn) - 1) else wr(dn, 1), pretty(transpose(base, -steps - 1, -semis - 2)[:-1])],
                         f'{steps + 1} letters down from {pretty(base[:-1])} is {dn[0]}; {semis} half steps makes it {pretty(dn[:-1])}.', whyStaff=staff(f'{base}:h {dn}:h')))
    L('theory-spelling-intervals', 6, 'Spelling intervals', ['theory-interval-quality', 'theory-scale-spelling'], [
        S("""To write an interval: count the **letters** first (a 3rd above D is F), then fix the **quality** with a sharp or flat
        (D to F is a minor 3rd; a major 3rd needs F♯).""", staff=staff('D4:h F#4:h')),
        X(quiz('theory-intervals-up-quiz', 'Intervals above a note', qs_up, reps=2, days=2)),
        X(quiz('theory-intervals-down-quiz', 'Intervals below a note', qs_down, reps=2, days=2)),
    ], 'Letters first, then the sharp or flat.')
