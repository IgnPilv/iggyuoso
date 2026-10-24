# "Where Is My Mind" (Pixies, 1988), in Maxence Cyrin's piano version: a ladder of seven song lessons
# from the riff to the whole piece. Not public domain: added at the owner's explicit request
# (CLAUDE.md, 2026-10-24). Transcribed from his two-track MIDI (E major, 4/4; the file says quarter = 120, but the recording is about 72), with
# the fermatas left out, the 32nd-note turn written as two sixteenths and one empty bar dropped.
# Runs after the older generators so their lesson files keep their numbers.
from lib import *

TITLE = 'Where Is My Mind'
ABOUT = 'Pixies, 1988 · piano version by Maxence Cyrin'
KEY, METER, TEMPO = 'E', '4/4', 72

# ---------------------------------------------------------------- the right hand, section by section

RIFF = 'E5:e G#5:e E5:e G#5:e E5:e G#5:e E5:e G#5:e'
RIFF2 = 'D#5:e G#5:e D#5:e G#5:s D#5:s E5:e E5:s D#5:s E5:e G#5:e'
RIFF2_INTO_VERSE = 'D#5:e G#5:e D#5:e G#5:s D#5:s E5:e E5:s D#5:s E5:e. E4:s'
RIFF2_INTO_END = 'D#5:e G#5:e D#5:e G#5:s D#5:s E5:e E5:s D#5:s E5:e F#5:e'
VERSE = ['G#4:e G#4:s E4:q E4:s D#4:e D#4:s G#3:q r:s',
         'r:h r:q r:s D#4:s E4:e',
         'G#4:e G#4:s E4:q E4:s D#4:e D#4:s C#4:e. D#4:e~',
         'D#4:h r:q r:e. D#4:s',
         'E4:e E4:s D#4:q D#4:s C#4:e C#4:s D#4:q C#4:s',
         'G#4:e F#4:s E4:q C#4:s G#4:e F#4:s E4:q r:s']
HOOK = ['r:e G#5:e. G#5:e. C#5:h', 'r:e G#5:e. G#5:e. C#5:q A5:q', 'r:e G#5:e. G#5:e. C#5:h', 'r:w']
BREAK = ['C4+E4:w', 'r:q E4+G#4:q B5+D#6+F#6:q r:e. E4:s']
CHORUS = ['B5:q. A5:s F#5:s G#5:q. r:s G#5:s',
          'F#5:q. r:s F#5:s E5:s D#5:s C#5:s D#5:s E5:s F#5:s G#5:s A5:s',
          'B5:q. A5:s F#5:s G#5:q. r:s G#5:s',
          'F#5:q. r:s F#5:s E5:s F#5:s G#5:s A5:s B5:s C#6:s D#6:e~',
          'D#6:q E5+E6:q D#5+D#6:h', 'r:w', 'r:q E5+E6:q D#5+D#6:h', 'r:w']
ENDING = ['G#5:w~', 'G#5:w']

# ---------------------------------------------------------------- the left hand, three ways

# The chords: two to a bar, E C#m | G# A. G# is major (B#, the key you know as C).
CHORDS = [('E', 'C#m'), ('G#', 'A')]
ROOT3 = {'E': 'E3', 'C#m': 'C#3', 'G#': 'G#2', 'A': 'A2'}          # easy: one bass note, middle of the bass staff
ROOTS = 'E3:h C#3:h | G#2:h A2:h'
BASS_CHORD = ['E2:q G#3+B3+E4:q C#2:q G#3+C#4+E4:q', 'G#2:q G#3+B#3+D#4:q A2:q A3+C#4+E4:q']
BASS_CHORD_INTO = 'G#2:q G#3+B#3+D#4:q A2:q A3+C#4:q'                # leaves E4 free for the right hand's upbeat
BASS_TWO = ['E2:q G#3+B3:q C#2:q C#3+E3:q', 'G#2:q G#3+B#3:q A2:q A3+C#4:q']
ARP = ['E2:e B2:e G#3:e B2:e C#2:e G#2:e E3:e G#2:e', 'G#2:e D#3:e B#3:e D#3:e A2:e E3:e C#4:e E3:e']
ARP_END = 'G#2:e D#3:e B#3:e D#3:e A2:e E3:e C#4:q'
HELD = ['G#3+B3+E4:h G#3+C#4+E4:h', 'G#3+B#3+D#4:h A3+C#4+E4:h']
FIFTHS = ['E2:q B2:q C#2:q G#2:q', 'G#2:q D#3:q A2:q E3:q']
BREAK_LH = ['A2:w', 'C#3:h B2:h']
BREAK_ROOTS = ['A2:w', 'C#3:h B2:h']
END_LH = ['E2:w~', 'E2:w']

def bars(*parts): return ' | '.join(parts)
def loop(pair, n, last=None):
    """n bars of a two-bar pattern; `last` replaces the final bar."""
    out = [pair[i % 2] for i in range(n)]
    if last: out[-1] = last
    return out

# ---------------------------------------------------------------- the whole piece (43 bars)

def sections(lh):
    """(right, left) bar lists of the whole song; lh picks the left hand: roots, bass (bass + chord), full."""
    R, L = [], []
    def add(r, l): R.extend(r); L.extend(l)
    roots = lambda n, last=None: loop([ROOTS.split(' | ')[0], ROOTS.split(' | ')[1]], n, last)
    if lh == 'roots':
        add([RIFF, RIFF], ['E3:w~', 'E3:w'])
        add([RIFF, RIFF2, RIFF, RIFF2_INTO_VERSE], roots(4))
        add(VERSE, roots(6))
        add(HOOK, roots(4))
        add(BREAK, BREAK_ROOTS)
        add(VERSE, roots(6))
        add(HOOK, roots(4))
        add(CHORUS, roots(8))
        add([RIFF, RIFF2, RIFF, RIFF2, RIFF, RIFF2_INTO_END], roots(6))
        add(ENDING, ['E3:w~', 'E3:w'])
    else:
        full = lh == 'full'
        add([RIFF, RIFF], END_LH)
        add([RIFF, RIFF2, RIFF, RIFF2_INTO_VERSE], loop(BASS_CHORD, 4, BASS_CHORD_INTO))
        add(VERSE, loop(BASS_TWO, 6))
        add(HOOK, loop(BASS_CHORD, 4))
        add(BREAK, BREAK_LH)
        add(VERSE, loop(ARP, 6, ARP_END) if full else loop(BASS_TWO, 6))
        add(HOOK, loop(ARP, 4) if full else loop(BASS_CHORD, 4))
        add(CHORUS, loop(ARP, 8, ARP_END) if full else loop(BASS_CHORD, 8))
        add([RIFF, RIFF2, RIFF, RIFF2, RIFF, RIFF2_INTO_END], loop(BASS_CHORD, 6))
        add(ENDING, END_LH)
    return bars(*R), bars(*L)

def pedal_line(n_bars):
    """The pedal as in the MIDI: a change with every chord, two to a bar; held through the long E at both ends."""
    out = []
    for i in range(n_bars):
        out.append('x:w' if i in (0, 1, n_bars - 2, n_bars - 1) else 'x:h x:h')
    return ' | '.join(out)

# ---------------------------------------------------------------- lessons

PREV = None
def song_lesson(n, slug, title, stage, requires, steps, recap):
    global PREV
    lid = f'song-wim-{slug}' if slug else 'song-wim'
    full = f'{TITLE} (Maxence Cyrin) {n}: {title}' if slug else f'{TITLE} (Maxence Cyrin)'
    lesson(lid, full, steps, recap, skills=['songs'])
    # The steps belong to the whole-song node (song-wim): the songbook lists the song once.
    node(lid, 'songs', stage, full, list(dict.fromkeys(([PREV] if PREV else []) + requires)), about=ABOUT, song='song-wim' if slug else None)
    PREV = lid
    return lid

common = dict(meter=METER, key=KEY, display='staff')

def run(base):
    # 1 ---------------------------------------------------------------- the riff
    song_lesson(1, 'riff', 'the riff', 4, ['y1-exit', 'rhythm-eighths-two-hands', 'technique-broken-chords'], [
        S(f"""**{TITLE}** · {ABOUT}

        A rock song by the American band Pixies, played here as Maxence Cyrin's solo piano version: a right hand that
        rocks between two notes over a slow bass. Seven lessons build it up a piece at a time: the riff, the four chords,
        the verse, the "ooh" and the break, the rolling left hand, the chorus, then the whole song.

        It is still under copyright, so it is in the songbook because you asked for it.""",
          staff=staff(bars(RIFF, RIFF2), key=KEY), sound=bars(RIFF, RIFF2, RIFF, RIFF2)),
        S("""**The key of E major** has four sharps: F♯, C♯, G♯ and D♯. The riff uses just three notes of it:
        **E** and **G♯** above them (a major third apart), and **D♯**, the note just below E that leans back up to it.

        Right hand: thumb on E, middle finger on G♯; the D♯ is the thumb sliding down one key, a black one.""",
          keys=keys('E5 G#5 D#5', fingers='1 3 1'), callout='E major: F♯ C♯ G♯ D♯. The riff: E and G♯, with D♯ leaning back to E.',
          terms=['E major', 'major third', 'riff'],
          check=check('How many sharps does E major have?', 'Four', ['Two', 'Three', 'Five'], 'F♯, C♯, G♯ and D♯: four sharps.')),
        X(tap('song-wim-riff-tap', f'{TITLE}: tap the riff', bars(*[rx('e e e e e e e e')] * 2, rx('e e e s s e s s e e'), rx('e e e e e e e e')),
              meter=METER, tempo=60, reps=2, days=1, display='staff',
              prompt='The riff is steady eighths, two to every beat: "1 and 2 and". Bar 3 hides two quick pairs of sixteenths.')),
        X(tap2('song-wim-riff-tap-hands', f'{TITLE}: riff over the bass', bars(*[rx('e e e e e e e e')] * 4), bars(*[rx('h h')] * 4),
               meter=METER, tempo=60, reps=2, days=1, display='staff',
               prompt='Right hand in eighths, left hand in halves: two left-hand taps to every eight on the right.')),
        X(timed('song-wim-riff-rh', f'{TITLE}: the riff', right=bars(RIFF, RIFF, RIFF, RIFF2, RIFF, RIFF2), tempo=60, reps=3, days=2,
                prompt='Right hand alone. Keep the wrist loose and rock between thumb and third finger, like a little seesaw.', **common)),
        X(timed('song-wim-riff-roots', f'{TITLE}: bass notes', left=bars('E3:w', 'E3:w', ROOTS, ROOTS), tempo=60, reps=2, days=1,
                prompt='Left hand alone: E, then four roots, two to a bar: E, C♯, G♯, A. Each one rings for two beats.', **common)),
        X(timed('song-wim-riff-together', f'{TITLE}: riff and bass', right=bars(RIFF, RIFF, RIFF, RIFF2, RIFF, RIFF2),
                left=bars('E3:w', 'E3:w', ROOTS, ROOTS), tempo=60, reps=3, days=2,
                prompt='Both hands. The left hand lands with the first eighth of each half bar; the riff never stops.', **common)),
    ], 'The riff: E and G♯ rocking in eighths, D♯ leaning back home, over four bass notes.')

    # 2 ---------------------------------------------------------------- the four chords
    song_lesson(2, 'chords', 'the four chords', 5, ['y2-checkpoint-a', 'theory-minor-chords', 'theory-enharmonics', 'harmony-other-chords'], [
        S("""The whole song is **four chords**, two beats each, round and round: **E**, **C♯ minor**, **G♯** and **A**.

        In E major they are **I**, **vi**, **III** and **IV**. Three of them belong to the key. The third one is a surprise.""",
          staff=staff('E4+G#4+B4:h C#4+E4+G#4:h | G#4+B#4+D#5:h A4+C#5+E5:h', key=KEY),
          sound='E3+G#3+B3+E4:h C#3+G#3+C#4+E4:h | G#2+G#3+B#3+D#4:h A2+A3+C#4+E4:h',
          terms=['I', 'vi', 'III', 'IV'], callout='E – C♯m – G♯ – A: I – vi – III – IV.'),
        S("""**The surprise chord.** In E major the chord on G♯ is normally *minor* (G♯ B D♯). Here it is **major**:
        G♯ **B♯** D♯. B♯ is a third above G♯, so it is written as a kind of B, but you play it on the white key you know as
        **C**. Same key, a different name for what it does.

        That bright B♯ is what gives the song its floating, slightly strange colour.""",
          keys=keys('G#3 C4 D#4', labels='names'), sound='G#3+B3+D#4:h G#3+B#3+D#4:h',
          check=check('Which key do you press for B♯?', 'C', ['B', 'C♯', 'A♯'], 'B♯ is a semitone above B: that is the white key C.')),
        S("""**Hear the chords move.** In the left hand the chords sit close together: the top notes hardly move.
        G♯ stays on top of E and C♯m; only one or two fingers step each time. Find the shapes, then keep them under your
        fingers: 5 on the lowest note, 1 on the top.""",
          check=check('What is the Roman numeral of A major in E major?', 'IV', ['V', 'iv', 'VI'], 'A is the fourth note of E major, and the chord is major: IV.')),
        X(build_ex('song-wim-chords-build', f'{TITLE}: find the four chords', [
            {'chord': 'E', 'octave': 3}, {'chord': 'C#m', 'octave': 3}, {'chord': 'G#', 'octave': 3}, {'chord': 'A', 'octave': 3},
            {'notes': 'G#3 B3 E4', 'ask': 'E, the way the song plays it: G♯ B E', 'together': True},
            {'notes': 'G#3 B#3 D#4', 'ask': 'G♯ major, the way the song plays it: G♯ B♯ D♯', 'together': True}],
            prompt='Hold each chord down together. Remember B♯ is the white key C.', reps=3, days=1)),
        X(ear('song-wim-chords-ear', f'{TITLE}: which progression?', [
            {'type': 'progression', 'key': ['E'], 'pool': ['I vi III IV', 'I vi IV V', 'I V vi IV', 'I IV V I'], 'choices': 4},
            {'type': 'function', 'key': 'E', 'pool': ['I', 'vi', 'III', 'IV']}], questions=12, reps=2, days=2,
            prompt='Four chords play: is it the song\'s I vi III IV, or another famous one? Then single chords: name them.')),
        X(timed('song-wim-chords-held', f'{TITLE}: held chords', left=bars(*HELD, *HELD), tempo=58, reps=2, days=1,
                prompt='Left hand: the four chords, two beats each. Move only the fingers that must move.', **common)),
        X(timed('song-wim-chords-pattern', f'{TITLE}: bass and chord', left=bars(*loop(BASS_CHORD, 4)), tempo=58, reps=3, days=2,
                prompt='Now the real pattern: a low bass note, then the chord. Jump down, jump back, and look ahead to the next bass.', **common)),
        X(timed('song-wim-intro', f'{TITLE}: the intro', right=bars(RIFF, RIFF, RIFF, RIFF2, RIFF, RIFF2),
                left=bars(*END_LH, *loop(BASS_CHORD, 4)), tempo=60, reps=3, days=2,
                prompt='The intro as Maxence Cyrin plays it: the riff over a long low E, then over bass and chord.', **common)),
    ], 'Four chords, two beats each: E, C♯m, G♯ (with B♯, the key C) and A. I vi III IV.')

    # 3 ---------------------------------------------------------------- the verse
    verse_rhythm = bars(rx('e s q s e s q rs'), rx('rh rq rs s e'), rx('e s q s e s e. e'), rx('h rq re. s'),
                        rx('e s q s e s q s'), rx('e s q s e s q rs'))
    song_lesson(3, 'verse', 'the verse', 5, ['y2-checkpoint-a', 'song-wim-chords', 'sixteenth-notes', 'rhythm-sixteenth-patterns'], [
        S("""**The verse tune** sits low, around middle C, where a voice sings. Its rhythm is the hard part: **short – short – long**.

        Count four sixteenths in every beat: "**1** e and a". The first note takes "1 e", the second takes "and",
        and the long one starts on "a", just *before* beat 2, and holds over it. Arriving early like that is
        **syncopation**: it gives the tune its lazy swing.""",
          staff=staff(bars(VERSE[0]), key=KEY), sound=bars(VERSE[0], VERSE[1]),
          terms=['sixteenth', 'syncopation', '1 e and a'], callout='Eighth, sixteenth, then a long note that lands on "a" before the beat.'),
        S("""Clap or tap it first, saying the counts out loud. Then hear the tune and play it back. Only then put it under
        your fingers.""",
          check=check('A note that starts on "a" (the last sixteenth of beat 1) and is held over beat 2 is...', 'Syncopated', ['On the beat', 'A rest', 'A triplet'], 'It starts off the beat and holds across it: syncopation.')),
        X(tap('song-wim-verse-tap', f'{TITLE}: tap the verse', verse_rhythm, meter=METER, tempo=50, reps=3, days=2, display='staff',
              prompt='The verse rhythm alone, on any key. Count "1 e and a" under your breath.')),
        X(ear('song-wim-verse-echo', f'{TITLE}: verse by ear', [
            {'type': 'melody', 'notes': 'G#4 G#4 E4 E4 D#4 D#4', 'plays': 3, 'lit': True},
            {'type': 'melody', 'notes': 'E4 E4 D#4 D#4 C#4 C#4 D#4', 'plays': 3, 'lit': True},
            {'type': 'melody', 'notes': 'G#4 F#4 E4 C#4', 'plays': 3}], questions=6, reps=2, days=1,
            prompt='Play the verse\'s phrases back from hearing them. The lit keys are the ones the phrase uses.')),
        X(timed('song-wim-verse-rh', f'{TITLE}: the verse tune', right=bars(*VERSE), tempo=50, reps=3, days=2,
                prompt='Right hand alone. Thumb around C♯, and let the hand walk: the tune only moves by small steps, plus one dip to low G♯.', **common)),
        X(timed('song-wim-verse-roots', f'{TITLE}: verse over bass notes', right=bars(*VERSE), left=bars(ROOTS, ROOTS, ROOTS), tempo=50, reps=2, days=1,
                prompt='Both hands, the easy way: one bass note per chord while the right hand sings.', **common)),
        X(timed('song-wim-verse-lh', f'{TITLE}: verse left hand', left=bars(*loop(BASS_TWO, 6)), tempo=50, reps=2, days=1,
                prompt='The verse\'s left hand: bass, then two notes of the chord. Lighter than in the intro.', **common)),
        X(timed('song-wim-verse', f'{TITLE}: the verse', right=bars(*VERSE), left=bars(*loop(BASS_TWO, 6)), tempo=52, reps=3, days=2,
                prompt='Both hands. The left hand is steady quarters; the right hand floats over it, early and late.', **common)),
    ], 'The verse: short, short, long, with the long note arriving just before the beat.')

    # 4 ---------------------------------------------------------------- the ooh and the break
    hook_rhythm = bars(rx('re e. e. h'), rx('re e. e. q q'), rx('re e. e. h'), rx('rw'))
    song_lesson(4, 'hook', 'the "ooh" and the break', 6, ['y2-checkpoint-b', 'song-wim-verse', 'syncopation'], [
        S("""**The "ooh".** High in the right hand, two G♯s fall *between* the beats: the first after an eighth rest, the
        second three sixteenths later, then a long C♯ on beat 3. Count "1 **and** 2 **e** and a **3**".

        The left hand keeps the bass and chord from the intro underneath.""",
          staff=staff(bars(HOOK[0], HOOK[1]), key=KEY), sound=bars(HOOK[0], HOOK[1], HOOK[2]), terms=['dotted eighth', 'off the beat']),
        S("""**The break.** Two bars where the song holds its breath. First a soft **A minor** chord (C natural, borrowed from E
        minor, so it sounds darker), then C♯m and a bright **B major** (V) up high, rolled from the bottom, which leads
        back into the verse.""",
          staff=staff(bars(*BREAK), key=KEY), sound=bars(*BREAK),
          check=check('Which note turns A major into A minor?', 'C natural', ['C♯', 'G♯', 'E'], 'A major is A C♯ E; A minor is A C E. The C natural makes it minor.')),
        X(tap2('song-wim-hook-tap', f'{TITLE}: tap the "ooh"', hook_rhythm, bars(*[rx('q q q q')] * 4), meter=METER, tempo=50, reps=2, days=1,
               display='staff', prompt='Left hand on every beat, right hand in between. Don\'t let the right hand pull the left off the beat.')),
        X(timed('song-wim-hook-rh', f'{TITLE}: the "ooh" and the break', right=bars(*HOOK, *BREAK), tempo=52, reps=3, days=2,
                prompt='Right hand alone. Fourth finger on G♯, thumb on C♯; in the break, the high chord is fingers 1 2 4.', **common)),
        X(timed('song-wim-hook-lh', f'{TITLE}: "ooh" left hand', left=bars(*loop(BASS_CHORD, 4), *BREAK_LH), tempo=52, reps=2, days=1,
                prompt='Left hand alone: bass and chord, then the break\'s long A and two bass notes.', **common)),
        X(timed('song-wim-hook', f'{TITLE}: "ooh" and break together', right=bars(*HOOK, *BREAK), left=bars(*loop(BASS_CHORD, 4), *BREAK_LH),
                tempo=58, reps=3, days=2, prompt='Both hands. Feel the right hand fall between the left hand\'s beats.', **common)),
        X(timed('song-wim-first-half', f'{TITLE}: intro to break', right=bars(RIFF, RIFF, RIFF, RIFF2, RIFF, RIFF2_INTO_VERSE, *VERSE, *HOOK, *BREAK),
                left=bars(*END_LH, *loop(BASS_CHORD, 4, BASS_CHORD_INTO), *loop(BASS_TWO, 6), *loop(BASS_CHORD, 4), *BREAK_LH),
                tempo=58, reps=3, days=2, prompt='The first half of the song, start to break: intro, verse, "ooh", break.', **common)),
    ], 'The "ooh" falls between the beats; the break borrows a dark A minor, then B major leads home.')

    # 5 ---------------------------------------------------------------- the rolling left hand
    song_lesson(5, 'arpeggios', 'the rolling left hand', 6, ['y2-checkpoint-b', 'song-wim-hook', 'technique-arpeggios-one-octave', 'accompaniment-patterns'], [
        S("""From the second verse the left hand **rolls**: root, fifth, the third an octave higher (a **tenth** above the
        root), fifth again, in eighths. Two chords to a bar, so eight eighths a bar, without a gap.

        Fingers 5 2 1 2 for every chord: the hand opens wide on the tenth, then closes back.""",
          staff=staff(bars(*ARP), clef='bass', key=KEY), sound=bars(*ARP, *ARP),
          keys=keys('E2 B2 G#3', fingers='5 2 1'), terms=['broken chord', 'tenth', 'arpeggio'],
          callout='Root – fifth – tenth – fifth, fingers 5 2 1 2.'),
        S("""Learn it in two steps: first only root and fifth in quarters, so the jumps between chords are safe. Then the
        full roll. G♯ major has B♯ on top: the white key C.""",
          check=check('E2, B2, G♯3: how far is G♯3 above E2?', 'A tenth (an octave and a third)', ['An octave', 'A fifth', 'A sixth'], 'E to G♯ is a third; an octave higher it is a tenth.')),
        X(timed('song-wim-fifths', f'{TITLE}: roots and fifths', left=bars(*loop(FIFTHS, 4)), tempo=54, reps=2, days=1,
                prompt='Left hand: root and fifth of each chord, in quarters. Fingers 5 and 2.', **common)),
        X(timed('song-wim-arp-lh', f'{TITLE}: the rolling left hand', left=bars(*loop(ARP, 4)), tempo=54, reps=3, days=2,
                prompt='The full roll: 5 2 1 2, eight eighths a bar. Even, and quieter than the tune will be.', **common)),
        X(tap2('song-wim-verse2-tap', f'{TITLE}: verse rhythm over eighths', verse_rhythm, bars(*[rx('e e e e e e e e')] * 6),
               meter=METER, tempo=50, reps=2, days=1, display='staff',
               prompt='Both rhythms at once on any keys: the verse on top, steady eighths below. Watch where the right hand lands between them.')),
        X(timed('song-wim-verse2', f'{TITLE}: second verse', right=bars(*VERSE), left=bars(*loop(ARP, 6, ARP_END)), tempo=50, reps=3, days=2,
                prompt='The second verse: the tune over the rolling left hand.', **common)),
        X(timed('song-wim-hook2', f'{TITLE}: "ooh" over the roll', right=bars(*HOOK), left=bars(*loop(ARP, 4)), tempo=54, reps=3, days=2,
                prompt='The "ooh" again, now over the rolling left hand.', **common)),
    ], 'The rolling left hand: root, fifth, tenth, fifth, fingers 5 2 1 2.')

    # 6 ---------------------------------------------------------------- the chorus
    chorus_line = [*CHORUS[:3], CHORUS[3].replace('D#6:e~', 'D#6:e')]
    song_lesson(6, 'chorus', 'the chorus', 7, ['y2-exit', 'song-wim-arpeggios', 'ks-e', 'rhythm-sixteenth-rests'], [
        S("""**The chorus**, the line of the title. A long high **B**, a quick turn down (A, F♯) into **G♯**, and a pickup G♯.
        Then F♯ and a run in sixteenths, down to C♯ and back up through the E major scale.

        The second time the run climbs on, up to a high D♯, and the right hand answers in **octaves**: E and D♯, thumb and
        fifth finger.""",
          staff=staff(bars(CHORUS[0], CHORUS[1]), key=KEY), sound=bars(*chorus_line),
          terms=['turn', 'scale run', 'octaves'], callout='B, turn into G♯; F♯ and a sixteenth run. Octaves to finish.'),
        S("""The run is the E major scale, so the fingering is the scale's: in the right hand thumb on E and B, and the
        black keys fall under 2, 3 and 4.""",
          check=check('Which notes are sharp in the run F♯ E D♯ C♯ D♯ E F♯ G♯ A?', 'F♯, D♯, C♯ and G♯', ['Only F♯', 'F♯ and C♯', 'All of them'], 'E major\'s four sharps: F♯, C♯, G♯ and D♯.')),
        X(tap('song-wim-chorus-tap', f'{TITLE}: tap the chorus', bars(rx('q. s s q. rs s'), rx('q. rs s s s s s s s s s')) + ' | ' +
              bars(rx('q. s s q. rs s'), rx('q. rs s s s s s s s e')), meter=METER, tempo=50, reps=2, days=1, display='staff',
              prompt='The chorus rhythm on any key: long, quick-quick, long; then a string of sixteenths.')),
        X(timed('song-wim-chorus-line', f'{TITLE}: the title line and the runs', right=bars(*chorus_line), tempo=50, reps=3, days=2,
                prompt='Right hand alone, slowly. Thumb under after D♯ on the way up; keep the sixteenths even.', **common)),
        X(timed('song-wim-chorus-rh', f'{TITLE}: the chorus tune', right=bars(*CHORUS), tempo=50, reps=3, days=2,
                prompt='The whole chorus in the right hand, octaves included: thumb and fifth finger, hand light.', **common)),
        X(timed('song-wim-chorus-lh', f'{TITLE}: chorus left hand', left=bars(*loop(ARP, 8, ARP_END)), tempo=54, reps=2, days=1,
                prompt='Eight bars of the rolling left hand. Keep it soft under the octaves.', **common)),
        X(timed('song-wim-chorus', f'{TITLE}: the chorus', right=bars(*CHORUS), left=bars(*loop(ARP, 8, ARP_END)), tempo=58, reps=3, days=2,
                prompt='Both hands. Two even streams: sixteenths on top, eighths below, meeting on every beat.', **common)),
    ], 'The chorus: a long B and a turn, a sixteenth run through E major, octaves to finish.')

    # 7 ---------------------------------------------------------------- the whole song
    easy_r, easy_l = sections('roots')
    mid_r, mid_l = sections('bass')
    full_r, full_l = sections('full')
    n = len(full_r.split('|'))
    song_lesson(7, None, None, 7, ['y2-exit', 'song-wim-chorus', 'pedal-legato', 'ear-progressions'], [
        S(f"""**{TITLE}**, the whole song: intro, verse, "ooh", break, second verse with the rolling left hand, "ooh",
        chorus and the riff again to finish. {n} bars.

        Three versions, easiest first: the tune over bass notes, then over bass and chord, then Maxence Cyrin's full
        arrangement with the rolling left hand. The last take adds the pedal, changing with every chord.""",
          staff=staff(bars(RIFF, RIFF2), key=KEY), sound=bars(RIFF, RIFF2, RIFF, RIFF2_INTO_VERSE, *VERSE[:2]),
          callout=f'Key: E major · Time: 4/4 · Tempo: {TEMPO} · Form: intro, verse, ooh, break, verse, ooh, chorus, outro'),
        X(timed('song-wim-easy', f'{TITLE}, easy version', right=easy_r, left=easy_l, tempo=58, reps=2, days=1,
                prompt='The whole tune over one bass note per chord. The map of the song under your fingers.', **common)),
        X(timed('song-wim-medium', f'{TITLE}, with bass and chord', right=mid_r, left=mid_l, tempo=62, reps=2, days=2,
                prompt='The whole song with the intro\'s bass-and-chord left hand everywhere.', **common)),
        X(timed('song-wim-full', f'{TITLE}, full arrangement', right=full_r, left=full_l, tempo=TEMPO, reps=3, days=2,
                prompt='Maxence Cyrin\'s arrangement: the rolling left hand from the second verse on. The tempo ladder brings you up to speed.', **common)),
        X(timed('song-wim-performance', f'{TITLE}: performance', right=full_r, left=full_l, tempo=TEMPO, ladder=False, reps=2, days=2,
                pedal=pedal_line(n), prompt='Full tempo, with the pedal changing on every chord, start to end, as if someone is listening.', **common)),
    ], f'{TITLE}, start to end: three versions and a pedalled performance.')
