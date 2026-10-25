import { nodeOfLesson, treeNodes } from '../content';
import type { BranchId } from '../content/tree';
import type { Mastery } from '../progress/mastery';
import { h } from '../../../core/dom';

// The practice room: the games and tools that sit beside the lessons (Note Rush, Play by ear,
// Duet, Chord finder, Timing mirror, Scale gym, Jam room, Play report). Each belongs to a branch of
// the tree, is best after a milestone (advice only, nothing locks), and is suggested at the end of
// the lessons it helps with. One list, so home, branch pages and recaps say the same thing.

export interface RoomTool {
  /** Route, as in `#/<route>`. */
  route: string;
  name: string;
  kind: 'game' | 'tool';
  /** One line: what you do there. */
  blurb: string;
  branch: BranchId;
  /** The milestone it is best after; none = from the first day. */
  after?: string;
  /** Tree nodes whose lessons suggest it on their recap. */
  nodes: string[];
}

export const ROOM: RoomTool[] = [
  {
    route: 'noterush', name: 'Note Rush', kind: 'game', branch: 'reading',
    blurb: 'Read a note on the staff and play it before it slides off. One-minute rounds, best scores kept.',
    nodes: ['treble-staff', 'bass-staff', 'grand-staff-map', 'reading-lines-and-spaces', 'reading-landmarks', 'reading-ledger-lines', 'reading-fluency', 'reading-ledger-fluency', 'reading-find-anywhere', 'c-position-reading'],
  },
  {
    route: 'byear', name: 'Play by ear', kind: 'game', branch: 'ear',
    blurb: 'Hear the opening of a tune you know and find it on the keys, note by note, with hints.',
    nodes: ['ear-echo-three-notes', 'ear-echo-four-notes', 'ear-echo-five', 'ear-echo-six', 'ear-echo-seven', 'ear-echo-eight', 'ear-melody-steps', 'ear-step-or-leap', 'ear-find-the-note', 'ear-echo-in-g', 'ear-echo-g-five'],
  },
  {
    route: 'duet', name: 'Duet', kind: 'game', branch: 'repertoire', after: 'y1-checkpoint-a',
    blurb: 'Play a tune\'s melody while the app plays the left hand. It starts with you and waits for you.',
    nodes: ['lead-sheet-melody', 'pieces-hands-together', 'first-pieces-alternating', 'recital-three-pieces', 'creativity-choose-accompaniment', 'accompaniment-patterns'],
  },
  {
    route: 'chords', name: 'Chord finder', kind: 'tool', branch: 'theory', after: 'y1-checkpoint-a',
    blurb: 'Hold any keys and see the chord named and spelled, or type a chord name to build it.',
    nodes: ['tonic-triad', 'chord-symbols', 'triads-on-every-degree', 'primary-triads', 'theory-minor-chords', 'theory-aug-dim', 'theory-seventh-chords', 'dominant-seventh-theory', 'harmony-other-chords', 'first-inversion', 'second-inversion', 'technique-lh-inversions'],
  },
  {
    route: 'pulse', name: 'Timing mirror', kind: 'tool', branch: 'rhythm',
    blurb: 'A metronome that listens: every press early or late, per hand, and silent bars to test your inner pulse.',
    nodes: ['steady-beat', 'rhythm-tap-the-beat', 'rhythm-inner-pulse', 'rhythm-two-hands-together', 'eighth-notes', 'rhythm-eighths-two-hands', 'rhythm-groove'],
  },
  {
    route: 'scales', name: 'Scale gym', kind: 'tool', branch: 'technique', after: 'y1-checkpoint-b',
    blurb: 'Scales and arpeggios with the fingering on the keys: every note charted early or late, thumb passes called out.',
    nodes: ['thumb-under', 'c-scale-hands-apart', 'c-scale-hands-together', 'g-and-f-scales', 'two-octave-c', 'two-octave-c-together', 'two-octave-g', 'two-octave-f', 'two-octave-a-minor', 'two-octave-d-minor', 'chromatic-scale', 'scales-d-major-e-minor', 'scales-a-major-g-minor', 'technique-contrary-scale', 'technique-scale-in-eighths', 'technique-minor-scales-ht', 'technique-arpeggios-one-octave', 'technique-arpeggios-two-octaves', 'technique-two-octave-scales-ht', 'technique-scales-flat-keys', 'technique-scales-ab-db', 'technique-scales-e-b', 'technique-scales-d-a-one-octave'],
  },
  {
    route: 'jam', name: 'Jam room', kind: 'tool', branch: 'creativity', after: 'y1-checkpoint-b',
    blurb: 'A band loops a progression in any key and groove while you make up the tune.',
    nodes: ['pentatonic-improv', 'improvise-over-drone', 'creativity-question-answer', 'creativity-minor-pentatonic', 'creativity-blues-improv', 'compose-over-chords', 'harmony-progressions', 'harmony-modes', 'compose-modes'],
  },
  {
    route: 'report', name: 'Play report', kind: 'tool', branch: 'rhythm', after: 'y1-checkpoint-a',
    blurb: 'Play anything with no click: your own tempo, notes held back or hurried, the key and the chords.',
    nodes: ['recital-three-pieces', 'minuet-in-g', 'etude-in-g', 'korobeiniki', 'evening-song', 'piece-fur-elise', 'piece-gymnopedie', 'piece-sonatina-c', 'piece-prelude-in-c', 'rhythm-four-bar-phrases'],
  },
];

const milestone = (t: RoomTool) => (t.after ? treeNodes.get(t.after) : undefined);
const milestoneName = (t: RoomTool) => milestone(t)?.title.split(':')[0];

/** The tools a lesson's recap suggests (at most two). */
export const roomFor = (lessonId: string): RoomTool[] => {
  const node = nodeOfLesson(lessonId);
  return node ? ROOM.filter((t) => t.nodes.includes(node.id)).slice(0, 2) : [];
};

/** A tile: name, kind, what it is, and its milestone while that is not grown. */
export function roomTile(t: RoomTool, m?: Mastery, branch = true): HTMLElement {
  const after = milestone(t);
  const ahead = after && m && (m.state(after.id) === 'locked' || m.state(after.id) === 'introduced');
  return h('li', {},
    h('a', { class: 'room-tile', href: `#/${t.route}` },
      h('span', { class: 'room-name' }, t.name),
      h('span', { class: 'room-kind small' }, t.kind === 'game' ? 'Game' : 'Tool'),
      h('span', { class: 'room-blurb small' }, t.blurb),
      branch || ahead ? h('span', { class: 'room-meta small' },
        branch ? h('span', { class: `strand-dot strand-${t.branch}` }) : '',
        [branch ? branchWord(t.branch) : '', ahead ? `best after ${milestoneName(t)}` : ''].filter(Boolean).join(' · ')) : ''));
}

const branchWord = (b: BranchId) => ({ repertoire: 'Pieces' } as Record<string, string>)[b] ?? b[0].toUpperCase() + b.slice(1);

/** Home: every game and tool in one place. */
export function roomCard(m?: Mastery): HTMLElement {
  return h('section', { class: 'card room-card' },
    h('div', { class: 'unit-head' },
      h('h2', {}, 'Practice room'),
      h('span', { class: 'unit-progress' }, 'Games and tools, beside the lessons')),
    h('p', { class: 'small' }, 'Play these any time. Nothing here changes your path; each one helps the branch it is marked with, and the lessons it fits point to it.'),
    h('ul', { class: 'room-grid' }, ...ROOM.map((t) => roomTile(t, m))));
}

/** A branch page: the games and tools for that branch. */
export function roomForBranch(b: BranchId, m?: Mastery): HTMLElement | '' {
  const list = ROOM.filter((t) => t.branch === b);
  if (!list.length) return '';
  return h('div', { class: 'branch-stage room-branch' },
    h('h3', {}, 'In the practice room'),
    h('ul', { class: 'room-grid' }, ...list.map((t) => roomTile(t, m, false))));
}

/** The recap's line: tools that fit this lesson. */
export function roomRecap(lessonId: string): HTMLElement | '' {
  const list = roomFor(lessonId);
  if (!list.length) return '';
  return h('p', { class: 'small room-recap' }, 'Also try, in the practice room: ',
    ...list.flatMap((t, i) => [i ? '; ' : '', h('a', { href: `#/${t.route}` }, t.name), ` (${t.blurb.split(/[.:]/)[0].toLowerCase()})`]), '.');
}

/** The small line over each game's or tool's heading, so they read as one family. */
export const roomEyebrow = (route: string) => {
  const t = ROOM.find((x) => x.route === route);
  return h('span', { class: 'eyebrow' }, `Practice room · ${t?.kind === 'game' ? 'Game' : 'Tool'}`);
};
