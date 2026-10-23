# Key studies: one lesson per key (12 major, 9 minor), in the technique branch from stage 5 on.
# Each gathers what the other branches teach, in that key: the hands (position, scale, chords,
# inversions, broken chords, Alberti bass, dominant 7th), the eyes (reading and sight-reading with its
# key signature), the ear (every degree, short phrases to echo) and a quiz on the key itself.
# Everything is computed from the key, so it is right in every key.
import random
from lib import *
import technique as T
import theory as TH

STUDIES = [  # key, stage, extra requirement
    ('C', 5, 'technique-cadences-first-keys'), ('G', 5, 'technique-cadences-first-keys'), ('F', 5, 'technique-cadences-first-keys'),
    ('Am', 5, 'ear-minor-degrees'), ('Dm', 5, 'technique-cadences-first-keys'),
    ('D', 6, 'circle-of-fifths'), ('Em', 6, 'technique-minor-scales-ht'), ('A', 6, 'technique-cadences-sharp-keys'), ('Bb', 6, 'circle-of-fifths'),
    ('E', 7, 'technique-scales-e-b'), ('Bm', 7, 'technique-scales-e-b'), ('Eb', 7, 'technique-scales-flat-keys'), ('Gm', 7, 'technique-scales-flat-keys'),
    ('B', 8, 'technique-scales-e-b'), ('F#m', 8, 'technique-scales-ab-db'), ('Cm', 8, 'technique-cadences-flat-keys'), ('Ab', 8, 'technique-scales-ab-db'),
    ('Db', 9, 'technique-scales-ab-db'), ('F#', 9, 'technique-positions-all-keys'), ('Fm', 9, 'technique-cadences-flat-keys'), ('C#m', 9, 'technique-scales-ab-db'),
    ('Bbm', 9, 'technique-positions-all-keys'), ('Ebm', 9, 'technique-positions-all-keys'),
]

def mn(k): return k.endswith('m')
def dg(k, n, octave=4):
    return degree(tonic_note(k, octave), 'harmonic' if mn(k) else 'major', n)
def root(k, n): return dg(k, n)[:-1]

def chords(k):
    """I, IV, V7 as chord symbols (i, iv, V7 in minor)."""
    m = 'm' if mn(k) else ''
    return root(k, 1) + m, root(k, 4) + m, root(k, 5) + '7'

def inversions(k, sid):
    I = [dg(k, n) for n in (1, 3, 5)]
    IV = [dg(k, n) for n in (4, 6, 8)]
    up = lambda c: [c, c[1:] + [transpose(c[0], 7, 12)], c[2:] + [transpose(x, 7, 12) for x in c[:2]], [transpose(x, 7, 12) for x in c]]
    a, b = up(I), up(IV)
    j = lambda c: '+'.join(c)
    rs = f"{j(a[0])}:q {j(a[1])}:q {j(a[2])}:q {j(a[3])}:q | {j(a[2])}:q {j(a[1])}:q {j(a[0])}:h | {j(b[0])}:q {j(b[1])}:q {j(b[2])}:q {j(b[3])}:q | {j(a[0])}:w"
    ls = f"{T.bass(dg(k, 1, 3))}:w | {T.bass(dg(k, 1, 3))}:w | {T.bass(dg(k, 4, 3))}:w | {T.bass(dg(k, 1, 3))}:w"
    return timed(f'{sid}-inversions', f'{TH.key_name(k)}: climbing the inversions', right=rs, left=ls, tempo=60, key=k,
                 prompt='Root position, first inversion, second inversion, octave: the same chord climbing. The left hand holds the root.')

def melody(k):
    lead = dg(k, 7, 3)
    return f'{dg(k, 3)}:h {dg(k, 5)}:h | {dg(k, 4)}:h {dg(k, 6)}:h | {dg(k, 2)}:h {lead}:h | {dg(k, 1)}:w'

def accomp(k, sid, style, word):
    I, IV, V = chords(k)
    return timed(f'{sid}-{style}', f'{TH.key_name(k)}: {word}', right=melody(k), left=accompany(f'{I} | {IV} | {V} | {I}', '4/4', style), tempo=66, key=k,
                 prompt=f'A tune on I, IV, V7 and I with {word} in the left hand.')

def key_quiz(k, sid):
    maj = k if not mn(k) else next((x for x, y in TH.REL_MINOR.items() if y == k), None)
    c = TH.MAJ_SIG[maj]
    sigs = [TH.sig_text(x) for x in (c - 1, c + 1, -c if c else 2) if x != c and -7 <= x <= 7]
    notes = ' '.join(TH.pretty(x[:-1]) for x in scale(tonic_note(k, 4), 'harmonic' if mn(k) else 'major')[:7])
    wrong_notes = ' '.join(TH.pretty(x[:-1]) for x in scale(tonic_note(k, 4), 'major' if mn(k) else 'minor')[:7])
    I, IV, V = chords(k)
    spell = lambda s: ' '.join(TH.pretty(x[:-1]) for x in chord_tones(s, 4))
    other = TH.REL_MINOR.get(k) if not mn(k) else maj
    qs = [
        Q(f'The key signature of {TH.key_name(k)} is...', TH.sig_text(c), sigs[:3], f'{TH.key_name(k)}: {TH.sig_text(c)}.', whyStaff=staff(f'{dg(k, 1)}:w', key=k)),
        Q(f'The notes of the {TH.key_name(k)}{" harmonic" if mn(k) else ""} scale are...', notes, [wrong_notes], 'Count the steps: ' + ('W H W W H W+H H.' if mn(k) else 'W W H W W W H.')),
        Q(f'The tonic chord of {TH.key_name(k)} is...', spell(I), [spell(IV), spell(V)], f'Degrees 1, 3, 5: {spell(I)}.'),
        Q(f'The {"iv" if mn(k) else "IV"} chord of {TH.key_name(k)} is...', spell(IV), [spell(I), spell(V)], f'Degrees 4, 6, 8: {spell(IV)}.'),
        Q(f'The dominant 7th of {TH.key_name(k)} is...', spell(V), [spell(I), spell(IV)], f'Built on degree 5, {TH.pretty(root(k, 5))}: {spell(V)}.'),
        Q(f'The dominant note of {TH.key_name(k)} is...', TH.pretty(root(k, 5)), [TH.pretty(root(k, 4)), TH.pretty(root(k, 2)), TH.pretty(root(k, 6))], 'Degree 5.'),
        Q(f'The leading note of {TH.key_name(k)} is...', TH.pretty(root(k, 7)), [TH.pretty(root(k, 6)), TH.pretty(root(k, 2))], 'Degree 7, a half step below the tonic' + (' (raised in harmonic minor).' if mn(k) else '.')),
    ]
    if other:
        qs.append(Q(f'The {"relative minor" if not mn(k) else "relative major"} of {TH.key_name(k)} is...', TH.key_name(other),
                    [TH.key_name(x) for x in random.Random(k).sample([y for y in ('C', 'G', 'D', 'F', 'Bb', 'Am', 'Em', 'Dm', 'Gm', 'A', 'Eb') if y not in (other, k)], 2)],
                    'They share a key signature.'))
    return quiz(f'{sid}-quiz', f'Know the key: {TH.key_name(k)}', qs, reps=1, days=1)

def thirds(k, sid):
    R = [dg(k, n) for n in range(1, 6)]; Lh = [dg(k, n, 3) for n in range(1, 6)]
    shape = [0, 2, 1, 3, 2, 4, 3, 1, 0, 2, 4, 2]
    rs = ' | '.join(' '.join(f'{R[i]}:q' for i in shape[b * 4:b * 4 + 4]) for b in range(3)) + f' | {R[0]}:w'
    ls = ' | '.join(' '.join(f'{Lh[i]}:q' for i in shape[b * 4:b * 4 + 4]) for b in range(3)) + f' | {Lh[0]}:w'
    return timed(f'{sid}-thirds', f'{TH.key_name(k)}: warm-up in thirds', right=rs, left=ls, tempo=76, key=k,
                 rf=' '.join(str(i + 1) for i in shape + [0]), lf=' '.join(str(5 - i) for i in shape + [0]), prompt='Skip a key, step back: 1 3 2 4 3 5. Both hands at once.')

def waltz(k, sid):
    I, IV, V = chords(k)
    rs = f'{dg(k, 3)}:h {dg(k, 5)}:q | {dg(k, 4)}:h {dg(k, 6)}:q | {dg(k, 2)}:h {dg(k, 7, 3)}:q | {dg(k, 1)}:h.'
    return timed(f'{sid}-waltz', f'{TH.key_name(k)}: waltz', right=rs, left=accompany(f'{I} | {IV} | {V} | {I}', '3/4', 'waltz'), meter='3/4', tempo=96, key=k,
                 prompt='Oom-pah-pah in the left hand, a long-short tune above.')

def triad_quiz(k, sid):
    kind = 'harmonic' if mn(k) else 'major'
    sc = scale(tonic_note(k, 4), kind, 2)
    qual = {(4, 3): 'major', (3, 4): 'minor', (3, 3): 'diminished', (4, 4): 'augmented'}
    roman_major = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']
    roman_minor = ['i', 'ii°', 'III+', 'iv', 'V', 'VI', 'vii°']
    qs = []
    for i in range(7):
        t = [sc[i], sc[i + 2], sc[i + 4]]
        q = qual[(midi(t[1]) - midi(t[0]), midi(t[2]) - midi(t[1]))]
        notes = ' '.join(TH.pretty(x[:-1]) for x in t)
        num = (roman_minor if mn(k) else roman_major)[i]
        others = [x for x in ('major', 'minor', 'diminished', 'augmented') if x != q]
        qs.append(Q(f'In {TH.key_name(k)}, the triad on degree {i + 1} ({notes}) is...', q.capitalize(), [o.capitalize() for o in others[:2]],
                    f'{notes}: {"major 3rd + minor 3rd" if q == "major" else "minor 3rd + major 3rd" if q == "minor" else "two minor 3rds" if q == "diminished" else "two major 3rds"}, so {q}. Roman numeral: {num}.',
                    whyStaff=staff('+'.join(t) + ':w', key=k)))
    return quiz(f'{sid}-triads', f'Chords of {TH.key_name(k)}', qs, reps=1, days=1)

PHRASES = [[1, 2, 3, 2, 1], [5, 4, 3, 2, 1], [1, 3, 5, 3, 1], [3, 4, 5, 4, 3], [1, 2, 3, 4, 5], [5, 6, 5, 4, 3], [8, 7, 6, 5], [3, 2, 1, 7, 1], [1, 5, 3, 1], [5, 3, 4, 2, 1]]

def harmonised_scale(k, sid):
    kind = 'harmonic' if mn(k) else 'major'
    R = scale(tonic_note(k, 4), kind, 1, down=True)
    rs = f"{' '.join(x + ':q' for x in R[:4])} | {' '.join(x + ':q' for x in R[4:8])} | {' '.join(x + ':q' for x in R[8:12])} | {R[12]}:q {R[13]}:q {R[14]}:h"
    I, IV, V = chords(k)
    rf, _ = T.scale_fingers(k, 1) if k in T.FING else (None, None)
    return timed(f'{sid}-harmonised-scale', f'{TH.key_name(k)}: the scale with chords', right=rs, left=accompany(f'{I} | {I} {V} | {V} | {I}', '4/4', 'block'), tempo=66, key=k, rf=rf,
                 prompt='The scale in the right hand, the chords under it in the left: the scale turned into music.')

def chord_pattern(k, sid):
    lead = dg(k, 7, 3)
    bars = [[dg(k, 1), dg(k, 3), dg(k, 5), dg(k, 3)], [dg(k, 1), dg(k, 4), dg(k, 6), dg(k, 4)], [lead, dg(k, 2), dg(k, 4), dg(k, 5)]]
    rs = ' | '.join(' '.join(x + ':q' for x in b) for b in bars) + f' | {dg(k, 1)}:q {dg(k, 3)}:q {dg(k, 5)}:h'
    ls = f"{T.bass(dg(k, 1, 3))}:w | {T.bass(dg(k, 4, 3))}:w | {T.bass(dg(k, 5, 3))}:w | {T.bass(dg(k, 1, 3))}:w"
    return timed(f'{sid}-chord-pattern', f'{TH.key_name(k)}: broken I, IV, V7, I', right=rs, left=ls, tempo=72, key=k,
                 rf='1 3 5 3 1 2 4 2 1 2 4 5 1 3 5', prompt='Each chord broken in the right hand, its root held in the left. The hand barely moves.')

def run(base):
    prev = None
    for k, stage, req in STUDIES:
        sid = f'ks-{T.slug(k)}'
        name = TH.key_name(k)
        I, IV, V = chords(k)
        sc = ' '.join(f'{x}:q' for x in scale(tonic_note(k, 4), 'harmonic' if mn(k) else 'major')[:8])
        hands = [S(f"""**Key study: {name}, the hands.** The five-finger position, the scale, its chords and the common
        accompaniments, all in {name}. Its chords: **{TH.pretty(I)}**, **{TH.pretty(IV)}** and **{TH.pretty(V)}**.""", staff=staff(sc, key=k), sound=sc),
                 X(thirds(k, sid))]
        for fam, eid in [(T.position, f'pos-{T.slug(k)}'), (T.mirror, f'mirror-{T.slug(k)}'), (T.triads, f'triad-{T.slug(k)}'), (T.cadence, f'cadence-{T.slug(k)}'), (T.dom7, f'dom7-{T.slug(k)}')]:
            if eid not in EXERCISES: hands.append(fam(k))
        if k in T.FING:
            for octs, e, tempo in [(1, False, 60), (1, True, 56), (2, True, 60)]:
                if f'scale-{T.slug(k)}-{octs}{"-e" if e else ""}' not in EXERCISES: hands.append(X(T.scale_ht(k, octs, e, tempo)))
        if k in T.FING and f'scale-{T.slug(k)}-contrary' not in EXERCISES: hands.append(X(T.contrary(k)))
        hands.append(X(timed(f'{sid}-pedal', f'{name}: rolling chords with pedal', right=melody(k), left=accompany(f'{I} | {IV} | {V} | {I}', '4/4', 'arp'), tempo=60, key=k,
                             pedal='x:w | x:w | x:w | x:w', prompt='Root, fifth, octave, fifth in the left hand; the pedal changes with each bar.')))
        hands += [X(harmonised_scale(k, sid)), X(chord_pattern(k, sid)), X(inversions(k, sid)), X(accomp(k, sid, 'broken', 'broken chords')),
                  X(accomp(k, sid, 'alberti', 'an Alberti bass')), X(accomp(k, sid, 'pulse', 'a chord on every beat')), X(waltz(k, sid))]
        lesson(sid, f'Key study: {name}', hands, f'{name} under both hands.', skills=['technique'])
        node(sid, 'technique', stage, f'Key study: {name}', [x for x in (req, prev) if x], type='drill')

        mid = f'{sid}-musicianship'
        mus = [S(f"""**Key study: {name}, eyes and ears.** Its key signature, its chords on paper, reading and sight-reading in it,
        and its sound: every degree and short phrases to play back.""", staff=staff(sc, key=k), sound=sc),
               X(key_quiz(k, sid)), X(triad_quiz(k, sid)),
               X(gen(f'{sid}-read', f'Read in {name}', 'read-notes', reps=3, days=2, clef='treble', notes='C4-A5', keys=[k], questions=30, mastery={'accuracy': 90, 'medianMs': 3000})),
               X(gen(f'{sid}-read-bass', f'Read the bass in {name}', 'read-notes', reps=3, days=2, clef='bass', notes='E2-C4', keys=[k], questions=30, mastery={'accuracy': 90, 'medianMs': 3000})),
               X(gen(f'{sid}-sight', f'Sight-read in {name}', 'sight-read', reps=3, days=2, hand='together', clef='grand', notes=f'{dg(k, 1)}-{dg(k, 8)}',
                     keys=[k], left='fifths' if stage < 7 else 'chords', durations=['q', 'h', 'e'], bars=8 if stage >= 7 else 4, tempo=60, mastery={'accuracy': 90})),
               X(gen(f'{sid}-sight-rh', f'Sight-read the right hand in {name}', 'sight-read', reps=3, days=2, hand='right', clef='treble', notes=f'{dg(k, 1)}-{dg(k, 8)}',
                     keys=[k], durations=['q', 'h', 'e'], bars=8, tempo=66, mastery={'accuracy': 90})),
               X(gen(f'{sid}-sight-lh', f'Sight-read the left hand in {name}', 'sight-read', reps=3, days=2, hand='left', clef='bass', notes=f'{dg(k, 1, 3)}-{dg(k, 8, 3)}',
                     keys=[k], durations=['q', 'h'], bars=8, tempo=66, mastery={'accuracy': 90})),
               X(ear(f'{sid}-intervals', f'Intervals from the key note of {name}', [{'type': 'interval', 'pool': ['M2', 'M3', 'P4', 'P5', 'M6', 'M7', 'P8'] if not mn(k) else ['M2', 'm3', 'P4', 'P5', 'm6', 'M7', 'P8'], 'from': dg(k, 1), 'direction': 'up', 'answer': 'play'}], questions=20)),
               X(ear(f'{sid}-degrees', f'Every degree of {name}', [{'type': 'degree', 'key': k, 'pool': [1, 2, 3, 4, 5, 6, 7]}], cadence=k, questions=20)),
               X(ear(f'{sid}-echo', f'Echo phrases in {name}', [{'type': 'melody', 'notes': ' '.join(dg(k, d) for d in p), 'plays': 2} for p in PHRASES], questions=16))]
        lesson(mid, f'Reading and hearing {name}', mus, f'{name} for the eyes and ears.', skills=['reading', 'ear', 'theory'])
        node(mid, 'reading', stage, f'Reading and hearing {name}', [x for x in (sid, 'reading-key-signatures') if x], type='drill')
        prev = sid
