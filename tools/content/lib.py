# Shared helpers for the content generators: music (spelling, keys, chords, note strings), the
# writers for exercises, lessons and tree nodes, and theory-screen and quiz builders.
#
# Run everything with: python3 tools/content/build.py   (from the repo root)
import os, re, random, textwrap, json
import yaml

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
C = os.path.join(ROOT, 'content')

# ---------------------------------------------------------------- YAML output

class Lit(str): pass
yaml.add_representer(Lit, lambda d, s: d.represent_scalar('tag:yaml.org,2002:str', s, style='|'))

def txt(t):
    # Text may start right after the opening quotes, with the following lines indented like code.
    first, _, rest = t.partition('\n')
    t = first.strip() + '\n' + textwrap.dedent(rest) if first.strip() else textwrap.dedent(rest)
    return Lit(t.strip() + "\n")

def lits(o):
    """Multi-line strings as | blocks, everywhere in a structure."""
    if isinstance(o, dict): return {k: lits(v) for k, v in o.items()}
    if isinstance(o, list): return [lits(v) for v in o]
    if isinstance(o, str) and not isinstance(o, Lit) and '\n' in o: return Lit(o if o.endswith('\n') else o + '\n')
    return o

WRITTEN = set()

def dump(path, d):
    WRITTEN.add(os.path.relpath(path, ROOT))
    d = lits(d)
    s = yaml.dump(d, sort_keys=False, allow_unicode=True, width=120, default_flow_style=False)
    with open(path, 'w') as f: f.write(s)

# ---------------------------------------------------------------- pitch and spelling

LETTERS = 'CDEFGAB'
NATURAL = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
ACC = {'': 0, '#': 1, 'b': -1, '##': 2, 'bb': -2}

def midi(n):
    """'C#4' -> 61"""
    m = re.fullmatch(r'([A-G])(##|bb|#|b)?(-?\d)', n)
    assert m, n
    return 12 * (int(m.group(3)) + 1) + NATURAL[m.group(1)] + ACC[m.group(2) or '']

def spell(letter, octave, semis):
    """The note with this letter nearest to `semis` (a MIDI number); octave is the letter's octave."""
    base = 12 * (octave + 1) + NATURAL[letter]
    d = semis - base
    acc = {0: '', 1: '#', -1: 'b', 2: '##', -2: 'bb'}[d]
    return f'{letter}{acc}{octave}'

def letter_of(n): return n[0]
def octave_of(n): return int(re.search(r'-?\d$', n).group())

def step_up(note, steps, semis):
    """Note `steps` letters above `note` that is `semis` semitones above it (spelled properly)."""
    li = LETTERS.index(note[0]) + steps
    letter = LETTERS[li % 7]
    octave = octave_of(note) + li // 7
    return spell(letter, octave, midi(note) + semis)

def step_down(note, steps, semis):
    li = LETTERS.index(note[0]) - steps
    letter = LETTERS[li % 7]
    octave = octave_of(note) + (li // 7)
    return spell(letter, octave, midi(note) - semis)

MAJOR = [0, 2, 4, 5, 7, 9, 11]
NAT_MINOR = [0, 2, 3, 5, 7, 8, 10]
HARM_MINOR = [0, 2, 3, 5, 7, 8, 11]

def scale(tonic, kind='major', octaves=1, down=False):
    """Spelled scale from a tonic like 'G3': major, minor (natural), harmonic, melodic (up only)."""
    steps = {'major': MAJOR, 'minor': NAT_MINOR, 'harmonic': HARM_MINOR, 'melodic': [0, 2, 3, 5, 7, 9, 11]}[kind]
    out = []
    for o in range(octaves):
        for i, s in enumerate(steps):
            out.append(step_up(tonic, i + 7 * o, s + 12 * o))
    out.append(step_up(tonic, 7 * octaves, 12 * octaves))
    if down:
        back = out[-2::-1]
        if kind == 'melodic':  # comes down as the natural minor
            nat = scale(tonic, 'minor', octaves)
            back = nat[-2::-1]
        out = out + back
    return out

def degree(tonic, kind, d, octave_shift=0):
    """Scale degree d (1-based, may exceed 7 or be below 1) of the key whose tonic is `tonic`."""
    steps = {'major': MAJOR, 'minor': NAT_MINOR, 'harmonic': HARM_MINOR}[kind]
    i = d - 1
    o, r = divmod(i, 7)
    return step_up(tonic, i, steps[r] + 12 * o) if i >= 0 else step_down(tonic, -i, -(steps[r] + 12 * o))

def transpose(note, steps, semis):
    return step_up(note, steps, semis) if steps >= 0 else step_down(note, -steps, -semis)

# Keys: name -> (tonic letter+acc, mode)
KEY_TONIC = {
    'C': 'C', 'G': 'G', 'D': 'D', 'A': 'A', 'E': 'E', 'B': 'B', 'F#': 'F#', 'F': 'F', 'Bb': 'Bb', 'Eb': 'Eb', 'Ab': 'Ab', 'Db': 'Db',
    'Am': 'A', 'Em': 'E', 'Bm': 'B', 'F#m': 'F#', 'C#m': 'C#', 'Dm': 'D', 'Gm': 'G', 'Cm': 'C', 'Fm': 'F', 'G#m': 'G#', 'Bbm': 'Bb', 'Ebm': 'Eb', 'Gb': 'Gb',
}
def key_mode(k): return 'minor' if k.endswith('m') else 'major'
def tonic_note(k, octave):
    return KEY_TONIC[k] + str(octave)

# ---------------------------------------------------------------- chords

CHORD_TYPES = {'': (0, 4, 7), 'm': (0, 3, 7), 'dim': (0, 3, 6), 'aug': (0, 4, 8), '7': (0, 4, 7, 10), 'maj7': (0, 4, 7, 11), 'm7': (0, 3, 7, 10), 'sus4': (0, 5, 7), 'sus2': (0, 2, 7)}
CHORD_STEPS = {'': (0, 2, 4), 'm': (0, 2, 4), 'dim': (0, 2, 4), 'aug': (0, 2, 4), '7': (0, 2, 4, 6), 'maj7': (0, 2, 4, 6), 'm7': (0, 2, 4, 6), 'sus4': (0, 3, 4), 'sus2': (0, 1, 4)}

def parse_chord(sym):
    m = re.fullmatch(r'([A-G](?:#|b)?)(maj7|m7|dim|aug|sus4|sus2|m|7)?', sym)
    assert m, sym
    return m.group(1), m.group(2) or ''

def chord_tones(sym, root_octave=3):
    """Spelled chord tones, root position, root in `root_octave`."""
    root, q = parse_chord(sym)
    r = root + str(root_octave)
    return [step_up(r, st, se) for st, se in zip(CHORD_STEPS[q], CHORD_TYPES[q])]

def lh_root(sym, lo=41, hi=52):
    """The chord's root in the left hand's bass register (F2..E3 by default)."""
    root, _ = parse_chord(sym)
    for o in (1, 2, 3, 4):
        n = root + str(o)
        if lo <= midi(n) <= hi: return n
    raise ValueError(sym)

def voicings(sym):
    """Close triad voicings (root, 1st, 2nd inversion) over a range of octaves."""
    out = []
    root, q = parse_chord(sym)
    tones3 = chord_tones(sym, 2)[:3] if q in ('7',) else chord_tones(sym, 2)[:3]
    for o in (0, 1, 2):
        base = [transpose(t, 7 * o, 12 * o) for t in tones3]
        out.append(base)
        out.append([base[1], base[2], transpose(base[0], 7, 12)])
        out.append([base[2], transpose(base[0], 7, 12), transpose(base[1], 7, 12)])
    if q == '7':  # V7 as root, 3rd, 7th (a playable shell) - keep triads plus the shells
        t = chord_tones(sym, 2)
        for o in (0, 1):
            out.append([transpose(t[0], 7 * o, 12 * o), transpose(t[1], 7 * o, 12 * o), transpose(t[3], 7 * o, 12 * o)])
    return out

def lh_block(sym, prev=None, lo=45, top=59):
    """A left-hand triad voicing close to the previous one, lowest note >= lo, top <= top."""
    cands = [v for v in voicings(sym) if midi(v[0]) >= lo and midi(v[-1]) <= top]
    if not cands: cands = [v for v in voicings(sym) if midi(v[-1]) <= top + 2]
    if prev is None:
        root, _ = parse_chord(sym)
        roots = [v for v in cands if v[0][:-1] == root] or cands
        return min(roots, key=lambda v: abs(sum(midi(x) for x in v) / len(v) - 53))
    pm = sum(midi(x) for x in prev) / len(prev)
    return min(cands, key=lambda v: abs(sum(midi(x) for x in v) / len(v) - pm))

# ---------------------------------------------------------------- note strings

DUR = {'w': 4, 'h': 2, 'q': 1, 'e': 0.5, 's': 0.25}
DUR_NAME = {4: 'w', 3: 'h.', 2: 'h', 1.5: 'q.', 1: 'q', 0.75: 'e.', 0.5: 'e', 0.25: 's'}

def dur_value(d):
    m = re.fullmatch(r'([whqes])(\.?)(3?)', d)
    assert m, d
    v = DUR[m.group(1)]
    if m.group(2): v *= 1.5
    if m.group(3): v = v * 2 / 3
    return v

def meter_quarters(meter):
    n, d = map(int, meter.split('/'))
    return n * 4 / d

def tokens(s):
    """'C4:q D4:e | E4:h' -> list of bars, each a list of (notes-or-'r', durstring, tie)."""
    bars = []
    for b in s.split('|'):
        toks = []
        for t in b.split():
            p, d = t.split(':')
            tie = d.endswith('~')
            d = d.rstrip('~')
            toks.append((p, d, tie))
        bars.append(toks)
    return bars

def bar_len(bar): return sum(dur_value(d) for _, d, _ in bar)

def check_bars(s, meter, pickup=0.0, where=''):
    q = meter_quarters(meter)
    bars = tokens(s)
    for i, b in enumerate(bars):
        L = bar_len(b)
        want = pickup if i == 0 and pickup else q
        if i == len(bars) - 1 and pickup and abs(L - (q - pickup)) < 1e-6: continue
        assert abs(L - want) < 1e-6, f'{where}: bar {i+1} has {L}, wants {want}: {s}'
    return len(bars)

def fill(beats, pitch='r'):
    """Note values adding to `beats` quarters (largest first), for rests or held notes (tied)."""
    out = []
    for v, n in [(4, 'w'), (3, 'h.'), (2, 'h'), (1.5, 'q.'), (1, 'q'), (0.75, 'e.'), (0.5, 'e'), (0.25, 's')]:
        while beats >= v - 1e-9:
            out.append(n); beats -= v
    return out

def held(pitch, beats):
    """A note held `beats` quarters, tied if no single value fits."""
    vals = fill(beats)
    if pitch == 'r': return ' '.join(f'r:{v}' for v in vals)
    return ' '.join(f'{pitch}:{v}' + ('~' if i < len(vals) - 1 else '') for i, v in enumerate(vals))

def pitches_in(s):
    out = []
    for b in tokens(s):
        for p, _, _ in b:
            if p != 'r' and p != 'x': out += p.split('+')
    return out

def transpose_string(s, steps, semis):
    """Transpose every pitch in a note string by letter steps and semitones."""
    def tr(tok):
        p, d = tok.split(':')
        if p in ('r', 'x'): return tok
        return '+'.join(transpose(x, steps, semis) for x in p.split('+')) + ':' + d
    return ' | '.join(' '.join(tr(t) for t in b.split()) for b in s.split('|'))

def shift_octave(s, n):
    return transpose_string(s, 7 * n, 12 * n)

# ---------------------------------------------------------------- left-hand accompaniment

def parse_chords(chords, nbars):
    """'C | C G | F | G7 C' -> list per bar of chord symbols (1, 2 or 4 per bar, evenly split)."""
    bars = [b.split() for b in chords.split('|')]
    assert len(bars) == nbars, f'chords have {len(bars)} bars, melody {nbars}: {chords}'
    return bars

def accompany(chords, meter, style='root', pickup=0.0, last='hold'):
    """
    A left-hand part from chord symbols, one bar per melody bar.
    Styles: root (held root), fifth (root+fifth held), block (held triad), pulse (triad on each beat),
    oompah (root, then chord), waltz (3/4: root, chord, chord), broken (root-5-3-5 in eighths),
    arp (root-5-8-5 quarters), alberti (eighths, low-high-mid-high).
    """
    q = meter_quarters(meter)
    nb = len(chords.split('|'))
    bars = parse_chords(chords, nb)
    out = []
    prev = None
    compound = meter in ('6/8', '9/8', '12/8')
    for i, syms in enumerate(bars):
        length = pickup if (i == 0 and pickup) else (q - pickup if (pickup and i == nb - 1) else q)
        if i == 0 and pickup:
            out.append(held('r', length) if syms == ['-'] or syms == ['r'] else held('r', length))
            continue
        if syms in (['-'], ['r']):
            out.append(held('r', length)); continue
        each = length / len(syms)
        parts = []
        final = i == nb - 1 and last == 'hold'
        for sym in syms:
            st = 'block' if final and style not in ('root', 'fifth') else style
            r = lh_root(sym)
            if st == 'root':
                parts.append(held(r, each))
            elif st == 'fifth':
                f = step_up(r, 4, 7 if parse_chord(sym)[1] not in ('dim',) else 6)
                parts.append(held(f'{r}+{f}', each))
            elif st == 'block':
                v = lh_block(sym, prev); prev = v
                parts.append(held('+'.join(v), each))
            elif st == 'pulse':
                v = lh_block(sym, prev); prev = v
                beat = 1.5 if compound else 1
                n = int(round(each / beat))
                parts.append(' '.join(f"{'+'.join(v)}:{'q.' if compound else 'q'}" for _ in range(n)) if n * beat == each else held('+'.join(v), each))
            elif st in ('oompah', 'waltz'):
                v = lh_block(sym, prev); prev = v
                upper = '+'.join(x for x in v if midi(x) > midi(r)) or '+'.join(v)
                if compound:
                    if each == 3: parts.append(f'{r}:q. {upper}:q.')
                    else: parts.append(held('+'.join(v), each))
                elif each == 3: parts.append(f'{r}:q {upper}:q {upper}:q')
                elif each == 4: parts.append(f'{r}:q {upper}:q {step_up(r, 4, 7)}:q {upper}:q')
                elif each == 2: parts.append(f'{r}:q {upper}:q')
                else: parts.append(held('+'.join(v), each))
            elif st == 'broken':
                t = chord_tones(sym, octave_of(r))
                five, three = t[2], t[1]
                if compound:
                    cell = f'{r}:e {five}:e {three}:e'  # dotted-quarter beat
                    n = int(round(each / 1.5))
                    parts.append(' '.join([cell] * n) if n * 1.5 == each else held(r, each))
                else:
                    n = int(round(each))
                    if n * 1 == each and n >= 2:
                        cells = []
                        for k in range(n // 2):
                            cells.append(f'{r}:e {five}:e {three}:e {five}:e')
                        if n % 2: cells.append(f'{r}:q')
                        parts.append(' '.join(cells))
                    else: parts.append(held(r, each))
            elif st == 'arp':
                t = chord_tones(sym, octave_of(r))
                eight = transpose(r, 7, 12)
                n = int(round(each))
                seq = [r, t[2], eight, t[2]]
                parts.append(' '.join(f'{seq[k % 4]}:q' for k in range(n)) if n == each else held(r, each))
            elif st == 'alberti':
                v = lh_block(sym, prev); prev = v
                lo_, mid, hi_ = v[0], v[1], v[2]
                n = int(round(each))
                parts.append(' '.join(f'{lo_}:e {hi_}:e {mid}:e {hi_}:e' for _ in range(n // 2)) + (f' {lo_}+{mid}+{hi_}:q' if n % 2 else '') if n == each and n >= 2 else held('+'.join(v), each))
            else:
                raise ValueError(st)
        out.append(' '.join(parts))
    return ' | '.join(out)

# ---------------------------------------------------------------- registries and writers

EXERCISES, LESSONS, NODES = {}, {}, []

def ex(id, **d):
    """Write one exercise. Keys in the order the app's files use."""
    assert re.fullmatch(r'[a-z0-9-]+', id), id
    assert id not in EXERCISES, f'duplicate exercise {id}'
    if 'days' in d and 'reps' in d: assert d['days'] <= d['reps'], id
    if 'days' in d and 'reps' not in d: assert d['days'] <= 3, id
    out = {'id': id}
    for k in ('title', 'kind', 'generator', 'hand', 'prompt', 'display', 'clef', 'key', 'tempo', 'tempoLadder', 'meter', 'pickup', 'countIn'):
        if k in d: out[k] = d.pop(k)
    out.update(d)
    EXERCISES[id] = out
    dump(os.path.join(C, 'exercises', f'{id}.yaml'), out)
    return id

def timed(id, title, right=None, left=None, meter='4/4', tempo=72, hand=None, prompt=None, key=None, display=None,
          ladder=True, reps=None, days=None, pickup=None, fingers=None, rf=None, lf=None, pedal=None, clef=None, pitchMatch=None, check=True, dynamics=None):
    """A timed exercise with bar checks."""
    pk = 0.0
    if pickup:
        pk = sum(dur_value(x) for x in pickup.split()) if isinstance(pickup, str) else float(pickup)
    if right: check_bars(right, meter, pk, id)
    if left: check_bars(left, meter, pk, id)
    if right and left:
        assert len(right.split('|')) == len(left.split('|')), f'{id}: bar counts differ'
    if right: assert all(midi(p) >= midi('C3') for p in pitches_in(right)), f'{id}: right hand below C3'
    if left: assert all(midi(p) <= midi('C5') for p in pitches_in(left)), f'{id}: left hand above C5'
    h = hand or ('together' if right and left else 'right' if right else 'left')
    d = dict(title=title, kind='timed', hand=h)
    if prompt: d['prompt'] = prompt
    if display: d['display'] = display
    if clef: d['clef'] = clef
    if key and key != 'C': d['key'] = key
    d['tempo'] = tempo
    if ladder: d['tempoLadder'] = True
    d['meter'] = meter
    if pickup: d['pickup'] = pickup
    d['countIn'] = 1
    if right: d['right'] = right
    if left: d['left'] = left
    if pedal: d['pedal'] = pedal
    if dynamics:
        assert len(dynamics.split('|')) == len((right or left).split('|')), f'{id}: dynamics bars'
        d['dynamics'] = dynamics
    if fingers: d['fingers'] = fingers
    if rf: d['rightFingers'] = rf
    if lf: d['leftFingers'] = lf
    if pitchMatch: d['pitchMatch'] = pitchMatch
    if reps: d['reps'] = reps
    if days: d['days'] = days
    return ex(id, **d)

def tap(id, title, rhythm, meter='4/4', tempo=80, prompt=None, reps=None, days=None, ladder=True, **kw):
    pk = 0.0
    if kw.get('pickup'):
        pk = sum(dur_value(x) for x in kw['pickup'].split())
    check_bars(rhythm, meter, pk, id)
    d = dict(title=title, kind='tap')
    if prompt: d['prompt'] = prompt
    d['tempo'] = tempo
    if ladder: d['tempoLadder'] = True
    d['meter'] = meter
    if kw.get('pickup'): d['pickup'] = kw.pop('pickup')
    d['countIn'] = 1
    d['rhythm'] = rhythm
    d.update(kw)
    if reps: d['reps'] = reps
    if days: d['days'] = days
    return ex(id, **d)

def lesson(id, title, steps, recap, skills=None):
    assert id not in LESSONS, f'duplicate lesson {id}'
    for s in steps:
        if 'exercise' in s: assert s['exercise'] in EXERCISES or os.path.exists(os.path.join(C, 'exercises', s['exercise'] + '.yaml')), (id, s['exercise'])
    n = len([f for f in os.listdir(os.path.join(C, 'lessons'))])
    d = {'id': id, 'title': title, 'skills': skills or [], 'steps': steps, 'recap': recap}
    LESSONS[id] = d
    # File names keep a running number so the folder sorts roughly in order of writing.
    path = next((os.path.join(C, 'lessons', f) for f in os.listdir(os.path.join(C, 'lessons')) if re.fullmatch(rf'\d+-{re.escape(id)}\.yaml', f)), None)
    if not path: path = os.path.join(C, 'lessons', f'{n + 1:03d}-{id}.yaml')
    dump(path, d)
    return id

def node(id, branch, stage, title, requires=(), type=None, lesson=None, about=None):
    NODES.append(dict(id=id, branch=branch, stage=stage, title=title, requires=list(requires), type=type, lesson=lesson or id, about=about))
    return id

# ---------------------------------------------------------------- theory screens and quizzes

def S(text, **blocks):
    """One explain screen. Blocks: staff, keys, sound, callout, terms, check."""
    d = {'explain': txt(text)}
    for k, v in blocks.items():
        d[k] = txt(v) if k == 'callout' else v
    c = d.get('check')
    if c and 'sound' in c:
        snd = c.pop('sound')
        d.setdefault('sound', snd)
    return d

def X(id): return {'exercise': id}

def staff(notes, clef=None, key=None, labels=None):
    d = {'notes': notes}
    if clef: d['clef'] = clef
    if key: d['key'] = key
    if labels: d['labels'] = labels
    return d

def keys(notes, labels=None, fingers=None):
    d = {'notes': notes}
    if labels: d['labels'] = labels
    if fingers: d['fingers'] = fingers
    return d

def check(ask, right, wrong, why, at=None, **pic):
    ch = [w for i, w in enumerate(wrong) if w != right and w not in list(wrong)[:i]]
    pos = at if at is not None else random.Random(ask).randint(0, len(wrong))
    ch.insert(pos, right)
    return {'ask': ask, 'choices': ch, 'correct': ch.index(right), 'why': why, **pic}

def Q(ask, right, wrong, why, fixed=False, **kw):
    wrong = [w for i, w in enumerate(wrong) if w != right and w not in list(wrong)[:i]]
    ch = [right] + list(wrong)
    if not fixed: random.Random(ask + str(right)).shuffle(ch)
    q = {'ask': ask, 'choices': ch, 'correct': ch.index(right), 'why': why}
    q.update(kw)
    return q

def QO(ask, right, choices, why, **kw):
    assert right in choices, (ask, right)
    q = {'ask': ask, 'choices': list(choices), 'correct': list(choices).index(right), 'why': why}
    q.update(kw)
    return q

def P(ask, play, why, **kw):
    q = {'ask': ask, 'play': play, 'why': why}
    q.update(kw)
    return q

def quiz(id, title, qs, prompt=None, reps=2, days=2, feedback=None, pitchMatch=None, shuffle=True):
    assert len(qs) >= 6 or feedback, (id, len(qs))
    d = {'title': title, 'kind': 'quiz'}
    if prompt: d['prompt'] = prompt
    if shuffle: d['shuffle'] = True
    if pitchMatch: d['pitchMatch'] = pitchMatch
    if feedback: d['feedback'] = feedback
    d['reps'] = reps; d['days'] = min(days, reps)
    d['questions'] = qs
    return ex(id, **d)

def ear(id, title, items, questions=20, prompt=None, cadence=None, reps=3, days=2, feedback=None, pitchMatch=None):
    d = {'title': title, 'kind': 'ear'}
    if prompt: d['prompt'] = prompt
    if cadence: d['cadence'] = cadence
    d['questions'] = questions
    if pitchMatch: d['pitchMatch'] = pitchMatch
    if feedback: d['feedback'] = feedback
    d['reps'] = reps; d['days'] = min(days, reps)
    d['items'] = items
    return ex(id, **d)

def gen(id, title, generator, reps=3, days=2, **kw):
    d = {'title': title, 'kind': 'generated', 'generator': generator}
    d.update(kw)
    d['reps'] = reps; d['days'] = min(days, reps)
    return ex(id, **d)

def build_ex(id, title, tasks, prompt=None, reps=3, days=1):
    d = {'title': title, 'kind': 'build'}
    if prompt: d['prompt'] = prompt
    d['tasks'] = tasks
    d['reps'] = reps; d['days'] = days
    return ex(id, **d)

# ---------------------------------------------------------------- rhythm shorthand

def rx(s):
    """Rhythm shorthand: "q q h | rq q h" -> "x:q x:q x:h | r:q x:q x:h"."""
    out = []
    for t in s.split():
        if t == '|': out.append(t)
        elif t.startswith('r'): out.append('r:' + t[1:])
        else: out.append('x:' + t)
    return ' '.join(out)

def tap2(id, title, right, left, meter='4/4', tempo=72, prompt=None, reps=None, days=None, ladder=True, **kw):
    """Two-hand tap: right hand from middle C up, left hand below."""
    pk = sum(dur_value(x) for x in kw['pickup'].split()) if kw.get('pickup') else 0.0
    check_bars(right, meter, pk, id); check_bars(left, meter, pk, id)
    assert len(right.split('|')) == len(left.split('|')), f'{id}: bar counts differ'
    d = dict(title=title, kind='tap')
    if prompt: d['prompt'] = prompt
    d['tempo'] = tempo
    if ladder: d['tempoLadder'] = True
    d['meter'] = meter
    if kw.get('pickup'): d['pickup'] = kw.pop('pickup')
    d['countIn'] = 1
    d['right'] = right; d['left'] = left
    d.update(kw)
    if reps: d['reps'] = reps
    if days: d['days'] = days
    return ex(id, **d)

def rread(id, title, durations, meter='4/4', bars=4, tempo=72, reps=4, days=2, hands=None, echo=False, prompt=None, accuracy=90):
    """A generated rhythm-read (or rhythm-echo) drill."""
    kw = dict(durations=durations, meter=meter, bars=bars, tempo=tempo, mastery={'accuracy': accuracy})
    if prompt: kw = dict(prompt=prompt, **kw)
    if hands: kw['hands'] = hands
    return gen(id, title, 'rhythm-echo' if echo else 'rhythm-read', reps=reps, days=days, **kw)

def rhythm_of(s):
    """The rhythm of a note string, for tapping: every note or chord becomes x, rests stay. None if it has ties."""
    if '~' in s: return None
    return ' | '.join(' '.join(('r' if p == 'r' else 'x') + ':' + d for p, d, _ in bar) for bar in tokens(s))

def first_notes(s, n):
    """The first n pitches of a melody (top note of a chord), for an ear echo."""
    out = []
    for bar in tokens(s):
        for p, _, _ in bar:
            if p != 'r': out.append(p.split('+')[-1])
    return out[:n]

def improv(id, title, bars, rules, tempo=80, meter='4/4', key=None, scale=None, chords=None, backing=None, call=None, rhythm=None,
           example=None, hand=None, prompt=None, reps=3, days=2, click=None):
    """An improvising exercise (kind: improvise): the player makes up the notes inside a frame, and the take is checked by `rules`."""
    for name, s in (('rhythm', rhythm), ('example', example), ('call', call)):
        if s: check_bars(s, meter, 0.0, f'{id} {name}')
    if rhythm: assert len(rhythm.split('|')) == bars, f'{id}: rhythm has {len(rhythm.split("|"))} bars, not {bars}'
    if example: assert len(example.split('|')) == bars, f'{id}: example has {len(example.split("|"))} bars, not {bars}'
    d = dict(title=title, kind='improvise')
    if hand: d['hand'] = hand
    if prompt: d['prompt'] = prompt
    if key: d['key'] = key
    d['tempo'] = tempo
    d['meter'] = meter
    d['countIn'] = 1
    if click: d['click'] = click
    d['bars'] = bars
    for k, v in (('scale', scale), ('chords', chords), ('backing', backing), ('call', call), ('rhythm', rhythm), ('example', example)):
        if v: d[k] = v
    d['rules'] = rules
    d['reps'] = reps
    if days: d['days'] = days
    return ex(id, **d)
