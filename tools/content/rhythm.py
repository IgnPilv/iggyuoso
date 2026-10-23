# The rhythm branch. Rhythm is the first thing anyone can do on a piano: tap any key in time. It
# starts with the beat alone, then long and short, then two hands taking turns and together, and
# grows through every meter and note value the other branches need, always with the left hand
# joining in early. Exercises: hand-written taps (one or two hands), generated reading and echo
# drills (fresh every run) and "which rhythm did you hear?" pictures.
from lib import *

def L(id, stage, title, requires, steps, recap):
    lesson(id, title, steps, recap, skills=['rhythm'])
    node(id, 'rhythm', stage, title, requires, type='lesson')

def T(id, title, s, meter='4/4', tempo=72, **kw):
    return X(tap(id, title, rx(s), meter=meter, tempo=tempo, **kw))

def T2(id, title, r, l, meter='4/4', tempo=66, **kw):
    return X(tap2(id, title, rx(r), rx(l), meter=meter, tempo=tempo, **kw))

def HEAR(id, title, pool, meter='4/4', tempo=80, questions=15):
    return X(ear(id, title, [{'type': 'rhythm', 'pool': [rx(p) for p in pool], 'meter': meter, 'tempo': tempo}], questions=questions, reps=2, days=2))

def READ(id, title, durations, **kw): return X(rread(id, title, durations, **kw))
def ECHO(id, title, durations, **kw): return X(rread(id, title, durations, echo=True, **kw))

def run(base):
    # ------------------------------------------------------------ stage 1
    L('rhythm-tap-the-beat', 1, 'Tap the beat', [], [
        S("""**Rhythm comes first.** Before any note names, you can make music by tapping in time. Every
        piece has a **beat**: a steady pulse, like a heartbeat or footsteps. The app clicks the beat;
        tap **any key** on every click.""", terms=['beat', 'pulse'], sound='C5:q C5:q C5:q C5:q',
          callout='Any key counts here. Only the timing is scored.'),
        T('rt-beat-60', 'Tap with the click, slow', 'q q q q | q q q q | q q q q | q q q q', tempo=60, prompt='One tap on every click.'),
        S("""A little faster. Let your wrist stay loose; tap from the knuckle, not the shoulder."""),
        T('rt-beat-84', 'Tap with the click, faster', 'q q q q | q q q q | q q q q | q q q q', tempo=84),
        T('rt-beat-8-bars', 'Eight bars without a slip', 'q q q q | q q q q | q q q q | q q q q | q q q q | q q q q | q q q q | q q q q', tempo=72,
          prompt='Eight bars. If you slip, keep going: the beat never waits.'),
    ], 'The beat is steady and never waits for anyone. Tap on it and you are already making music.')

    L('rhythm-long-and-short', 1, 'Long and short', ['rhythm-tap-the-beat'], [
        S("""Notes last for different numbers of beats. A **quarter note** lasts one beat; a **half note**
        lasts two (hold the key down for both clicks); a **whole note** lasts four.""",
          staff=staff('C5:q C5:q C5:h | C5:w'), terms=['quarter note', 'half note', 'whole note'],
          check=check('A half note lasts...', 'Two beats', ['One beat', 'Four beats'], 'Half of a whole note (four beats): two beats.')),
        T('rt-ls-1', 'Quarters and halves', 'q q h | q q h | h h | w', prompt='Hold the halves down for two clicks.'),
        T('rt-ls-2', 'Mixing them up', 'h q q | q q h | q h q | w'),
        HEAR('ear-rt-long-short', 'Which rhythm did you hear?', ['q q h', 'h q q', 'q q q q', 'h h', 'q h q', 'w']),
        ECHO('gen-echo-q-h', 'Echo: quarters and halves', ['q', 'h'], bars=2, tempo=72, reps=3, days=2),
        READ('gen-read-q-h-w', 'Read: quarters, halves and wholes', ['q', 'h', 'w'], bars=4, tempo=72, reps=3, days=2),
    ], 'Quarter = 1 beat, half = 2, whole = 4. Holding the long ones is half the skill.')

    L('rhythm-two-hands-taking-turns', 1, 'Two hands taking turns', ['rhythm-long-and-short', 'rests-and-taking-turns'], [
        S("""Two hands, one beat. Keys from middle C up belong to the **right hand**; keys below middle C
        to the **left**. First the hands take turns: one plays while the other rests.""",
          keys=keys('C3 C5', labels='names'), callout='Left hand: any key below middle C. Right hand: middle C or above.'),
        T2('rt-turns-bars', 'A bar each', 'q q q q | rw | q q q q | rw', 'rw | q q q q | rw | q q q q', prompt='Right hand for a bar, then the left hand.'),
        T2('rt-turns-halves', 'Two beats each', 'h rh | h rh | q q rh | w', 'rh h | rh h | rh q q | rw'),
        T2('rt-turns-beats', 'A beat each', 'q rq q rq | q rq q rq | q rq q rq | h rh', 'rq q rq q | rq q rq q | rq q rq q | rh h', tempo=60,
           prompt='Right, left, right, left: like walking.'),
        READ('gen-read-hands-q-h', 'Read for two hands', ['q', 'h', 'r:q'], bars=4, tempo=66, hands='both', reps=3, days=2),
    ], 'Taking turns is the first step to two hands at once.')

    L('rhythm-two-hands-together', 1, 'Two hands at once', ['rhythm-two-hands-taking-turns'], [
        S("""Now both hands tap together. First the same rhythm; then the left hand holds long notes while
        the right hand keeps the beat. This is exactly what a melody over a bass note feels like."""),
        T2('rt-together-same', 'Same rhythm, both hands', 'q q q q | q q h | q q q q | w', 'q q q q | q q h | q q q q | w'),
        T2('rt-together-q-over-h', 'Right quarters, left halves', 'q q q q | q q q q | q q q q | w', 'h h | h h | h h | w'),
        T2('rt-together-h-over-q', 'Right halves, left quarters', 'h h | h h | h h | w', 'q q q q | q q q q | q q q q | w'),
        T2('rt-together-w-under', 'A melody over long notes', 'q q h | q q h | h q q | w', 'w | w | w | w'),
        ECHO('gen-echo-hands-q-h', 'Echo for two hands', ['q', 'h'], bars=2, tempo=66, hands='both', reps=3, days=2),
    ], 'Two hands, one beat. Every piece hands together is built on this.')

    L('rhythm-waltz-patterns', 1, 'Waltz rhythms in 3/4', ['three-four-time', 'rhythm-two-hands-together'], [
        S("""In 3/4 every bar has three beats: **ONE** two three. A waltz puts a low note on ONE and two
        light chords on two and three: **oom-pah-pah**.""", sound='C3:q E4+G4:q E4+G4:q | C3:q E4+G4:q E4+G4:q'),
        T('rt-waltz-1', 'Waltz rhythms', 'q q q | h q | q h | h.', meter='3/4', tempo=96),
        T2('rt-waltz-oompah', 'Oom-pah-pah', 'rq q q | rq q q | rq q q | h.', 'q rq rq | q rq rq | q rq rq | h.', meter='3/4', tempo=90,
           prompt='Left hand on ONE, right hand on two and three.'),
        T2('rt-waltz-melody', 'A waltz tune over the bass', 'h q | q q q | h. | h.', 'h. | h. | h. | h.', meter='3/4', tempo=96),
        HEAR('ear-rt-waltz', 'Which waltz rhythm?', ['q q q', 'h q', 'q h', 'h.'], meter='3/4', tempo=96),
        READ('gen-read-waltz-hands', 'Read waltz rhythms, two hands', ['q', 'h', 'h.'], meter='3/4', tempo=88, hands='both', reps=3, days=2),
    ], 'ONE two three: the feel of every waltz.')

    # ------------------------------------------------------------ stage 2
    L('rhythm-two-four', 2, 'Marching in 2/4', ['y1-checkpoint-a'], [
        S("""**2/4**: two beats a bar, LEFT right, like a march. The first beat of every bar is the strong one.""",
          staff=staff('C5:q C5:q | C5:h | C5:q C5:q | C5:h'), terms=['2/4']),
        T('rt-24-march', 'A march', 'q q | h | q q | h | q q | q q | h | h', meter='2/4', tempo=96),
        T2('rt-24-left-right', 'Left, right', 'rq q | rq q | q q | h', 'q rq | q rq | h | rh', meter='2/4', tempo=88),
        T2('rt-24-drum', 'Drum and fife', 'q q | q q | q q | h', 'h | h | h | h', meter='2/4', tempo=100),
        HEAR('ear-rt-two-four', 'Which 2/4 bar?', ['q q', 'h', 'q rq', 'rq q'], meter='2/4', tempo=90),
        READ('gen-read-two-four', 'Read in 2/4', ['q', 'h', 'r:q'], meter='2/4', bars=6, tempo=88, reps=3, days=2),
    ], '2/4: two beats, strong and weak. Marches and polkas live here.')

    L('rhythm-quarter-rests', 2, 'Silent beats', ['rhythm-two-four'], [
        S("""A **rest** is a beat of silence, and it still counts. Lift your hand off the key on a rest, and
        keep counting in your head.""", staff=staff('C5:q r:q C5:q r:q | C5:h r:h'), terms=['quarter rest', 'half rest'],
          check=check('During a rest you...', 'Count, and play nothing', ['Wait for the click to stop', 'Hold the last note'], 'A rest is silence that is counted, just like a note.')),
        T('rt-rests-1', 'Rests on the off beats', 'q rq q rq | q q rh | rq q rq q | w'),
        T('rt-rests-2', 'Rest at the end', 'q q q rq | q q q rq | rq q q q | h rh'),
        T2('rt-rests-hands', 'Rests in both hands', 'q rq q rq | q rq q rq | h rh | w', 'rq q rq q | h rh | rh h | w'),
        READ('gen-read-rests', 'Read with rests', ['q', 'h', 'r:q', 'r:h'], bars=4, tempo=72, reps=3, days=2),
        ECHO('gen-echo-rests', 'Echo with rests', ['q', 'h', 'r:q'], bars=2, tempo=72, reps=3, days=2),
    ], 'Silence is part of rhythm. Count the rests as carefully as the notes.')

    L('rhythm-inner-pulse', 2, 'Keep the beat inside', ['rhythm-quarter-rests'], [
        S("""Real music has no click. Here the click plays only during the count-in; after that, the beat
        lives **inside you**. Nod, tap your foot, count under your breath: anything that keeps it steady.""",
          callout='If you drift, the result shows whether you rushed (got faster) or dragged (got slower).'),
        T('rt-pulse-quarters', 'Quarters, no click', 'q q q q | q q q q | q q q q | w', tempo=72, click='count-in'),
        T('rt-pulse-mixed', 'Long and short, no click', 'q q h | h h | q q q q | w', tempo=72, click='count-in'),
        T('rt-pulse-rests', 'Rests, no click', 'q rq q rq | h rh | q q rq q | w', tempo=66, click='count-in'),
        T2('rt-pulse-hands', 'Two hands, no click', 'q q h | q q h | q q q q | w', 'h h | w | h h | w', tempo=66, click='count-in'),
    ], 'The beat you keep yourself is the one that matters.')

    L('rhythm-upbeats', 2, 'Starting before the beat', ['rhythm-waltz-patterns', 'rhythm-inner-pulse'], [
        S("""Many tunes start on an **upbeat**: one note before the first strong beat ("Happy BIRTH-day"). The
        count-in counts the whole bar; the upbeat comes on its last beat.""", sound='G4:e G4:e | A4:q G4:q C5:q | B4:h', terms=['upbeat', 'pickup']),
        T('rt-upbeat-44', 'One upbeat, 4/4', 'q | h q q | h q q | q q q q | h.', pickup='q'),
        T('rt-upbeat-34', 'One upbeat, 3/4', 'q | h q | h q | q q q | h', meter='3/4', tempo=90, pickup='q'),
        T2('rt-upbeat-hands', 'Upbeat with a bass', 'q | h q q | h q q | h.', 'rq | w | w | h.', pickup='q'),
    ], 'An upbeat leans into the first strong beat.')

    L('rhythm-two-hands-different', 2, 'Two rhythms at once', ['rhythm-two-hands-together', 'y1-checkpoint-a'], [
        S("""The hands now play **different** rhythms that fit together. Learn each line alone for a moment,
        then join them. Listen for the beats where both hands land together: they are your anchors."""),
        T2('rt-diff-1', 'Swapping roles', 'q q q q | h h | q q h | w', 'h h | q q q q | h q q | w'),
        T2('rt-diff-2', 'A busy right hand', 'q q q q | q q q q | q q q q | w', 'w | h h | h. q | w'),
        T2('rt-diff-3', 'Two rhythms in 3/4', 'q q q | q q q | h q | h.', 'h. | h q | q q q | h.', meter='3/4', tempo=88),
        T2('rt-diff-4', 'Question and answer', 'q q h | rw | q q q q | rw', 'rw | h h | rw | q q h'),
        READ('gen-read-hands-diff', 'Read two rhythms', ['q', 'h', 'w', 'r:q'], bars=4, tempo=66, hands='both', reps=4, days=2),
        ECHO('gen-echo-hands-diff', 'Echo two rhythms', ['q', 'h', 'r:q'], bars=2, tempo=66, hands='both', reps=3, days=2),
    ], 'Different rhythms in each hand: the start of real independence.')

    # ------------------------------------------------------------ stage 3
    L('rhythm-eighth-patterns', 3, 'Eighth-note patterns', ['eighth-notes'], [
        S("""Two eighths fill one beat: "1-and". Say it out loud while you tap: **one and two and**.""",
          staff=staff('C5:q C5:q C5:e C5:e C5:q | C5:e C5:e C5:e C5:e C5:h'), sound='C5:q C5:q C5:e C5:e C5:q'),
        T('rt-eighths-1', 'Eighths here and there', 'q q e e q | e e e e h | q e e q q | w'),
        T('rt-eighths-2', 'Running eighths', 'e e q e e q | e e e e e e q | q e e h | e e e e h'),
        T('rt-eighths-offbeat', 'On the "and"', 'q re e q q | re e re e h | e e q re e q | w', tempo=66, prompt='A rest on the beat, a tap on the "and".'),
        HEAR('ear-rt-eighths', 'Which eighth pattern?', ['q q e e q', 'e e e e h', 'q e e q q', 'e e q e e q', 'e e e e e e e e']),
        ECHO('gen-echo-eighths', 'Echo eighths', ['q', 'e', 'h'], bars=2, tempo=72, reps=3, days=2),
    ], 'Eighths: two to a beat, "1-and".')

    L('rhythm-eighths-two-hands', 3, 'Eighths in two hands', ['rhythm-eighth-patterns', 'rhythm-two-hands-different'], [
        S("""One hand runs in eighths while the other keeps the beat. Then swap. The quarter-note hand is your clock."""),
        T2('rt-8-over-4', 'Right runs, left walks', 'e e e e e e e e | e e e e h | e e e e e e e e | w', 'q q q q | q q h | q q q q | w'),
        T2('rt-4-over-8', 'Left runs, right holds', 'h h | q q h | h h | w', 'e e e e e e e e | e e e e h | e e q e e q | w'),
        T2('rt-8-alternate', 'Eighths shared between hands', 'e re e re e re e re | e re e re e re e re | e re e re h | w',
           're e re e re e re e | re e re e re e re e | re e re e rh | rw', tempo=56, prompt='Right on the beat, left on the "and".'),
        READ('gen-read-hands-eighths', 'Read two hands with eighths', ['q', 'e', 'h'], bars=4, tempo=60, hands='both', reps=4, days=2),
    ], 'One hand is the clock, the other dances.')

    L('rhythm-dotted-patterns', 3, 'Dotted rhythms', ['dotted-quarter', 'rhythm-eighth-patterns'], [
        S("""A dotted quarter lasts a beat and a half; the eighth after it fills the gap: "**one** - - **and**".
        It is the long-short swing of "Auld Lang Syne" and countless folk tunes.""", staff=staff('C5:q. C5:e C5:q C5:q | C5:q. C5:e C5:h')),
        T('rt-dotted-1', 'Long, short', 'q. e q q | q. e h | q q q. e | w'),
        T2('rt-dotted-hands', 'Dotted over a steady bass', 'q. e q q | q. e h | q. e q. e | w', 'h h | h h | h h | w'),
        HEAR('ear-rt-dotted', 'Dotted or straight?', ['q. e q q', 'q q q q', 'q. e h', 'h q. e', 'q e e q q']),
        ECHO('gen-echo-dotted', 'Echo dotted rhythms', ['q', 'q.', 'e', 'h'], bars=2, tempo=72, reps=3, days=2),
    ], 'Dotted rhythms give a tune its lilt.')

    L('rhythm-four-bar-phrases', 3, 'Longer rhythm memory', ['rhythm-eighths-two-hands'], [
        S("""Rhythms come in **phrases**, usually four bars long. Listen for the shape: which bars repeat? Most
        four-bar phrases go **A A B A** or **A B A B**."""),
        ECHO('gen-echo-four-bars', 'Echo four bars', ['q', 'h', 'e'], bars=4, tempo=72, reps=4, days=2),
        ECHO('gen-echo-four-bars-hands', 'Echo four bars, two hands', ['q', 'h', 'r:q'], bars=4, tempo=66, hands='both', reps=3, days=2),
        READ('gen-read-eight-bars', 'Read eight bars', ['q', 'h', 'e', 'r:q'], bars=8, tempo=72, reps=3, days=2),
    ], 'Listen in phrases, not single notes.')

    # ------------------------------------------------------------ stage 4
    L('rhythm-tied-notes', 4, 'Holding across the bar line', ['ties', 'rhythm-dotted-patterns'], [
        S("""A tie joins two notes into one long one, even across the bar line. Play the first, hold through the second."""),
        X(timed('rt-ties-across', 'Ties across the bar', right='C5:q C5:q C5:h~ | C5:q C5:q C5:h | C5:h. C5:q~ | C5:w', left='C3:w | G2:w | C3:w | C3:w', tempo=72,
                prompt='Right hand on C5, left hand on C3 and G2.')),
        X(timed('rt-ties-offbeat', 'Ties onto the beat', right='C5:q C5:h C5:q~ | C5:q C5:q C5:h | C5:e C5:q C5:e~ C5:e C5:e C5:q | C5:w', left='C3:q C3:q C3:q C3:q | C3:q C3:q C3:h | C3:q C3:q C3:q C3:q | C3:w', tempo=66)),
        HEAR('ear-rt-ties', 'Which rhythm?', ['q h q', 'q q q q', 'h. q', 'q. e h']),
    ], 'A tie is one note, written in two pieces.')

    L('rhythm-sixteenth-patterns', 4, 'Sixteenth patterns', ['sixteenth-notes', 'rhythm-eighth-patterns'], [
        S("""Four sixteenths to a beat: "**1**-e-and-a". The common shapes: four sixteenths, an eighth and two sixteenths
        ("gal-lop-ing"), and two sixteenths and an eighth.""", staff=staff('C5:s C5:s C5:s C5:s C5:e C5:s C5:s C5:s C5:s C5:e C5:q')),
        T('rt-16-1', 'Four to a beat', 's s s s q s s s s q | s s s s s s s s h | q s s s s q q | w', tempo=60),
        T('rt-16-gallop', 'Galloping', 'e s s e s s e s s q | e s s q e s s q | s s e s s e h | w', tempo=60),
        HEAR('ear-rt-sixteenths', 'Which beat pattern?', ['s s s s q q q', 'e s s q q q', 's s e q q q', 'e e q q q'], tempo=72),
        ECHO('gen-echo-sixteenths', 'Echo sixteenths', ['q', 'e', 's'], bars=2, tempo=60, reps=3, days=2),
    ], '1-e-and-a: four to a beat.')

    L('rhythm-sixteenths-two-hands', 4, 'Sixteenths over a bass', ['rhythm-sixteenth-patterns', 'rhythm-eighths-two-hands'], [
        S("""Sixteenths in one hand, steady quarters or eighths in the other."""),
        T2('rt-16-over-4', 'Sixteenths over quarters', 's s s s s s s s s s s s s s s s | s s s s q s s s s q | e s s e s s e s s e s s | w',
           'q q q q | q q q q | q q q q | w', tempo=56),
        T2('rt-16-over-8', 'Sixteenths over eighths', 's s s s q s s s s q | e s s e s s h | s s s s s s s s s s s s q | w',
           'e e e e e e e e | e e e e e e e e | e e e e e e e e | w', tempo=52),
        READ('gen-read-hands-16', 'Read two hands with sixteenths', ['q', 'e', 's', 'h'], bars=4, tempo=56, hands='both', reps=3, days=2),
    ], 'The faster hand leans on the slower one.')

    L('rhythm-cut-time', 4, 'Cut time', ['rhythm-two-four', 'y1-exit'], [
        S("""**Cut time** (2/2, written ¢) counts **half notes** as the beat: two big beats a bar. The music looks
        like 4/4 but feels twice as relaxed, like a quick march.""", terms=['cut time']),
        T('rt-cut-1', 'Two big beats', 'h h | q q h | q q q q | w', meter='2/2', tempo=60),
        T2('rt-cut-hands', 'Cut time, two hands', 'q q q q | q q h | e e e e q q | w', 'h h | h h | h h | w', meter='2/2', tempo=56),
        READ('gen-read-cut', 'Read in cut time', ['q', 'h', 'w'], meter='2/2', bars=4, tempo=60, reps=3, days=2),
    ], 'Cut time: the half note gets the beat.')

    # ------------------------------------------------------------ stage 5
    L('rhythm-triplet-patterns', 5, 'Triplet patterns', ['triplets', 'rhythm-sixteenth-patterns'], [
        S("""Three even notes in one beat: "**tri**-pl-et". Triplets feel round where eighths feel square.""", sound='C5:e3 C5:e3 C5:e3 C5:q C5:e C5:e C5:q'),
        T('rt-trip-1', 'Triplets and eighths', 'e3 e3 e3 q e e q | e3 e3 e3 e3 e3 e3 h | q e e e3 e3 e3 q | w', tempo=60),
        T2('rt-trip-hands', 'Triplets over quarters', 'e3 e3 e3 e3 e3 e3 e3 e3 e3 e3 e3 e3 | e3 e3 e3 q h | e3 e3 e3 e3 e3 e3 q q | w', 'q q q q | q q h | q q q q | w', tempo=56),
        HEAR('ear-rt-triplets', 'Triplets or eighths?', ['e3 e3 e3 q q q', 'e e q q q', 'q e3 e3 e3 q q', 'q e e q q'], tempo=72),
        ECHO('gen-echo-triplets', 'Echo triplets', ['q', 'e3', 'h'], bars=2, tempo=60, reps=3, days=2),
    ], 'Round triplets, square eighths.')

    L('rhythm-dotted-eighths', 5, 'Dotted eighths', ['rhythm-sixteenth-patterns', 'y2-checkpoint-a'], [
        S("""A dotted eighth and a sixteenth fill one beat: long-short, much snappier than a dotted quarter. It is the
        "jumpy" rhythm of marches and the Scotch snap reversed.""", staff=staff('C5:e. C5:s C5:e. C5:s C5:q C5:q')),
        T('rt-dotted-8th-1', 'Snappy rhythms', 'e. s e. s q q | e. s q e. s q | q e. s h | w', tempo=60),
        T2('rt-dotted-8th-hands', 'Snappy over steady', 'e. s e. s e. s e. s | e. s q e. s q | e. s e. s h | w', 'q q q q | q q q q | q q h | w', tempo=56),
        HEAR('ear-rt-dotted-8th', 'Snappy or even?', ['e. s e. s q q', 'e e e e q q', 'q e. s q q', 'q e e q q'], tempo=72),
    ], 'Dotted eighths snap; even eighths flow.')

    L('rhythm-offbeat-eighths', 5, 'Off the beat', ['rhythm-eighths-two-hands', 'y2-checkpoint-a'], [
        S("""Notes on the "and" with a steady left hand on the beat. Feel the right hand bouncing **between** the left-hand notes."""),
        T2('rt-offbeat-1', 'Right on the "and"', 're e re e re e re e | re e re e re e re e | re e re e h | w', 'q q q q | q q q q | q q h | w', tempo=60),
        T2('rt-offbeat-2', 'Reggae chop', 'rq q rq q | rq q rq q | rq q rq q | w', 'h h | h h | h h | w', tempo=76),
        READ('gen-read-offbeats', 'Read eighth rests', ['q', 'e', 'r:e', 'h'], bars=4, tempo=66, reps=3, days=2),
    ], 'Off-beats make music move.')

    # ------------------------------------------------------------ stage 6
    L('rhythm-syncopation-hands', 6, 'Syncopation with two hands', ['syncopation', 'rhythm-offbeat-eighths'], [
        S("""**Syncopation**: an accent where you don't expect it, usually a note on the "and" held over the beat. The
        left hand keeps the beat, so you can feel the right hand pull against it."""),
        T2('rt-sync-1', 'Short-long-short', 'e q e h | e q e h | e q e e q e | w', 'q q q q | q q q q | q q q q | w', tempo=66),
        T2('rt-sync-2', 'Charleston', 'q. e rh | q. e rh | q. e q. e | w', 'q q q q | q q q q | q q q q | w', tempo=80),
        HEAR('ear-rt-sync', 'Which rhythm?', ['e q e h', 'q q h', 'q. e rh', 'e e e e h']),
        ECHO('gen-echo-sync', 'Echo with eighth rests', ['q', 'e', 'r:e', 'q.'], bars=2, tempo=66, reps=3, days=2),
    ], 'Syncopation: the pull against the beat.')

    L('rhythm-six-eight', 6, '6/8: two big beats', ['three-eight-time', 'rhythm-triplet-patterns'], [
        S("""**6/8** has six eighths a bar, felt as **two** big beats of three: **ONE**-two-three **FOUR**-five-six. The
        count-in and click follow the big beats.""", sound='C5:q C5:e C5:q C5:e | C5:q. C5:q.', terms=['6/8', 'compound time']),
        T('rt-68-1', 'Long-short in 6/8', 'q e q e | q e q e | q. q. | q.  q.', meter='6/8', tempo=60),
        T('rt-68-2', 'Running eighths in 6/8', 'e e e e e e | q e q e | e e e q. | q. q.', meter='6/8', tempo=60),
        HEAR('ear-rt-68', 'Which 6/8 bar?', ['q e q e', 'e e e e e e', 'q. q.', 'q e e e e'], meter='6/8', tempo=60),
        READ('gen-read-68', 'Read in 6/8', ['q', 'e', 'q.'], meter='6/8', bars=4, tempo=56, reps=3, days=2),
    ], '6/8: two beats, each split in three.')

    L('rhythm-six-eight-hands', 6, '6/8 with two hands', ['rhythm-six-eight'], [
        S("""A rocking left hand on the big beats, a melody above."""),
        T2('rt-68-rock', 'Rocking bass', 'q e q e | e e e q. | q e q e | q. q.', 'q. q. | q. q. | q. q. | q. q.', meter='6/8', tempo=56),
        T2('rt-68-barcarolle', 'Boat song', 'q. q e | q. q. | q e q e | q. q.', 'e e e e e e | e e e e e e | e e e e e e | q. q.', meter='6/8', tempo=50),
        READ('gen-read-68-hands', 'Read 6/8 for two hands', ['q', 'e', 'q.'], meter='6/8', bars=4, tempo=52, hands='both', reps=3, days=2),
    ], 'Rocking in two.')

    # ------------------------------------------------------------ stage 7
    L('rhythm-compound-meters', 7, '9/8 and 12/8', ['rhythm-six-eight-hands', 'y2-exit'], [
        S("""**9/8** has three big beats of three eighths; **12/8** has four. 12/8 is the slow blues and the gospel ballad."""),
        T('rt-98', 'Three big beats', 'q e q e q e | q. q. q. | e e e q e q. | q. q. q.', meter='9/8', tempo=56),
        T2('rt-128', 'A 12/8 groove', 'q e q e q e q e | e e e q. e e e q. | q e q e q e q e | q. q. q. q.', 'q. q. q. q. | q. q. q. q. | q. q. q. q. | q. q. q. q.', meter='12/8', tempo=50),
        READ('gen-read-98', 'Read in 9/8', ['q', 'e', 'q.'], meter='9/8', bars=4, tempo=52, reps=3, days=2),
        READ('gen-read-128', 'Read in 12/8', ['q', 'e', 'q.'], meter='12/8', bars=4, tempo=48, reps=3, days=2),
    ], 'Compound meters: big beats in threes.')

    L('rhythm-triplets-vs-eighths', 7, 'Switching between twos and threes', ['rhythm-triplet-patterns', 'rhythm-dotted-eighths'], [
        S("""Switch between eighths, triplets and sixteenths without the beat moving. Two, three, four to a beat."""),
        T('rt-subdiv-ladder', 'Two, three, four', 'e e e e e3 e3 e3 e3 e3 e3 | s s s s s s s s h | e e e3 e3 e3 s s s s q | w', tempo=56),
        T2('rt-subdiv-hands', 'Twos and threes over the beat', 'e e e3 e3 e3 e e e3 e3 e3 | e3 e3 e3 e e e3 e3 e3 e e | e e e3 e3 e3 h | w', 'q q q q | q q q q | q q h | w', tempo=56),
        HEAR('ear-rt-subdiv', 'Two, three or four to a beat?', ['e e e e e e e e', 'e3 e3 e3 e3 e3 e3 e3 e3 e3 e3 e3 e3', 's s s s s s s s s s s s s s s s'], tempo=60),
    ], 'Two, three, four: the beat stays put.')

    L('rhythm-sixteenth-rests', 7, 'Sixteenths with gaps', ['rhythm-sixteenths-two-hands', 'rhythm-dotted-eighths'], [
        S("""Sixteenth rests make funk and Latin rhythms: the gaps are as important as the taps."""),
        T('rt-16-rests', 'Gaps in the sixteenths', 's rs s s s rs s s q q | rs s s s rs s s s h | s s rs s e e q q | w', tempo=56),
        T2('rt-16-rests-hands', 'A funky right hand', 's rs s s s rs s s s rs s s s rs s s | s rs s s q s rs s s q | s s rs s e e h | w', 'q q q q | q q q q | q q h | w', tempo=52),
    ], 'Gaps make the groove.')

    # ------------------------------------------------------------ stage 8
    L('rhythm-three-against-two', 8, 'Three against two', ['rhythm-triplets-vs-eighths', 'rhythm-sixteenths-two-hands'], [
        S("""Three even notes in one hand, two in the other, in the same beat. They meet on the beat; in between, the
        order is right, left, right: say "**nice** cup of **tea**" (nice = both, cup = right, of = left, tea = right).""",
          callout='Slow it right down at first. Both hands meet on every beat.'),
        T2('rt-3v2-1', 'Three against two, slowly', 'e3 e3 e3 e3 e3 e3 e3 e3 e3 e3 e3 e3 | e3 e3 e3 e3 e3 e3 h | e3 e3 e3 e3 e3 e3 e3 e3 e3 e3 e3 e3 | w',
           'e e e e e e e e | e e e e h | e e e e e e e e | w', tempo=40),
        T2('rt-3v2-2', 'Two against three', 'e e e e e e e e | e e e e h | e e e e e e e e | w',
           'e3 e3 e3 e3 e3 e3 e3 e3 e3 e3 e3 e3 | e3 e3 e3 e3 e3 e3 h | e3 e3 e3 e3 e3 e3 e3 e3 e3 e3 e3 e3 | w', tempo=40),
    ], 'Three against two: "nice cup of tea".')

    L('rhythm-sixteenth-syncopation', 8, 'Syncopated sixteenths', ['rhythm-sixteenth-rests', 'rhythm-syncopation-hands'], [
        S("""Sixteenth syncopation: "e-**and**-a" pushes. The left hand holds the beat steady."""),
        T2('rt-16-sync-1', 'Sixteenth push', 's e s e e s e s e e | s e s q s e s q | s e s s e s h | w', 'q q q q | q q q q | q q h | w', tempo=52),
        T('rt-16-sync-2', 'Clave', 'q. q. q | rq q q rq | q. q. q | rq q q rq', tempo=84, prompt='The 3-2 son clave: the backbone of salsa.'),
        HEAR('ear-rt-16-sync', 'Which pattern?', ['s e s q q q', 's s s s q q q', 'e s s q q q', 'q. q. q']),
    ], 'Sixteenth pushes, and the clave.')

    # ------------------------------------------------------------ stage 9
    L('rhythm-shuffle', 9, 'Swing and shuffle', ['rhythm-three-against-two', 'rhythm-compound-meters'], [
        S("""**Swing**: pairs of eighths played long-short, like a triplet with the middle note tied. Blues, jazz and
        rock and roll all shuffle. Here it is written out as quarter-triplet plus eighth-triplet.""", sound='C5:q3 C5:e3 C5:q3 C5:e3 C5:q3 C5:e3 C5:q3 C5:e3'),
        T('rt-shuffle-1', 'Shuffle eighths', 'q3 e3 q3 e3 q3 e3 q3 e3 | q3 e3 q3 e3 h | q3 e3 q3 e3 q3 e3 q | w', tempo=72),
        T2('rt-shuffle-hands', 'Boogie shuffle', 'q q q q | q q h | q q q q | w', 'q3 e3 q3 e3 q3 e3 q3 e3 | q3 e3 q3 e3 q3 e3 q3 e3 | q3 e3 q3 e3 q3 e3 q3 e3 | w', tempo=72,
           prompt='The left hand shuffles; the right hand keeps it simple.'),
    ], 'Swing: long-short, the feel of the blues.')

    L('rhythm-hemiola', 9, 'Hemiola: threes against twos in the bar', ['rhythm-shuffle', 'rhythm-six-eight-hands'], [
        S("""In 6/8, three quarter notes across the bar instead of two dotted quarters: the music seems to switch
        from 6/8 to 3/4 for a moment. Baroque dances use it before their cadences."""),
        T('rt-hemiola-1', 'Switching feels', 'q. q. | q q q | q. q. | q q q', meter='6/8', tempo=56),
        T2('rt-hemiola-hands', 'Both feels at once', 'q q q | q q q | q q q | q. q.', 'q. q. | q. q. | q. q. | q. q.', meter='6/8', tempo=50),
    ], 'Two feels in one bar.')

    L('rhythm-groove', 9, 'Groove for two hands', ['rhythm-sixteenth-syncopation', 'rhythm-shuffle'], [
        S("""A groove is a short pattern repeated until it locks in. Bass and right-hand chords interlock."""),
        T2('rt-groove-funk', 'Funk', 'rq s s rs s rq e e | rq s s rs s rq e e | rq s s rs s q q | w', 'e. s re e e. s re e | e. s re e e. s re e | e. s re e h | w', tempo=72),
        T2('rt-groove-latin', 'Latin', 'q. q. q | rq q q rq | q. q. q | rq q q rq', 'q. e q. e | q. e q. e | q. e q. e | q. e q. e', tempo=84),
        T2('rt-groove-pop', 'Pop ballad', 'e e e e e e e e | e e e e e e e e | e e e e e e e e | w', 'q. e h | q. e h | q. e h | w', tempo=72),
    ], 'Lock in and repeat.')
