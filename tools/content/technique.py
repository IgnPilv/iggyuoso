# The technique branch: hands together from the first week, then every position, chord, scale and
# arpeggio in every key. Most exercises come in families written by the same function for each key,
# so the fingering and the shape stay the same while the keys change.
from lib import *

def L(id, stage, title, requires, steps, recap, type='lesson'):
    lesson(id, title, steps, recap, skills=['technique'])
    node(id, 'technique', stage, title, requires, type=type)

def kind_of(k): return 'minor' if k.endswith('m') else 'major'
def name_of(k): return k.replace('b', '♭').replace('#', '♯')[:-1] + ' minor' if k.endswith('m') else k.replace('b', '♭').replace('#', '♯') + ' major'
def slug(k):
    acc = {'#': '-sharp', 'b': '-flat'}.get(k[1:2], '')
    return k[0].lower() + acc + ('-minor' if k.endswith('m') else '')

def d(k, n, octave):
    """Scale degree n of key k, tonic in `octave` (natural minor for degrees, raised 7 handled by callers)."""
    return degree(tonic_note(k, octave), kind_of(k), n)

def q(*notes, dur='q'): return ' '.join(f'{n}:{dur}' for n in notes)

# ---------------------------------------------------------------- families

def step(f):
    """A family function written as a lesson step."""
    return lambda *a, **k: X(f(*a, **k))

def bass(note):
    """The same note moved into the left hand's bass range, F2 to E3."""
    while midi(note) > midi('E3'): note = transpose(note, -7, -12)
    while midi(note) < midi('F2'): note = transpose(note, 7, 12)
    return note

@step
def position(k, tempo=80):
    """Five-finger position, hands an octave apart, parallel."""
    R = [d(k, i, 4) for i in range(1, 6)]
    Lh = [d(k, i, 3) for i in range(1, 6)]
    shape = [0, 1, 2, 3, 4, 3, 2, 1, 0, 2, 4, 2]
    rs = ' | '.join(q(*[R[i] for i in shape[b * 4:b * 4 + 4]]) for b in range(3)) + f' | {R[0]}:w'
    ls = ' | '.join(q(*[Lh[i] for i in shape[b * 4:b * 4 + 4]]) for b in range(3)) + f' | {Lh[0]}:w'
    rf = ' '.join(str(i + 1) for i in shape + [0])
    lf = ' '.join(str(5 - i) for i in shape + [0])
    return timed(f'pos-{slug(k)}', f'{name_of(k)} position, hands together', right=rs, left=ls, tempo=tempo, key=k, rf=rf, lf=lf,
                 prompt=f'Thumbs on different notes: right thumb on {R[0][:-1]}, left little finger on {Lh[0][:-1]}.')

@step
def mirror(k, tempo=72):
    """Contrary motion from the key note: both thumbs on the tonic (an octave apart), moving apart."""
    R = [d(k, i, 4) for i in range(1, 6)]
    Lh = [d(k, 2 - i, 3) for i in range(1, 6)]  # tonic, then down
    shape = [0, 1, 2, 3, 4, 3, 2, 1]
    rs = q(*[R[i] for i in shape[:4]]) + ' | ' + q(*[R[i] for i in shape[4:]]) + f' | {R[0]}:h {R[2]}:h | {R[0]}:w'
    ls = q(*[Lh[i] for i in shape[:4]]) + ' | ' + q(*[Lh[i] for i in shape[4:]]) + f' | {Lh[0]}:h {Lh[2]}:h | {Lh[0]}:w'
    f = '1 2 3 4 5 4 3 2 1 3 1'
    return timed(f'mirror-{slug(k)}', f'{name_of(k)}: mirror image', right=rs, left=ls, tempo=tempo, key=k, rf=f, lf=f,
                 prompt='Both thumbs on the key note; the hands move apart and back. Same finger in both hands every time.')

@step
def triads(k, tempo=72):
    """Broken then blocked tonic triad over the left hand's broken fifth, then I-V-I."""
    t = [d(k, i, 4) for i in (1, 3, 5)]
    b = [d(k, i, 3) for i in (1, 3, 5)]
    five = d(k, 5, 3); low5 = d(k, 5, 2)
    rs = f'{t[0]}:q {t[1]}:q {t[2]}:q {t[1]}:q | {"+".join(t)}:w | {t[0]}:q {t[1]}:q {t[2]}:q {t[1]}:q | {"+".join(t)}:w'
    ls = f'{b[0]}:h {five}:h | {b[0]}+{five}:w | {b[0]}:h {five}:h | {b[0]}+{five}:w'
    return timed(f'triad-{slug(k)}', f'{name_of(k)} triad, both hands', right=rs, left=ls, tempo=tempo, key=k,
                 rf='1 3 5 3 1 1 3 5 3 1', lf='5 1 5 5 1 5', prompt='Broken, then all three notes together.')

@step
def cadence(k, tempo=60):
    """I - IV - V7 - I with close right-hand voicings and the left hand on the roots."""
    mn = kind_of(k) == 'minor'
    lead = transpose(d(k, 0, 4), 0, 1) if mn else d(k, 0, 4)  # raised 7th in minor
    I = '+'.join(d(k, n, 4) for n in (1, 3, 5))
    IV = '+'.join([d(k, 1, 4), d(k, 4, 4), d(k, 6, 4)])
    V7 = '+'.join([lead, d(k, 4, 4), d(k, 5, 4)])
    r1, r4, r5 = bass(d(k, 1, 3)), bass(d(k, 4, 3)), bass(d(k, 5, 3))
    rs = f'{I}:h {IV}:h | {V7}:h {I}:h | {I}:h {IV}:h | {V7}:h {I}:h'
    ls = f'{r1}:h {r4}:h | {r5}:h {r1}:h | {r1}:h {r4}:h | {r5}:h {r1}:h'
    nm = 'i, iv, V7, i' if mn else 'I, IV, V7, I'
    return timed(f'cadence-{slug(k)}', f'{name_of(k)}: {nm}', right=rs, left=ls, tempo=tempo, key=k,
                 prompt='The right hand barely moves: keep the common notes, slide the others to the nearest key.')

FING = {  # one octave going up: right hand, left hand
    'C': ('12312345', '54321321'), 'G': ('12312345', '54321321'), 'D': ('12312345', '54321321'), 'A': ('12312345', '54321321'),
    'E': ('12312345', '54321321'), 'B': ('12312345', '43214321'), 'F': ('12341234', '54321321'), 'Bb': ('41231234', '32143213'),
    'Eb': ('31234123', '32143213'), 'Ab': ('34123123', '32143213'), 'Db': ('23123412', '32143213'), 'F#': ('23412312', '43213214'),
    'Am': ('12312345', '54321321'), 'Em': ('12312345', '54321321'), 'Dm': ('12312345', '54321321'), 'Gm': ('12312345', '54321321'),
    'Cm': ('12312345', '54321321'), 'Bm': ('12312345', '43214321'), 'Fm': ('12341234', '54321321'), 'F#m': ('34123123', '43213214'),
    'C#m': ('34123123', '32143213'),
}

def scale_fingers(k, octaves):
    rh, lh = [list(x) for x in FING[k]]
    if octaves == 2:
        rh = rh[:-1] + [rh[0]] + rh[1:]
        lh = lh[:-1] + [lh[-1]] + lh[1:]
    return ' '.join(rh + rh[-2::-1]), ' '.join(lh + lh[-2::-1])

def scale_ht(k, octaves=1, eighths=False, tempo=60, suffix=''):
    kind = 'harmonic' if k.endswith('m') else 'major'
    high = midi(tonic_note(k, 4)) > midi('F4')
    R = scale(tonic_note(k, 3 if octaves == 2 and high else 4), kind, octaves, down=True)
    Lh = scale(tonic_note(k, 2 if octaves == 2 else 3), kind, octaves, down=True)
    n = len(R)
    if not eighths:
        durs = ['q'] * (n - 1) + ['h'] if octaves == 1 else ['q'] * (n - 1) + ['w']
    else:
        durs = ['e'] * (n - 1) + (['q'] if octaves == 1 else ['h'])
    def write(notes):
        bars, cur, length = [], [], 0
        for p, du in zip(notes, durs):
            cur.append(f'{p}:{du}'); length += dur_value(du)
            if abs(length - 4) < 1e-6: bars.append(' '.join(cur)); cur, length = [], 0
        if cur:
            # pad the last bar with a held final note
            last = cur.pop(); p = last.split(':')[0]
            cur.append(held(p, 4 - length + dur_value(last.split(':')[1])))
            bars.append(' '.join(cur))
        return ' | '.join(bars)
    rf, lf = scale_fingers(k, octaves)
    oct_txt = 'two octaves' if octaves == 2 else 'one octave'
    title = f'{name_of(k)}{" harmonic" if kind == "harmonic" else ""} scale, {oct_txt}{", eighths" if eighths else ""}'
    rs, ls = write(R), write(Lh)
    return timed(f'scale-{slug(k)}-{octaves}{"-e" if eighths else ""}{suffix}', title, right=rs, left=ls, tempo=tempo, key=k, rf=rf, lf=lf,
                 prompt='Hands together, an octave apart. Thumbs cross under at the same moment only in some keys: watch the fingers.')

ARP_L = {'D': '5321', 'A': '5321', 'E': '5321', 'B': '5321'}

@step
def arpeggio(k, octaves=1, tempo=66):
    mn = k.endswith('m')
    t = [d(k, i, 4) for i in (1, 3, 5)]
    lt = [d(k, i, 3) for i in (1, 3, 5)]
    up_r = (t + [transpose(x, 7, 12) for x in t])[:3 * octaves] + [transpose(t[0], 7 * octaves, 12 * octaves)]
    up_l = (lt + [transpose(x, 7, 12) for x in lt])[:3 * octaves] + [transpose(lt[0], 7 * octaves, 12 * octaves)]
    if octaves == 2:
        up_l = [transpose(x, -7, -12) for x in up_l]
    R = up_r + up_r[-2::-1]; Lh = up_l + up_l[-2::-1]
    if octaves == 1:
        rs = f'{q(*R[:4])} | {q(*R[4:6])} {R[6]}:h'
        ls = f'{q(*Lh[:4])} | {q(*Lh[4:6])} {Lh[6]}:h'
        rfu, lfu = '1235', ARP_L.get(k, '5421')
    else:
        rs = f'{q(*R[:8], dur="e")} | {q(*R[8:12], dur="e")} {R[12]}:h'
        ls = f'{q(*Lh[:8], dur="e")} | {q(*Lh[8:12], dur="e")} {Lh[12]}:h'
        rfu, lfu = '1231235', ARP_L.get(k, '5421')[:4] + ARP_L.get(k, '5421')[1:]
    rf = ' '.join(list(rfu) + list(rfu)[-2::-1]); lf = ' '.join(list(lfu) + list(lfu)[-2::-1])
    return timed(f'arp-{slug(k)}-{octaves}', f'{name_of(k)} arpeggio, {"two octaves" if octaves == 2 else "one octave"}', right=rs, left=ls, tempo=tempo, key=k, rf=rf, lf=lf,
                 prompt='Keep the wrist level and let it travel sideways; the thumb passes under without a bump.' if octaves == 2 else 'Stretch the hand over the chord; keep the wrist loose.')

@step
def dom7(k, tempo=66):
    """The V7 of key k broken through its four notes, in one hand position, resolving to I."""
    lead = d(k, 7, 3) if kind_of(k) == 'major' else transpose(d(k, 7, 3), 0, 1)
    V = [d(k, 5, 3), lead, d(k, 9, 3), d(k, 11, 3), d(k, 12, 3)]
    V = [transpose(x, 7, 12) for x in V] if midi(V[0]) < midi('C4') else V
    I = [d(k, 1, 4), d(k, 3, 4), d(k, 5, 4)]
    if midi(I[0]) < midi(V[0]): I = [transpose(x, 7, 12) for x in I]
    root5 = d(k, 5, 2) if midi(d(k, 5, 2)) >= midi('E2') else d(k, 5, 3)
    root1 = d(k, 1, 2) if midi(d(k, 1, 3)) > midi('E3') else d(k, 1, 3)
    rs = f'{q(*V[:4])} | {V[4]}:h {"+".join(V[1:4])}:h | {q(*I, I[1])} | {"+".join(I)}:w'
    ls = f'{root5}:w | {root5}:w | {root1}:w | {root1}:w'
    return timed(f'dom7-{slug(k)}', f'The dominant 7th in {name_of(k)}', right=rs, left=ls, tempo=tempo, key=k,
                 prompt='Four notes of the dominant 7th, then the chord, then it resolves home.')

def run(base):
    # ------------------------------------------------------------ stage 1: two hands from the first week
    L('technique-mirror-hands', 1, 'Mirror hands', ['middle-c-position', 'rhythm-two-hands-together'], [
        S("""**Both hands from the start.** Put both thumbs on a C: the right thumb on middle C, the left thumb
        on the C below. Now walk away from each other: the right hand goes up, the left hand goes down.
        Each hand plays the **same finger** at the same moment, like a mirror.""",
          keys=keys('F2 G2 A2 B2 C3 C4 D4 E4 F4 G4', fingers='5 4 3 2 1 1 2 3 4 5'),
          check=check('In the mirror, when the right hand plays finger 3, the left hand plays...', 'Finger 3', ['Finger 1', 'Finger 5'], 'Same finger in both hands, every time: that is why it is easy.')),
        X(timed('mirror-c-steps', 'Mirror steps', right='C4:h D4:h | E4:h D4:h | C4:h D4:h | C4:w', left='C3:h B2:h | A2:h B2:h | C3:h B2:h | C3:w', tempo=72, rf='1 2 3 2 1 2 1', lf='1 2 3 2 1 2 1')),
        mirror('C'),
        X(timed('mirror-c-skips', 'Mirror skips', right='C4:q E4:q G4:h | E4:q C4:q E4:h | G4:q E4:q C4:h | C4:w', left='C3:q A2:q F2:h | A2:q C3:q A2:h | F2:q A2:q C3:h | C3:w', tempo=72,
                rf='1 3 5 3 1 3 5 3 1 1', lf='1 3 5 3 1 3 5 3 1 1')),
    ], 'In the mirror, both hands use the same fingers. It is the easiest way to play with two hands.')

    L('technique-c-position-two-hands', 1, 'C position with two hands', ['technique-mirror-hands'], [
        S("""Now the hands sit in C position an octave apart: right thumb on middle C, left little finger on the C below.
        This time the fingers **differ**: when the right thumb plays C, the left hand plays C with finger 5.""",
          keys=keys('C3 D3 E3 F3 G3 C4 D4 E4 F4 G4', fingers='5 4 3 2 1 1 2 3 4 5')),
        X(timed('c-pos-unison-slow', 'Up and down together', right='C4:h D4:h | E4:h F4:h | G4:h F4:h | E4:h D4:h | C4:w', left='C3:h D3:h | E3:h F3:h | G3:h F3:h | E3:h D3:h | C3:w', tempo=72,
                rf='1 2 3 4 5 4 3 2 1', lf='5 4 3 2 1 2 3 4 5')),
        position('C', tempo=72),
        X(timed('c-pos-held-c', 'Melody over a held C', right='E4:q D4:q C4:q D4:q | E4:q E4:q E4:h | D4:q D4:q D4:h | E4:q G4:q G4:h', left='C3:w | C3:w | G2:w | C3:w', tempo=80,
                rf='3 2 1 2 3 3 3 2 2 2 3 5 5', prompt='The left hand holds one long note per bar; the right hand sings Mary Had a Little Lamb.')),
        X(timed('c-pos-question-answer', 'Hands answer each other', right='C4:q D4:q E4:h | r:w | E4:q F4:q G4:h | r:w', left='r:w | G3:q F3:q E3:h | r:w | E3:q D3:q C3:h', tempo=80,
                rf='1 2 3 3 4 5', lf='1 2 3 3 4 5')),
    ], 'C position, both hands: the home base for the first pieces.')

    # ------------------------------------------------------------ stage 2
    L('technique-triads-c-f-g', 2, 'Three chords, both hands', ['tonic-triad', 'hands-together-held'], [
        S("""A **triad** is three notes a skip apart: fingers 1, 3 and 5. Play it **broken** (one at a time),
        then **blocked** (all at once), while the left hand plays the root and the fifth.""",
          keys=keys('C4 E4 G4', fingers='1 3 5'), sound='C4:q E4:q G4:q E4:q | C4+E4+G4:w'),
        triads('C'), triads('F'), triads('G'),
    ], 'Broken and blocked: the two ways to play a chord.')

    L('technique-positions-c-g-f', 2, 'Positions in C, G and F', ['g-position', 'technique-c-position-two-hands'], [
        S("""Every key has its five-finger position. The shape is always the same: whole step, whole step, half step,
        whole step. Here are C, G and F with both hands, parallel and in the mirror."""),
        position('G'), position('F'), mirror('G'), mirror('F'),
    ], 'One shape, three places.')

    L('technique-repeated-notes', 2, 'Changing fingers on one key', ['hands-together-parallel'], [
        S("""Playing the same key again and again goes smoother when the fingers take turns: 3, 2, 1. Lift each finger as the next one plays."""),
        X(timed('repeated-c-321', 'Three fingers, one key', right='C5:q C5:q C5:q r:q | E5:q E5:q E5:q r:q | G5:q G5:q G5:q r:q | C5:w', left='C3:w | C3:w | G2:w | C3:w', tempo=80,
                rf='3 2 1 3 2 1 3 2 1 1')),
        X(timed('repeated-lh', 'The left hand changes too', right='C5:w | E5:w | D5:w | C5:w', left='C3:q C3:q C3:q r:q | E3:q E3:q E3:q r:q | G2:q G2:q G2:q r:q | C3:w', tempo=80,
                lf='3 2 1 3 2 1 3 2 1 1')),
    ], 'A new finger for each repeat keeps the key alive.')

    # ------------------------------------------------------------ stage 3
    L('technique-contrary-scale', 3, 'The C scale in the mirror', ['c-scale-hands-apart', 'technique-mirror-hands'], [
        S("""The scale is easiest in **contrary motion**: both thumbs on C, an octave apart, moving away from each other.
        The fingering is a mirror, so the thumbs tuck under at the same moment.""",
          keys=keys('C3 C4', labels='names')),
        X(timed('scale-c-contrary', 'C major in contrary motion', right='C4:q D4:q E4:q F4:q | G4:q A4:q B4:q C5:q | B4:q A4:q G4:q F4:q | E4:q D4:q C4:h',
                left='C3:q B2:q A2:q G2:q | F2:q E2:q D2:q C2:q | D2:q E2:q F2:q G2:q | A2:q B2:q C3:h', tempo=60,
                rf='1 2 3 1 2 3 4 5 4 3 2 1 3 2 1', lf='1 2 3 1 2 3 4 5 4 3 2 1 3 2 1')),
        X(timed('scale-c-contrary-e', 'Contrary motion in eighths', right='C4:e D4:e E4:e F4:e G4:e A4:e B4:e C5:e | B4:e A4:e G4:e F4:e E4:e D4:e C4:q',
                left='C3:e B2:e A2:e G2:e F2:e E2:e D2:e C2:e | D2:e E2:e F2:e G2:e A2:e B2:e C3:q', tempo=56,
                rf='1 2 3 1 2 3 4 5 4 3 2 1 3 2 1', lf='1 2 3 1 2 3 4 5 4 3 2 1 3 2 1')),
    ], 'In contrary motion, both thumbs move together.')

    L('technique-scale-in-eighths', 3, 'Scales in eighths', ['c-scale-hands-together', 'rhythm-eighth-patterns'], [
        S("""Twice as many notes in the same time. Keep the tempo slow; aim for evenness, not speed."""),
        X(scale_ht('C', eighths=True, tempo=56)), X(scale_ht('G', eighths=True, tempo=56)), X(scale_ht('F', eighths=True, tempo=56)),
    ], 'Even eighths, both hands.')

    L('technique-positions-d-a-e', 3, 'Positions in D, A and E', ['technique-positions-c-g-f', 'major-scale-pattern'], [
        S("""Now positions with a black key in the middle: D (F♯), A (C♯) and E (G♯). The middle finger reaches into the black keys."""),
        position('D'), position('A'), position('E'), triads('D'), triads('A'), triads('E'),
    ], 'Black keys under finger 3.')

    L('technique-broken-chords', 3, 'Broken chords under a melody', ['technique-triads-c-f-g', 'lh-chords'], [
        S("""The left hand plays the chord **broken**: low, middle, high, middle (1-5-3-5 of the chord). It is the most common accompaniment of all."""),
        X(timed('broken-c-f-g', 'Broken chords in C', right='E4:h G4:h | F4:h A4:h | D4:h B3:h | C4:w', left=accompany('C | F | G | C', '4/4', 'broken'), tempo=72)),
        X(timed('broken-g-c-d', 'Broken chords in G', right='B4:h D5:h | C5:h E5:h | A4:h F#4:h | G4:w', left=accompany('G | C | D | G', '4/4', 'broken'), tempo=72, key='G')),
        X(timed('broken-f-bb-c', 'Broken chords in F', right='A4:h C5:h | Bb4:h D5:h | G4:h E4:h | F4:w', left=accompany('F | Bb | C | F', '4/4', 'broken'), tempo=72, key='F')),
    ], 'Low-high-middle-high: the broken chord.')

    # ------------------------------------------------------------ stage 4
    L('technique-minor-positions', 4, 'Minor positions, both hands', ['minor-five-finger', 'natural-minor'], [
        S("""Minor positions: whole, half, whole, whole. Four new ones, with the mirror and the triad."""),
        position('Em'), position('Gm'), mirror('Am'), mirror('Dm'), triads('Am'), triads('Dm'), triads('Em'),
    ], 'Minor: the third finger drops a half step.')

    L('technique-scales-d-a-one-octave', 4, 'D and A major, hands together', ['two-octave-c-together', 'technique-positions-d-a-e'], [
        S("""Scales with sharps, hands together, one octave: same fingering as C."""),
        X(scale_ht('D')), X(scale_ht('A')), X(scale_ht('D', eighths=True, tempo=56)), X(scale_ht('A', eighths=True, tempo=56)),
    ], 'D and A: the fingering of C with black keys.')

    L('technique-minor-scales-ht', 4, 'Minor scales, hands together', ['harmonic-minor', 'technique-scales-d-a-one-octave'], [
        S("""Harmonic minor scales in A, D and E, hands together. The raised seventh makes a wide step: keep it legato."""),
        X(scale_ht('Am')), X(scale_ht('Dm')), X(scale_ht('Em')),
    ], 'The wide step of the harmonic minor.')

    # ------------------------------------------------------------ stage 5
    L('technique-cadences-first-keys', 5, 'Chord progressions in seven keys', ['primary-triads', 'close-position-chords'], [
        S("""I, IV, V7, I: the most common chord progression. The right hand moves to the **nearest** shape each time,
        the left hand plays the roots. Learn it in C, then in every key: the shape stays, the keys change."""),
        cadence('C'), cadence('G'), cadence('F'), cadence('D'), cadence('Am'), cadence('Dm'), cadence('Em'),
    ], 'One progression, seven keys.')

    L('technique-arpeggios-one-octave', 5, 'Arpeggios, one octave', ['first-inversion', 'technique-broken-chords'], [
        S("""An **arpeggio** is a chord played one note at a time across the keyboard. One octave: fingers 1, 2, 3, 5 in
        the right hand, 5, 4, 2, 1 in the left.""", keys=keys('C4 E4 G4 C5', fingers='1 2 3 5')),
        arpeggio('C'), arpeggio('G'), arpeggio('F'), arpeggio('Am'), arpeggio('Dm'), arpeggio('Em'),
    ], 'A chord, spread out.')

    L('technique-alberti', 5, 'Alberti bass', ['accompaniment-patterns', 'technique-broken-chords'], [
        S("""**Alberti bass**: low, high, middle, high in even eighths, named after an 18th-century composer. Mozart's sonatas are full of it."""),
        X(timed('alberti-c', 'Alberti in C', right='E5:h D5:q C5:q | C5:h B4:h | D5:h F5:q E5:q | C5:w', left=accompany('C | G | G7 | C', '4/4', 'alberti'), tempo=60)),
        X(timed('alberti-g', 'Alberti in G', right='B4:h A4:q G4:q | G4:h F#4:h | A4:h C5:q B4:q | G4:w', left=accompany('G | D | D7 | G', '4/4', 'alberti'), tempo=60, key='G')),
        X(timed('alberti-f', 'Alberti in F', right='A4:h G4:q F4:q | F4:h E4:h | G4:h Bb4:q A4:q | F4:w', left=accompany('F | C | C7 | F', '4/4', 'alberti'), tempo=60, key='F')),
    ], 'Alberti: the left hand of the classical era.')

    # ------------------------------------------------------------ stage 6
    L('technique-cadences-sharp-keys', 6, 'Progressions in the sharp keys', ['technique-cadences-first-keys', 'scales-a-major-g-minor'], [
        S("""The same I, IV, V7, I in keys with more sharps."""),
        cadence('A'), cadence('E'), cadence('B'), cadence('Bm'), cadence('F#m'),
    ], 'Up to five sharps.')

    L('technique-scales-e-b', 6, 'E and B major, B minor', ['technique-scales-d-a-one-octave', 'scales-a-major-g-minor'], [
        S("""E major uses the fingering of C. B major and B minor change the left hand: it starts on finger 4."""),
        X(scale_ht('E')), X(scale_ht('B')), X(scale_ht('Bm')),
    ], 'Four and five sharps.')

    L('technique-positions-all-keys', 6, 'Positions in every key', ['technique-positions-d-a-e', 'technique-minor-positions', 'circle-of-fifths'], [
        S("""The five-finger shape in the rest of the twelve keys. Find the key note, then trust the shape: whole, whole, half, whole."""),
        position('B'), position('F#'), position('Bb'), position('Eb'), position('Ab'), position('Db'),
        position('Bm'), position('F#m'), position('Cm'), position('Fm'),
    ], 'Every key has the same five-finger shape.')

    # ------------------------------------------------------------ stage 7
    L('technique-scales-flat-keys', 7, 'Scales in the flat keys', ['technique-scales-e-b', 'y2-exit'], [
        S("""B♭ and E♭ major start on finger 4 and 3 in the right hand, 3 in the left. The thumbs always land on white keys."""),
        X(scale_ht('Bb')), X(scale_ht('Eb')), X(scale_ht('Gm')), X(scale_ht('Cm')), X(scale_ht('Fm')),
    ], 'Thumbs on white keys, fourth fingers on B♭.')

    L('technique-cadences-flat-keys', 7, 'Progressions in the flat keys', ['technique-cadences-sharp-keys', 'technique-scales-flat-keys'], [
        S("""I, IV, V7, I with flats."""),
        cadence('Bb'), cadence('Eb'), cadence('Ab'), cadence('Gm'), cadence('Cm'), cadence('Fm'),
    ], 'Every progression is the same shape.')

    L('technique-mirror-all-keys', 7, 'The mirror in every key', ['technique-positions-all-keys'], [
        S("""Contrary motion from the key note in eight keys."""),
        mirror('D'), mirror('A'), mirror('E'), mirror('Bb'), mirror('Eb'), mirror('Em'), mirror('Gm'), mirror('Cm'),
    ], 'The mirror works everywhere.')

    # ------------------------------------------------------------ stage 8
    L('technique-two-octave-scales-ht', 8, 'Two octaves in eighths', ['technique-scales-flat-keys', 'two-octave-f'], [
        S("""Two octaves, hands together, in eighths: the scale exam standard. Start slowly; the tempo ladder brings it up."""),
        X(scale_ht('C', 2, True, 60)), X(scale_ht('G', 2, True, 60)), X(scale_ht('D', 2, True, 60)), X(scale_ht('F', 2, True, 60)),
        X(scale_ht('Am', 2, True, 56)), X(scale_ht('Em', 2, True, 56)), X(scale_ht('Dm', 2, True, 56)),
    ], 'Two octaves, even and steady.')

    L('technique-arpeggios-two-octaves', 8, 'Arpeggios over two octaves', ['technique-arpeggios-one-octave', 'technique-two-octave-scales-ht'], [
        S("""Two octaves: the thumb passes under after finger 3 in the right hand going up. Keep the wrist level."""),
        arpeggio('C', 2), arpeggio('G', 2), arpeggio('F', 2), arpeggio('Am', 2), arpeggio('Em', 2), arpeggio('Dm', 2),
        arpeggio('D'), arpeggio('A'), arpeggio('E'),
    ], 'Arpeggios across the keyboard.')

    L('technique-dominant-sevenths', 8, 'Dominant 7ths in every key', ['dominant-seventh-theory', 'technique-cadences-flat-keys'], [
        S("""The dominant 7th, broken and blocked, resolving home, in eight keys."""),
        dom7('C'), dom7('G'), dom7('F'), dom7('D'), dom7('Bb'), dom7('A'), dom7('Am'), dom7('Dm'),
    ], 'The dominant 7th wants to go home.')

    L('technique-scales-ab-db', 8, 'A♭ and D♭ major, F♯ and C♯ minor', ['technique-scales-flat-keys'], [
        S("""Four keys full of black keys. Thumbs on the white keys only: C and F in A♭ and D♭."""),
        X(scale_ht('Ab')), X(scale_ht('Db')), X(scale_ht('F#m')), X(scale_ht('C#m')),
    ], 'The black-key scales lie well under the hand.')

    # ------------------------------------------------------------ stage 9
    L('technique-octaves', 9, 'Octaves', ['technique-two-octave-scales-ht'], [
        S("""Thumb and little finger, an octave apart, moved from the wrist. Keep the hand shaped and light."""),
        X(timed('octaves-rh', 'Right-hand octaves', right='C4+C5:q D4+D5:q E4+E5:q F4+F5:q | G4+G5:h E4+E5:h | F4+F5:q D4+D5:q B3+B4:q G3+G4:q | C4+C5:w', left='C3:w | C3:w | G2:w | C3:w', tempo=66)),
        X(timed('octaves-lh', 'Left-hand octaves', right='E5:w | G5:w | F5:h D5:h | C5:w', left='C2+C3:q D2+D3:q E2+E3:q F2+F3:q | G2+G3:h E2+E3:h | F2+F3:q D2+D3:q G1+G2:q G2+G3:q | C2+C3:w', tempo=66)),
    ], 'Octaves come from the wrist.')

    L('technique-blues-shapes', 9, 'Blues shapes', ['technique-dominant-sevenths', 'rhythm-shuffle'], [
        S("""The blues uses three dominant 7th chords: C7, F7 and G7 in C. The left hand plays a boogie line (root, fifth, sixth, fifth); the right hand plays shells."""),
        X(timed('blues-boogie-lh', 'Boogie left hand', right='E4+Bb4:w | E4+Bb4:w | A4+Eb5:w | E4+Bb4:w', left='C3:q G3:q A3:q G3:q | C3:q G3:q A3:q G3:q | F2:q C3:q D3:q C3:q | C3:q G3:q A3:q G3:q', tempo=88)),
        X(timed('blues-twelve-bars', 'Twelve-bar blues in C', right=' | '.join(['E4+Bb4:w'] * 4 + ['Eb4+A4:w'] * 2 + ['E4+Bb4:w'] * 2 + ['F4+B4:w', 'Eb4+A4:w', 'E4+Bb4:w', 'F4+B4:w']),
                left=' | '.join(['C3:q G3:q A3:q G3:q'] * 4 + ['F2:q C3:q D3:q C3:q'] * 2 + ['C3:q G3:q A3:q G3:q'] * 2 + ['G2:q D3:q E3:q D3:q', 'F2:q C3:q D3:q C3:q', 'C3:q G3:q A3:q G3:q', 'G2:q D3:q E3:q D3:q']), tempo=88)),
    ], 'Three chords, twelve bars.')
