# The creativity branch: making your own music. Until the app has a free-play mode, improvising
# exercises give the rhythm and let any key count (tap), so the player chooses the notes; the
# arranging and transposing ones are written out.
from lib import *

def L(id, stage, title, requires, steps, recap):
    lesson(id, title, steps, recap, skills=['creativity'])
    node(id, 'creativity', stage, title, requires, type='lesson')

MARY = 'E4:q D4:q C4:q D4:q | E4:q E4:q E4:h | D4:q D4:q D4:h | E4:q G4:q G4:h | E4:q D4:q C4:q D4:q | E4:q E4:q E4:q E4:q | D4:q D4:q E4:q D4:q | C4:w'
MARY_CHORDS = 'C | C | G | C | C | C | G | C'

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
        X(tap('cr-black-keys-1', 'Black-key tune, right hand', rx('q q q q | h h | q q q q | w'), tempo=84, ladder=False, reps=2, days=1, prompt='Black keys only, any of them. Go up, then come home.')),
        X(tap2('cr-black-keys-hands', 'Black keys with a drum', rx('q q q q | h h | q q q q | w'), rx('h h | h h | h h | w'), tempo=80, ladder=False, reps=2, days=1,
               prompt='Left hand: one low black key, like a drum. Right hand: your tune on the black keys above middle C.')),
    ], 'Black keys: a scale with no wrong notes.')

    L('creativity-question-answer', 2, 'Question and answer', ['creativity-black-key-tunes', 'pentatonic-improv'], [
        S("""A **question** phrase ends up in the air (on D, E or G); the **answer** comes home to C. Make up both, in C position,
        in this rhythm. Bars 1–2 are the question, bars 3–4 the answer.""", sound='C4:q D4:q E4:q F4:q | G4:h D4:h | E4:q D4:q E4:q F4:q | D4:h C4:h'),
        X(tap('cr-qa-c', 'Question and answer in C', rx('q q q q | h h | q q q q | h h'), tempo=80, ladder=False, reps=3, days=2, prompt='White keys C to G. End bar 2 on D or G, bar 4 on C.')),
        X(tap2('cr-qa-hands', 'Question and answer over a bass', rx('q q q q | h h | q q q q | h h'), rx('w | w | w | w'), tempo=76, ladder=False, reps=3, days=2,
               prompt='Left hand holds a low C each bar (bar 2: G). Right hand: your question and answer.')),
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
        S("""Play the same tune with its chords in C, G, F and D. Think in **degrees**: the tune is 3 2 1 2 3 3 3, whatever the key."""),
        *[X(timed(f'cr-mary-in-{k.lower()}', f'Mary in {k} major', right=transpose_string(MARY, st, se), left=accompany(ch, '4/4', 'block'), tempo=84, key=k, display='staff', reps=2, days=1))
          for k, st, se, ch in [('G', 4, 7, 'G | G | D | G | G | G | D | G'), ('F', 3, 5, 'F | F | C | F | F | F | C | F'), ('D', 1, 2, 'D | D | A | D | D | D | A | D')]],
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
        X(tap2('cr-am-pent-improv', 'Improvise on A C D E G', rx('e e q q q | h h | e e q q q | w | e e q q q | h h | q q q q | w'),
               rx('w | w | w | w | w | w | w | w'), tempo=80, ladder=False, reps=3, days=2, prompt='Left hand: a low A each bar. Right hand: any of A C D E G, in this rhythm. End on A.')),
    ], 'Five notes for a lifetime of solos.')

    L('creativity-blues-improv', 9, 'Improvising the blues', ['technique-blues-shapes', 'creativity-minor-pentatonic'], [
        S("""The left hand plays the boogie; the right hand improvises on the **C blues scale**: C E♭ F F♯ G B♭ C. Leave space:
        short phrases, then rests, like a singer breathing.""", keys=keys('C4 Eb4 F4 F#4 G4 Bb4 C5', labels='names')),
        X(tap2('cr-blues-improv', 'Twelve bars of your own', ' | '.join([rx('q q h'), rx('rw'), rx('e e q h'), rx('rw')] * 3),
               ' | '.join([rx('q q q q')] * 12), tempo=88, ladder=False, reps=3, days=2,
               prompt='Left hand: low keys in quarters (try the boogie C G A G). Right hand: blues-scale notes, with rests between phrases.')),
    ], 'Phrase, breathe, answer.')
