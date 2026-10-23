# Harmony you can hear and name, and the words musicians use (the audit's gaps 3 and 4):
# ii, iii and vi; the progressions everyone uses, played and heard; chord function by ear;
# modulation; secondary dominants; modes; texture; the eras of music; expression and analysis
# words. Runs after the older generators so their lesson files keep their numbers.
from lib import *

def T(id, stage, title, requires, steps, recap):
    lesson(id, title, steps, recap, skills=['theory'])
    node(id, 'theory', stage, title, requires, type='lesson')

def E(id, stage, title, requires, steps, recap):
    lesson(id, title, steps, recap, skills=['ear'])
    node(id, 'ear', stage, title, requires, type='drill')

ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii']

def symbol(key, numeral):
    """'V7' in 'C' -> 'G7'; 'vii°' in 'Am' -> 'G#dim'."""
    m = re.fullmatch(r'(VII|VI|V|IV|III|II|I|vii|vi|v|iv|iii|ii|i)(°)?(maj7|7)?', numeral)
    assert m, numeral
    d = ROMAN.index(m.group(1).lower()) + 1
    mode = key_mode(key)
    tonic = tonic_note(key, 4)
    upper = m.group(1).isupper()
    kind = 'harmonic' if mode == 'minor' and d == 7 and not upper else ('major' if mode == 'major' else 'minor')
    root = scale(tonic, kind)[d - 1][:-1]
    q = 'dim' if m.group(2) else ('' if upper else 'm')
    if m.group(3) == '7': q = {'': '7', 'm': 'm7', 'dim': 'dim'}[q]
    if m.group(3) == 'maj7': q = 'maj7'
    return root + q

def voiced(key, nums, beats='h'):
    """A progression as a two-hand note string: the root low, the chord in close position above, moving smoothly."""
    out, prev = [], None
    for n in nums:
        sym = symbol(key, n)
        tones = chord_tones(sym, 3)
        best, cost = None, 1e9
        for inv in range(len(tones)):
            v = tones[inv:] + [step_up(t, 7, 12) for t in tones[:inv]]
            for shift in (0, 1):
                w = [step_up(t, 7 * shift, 12 * shift) for t in v]
                ms = [midi(t) for t in w]
                if ms[0] < midi('F3') or ms[-1] > midi('E5'): continue
                c = sum(abs(a - b) for a, b in zip(ms, prev)) if prev else abs(ms[0] - 60)
                if c < cost: best, cost = w, c
        prev = [midi(t) for t in best]
        root = parse_chord(sym)[0]
        bass = next(f'{root}{o}' for o in (2, 3) if midi('E2') <= midi(f'{root}{o}') <= midi('D#3'))
        out.append(f"{bass}+{'+'.join(best)}:{beats}")
    return out

def sound(key, nums, beats='h'):
    parts = voiced(key, nums, beats)
    per = {'w': 1, 'h': 2, 'q': 4}[beats]
    return ' | '.join(' '.join(parts[i:i + per]) for i in range(0, len(parts), per))

def names(key, nums): return ' – '.join(symbol(key, n).replace('b', '♭').replace('#', '♯').replace('dim', '°') for n in nums)

def play_progression(id, title, key, nums, tempo=72, reps=3, days=2):
    """Both hands: the root in the left hand, the chord in the right, one chord a bar, voice-led."""
    lh, rh = [], []
    prev = None
    for p in voiced(key, nums, 'w'):
        notes, _ = p.split(':')
        bass, *upper = notes.split('+')
        lh.append(f'{bass}:w'); rh.append(f"{'+'.join(upper)}:w")
    return timed(id, title, right=' | '.join(rh), left=' | '.join(lh), tempo=tempo, key=key if key != 'C' else None, display='staff', reps=reps, days=days)

POP = ['I', 'V', 'vi', 'IV']
FIFTIES = ['I', 'vi', 'IV', 'V']
BASIC = ['I', 'IV', 'V', 'I']
JAZZ = ['ii', 'V', 'I', 'I']
CIRCLE = ['vi', 'ii', 'V', 'I']
PLAGAL = ['I', 'IV', 'I', 'IV']

def run(base):
    T('harmony-other-chords', 5, 'The other chords: ii, iii and vi', ['primary-triads', 'triads-on-every-degree'], [
        S("""I, IV and V are the **primary** chords. The other three, **ii, iii and vi**, are minor (in a major key), and each is a
        close relative of a primary chord: it shares two of its three notes.""", sound=sound('C', ['I', 'vi', 'IV', 'ii']),
          staff=staff('C4+E4+G4:h A3+C4+E4:h | F3+A3+C4:h D4+F4+A4:h', labels='none'),
          callout='vi shares two notes with I; ii shares two with IV; iii shares two with V (and with I).', terms=['primary chord', 'secondary chord', 'relative']),
        S("""So **vi can stand in for I**, and **ii for IV**: same job, a softer, sadder colour. Listen to "I IV V I" and then
        "I ii V I": the second sounds like a hymn or a jazz standard.""", sound=sound('C', ['I', 'IV', 'V', 'I']) + ' | ' + sound('C', ['I', 'ii', 'V', 'I']),
          check=check('Which chord shares two notes with C major (C E G)?', 'A minor (A C E)', ['D minor (D F A)', 'G major (G B D)'], 'A C E and C E G share C and E.')),
        S("""In a major key the pattern of chords is always the same: **I ii iii IV V vi vii°**: major, minor, minor, major, major,
        minor, diminished. Learn it once and it works in every key.""", callout='Major keys: I ii iii IV V vi vii°.'),
        X(play_progression('harmony-play-i-vi-iv-v', 'Play I vi IV V in C', 'C', FIFTIES)),
        X(play_progression('harmony-play-i-ii-v-i-g', 'Play I ii V I in G', 'G', ['I', 'ii', 'V', 'I'])),
        X(quiz('harmony-other-chords-quiz', 'The other chords: quiz', [
            Q('In C major, which chord is vi?', 'A minor', ['A major', 'E minor', 'D minor'], 'Count six notes up from C: A. In a major key vi is minor.'),
            Q('In G major, which chord is ii?', 'A minor', ['A major', 'C major', 'E minor'], 'G A: degree 2 is A, and ii is minor.'),
            Q('In F major, which chord is vi?', 'D minor', ['D major', 'B♭ major', 'A minor'], 'F G A B♭ C D: degree 6 is D, minor.'),
            Q('In a major key, which three chords are major?', 'I, IV and V', ['I, ii and vi', 'ii, iii and vi', 'I, V and vi'], 'The primary chords are the major ones.'),
            Q('Which chord is diminished in a major key?', 'vii°', ['ii', 'iii', 'IV'], 'The chord on the 7th degree: B D F in C.'),
            Q('vi can often replace...', 'I', ['V', 'vii°', 'IV'], 'vi shares two notes with I.'),
            Q('ii can often replace...', 'IV', ['V', 'I', 'iii'], 'ii shares two notes with IV (D F A and F A C).'),
            Q('In D major, which chord is iii?', 'F♯ minor', ['F major', 'E minor', 'G major'], 'D E F♯: degree 3 is F♯, minor.'),
            Q('How many minor chords does a major key have (not counting vii°)?', '3', ['2', '4', '1'], 'ii, iii and vi.'),
            Q('Listen. Which chord comes second?', 'vi', ['IV', 'V', 'ii'], 'I to vi: the bass drops a third and the chord turns minor.', sound=sound('C', ['I', 'vi'], 'h')),
            Q('Listen. Which chord comes second?', 'ii', ['IV', 'vi', 'V'], 'A minor colour on D: ii.', sound=sound('C', ['I', 'ii'], 'h')),
            Q('In C major, what are the notes of ii?', 'D F A', ['D F♯ A', 'D F A C', 'E G B'], 'Every other note of the scale from D.'),
        ])),
    ], 'I ii iii IV V vi vii°: three major, three minor, one diminished.')

    T('harmony-progressions', 5, 'Progressions everyone uses', ['harmony-other-chords', 'cadence-in-f'], [
        S("""A **progression** is a chain of chords. A handful of them carry most of the music you know. First, the oldest:
        **I IV V I**, every hymn, folk song and blues uses it.""", sound=sound('C', BASIC), terms=['progression']),
        S("""**I vi IV V** is the 1950s progression: "Stand by Me", doo-wop, a thousand ballads. **I V vi IV** is today's pop
        progression ("Let It Be", "Someone Like You"); it is the same four chords, started in another place.""",
          sound=sound('C', FIFTIES) + ' | ' + sound('C', POP)),
        S("""**ii V I** is the heart of jazz: in C, Dm7 G7 C. And **vi ii V I** goes round the circle of fifths (A, D, G, C), each
        chord a fifth above the next: the most satisfying way home there is.""", sound=sound('C', ['ii', 'V7', 'I', 'I']) + ' | ' + sound('C', CIRCLE),
          callout='Roots falling by fifths (A → D → G → C) are the strongest pull in harmony.',
          check=check('vi ii V I in C is...', 'Am Dm G C', ['Am D G C', 'A Dm G7 F'], 'vi = Am, ii = Dm, V = G, I = C.')),
        X(play_progression('harmony-play-pop-c', 'Play the pop progression in C', 'C', POP)),
        X(play_progression('harmony-play-circle-f', 'Play vi ii V I in F', 'F', CIRCLE)),
        X(play_progression('harmony-play-fifties-g', 'Play I vi IV V in G', 'G', FIFTIES)),
        X(quiz('harmony-progressions-quiz', 'Progressions: quiz', [
            Q('I V vi IV in C is...', 'C G Am F', ['C G A F', 'C F Am G', 'C G Em F'], 'I = C, V = G, vi = Am, IV = F.'),
            Q('I vi IV V in G is...', 'G Em C D', ['G E C D', 'G Em C D7', 'G Am C D'], 'vi in G is E minor.'),
            Q('ii V I in F is...', 'Gm C F', ['G C F', 'Gm C7 B♭', 'Dm G C'], 'ii = G minor, V = C, I = F.'),
            Q('Which progression is the heart of jazz?', 'ii V I', ['I IV V', 'I V vi IV', 'I vi IV V'], 'ii V I, usually with sevenths: Dm7 G7 Cmaj7.'),
            Q('In vi ii V I, the roots move...', 'Down by fifths', ['Up by step', 'Down by step', 'Up by thirds'], 'A → D → G → C: each a fifth below (a fourth above) the last.'),
            Q('I V vi IV and I vi IV V use...', 'The same four chords', ['Different chords', 'Only major chords', 'Seventh chords'], 'Both use I, IV, V and vi, in different orders.'),
            Q('Listen. Which progression is it?', 'I – IV – V – I', ['I – vi – IV – V', 'I – V – vi – IV'], 'The basic one: home, away, the pull of V, home.', sound=sound('C', BASIC)),
            Q('Listen. Which progression is it?', 'I – V – vi – IV', ['I – IV – V – I', 'I – vi – IV – V'], 'The pop progression: the third chord is minor.', sound=sound('C', POP)),
            Q('Listen. Which progression is it?', 'I – vi – IV – V', ['I – V – vi – IV', 'I – IV – V – I'], 'The second chord is the minor one: vi.', sound=sound('C', FIFTIES)),
            Q('Which progression ends a piece most strongly?', 'V – I', ['I – IV', 'I – V', 'IV – V'], 'The perfect cadence: V to I.'),
            Q('IV – I at the end of a hymn is called...', 'A plagal cadence ("Amen")', ['A perfect cadence', 'A half cadence', 'A deceptive cadence'], 'Sung to "A-men".'),
            Q('V – vi instead of V – I is called...', 'A deceptive cadence', ['A plagal cadence', 'A half cadence', 'A perfect cadence'], 'The ear expects I and gets vi: a surprise.'),
        ])),
    ], 'I IV V I, I vi IV V, I V vi IV, ii V I, vi ii V I: most of the music you know.')

    E('ear-chord-function', 5, 'I, IV or V?', ['primary-triads', 'ear-triad-qualities'], [
        S("""After the cadence sets the key, one chord plays. Is it **I** (home, at rest), **IV** (lifted, open) or **V** (tense,
        wants to go home)? Then it goes home to I, so you hear its pull.""", sound=sound('C', ['I', 'IV', 'V', 'I']),
          callout='I rests. IV opens up. V leans towards home.'),
        X(ear('ear-function-c', 'I, IV or V in C', [{'type': 'function', 'key': 'C', 'pool': ['I', 'IV', 'V']}])),
        X(ear('ear-function-g-f', 'I, IV or V in G and F', [{'type': 'function', 'key': 'G', 'pool': ['I', 'IV', 'V']}, {'type': 'function', 'key': 'F', 'pool': ['I', 'IV', 'V']}])),
    ], 'Rest, open, pull: I, IV, V.')

    E('ear-function-six-chords', 6, 'Hearing ii and vi', ['ear-chord-function', 'harmony-other-chords'], [
        S("""Now the minor chords join in. **vi** sounds like a sad I; **ii** like a soft IV. Listen to the bass: it tells you the
        root.""", sound=sound('C', ['I', 'vi', 'IV', 'ii', 'V', 'I'], 'h') + ' | ' + 'C2+C4+E4+G4:w', terms=['function']),
        X(ear('ear-function-five', 'I, ii, IV, V or vi', [{'type': 'function', 'key': 'C', 'pool': ['I', 'ii', 'IV', 'V', 'vi']}])),
        X(ear('ear-function-five-keys', 'Five chords, three keys', [{'type': 'function', 'key': k, 'pool': ['I', 'ii', 'IV', 'V', 'vi']} for k in ('G', 'F', 'D')])),
    ], 'Every chord has a job; the ear can learn the jobs.')

    E('ear-progressions', 6, 'Name that progression', ['ear-function-six-chords', 'harmony-progressions'], [
        S("""Four chords, played one after another. Which progression was it? Follow the bass first, then the colour (major or
        minor) of each chord.""", sound=sound('G', POP)),
        X(ear('ear-progressions-four', 'Four famous progressions', [{'type': 'progression', 'key': ['C', 'G', 'F', 'D'], 'pool': ['I IV V I', 'I V vi IV', 'I vi IV V', 'vi ii V I']}])),
        X(ear('ear-progressions-six', 'Six progressions', [{'type': 'progression', 'key': ['C', 'G', 'F', 'D', 'Bb', 'A'], 'pool': ['I IV V I', 'I V vi IV', 'I vi IV V', 'vi ii V I', 'I ii V I', 'I IV I V'], 'choices': 4}])),
    ], 'Bass first, then colour: progressions by ear.')

    E('ear-progressions-minor', 7, 'Progressions in minor', ['ear-progressions', 'harmonic-minor'], [
        S("""Minor keys have their own favourites: **i iv V i**, **i VI III VII** (the epic film-music sound), and **i VII VI V**
        (the falling bass of flamenco and a hundred rock songs).""", sound=sound('Am', ['i', 'VI', 'III', 'VII']) + ' | ' + sound('Am', ['i', 'VII', 'VI', 'V'])),
        X(ear('ear-function-minor', 'i, iv, V or VI in A minor', [{'type': 'function', 'key': 'Am', 'pool': ['i', 'iv', 'V', 'VI']}])),
        X(ear('ear-progressions-minor-four', 'Minor progressions', [{'type': 'progression', 'key': ['Am', 'Em', 'Dm'], 'pool': ['i iv V i', 'i VI III VII', 'i VII VI V', 'i iv VII III']}])),
    ], 'Minor keys: i iv V, and the falling i VII VI V.')

    T('harmony-modulation', 7, 'Changing key: modulation', ['harmony-progressions', 'circle-of-fifths', 'relative-minor'], [
        S("""Longer pieces travel: they **modulate** to a new key, stay a while, and come home. The nearest keys are next door on
        the circle of fifths: from C major, **G major** (the dominant), **F major** (the subdominant) and **A minor** (the
        relative minor).""", terms=['modulation', 'dominant key', 'relative minor', 'pivot chord'],
          callout='Most classical pieces in a major key go to the dominant; most in a minor key go to the relative major.'),
        S("""How does the ear know the key has changed? A new **sharp or flat** appears (F♯ for G major), and a **cadence** in the
        new key confirms it: D7 to G. A **pivot chord** belongs to both keys and slips the music across: Am is vi in C and ii in G.""",
          sound=sound('C', ['I', 'vi'], 'h') + ' | ' + 'D2+D4+F#4+A4+C5:h G2+D4+G4+B4:h | G2+D4+G4+B4:w',
          check=check('A piece in C major starts using F♯ and ends a phrase D7 – G. Where has it gone?', 'G major', ['F major', 'A minor', 'E minor'], 'F♯ plus a cadence on G: the dominant key.')),
        X(quiz('harmony-modulation-quiz', 'Modulation: quiz', [
            Q('The dominant key of C major is...', 'G major', ['F major', 'A minor', 'D major'], 'The key a fifth above.'),
            Q('The dominant key of F major is...', 'C major', ['B♭ major', 'D minor', 'G major'], 'A fifth above F: C.'),
            Q('The relative major of D minor is...', 'F major', ['D major', 'A major', 'B♭ major'], 'Same signature (one flat), a minor third up.'),
            Q('The relative minor of G major is...', 'E minor', ['G minor', 'B minor', 'A minor'], 'Down a minor third: E.'),
            Q('A chord that belongs to both the old and the new key is a...', 'Pivot chord', ['Passing chord', 'Tonic chord', 'Pedal chord'], 'It lets the music change key smoothly.'),
            Q('In C major, a new F♯ usually means the music is heading to...', 'G major', ['F major', 'D minor', 'B♭ major'], 'F♯ is the leading note of G.'),
            Q('In C major, a new B♭ usually means the music is heading to...', 'F major', ['G major', 'A minor', 'E minor'], 'B♭ is in F major.'),
            Q('Am is vi in C major. What is it in G major?', 'ii', ['vi', 'iii', 'IV'], 'G A: A minor is ii in G.'),
            Q('A piece in A minor most often modulates to...', 'C major', ['E minor', 'D minor', 'A major'], 'Its relative major.'),
            Q('What confirms a new key?', 'A cadence in it', ['A loud chord', 'A key signature change on every line', 'A faster tempo'], 'V – I in the new key settles it.'),
            Q('Keys next to each other on the circle of fifths differ by...', 'One sharp or flat', ['Two sharps', 'A semitone', 'Nothing'], 'C (none), G (one sharp), D (two)...'),
            Q('The keys closest to C major are...', 'G, F and A minor', ['D, E and B', 'C minor and E♭', 'F♯ and D♭'], 'One accidental away, or the same signature.'),
        ])),
    ], 'Modulation: a new accidental, a cadence, a new home for a while.')

    T('harmony-secondary-dominants', 8, 'Borrowed fifths: secondary dominants', ['harmony-modulation', 'dominant-seventh-theory'], [
        S("""Any chord can have its own V. In C major, the V of G is **D (or D7)**: it borrows F♯ and pulls to G like a little
        cadence. This is a **secondary dominant**, written **V/V** ("five of five").""", sound='C2+C4+E4+G4:h D2+C4+F#4+A4:h | G2+B3+D4+G4:w',
          terms=['secondary dominant', 'V/V', 'chromatic chord'], callout='V/V = the dominant of the dominant. In C: D7.'),
        S("""**V/vi** (E7 in C) pulls to A minor, and **V/ii** (A7) to D minor. Whenever a sharp appears in a C major piece, it is
        often the leading note of the chord that comes next.""", sound='C2+C4+E4+G4:h E2+B3+D4+G#4:h | A2+A3+C4+E4:w',
          check=check('In C major, which chord is V/V?', 'D major (or D7)', ['G major', 'F major', 'A minor'], 'The V of G is D.')),
        X(quiz('harmony-secondary-quiz', 'Secondary dominants: quiz', [
            Q('V/V in G major is...', 'A major (A7)', ['D major', 'E minor', 'C major'], 'The V of D is A.'),
            Q('V/vi in C major is...', 'E major (E7)', ['A major', 'E minor', 'G major'], 'The V of A minor is E.'),
            Q('V/ii in C major is...', 'A major (A7)', ['D major', 'A minor', 'G major'], 'The V of D minor is A.'),
            Q('D7 in C major usually goes to...', 'G', ['C', 'F', 'A minor'], 'It is V of G.'),
            Q('E7 in C major usually goes to...', 'A minor', ['C', 'F', 'E minor'], 'It is V of vi.'),
            Q('The F♯ in D7 (in C major) is the leading note of...', 'G', ['C', 'F', 'A'], 'F♯ rises to G.'),
            Q('A secondary dominant borrows a note from...', 'Another key', ['The bass clef', 'A different meter', 'The relative minor only'], 'That is why it adds colour.'),
            Q('Which is V/IV in C major?', 'C7', ['F7', 'G7', 'B♭'], 'The V of F is C; adding B♭ (C7) makes it lean to F.'),
            Q('Listen. The middle chord is...', 'V/V (D)', ['IV (F)', 'vi (Am)'], 'The F♯ gives it away, and it pulls to G.', sound='C2+C4+E4+G4:h D2+C4+F#4+A4:h | G2+B3+D4+G4:w'),
            Q('A chain of secondary dominants (E7 A7 D7 G7 C) moves...', 'Round the circle of fifths', ['Up by steps', 'In thirds', 'Chromatically up'], 'E → A → D → G → C.'),
        ])),
    ], 'Every chord can have its own V.')

    T('harmony-modes', 9, 'The modes', ['harmony-secondary-dominants', 'compose-modes'], [
        S("""Play the white keys from any note to the same note above and you get a **mode**. From C: **Ionian** (major). From D:
        **Dorian**. From E: **Phrygian**. From F: **Lydian**. From G: **Mixolydian**. From A: **Aeolian** (natural minor). From B:
        **Locrian**.""", keys=keys('C4 D4 E4 F4 G4 A4 B4 C5', labels='names'), terms=['mode', 'Ionian', 'Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Aeolian', 'Locrian']),
        S("""Each mode is major or minor with **one note changed**: Dorian is minor with a raised 6th; Phrygian minor with a flat
        2nd; Lydian major with a raised 4th; Mixolydian major with a flat 7th.""", callout='Dorian ♮6 · Phrygian ♭2 · Lydian ♯4 · Mixolydian ♭7',
          sound='D4:q E4:q F4:q G4:q | A4:q B4:q C5:q D5:q | F4:q G4:q A4:q B4:q | C5:q D5:q E5:q F5:q'),
        X(quiz('harmony-modes-quiz', 'Modes: quiz', [
            Q('White keys from D to D make the...', 'Dorian mode', ['Phrygian mode', 'Lydian mode', 'Aeolian mode'], 'D Dorian.'),
            Q('White keys from G to G make the...', 'Mixolydian mode', ['Lydian mode', 'Ionian mode', 'Dorian mode'], 'G Mixolydian: G major with F♮.'),
            Q('White keys from A to A make the...', 'Aeolian mode (natural minor)', ['Locrian mode', 'Dorian mode', 'Ionian mode'], 'Aeolian is the natural minor.'),
            Q('Lydian is major with...', 'A raised 4th', ['A flat 7th', 'A flat 3rd', 'A raised 6th'], 'F Lydian has B♮, not B♭.'),
            Q('Dorian is minor with...', 'A raised 6th', ['A flat 2nd', 'A raised 7th', 'A flat 5th'], 'D Dorian has B♮.'),
            Q('Mixolydian is major with...', 'A flat 7th', ['A raised 4th', 'A flat 6th', 'A flat 3rd'], 'G Mixolydian has F♮.'),
            Q('Phrygian is minor with...', 'A flat 2nd', ['A raised 6th', 'A raised 4th', 'A flat 7th'], 'E Phrygian starts E F: a semitone.'),
            Q('The Ionian mode is the same as...', 'The major scale', ['The natural minor', 'The blues scale', 'The chromatic scale'], 'C to C on the white keys.'),
            Q('Which mode sounds unstable because its 5th is diminished?', 'Locrian', ['Lydian', 'Dorian', 'Mixolydian'], 'B to F is a diminished 5th.'),
            Q('"Scarborough Fair" is a famous tune in...', 'Dorian', ['Lydian', 'Ionian', 'Locrian'], 'Minor, with that bright raised 6th.'),
        ])),
    ], 'Seven white-key modes, each one note away from major or minor.')

    T('musician-texture', 6, 'Texture: melody, chords and voices', ['theory-phrases-and-form', 'accompaniment-patterns'], [
        S("""**Texture** is how the sounds are layered. **Monophony**: one line alone (a folk singer, a flute). **Homophony**: a tune
        with chords under it (most songs, and most of what you play). **Polyphony**: two or more tunes at once, each
        independent (a canon, a Bach minuet's two hands).""", terms=['texture', 'monophony', 'homophony', 'polyphony', 'counterpoint'],
          sound='C4:q D4:q E4:q C4:q | C3+E4:q G3+D4:q C3+E4:q G3+C4:q | C4:q D4:q E4:q C4:q'),
        S("""Writing two independent lines is **counterpoint**. Piano music also has its own textures: **Alberti bass** (broken chords
        in the left hand, Mozart's favourite), **chorale** (four voices moving together, like a choir) and **melody and
        accompaniment** with the pedal (Chopin).""", check=check('A round like "Frère Jacques" sung as a canon is...', 'Polyphony', ['Monophony', 'Homophony'], 'Several independent lines at once.')),
        X(quiz('musician-texture-quiz', 'Texture: quiz', [
            Q('One tune with no accompaniment is...', 'Monophony', ['Homophony', 'Polyphony'], 'Mono = one.'),
            Q('A tune with chords underneath is...', 'Homophony', ['Monophony', 'Polyphony'], 'One leading line, the rest supports it.'),
            Q('Two or more independent tunes at once is...', 'Polyphony', ['Homophony', 'Monophony'], 'Poly = many.'),
            Q('The art of writing independent lines together is...', 'Counterpoint', ['Harmony', 'Rhythm', 'Orchestration'], 'Point against point: note against note.'),
            Q('Broken chords low-high-middle-high in the left hand are...', 'An Alberti bass', ['A chorale', 'A canon', 'A drone'], 'Named after Domenico Alberti.'),
            Q('Four voices moving together in chords, like a hymn, is a...', 'Chorale texture', ['Canon', 'Fugue', 'Solo'], 'Bach harmonised hundreds of chorales.'),
            Q('A canon is a kind of...', 'Polyphony', ['Monophony', 'Homophony'], 'The same tune, starting at different times.'),
            Q('A held low note under changing harmony is a...', 'Pedal point (drone)', ['Passing note', 'Suspension', 'Grace note'], 'Named after the organ pedals.'),
            Q('Most pop songs are...', 'Homophonic', ['Monophonic', 'Polyphonic'], 'A voice over chords.'),
            Q('A Bach minuet, with a real tune in each hand, leans towards...', 'Polyphony', ['Monophony', 'Homophony'], 'Both hands have melodies.'),
        ])),
    ], 'One line, a tune with chords, or many lines: texture.')

    T('musician-eras', 7, 'Four hundred years in four eras', ['musician-texture', 'theory-tempo-words'], [
        S("""Musicians place a piece by its **era**. **Baroque** (about 1600–1750): Bach, Handel, Vivaldi, Scarlatti. Harpsichord and
        organ, busy counterpoint, steady driving rhythm, ornaments, loud and soft in blocks ("terraced" dynamics). In the app:
        Bach's Prelude in C, the Minuet in G (Petzold), Pachelbel's Canon.""", terms=['Baroque', 'Classical', 'Romantic', 'Modern', 'era']),
        S("""**Classical** (about 1750–1820): Haydn, Mozart, young Beethoven, Clementi. Clear balanced phrases (question and answer),
        tune and accompaniment (Alberti bass), sonata form, the new piano with real crescendos. In the app: Eine kleine
        Nachtmusik, the Turkish March, the Sonatina in C, Ode to Joy."""),
        S("""**Romantic** (about 1820–1900): late Beethoven, Schubert, Chopin, Schumann, Liszt, Brahms, Tchaikovsky. Big feeling, rich
        chords, the sustain pedal, **rubato** (stretching the time), short **character pieces** (nocturnes, songs without
        words). In the app: Für Elise sits on the border; the Nocturne and the Evening Song are in this style."""),
        S("""**Modern** (1900 on): Debussy and Ravel (colour, modes, whole-tone scales), Satie (calm and simple), Stravinsky and Bartók
        (rhythm, folk music, clashes), and **jazz and popular** music (swing, blues, seventh chords). In the app: Gymnopédie
        No. 1, the blues.""", check=check('Steady counterpoint, ornaments and a harpsichord point to...', 'Baroque', ['Classical', 'Romantic', 'Modern'], 'Bach\'s world.')),
        X(quiz('musician-eras-quiz', 'The eras: quiz', [
            Q('J. S. Bach belongs to the...', 'Baroque era', ['Classical era', 'Romantic era', 'Modern era'], 'He died in 1750, the end of the Baroque.'),
            Q('Mozart belongs to the...', 'Classical era', ['Baroque era', 'Romantic era', 'Modern era'], '1756–1791.'),
            Q('Chopin belongs to the...', 'Romantic era', ['Classical era', 'Baroque era', 'Modern era'], '1810–1849: nocturnes, ballades, rubato.'),
            Q('Debussy belongs to the...', 'Modern era (Impressionism)', ['Romantic era', 'Classical era', 'Baroque era'], 'Colour, modes and whole-tone scales.'),
            Q('Beethoven bridges...', 'Classical and Romantic', ['Baroque and Classical', 'Romantic and Modern', 'Baroque and Romantic'], 'He started like Haydn and ended a Romantic.'),
            Q('Alberti bass and balanced question-and-answer phrases are typical of the...', 'Classical era', ['Baroque era', 'Modern era'], 'Mozart and Haydn.'),
            Q('Rubato, rich pedalling and character pieces are typical of the...', 'Romantic era', ['Baroque era', 'Classical era'], 'Chopin and Schumann.'),
            Q('"Terraced" dynamics (loud and soft in blocks) are typical of the...', 'Baroque era', ['Romantic era', 'Classical era'], 'The harpsichord could not crescendo.'),
            Q('Sonata form was developed in the...', 'Classical era', ['Baroque era', 'Modern era'], 'Haydn, Mozart, Beethoven.'),
            Q('Which instrument was new and exciting in the Classical era?', 'The piano (fortepiano)', ['The harpsichord', 'The organ', 'The synthesiser'], 'It could play soft (piano) and loud (forte).'),
            Q('Satie\'s Gymnopédie No. 1 (1888) points to...', 'The calm, modern style of the 1900s', ['The Baroque', 'The Classical era'], 'Simple chords, modal colour, no drama.'),
            Q('Swing, blue notes and seventh chords come from...', 'Jazz and blues', ['The Baroque', 'The Classical era'], 'American music of the 1900s.'),
            Q('Pachelbel\'s Canon is...', 'Baroque', ['Classical', 'Romantic'], 'About 1680, a canon over a repeating bass.'),
            Q('Für Elise is by...', 'Beethoven', ['Mozart', 'Bach', 'Chopin'], 'Written around 1810.'),
            Q('Eine kleine Nachtmusik is by...', 'Mozart', ['Haydn', 'Beethoven', 'Handel'], '1787.'),
        ])),
    ], 'Baroque, Classical, Romantic, Modern: place a piece by its sound.')

    T('musician-talk', 8, 'Talking about a piece', ['musician-eras', 'cadence-types', 'harmony-modulation'], [
        S("""Musicians describe a piece in a few strokes: its **key** and **meter**, its **form** (binary AB, ternary ABA, rondo,
        sonata, theme and variations), where it **modulates**, its **cadences**, its **texture**, its **era** and **character**
        (the Italian words at the top). You know all of these words now.""", terms=['analysis', 'binary', 'ternary', 'rondo', 'coda', 'development', 'recapitulation']),
        S("""For example, the **Minuet in G**: G major, 3/4, binary form (two halves, each repeated), the first half ending in the
        dominant (D major), Baroque, two-part counterpoint, *moderato*, graceful. Try describing a piece you play the same
        way.""", callout='Key · meter · form · modulation · cadences · texture · era · character'),
        X(quiz('musician-talk-quiz', 'Talking about music: quiz', [
            Q('A piece in two halves, each repeated (AABB), is in...', 'Binary form', ['Ternary form', 'Rondo form', 'Sonata form'], 'Bi = two parts.'),
            Q('A B A, the opening coming back after a contrast, is...', 'Ternary form', ['Binary form', 'Rondo form'], 'Ter = three parts.'),
            Q('A B A C A, the main tune returning between episodes, is a...', 'Rondo', ['Sonata', 'Minuet', 'Fugue'], 'The refrain keeps coming round.'),
            Q('Exposition, development, recapitulation are the parts of...', 'Sonata form', ['Rondo form', 'Binary form', 'Theme and variations'], 'The big form of the Classical era.'),
            Q('The ending section added after the main form is the...', 'Coda', ['Bridge', 'Intro', 'Cadenza'], 'Coda = tail.'),
            Q('"Andante" at the top of a piece describes its...', 'Tempo (walking pace)', ['Dynamics', 'Key', 'Form'], 'Andante comes from "to walk".'),
            Q('"Dolce" means...', 'Sweetly', ['Loudly', 'Detached', 'Getting faster'], 'A character word.'),
            Q('"Cantabile" means...', 'In a singing style', ['Very fast', 'Very soft', 'Held back'], 'Make the tune sing.'),
            Q('"Rubato" means...', 'Stretching and giving back the time', ['Exactly in time', 'Getting louder', 'Short and detached'], 'Robbed time: Romantic music lives on it.'),
            Q('"Ritardando" (rit.) means...', 'Gradually slower', ['Gradually louder', 'Suddenly loud', 'Back to the tempo'], 'Usually near an ending.'),
            Q('"Sforzando" (sf) means...', 'A sudden strong accent', ['Very soft', 'Smoothly', 'Slowing down'], 'Forced.'),
            Q('The Minuet in G, first half, ends in D major. That is a modulation to the...', 'Dominant', ['Subdominant', 'Relative minor', 'Tonic minor'], 'D is V of G.'),
            Q('A theme played again and again with changes is...', 'Theme and variations', ['A rondo', 'A fugue', 'A minuet'], 'Like the Lightly Row variations.'),
            Q('A short Romantic piece with one mood, like a nocturne, is a...', 'Character piece', ['Sonata', 'Suite', 'Concerto'], 'Chopin, Schumann, Mendelssohn wrote many.'),
            Q('Describing a piece\'s key, form, cadences and texture is called...', 'Analysis', ['Transposition', 'Improvisation', 'Orchestration'], 'What music students do every week.'),
        ])),
    ], 'Key, meter, form, modulation, cadences, texture, era, character.')
