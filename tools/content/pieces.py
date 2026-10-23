# The pieces branch: real music to learn and polish, both hands. Public-domain classics (written out
# from the original scores, shortened where marked) and our own studies. Each piece is a lesson:
# right hand, left hand, both together (with the tempo ladder), and a polish take for some.
from lib import *

def piece(id, stage, title, about, requires, key, meter, tempo, right, left, story, tips, pedal=None, pickup=None, rf=None, lf=None, polish=True):
    pid = f'piece-{id}'
    common = dict(meter=meter, key=key, display='staff', pickup=pickup)
    ids = [
        timed(f'{pid}-rh', f'{title}: right hand', right=right, tempo=tempo, prompt='The right hand alone. Shape the phrases.', reps=2, days=1, fingers=rf, **common),
        timed(f'{pid}-lh', f'{title}: left hand', left=left, tempo=tempo, prompt='The left hand alone, until it runs by itself.', reps=2, days=1, fingers=lf, **common),
        timed(pid, title, right=right, left=left, tempo=tempo, prompt='Both hands. The tempo ladder starts you slow.', reps=3, days=2, pedal=pedal, rf=rf, lf=lf, **common),
    ]
    if polish:
        ids.append(timed(f'{pid}-polish', f'{title}: performance', right=right, left=left, tempo=tempo, ladder=False, pedal=pedal, rf=rf, lf=lf,
                         prompt='Full tempo, as if someone is listening. Three clean performances on three days.', reps=3, days=3, **common))
    first = ' | '.join(right.split('|')[:2]).strip()
    steps = [S(f'**{title}** · {about}\n\n{story}', staff=staff(first, key=key if key != 'C' else None), sound=' | '.join(right.split('|')[:4]).strip()),
             S(f'**How to learn it.** {tips}', callout=f'Hands alone first, then together slowly. Loop the hardest bars.')]
    steps += [X(i) for i in ids]
    lesson(pid, title, steps, f'{title}: learned hands alone, then together, then performed.', skills=['repertoire'])
    node(pid, 'repertoire', stage, title, requires, type='piece')

def run(base):
    piece('mirror-march', 1, 'Mirror March', 'Our own study', ['technique-mirror-hands'], 'C', '4/4', 88,
          'C4:q D4:q E4:q C4:q | E4:q D4:q C4:h | C4:q E4:q G4:q E4:q | D4:q D4:q C4:h',
          'C3:q B2:q A2:q C3:q | A2:q B2:q C3:h | C3:q A2:q F2:q A2:q | B2:q B2:q C3:h',
          'A first piece for two hands that move like a mirror: every note in the right hand has a partner in the left, played by the same finger.',
          'Both thumbs start on a C. Say the finger numbers out loud: both hands always use the same one.',
          rf='1 2 3 1 3 2 1 1 3 5 3 2 2 1', lf='1 2 3 1 3 2 1 1 3 5 3 2 2 1')

    piece('two-hand-hop', 1, 'Two-Hand Hop', 'Our own study', ['technique-c-position-two-hands', 'rhythm-two-hands-taking-turns'], 'C', '4/4', 92,
          'C4:q E4:q G4:h | r:w | G4:q F4:q E4:q D4:q | C4:w',
          'r:w | G3:q E3:q C3:h | r:w | C3:w',
          'The hands take turns, then meet on the last note.', 'Count the rests out loud: "one, two, three, four".',
          rf='1 3 5 5 4 3 2 1', lf='1 3 5 5')

    piece('canon-theme', 4, 'Canon in D: the theme', 'Johann Pachelbel, around 1690 (opening, arranged)', ['y1-exit', 'technique-scales-d-a-one-octave'], 'D', '4/4', 60,
          'F#5:h E5:h | D5:h C#5:h | B4:h A4:h | B4:h C#5:h | F#5:h E5:h | D5:h C#5:h | B4:h A4:h | B4:h C#5:h | D5:w',
          'D3:h A2:h | B2:h F#2:h | G2:h D2:h | G2:h A2:h | D3:h A2:h | B2:h F#2:h | G2:h D2:h | G2:h A2:h | D2+A2+D3:w',
          'Pachelbel\'s Canon is built on eight bass notes repeated over and over while the upper voices weave above them. This is the opening: the bass and the first melody.',
          'The left hand plays the famous bass: D A B F♯ G D G A. Learn it until you can play it with your eyes closed.',
          pedal='x:h x:h | x:h x:h | x:h x:h | x:h x:h | x:h x:h | x:h x:h | x:h x:h | x:h x:h | x:w')

    piece('eine-kleine', 5, 'Eine kleine Nachtmusik: the opening', 'W. A. Mozart, 1787 (first bars, arranged)', ['y2-checkpoint-a', 'staccato'], 'G', '4/4', 80,
          'G4:q r:e D4:e G4:q r:e D4:e | G4:e D4:e G4:e B4:e D5:h | C5:q r:e A4:e C5:q r:e A4:e | C5:e A4:e F#4:e A4:e D4:h',
          'G2+D3:h G2+D3:h | G2+B2+D3:w | A2+C3+D3:h A2+C3+D3:h | F#2+A2+C3+D3:w',
          'A serenade for strings that Mozart finished in 1787. Its opening is one of the best known in all music: a rising call, answered.',
          'Short and bright: lift after each quarter note. The second bar rises to a held D; the fourth falls to one.')

    piece('waltz-a-minor', 5, 'Little Waltz in A minor', 'Our own piece', ['three-four-time', 'harmonic-minor'], 'Am', '3/4', 108,
          'E5:h C5:q | B4:h A4:q | G#4:h A4:q | B4:h. | C5:h D5:q | E5:h A4:q | B4:q C5:q B4:q | A4:h.',
          accompany('Am | Am | E | E | Am | Am | E | Am', '3/4', 'waltz'),
          'A melancholy waltz with an oom-pah-pah left hand.', 'The G♯ is the raised 7th of A minor: it leans up to A.')

    piece('fur-elise', 6, 'Für Elise: the theme', 'Ludwig van Beethoven, 1810 (first eight bars)', ['sixteenth-notes', 'y2-checkpoint-b'], 'Am', '3/8', 96,
          'E5:s D#5:s | E5:s D#5:s E5:s B4:s D5:s C5:s | A4:e r:s C4:s E4:s A4:s | B4:e r:s E4:s G#4:s B4:s | C5:e r:s E4:s E5:s D#5:s | E5:s D#5:s E5:s B4:s D5:s C5:s | A4:e r:s C4:s E4:s A4:s | B4:e r:s E4:s C5:s B4:s | A4:q',
          'r:e | r:q. | A2:s E3:s A3:s r:s r:e | E2:s E3:s G#3:s r:s r:e | A2:s E3:s A3:s r:s r:e | r:q. | A2:s E3:s A3:s r:s r:e | E2:s E3:s G#3:s r:s r:e | A2:s E3:s A3:s r:s',
          'Probably the most famous piano piece ever written. Nobody knows for certain who Elise was.',
          'The hands pass the music between them: the left hand plays three notes, the right hand answers. Count in eighths, slowly.',
          pickup='e')

    piece('gymnopedie', 7, 'Gymnopédie No. 1: the opening', 'Erik Satie, 1888 (opening, arranged)', ['pedal-legato', 'y2-exit'], 'D', '3/4', 66,
          'r:h. | r:h. | r:q F#5:q A5:q | G5:q F#5:q C#5:q | B4:q C#5:q D5:q | A4:h. | F#4:h. | F#4:h.',
          'G2:q B3+D4+F#4:h | D2:q A3+C#4+F#4:h | G2:q B3+D4+F#4:h | D2:q A3+C#4+F#4:h | G2:q B3+D4+F#4:h | D2:q A3+C#4+F#4:h | G2:q B3+D4+F#4:h | D2:q A3+C#4+F#4:h',
          'Slow, floating, and strange for its time: two gently rocking chords and a melody that drifts above them.',
          'The left hand leaps from a low bass note to a chord: look at the chord, not the bass. Change the pedal on every bass note.',
          pedal='x:h. | x:h. | x:h. | x:h. | x:h. | x:h. | x:h. | x:h.')

    piece('sonatina-c', 7, 'Sonatina in C', 'Our own piece, in classical style', ['technique-alberti', 'y2-exit'], 'C', '4/4', 72,
          'C5:h E5:q G5:q | G5:h F5:h | D5:q F5:q A5:q F5:q | E5:h C5:h | C5:q E5:q D5:q C5:q | B4:h G4:h | A4:q B4:q C5:q D5:q | C5:w',
          accompany('C | G7 | G7 | C | C | G | F G | C', '4/4', 'alberti'),
          'A small sonatina in the style of Clementi and Mozart: a singing right hand over an Alberti bass.', 'Keep the Alberti bass soft and even; the melody sings over it.')

    piece('prelude-in-c', 8, 'Prelude in C: the opening', 'J. S. Bach, Well-Tempered Clavier I, 1722 (first eight bars, arranged)', ['technique-arpeggios-one-octave', 'pedal-legato', 'y2-exit'], 'C', '4/4', 60,
          ' | '.join(f'r:e {a}:s {b}:s {c}:s {a}:s {b}:s {c}:s r:e {a}:s {b}:s {c}:s {a}:s {b}:s {c}:s' for a, b, c in
                     [('G4', 'C5', 'E5'), ('A4', 'D5', 'F5'), ('G4', 'D5', 'F5'), ('G4', 'C5', 'E5'), ('A4', 'E5', 'A5'), ('F#4', 'A4', 'D5'), ('G4', 'D5', 'G5'), ('E4', 'G4', 'C5')]),
          ' | '.join(f'{a}+{b}:h {a}+{b}:h' for a, b in [('C4', 'E4'), ('C4', 'D4'), ('B3', 'D4'), ('C4', 'E4'), ('C4', 'E4'), ('C4', 'D4'), ('B3', 'D4'), ('B3', 'C4')]),
          'Bach\'s first prelude is one figure repeated: a chord spread out in a rising pattern, changing one or two notes each bar. Here the left hand holds the two lowest notes.',
          'Learn the eight chords first as blocks. Then spread them. Pedal on each new bar.',
          pedal=' | '.join(['x:w'] * 8))

    piece('nocturne-f', 8, 'Nocturne in F', 'Our own piece', ['pedal-legato', 'technique-arpeggios-one-octave'], 'F', '4/4', 60,
          'A4:h. C5:q | Bb4:h G4:h | A4:q Bb4:q C5:q F5:q | E5:w | D5:h. Bb4:q | C5:h A4:h | G4:q A4:q Bb4:q E4:q | F4:w',
          accompany('F | Gm C7 | F | C | Bb | F | C7 | F', '4/4', 'broken'),
          'A night piece: a slow singing melody over broken chords, with the pedal joining everything.', 'Pedal changes with every chord. Let the melody float above a soft left hand.',
          pedal='x:w | x:h x:h | x:w | x:w | x:w | x:w | x:w | x:w')

    piece('blues-in-c', 9, 'Blues in C', 'Our own piece', ['technique-blues-shapes', 'theory-twelve-bar-blues'], 'C', '4/4', 96,
          ' | '.join(['G4:q Bb4:q C5:h', 'G4:q Bb4:q C5:q Eb5:q', 'C5:q Bb4:q G4:h', 'Bb4:q G4:q C5:h', 'A4:q C5:q Eb5:h', 'Eb5:q C5:q A4:h', 'G4:q Bb4:q C5:h', 'C5:q Bb4:q G4:h', 'B4:q D5:q F5:h', 'Eb5:q C5:q A4:h', 'G4:q Bb4:q C5:q E5:q', 'D5:q B4:q G4:h']),
          ' | '.join(['C3:q G3:q A3:q G3:q'] * 4 + ['F2:q C3:q D3:q C3:q'] * 2 + ['C3:q G3:q A3:q G3:q'] * 2 + ['G2:q D3:q E3:q D3:q', 'F2:q C3:q D3:q C3:q', 'C3:q G3:q A3:q G3:q', 'G2:q D3:q E3:q D3:q']),
          'Twelve bars of blues: a boogie left hand and a right hand built from the blues scale.', 'Learn the left hand until it runs by itself. Then the right hand can talk over it.')

    piece('etude-arpeggios', 9, 'Arpeggio Study', 'Our own piece', ['technique-arpeggios-two-octaves'], 'C', '4/4', 72,
          'C4:e E4:e G4:e C5:e E5:e C5:e G4:e E4:e | A3:e C4:e E4:e A4:e C5:e A4:e E4:e C4:e | F3:e A3:e C4:e F4:e A4:e F4:e C4:e A3:e | G3:e B3:e D4:e G4:e B4:e G4:e D4:e B3:e | C4:w',
          'C3:w | A2:w | F2:w | G2:w | C2+C3:w',
          'Arpeggios across two octaves of the right hand, over a slow bass: C, A minor, F, G, C.', 'Thumb under after the third note going up; let the wrist glide.',
          pedal='x:w | x:w | x:w | x:w | x:w')
