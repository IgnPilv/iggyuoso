# Pachelbel's Canon (Johann Pachelbel, around 1690; public domain), as two songs taught in steps:
#   - an easy version for stage 2, moved to C major so every key is white, in half notes and quarters,
#     each hand in one or two five-finger positions (song-canon-easy, five steps);
#   - the Canon in D for later stages: the ground bass with the variations in quarters, eighths and
#     sixteenths and the singing line, both hands (song-canon, six steps).
# Our own arrangements. Runs after the older generators so their lesson files keep their numbers.
from lib import *

ABOUT = 'Johann Pachelbel, around 1690 · our own arrangement'

def bars(*parts): return ' | '.join(parts)

def spans(s):
    """(midi, start, end) of every note in a note string, in quarter beats."""
    out, t = [], 0.0
    for b in tokens(s):
        for p, d, _ in b:
            v = dur_value(d)
            if p != 'r':
                for x in p.split('+'): out.append((midi(x), t, t + v))
            t += v
    return out

DUR = {4.0: 'w', 3.0: 'h.', 2.0: 'h', 1.5: 'q.', 1.0: 'q', 0.75: 'e.', 0.5: 'e', 0.25: 's'}
NAMES = {}

def together(right, left, bar=4.0):
    """Both hands as one line for a play button: at each onset, every note that starts there, until the next onset."""
    for s in (right, left):
        for b in tokens(s):
            for p, _, _ in b:
                for x in p.split('+'):
                    if x != 'r': NAMES[midi(x)] = x
    ev = {}
    for m, a, _ in spans(right) + spans(left): ev.setdefault(a, set()).add(m)
    end = max(len(tokens(right)), len(tokens(left))) * bar
    times = sorted(ev) + [end]
    out, cur = [], []
    for t, nxt in zip(times, times[1:]):
        cur.append('+'.join(NAMES[m] for m in sorted(ev[t])) + ':' + DUR[nxt - t])
        if abs(nxt / bar - round(nxt / bar)) < 1e-6: out.append(' '.join(cur)); cur = []
    return ' | '.join(out)

def no_clash(right, left, where):
    """No key is held by both hands at once."""
    L = spans(left)
    for m, a, b in spans(right):
        for m2, a2, b2 in L:
            assert not (m == m2 and a < b2 and a2 < b), f'{where}: both hands on {m} at {a}'

CHORD_PC = {'C': (0, 4, 7), 'G': (7, 11, 2), 'Am': (9, 0, 4), 'Em': (4, 7, 11), 'F': (5, 9, 0),
            'D': (2, 6, 9), 'A': (9, 1, 4), 'Bm': (11, 2, 6), 'F#m': (6, 9, 1)}

def on_chords(right, chords, every, where):
    """Every right-hand note that starts with a chord (one chord each `every` quarters) is a note of it."""
    for m, a, _ in spans(right):
        i, off = divmod(a, every)
        if abs(off) < 1e-6:
            c = chords[int(i) % len(chords)]
            assert m % 12 in CHORD_PC[c], f'{where}: {m} at beat {a} is not in {c}'

PREV = {}
MILESTONE_BEFORE = {2: 'y1-checkpoint-a', 5: 'y2-checkpoint-a', 6: 'y2-checkpoint-b', 7: 'y2-exit'}
def song_lesson(song, title, n, slug, step, stage, requires, steps, recap):
    lid = f'{song}-{slug}' if slug else song
    full = f'{title} {n}: {step}' if slug else title
    lesson(lid, full, steps, recap, skills=['songs'])
    # The steps belong to the whole-song node: the songbook lists the song once.
    prev = PREV.get(song)
    # Every step opens with the milestone that ends the stage before it.
    requires = [MILESTONE_BEFORE[stage]] + requires
    node(lid, 'songs', stage, full, list(dict.fromkeys(([prev] if prev else []) + requires)), about=E_ABOUT if song == 'song-canon-easy' else ABOUT, song=song if slug else None)
    PREV[song] = lid
    return lid

# ================================================================ the easy version, in C (stage 2)

E_TITLE = "Pachelbel's Canon, easy"
E_CHORDS = ['C', 'G', 'Am', 'Em', 'F', 'C', 'F', 'G']          # one to a half note
E_TEMPO = 72
E_ABOUT = 'Johann Pachelbel, around 1690 · easy version in C major · our own arrangement'
# The ground: eight bass notes, two to a bar, in one stretched position (fifth finger on E, thumb on C).
E_BASS = 'C3:h G2:h | A2:h E2:h | F2:h C3:h | F2:h G2:h'
E_BASS_F = '1 3 2 5 4 1 4 3'
# The right hand's chords: close shapes that hardly move.
E_HELD = 'C4+E4+G4:h B3+D4+G4:h | C4+E4+A4:h B3+E4+G4:h | C4+F4+A4:h C4+E4+G4:h | C4+F4+A4:h B3+D4+G4:h'
E_HELD_F = '1 1 1 1 1 1 1 1'
# Three lines of tune. Lines 1 and 2 fall by step, one note to each bass note, and move the hand once each;
# line 3 is two quarters to each bass note, in C position.
E_L1 = 'E5:h D5:h | C5:h B4:h | A4:h G4:h | A4:h B4:h'
E_L1_F = '5 4 3 2 1 1 2 3'
E_L2 = 'C5:h B4:h | A4:h G4:h | F4:h E4:h | F4:h D4:h'
E_L2_F = '4 3 2 1 4 3 4 2'
E_L3 = 'C4:q E4:q G4:q F4:q | E4:q C4:q E4:q D4:q | C4:q F4:q E4:q G4:q | F4:q C4:q D4:q G4:q'
E_L3_F = '1 3 5 4 3 1 3 2 1 4 3 5 4 1 2 5'
E_END_R, E_END_L = 'C4+E4+G4:w', 'C3:w'
E_REST = 'r:w | r:w | r:w | r:w'

def e_timed(id, title, right=None, left=None, rf=None, lf=None, **kw):
    if right and left: no_clash(right, left, id)
    if right and left: return timed(id, title, right=right, left=left, rf=rf, lf=lf, display='staff', **kw)
    return timed(id, title, right=right, left=left, fingers=rf or lf, display='staff', **kw)

def easy():
    S_ = 'song-canon-easy'
    for line in (E_L1, E_L2): on_chords(line, E_CHORDS, 2, 'easy line')
    on_chords(E_L3, E_CHORDS, 2, 'easy line 3')
    two = lambda s: bars(s, s)

    # 1 ---------------------------------------------------------------- the bass
    song_lesson(S_, E_TITLE, 1, 'bass', 'the bass that goes round', 2, ['y1-checkpoint-a', 'bass-staff', 'half-and-whole-notes'], [
        S(f"""**Pachelbel's Canon** · Johann Pachelbel, around 1690

        One of the most played pieces of music in the world: at weddings, in films, and under hundreds of pop songs. It
        was written more than 300 years ago for three violins and a bass, and it is built in a very simple way: **eight
        bass notes** that go round and round, while tunes float above them.

        This is the easy version, moved to **C major** so every key is white. Five lessons build it: the bass, the
        chords, the tune, both hands, then the whole piece. Later on there is the real Canon in D, with all its fast
        notes.""",
          staff=staff(E_BASS, clef='bass'), sound=together(bars('r:w | r:w | r:w | r:w', E_L1), bars(E_BASS, E_BASS))),
        S("""**A bass that repeats** is called a **ground bass** (or just a ground). Here it is: C G A E F C F G, two notes
        a bar, four bars, then round again.

        Left hand, fifth finger on the low E, thumb on C. The hand stays still: the fingers do the work. Every note is a
        **half note**: two beats each, "one two, three four".""",
          keys=keys('E2 F2 G2 A2 C3', fingers='5 4 3 2 1'), terms=['ground bass', 'half note'],
          callout='The ground: C G A E F C F G. Fingers 1 3 2 5 4 1 4 3.',
          check=check('How many beats does a half note last in 4/4?', 'Two', ['One', 'Three', 'Four'], 'A half note is half of a whole note: two beats.')),
        X(tap('song-canon-easy-bass-tap', f'{E_TITLE}: the bass rhythm', bars(*[rx('h h')] * 4), tempo=E_TEMPO, reps=2, days=1, display='staff',
              prompt='Two long taps a bar, on beats one and three. Count "one two three four" out loud.')),
        X(ear('song-canon-easy-bass-echo', f'{E_TITLE}: the bass by ear', [
            {'type': 'melody', 'notes': 'C3 G2 A2 E2', 'plays': 3, 'lit': True},
            {'type': 'melody', 'notes': 'F2 C3 F2 G2', 'plays': 3, 'lit': True}], questions=6, reps=2, days=1,
            prompt='Play each half of the bass back after hearing it. The lit keys are the ones it uses.')),
        X(e_timed('song-canon-easy-bass-lh', f'{E_TITLE}: the bass', left=E_BASS, lf=E_BASS_F, tempo=E_TEMPO, reps=3, days=2,
                  prompt='Left hand alone, fingers 1 3 2 5 4 1 4 3. Let every note ring its full two beats.')),
        X(e_timed('song-canon-easy-bass-round', f'{E_TITLE}: round and round', left=two(E_BASS), lf=E_BASS_F + ' ' + E_BASS_F, tempo=E_TEMPO, reps=3, days=2,
                  prompt='The bass twice through, no stop between: the last G leads straight back to C.')),
    ], 'The ground: eight bass notes, C G A E F C F G, round and round.')

    # 2 ---------------------------------------------------------------- the chords
    song_lesson(S_, E_TITLE, 2, 'chords', 'the chords', 2, ['technique-triads-c-f-g', 'chord-symbols', 'ear-major-minor'], [
        S("""**Each bass note has its own chord**: C, G, A minor, E minor, F, C, F, G. As numerals in C major: **I V vi iii IV
        I IV V**. Pop songs have borrowed this order for decades.

        The right hand plays them in **close shapes**: each chord as near to the last one as it can be, so the hand
        hardly moves. Thumb on the lowest note every time.""",
          staff=staff(E_HELD), sound=together(E_HELD, E_BASS),
          terms=['chord', 'major', 'minor', 'I V vi iii IV I IV V']),
        S("""**Major and minor.** C, G and F are major chords: bright. A minor and E minor are minor: softer, darker. Listen
        to how the third chord, A minor, turns the colour down for a moment.""",
          keys=keys('C4 E4 A4', fingers='1 2 5'), sound='C3+C4+E4+G4:h G2+B3+D4+G4:h | A2+C4+E4+A4:h E2+B3+E4+G4:h',
          check=check('Which of these chords is minor?', 'A minor (A C E)', ['C (C E G)', 'G (G B D)', 'F (F A C)'], 'A C E: the A to C is a minor third, so the chord is minor.')),
        X(build_ex('song-canon-easy-build', f'{E_TITLE}: find the chords', [
            {'notes': 'C4 E4 G4', 'ask': 'C: C E G', 'together': True},
            {'notes': 'B3 D4 G4', 'ask': 'G, close to C: B D G', 'together': True},
            {'notes': 'C4 E4 A4', 'ask': 'A minor, close shape: C E A', 'together': True},
            {'notes': 'B3 E4 G4', 'ask': 'E minor, close shape: B E G', 'together': True},
            {'notes': 'C4 F4 A4', 'ask': 'F, close shape: C F A', 'together': True}],
            prompt='Hold each chord down together, right hand.', reps=3, days=1)),
        X(e_timed('song-canon-easy-chords-rh', f'{E_TITLE}: the chords', right=E_HELD, rf=E_HELD_F, tempo=60, reps=3, days=1,
                  prompt='Right hand alone, one chord to each half note. Keep the notes that stay; move only the fingers that must.')),
        X(e_timed('song-canon-easy-chords-both', f'{E_TITLE}: chords over the bass', right=two(E_HELD), left=two(E_BASS),
                  rf=E_HELD_F + ' ' + E_HELD_F, lf=E_BASS_F + ' ' + E_BASS_F, tempo=60, reps=3, days=2,
                  prompt='Both hands together on every half note: bass below, chord above. Twice round.')),
    ], 'Eight chords over the eight bass notes: C G Am Em F C F G.')

    # 3 ---------------------------------------------------------------- the tune
    song_lesson(S_, E_TITLE, 3, 'tune', 'the tune', 2, ['technique-positions-c-g-f', 'steps-and-skips', 'reading-g-and-f-positions'], [
        S("""**The first tune falls by step**: E D C B A G, then turns back up, A B. One note for each bass note, as slow as the
        bass.

        It is a little too wide for one hand position, so the hand **moves once**: fingers 5 4 3 2 1 from the high E down
        to A, then put the **thumb on G** (the hand slides one key down) and play A and B with fingers 2 and 3.""",
          staff=staff(E_L1), keys=keys('A4 B4 C5 D5 E5', fingers='1 2 3 4 5'), sound=bars(E_L1),
          terms=['step', 'hand position', 'shift'], callout='Line 1: E D C B A | G A B. Fingers 5 4 3 2 1 | 1 2 3.'),
        S("""**The second tune** is the same shape, one step lower: C B A G, F E F D. Start with finger 4 on C, so the
        hand sits where line 1 ended. After G (thumb) **lift the hand into C position**: F with finger 4, then E 3, F 4,
        D 2. The half notes give you time to move.

        The **third tune** is two quarter notes to each bass note, all in C position: C E G F, E C E D, C F E G, F C D G.""",
          staff=staff(bars(E_L2, E_L3)), sound=bars(E_L2, E_L3),
          check=check('Line 2 starts on C. Where does it start compared to line 1 (which starts on E)?', 'A third lower', ['A step higher', 'The same note', 'An octave lower'],
                      'E to C, down two letters: a third lower. The shape is the same.')),
        X(ear('song-canon-easy-tune-echo', f'{E_TITLE}: the tune by ear', [
            {'type': 'melody', 'notes': 'E5 D5 C5 B4', 'plays': 3, 'lit': True},
            {'type': 'melody', 'notes': 'A4 G4 A4 B4', 'plays': 3, 'lit': True},
            {'type': 'melody', 'notes': 'C5 B4 A4 G4', 'plays': 3, 'lit': True},
            {'type': 'melody', 'notes': 'C4 E4 G4 F4', 'plays': 3, 'lit': True}], questions=8, reps=2, days=1,
            prompt='Play each piece of the tune back after hearing it. The lit keys are the ones it uses.')),
        X(e_timed('song-canon-easy-line1', f'{E_TITLE}: line 1', right=E_L1, rf=E_L1_F, tempo=E_TEMPO, reps=3, days=1,
                  prompt='Right hand: 5 4 3 2 1 from E to A, then slide the thumb onto G and play A and B with 2 and 3.')),
        X(e_timed('song-canon-easy-line2', f'{E_TITLE}: line 2', right=E_L2, rf=E_L2_F, tempo=E_TEMPO, reps=3, days=1,
                  prompt='4 3 2 1 from C down to G, then lift into C position: F 4, E 3, F 4, D 2.')),
        X(e_timed('song-canon-easy-line3', f'{E_TITLE}: line 3', right=E_L3, rf=E_L3_F, tempo=E_TEMPO, reps=3, days=2,
                  prompt='Quarter notes, all in C position, thumb on C. Two notes to every bass note.')),
    ], 'The tune: two lines that fall by step, then a line in quarters.')

    # 4 ---------------------------------------------------------------- both hands
    song_lesson(S_, E_TITLE, 4, 'hands', 'both hands', 2, ['hands-together-held', 'reading-two-hands-first', 'rhythm-two-hands-different'], [
        S("""**Hands together.** In lines 1 and 2 both hands play at the same moment: every tune note has its bass note. The
        tune falls while the bass jumps around below it.

        In line 3 the right hand plays two notes to each one of the left: "**both**, right, **both**, right". Practise each
        line slowly, then join them.""",
          staff=staff(bars(E_L1, E_L3)), sound=together(bars(E_L1, E_L3), bars(E_BASS, E_BASS)), terms=['hands together']),
        X(e_timed('song-canon-easy-hands1', f'{E_TITLE}: line 1 over the bass', right=E_L1, left=E_BASS, rf=E_L1_F, lf=E_BASS_F,
                  tempo=60, reps=3, days=1, prompt='Both hands on every half note. Watch the right hand\'s move to G in bar 3.')),
        X(e_timed('song-canon-easy-hands2', f'{E_TITLE}: line 2 over the bass', right=E_L2, left=E_BASS, rf=E_L2_F, lf=E_BASS_F,
                  tempo=60, reps=3, days=1, prompt='Both hands. After G, move the right hand into C position while the left plays on.')),
        X(e_timed('song-canon-easy-hands3', f'{E_TITLE}: line 3 over the bass', right=E_L3, left=E_BASS, rf=E_L3_F, lf=E_BASS_F,
                  tempo=60, reps=3, days=2, prompt='Two right-hand notes to each bass note: both, right, both, right.')),
        X(e_timed('song-canon-easy-hands12', f'{E_TITLE}: lines 1 and 2', right=bars(E_L1, E_L2), left=two(E_BASS),
                  rf=E_L1_F + ' ' + E_L2_F, lf=E_BASS_F + ' ' + E_BASS_F, tempo=E_TEMPO, reps=3, days=2,
                  prompt='Line 1 straight into line 2, the bass twice round.')),
    ], 'Both hands: one tune note to each bass note, then two.')

    # 5 ---------------------------------------------------------------- the whole piece
    r = bars(E_REST, E_L1, E_L2, E_L3, E_END_R)
    l = bars(E_BASS, E_BASS, E_BASS, E_BASS, E_END_L)
    rf = ' '.join([E_L1_F, E_L2_F, E_L3_F, '1'])
    lf = ' '.join([E_BASS_F] * 4 + ['1'])
    n = len(r.split('|'))
    song_lesson(S_, E_TITLE, 5, None, None, 2, ['pieces-hands-together', 'rhythm-inner-pulse'], [
        S(f"""**{E_TITLE}**, the whole piece: the bass alone once, as the cello starts the real Canon, then the three
        lines of tune over it, and a C major chord to end. {n} bars, a little over a minute.

        The bass goes round four times without a break. When the tune comes in, keep the bass just as steady.""",
          staff=staff(bars(E_L1)), sound=together(bars(E_L1, E_L2), bars(E_BASS, E_BASS)),
          callout=f'Key: C major · Time: 4/4 · Tempo: {E_TEMPO} · Bass alone, line 1, line 2, line 3, last chord'),
        X(e_timed('song-canon-easy-whole', f'{E_TITLE}, the whole piece', right=r, left=l, rf=rf, lf=lf, tempo=E_TEMPO, reps=3, days=2,
                  prompt='Start to end. Four bars of bass alone, then the right hand comes in. The tempo ladder brings you up to speed.')),
        X(e_timed('song-canon-easy-performance', f'{E_TITLE}: performance', right=r, left=l, rf=rf, lf=lf, tempo=E_TEMPO, ladder=False,
                  reps=2, days=2, prompt='Full tempo, start to end, as if someone is listening. Let the last chord ring.')),
    ], f'{E_TITLE}, start to end: the ground four times, three lines of tune and a last chord.')

# ================================================================ the Canon in D (stages 5–7)

TITLE = 'Canon in D'
KEY, METER, TEMPO = 'D', '4/4', 60
CHORDS = ['D', 'A', 'Bm', 'F#m', 'G', 'D', 'G', 'A']             # one to a quarter note, two bars round
GROUND = ['D3:q A2:q B2:q F#2:q', 'G2:q D2:q G2:q A2:q']
# The ground in eighths: each bass note and the fifth above it.
GROUND8 = ['D2:e A2:e A2:e E3:e B2:e F#3:e F#2:e C#3:e', 'G2:e D3:e D2:e A2:e G2:e D3:e A2:e E3:e']
VAR1 = ['F#5:q E5:q D5:q C#5:q', 'B4:q A4:q B4:q C#5:q']
VAR2 = ['D5:q C#5:q B4:q A4:q', 'G4:q F#4:q G4:q E4:q']
VAR3 = ['D4:e F#4:e A4:e G4:e F#4:e D4:e F#4:e E4:e', 'D4:e B3:e D4:e A4:e G4:e B4:e A4:e G4:e']
VAR5 = ['D5:s C#5:s D5:s D4:s C#4:s A4:s E4:s F#4:s D4:s D5:s C#5:s B4:s C#5:s F#5:s A5:s B5:s',
        'G5:s F#5:s E5:s G5:s F#5:s E5:s D5:s C#5:s B4:s A4:s G4:s F#4:s E4:s G4:s F#4:s E4:s']
SING = ['A5:e F#5:s G5:s A5:e F#5:s G5:s A5:s A4:s B4:s C#5:s D5:s E5:s F#5:s G5:s',
        'F#5:e D5:s E5:s F#5:e F#4:s G4:s A4:s B4:s A4:s G4:s A4:s F#4:s G4:s A4:s',
        'G4:e B4:s A4:s G4:e F#4:s E4:s F#4:s E4:s D4:s E4:s F#4:s G4:s A4:s B4:s',
        'G4:e B4:s A4:s B4:e C#5:s D5:s A4:s B4:s C#5:s D5:s E5:s F#5:s G5:s A5:s']
END_R, END_L = 'A4+D5+F#5:w', 'D2+A2+D3:w'

def g(n, eighths=False):
    """n bars of the ground."""
    src = GROUND8 if eighths else GROUND
    return [src[i % 2] for i in range(n)]

common = dict(meter=METER, key=KEY, display='staff')

def d_timed(id, title, right=None, left=None, **kw):
    if right and left: no_clash(right, left, id)
    return timed(id, title, right=right, left=left, **common, **kw)

def sections(way):
    """(right, left) of the whole piece: the ground alone, the variations, the singing line, the first lines again, a last chord."""
    R = ['r:w', 'r:w'] + VAR1 + VAR2 + VAR3 + VAR5 + SING + VAR1 + VAR2 + [END_R]
    if way == 'full':   # the ground in eighths from the eighth-note variation on
        L = g(6) + g(12, True) + [END_L]
    else:
        L = g(18) + [END_L]
    return bars(*R), bars(*L)

def pedal_line(n_bars):
    """A change with every bass note: four a bar, the last chord held."""
    return ' | '.join(['x:q x:q x:q x:q'] * (n_bars - 1) + ['x:w'])

def full():
    S_ = 'song-canon'
    for v in (VAR1, VAR2): on_chords(bars(*v), CHORDS, 1, 'quarter variation')
    on_chords(bars(*VAR3), CHORDS, 1, 'eighth variation')
    on_chords(bars(*VAR5), CHORDS, 1, 'sixteenth variation')

    # 1 ---------------------------------------------------------------- the ground
    song_lesson(S_, TITLE, 1, 'ground', 'the ground and its chords', 5, ['y2-checkpoint-a', 'piece-canon-theme', 'theory-keys-two-and-three', 'harmony-other-chords'], [
        S(f"""**{TITLE}** · Johann Pachelbel, around 1690

        Written for three violins and a bass (**basso continuo**: cello and harpsichord). The bass plays the same eight
        notes 28 times; the violins play a **canon** above it, the second violin playing exactly what the first played two
        bars earlier, the third two bars after that. The violins' tune changes every two bars: first long notes, then
        quarters, eighths, sixteenths, and back.

        On the piano we play the bass and the top line, in **D major**: two sharps, F♯ and C♯. Six lessons build it: the
        ground, the first lines, the eighths, the sixteenth run, the singing line, then the whole canon.""",
          staff=staff(bars(*GROUND), clef='bass', key=KEY), sound=together(bars('r:w', 'r:w', *VAR1), bars(*g(4)))),
        S("""**The ground**: D A B F♯ G D G A, one quarter note each, two bars. Above every bass note sits a chord: D, A,
        B minor, F♯ minor, G, D, G, A. In numerals **I V vi iii IV I IV V**. The bass falls a fourth, rises a step, and again:
        down four, up two, a pattern you will hear under countless later songs.""",
          staff=staff(bars(*GROUND), clef='bass', key=KEY), sound='D3+F#3+A3+D4:q A2+E3+A3+C#4:q B2+F#3+B3+D4:q F#2+F#3+A3+C#4:q | G2+G3+B3+D4:q D2+F#3+A3+D4:q G2+G3+B3+D4:q A2+E3+A3+C#4:q',
          terms=['ground bass', 'canon', 'basso continuo', 'I V vi iii IV I IV V'],
          callout='D A Bm F♯m G D G A: I V vi iii IV I IV V.',
          check=check('The chord on the third note of D major (F♯ A C♯) is...', 'iii, F♯ minor', ['III, F♯ major', 'vi, B minor', 'V, A major'],
                      'F♯ to A is a minor third: a minor chord on the third degree, iii.')),
        X(ear('song-canon-progression', f'{TITLE}: which progression?', [
            {'type': 'progression', 'key': ['D'], 'pool': ['I V vi iii', 'I vi IV V', 'I V vi IV', 'I IV V I'], 'choices': 4},
            {'type': 'function', 'key': 'D', 'pool': ['I', 'iii', 'vi', 'IV', 'V']}], questions=12, reps=2, days=2,
            prompt='Four chords play: is it the Canon\'s I V vi iii, or another famous one? Then single chords: name them.')),
        X(build_ex('song-canon-build', f'{TITLE}: the chords', [
            {'chord': 'D', 'octave': 4}, {'chord': 'A', 'octave': 3}, {'chord': 'Bm', 'octave': 3}, {'chord': 'F#m', 'octave': 3}, {'chord': 'G', 'octave': 3}],
            prompt='Hold each chord of the ground down together.', reps=3, days=1)),
        X(d_timed('song-canon-ground-lh', f'{TITLE}: the ground', left=bars(*g(4)), tempo=TEMPO, reps=3, days=2,
                  prompt='Left hand, twice round. Even quarters, each note joined to the next; the low D in bar 2 is a jump of a fourth down.')),
    ], 'The ground: D A B F♯ G D G A, I V vi iii IV I IV V, round and round.')

    # 2 ---------------------------------------------------------------- the first lines
    song_lesson(S_, TITLE, 2, 'lines', 'the first lines', 5, ['technique-scales-d-a-one-octave', 'harmony-progressions'], [
        S("""**The first line** is one note to each bass note, falling by step from F♯ to A and back up to C♯. **The second
        line** is the same shape a third lower, from D. In the real Canon, while the first violin plays line 2, the second
        violin plays line 1 under it: the canon.

        Each tune note is a note of the chord above its bass: F♯ over D, E over A, D over B, C♯ over F♯.""",
          staff=staff(bars(*VAR1, *VAR2), key=KEY), sound=together(bars(*VAR1, *VAR2), bars(*g(4))),
          terms=['canon', 'step', 'chord tone']),
        S("""**Hear the canon.** Line 1 alone, then line 2 with line 1 above it, as two violins play it: the
        second violin plays the tune the first one started two bars earlier.""",
          sound=together(bars(*VAR1, *VAR2), bars('r:w', 'r:w', *VAR1)),
          staff=staff(bars(*VAR1, *VAR2), key=KEY),
          check=check('In a canon, the second voice...', 'Plays the same tune, starting later', ['Plays a different tune', 'Plays the bass', 'Plays the same tune at the same time'],
                      'A canon is one tune in several voices, each starting later: like a round.')),
        X(ear('song-canon-lines-echo', f'{TITLE}: the lines by ear', [
            {'type': 'melody', 'notes': 'F#5 E5 D5 C#5', 'plays': 3, 'lit': True},
            {'type': 'melody', 'notes': 'B4 A4 B4 C#5', 'plays': 3, 'lit': True},
            {'type': 'melody', 'notes': 'D5 C#5 B4 A4', 'plays': 3, 'lit': True},
            {'type': 'melody', 'notes': 'G4 F#4 G4 E4', 'plays': 3, 'lit': True}], questions=8, reps=2, days=1,
            prompt='Play each half-line back after hearing it.')),
        X(d_timed('song-canon-lines-rh', f'{TITLE}: lines 1 and 2', right=bars(*VAR1, *VAR2), tempo=TEMPO, reps=3, days=1,
                  prompt='Right hand alone. Line 1 starts with finger 5 on F♯; line 2 with 5 on D.')),
        X(d_timed('song-canon-lines-1', f'{TITLE}: line 1 over the ground', right=bars(*VAR1), left=bars(*g(2)), tempo=TEMPO, reps=3, days=1,
                  prompt='Both hands, note against note. Listen for each tune note sitting on its chord.')),
        X(d_timed('song-canon-lines-both', f'{TITLE}: lines 1 and 2 over the ground', right=bars(*VAR1, *VAR2), left=bars(*g(4)), tempo=TEMPO, reps=3, days=2,
                  prompt='Both lines, the ground twice round. Join them without a gap.')),
    ], 'The first lines: one note to each bass note, falling by step.')

    # 3 ---------------------------------------------------------------- the eighths
    song_lesson(S_, TITLE, 3, 'eighths', 'the eighths', 5, ['rhythm-eighths-two-hands', 'accompaniment-patterns'], [
        S("""**The third line moves in eighths**: two to each bass note, climbing through the chords: D F♯ A G, F♯ D F♯ E,
        D B D A, G B A G. The first eighth of each pair is a chord note; the second leads on.

        From here the **left hand moves too**: each bass note and the fifth above it, in eighths. D A, A E, B F♯, F♯ C♯...
        It makes the ground flow under the faster tune. The low D now starts the bar, an octave lower.""",
          staff=staff(bars(*VAR3), key=KEY), sound=together(bars(*VAR3), bars(*GROUND8)),
          terms=['eighth notes', 'root and fifth']),
        S("""**Root and fifth.** A fifth is five letter names up: D to A, A to E, B to F♯. Fingers 5 and 2 (or 5 and 1 for a
        wide hand), the hand jumping to each new root.""",
          staff=staff(bars(*GROUND8), clef='bass', key=KEY), keys=keys('D2 A2', fingers='5 2'),
          check=check('The fifth above F♯ is...', 'C♯', ['C', 'B', 'D'], 'F♯ G♯ A B C♯: five letters, and in D major C is sharp.')),
        X(d_timed('song-canon-eighths-rh', f'{TITLE}: line 3', right=bars(*VAR3), tempo=TEMPO, reps=3, days=1,
                  prompt='Right hand alone, even eighths. Thumb on D; the B in bar 2 is the thumb tucking under.')),
        X(d_timed('song-canon-eighths-lh', f'{TITLE}: the flowing ground', left=bars(*g(4, True)), tempo=TEMPO, reps=3, days=2,
                  prompt='Left hand: root and fifth in eighths, twice round. Light on the fifths.')),
        X(d_timed('song-canon-eighths-q', f'{TITLE}: line 3 over the ground', right=bars(*VAR3), left=bars(*g(2)), tempo=TEMPO, reps=3, days=1,
                  prompt='Two right-hand notes to every bass note.')),
        X(d_timed('song-canon-eighths-both', f'{TITLE}: eighths in both hands', right=bars(*VAR2, *VAR3), left=bars(*g(2), *g(2, True)), tempo=TEMPO, reps=3, days=2,
                  prompt='Line 2 over the quarter ground, then line 3 with the left hand flowing in eighths.')),
    ], 'Eighths: the tune climbs through the chords, the bass flows root and fifth.')

    # 4 ---------------------------------------------------------------- the sixteenth run
    song_lesson(S_, TITLE, 4, 'run', 'the sixteenth run', 6, ['y2-checkpoint-b', 'sixteenth-notes', 'rhythm-sixteenths-two-hands', 'technique-scales-d-a-one-octave'], [
        S("""**The run**: sixteen sixteenths a bar, four to each bass note. It starts with a turn round D (D C♯ D), drops an
        octave and springs back up, then climbs to the top B; in the second bar it pours down the scale from G to E.

        Practise it in groups of four, one group to a bass note: stop on the first note of each group, then join two
        groups, then all four.""",
          staff=staff(bars(*VAR5), key=KEY), sound=together(bars(*VAR5), bars(*GROUND8)),
          terms=['sixteenth notes', 'groups of four', 'scale run'],
          callout='Four sixteenths to each bass note: "1 e and a, 2 e and a".'),
        X(tap2('song-canon-run-tap', f'{TITLE}: sixteenths over the bass', bars(*[rx('s ' * 16)] * 2), bars(*[rx('q q q q')] * 2), meter=METER, tempo=56,
               reps=2, days=1, display='staff', prompt='Right hand taps four to each beat, left hand one. Keep the four even.')),
        X(d_timed('song-canon-run-rh', f'{TITLE}: the run', right=bars(*VAR5), tempo=48, reps=3, days=2,
                  prompt='Right hand alone, slowly. The fall from G in bar 2 is the D major scale: thumb under on the way down after F♯.')),
        X(d_timed('song-canon-run-both', f'{TITLE}: the run over the ground', right=bars(*VAR5), left=bars(*g(2)), tempo=52, reps=3, days=2,
                  prompt='Both hands: four right-hand notes to each bass note.')),
        X(d_timed('song-canon-run-join', f'{TITLE}: eighths into the run', right=bars(*VAR3, *VAR5), left=bars(*g(4, True)), tempo=TEMPO, reps=3, days=2,
                  prompt='Line 3 into the run, the left hand flowing in eighths. The speed doubles but the beat stays.')),
    ], 'The run: four sixteenths to each bass note, a turn, a leap, a scale.')

    # 5 ---------------------------------------------------------------- the singing line
    song_lesson(S_, TITLE, 5, 'singing', 'the singing line', 6, ['ks-d', 'musician-texture', 'touch-shaping'], [
        S("""**The singing line** is the part everyone hums: "**A**, F♯ G **A**, F♯ G, A A B C♯ D E F♯ G". Each beat is
        an eighth and two sixteenths (long, short short), and then a scale races up or down a whole octave.

        Four bars, each starting with the long-short-short figure. Let the long notes sing and the scales flow into the next
        bar, getting a little louder as they climb.""",
          staff=staff(bars(*SING[:2]), key=KEY), sound=together(bars(*SING), bars(*g(4, True))),
          terms=['eighth and two sixteenths', 'scale', 'phrase']),
        S("""**Long, short short.** An eighth then two sixteenths fills one beat: count it "**1** – and a": the eighth on the beat, the
        sixteenths on "and" and "a". Tap it a few times before you play it: the two sixteenths lead into the next beat.""",
          staff=staff('A5:e F#5:s G5:s A5:e F#5:s G5:s A5:e F#5:s G5:s A5:e F#5:s G5:s', key=KEY),
          check=check('An eighth and two sixteenths together last...', 'One beat (a quarter)', ['Two beats', 'Half a beat', 'Three eighths'],
                      'An eighth is half a beat, each sixteenth a quarter of one: ½ + ¼ + ¼ = 1.')),
        X(tap('song-canon-singing-tap', f'{TITLE}: the singing rhythm', rhythm_of(bars(*SING)), meter=METER, tempo=56, reps=2, days=1, display='staff',
              prompt='The rhythm on any key: long short short, long short short, then eight even sixteenths.')),
        X(d_timed('song-canon-singing-rh', f'{TITLE}: the singing line', right=bars(*SING), tempo=48, reps=3, days=2,
                  prompt='Right hand alone. The scales use the D major fingering: thumb under after C♯ going up, finger 3 over going down.')),
        X(d_timed('song-canon-singing-both', f'{TITLE}: the singing line over the ground', right=bars(*SING), left=bars(*g(4, True)), tempo=54, reps=3, days=2,
                  prompt='Both hands. The left hand keeps flowing root and fifth; the right hand sings over it.')),
    ], 'The singing line: long short short, then a scale up or down an octave.')

    # 6 ---------------------------------------------------------------- the whole canon
    q_r, q_l = sections('quarters')
    f_r, f_l = sections('full')
    no_clash(q_r, q_l, 'canon quarters'); no_clash(f_r, f_l, 'canon full')
    n = len(f_r.split('|'))
    song_lesson(S_, TITLE, 6, None, None, 7, ['y2-exit', 'pedal-legato', 'ear-progressions'], [
        S(f"""**{TITLE}**, the whole canon in our arrangement: the ground alone, then the lines in quarters, eighths and
        sixteenths, the singing line, the first lines again and a D major chord. {n} bars, a little over a minute.

        Two versions: first with the ground in quarters all the way, then with the left hand flowing in eighths from line
        3 on. The last take adds the pedal: change it with every bass note, just after the note sounds.""",
          staff=staff(bars(*GROUND), clef='bass', key=KEY), sound=together(bars(*VAR1, *VAR2), bars(*g(4))),
          callout=f'Key: D major · Time: 4/4 · Tempo: {TEMPO} · Ground, lines 1–3, the run, the singing line, lines 1–2, last chord'),
        X(d_timed('song-canon-whole-quarters', f'{TITLE}, over the quarter ground', right=q_r, left=q_l, tempo=54, reps=2, days=2,
                  prompt='The whole canon with the ground in quarters all the way: the map of the piece under your fingers.')),
        X(d_timed('song-canon-whole-full', f'{TITLE}, full arrangement', right=f_r, left=f_l, tempo=TEMPO, reps=3, days=2,
                  prompt='The full arrangement: the left hand flows in eighths from line 3 on. The tempo ladder brings you up to speed.')),
        X(d_timed('song-canon-performance', f'{TITLE}: performance', right=f_r, left=f_l, tempo=TEMPO, ladder=False, reps=2, days=2,
                  pedal=pedal_line(n), prompt='Full tempo with the pedal, a change on every bass note, start to end.')),
    ], f'{TITLE}, start to end: the ground, every line, and a pedalled performance.')

def run(base):
    easy()
    full()
