# "Can't Help Falling in Love" (Elvis Presley, 1961): a ladder of seven song lessons from the tune to the
# whole song. The song is not public domain (its tune comes from Martini's "Plaisir d'amour", 1784, which
# is); added at the owner's explicit request (CLAUDE.md, 2026-10-24). Our own arrangement in D major (Elvis's
# key), 6/8, melody checked against published letter notes and chord charts. No lyrics.
# Runs after the older generators so their lesson files keep their numbers.
from lib import *

TITLE = "Can't Help Falling in Love"
ABOUT = 'Elvis Presley, 1961 · tune from "Plaisir d\'amour" (Martini, 1784) · our own arrangement'
KEY, METER, TEMPO = 'D', '6/8', 66          # tempo counts the dotted quarter: two to a bar

# ---------------------------------------------------------------- the tune, section by section (one bar of 6/8 each)

VERSE = ['C4:h.', 'G4:h.', 'C4:h.~', 'C4:q. r:e D4:e E4:e',
         'F4:h.', 'E4:h.', 'D4:h.~', 'D4:q. r:q G3:e',
         'A3:h.', 'B3:h.', 'C4:h.', 'D4:q E4:e F4:q.',
         'E4:h.', 'D4:h.', 'C4:h.', 'r:h.']
VERSE_CHORDS = ['C', 'Em', 'Am', 'Am', 'F', 'C', 'G', 'G', 'F', 'G', 'Am', 'F', 'C', 'G', 'C', 'C']
FLOWS = ['B3:e E4:e G4:e B4:q.', 'A4:h.']
BRIDGE = FLOWS * 3 + ['G4:q. G4:q.', 'E4:q G4:e E4:q.', 'F4:h.~', 'F4:q. r:q.']
BRIDGE_CHORDS = ['Em', 'B7', 'Em', 'B7', 'Em', 'B7', 'Em', 'A7', 'Dm', 'G7']
# The last verse leads into the closing line once more, with a long last note.
LAST_VERSE = VERSE[:15] + ['r:q. r:q G3:e']
LAST_CHORDS = VERSE_CHORDS[:15] + ['G7']
TAG = VERSE[8:14] + ['C4:h.~', 'C4:h.']
TAG_CHORDS = VERSE_CHORDS[8:14] + ['C', 'C']

# ---------------------------------------------------------------- the left hand, three ways (kept under the tune's G3)

ROOT = {'C': 'C3', 'Em': 'E3', 'Am': 'A2', 'F': 'F2', 'G': 'G2', 'B7': 'B2', 'A7': 'A2', 'Dm': 'D3', 'G7': 'G2'}
BASS = {'C': 'C2', 'Em': 'E2', 'Am': 'A2', 'F': 'F2', 'G': 'G2', 'B7': 'B2', 'A7': 'A2', 'Dm': 'D2', 'G7': 'G2'}
CHORD = {'C': 'G2+C3+E3', 'Em': 'G2+B2+E3', 'Am': 'C3+E3+A3', 'F': 'A2+C3+F3', 'G': 'B2+D3', 'B7': 'D#3+F#3+A3',
         'A7': 'C#3+E3+G3', 'Dm': 'A2+D3+F3', 'G7': 'B2+D3+F3'}
FIFTH = {'C': 'G2', 'Em': 'B2', 'Am': 'E3', 'F': 'C3', 'G': 'D3', 'B7': 'F#3', 'A7': 'E3', 'Dm': 'A2', 'G7': 'D3'}
# Six eighths a bar: root, fifth, then the chord's colour note (third or octave) and back down.
ARP = {'C': 'C2 G2 E3 G2 C3 G2', 'Em': 'E2 B2 G3 B2 E3 B2', 'Am': 'A2 E3 C3 E3 A3 E3', 'F': 'F2 C3 F3 C3 A2 C3',
       'G': 'G2 D3 G3 D3 B2 D3', 'B7': 'B2 F#3 A3 F#3 D#3 F#3', 'A7': 'A2 E3 G3 E3 C#3 E3', 'Dm': 'D2 A2 F3 A2 D3 A2',
       'G7': 'G2 D3 F3 D3 B2 D3'}

# Written above in C, played in D (Ignas: "do it in D major key", as Elvis sings it): everything moves up a
# whole step, so the left hand still stays clear of the tune.
NAME = {'C': 'D', 'Em': 'F#m', 'Am': 'Bm', 'F': 'G', 'G': 'A', 'B7': 'C#7', 'A7': 'B7', 'Dm': 'Em', 'G7': 'A7'}
T = lambda s: transpose_string(s, 1, 2)
TP = lambda s: ' '.join(transpose(x, 1, 2) for x in s.split())
TC = lambda s: '+'.join(transpose(x, 1, 2) for x in s.split('+'))
VERSE, BRIDGE, LAST_VERSE, TAG, FLOWS = ([T(b) for b in x] for x in (VERSE, BRIDGE, LAST_VERSE, TAG, FLOWS))
VERSE_CHORDS, BRIDGE_CHORDS, LAST_CHORDS, TAG_CHORDS = ([NAME[c] for c in x] for x in (VERSE_CHORDS, BRIDGE_CHORDS, LAST_CHORDS, TAG_CHORDS))
ROOT, BASS, FIFTH = ({NAME[k]: transpose(v, 1, 2) for k, v in d.items()} for d in (ROOT, BASS, FIFTH))
CHORD = {NAME[k]: TC(v) for k, v in CHORD.items()}
ARP = {NAME[k]: TP(v) for k, v in ARP.items()}

def bars(*parts): return ' | '.join(parts)

def lh(chords, way, last=None):
    """A left hand for these chords: roots, held (chords), fifths, bass (bass + chord), full (rolling eighths)."""
    out = []
    for c in chords:
        if way == 'roots': out.append(f'{ROOT[c]}:h.')
        elif way == 'held': out.append(f'{CHORD[c]}:h.')
        elif way == 'fifths': out.append(f'{BASS[c]}:q. {FIFTH[c]}:q.')
        elif way == 'bass': out.append(f'{BASS[c]}:q. {CHORD[c]}:q.')
        elif way == 'full': out.append(' '.join(f'{n}:e' for n in ARP[c].split()))
    if last: out[-1] = last
    return bars(*out)

FINAL = 'D2+A2+D3+F#3:h.'

def sections(way):
    """(right, left) of the whole song: verse, verse, bridge, last verse, closing line (66 bars)."""
    R = VERSE + VERSE + BRIDGE + LAST_VERSE + TAG
    if way == 'full':
        # The rolling left hand from the second verse on; the first verse keeps bass and chord.
        L = [lh(VERSE_CHORDS, 'bass'), lh(VERSE_CHORDS, 'full'), lh(BRIDGE_CHORDS, 'full'), lh(LAST_CHORDS, 'full'),
             lh(TAG_CHORDS[:-2], 'full'), lh(['D'], 'full'), FINAL]
    else:
        L = [lh(VERSE_CHORDS, way), lh(VERSE_CHORDS, way), lh(BRIDGE_CHORDS, way), lh(LAST_CHORDS, way), lh(TAG_CHORDS, way)]
    return bars(*R), ' | '.join(L)

def pedal_line(n_bars):
    """A change with every chord: every bar."""
    return ' | '.join('x:h.' for _ in range(n_bars))

def no_clash(right, left, where):
    """No key is held by both hands at once."""
    def spans(s):
        out, t = [], 0.0
        for b in tokens(s):
            for p, d, _ in b:
                v = dur_value(d)
                if p != 'r':
                    for x in p.split('+'): out.append((midi(x), t, t + v))
                t += v
        return out
    L = spans(left)
    for m, a, b in spans(right):
        for m2, a2, b2 in L:
            assert not (m == m2 and a < b2 and a2 < b), f'{where}: both hands on {m} at {a}'

# ---------------------------------------------------------------- lessons

PREV = None
def song_lesson(n, slug, title, stage, requires, steps, recap):
    global PREV
    lid = f'song-chfl-{slug}' if slug else 'song-chfl'
    full = f'{TITLE} {n}: {title}' if slug else TITLE
    lesson(lid, full, steps, recap, skills=['songs'])
    # The steps belong to the whole-song node (song-chfl): the songbook lists the song once.
    node(lid, 'songs', stage, full, list(dict.fromkeys(([PREV] if PREV else []) + requires)), about=ABOUT, song='song-chfl' if slug else None)
    PREV = lid
    return lid

common = dict(meter=METER, key=KEY, display='staff')

def song_timed(id, title, right=None, left=None, **kw):
    if right and left: no_clash(right, left, id)
    return timed(id, title, right=right, left=left, **common, **kw)

def rhythm_of(bar_list):
    """The tune's rhythm for tapping: every note an x, rests kept, ties merged into one tap."""
    out = []
    for b in tokens(bars(*bar_list)):
        toks = []
        for p, d, tie in b:
            toks.append(('r:' if p == 'r' else 'x:') + d + ('~' if tie else ''))
        out.append(' '.join(toks))
    s = ' | '.join(out)
    # A tied x continues into the next bar: write it as a rest there, so only the first part is tapped.
    bl = s.split(' | ')
    for i in range(1, len(bl)):
        if bl[i - 1].endswith('~'):
            bl[i - 1] = bl[i - 1][:-1]
            first, *rest = bl[i].split(' ')
            bl[i] = ' '.join(['r:' + first.split(':')[1]] + rest)
    return ' | '.join(bl)

def run(base):
    pulse = lambda n: bars(*[rx('q. q.')] * n)

    # 1 ---------------------------------------------------------------- the tune
    song_lesson(1, 'tune', 'the tune', 6, ['y2-checkpoint-b', 'ks-d', 'rhythm-six-eight', 'theory-compound-time'], [
        S(f"""**{TITLE}** · Elvis Presley, 1961

        One of the best-loved slow songs ever recorded. Its tune is much older: it is a reworking of **"Plaisir
        d'amour"**, a French love song by Jean-Paul-Égide Martini from 1784. Seven lessons build it up: the tune, the
        chords, the verse with both hands, the middle section, the rolling left hand, the ending and the pedal, then
        the whole song.

        The song itself is still under copyright, so it is in the songbook because you asked for it. The arrangement
        here is our own, in **D major**, the key Elvis sings it in: two sharps, F♯ and C♯.""",
          staff=staff(bars(*VERSE[:4]), key=KEY), sound=bars(*VERSE[:8])),
        S("""**Two slow beats in a bar.** The song is in **6/8**: six eighths a bar, felt as two big beats of three,
        "**1** 2 3 **4** 5 6". Most notes of the tune last a whole bar, so you hear a long note on every bar line, and
        the music sways like a slow dance.

        Count it in big beats: "**one** and a **two** and a". A note that fills the bar is a dotted half: two big
        beats.""",
          staff=staff(T('C4:h. | G4:h. | C4:q. r:e D4:e E4:e | F4:h.'), key=KEY), terms=['6/8', 'compound time', 'dotted half'],
          callout='6/8 = two beats of three eighths. Most of the tune: one long note a bar.',
          check=check('How many eighths fill a bar of 6/8?', 'Six', ['Three', 'Four', 'Eight'], 'Six eighths, in two groups of three.')),
        S("""**The shape of the tune.** It starts on the D above middle C, leaps up a fifth to A and comes back.
        Then it climbs by step and falls again: E F♯ **G** F♯ E. The third line starts low, on the A below middle C,
        and walks up the scale to D, then circles round to land home on D.

        Two short notes before a long one are a **pickup** into the next bar: lean through them, don't stop on them.""",
          keys=keys(TP('G3 A3 B3 C4 D4 E4 F4 G4'), labels='names'), terms=['leap', 'step', 'pickup'],
          check=check('The tune starts on D and then jumps to A. How far is that?', 'A fifth', ['A third', 'An octave', 'A fourth'],
                      'D E F♯ G A: five letters, a fifth.')),
        X(tap('song-chfl-tune-tap', f'{TITLE}: tap the tune', rhythm_of(VERSE), meter=METER, tempo=60, reps=2, days=1, display='staff',
              prompt='The verse\'s rhythm on any key: mostly one long tap a bar. Count "one and a two and a" and let the pickups lead on.')),
        X(tap2('song-chfl-tune-tap-hands', f'{TITLE}: tune over the beat', rhythm_of(VERSE), pulse(16), meter=METER, tempo=60,
               reps=2, days=1, display='staff', prompt='Left hand taps the two big beats of every bar; right hand taps the tune.')),
        X(ear('song-chfl-tune-echo', f'{TITLE}: the tune by ear', [
            {'type': 'melody', 'notes': TP('C4 G4 C4'), 'plays': 3, 'lit': True},
            {'type': 'melody', 'notes': TP('D4 E4 F4 E4 D4'), 'plays': 3, 'lit': True},
            {'type': 'melody', 'notes': TP('G3 A3 B3 C4'), 'plays': 3, 'lit': True},
            {'type': 'melody', 'notes': TP('D4 E4 F4 E4 D4 C4'), 'plays': 3}], questions=8, reps=2, days=1,
            prompt='Play each phrase of the tune back after hearing it. The lit keys are the ones it uses.')),
        X(song_timed('song-chfl-tune-rh', f'{TITLE}: the tune', right=bars(*VERSE), tempo=60, reps=3, days=2,
                     prompt='Right hand alone. Thumb on D; for the low A, B, C♯ the thumb starts on A, and the hand walks up to D.')),
        X(song_timed('song-chfl-tune-roots', f'{TITLE}: tune over bass notes', right=bars(*VERSE), left=lh(VERSE_CHORDS, 'roots'),
                     tempo=60, reps=3, days=2, prompt='Both hands, the easy way: one low note a bar under the tune, both hands on the bar line.')),
    ], 'The tune: two slow beats a bar in 6/8, from D up a fifth and home again.')

    # 2 ---------------------------------------------------------------- the chords
    song_lesson(2, 'chords', 'the chords', 6, ['y2-checkpoint-b', 'harmony-other-chords', 'ear-function-six-chords', 'harmony-progressions'], [
        S("""The verse uses five chords of D major, one to a bar: **D**, **F♯ minor**, **B minor**, **G** and **A**.

        As numerals: **I**, **iii**, **vi**, **IV** and **V**. The first line goes I – iii – vi: each chord shares two
        notes with the one before, so the harmony glides down in thirds while the tune leaps up and back.""",
          staff=staff(T('C4+E4+G4:h. | B3+E4+G4:h. | A3+C4+E4:h. | A3+C4+F4:h. | B3+D4+G4:h.'), key=KEY),
          sound=T('C3+C4+E4+G4:h. | E3+B3+E4+G4:h. | A2+A3+C4+E4:h. | F2+A3+C4+F4:h. | G2+B3+D4+G4:h.'),
          terms=['I', 'iii', 'vi', 'IV', 'V'], callout='D – F♯m – Bm – G – A: I – iii – vi – IV – V.'),
        S("""**Why minor chords in a major key?** Build a chord on every note of D major and three come out minor:
        E minor (ii), F♯ minor (iii) and B minor (vi). B minor is D major's **relative minor**, which is why the song turns
        tender after the leap: the harmony slips from D to its minor relative.""",
          keys=keys(TP('A3 C4 E4'), labels='names'), sound=T('C3+C4+E4+G4:h. A2+A3+C4+E4:h.'),
          check=check('Which chord is vi in D major?', 'B minor', ['B major', 'F♯ minor', 'G major'], 'The sixth note of D major is B, and the chord on it (B D F♯) is minor.')),
        S("""**Each line ends on V or I.** Line one ends on Bm (with a pickup), line two lands on **A**, the dominant, and
        waits; line three climbs over G, A and Bm; the last line is D – A – D: home, away, home. Hear how the A chord
        asks a question and the D answers it.""",
          sound=T('F2+A3+C4+F4:h. | G2+B3+D4+G4:h. | A2+A3+C4+E4:h. | F2+A3+C4+F4:h. | C3+C4+E4+G4:h. | G2+B3+D4+G4:h. | C3+C4+E4+G4:h.'),
          check=check('The chord on the fifth note of the key, A in D major, is called...', 'The dominant (V)', ['The tonic (I)', 'The subdominant (IV)', 'The relative minor (vi)'],
                      'V is the dominant: it pulls back to I.')),
        X(build_ex('song-chfl-chords-build', f'{TITLE}: find the chords', [
            {'chord': 'D', 'octave': 3}, {'chord': 'F#m', 'octave': 3}, {'chord': 'Bm', 'octave': 3}, {'chord': 'G', 'octave': 3}, {'chord': 'A', 'octave': 3},
            {'notes': 'A2 D3 F#3', 'ask': 'D, the way the left hand plays it: A D F♯', 'together': True},
            {'notes': 'A2 C#3 F#3', 'ask': 'F♯ minor, the way the left hand plays it: A C♯ F♯', 'together': True}],
            prompt='Hold each chord down together.', reps=3, days=1)),
        X(ear('song-chfl-chords-ear', f'{TITLE}: which progression?', [
            {'type': 'progression', 'key': ['D'], 'pool': ['I iii vi IV', 'I vi IV V', 'I V vi IV', 'I IV V I'], 'choices': 4},
            {'type': 'function', 'key': 'D', 'pool': ['I', 'iii', 'vi', 'IV', 'V']}], questions=12, reps=2, days=2,
            prompt='Four chords play: is it the song\'s I iii vi IV, or another famous one? Then single chords: name them.')),
        X(song_timed('song-chfl-chords-held', f'{TITLE}: held chords', left=lh(VERSE_CHORDS, 'held'), tempo=56, reps=2, days=1,
                     prompt='Left hand: the verse\'s chords, one a bar. Keep the notes that stay, move only the fingers that must.')),
        X(song_timed('song-chfl-chords-pattern', f'{TITLE}: bass and chord', left=lh(VERSE_CHORDS, 'bass'), tempo=56, reps=3, days=2,
                     prompt='The verse\'s left hand: a low bass note on beat one, the chord on beat two. Look ahead to the next bass.')),
    ], 'Five chords, one a bar: D, F♯m, Bm, G, A. I iii vi IV V, gliding down in thirds.')

    # 3 ---------------------------------------------------------------- the verse
    song_lesson(3, 'verse', 'the verse, both hands', 6, ['y2-checkpoint-b', 'rhythm-six-eight-hands', 'accompaniment-patterns'], [
        S("""**Bass and chord.** The left hand plays the bass on the first big beat and the chord on the second: "**low**
        – chord, **low** – chord", like a slow waltz with two steps. The right hand's long notes sit on top and ring
        over both.

        The tune's pickups (two eighths, or one) come at the end of a bar while the left hand holds its chord: let the
        right hand move alone there.""",
          staff=staff(lh(VERSE_CHORDS[:4], 'bass'), clef='bass', key=KEY), sound=bars(*VERSE[:4]),
          terms=['bass and chord', 'accompaniment']),
        S("""**Ties.** In bars 3 and 7 the tune's note is held across the bar line and the pickup comes after it. A tie
        joins two notes of the same pitch into one: press once, keep holding.""",
          staff=staff(T('C4:h.~ | C4:q. r:e D4:e E4:e'), key=KEY),
          check=check('Two notes of the same pitch joined by a curve across a bar line are...', 'Tied: play once, hold for both', ['Slurred: play both smoothly', 'Repeated', 'Accented'],
                      'A tie adds the second note\'s length to the first.')),
        X(song_timed('song-chfl-verse-lh', f'{TITLE}: verse left hand', left=lh(VERSE_CHORDS, 'bass'), tempo=58, reps=2, days=1,
                     prompt='Left hand alone, bass and chord through the verse. Quiet chords, a slightly firmer bass.')),
        X(song_timed('song-chfl-verse-half', f'{TITLE}: the first half', right=bars(*VERSE[:8]), left=lh(VERSE_CHORDS[:8], 'bass'),
                     tempo=56, reps=3, days=2, prompt='Both hands, first half of the verse. Both hands together on beat one; the right hand holds while the left plays the chord.')),
        X(song_timed('song-chfl-verse', f'{TITLE}: the verse', right=bars(*VERSE), left=lh(VERSE_CHORDS, 'bass'), tempo=60, reps=3, days=2,
                     prompt='The whole verse, both hands. Keep the tune singing above the chords.')),
        X(song_timed('song-chfl-two-verses', f'{TITLE}: two verses', right=bars(*VERSE, *VERSE), left=bars(lh(VERSE_CHORDS, 'bass'), lh(VERSE_CHORDS, 'bass')),
                     tempo=60, reps=2, days=2, prompt='The verse twice, as in the song. No stop between them: the rest bar is your breath.')),
    ], 'The verse with both hands: bass on beat one, chord on beat two, the tune long above.')

    # 4 ---------------------------------------------------------------- the bridge
    song_lesson(4, 'bridge', 'the middle section', 7, ['song-chfl-verse', 'y2-exit', 'ks-b-minor', 'dominant-seventh-theory'], [
        S("""**The middle section** (the bridge) changes colour: it moves to **F♯ minor** and keeps swinging between F♯ minor
        and **C♯7**. A short phrase climbs C♯ F♯ A C♯ and comes to rest on B, over and over, like waves.

        Then one longer phrase walks back to D major through **B7**, **E minor** and **A7**.""",
          staff=staff(bars(*FLOWS, *FLOWS), key=KEY), sound=bars(*BRIDGE[:6]), terms=['bridge', 'F♯ minor', 'C♯7']),
        S("""**Where does C♯7 come from?** C♯7 is the dominant seventh of F♯ minor: C♯ E♯ G♯ B. The **E♯** (the white key
        F) is not in D major; it is F♯ minor's leading note, pulling up to F♯. Borrowing another key's V like this is
        called a **secondary dominant**: for a moment, F♯ minor sounds like home.

        B7 does the same for E minor (its D♯ pulls to E), and A7 brings us back to D.""",
          keys=keys('C#3 E#3 G#3 B3', labels='names'), sound=T('B2+D#3+F#3+A3:h. | E2+G3+B3+E4:h. | A2+C#3+E3+G3:h. | D3+F3+A3+D4:h. | G2+B2+D3+F3:h. | C3+C4+E4+G4:h.'),
          callout='F♯m – C♯7 three times, then F♯m B7 Em A7 back to D. C♯7 = V7 of F♯ minor.',
          check=check('Which note in C♯7 is not in D major?', 'E♯', ['C♯', 'G♯ only', 'B'], 'C♯7 is C♯ E♯ G♯ B: E♯ and G♯ are foreign; E♯ is the one that pulls up to F♯.')),
        X(build_ex('song-chfl-bridge-build', f'{TITLE}: the bridge chords', [
            {'chord': 'F#m', 'octave': 3},
            {'notes': 'C#3 E#3 G#3 B3', 'ask': 'C♯7: C♯ E♯ G♯ B (E♯ is the white key F)', 'together': True},
            {'notes': 'B2 D#3 F#3 A3', 'ask': 'B7: B D♯ F♯ A', 'together': True},
            {'chord': 'Em', 'octave': 3},
            {'notes': 'A2 C#3 E3 G3', 'ask': 'A7: A C♯ E G', 'together': True}],
            prompt='Hold each chord down together. Sevenths have four notes.', reps=3, days=1)),
        X(tap('song-chfl-bridge-tap', f'{TITLE}: tap the bridge', rhythm_of(BRIDGE), meter=METER, tempo=60, reps=2, days=1, display='staff',
              prompt='Three quick eighths and a long note, then a long one: the waves. Then the longer way home.')),
        X(song_timed('song-chfl-bridge-rh', f'{TITLE}: the bridge tune', right=bars(*BRIDGE), tempo=56, reps=3, days=2,
                     prompt='Right hand alone. Thumb on C♯, then 2 on F♯, 3 on A, 5 on C♯, and 4 on B to rest.')),
        X(song_timed('song-chfl-bridge-lh', f'{TITLE}: bridge left hand', left=lh(BRIDGE_CHORDS, 'bass'), tempo=56, reps=2, days=1,
                     prompt='Left hand: bass and chord through F♯m, C♯7, B7, Em, A7. Watch for E♯ (the white key F) and D♯.')),
        X(song_timed('song-chfl-bridge', f'{TITLE}: the bridge', right=bars(*BRIDGE), left=lh(BRIDGE_CHORDS, 'bass'), tempo=58, reps=3, days=2,
                     prompt='Both hands. The waves grow a little each time, then let the last phrase settle.')),
        X(song_timed('song-chfl-into-bridge', f'{TITLE}: verse into bridge and back', right=bars(*VERSE[8:], *BRIDGE, *VERSE[:4]),
                     left=bars(lh(VERSE_CHORDS[8:], 'bass'), lh(BRIDGE_CHORDS, 'bass'), lh(VERSE_CHORDS[:4], 'bass')),
                     tempo=58, reps=3, days=2, prompt='The joins: the end of a verse into the bridge, and the bridge back into the verse.')),
    ], 'The bridge: waves of F♯ minor and C♯7, its dominant, then B7, Em and A7 lead home.')

    # 5 ---------------------------------------------------------------- the rolling left hand
    song_lesson(5, 'arpeggios', 'the rolling left hand', 7, ['y2-exit', 'technique-arpeggios-one-octave', 'piece-etude-six-eight'], [
        S("""From the second verse the left hand **rolls**: six eighths a bar, root and fifth, up to the chord's third or
        octave and back down. It turns each long note of the tune into a gently rocking boat.

        Learn the jumps first with only root and fifth on the two big beats, then fill in the roll.""",
          staff=staff(lh(VERSE_CHORDS[:4], 'full'), clef='bass', key=KEY), sound=bars(*VERSE[:4]),
          keys=keys('D2 A2 F#3', fingers='5 2 1'), terms=['broken chord', 'arpeggio', 'tenth'],
          callout='D: D A F♯ A D A. Fingers 5 2 1 2 1 2, the hand open, wrist loose.'),
        S("""Over D the roll reaches up to F♯, a **tenth** above the root (an octave and a third). Over other chords it
        reaches the octave, so the left hand stays clear of the tune's low notes.""",
          check=check('D2 to F♯3 is...', 'A tenth (an octave and a third)', ['An octave', 'A sixth', 'A fifth'], 'D to F♯ is a third; an octave higher it is a tenth.')),
        X(song_timed('song-chfl-fifths', f'{TITLE}: roots and fifths', left=lh(VERSE_CHORDS, 'fifths'), tempo=56, reps=2, days=1,
                     prompt='Left hand: root on beat one, fifth on beat two, through the verse. Fingers 5 and 2.')),
        X(song_timed('song-chfl-arp-lh', f'{TITLE}: the rolling left hand', left=lh(VERSE_CHORDS, 'full'), tempo=54, reps=3, days=2,
                     prompt='The full roll, six even eighths a bar. Softer than the tune will be.')),
        X(tap2('song-chfl-arp-tap', f'{TITLE}: tune over eighths', rhythm_of(VERSE), bars(*[rx('e e e e e e')] * 16), meter=METER, tempo=56,
               reps=2, days=1, display='staff', prompt='Both rhythms on any keys: the tune on top, six steady eighths below.')),
        X(song_timed('song-chfl-verse2', f'{TITLE}: the second verse', right=bars(*VERSE), left=lh(VERSE_CHORDS, 'full'), tempo=56, reps=3, days=2,
                     prompt='The tune over the rolling left hand. Every right-hand note lands with an eighth of the left.')),
        X(song_timed('song-chfl-bridge-arp', f'{TITLE}: bridge over the roll', right=bars(*BRIDGE), left=lh(BRIDGE_CHORDS, 'full'), tempo=56, reps=3, days=2,
                     prompt='The bridge over the roll. In the waves both hands move in eighths: listen that they meet.')),
    ], 'The rolling left hand: six eighths a bar, root, fifth, up and back.')

    # 6 ---------------------------------------------------------------- the ending and the pedal
    tag_l = bars(lh(TAG_CHORDS[:-2], 'full'), lh(['D'], 'full'), FINAL)
    song_lesson(6, 'ending', 'the ending and the pedal', 7, ['y2-exit', 'pedal-legato', 'rhythm-compound-meters'], [
        S("""**The ending.** After the last verse the closing line comes once more, from the low A pickup up to D, and the
        last D is held for two bars over a full D chord.

        **The pedal** makes the rolling left hand ring like one chord. Change it on every bar line: up just as the new bass
        note sounds, down again straight after. Never hold it from one chord into the next.""",
          staff=staff(bars(*TAG), key=KEY), sound=bars(*TAG), terms=['legato pedal', 'pedal change', 'coda'],
          callout='Pedal: change on every bar, after the new bass note.'),
        X(song_timed('song-chfl-pedal-chords', f'{TITLE}: pedal on the chords', left=lh(VERSE_CHORDS, 'full'), tempo=54, reps=2, days=1,
                     pedal=pedal_line(16), prompt='Left hand roll with the pedal, a change every bar. Listen: clear, never blurred.')),
        X(song_timed('song-chfl-ending', f'{TITLE}: the closing line', right=bars(LAST_VERSE[-1], *TAG), left=bars(lh(['A7'], 'full'), tag_l),
                     tempo=56, reps=3, days=2, pedal=pedal_line(len(TAG) + 1),
                     prompt='The last line again and the long final D. Let it ring to the very end of the bar.')),
        X(song_timed('song-chfl-last-verse', f'{TITLE}: last verse to the end', right=bars(*LAST_VERSE, *TAG),
                     left=bars(lh(LAST_CHORDS, 'full'), tag_l), tempo=58, reps=3, days=2, pedal=pedal_line(len(LAST_VERSE) + len(TAG)),
                     prompt='The last verse and the ending, with the pedal.')),
    ], 'The ending: the closing line again and a long D. Pedal changes on every bar.')

    # 7 ---------------------------------------------------------------- the whole song
    easy_r, easy_l = sections('roots')
    mid_r, mid_l = sections('bass')
    full_r, full_l = sections('full')
    for r, l, w in ((easy_r, easy_l, 'easy'), (mid_r, mid_l, 'mid'), (full_r, full_l, 'full')): no_clash(r, l, w)
    n = len(full_r.split('|'))
    song_lesson(7, None, None, 8, ['m7-flat-keys', 'harmony-secondary-dominants', 'ear-progressions'], [
        S(f"""**{TITLE}**, the whole song: verse, verse, bridge, last verse and the closing line. {n} bars of 6/8, about
        two minutes.

        Three versions, easiest first: the tune over bass notes, then over bass and chord, then the full arrangement
        with the rolling left hand from the second verse on. The last take adds the pedal.""",
          staff=staff(bars(*VERSE[:4]), key=KEY), sound=bars(*VERSE[:8]),
          callout=f'Key: D major · Time: 6/8 · Tempo: {TEMPO} (dotted quarter) · Form: verse, verse, bridge, verse, ending'),
        X(timed('song-chfl-easy', f'{TITLE}, easy version', right=easy_r, left=easy_l, tempo=56, reps=2, days=1,
                prompt='The whole tune over one bass note a bar: the map of the song under your fingers.', **common)),
        X(timed('song-chfl-medium', f'{TITLE}, with bass and chord', right=mid_r, left=mid_l, tempo=60, reps=2, days=2,
                prompt='The whole song with bass and chord in the left hand.', **common)),
        X(timed('song-chfl-full', f'{TITLE}, full arrangement', right=full_r, left=full_l, tempo=TEMPO, reps=3, days=2,
                prompt='The full arrangement: the rolling left hand from the second verse on. The tempo ladder brings you up to speed.', **common)),
        X(timed('song-chfl-performance', f'{TITLE}: performance', right=full_r, left=full_l, tempo=TEMPO, ladder=False, reps=2, days=2,
                pedal=pedal_line(n), prompt='Full tempo with the pedal, start to end, as if someone is listening.', **common)),
    ], f'{TITLE}, start to end: three versions and a pedalled performance.')
