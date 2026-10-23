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
    rr, rl = rhythm_of(right), rhythm_of(left)
    tk = dict(meter=meter, tempo=tempo, reps=2, days=1, ladder=False, display='staff', **({'pickup': pickup} if pickup else {}))
    if rr and rl and 'x' in rr and 'x' in rl:
        ids.insert(0, tap2(f'{pid}-tap', f'{title}: the rhythm, both hands', rr, rl, prompt='Learn the rhythm first: tap both hands on any keys, right hand from middle C up.', **tk))
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

    piece('turkish-march', 7, 'Turkish March: the opening', 'W. A. Mozart, Rondo alla Turca, 1783 (first bars, arranged)', ['rhythm-sixteenths-two-hands', 'y2-exit'], 'Am', '2/4', 60,
          'B4:s A4:s G#4:s A4:s C5:e r:e | D5:s C5:s B4:s C5:s E5:e r:e | F5:s E5:s D#5:s E5:s B5:s A5:s G#5:s A5:s | B5:s A5:s G#5:s A5:s C6:q',
          'r:h | A3:e C4+E4:e C4+E4:e C4+E4:e | A3:e C4+E4:e C4+E4:e C4+E4:e | A3:e C4+E4:e A3:e C4+E4:e',
          'The last movement of Mozart\'s piano sonata in A major imitates a Turkish military band, all bright and bustling.',
          'Sixteenths turning round a note: B A G♯ A. Keep the fingers close to the keys and light. The left hand answers in short chords.')

    ETUDES = [
        ('etude-g-position', 2, 'Study in G position', ['g-position'], 'G', '4/4', 92,
         'G4:q A4:q B4:q C5:q | D5:h B4:h | C5:q B4:q A4:q G4:q | A4:w | G4:q A4:q B4:q C5:q | D5:h B4:h | A4:q B4:q A4:q F#4:q | G4:w',
         accompany('G | G | C G | D | G | G | D | G', '4/4', 'root'), 'Both hands in G position: the right hand walks, the left hand holds the roots.', 'Find F♯ before you start: it comes in bar 7.', None),
        ('etude-eighths-c', 3, 'Running Eighths', ['eighth-notes', 'technique-c-position-two-hands'], 'C', '4/4', 76,
         'C4:e D4:e E4:e F4:e G4:q G4:q | A4:e G4:e F4:e E4:e D4:h | E4:e F4:e G4:e A4:e G4:q E4:q | D4:e E4:e D4:e B3:e C4:h',
         accompany('C | G | C | G C', '4/4', 'block'), 'Eighth notes running up and down the C position over held chords.', 'Even eighths, like a clock ticking twice as fast.', None),
        ('etude-minor-song', 4, 'Song in A minor', ['natural-minor', 'technique-broken-chords'], 'Am', '4/4', 72,
         'A4:q C5:q E5:q C5:q | D5:q C5:q B4:h | C5:q B4:q A4:q G#4:q | A4:w | E5:q D5:q C5:q B4:q | A4:q B4:q C5:h | B4:q A4:q G#4:q B4:q | A4:w',
         accompany('Am | Dm E | Am E | Am | Am | Am | E | Am', '4/4', 'broken'), 'A song in A minor over broken chords.', 'The G♯ leans up into A: let it.', None),
        ('etude-staccato-chords', 5, 'Bouncing Chords', ['staccato', 'primary-triads'], 'C', '4/4', 88,
         'C5:e r:e E5:e r:e G5:e r:e E5:e r:e | F5:e r:e A5:e r:e G5:h | E5:e r:e C5:e r:e D5:e r:e B4:e r:e | C5:w',
         accompany('C | F C | C G | C', '4/4', 'pulse'), 'A bouncy study: short notes in the right hand, a chord on every beat in the left.', 'Short and light: let the keys bounce your fingers back up.', None),
        ('etude-pedal-waltz', 6, 'Pedal Waltz', ['pedal-simple', 'three-four-time'], 'F', '3/4', 104,
         'A4:h. | C5:h A4:q | G4:h. | C5:h. | Bb4:h. | A4:h F4:q | G4:h E4:q | F4:h.',
         accompany('F | F | C | C | Bb | F | C | F', '3/4', 'waltz'), 'A slow waltz with the pedal changing at every bar.', 'Pedal down after each bass note, up and down again at the next bar line.', ' | '.join(['x:h.'] * 8)),
        ('etude-six-eight', 7, 'Study in 6/8', ['rhythm-six-eight-hands', 'key-of-g'], 'G', '6/8', 60,
         'D5:q B4:e G4:q B4:e | C5:q A4:e F#4:q. | G4:q B4:e D5:q G5:e | F#5:q. D5:q. | E5:q C5:e A4:q C5:e | D5:q B4:e G4:q. | A4:q F#4:e D4:q F#4:e | G4:h.',
         accompany('G | D | G | D | C | G | D | G', '6/8', 'broken'), 'A rocking study in 6/8, two big beats a bar.', 'Long-short, long-short: the 6/8 lilt.', None),
        ('etude-scales-d', 8, 'Scale Study in D', ['technique-two-octave-scales-ht'], 'D', '4/4', 72,
         'D5:e C#5:e B4:e A4:e G4:e F#4:e E4:e D4:e | A4:h F#4:h | G4:e A4:e B4:e C#5:e D5:e E5:e F#5:e G5:e | F#5:h D5:h | B4:e C#5:e D5:e B4:e A4:e B4:e G4:e E4:e | D4:e E4:e F#4:e G4:e A4:h | G4:e E4:e C#4:e E4:e A4:e G4:e F#4:e E4:e | D4:w',
         accompany('D | D | G | D | G | D | A7 | D', '4/4', 'block'), 'Scale runs over held chords: the scale as music, not just exercise.', 'Practise each run alone until it flows, then join the left hand.', None),
        ('etude-chords-in-eb', 8, 'Chorale in E♭', ['technique-cadences-flat-keys'], 'Eb', '4/4', 60,
         'G4:h Ab4:h | Bb4:h Bb4:h | C5:h Bb4:h | Ab4:h G4:h | G4:h F4:h | Eb4:h Ab4:h | G4:h F4:h | Eb4:w',
         accompany('Eb | Eb | Ab Eb | Bb7 Eb | Eb Bb | Eb Ab | Eb Bb7 | Eb', '4/4', 'block'), 'A hymn-like chorale in E♭ major: held chords, a slow tune.', 'Smooth: hold each chord until the very moment the next one sounds.', None),
    ]
    for id, stage, title, req, key, meter, tempo, right, left, story, tips, pedal in ETUDES:
        piece(id, stage, title, 'Our own study', req, key, meter, tempo, right, left, story, tips, pedal=pedal)

    MORE = [
        ('etude-left-hand-melody', 3, 'Left-Hand Song', ['bass-staff', 'technique-c-position-two-hands'], 'C', '4/4', 80,
         'E4+G4:w | F4+A4:w | D4+G4:w | E4+G4:w | E4+G4:w | F4+A4:w | D4+F4:w | E4+G4:w',
         'C3:q D3:q E3:q C3:q | F3:q E3:q D3:h | G3:q F3:q E3:q D3:q | C3:q E3:q G3:h | C3:q D3:q E3:q C3:q | F3:q E3:q D3:h | G3:q F3:q D3:q B2:q | C3:w',
         'This time the left hand sings and the right hand holds soft chords.', 'Bring the left hand out; keep the right-hand chords quiet.', None),
        ('etude-walking-bass', 4, 'Walking Bass', ['two-note-chords', 'technique-broken-chords'], 'C', '4/4', 88,
         'E4+G4:h E4+G4:h | F4+A4:h F4+A4:h | D4+F4:h D4+G4:h | E4+G4:w | E4+G4:h E4+G4:h | F4+A4:h F4+A4:h | D4+F4:h B3+D4:h | C4+E4:w',
         'C3:q D3:q E3:q G3:q | F3:q E3:q D3:q C3:q | B2:q G2:q A2:q B2:q | C3:q G2:q E2:q G2:q | C3:q D3:q E3:q G3:q | F3:q A3:q G3:q F3:q | G3:q F3:q D3:q G2:q | C3:w',
         'The left hand walks in quarter notes under two-note chords.', 'Steady quarters in the left hand, like footsteps.', None),
        ('etude-rocking-thirds', 5, 'Rocking Thirds', ['thirds-major-minor', 'technique-arpeggios-one-octave'], 'G', '4/4', 76,
         'B4+D5:q G4+B4:q B4+D5:q G4+B4:q | C5+E5:q A4+C5:q C5+E5:q A4+C5:q | A4+C5:q F#4+A4:q A4+C5:q F#4+A4:q | G4+B4:w',
         'G2:w | C3:w | D3:w | G2:w', 'Thirds rocking back and forth, a hand position at a time.', 'Keep the wrist loose and let it rock.', None),
        ('etude-minor-march', 6, 'March in D minor', ['staccato', 'technique-minor-scales-ht'], 'Dm', '4/4', 96,
         'D4:q A4:q A4:q. G4:e | F4:q E4:q D4:h | F4:q A4:q D5:q. C5:e | Bb4:q A4:q G4:h | A4:q Bb4:q C5:q A4:q | Bb4:q G4:q A4:h | G4:q E4:q C#4:q E4:q | D4:w',
         accompany('Dm | Dm A | Dm | Gm C | F | Gm Dm | A | Dm', '4/4', 'oompah'), 'A sturdy march in D minor with an oom-pah left hand.', 'Firm on the beat; the dotted rhythms snap.', None),
        ('etude-legato-pedal', 7, 'Evening Bells', ['pedal-legato', 'technique-arpeggios-one-octave'], 'C', '4/4', 60,
         'G5:h E5:h | F5:h D5:h | E5:h C5:h | D5:w | G5:h E5:h | F5:h D5:h | E5:q D5:q C5:q B4:q | C5:w',
         accompany('C | Dm | C | G | C | Dm | C G | C', '4/4', 'arp'), 'Bells ringing over a rolling left hand, joined by the pedal.', 'Change the pedal with each new bass note.', ' | '.join(['x:w', 'x:w', 'x:w', 'x:w', 'x:w', 'x:w', 'x:h x:h', 'x:w'])),
        ('etude-syncopated', 7, 'Syncopated Study', ['syncopation', 'rhythm-syncopation-hands'], 'F', '4/4', 84,
         'F4:e A4:q C5:e r:e A4:e C5:q | Bb4:e D5:q Bb4:e r:e G4:e Bb4:q | A4:e C5:q A4:e r:e F4:e A4:q | G4:e E4:q C4:e F4:h',
         'F2:q C3:q F2:q C3:q | Bb2:q F3:q Bb2:q F3:q | F2:q C3:q F2:q C3:q | C3:q G2:q F2:h', 'Right-hand notes that land between the beats, over a steady left hand.', 'Count eighths out loud: "1 and 2 and".', None),
        ('etude-alberti-g', 8, 'Alberti Study in G', ['technique-alberti', 'technique-two-octave-scales-ht'], 'G', '4/4', 72,
         'D5:h B4:q G4:q | A4:h F#4:h | G4:q B4:q D5:q G5:q | F#5:h D5:h | E5:q C5:q A4:q F#4:q | G4:h B4:h | A4:q G4:q F#4:q A4:q | G4:w',
         accompany('G | D7 | G | D | C | G | D7 | G', '4/4', 'alberti'), 'A classical-style study over an Alberti bass.', 'Left hand soft and even; right hand singing.', None),
        ('etude-chromatic', 9, 'Chromatic Study', ['chromatic-scale', 'technique-octaves'], 'C', '4/4', 66,
         'C5:e B4:e Bb4:e A4:e Ab4:e G4:e F#4:e F4:e | E4:h G4:h | A4:e Bb4:e B4:e C5:e C#5:e D5:e D#5:e E5:e | F5:h D5:h | E5:e Eb5:e D5:e Db5:e C5:e B4:e Bb4:e A4:e | G4:h F4:h | E4:q G4:q D4:q B3:q | C4:w',
         accompany('C | C | F | Dm | C | G7 | C G | C', '4/4', 'block'), 'Chromatic runs, every key in order, over plain chords.', 'Fingering: 3 on every black key, 1 on most white keys, 2 between E-F and B-C.', None),
    ]
    for id, stage, title, req, key, meter, tempo, right, left, story, tips, pedal in MORE:
        piece(id, stage, title, 'Our own study', req, key, meter, tempo, right, left, story, tips, pedal=pedal)
