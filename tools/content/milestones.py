# Milestones 7 to 9 (the trunk beyond the original six), and the new branches' nodes added to the
# requirements of every milestone, so each milestone checks a little of every branch of its stage.
from lib import *
import technique as T

def M(id, stage, title, requires, steps, recap):
    lesson(id, title, steps, recap, skills=['technique', 'reading', 'rhythm', 'theory', 'ear', 'repertoire'])
    node(id, 'milestones', stage, title, requires, type='checkpoint')

def paper(id, title, qs):
    return X(quiz(id, title, qs, reps=1, days=1, feedback='none', prompt='A theory paper: answers are only noted, and the results list what to revise.'))

def ear_test(id, title, items, cadence=None):
    return X(ear(id, title, items, questions=20, reps=1, days=1, feedback='none', cadence=cadence, prompt='An ear test: no colours, no hints. The results list each miss with its answer.'))

def sight(id, title, keys, meter='4/4', left='fifths'):
    return X(gen(id, title, 'sight-read', reps=1, days=1, hand='together', clef='grand', notes='C4-D5', keys=keys, left=left, meter=meter,
                 durations=['q', 'h', 'e'], bars=8, tempo=60, mastery={'accuracy': 90}, prompt='Sight-reading: one look, then play it through without stopping.'))

ADD_REQS = {
    'y1-checkpoint-a': ['technique-c-position-two-hands', 'rhythm-two-hands-together', 'piece-two-hand-hop', 'ear-echo-two'],
    'y1-checkpoint-b': ['technique-positions-c-g-f', 'rhythm-two-hands-different', 'reading-two-hands-first', 'ear-five-keys', 'theory-time-signatures'],
    'y1-exit': ['technique-scale-in-eighths', 'rhythm-eighths-two-hands', 'reading-two-hands-fifths', 'ear-octave-or-fifth', 'theory-road-map'],
    'y2-checkpoint-a': ['technique-minor-scales-ht', 'rhythm-sixteenths-two-hands', 'reading-chords-sight', 'ear-seconds-thirds', 'theory-keys-two-and-three', 'piece-canon-theme'],
    'y2-checkpoint-b': ['technique-cadences-first-keys', 'rhythm-triplet-patterns', 'reading-sight-many-keys', 'ear-triad-qualities', 'theory-interval-quality', 'piece-eine-kleine'],
    'y2-exit': ['technique-positions-all-keys', 'rhythm-six-eight-hands', 'reading-other-meters', 'ear-all-intervals', 'theory-minor-key-signatures', 'piece-fur-elise'],
}

def add_reqs(nodes):
    for id, extra in ADD_REQS.items():
        for r in extra:
            if r not in nodes[id]['requires']: nodes[id]['requires'].append(r)

TREE_EDITS = [add_reqs]

def run(base):
    M('m7-flat-keys', 7, 'Milestone 7: flat keys and compound time',
      ['technique-scales-flat-keys', 'technique-cadences-flat-keys', 'rhythm-compound-meters', 'reading-flat-keys-sight', 'ear-seventh-qualities', 'dominant-seventh-theory', 'piece-gymnopedie', 'piece-sonatina-c'], [
        S("""**Milestone 7.** Flat keys, compound time, the dominant 7th and two new pieces. Pass it, and the next stage of your
        tree grows, with new songs."""),
        paper('m7-theory-paper', 'Theory paper', [
            Q('B♭ major has how many flats?', '2', ['1', '3', '4'], 'B♭ and E♭.'),
            Q('E♭ major has how many flats?', '3', ['2', '4', '1'], 'B♭, E♭, A♭.'),
            Q('The relative minor of B♭ major is...', 'G minor', ['D minor', 'C minor'], 'Down a minor 3rd from B♭: G.'),
            Q('The relative minor of E♭ major is...', 'C minor', ['G minor', 'F minor'], 'Down a minor 3rd from E♭: C.'),
            Q('9/8 has how many beats?', '3', ['9', '2', '4'], 'Three dotted quarters.'),
            Q('12/8 has how many beats?', '4', ['12', '6', '3'], 'Four dotted quarters.'),
            Q('V7 in B♭ major is...', 'F A C E♭', ['F A C E', 'B♭ D F A♭'], 'Degree 5 of B♭ is F; its minor 7th is E♭.'),
            Q('V7 in C minor is...', 'G B D F', ['G B♭ D F', 'C E♭ G B♭'], 'Minor keys raise the 7th: B♮.'),
            Q('In V7–I, the 7th of the chord usually...', 'Falls a step', ['Rises a step', 'Stays'], 'F → E in G7–C.'),
            Q('A perfect cadence in E♭ major is...', 'B♭ to E♭', ['A♭ to E♭', 'E♭ to B♭'], 'V to I.'),
            Q('Which is compound time?', '6/8', ['3/4', '2/4', '4/4'], 'Beats in three eighths.'),
            Q('The key with one flat in its signature, minor, is...', 'D minor', ['G minor', 'A minor'], 'Relative of F major.'),
        ]),
        X(T.scale_ht('Bb', suffix='-m7')), X(T.scale_ht('Cm', suffix='-m7')),
        ear_test('m7-ear-test', 'Ear test', [{'type': 'chord', 'pool': ['dom7', 'maj7', 'min7'], 'root': 'C4'}, {'type': 'interval', 'pool': ['m6', 'M6', 'm7', 'M7'], 'from': 'C4', 'direction': 'up', 'answer': 'name'}]),
        sight('m7-sight-reading', 'Sight-reading', ['F', 'Bb', 'Eb', 'Dm', 'Gm', 'Cm']),
    ], 'Milestone 7 passed: flat keys and compound time.')

    M('m8-arpeggios', 8, 'Milestone 8: arpeggios and the dominant seventh',
      ['technique-two-octave-scales-ht', 'technique-arpeggios-two-octaves', 'technique-dominant-sevenths', 'technique-scales-ab-db', 'rhythm-three-against-two', 'reading-eight-bars', 'ear-cadence-types', 'theory-seventh-chords', 'piece-prelude-in-c', 'm7-flat-keys'], [
        S("""**Milestone 8.** Two-octave scales and arpeggios, dominant 7ths, three against two, eight-bar sight-reading and
        Bach's Prelude in C."""),
        paper('m8-theory-paper', 'Theory paper', [
            Q('Cmaj7 is...', 'C E G B', ['C E G B♭', 'C E♭ G B♭'], 'Major triad + major 7th.'),
            Q('Dm7 is...', 'D F A C', ['D F♯ A C', 'D F A C♯'], 'Minor triad + minor 7th.'),
            Q('An augmented triad on C is...', 'C E G♯', ['C E♭ G♭', 'C E G'], 'Two major 3rds.'),
            Q('A diminished triad on B is...', 'B D F', ['B D F♯', 'B D♯ F♯'], 'Two minor 3rds.'),
            Q('V–vi is called...', 'An interrupted cadence', ['A plagal cadence', 'A perfect cadence'], 'The surprise ending.'),
            Q('IV–I is called...', 'A plagal cadence', ['An imperfect cadence', 'An interrupted cadence'], '"Amen".'),
            Q('A♭ major has how many flats?', '4', ['3', '5', '2'], 'B♭ E♭ A♭ D♭.'),
            Q('D♭ major has how many flats?', '5', ['4', '6', '3'], 'B♭ E♭ A♭ D♭ G♭.'),
            Q('Over C, the melody goes C D E. D is...', 'A passing note', ['A chord note', 'A neighbour note'], 'It steps between two chord notes.'),
            Q('In three against two, the hands meet...', 'On every beat', ['Never', 'Every other note'], 'Both start each beat together.'),
            Q('The triad on degree 7 of a major key is...', 'Diminished', ['Minor', 'Major'], 'B D F in C.'),
            Q('The 7th chord on degree 5 of a major key is...', 'A dominant 7th', ['A major 7th', 'A minor 7th'], 'Major triad + minor 7th.'),
        ]),
        T.arpeggio('D', 2), X(T.scale_ht('Ab', suffix='-m8')),
        ear_test('m8-ear-test', 'Ear test', [{'type': 'chord', 'pool': ['maj', 'min', 'dim', 'aug'], 'root': 'C4'}, {'type': 'interval', 'pool': ['P4', 'TT', 'P5', 'm7', 'M7'], 'from': 'C4', 'direction': 'up', 'answer': 'name'}]),
        sight('m8-sight-reading', 'Sight-reading', ['C', 'G', 'D', 'A', 'F', 'Bb', 'Eb', 'Am', 'Em', 'Dm', 'Gm'], left='chords'),
    ], 'Milestone 8 passed: arpeggios and sevenths.')

    M('m9-form-and-blues', 9, 'Milestone 9: form, octaves and the blues',
      ['technique-octaves', 'technique-blues-shapes', 'rhythm-groove', 'rhythm-hemiola', 'reading-any-key', 'ear-echo-eight', 'ear-chromatic-degrees', 'theory-sonata-and-rondo', 'theory-writing-melodies', 'piece-blues-in-c', 'piece-etude-arpeggios', 'creativity-blues-improv', 'm8-arpeggios'], [
        S("""**Milestone 9.** The last milestone of the tree as it stands: form, octaves, grooves, the blues, any key at sight."""),
        paper('m9-theory-paper', 'Theory paper', [
            Q('Rondo form is...', 'A B A C A', ['A B', 'A B A'], 'The theme keeps coming back.'),
            Q('Sonata form\'s three parts are...', 'Exposition, development, recapitulation', ['Verse, chorus, bridge', 'A, B, A'], 'Present, travel, return.'),
            Q('In a major-key exposition, the second theme is in...', 'The dominant', ['The tonic', 'The subdominant'], 'C major → G.'),
            Q('Bar 9 of a twelve-bar blues is...', 'V', ['IV', 'I'], 'V IV I V to finish.'),
            Q('The C blues scale is...', 'C E♭ F F♯ G B♭', ['C D E G A', 'C D E♭ F G A♭ B♭'], 'Minor pentatonic + the blue note.'),
            Q('A hemiola makes 6/8 sound briefly like...', '3/4', ['2/4', '4/4'], 'Three quarters across the bar.'),
            Q('Swing eighths are played...', 'Long-short', ['Even', 'Short-long'], 'Like a triplet with the middle tied.'),
            Q('After a leap, a good melody usually...', 'Steps back the other way', ['Leaps again', 'Stops'], 'It fills the gap.'),
            Q('A sequence is...', 'A pattern repeated on a different note', ['A cadence', 'A key change'], 'Repetition at another pitch.'),
            Q('♭3 in C major is...', 'E♭', ['E', 'D♯'], 'Lowered third degree: E♭.'),
            Q('♯4 in C major is...', 'F♯', ['G♭', 'F'], 'Raised fourth: F♯.'),
            Q('The recapitulation brings the second theme back in...', 'The tonic', ['The dominant', 'The relative minor'], 'Everything comes home.'),
        ]),
        X(T.scale_ht('E', 1, True, 66, suffix='-m9')), X(timed('m9-octaves', 'Octaves', right='C4+C5:q D4+D5:q E4+E5:q F4+F5:q | G4+G5:q A4+A5:q B4+B5:q C5+C6:q | B4+B5:q A4+A5:q G4+G5:q F4+F5:q | E4+E5:q D4+D5:q C4+C5:h',
                                                                                left='C3:w | C3:w | G2:w | C3:w', tempo=72, ladder=False, reps=1, days=1)),
        ear_test('m9-ear-test', 'Ear test', [{'type': 'degree', 'key': 'C', 'pool': [1, 'b3', 3, '#4', 5, 6, 7]}], cadence='C'),
        sight('m9-sight-reading', 'Sight-reading', ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab', 'Am', 'Em', 'Bm', 'Dm', 'Gm', 'Cm'], meter='3/4', left='roots'),
    ], 'Milestone 9 passed: the whole tree, grown.')
