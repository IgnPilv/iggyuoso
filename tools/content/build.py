# Builds the generated content and the tree files.
#   python3 tools/content/build.py
# Files this script wrote last time (tools/content/generated.txt) are removed first, so a run
# always starts from the hand-written content plus this script's output. The tree files under
# content/tree/ are written in full from tree_base.py (the original Year 1–2 nodes, restructured)
# plus every node the generators add.
import os, sys, json, glob
sys.path.insert(0, os.path.dirname(__file__))
import lib
from lib import C, ROOT

MANIFEST = os.path.join(os.path.dirname(__file__), 'generated.txt')

def clean():
    if not os.path.exists(MANIFEST): return
    for rel in open(MANIFEST).read().split():
        p = os.path.join(ROOT, rel)
        if os.path.exists(p): os.remove(p)

def snapshot():
    return {p: os.path.getmtime(p) for p in glob.glob(os.path.join(C, '*', '*.yaml'))}

clean()
before = snapshot()

# The original nodes, as N(...) calls.
BASE = []
def N(id, branch, stage, title, requires=(), type=None, about=None):
    BASE.append(dict(id=id, branch=branch, stage=stage, title=title, requires=list(requires), type=type, lesson=id, about=about))
exec(open(os.path.join(os.path.dirname(__file__), 'tree_base.py')).read())

import patch, songs, ear, rhythm, technique, reading, theory, pieces, creativity, keys, milestones, compose, harmony, expression, links
for m in (patch, ear, rhythm, technique, reading, theory, pieces, creativity, keys, songs, milestones):
    if hasattr(m, 'run'): m.run(BASE)
songs.write_songs()
# Modules added later run after everything else, so older lessons keep their file numbers.
for m in (compose, harmony, expression):
    m.run(BASE)

# Merge: generated nodes may replace base nodes of the same id.
nodes = {n['id']: n for n in BASE}
for n in lib.NODES: nodes[n['id']] = n
for m in (patch, ear, rhythm, technique, reading, theory, pieces, creativity, keys, songs, milestones, compose, harmony, expression, links):
    for f in getattr(m, 'TREE_EDITS', []): f(nodes)

TITLES = {'technique': 'Technique', 'reading': 'Reading', 'rhythm': 'Rhythm', 'theory': 'Theory', 'ear': 'Ear',
          'repertoire': 'Pieces', 'creativity': 'Creativity', 'milestones': 'Milestones', 'songs': 'Songs'}
SUMMARY = {
    'technique': 'How the hands work: five-finger positions, scales, chords, arpeggios and the pedal, in every key, hands together as early as possible.',
    'reading': 'From the first notes on the staff to sight-reading both hands at once in any key.',
    'rhythm': 'The beat and everything on it: note values, rests, meters, eighths, sixteenths, triplets, syncopation, compound time and two hands in two rhythms.',
    'theory': 'How music is built: notes, intervals, scales, keys, chords and form, a few screens and a quiz at a time.',
    'ear': 'The ear from scratch: same or different, high or low, up or down, then notes, intervals, chords and melodies played back.',
    'repertoire': 'Real pieces to learn and polish: classics and studies, both hands.',
    'creativity': 'Making your own music: improvising that listens to your notes, then composing: motifs, sequences, phrases, tunes over chords, song forms, minor keys and modes, the blues, harmonising and arranging.',
    'milestones': 'The trunk of the tree. Each milestone checks a stage and opens new songs.',
    'songs': 'Tunes to play for fun, opened by the milestones.',
}
order = list(nodes.values())
written = []
for b in TITLES:
    path = os.path.join(C, 'tree', f'{b}.yaml')
    with open(path, 'w') as fh:
        fh.write(f"# The {TITLES[b]} branch. Written by tools/content/build.py; format in content/README.md.\n")
        fh.write(f"branch: {b}\ntitle: {TITLES[b]}\nsummary: {json.dumps(SUMMARY[b])}\nnodes:\n")
        for n in order:
            if n['branch'] != b: continue
            parts = [f"id: {n['id']}", f"stage: {n['stage']}", f"lesson: {n['lesson']}", f"title: {json.dumps(n['title'], ensure_ascii=False)}"]
            if n.get('type'): parts.append(f"type: {n['type']}")
            if n['requires']: parts.append(f"requires: [{', '.join(n['requires'])}]")
            if n.get('about'): parts.append(f"about: {json.dumps(n['about'], ensure_ascii=False)}")
            fh.write(f"  - {{ {', '.join(parts)} }}\n")

# Every file this run wrote, except the hand-written ones it patched, is removed before the next run.
import subprocess
base_files = set(subprocess.run(['git', 'ls-tree', '-r', '--name-only', patch.BASE_REV, 'content'], cwd=ROOT, capture_output=True, text=True, check=True).stdout.split())
manifest = sorted(lib.WRITTEN - base_files)
open(MANIFEST, 'w').write('\n'.join(manifest) + '\n')
new = manifest
print(f'{len(lib.EXERCISES)} exercises, {len(lib.LESSONS)} lessons, {len(lib.NODES)} nodes written; {len(new)} generated files')
