# Loud and soft at the keys (the audit's gap 5): dynamics marks scored from key velocity. Forte and
# piano, echoes, crescendo and diminuendo, terraced dynamics and shaping a phrase. Runs after the
# older generators so their lesson files keep their numbers.
from lib import *

def L(id, stage, title, requires, steps, recap):
    lesson(id, title, steps, recap, skills=['technique'])
    node(id, 'technique', stage, title, requires, type='lesson')

TOUCH = """The app hears how fast each key goes down: that is how loud the note is. A keyboard that sends the same
strength for every key (or the computer keyboard) cannot be measured; then loud and soft are not scored."""


def run(base):
    L('touch-forte-piano', 2, 'Loud and soft at the keys', ['dynamics', 'technique-c-position-two-hands'], [
        S("""A piano is loud or soft by **how fast the key goes down**, not by how long you hold it. For **forte** (f), let the
        weight of your arm drop into the keys from a little above them. For **piano** (p), start with the fingertips resting
        on the keys and press gently.""", terms=['forte', 'piano', 'touch', 'arm weight'],
          sound='C4:q D4:q E4:q F4:q | C4:q D4:q E4:q F4:q', callout='Fast key = loud. Slow key = soft.'),
        S(TOUCH + """ The marks sit under the music: **f** where it is loud, **p** where it is soft. Every exercise here
        starts by playing a bar loud, then answering it softly, like an echo.""",
          check=check('How do you play a note louder on the piano?', 'Press the key down faster', ['Hold it longer', 'Press it further down'], 'The speed of the hammer makes the sound: a faster key, a louder note.')),
        X(timed('touch-echo-c', 'Loud, then an echo', right='C4:q D4:q E4:q F4:q | C4:q D4:q E4:q F4:q | G4:q F4:q E4:q D4:q | G4:q F4:q E4:q D4:q',
                tempo=72, dynamics='f | p | f | p', rf='1 2 3 4 1 2 3 4 5 4 3 2 5 4 3 2', display='staff', reps=3, days=2)),
        X(timed('touch-echo-hands', 'Echo with both hands', right='C4:q E4:q G4:h | C4:q E4:q G4:h | G4:q F4:q E4:q D4:q | C4:w',
                left='C3:q E3:q G3:h | C3:q E3:q G3:h | G3:q F3:q E3:q D3:q | C3:w', tempo=72, dynamics='f | p | f | p', display='staff', reps=3, days=2)),
        X(timed('touch-mf-mp', 'Not quite loud, not quite soft', right='E4:q D4:q C4:q D4:q | E4:q E4:q E4:h | D4:q D4:q D4:h | E4:q G4:q G4:h',
                left='C3:w | C3:w | G2:w | C3:w', tempo=80, dynamics='mf | mf | mp | mp', display='staff', reps=3, days=2)),
    ], 'Loud is a fast key; soft is a slow one.')

    L('touch-crescendo', 3, 'Growing and fading: crescendo and diminuendo', ['touch-forte-piano', 'c-scale-hands-together'], [
        S("""**Crescendo** (cresc., or an opening wedge **<**) means getting gradually louder; **diminuendo** (dim., or a closing
        wedge **>**) gradually softer. Each note is a little louder (or softer) than the one before, with no sudden jump.""",
          terms=['crescendo', 'diminuendo', 'hairpin'], sound='C4:q D4:q E4:q F4:q | G4:q A4:q B4:q C5:q',
          callout='< grows, > fades. A hairpin always ends on the next mark.'),
        S("""Music often grows as it climbs and fades as it comes down. Plan the top: save your loudest for the high point, and
        start the crescendo softly enough to have somewhere to go.""",
          check=check('What does a closing wedge (>) under the music mean?', 'Getting gradually softer', ['Getting gradually louder', 'An accent on one note', 'Slowing down'], 'It is a diminuendo (or decrescendo).')),
        X(timed('touch-scale-swell', 'Scale that swells and fades', right='C4:q D4:q E4:q F4:q | G4:q A4:q B4:q C5:q | C5:h G4:h | F4:q E4:q D4:q E4:q | C4:w',
                left='C3:q D3:q E3:q F3:q | G3:q A3:q B3:q C4:q | C4:h G3:h | F3:q E3:q D3:q E3:q | C3:w', tempo=72,
                dynamics='p | < | f | > | p', display='staff', reps=3, days=2)),
        X(timed('touch-chord-swell', 'Chords that grow', right='C4+E4+G4:q C4+E4+G4:q C4+E4+G4:q C4+E4+G4:q | C4+F4+A4:q C4+F4+A4:q C4+F4+A4:q C4+F4+A4:q | B3+D4+G4:q B3+D4+G4:q B3+D4+G4:q B3+D4+G4:q | B3+D4+F4:q B3+D4+F4:q B3+D4+F4:q B3+D4+F4:q | C4+E4+G4:w',
                left='C3:h C3:h | F2:h F2:h | G2:h G2:h | G2:h G2:h | C3:w', tempo=72, dynamics='p | < | f | > | p', display='staff', reps=3, days=2)),
        X(quiz('touch-marks-quiz', 'Dynamics marks: quiz', [
            Q('Which is louder: mf or mp?', 'mf', ['mp', 'They are the same'], 'mezzo forte (medium loud) is louder than mezzo piano (medium soft).'),
            Q('What does ff mean?', 'Very loud (fortissimo)', ['Very soft', 'Fast', 'Repeat'], 'Two f\'s: fortissimo.'),
            Q('What does pp mean?', 'Very soft (pianissimo)', ['Very loud', 'Pedal', 'Play'], 'Two p\'s: pianissimo.'),
            Q('An opening wedge (<) means...', 'Crescendo: get gradually louder', ['Diminuendo', 'Accent', 'Slow down'], 'It opens like the sound growing.'),
            Q('"dim." is short for...', 'Diminuendo: get gradually softer', ['Diminished chord', 'Dimly lit', 'Slow down'], 'The same as a closing wedge.'),
            Q('From softest to loudest:', 'pp p mp mf f ff', ['p pp mp mf ff f', 'mp p pp mf f ff', 'pp mp p f mf ff'], 'pianissimo, piano, mezzo piano, mezzo forte, forte, fortissimo.'),
            Q('Where should a crescendo be loudest?', 'At its end, on the next mark', ['At its start', 'In the middle', 'Nowhere: it stays the same'], 'It grows all the way to where it is going.'),
            Q('What makes a note loud on the piano?', 'A fast key', ['A long press', 'Pressing harder after it sounds', 'The pedal'], 'Once the hammer has struck, pressing harder changes nothing.'),
        ])),
    ], 'Cresc. grows to the next mark; dim. fades to it.')

    L('touch-terraced', 4, 'Echoes: terraced dynamics', ['touch-crescendo'], [
        S("""Harpsichords could not play louder or softer by touch, so Baroque music changes level in **terraces**: a phrase
        forte, then the same phrase piano, like an echo across a hall. On the piano, make each terrace even and the step
        between them clear.""", terms=['terraced dynamics', 'echo'], callout='Same phrase, a new level: f, then p.'),
        X(timed('touch-terraced-g', 'Echo minuet in G', meter='3/4', key='G',
                right='G4:q B4:q D5:q | C5:q B4:q A4:q | G4:q B4:q D5:q | C5:q B4:q A4:q | B4:q A4:q G4:q | A4:q F#4:q D4:q | B4:q A4:q G4:q | A4:q F#4:q G4:q',
                left='G3:h. | D3:h. | G3:h. | D3:h. | G3:h. | D3:h. | G3:h. | D3:h. ', tempo=96, dynamics='f | f | p | p | f | f | p | p', display='staff', reps=3, days=2)),
    ], 'Baroque echoes: even terraces, a clear step.')

    L('touch-shaping', 5, 'Shaping a phrase', ['touch-terraced', 'theory-phrases-and-form'], [
        S("""A phrase is like a sentence: it leans towards its most important note and relaxes after it. Musicians call this
        **shaping**. Even with no marks, a phrase usually grows a little towards its high point and fades at its cadence.""",
          terms=['phrase', 'shaping', 'climax', 'cantabile']),
        S("""Here is Ode to Joy with its shape written in: the first phrase soft and growing, the answer louder, and a crescendo
        into the last phrase.""", check=check('Where is a phrase usually softest?', 'At its cadence, as it comes to rest', ['At its highest note', 'In the middle of a bar', 'Always at the start'], 'Cadences relax: the phrase breathes out.')),
        X(timed('touch-ode-shaped', 'Ode to Joy, shaped', right='E4:q E4:q F4:q G4:q | G4:q F4:q E4:q D4:q | C4:q C4:q D4:q E4:q | E4:q. D4:e D4:h | E4:q E4:q F4:q G4:q | G4:q F4:q E4:q D4:q | C4:q C4:q D4:q E4:q | D4:q. C4:e C4:h',
                left='C3:w | G2:w | C3:w | G2:w | C3:w | G2:w | C3:w | G2:h C3:h', tempo=88,
                dynamics='p | < | mf | mf | mp | < | f | f', display='staff', reps=3, days=2)),
    ], 'Lean towards the high point, relax into the cadence.')

def add_reqs(nodes):
    for mid, extra in {'y1-exit': ['touch-forte-piano'], 'y2-checkpoint-a': ['touch-crescendo'], 'y2-exit': ['touch-shaping']}.items():
        for r in extra:
            if r not in nodes[mid]['requires']: nodes[mid]['requires'].append(r)

TREE_EDITS = [add_reqs]
