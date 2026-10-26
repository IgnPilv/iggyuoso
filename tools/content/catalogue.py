# The song catalogue: the Songbook's big shelf of public-domain tunes (traditional, or by composers
# who died more than 70 years ago), every one in our own arrangement. Never copied from a published
# or online arrangement, never from a downloaded MIDI file.
#
# Each song is one Songbook entry (one lesson) whose steps are the rhythm, the tune, the left hand,
# both hands (on the tempo ladder), a fuller left hand and a performance. The tunes themselves are
# in the cat_*.py files, one per Songbook group, written in a short form (see M below).
#
# Runs after the older generators so their lesson files keep their numbers.
import re
from lib import *
import songs as old

# The milestone that closes each stage: a song of stage s opens after the milestone of stage s - 1.
MILESTONE = {1: 'y1-checkpoint-a', 2: 'y1-checkpoint-b', 3: 'y1-exit', 4: 'y2-checkpoint-a', 5: 'y2-checkpoint-b',
             6: 'y2-exit', 7: 'm7-flat-keys', 8: 'm8-arpeggios'}

CATALOGUE = []

# ---------------------------------------------------------------- the short form for tunes
#
# Notes are written as in the app (C4:q, F#4:e, C4+E4:h, ties with ~, rests r), with three shortcuts:
#   - a duration is kept until a new one is written: "C4:q D E F:h" = C4:q D4:q E4:q F4:h;
#   - a note without an octave goes to the nearest note of that letter (a fourth or less on the
#     staff) from the note before it, as in LilyPond's relative mode; write the octave for leaps;
#   - a note without an accidental takes the key signature's one (F means F# in G major); write n
#     for a natural ("Fn"), or the accidental itself.

LET = 'CDEFGAB'
SHARPS, FLATS = 'FCGDAEB', 'BEADGCF'
MAJOR_OF = {'Am': 'C', 'Em': 'G', 'Bm': 'D', 'F#m': 'A', 'C#m': 'E', 'Dm': 'F', 'Gm': 'Bb', 'Cm': 'Eb', 'Fm': 'Ab', 'Bbm': 'Db', 'G#m': 'B', 'Ebm': 'Gb'}
SIG = {'C': '', 'G': '#1', 'D': '#2', 'A': '#3', 'E': '#4', 'B': '#5', 'F#': '#6', 'F': 'b1', 'Bb': 'b2', 'Eb': 'b3', 'Ab': 'b4', 'Db': 'b5', 'Gb': 'b6'}

def signature(key):
    s = SIG[MAJOR_OF.get(key, key)]
    if not s: return {}
    n = int(s[1])
    return {l: '#' for l in SHARPS[:n]} if s[0] == '#' else {l: 'b' for l in FLATS[:n]}

TOK = re.compile(r'^([A-G])(#|b|n|##|bb)?(-?\d)?(?::(w|h\.|h|q\.|q|e\.|e|s|q3|e3|s3))?(~)?$')

def M(s, key='C'):
    """Expand a tune in the short form to a full note string."""
    sig = signature(key)
    prev = None          # (letter index, octave) of the last note
    dur = None
    out = []
    for bar in s.split('|'):
        toks = []
        for t in bar.split():
            if t.startswith('r'):
                m = re.fullmatch(r'r(?::(w|h\.|h|q\.|q|e\.|e|s|q3|e3|s3))?', t)
                assert m, t
                dur = m.group(1) or dur
                toks.append(f'r:{dur}'); continue
            notes = []
            parts = t.split('+')
            # A chord's duration is written on its last note: C4+E+G:h.
            last = TOK.match(parts[-1])
            assert last, f'bad note {t!r} in {s!r}'
            d = last.group(4) or dur
            tie = last.group(5) or ''
            for k, x in enumerate(parts):
                m = TOK.match(x)
                assert m, f'bad note {x!r} in {s!r}'
                letter, acc, octv = m.group(1), m.group(2), m.group(3)
                li = LET.index(letter)
                if octv is None:
                    assert prev, f'the first note needs an octave: {s!r}'
                    pl, po = prev
                    here = pl + po * 7
                    o = min(range(po - 1, po + 2), key=lambda o: abs(li + o * 7 - here))
                else:
                    o = int(octv)
                acc = sig.get(letter, '') if acc is None else ('' if acc == 'n' else acc)
                notes.append(f'{letter}{acc}{o}')
                # In a chord each note is placed from the one before it; the tune goes on from the chord's top note.
                prev = (li, o)
            assert d, f'no duration yet at {t!r} in {s!r}'
            dur = d
            toks.append('+'.join(notes) + ':' + d + tie)
        out.append(' '.join(toks))
    return ' | '.join(out)

# ---------------------------------------------------------------- one song

STAGE_STYLES = {2: ('root', 'fifth'), 3: ('root', 'block'), 4: ('block', 'oompah'), 5: ('block', 'broken'),
                6: ('block', 'broken'), 7: ('block', 'arp'), 8: ('block', 'arp'), 9: ('block', 'alberti')}

def tune(id, title, about, key, meter, tempo, melody, chords, stage, genre, story, tips='', pickup=None,
         styles=None, left=None, pedal=None, requires=(), raw=False):
    """A song for the catalogue. `melody` in the short form; `chords` one bar per melody bar ('-' for an upbeat).
    `raw`: the melody is a full note string already (imported tunes). `left` replaces the fuller left hand with one written out (short form, as the melody). `pedal`: True for a
    pedal change on every chord in the fuller arrangement (default from stage 6 on with a flowing left hand)."""
    CATALOGUE.append(dict(id=id, title=title, about=about, key=key, meter=meter, tempo=tempo, melody=melody, chords=chords,
                          stage=stage, genre=genre, story=story, tips=tips, pickup=pickup, styles=styles, left=left, pedal=pedal,
                          requires=list(requires), raw=raw))

def spans(s):
    out, t = [], 0.0
    for b in tokens(s):
        for p, d, _ in b:
            v = dur_value(d)
            if p not in ('r', 'x'):
                for x in p.split('+'): out.append((midi(x), t, t + v))
            t += v
    return out

def chord_fit(mel, chords, meter, pk):
    """How many of the tune's notes that start with a chord belong to it (a check on the transcription)."""
    q = meter_quarters(meter)
    starts, t = [], 0.0
    for i, syms in enumerate(b.split() for b in chords.split('|')):
        length = pk if (i == 0 and pk) else q
        for sym in syms:
            if sym not in ('-', 'r'): starts.append((t, sym))
            t += length / len(syms)
    hit = tot = 0
    for a, sym in starts:
        hits = [m for (m, s0, e0) in spans(mel) if abs(s0 - a) < 1e-6]
        if not hits: continue
        tot += 1
        pcs = {midi(x) % 12 for x in chord_tones(sym)}
        hit += max(hits) % 12 in pcs
    return hit / tot if tot else 1.0

def no_clash(right, left, where):
    L = spans(left)
    for m, a, b in spans(right):
        for m2, a2, b2 in L:
            assert not (m == m2 and a < b2 and a2 < b), f'{where}: both hands on {m} at beat {a}'

def clear_of(mel, left, where):
    """The left hand, an octave lower if it would share a key with a low tune."""
    try:
        no_clash(mel, left, where); return left
    except AssertionError:
        low = shift_octave(left, -1)
        assert min(midi(p) for p in pitches_in(low)) >= midi('A1'), f'{where}: left hand too low'
        no_clash(mel, low, where); return low

LOW_FIT = []

def left_hands(s, mel, styles, pkv, sid):
    meter = s['meter']
    lh1 = accompany(s['chords'], meter, styles[0], pickup=pkv)
    lh2 = M(s['left'], s['key']) if s['left'] else (accompany(s['chords'], meter, styles[1], pickup=pkv) if len(styles) > 1 else None)
    try:
        lh1, lh2 = (clear_of(mel, l, sid) if l else l for l in (lh1, lh2))
    except AssertionError:
        # A tune that dips low goes up an octave rather than push the left hand into the deep bass.
        mel = shift_octave(mel, 1)
        assert max(midi(p) for p in pitches_in(mel)) <= midi('C6'), f'{sid}: tune too wide for both hands'
        lh1, lh2 = (clear_of(mel, l, sid) if l else l for l in (lh1, lh2))
    return mel, lh1, lh2

def write_catalogue():
    seen = set()
    for s in CATALOGUE:
        sid = f"song-{s['id']}"
        assert sid not in seen, sid
        seen.add(sid)
        key, meter, tempo, pk, stage = s['key'], s['meter'], s['tempo'], s['pickup'], s['stage']
        mel = s['melody'] if s['raw'] else M(s['melody'], key)
        pkv = sum(dur_value(x) for x in pk.split()) if pk else 0
        check_bars(mel, meter, pkv, sid)
        compound = meter in ('6/8', '9/8', '12/8')
        styles = s['styles'] or (('root', 'broken') if compound else STAGE_STYLES[stage])
        if meter == '3/4' and styles[1] == 'oompah': styles = (styles[0], 'waltz')
        # An imported tune that is too wide for its left hands gets plainer ones.
        tries = [styles] + ([('root', 'block'), ('root',)] if s['raw'] else [])
        for k, styles in enumerate(tries):
            try:
                mel, lh1, lh2 = left_hands(s, mel, styles, pkv, sid)
                break
            except AssertionError:
                if k == len(tries) - 1: raise
        fit = chord_fit(mel, s['chords'], meter, pkv)
        if fit < 0.6: LOW_FIT.append((sid, round(fit, 2)))
        flowing = styles[-1] in ('broken', 'arp', 'alberti') or s['left']
        use_pedal = s['pedal'] if s['pedal'] is not None else (stage >= 6 and flowing and not s['left'])
        pedal = old.pedal_for(s['chords'], meter, pkv) if use_pedal else None
        common = dict(meter=meter, key=key if key != 'C' else None, display='staff', pickup=pk)
        ids = []
        rr = rhythm_of(mel)
        if rr and stage <= 5:
            ids.append(tap(f'{sid}-tap', f"{s['title']}: tap the rhythm", rr, prompt='First the rhythm alone, on any key: tap the tune while you hum it.',
                           display='staff', meter=meter, tempo=tempo, reps=2, days=1, ladder=False, **({'pickup': pk} if pk else {})))
        if stage <= 4 and mel.count(':') >= 8:
            ids.append(ear(f'{sid}-by-ear', f"{s['title']}: by ear", [{'type': 'melody', 'notes': ' '.join(first_notes(mel, 5)), 'plays': 3, 'lit': True}, {'type': 'melody', 'notes': ' '.join(first_notes(mel, 4)), 'plays': 3}],
                           questions=4, reps=2, days=1, prompt='Play the start of the tune back from hearing it. Lit keys help the first time.'))
        ids.append(timed(f'{sid}-rh', f"{s['title']}: the tune", right=mel, tempo=tempo, prompt='The tune alone, right hand. Sing it in your head as you play.', reps=2, days=1, **common))
        ids.append(timed(f'{sid}-lh', f"{s['title']}: left hand", left=lh1, tempo=tempo, prompt=f'The left hand alone ({old.STYLE_WORDS[styles[0]]}): find each chord change before it comes.', reps=2, days=1, **common))
        ids.append(timed(sid, s['title'], right=mel, left=lh1, tempo=tempo, prompt='Both hands. Start slow; the tempo ladder brings you up to speed.', reps=3, days=2, **common))
        if lh2:
            words = 'the left hand written out for this song' if s['left'] else old.STYLE_WORDS[styles[1]]
            ids.append(timed(f'{sid}-arranged', f"{s['title']}, fuller arrangement", right=mel, left=lh2, tempo=tempo,
                             prompt=f"A fuller left hand ({words})." + (' Change the pedal with each chord.' if pedal else ''), reps=3, days=2, pedal=pedal, **common))
        ids.append(timed(f'{sid}-performance', f"{s['title']}: performance", right=mel, left=lh2 or lh1, tempo=tempo, ladder=False, pedal=pedal if lh2 else None,
                         prompt='Full tempo, start to end, as if someone is listening.', reps=2, days=2, **common))
        bars_ = mel.split('|')
        tips = s['tips'] or auto_tips(s, meter, key)
        head = lambda n: ' | '.join(bars_[:n]).strip().rstrip('~')
        steps = [S(f"**{s['title']}** · {s['about']}\n\n{s['story']}", staff=staff(head(2), key=key if key != 'C' else None), sound=head(4)),
                 S(f"**Before you play.** {tips}\n\nThe steps: " + ('the rhythm, ' if rr and stage <= 5 else '') + 'the tune, the left hand, then both together' +
                   (', a fuller left hand' if lh2 else '') + ', and a performance.',
                   callout=f"Key: {old.key_words(key)} · Time: {meter} · Tempo: {tempo}")]
        steps += [X(i) for i in ids]
        lesson(sid, s['title'], steps, f"{s['title']}: tune, left hand, together. Come back to it any time; songs are for fun.", skills=['songs'])
        node(sid, 'songs', stage, s['title'], [MILESTONE[stage - 1]] + s['requires'], about=s['about'], genre=s['genre'])

def auto_tips(s, meter, key):
    t = []
    if meter == '3/4': t.append('Three beats in a bar: feel the first one a little stronger.')
    elif meter == '6/8': t.append('Two big beats in a bar, each a dotted quarter split in three.')
    elif meter == '2/4': t.append('Two beats in a bar, like a march.')
    if s['pickup']: t.append('It starts on an upbeat: the first note comes before the first full bar.')
    sig = signature(key)
    if sig:
        acc = '♯' if '#' in sig.values() else '♭'
        names = ', '.join(f'{l}{acc}' for l in (SHARPS if acc == '♯' else FLATS)[:len(sig)])
        t.append(f'{old.key_words(key)}: remember {names}.')
    if not t: t.append('Hum it first. Keep the left hand quieter than the tune.')
    return ' '.join(t)

# ---------------------------------------------------------------- groups for every song

# Songs written before the catalogue, by group.
OLD_GENRES = {
    'songbook-1': 'nursery', 'songbook-2': 'nursery', 'songbook-3': 'folk', 'songbook-4': 'nursery',
    'song-rain-rain': 'nursery', 'song-twinkle': 'nursery', 'song-westminster': 'anthems', 'song-old-macdonald': 'nursery',
    'song-going-home': 'classical', 'song-hot-cross-buns': 'nursery', 'song-mary-lamb': 'nursery', 'song-this-old-man': 'nursery',
    'song-yankee-doodle': 'folk', 'song-aura-lee': 'folk', 'song-drunken-sailor': 'shanties', 'song-oh-susanna': 'folk',
    'song-happy-birthday': 'nursery', 'song-ode-to-joy-song': 'classical', 'song-jingle-bells-song': 'carols',
    'song-auld-lang-syne': 'folk', 'song-silent-night': 'carols', 'song-we-wish': 'carols', 'song-hark-the-herald': 'carols',
    'song-joy-to-the-world': 'carols', 'song-deck-the-halls': 'carols', 'song-brahms-lullaby': 'classical',
    'song-clementine': 'folk', 'song-greensleeves': 'folk', 'song-sailors-song': 'shanties', 'song-row-your-boat': 'nursery',
    'song-twinkle-alberti': 'classical', 'song-aura-lee-pedal': 'folk', 'song-greensleeves-pedal': 'folk',
    'song-silent-night-arp': 'carols', 'song-wim': 'requests', 'song-chfl': 'requests', 'song-canon-easy': 'classical',
    'song-canon': 'classical',
}

def add_genres(nodes):
    for id, g in OLD_GENRES.items():
        if id in nodes: nodes[id]['genre'] = g
    # Key studies: a song in a key whose study is not later than the song also asks for it.
    for s in CATALOGUE:
        n = nodes[f"song-{s['id']}"]
        k = s['key']
        minor = k.endswith('m')
        t = k[:-1] if minor else k
        ks = 'ks-' + t[0].lower() + {'#': '-sharp', 'b': '-flat'}.get(t[1:], '') + ('-minor' if minor else '')
        if k not in ('C', 'Am') and ks in nodes and nodes[ks]['stage'] <= n['stage'] and ks not in n['requires']:
            n['requires'].append(ks)

TREE_EDITS = [add_genres]

import cat_nursery, cat_folk, cat_shanties, cat_classical, cat_carols, cat_dances, cat_trad, cat_requests  # noqa: E402  (the tunes)

def run(base):
    write_catalogue()
    if LOW_FIT:
        print('catalogue: tunes that fit their chords less than 60% on chord changes (check them):', LOW_FIT)
