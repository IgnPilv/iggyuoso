# Cross-branch prerequisites (Ignas: "you don't go learning ear in chords while you don't know how
# they are structured... in reality that's how learning works, there are prerequisites").
# Each entry says what a node really uses from another branch: ear drills need the theory that
# names what they hear, playing needs the rhythm and reading it relies on, composing needs the
# harmony it writes with. Applied after every other module, as a tree edit.

# node: [what it needs]
NEEDS = {
    # Ear <- theory: hear a thing once its structure has been taught.
    'ear-major-minor': ['tonic-triad'],
    'ear-how-many': ['tonic-triad'],
    'ear-degrees-1-5': ['intervals-to-fifth'],
    'ear-degree-3-and-thirds': ['steps-and-skips', 'major-scale-pattern'],
    'ear-scale-steps': ['major-scale-pattern'],
    'ear-all-degrees': ['theory-degree-names'],
    'ear-cadences': ['chord-symbols'],
    'ear-seconds-thirds': ['seconds-major-minor'],
    'ear-half-steps': ['seconds-major-minor', 'sharps-flats-naturals'],
    'ear-fourths-fifths-sixths': ['interval-map'],
    'ear-triad-qualities': ['theory-minor-chords'],
    'ear-chords-anywhere': ['theory-minor-chords'],
    'ear-all-intervals': ['theory-interval-quality'],
    'ear-intervals-down': ['interval-map'],
    'ear-seventh-chords': ['dominant-seventh-theory'],
    'ear-seventh-qualities': ['theory-seventh-chords'],
    'ear-four-triads': ['theory-aug-dim'],
    'ear-tritone': ['theory-aug-dim'],
    'ear-chromatic-degrees': ['theory-enharmonics'],
    'ear-minor-phrases': ['harmonic-minor'],
    'ear-degrees-f-dm': ['f-position-key-of-f', 'relative-minor'],
    # Technique <- theory and rhythm: play what has been explained, in rhythms already counted.
    'minor-five-finger': ['ear-major-minor', 'tonic-triad'],
    'technique-positions-d-a-e': ['sharps-flats-naturals'],
    'technique-scales-d-a-one-octave': ['major-scale-pattern', 'theory-keys-two-and-three'],
    'staccato': ['theory-tempo-words'],
    'technique-alberti': ['rhythm-eighth-patterns'],
    'touch-crescendo': ['theory-tempo-words'],
    'chromatic-scale': ['theory-enharmonics'],
    'scales-d-major-e-minor': ['theory-keys-two-and-three', 'natural-minor'],
    'technique-cadences-first-keys': ['cadence-in-f'],
    'technique-cadences-sharp-keys': ['circle-of-fifths'],
    'technique-scales-flat-keys': ['theory-keys-two-and-three', 'circle-of-fifths'],
    'technique-blues-shapes': ['theory-twelve-bar-blues'],
    # Key studies <- the key signature theory for that key; musicianship <- hearing degrees.
    **{k: ['keys-and-signatures'] for k in ['ks-c', 'ks-g', 'ks-f']},
    **{k: ['relative-minor'] for k in ['ks-a-minor', 'ks-d-minor']},
    **{k: ['theory-keys-two-and-three'] for k in ['ks-d', 'ks-a', 'ks-b-flat', 'ks-e', 'ks-e-flat']},
    **{k: ['theory-minor-key-signatures'] for k in ['ks-e-minor', 'ks-b-minor', 'ks-g-minor']},
    **{k: ['theory-all-key-signatures'] for k in ['ks-b', 'ks-f-sharp-minor', 'ks-c-minor', 'ks-a-flat', 'ks-d-flat',
                                                   'ks-f-sharp', 'ks-f-minor', 'ks-c-sharp-minor', 'ks-b-flat-minor', 'ks-e-flat-minor']},
    # Reading <- theory and rhythm.
    'reading-steps-and-skips-sight': ['steps-and-skips'],
    'reading-two-hands-first': ['rhythm-two-hands-together'],
    'reading-ledger-lines': ['theory-octaves'],
    'reading-high-and-low': ['theory-octaves'],
    'reading-chords-sight': ['chord-symbols'],
    'reading-ht-eight-bars': ['rhythm-eighths-two-hands'],
    'sight-reading-y1': ['theory-note-value-maths'],
    'reading-other-meters': ['theory-compound-time'],
    'reading-flat-keys-sight': ['theory-keys-two-and-three'],
    'reading-sharp-keys-sight': ['theory-keys-two-and-three'],
    'reading-eight-bars': ['rhythm-sixteenths-two-hands'],
    # Rhythm <- theory: meters once time signatures are explained.
    'three-eight-time': ['theory-time-signatures'],
    'rhythm-cut-time': ['theory-time-signatures'],
    'rhythm-compound-meters': ['theory-compound-time'],
    'rhythm-hemiola': ['theory-compound-time'],
    'rhythm-odd-meters': ['theory-time-signatures'],
    # Pieces <- the reading, rhythm, keys and harmony they are made of.
    'pieces-hands-together': ['reading-two-hands-first'],
    'piece-etude-g-position': ['reading-g-and-f-positions'],
    'recital-three-pieces': ['theory-road-map'],
    'piece-etude-eighths-c': ['rhythm-eighth-patterns'],
    'minuet-first-half': ['rhythm-waltz-patterns', 'key-of-g'],
    'korobeiniki': ['dotted-quarter'],
    'piece-canon-theme': ['theory-keys-two-and-three'],
    'piece-eine-kleine': ['rhythm-sixteenth-patterns'],
    'piece-waltz-a-minor': ['rhythm-waltz-patterns'],
    'minuet-in-g': ['minuet-first-half'],
    'variations-lightly-row': ['theory-phrases-and-form'],
    'piece-fur-elise': ['three-eight-time', 'pedal-simple'],
    'piece-gymnopedie': ['theory-seventh-chords'],
    'piece-sonatina-c': ['theory-phrases-and-form'],
    'piece-turkish-march': ['natural-minor'],
    'piece-prelude-in-c': ['harmony-progressions'],
    'piece-nocturne-f': ['harmony-progressions'],
    'piece-etude-chords-in-eb': ['theory-keys-two-and-three'],
    'piece-blues-in-c': ['rhythm-shuffle'],
    # Creativity <- the theory and ear it writes with.
    'compose-motif': ['steps-and-skips'],
    'improvise-over-drone': ['major-scale-pattern'],
    'compose-sequence': ['intervals-to-fifth'],
    'compose-shape': ['intervals-to-fifth'],
    'creativity-make-a-bass': ['chord-symbols'],
    'compose-endings': ['theory-degree-names'],
    'harmonise-i-v': ['ear-cadences'],
    'harmonise-i-iv-v': ['ear-chord-function'],
    'transposing': ['theory-degree-names'],
    'creativity-harmonise-minor': ['theory-minor-chords', 'ear-minor-degrees'],
    'creativity-minor-pentatonic': ['natural-minor'],
    'creativity-blues-improv': ['theory-twelve-bar-blues', 'rhythm-shuffle'],
    'compose-modes': ['harmony-modes'],
    # Theory <- the ear and keys it explains.
    'major-scale-pattern': ['sharps-flats-naturals'],
    'relative-minor': ['ear-major-minor'],
    'perfect-intervals': ['intervals-to-fifth'],
}

# Nodes moved so that what they need comes first.
STAGE = {
    'theory-seventh-chords': 7,   # Ear and pieces of stage 7 hear and play maj7 and min7.
    'ear-seventh-chords': 7,      # After the dominant 7th is taught.
}

# Requirements turned the other way round: the theory comes before the composing.
DROP = {'harmony-modes': ['compose-modes']}

def link(nodes):
    for id, st in STAGE.items():
        nodes[id]['stage'] = st
    for id, gone in DROP.items():
        nodes[id]['requires'] = [r for r in nodes[id]['requires'] if r not in gone]
    for id, extra in NEEDS.items():
        n = nodes[id]
        for r in extra:
            req = nodes[r]
            assert req['stage'] <= n['stage'], f'{id} (stage {n["stage"]}) cannot need {r} (stage {req["stage"]})'
            if r not in n['requires']: n['requires'].append(r)

TREE_EDITS = [link]
