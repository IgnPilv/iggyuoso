# One-time conversion (2026-10-23): years + units -> branches + stages. Kept for the record.
import yaml, glob, os, sys
ROOT = sys.argv[1]
C = f"{ROOT}/content"
STAGE_OF_UNIT = {
  'meet-the-keyboard': 1, 'steady-hands': 1, 'two-hands-at-once': 2, 'first-chords': 2,
  'scales-and-eighths': 3, 'year-1-recital': 3, 'two-octave-scales': 4, 'reading-hands-together': 4,
  'minor-keys': 4, 'inversions': 5, 'harmonising': 5, 'pedal-and-genres': 6,
}
SONGS = {'songbook-1': ('y1-checkpoint-a', 2), 'songbook-2': ('y1-checkpoint-b', 3),
         'songbook-3': ('y1-checkpoint-b', 3), 'songbook-4': ('y1-exit', 4)}
BR = {'technique': [], 'reading': [], 'rhythm': [], 'theory': [], 'ear': [], 'repertoire': [], 'creativity': [], 'milestones': [], 'songs': []}
for y in (1, 2):
    import json; d = json.load(open(f"/tmp/claude-0/y{y}.json"))
    for u in d['units']:
        st = STAGE_OF_UNIT[u['id']]
        for n in u['nodes']:
            req = [r for r in n.get('requires', []) if r not in SONGS]
            out = {'id': n['id'], 'stage': st, 'lesson': n['lesson'], 'title': n['title']}
            if n['id'] in SONGS:
                ms, s2 = SONGS[n['id']]
                out = {'id': n['id'], 'stage': s2, 'lesson': n['lesson'], 'title': n['title'], 'requires': [ms]}
                BR['songs'].append(out); continue
            b = 'milestones' if n['type'] == 'checkpoint' else n['strand']
            if n['type'] in ('drill', 'side-quest') and b != 'milestones': out['type'] = n['type']
            if req: out['requires'] = req
            BR[b].append(out)
for f in glob.glob(f"{C}/tree/year-*.yaml"): os.remove(f)
for f in glob.glob(f"{C}/units/*.yaml"): os.remove(f)
os.rmdir(f"{C}/units")
for f in glob.glob(f"{C}/lessons/*.yaml"):
    s = open(f).read()
    lines = [l for l in s.split('\n') if not l.startswith('unit:')]
    open(f, 'w').write('\n'.join(lines))
TITLES = {'technique': 'Technique', 'reading': 'Reading', 'rhythm': 'Rhythm', 'theory': 'Theory', 'ear': 'Ear',
          'repertoire': 'Pieces', 'creativity': 'Creativity', 'milestones': 'Milestones', 'songs': 'Songs'}
def flow(n): return '{ ' + ', '.join(f"{k}: {yaml.dump(v, default_flow_style=True, width=1000).strip().removesuffix('...').strip()}" for k, v in n.items()) + ' }'
for b, nodes in BR.items():
    with open(f"{C}/tree/{b}.yaml", 'w') as fh:
        fh.write(f"branch: {b}\ntitle: {TITLES[b]}\nsummary: TODO\nnodes:\n")
        for n in nodes: fh.write(f"  - {flow(n)}\n")
print({b: len(n) for b, n in BR.items()})
