# Turns traditional tunes written in ABC (a text format for folk tunes) into catalogue songs.
#
# Run by hand, not by build.py: it needs the music21 library (pip install music21) and the ABC
# files of the source collection, and writes cat_trad.py, which is committed. The list of tunes it
# takes, with the words about each one, is trad_list.py: only tunes that are traditional or whose
# composer died more than 70 years ago (and published before 1930).
#
# What it keeps from a source: the melody (each part played once through, repeats and first
# endings left out) and the chord names over it. The left hands are ours, made by the catalogue.
#
#   python3 import_abc.py <folder with the .abc files>
import os, re, sys
from fractions import Fraction as F
import music21 as m21
import trad_list

HERE = os.path.dirname(os.path.abspath(__file__))
VALUES = [(F(4), 'w'), (F(3), 'h.'), (F(2), 'h'), (F(3, 2), 'q.'), (F(1), 'q'), (F(3, 4), 'e.'), (F(1, 2), 'e'),
          (F(1, 4), 's'), (F(2, 3), 'q3'), (F(1, 3), 'e3'), (F(1, 6), 's3')]

def tunes_in(folder):
    out = {}
    for f in sorted(os.listdir(folder)):
        if not f.endswith('.abc'): continue
        for chunk in re.split(r'\n\s*\n', open(os.path.join(folder, f), encoding='latin-1').read()):
            t = re.search(r'^T:\s*(.+)$', chunk, re.M)
            if t and re.search(r'^X:', chunk, re.M): out.setdefault(t.group(1).strip(), chunk)
    return out

def once_through(abc):
    """The tune with its repeats taken out: each part once, the second ending kept."""
    head, body = [], []
    for line in abc.splitlines():
        if re.match(r'^[A-Za-z]:', line):
            if line[0] in 'XTMLK': head.append(line)
        elif not line.startswith('%'):
            body.append(line.rstrip('\\'))
    b = ' '.join(body)
    b = re.sub(r'\[1.*?:\|', '|', b)
    b = b.replace('[2', '').replace('|:', '|').replace(':|', '|').replace('::', '|').replace(':', '')
    b = re.sub(r'\|\s*\|+', '|', b).replace('||', '|')
    b = re.sub(r'!.*?!', '', b)
    return '\n'.join(head) + '\n' + b + '\n'

CHORD = re.compile(r'^([A-G](?:#|b|-)?)(m7|maj7|m|7|d|dim|a|aug|sus4|sus2|6|m6|9|m9)?(?:/.*)?$')

def chord_name(fig):
    fig = fig.strip().replace('min', 'm')
    m = CHORD.match(fig)
    if not m: return None
    root = m.group(1).replace('-', 'b')
    q = {'d': 'dim', 'a': 'aug', '6': '', 'm6': 'm', '9': '7', 'm9': 'm7', None: ''}.get(m.group(2), m.group(2))
    return root + q

def spell(p):
    n = p.name.replace('-', 'b')
    return f'{n}{p.octave}'

def split_value(d):
    """A length as tied note values (largest first)."""
    out = []
    order = VALUES if (d * 4).denominator == 1 else sorted(VALUES, key=lambda x: x[1][-1] != '3')
    for v, n in order:
        while d >= v:
            out.append(n); d -= v
    assert d == 0, d
    return out

def convert(abc, where):
    s = m21.converter.parse(once_through(abc), format='abc')
    part = s.parts[0] if hasattr(s, 'parts') and s.parts else s
    ts = part.recurse().getElementsByClass('TimeSignature')[0]
    meter = ts.ratioString
    q = F(ts.barDuration.quarterLength)
    first = part.getElementsByClass('Measure')[0]
    pk = F(first.duration.quarterLength) if first.paddingLeft else F(0)
    if pk >= q: pk = F(0)
    events, chords = [], []
    figs = []
    for el in part.flatten().notesAndRests:
        off = F(el.getOffsetInHierarchy(part)).limit_denominator(48)
        if isinstance(el, m21.harmony.ChordSymbol):
            c = chord_name(el.figure)
            if not c: figs.append(el.figure)
            if c: chords.append((off, c))
            continue
        d = F(el.quarterLength).limit_denominator(48)
        if d == 0: continue        # grace notes
        if el.isRest: p = 'r'
        elif el.isChord: p = spell(el.pitches[-1])   # the tune is the top note
        else: p = spell(el.pitch)
        if el.tie is not None and el.tie.type in ('continue', 'stop') and events and events[-1][2] == p:
            events[-1][1] += d
            continue
        events.append([off, d, p])
    assert chords, f'no chords I can read: {figs[:5]}'
    # Bars: the upbeat, then whole bars from it.
    end = events[-1][0] + events[-1][1]
    starts = [F(0)] + ([pk] if pk else [])
    t = pk if pk else q
    while t < end: starts.append(t); t += q
    starts = sorted(set(x for x in starts if x < end))
    bars = [[] for _ in starts]
    for off, d, p in events:
        while d > 0:
            i = max(k for k, s0 in enumerate(starts) if s0 <= off)
            stop = starts[i + 1] if i + 1 < len(starts) else off + d
            here = min(d, stop - off)
            vals = split_value(here)
            more = d - here > 0
            for k, v in enumerate(vals):
                tie = '~' if p != 'r' and (k < len(vals) - 1 or more) else ''
                bars[i].append(f'{p}:{v}{tie}')
            off += here; d -= here
    # The last bar may be short: by the upbeat (as the app wants) or padded with a rest.
    last_len = end - starts[-1]
    want = (q - pk) if pk else q
    if last_len < want:
        bars[-1] += [f'r:{v}' for v in split_value(want - last_len)]
    elif last_len > want and pk:
        bars[-1] += [f'r:{v}' for v in split_value(q - last_len)]
    # Chords per bar: 1, 2, 3 (in 3/4 or 9/8) or 4 even slots, each the chord sounding at its start.
    def at(x):
        c = None
        for o, n in chords:
            if o <= x: c = n
        return c
    cbars = []
    for i, s0 in enumerate(starts):
        length = (starts[i + 1] if i + 1 < len(starts) else s0 + (want if i else q)) - s0
        if i == 0 and pk:
            cbars.append('-'); continue
        changes = sorted(set(o for o, _ in chords if s0 <= o < s0 + length))
        for n in ((1, 2, 3, 4) if meter in ('3/4', '9/8') else (1, 2, 4)):
            grid = [s0 + length * k / n for k in range(n)]
            if all(c in grid for c in changes) and (length / n * 4).denominator == 1: break
        else:
            grid = [s0 + length - F(1, 48)]    # no even split fits (a short last bar): the chord it ends on
        slots = [at(g) or at(s0 + length) or chords[0][1] for g in grid]
        if n > 1 and len(set(slots)) == 1: slots = slots[:1]
        cbars.append(' '.join(slots))
    return dict(meter=meter, pickup=pk, melody=' | '.join(' '.join(b) for b in bars), chords=' | '.join(cbars))

def fmt_pickup(pk):
    return ' '.join(split_value(pk)) if pk else None

KEYS = {'maj': '', 'ion': '', 'm': 'm', 'min': 'm', 'aeo': 'm', 'dor': 'm', 'phr': 'm', 'mix': '', 'lyd': ''}

def key_of(abc):
    k = re.search(r'^K:[ \t]*([A-G][b#]?)[ \t]*([A-Za-z]*)', abc, re.M)
    tonic, mode = k.group(1), k.group(2).lower()[:3]
    return tonic + KEYS.get(mode, ''), mode

def difficulty(melody, key, meter):
    """How hard the tune is to play, as a number: notes per beat, fast notes, range, leaps, sharps or flats, length."""
    from catalogue import signature
    from lib import meter_quarters
    toks = [t for t in melody.replace('|', ' ').split() if not t.startswith('r')]
    durs = [t.split(':')[1].rstrip('~') for t in toks]
    fast = sum(d in ('s', 'e.', 's3', 'e3') for d in durs) / len(durs)
    bars = melody.count('|') + 1
    density = len(toks) / (bars * meter_quarters(meter))
    ps = [m21.pitch.Pitch(t.split(':')[0].replace('b', '-') if len(t.split(':')[0]) > 2 else t.split(':')[0]).midi for t in toks]
    rng = max(ps) - min(ps)
    leaps = sum(abs(a - b) > 7 for a, b in zip(ps, ps[1:])) / len(ps)
    acc = len(signature(key))
    return 2 * density + 4 * fast + rng / 6 + 6 * leaps + 0.4 * acc + bars / 32

# How many of the imported tunes go to each stage (in order of difficulty), and the latest stage for
# the simplest kinds of song.
SHARE = {3: 0.08, 4: 0.14, 5: 0.17, 6: 0.17, 7: 0.16, 8: 0.15, 9: 0.13}
EASY_GENRES = {'nursery': 5, 'carols': 6, 'hymns': 6}

def stages(scores):
    order = sorted(scores, key=lambda k: scores[k])
    out, i = {}, 0
    for st, share in SHARE.items():
        n = round(share * len(order)) if st < 9 else len(order) - i
        for k in order[i:i + n]: out[k] = st
        i += n
    return out

def tempo_for(meter, melody):
    durs = [t.split(':')[1].rstrip('~') for t in melody.replace('|', ' ').split()]
    has_fast = any(d in ('s', 'e.') for d in durs)
    if meter in ('6/8', '9/8', '12/8'): return 56
    if meter == '3/4': return 96 if not has_fast else 80
    if meter == '2/2': return 60
    return 72 if has_fast else 88

def main(folder):
    src = tunes_in(folder)
    out = ['# Traditional and old public-domain tunes, written by import_abc.py from trad_list.py: do not edit by hand.',
           '# Melodies and chord names from the Nottingham Music Database (traditional dance tunes and songs);',
           '# the left hands are ours.', 'from catalogue import tune', '']
    done = []
    for t in trad_list.TUNES:
        abc = src[t['source']]
        try:
            c = convert(abc, t['id'])
        except Exception as e:
            print('skipped', t['id'], repr(e)); continue
        key, mode = key_of(abc)
        key = t.get('key', key)
        done.append((t, c, key))
    rank = stages({t['id']: difficulty(c['melody'], key, c['meter']) for t, c, key in done})
    for t, c, key in done:
        stage = t.get('stage') or min(rank[t['id']], EASY_GENRES.get(t['genre'], 9))
        tempo = t.get('tempo') or tempo_for(c['meter'], c['melody'])
        args = dict(about=t['about'], key=key, meter=c['meter'], tempo=tempo, melody=c['melody'], chords=c['chords'],
                    stage=stage, genre=t['genre'], story=t['story'], tips=t.get('tips', ''), pickup=fmt_pickup(c['pickup']))
        if t.get('styles'): args['styles'] = t['styles']
        out.append(f"tune({t['id']!r}, {t['title']!r}, raw=True, **{args!r})")
        out.append('')
    open(os.path.join(HERE, 'cat_trad.py'), 'w').write('\n'.join(out))
    print(len(trad_list.TUNES), 'tunes written to cat_trad.py')

if __name__ == '__main__':
    main(sys.argv[1])
