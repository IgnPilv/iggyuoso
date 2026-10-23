# Changes to the hand-written Year 1–2 content: new tree shape (every branch has its own starting
# point, branches lean on each other), milestone names instead of years, the old slogan gone, and
# hands-together versions added wherever a later lesson only had one hand at a time.
# Originals are read from git (BASE_REV), so running this twice gives the same result.
import subprocess, os, re
import yaml
from lib import *

BASE_REV = '1d8c6e59a3d53ade7ca4cfbb2b9234dfca4d2f72'

def original(rel):
    return subprocess.run(['git', 'show', f'{BASE_REV}:{rel}'], cwd=ROOT, capture_output=True, text=True, check=True).stdout

def lesson_path(id):
    for f in os.listdir(os.path.join(C, 'lessons')):
        if re.fullmatch(rf'\d+-{re.escape(id)}\.yaml', f): return f'content/lessons/{f}'
    raise KeyError(id)

MILESTONE_TITLES = {
    'y1-checkpoint-a': 'Milestone 1: first notes',
    'y1-checkpoint-b': 'Milestone 2: two hands',
    'y1-exit': 'Milestone 3: scales and eighths',
    'y2-checkpoint-a': 'Milestone 4: two octaves and minor keys',
    'y2-checkpoint-b': 'Milestone 5: chords and harmony',
    'y2-exit': 'Milestone 6: pedal and four kinds of piece',
}

TEXT = [
    ('The first Year 2 checkpoint', 'Milestone 4'), ('The second Year 2 checkpoint', 'Milestone 5'),
    ('The Year 2 exam', 'Milestone 6'), ('The Year 1 exam', 'Milestone 3'),
    ('Year 1 exit exam', 'Milestone 3'), ('Year 2 exit exam', 'Milestone 6'),
    ('Year 2, checkpoint 1: scales, minor and reading', 'Milestone 4: two octaves and minor keys'),
    ('Year 2, checkpoint 2: chords and harmony', 'Milestone 5: chords and harmony'),
    ('Year 2, checkpoint 1', 'Milestone 4'), ('Year 2, checkpoint 2', 'Milestone 5'),
    ('Year 1 exam', 'Milestone 3'), ('Year 2 exam', 'Milestone 6'),
    ('The Year 1 ear test', 'The Milestone 3 ear test'), ('The Year 2 ear test', 'The Milestone 6 ear test'),
    ('Pass it, and Year 2 opens.', 'Pass it, and the next stage of your tree grows, with new songs.'),
    ("'Year 1 complete:", "'Stage 3 complete:"), ("'Year 2 complete:", "'Stage 6 complete:"),
    ('a third of Year 2 done', 'Milestone 4 passed'), ('Two thirds of Year 2 done.', 'Milestone 5 passed.'),
    ('your four Year 2 pieces', 'your four big pieces'), ('every Year 2 key', 'every key so far'),
    ('In Year 1 your scales', 'Until now your scales'), ('In Year 1 you', 'Earlier you'), ('from Year 1', 'from earlier'),
    ('Checkpoint 1: steady hands', 'Milestone 1: first notes'), ('Checkpoint 2: first chords', 'Milestone 2: two hands'),
    ('Practise each hand alone first if it\'s hard. That\'s what "hands apart, then together" means.',
     'Hard bar? Play each hand alone a few times, then put them back together.'),
    ('Melody louder, accompaniment softer. Hands apart first, then together.', 'Melody louder, accompaniment softer.'),
    ('If one hand stumbles, go back to hands apart for a minute: *hands apart, then together*.',
     'If one hand stumbles, play it alone for a minute, then join the other hand again.'),
    ('- ask: Hands apart, then together, means...', '- ask: Practising a hard bar one hand at a time means...'),
]

def fix_text(s):
    for a, b in TEXT: s = s.replace(a, b)
    return s

# Hands-together versions for lessons that only had one hand at a time.
ADD = {}  # lesson id -> list of (after exercise id or None, [steps])

def add(lesson_id, after, *steps):
    ADD.setdefault(lesson_id, []).append((after, list(steps)))

def ht_exercises():
    add('ties', 'ties-rh', S('Now with the left hand. While the right hand holds its tied note, the left hand moves; that is the whole trick of ties.'),
        X(timed('ties-ht', 'Ties, hands together', right='C4:q E4:q G4:h~ | G4:q F4:q E4:h | D4:h~ D4:q E4:q | C4:w',
                left='C3:h E3:h | G2:w | G2:h B2:h | C3:w', tempo=72, rf='1 3 5 4 3 2 3 1', display='staff', prompt='Hold the tie in the right hand while the left hand plays on.')))
    add('shifting-position', 'shift-lh', S('Both hands shift at the same moment, in the rest. Look ahead to where the hands land before the rest comes.'),
        X(timed('shift-ht', 'Moving both hands', right='C4:q D4:q E4:q F4:q | G4:h r:h | A4:q B4:q C5:q D5:q | E5:w',
                left='C3:q D3:q E3:q F3:q | G3:h r:h | A3:q B3:q C4:q D4:q | E4:w', tempo=66, rf='1 2 3 4 5 1 2 3 4 5', lf='5 4 3 2 1 5 4 3 2 1', prompt='Both hands move up together in the rest.')))
    add('sixteenth-notes', 'sixteenths-rh', S('The left hand keeps the beat in quarter notes while the right hand runs in sixteenths: four to every left-hand note.'),
        X(timed('sixteenths-ht', 'Sixteenths over a steady bass', right='C4:s D4:s E4:s F4:s G4:q G4:h | G4:s F4:s E4:s D4:s C4:q C4:h | E4:s F4:s G4:s F4:s E4:s D4:s E4:s D4:s C4:h',
                left='C3:q G2:q C3:h | G2:q G2:q C3:h | C3:q G2:q C3:h', tempo=56, rf='1 2 3 4 5 5 5 4 3 2 1 1 3 4 5 4 3 2 3 2 1', prompt='Left hand: one note a beat. Right hand: four.')))
    add('natural-minor', 'a-natural-minor-rh', S('Both hands, an octave apart. The left hand starts on finger 5.'),
        X(timed('a-natural-minor-ht', 'A natural minor, hands together', right='A4:q B4:q C5:q D5:q | E5:q F5:q G5:q A5:q | G5:q F5:q E5:q D5:q | C5:q B4:q A4:h',
                left='A3:q B3:q C4:q D4:q | E4:q F4:q G4:q A4:q | G4:q F4:q E4:q D4:q | C4:q B3:q A3:h', tempo=60, key='Am',
                rf='1 2 3 1 2 3 4 5 4 3 2 1 3 2 1', lf='5 4 3 2 1 3 2 1 2 3 1 2 3 4 5')))
    add('melodic-minor', 'a-melodic-minor-rh', S('Now both hands. Up with F♯ and G♯, down with F and G, in both hands at once.'),
        X(timed('a-melodic-minor-ht', 'A melodic minor, hands together', right='A4:q B4:q C5:q D5:q | E5:q F#5:q G#5:q A5:q | G5:q F5:q E5:q D5:q | C5:q B4:q A4:h',
                left='A3:q B3:q C4:q D4:q | E4:q F#4:q G#4:q A4:q | G4:q F4:q E4:q D4:q | C4:q B3:q A3:h', tempo=60, key='Am',
                rf='1 2 3 1 2 3 4 5 4 3 2 1 3 2 1', lf='5 4 3 2 1 3 2 1 2 3 1 2 3 4 5')))
    add('first-inversion', 'root-and-first-rh', S('The left hand holds the root of each chord low down; the right hand plays the chord and its first inversion above it.'),
        X(timed('inversions-ht', 'Inversions over the root', right='C4+E4+G4:h E4+G4+C5:h | F4+A4+C5:h A4+C5+F5:h | G4+B4+D5:h B4+D5+G5:h | C5+E5+G5:w',
                left='C3:w | F2:w | G2:w | C3:w', tempo=60, prompt='Left hand: one root a bar. Right hand: root position, then first inversion.')))
    add('second-inversion', 'inversion-climb-rh', S('Climb again with a bass note under it. Same chord, three shapes, one root.'),
        X(timed('inversion-climb-ht', 'Climbing the inversions with a bass', right='C4+E4+G4:q E4+G4+C5:q G4+C5+E5:q C5+E5+G5:q | G4+C5+E5:q E4+G4+C5:q C4+E4+G4:h | F4+A4+C5:q A4+C5+F5:q C5+F5+A5:q A4+C5+F5:q | F4+A4+C5:w',
                left='C3:w | C3:h C3:h | F2:w | F2:w', tempo=60)))
    add('staccato', 'staccato-lh', S('Now both hands bounce together: short notes in both, let go together.'),
        X(timed('staccato-ht', 'Staccato, both hands', right='C4:e r:e E4:e r:e G4:e r:e E4:e r:e | C4:e r:e E4:e r:e G4:h | G4:e r:e F4:e r:e E4:e r:e D4:e r:e | C4:w',
                left='C3:e r:e G3:e r:e C3:e r:e G3:e r:e | F3:e r:e C3:e r:e G3:h | G3:e r:e D3:e r:e G3:e r:e D3:e r:e | C3:w', tempo=72,
                rf='1 3 5 3 1 3 5 5 4 3 2 1', lf='5 1 5 1 2 5 1 1 4 1 4 5')))
    add('triplets', 'triplets-rh', S('Three in the right hand against one beat in the left. Count "tri-pl-et" on each left-hand note.'),
        X(timed('triplets-ht', 'Triplets over the beat', right='C4:e3 D4:e3 E4:e3 F4:e3 G4:e3 F4:e3 E4:h | D4:e3 E4:e3 F4:e3 E4:e3 D4:e3 C4:e3 D4:h | C4:e3 D4:e3 E4:e3 F4:e3 G4:e3 F4:e3 E4:e3 D4:e3 C4:e3 D4:q | C4:w',
                left='C3:q C3:q C3:h | G2:q G2:q G2:h | C3:q C3:q G2:q G2:q | C3:w', tempo=56, rf='1 2 3 4 5 4 3 2 3 4 3 2 1 2 1 2 3 4 5 4 3 2 1 2 1')))
    add('transposing', 'lightly-row-in-f', S('A moved tune needs moved chords too. In G the chords are G and D7; in F they are F and C7.'),
        X(timed('lightly-row-g-ht', 'Lightly Row in G, both hands', right='D5:q B4:q B4:h | C5:q A4:q A4:h | G4:q A4:q B4:q C5:q | D5:q D5:q D5:h | D5:q B4:q B4:h | C5:q A4:q A4:h | G4:q B4:q D5:q D5:q | G4:w',
                left=accompany('G | D7 | G | G | G | D7 | G | G', '4/4', 'block'), tempo=84, key='G', display='staff')),
        X(timed('lightly-row-f-ht', 'Lightly Row in F, both hands', right='C5:q A4:q A4:h | Bb4:q G4:q G4:h | F4:q G4:q A4:q Bb4:q | C5:q C5:q C5:h | C5:q A4:q A4:h | Bb4:q G4:q G4:h | F4:q A4:q C5:q C5:q | F4:w',
                left=accompany('F | C7 | F | F | F | C7 | F | F', '4/4', 'block'), tempo=84, key='F', display='staff')))
    add('syncopation', 'syncopation-rh', S('The left hand plays straight on the beat; the right hand pushes off it. Hearing them disagree is the point.'),
        X(timed('syncopation-ht', 'Syncopation over a steady bass', right='C4:q E4:h G4:q | F4:q D4:h F4:q | E4:e G4:q E4:e D4:q D4:q | C4:w',
                left='C3:q C3:q C3:q C3:q | G2:q G2:q G2:q G2:q | C3:q C3:q G2:q G2:q | C3:w', tempo=66, rf='1 3 5 4 2 4 3 5 3 2 2 1')))
    add('three-eight-time', 'little-jig', S('The jig with a left hand: one dotted quarter per bar, on the one.'),
        X(timed('little-jig-ht', 'A little jig, both hands', right='E4:e F4:e G4:e | G4:q E4:e | F4:e E4:e D4:e | E4:q. | E4:e F4:e G4:e | G4:q E4:e | D4:e E4:e D4:e | C4:q.',
                left='C3:q. | C3:q. | G2:q. | C3:q. | C3:q. | C3:q. | G2:q. | C3:q.', meter='3/8', tempo=108, rf='3 4 5 5 3 4 3 2 3 3 4 5 5 3 2 3 2 1')))
    add('chromatic-scale', 'chromatic-lh', S('Hands together in contrary motion: both start on D (a mirror on the keyboard), so the fingers match exactly.'),
        X(timed('chromatic-contrary-ht', 'Chromatic scale in contrary motion', right='D4:e D#4:e E4:e F4:e F#4:e G4:e G#4:e A4:e | A#4:e B4:e C5:e C#5:e D5:e C#5:e C5:e B4:e | Bb4:e A4:e Ab4:e G4:e Gb4:e F4:e E4:e Eb4:e | D4:w',
                left='D4:e Db4:e C4:e B3:e Bb3:e A3:e Ab3:e G3:e | Gb3:e F3:e E3:e Eb3:e D3:e Eb3:e E3:e F3:e | F#3:e G3:e G#3:e A3:e A#3:e B3:e C4:e C#4:e | D4:w', tempo=56,
                prompt='From D, the hands mirror each other: 3 on every black key in both.')))
    add('g-and-f-scales', 'f-scale-lh', S('After each hand alone, put them together, an octave apart, one octave up and back. Both thumbs start on the key note.'),
        X(timed('g-scale-ht', 'G major scale, hands together', right='G4:q A4:q B4:q C5:q | D5:q E5:q F#5:q G5:q | F#5:q E5:q D5:q C5:q | B4:q A4:q G4:h',
                left='G3:q A3:q B3:q C4:q | D4:q E4:q F#4:q G4:q | F#4:q E4:q D4:q C4:q | B3:q A3:q G3:h', tempo=56, key='G',
                rf='1 2 3 1 2 3 4 5 4 3 2 1 3 2 1', lf='5 4 3 2 1 3 2 1 2 3 1 2 3 4 5')),
        X(timed('f-scale-ht', 'F major scale, hands together', right='F4:q G4:q A4:q Bb4:q | C5:q D5:q E5:q F5:q | E5:q D5:q C5:q Bb4:q | A4:q G4:q F4:h',
                left='F3:q G3:q A3:q Bb3:q | C4:q D4:q E4:q F4:q | E4:q D4:q C4:q Bb3:q | A3:q G3:q F3:h', tempo=56, key='F',
                rf='1 2 3 4 1 2 3 4 3 2 1 4 3 2 1', lf='5 4 3 2 1 3 2 1 2 3 1 2 3 4 5')))
    add('minor-five-finger', 'd-minor-position-lh', S('Both hands in A minor position and then D minor, an octave apart.'),
        X(timed('a-minor-position-ht', 'A minor position, hands together', right='A4:q B4:q C5:q D5:q | E5:w | E5:q D5:q C5:q B4:q | A4:w',
                left='A3:q B3:q C4:q D4:q | E4:w | E4:q D4:q C4:q B3:q | A3:w', tempo=72, rf='1 2 3 4 5 5 4 3 2 1', lf='5 4 3 2 1 1 2 3 4 5')),
        X(timed('d-minor-position-ht', 'D minor position, hands together', right='D4:q E4:q F4:q G4:q | A4:w | A4:q G4:q F4:q E4:q | D4:w',
                left='D3:q E3:q F3:q G3:q | A3:w | A3:q G3:q F3:q E3:q | D3:w', tempo=72, rf='1 2 3 4 5 5 4 3 2 1', lf='5 4 3 2 1 1 2 3 4 5')))

def more_ht():
    add('dotted-quarter', 'ode-to-joy-dotted', S('With the left hand on the roots: C under the home bars, G under the bars that lean away.'),
        X(timed('ode-to-joy-dotted-ht', 'Ode to Joy with a bass', right='E4:q E4:q F4:q G4:q | G4:q F4:q E4:q D4:q | C4:q C4:q D4:q E4:q | E4:q. D4:e D4:h | E4:q E4:q F4:q G4:q | G4:q F4:q E4:q D4:q | C4:q C4:q D4:q E4:q | D4:q. C4:e C4:h',
                left=accompany('C | G | C | G | C | G | C | G C', '4/4', 'root'), tempo=72, display='staff')))
    add('eighth-notes', 'hot-cross-buns-eighths', S('Eighths in the right hand over a slow left hand.'),
        X(timed('hot-cross-buns-eighths-ht', 'Hot Cross Buns, eighths and a bass', right='E4:q D4:q C4:h | E4:q D4:q C4:h | C4:e C4:e C4:e C4:e D4:e D4:e D4:e D4:e | E4:q D4:q C4:h',
                left='C3:w | C3:w | C3:h G2:h | C3:w', tempo=72, rf='3 2 1 3 2 1 1 1 1 1 2 2 2 2 3 2 1', lf='5 5 5 1 5')))

def lesson_ids(d): return [s['exercise'] for s in d['steps'] if 'exercise' in s]

def apply():
    ht_exercises()
    more_ht()
    lesson_files = {f for f in os.listdir(os.path.join(C, 'lessons'))}
    for f in sorted(lesson_files):
        rel = f'content/lessons/{f}'
        try: src = original(rel)
        except subprocess.CalledProcessError: continue
        s = fix_text(src)
        d = yaml.safe_load(s)
        if d['id'] in MILESTONE_TITLES: d['title'] = MILESTONE_TITLES[d['id']]
        if d['id'] == 'g-and-f-scales': d['title'] = 'G and F major scales'
        for after, steps in ADD.get(d['id'], []):
            idx = len(d['steps'])
            if after != 'LAST':
                idx = next(i for i, x in enumerate(d['steps']) if x.get('exercise') == after) + 1
            d['steps'][idx:idx] = steps
        if s != src or d['id'] in MILESTONE_TITLES or d['id'] in ADD:
            dump(os.path.join(ROOT, rel), {k: (txt(v) if isinstance(v, str) and '\n' in v else v) for k, v in d.items()})
    for f in os.listdir(os.path.join(C, 'exercises')):
        rel = f'content/exercises/{f}'
        try: src = original(rel)
        except subprocess.CalledProcessError: continue
        s = fix_text(src)
        if s != src: open(os.path.join(ROOT, rel), 'w').write(s)

# ---------------------------------------------------------------- the tree

ROOTS = {
    # Each branch has its own starting point (no requirements); the rest are woven together.
    'finger-numbers': [],
    'steady-beat': ['rhythm-tap-the-beat'],
    'ear-high-low': ['ear-same-different', 'high-and-low'],
    'treble-staff': ['reading-lines-and-spaces', 'middle-c-position'],
}

def tree_edits(nodes):
    for id, req in ROOTS.items():
        nodes[id]['requires'] = req
    for id, t in MILESTONE_TITLES.items(): nodes[id]['title'] = t
    nodes['g-and-f-scales']['title'] = 'G and F major scales'
    # Songbooks open with the milestones, like every song.
    sb = {'songbook-1': ('y1-checkpoint-a', 2), 'songbook-2': ('y1-checkpoint-b', 3), 'songbook-3': ('y1-checkpoint-b', 3), 'songbook-4': ('y1-exit', 4)}
    for id, (ms, st) in sb.items():
        nodes[id].update(requires=[ms], stage=st, title=nodes[id]['title'].replace('Songbook: ', ''))
    for n in nodes.values():
        if n['branch'] == 'milestones':
            n['requires'] = [r for r in n['requires'] if r not in sb]
    for id, extra in CROSS.items():
        for r in extra:
            if r not in nodes[id]['requires']: nodes[id]['requires'].append(r)

# Cross-branch links added to original nodes (playing leans on rhythm, ear on theory, and so on).
CROSS = {
    'rests-and-taking-turns': ['rhythm-long-and-short'],
    'dynamics': ['ear-loud-soft'],
    'ear-echo-three-notes': ['ear-echo-two'],
    'hands-together-held': ['rhythm-two-hands-taking-turns'],
    'hands-together-parallel': ['rhythm-two-hands-together'],
    'eighth-notes': ['rhythm-two-four'],
    'ear-degrees-1-5': ['ear-find-the-note'],
    'c-scale-hands-together': ['rhythm-eighth-patterns'],
    'two-octave-c': ['technique-scale-in-eighths'],
    'triads-on-every-degree': ['ear-how-many'],
    'ear-melodic-intervals': ['ear-octave-or-fifth'],
    'pedal-simple': ['ear-how-many'],
}

TREE_EDITS = [tree_edits]

def run(base):
    apply()
