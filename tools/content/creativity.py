# The creativity branch: making your own music. Improvising and composing exercises are
# `kind: improvise`: the player makes up the notes inside a frame (a scale, chords the app plays,
# a rhythm, a phrase to answer) and the take is checked for its musical choices; good takes go to
# the Sketchbook. Rhythm conversations stay taps; arranging and transposing are written out.
from lib import *

def L(id, stage, title, requires, steps, recap):
    lesson(id, title, steps, recap, skills=['creativity'])
    node(id, 'creativity', stage, title, requires, type='lesson')

MARY = 'E4:q D4:q C4:q D4:q | E4:q E4:q E4:h | D4:q D4:q D4:h | E4:q G4:q G4:h | E4:q D4:q C4:q D4:q | E4:q E4:q E4:q E4:q | D4:q D4:q E4:q D4:q | C4:w'
MARY_CHORDS = 'C | C | G | C | C | C | G | C'
BLUES = 'C7 | F7 | C7 | C7 | F7 | F7 | C7 | C7 | G7 | F7 | C7 | G7'
KEEP = 'When a take comes out well, press **Keep in Sketchbook**: composers keep notebooks of ideas, and so can you.'

def run(base):
    L('creativity-rhythm-conversation', 1, 'A rhythm conversation', [], [
        S("""**Making music starts with play.** The app asks a question in rhythm; you answer. First copy it exactly. Then,
        in the free rounds, answer with **your own** rhythm on any keys: the app only checks that you keep the beat.""",
          callout='There are no wrong notes in the free rounds. Choose any keys, high or low.'),
        X(rread('gen-echo-conversation', 'Copy my rhythm', ['q', 'h'], bars=1, tempo=80, echo=True, reps=3, days=1)),
        X(tap('cr-answer-quarters', 'Your answer: four quarters, any keys', rx('q q q q | q q q q | q q q q | w'), tempo=80, ladder=False, reps=2, days=1,
              prompt='Play any keys you like on these beats: make it sound like a little tune. High, low, black, white: your choice.')),
        X(tap('cr-answer-long-short', 'Your answer: long and short', rx('q q h | q q h | h q q | w'), tempo=80, ladder=False, reps=2, days=1,
              prompt='Any keys, this rhythm. Try ending on a low key: it sounds finished.')),
    ], 'Music is a conversation. You can already answer.')

    L('creativity-black-key-tunes', 1, 'Tunes on the black keys', ['creativity-rhythm-conversation', 'c-d-e'], [
        S("""The five black keys make a scale that always sounds good together: the **pentatonic scale**. Play any of them
        in the given rhythm. Make your tune go up, then come back down.""", keys=keys('C#4 D#4 F#4 G#4 A#4'), sound='F#4:q G#4:q A#4:q C#5:q | A#4:h F#4:h'),
        X(improv('cr-black-keys-1', 'Black-key tune, right hand', 4, ['inScale', 'rhythm', {'variety': 3}, {'endOn': 'F#'}], tempo=84, key='F#', hand='right',
                 scale='C# D# F# G# A#', rhythm=rx('q q q q | h h | q q q q | w'), reps=2, days=1,
                 prompt='Black keys only, any of them, in this rhythm. Go up, then come home to F♯ at the end.')),
        X(improv('cr-black-keys-hands', 'Black keys with a drum', 4, ['inScale', 'rhythm', {'variety': 3}], tempo=80, key='F#', hand='together',
                 scale='C# D# F# G# A#', rhythm=rx('q q q q | h h | q q q q | w'), reps=2, days=1,
                 prompt='Left hand: one low black key in half notes, like a drum. Right hand: your tune on the black keys above middle C, in this rhythm.')),
    ], 'Black keys: a scale with no wrong notes.')

    L('creativity-question-answer', 2, 'Question and answer', ['creativity-black-key-tunes', 'pentatonic-improv'], [
        S("""A **question** phrase ends up in the air (on D, E or G); the **answer** comes home to C. Make up both, in C position,
        in this rhythm. Bars 1–2 are the question, bars 3–4 the answer.""", sound='C4:q D4:q E4:q F4:q | G4:h D4:h | E4:q D4:q E4:q F4:q | D4:h C4:h'),
        X(improv('cr-qa-c', 'Question and answer in C', 4, ['inScale', 'rhythm', {'questionAnswer': 2}, {'range': 'C4-G4'}], tempo=80, key='C', hand='right',
                 scale='C D E F G', rhythm=rx('q q q q | h h | q q q q | h h'), example='C4:q D4:q E4:q F4:q | G4:h D4:h | C4:q D4:q E4:q D4:q | D4:h C4:h', reps=3, days=2,
                 prompt='White keys C to G. End bar 2 on D, E or G (a question); start bar 3 like bar 1 and end bar 4 on C (the answer).')),
        X(improv('cr-qa-hands', 'Question and answer over a bass', 4, ['inScale', 'rhythm', 'bassRoots', {'questionAnswer': 2}], tempo=76, key='C', hand='together',
                 scale='C major', chords='C | G | C | C', rhythm=rx('q q q q | h h | q q q q | h h'), reps=3, days=2,
                 prompt='Left hand: a low C at the start of each bar (bar 2: G). Right hand: your question and answer in C position.')),
    ], 'Questions go away; answers come home.')

    L('creativity-make-a-bass', 4, 'Make a bass line', ['creativity-question-answer', 'lh-chords', 'y1-exit'], [
        S("""Over a tune, the left hand can play just the **root** of each chord, in a rhythm you choose. Here the right hand is
        written; the left hand plays any key below middle C in the given rhythm. Try roots first, then experiment."""),
        X(timed('cr-bass-mary-roots', 'Mary with a root bass', right=MARY, left=accompany(MARY_CHORDS, '4/4', 'root'), tempo=88, display='staff')),
        X(tap2('cr-bass-your-rhythm', 'Your own bass rhythm', rx('q q q q | q q h | q q h | q q h'), rx('q rq q rq | h h | q. e h | w'), tempo=76, ladder=False, reps=2, days=1,
               prompt='Right hand: any notes of C position. Left hand: any low keys in this bouncing rhythm.')),
    ], 'A bass line is the floor a tune stands on.')

    L('creativity-choose-accompaniment', 6, 'Choose an accompaniment', ['accompaniment-patterns', 'technique-alberti'], [
        S("""One tune, six left hands. The **style** of the accompaniment changes the whole character: try them all and decide
        which you like best."""),
        *[X(timed(f'cr-mary-{st}', f'Mary Had a Little Lamb: {word}', right=MARY, left=accompany(MARY_CHORDS, '4/4', st), tempo=84, display='staff', reps=2, days=1))
          for st, word in [('fifth', 'root and fifth'), ('block', 'held chords'), ('pulse', 'a chord on every beat'), ('oompah', 'oom-pah'), ('broken', 'broken chords'), ('alberti', 'Alberti bass')]],
    ], 'The same tune, six characters.')

    L('creativity-transpose-tune', 6, 'One tune, four keys', ['transposing', 'theory-transposition'], [
        S("""Play the same tune with its chords in seven keys. Think in **degrees**: the tune is 3 2 1 2 3 3 3, whatever the key."""),
        *[X(timed(f'cr-mary-in-{k.lower()}', f"Mary in {k.replace('b', '♭')} major", right=transpose_string(MARY, st, se), left=accompany(ch, '4/4', 'block'), tempo=84, key=k, display='staff', reps=2, days=1))
          for k, st, se, ch in [('G', 4, 7, 'G | G | D | G | G | G | D | G'), ('F', 3, 5, 'F | F | C | F | F | F | C | F'), ('D', 1, 2, 'D | D | A | D | D | D | A | D'),
                               ('A', 5, 9, 'A | A | E | A | A | A | E | A'), ('Bb', 6, 10, 'Bb | Bb | F | Bb | Bb | Bb | F | Bb'), ('E', 2, 4, 'E | E | B | E | E | E | B | E'), ('Eb', 5, 8, 'Eb | Eb | Bb | Eb | Eb | Eb | Bb | Eb')]],
    ], 'Degrees travel; letters change.')

    L('creativity-harmonise-minor', 7, 'Harmonising in minor', ['harmonise-i-iv-v', 'natural-minor', 'y2-exit'], [
        S("""A minor tune with i, iv and V. In A minor: Am, Dm and E (with G♯). Choose the chord whose notes match the tune's strong beats."""),
        X(timed('cr-harm-minor-1', 'Minor tune with three chords', right='A4:q B4:q C5:q A4:q | D5:h C5:h | B4:q G#4:q B4:q E5:q | A4:w',
                left=accompany('Am | Dm Am | E | Am', '4/4', 'block'), tempo=72, key='Am', display='staff')),
        X(timed('cr-harm-minor-2', 'Minor tune, broken chords', right='E5:q D5:q C5:q B4:q | A4:h C5:h | F5:q E5:q D5:q C5:q | B4:h E4:h | A4:q B4:q C5:q D5:q | E5:h A5:h | G#5:q E5:q D5:q B4:q | A4:w',
                left=accompany('Am | Am | Dm | E | Am | Am | E | Am', '4/4', 'broken'), tempo=72, key='Am', display='staff')),
    ], 'i, iv and V: minor keys have their own three chords.')

    L('creativity-minor-pentatonic', 7, 'The minor pentatonic', ['creativity-harmonise-minor', 'creativity-question-answer'], [
        S("""A C D E G: the **A minor pentatonic**. Five notes, no clashes, the sound of rock solos and folk songs.""", keys=keys('A4 C5 D5 E5 G5', labels='names'),
          sound='A4:q C5:q D5:q E5:q | G5:q A5:q G5:h'),
        X(timed('cr-am-pent-scale', 'A minor pentatonic, both hands', right='A4:q C5:q D5:q E5:q | G5:q A5:q G5:q E5:q | D5:q C5:q A4:h',
                left='A3:q C4:q D4:q E4:q | G4:q A4:q G4:q E4:q | D4:q C4:q A3:h', tempo=72, key='Am', rf='1 2 3 4 1 2 1 4 3 2 1', lf='5 4 3 2 1 2 1 2 3 4 5')),
        X(improv('cr-am-pent-improv', 'Improvise on A C D E G', 8, ['inScale', 'rhythm', 'bassRoots', {'endOn': 'A'}, {'variety': 4}], tempo=80, key='Am', hand='together',
                 scale='A minor pentatonic', chords='Am', rhythm=rx('e e q q q | h h | e e q q q | w | e e q q q | h h | q q q q | w'), reps=3, days=2,
                 prompt='Left hand: a low A at the start of each bar. Right hand: any of A C D E G, in this rhythm. End on A.')),
    ], 'Five notes for a lifetime of solos.')

    L('creativity-blues-improv', 9, 'Improvising the blues', ['technique-blues-shapes', 'creativity-minor-pentatonic'], [
        S("""The left hand plays the boogie; the right hand improvises on the **C blues scale**: C E♭ F F♯ G B♭ C. Leave space:
        short phrases, then rests, like a singer breathing.""", keys=keys('C4 Eb4 F4 F#4 G4 Bb4 C5', labels='names')),
        X(improv('cr-blues-improv', 'Twelve bars of your own', 12, ['inScale', {'rests': 2}, {'variety': 4}, {'endOn': 'C'}], tempo=88, key='C', hand='right',
                 scale='C blues', chords=BLUES, backing='chords', reps=3, days=2,
                 prompt='The app plays the twelve-bar blues. Your right hand: notes of the C blues scale (lit), in short phrases with rests between, like a singer breathing. End on C.')),
        S("""**Call and response** is the blues' own question and answer: a short phrase (the call), then a reply. In a blues
        the same line often comes twice (bars 1–4 and 5–8, over different chords), then a new line answers it (bars 9–12).
        This is called **AAB** form.""", terms=['call and response', 'AAB form', 'blues scale']),
        X(improv('cr-blues-head', 'Write a blues head (AAB)', 12, ['inScale', {'repeat': {'bars': 4, 'at': 4}}, {'rests': 2}, {'endOn': 'C'}], tempo=84, key='C', hand='right',
                 scale='C blues', chords=BLUES, backing='chords', reps=3, days=2,
                 prompt='A tune of your own over the blues: a four-bar line (with space in it), the same line again in bars 5–8, then a new line that ends on C. Keep the best one in your Sketchbook.')),
    ], 'Phrase, breathe, answer.')

    # The two first improvisations were hand-written as taps; they now listen to the notes too.
    ex('pentatonic-rhythm-improv', title='Improvise on the black keys', kind='improvise', hand='right', key='F#',
       prompt='Improvise! Play any black keys you like, in this rhythm. End on F sharp if you can.',
       tempo=80, meter='4/4', countIn=1, bars=4, scale='C# D# F# G# A#', rhythm=rx('q q h | q q q q | q q h | w'),
       rules=['inScale', 'rhythm', {'variety': 3}, {'endOn': 'F#'}], reps=3)
    ex('improvise-in-c', title='Improvise in C', kind='improvise', hand='right', key='C',
       prompt='Improvise with the right hand on C D E F G, in this rhythm. Start and finish on C.',
       tempo=80, meter='4/4', countIn=1, bars=8, scale='C D E F G', rhythm=rx('q q q q | h h | q e e q q | w | q q q q | h h | q q q q | w'),
       rules=['inScale', 'rhythm', {'startOn': 'C'}, {'endOn': 'C'}, {'steps': 60}], reps=3)


