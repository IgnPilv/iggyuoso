import { content, treeNodes } from '../content';
import { STRANDS, type Strand } from '../content/tree';
import type { Hand } from '../music/notes';
import { demo } from '../demo/demo';
import { demoProgress, lessonExercises, lessonGoals, mastery } from '../progress';
import { dayOf, Mastery, type NodeState } from '../progress/mastery';
import { levelOf, strandMastery, type DayLog, type TimingEntry } from '../progress/profile';
import { memoryBackend, store, Store } from '../progress/store';
import { account, demoAccount } from '../../../core/sync';
import type { Account } from '../../../core/sync/account';
import { accountCard } from '../../../core/accountView';
import { h, type View } from '../../../core/dom';

// The player profile (#/profile): level and XP, the practice calendar, totals, mastery per
// strand of the tree and timing per hand. It only reads progress; the demo passes throwaway
// progress with a made-up history.

const STRAND_LABEL: Record<Strand, string> = {
  technique: 'Technique', reading: 'Reading', rhythm: 'Rhythm', theory: 'Theory', ear: 'Ear', repertoire: 'Pieces', creativity: 'Creativity', songs: 'Songs',
};
const HAND_LABEL: Record<Hand, string> = { right: 'Right hand', left: 'Left hand' };

/** Calendar shade for a day's practice time. */
const shade = (minutes: number) => (minutes <= 0 ? 0 : minutes < 5 ? 1 : minutes < 15 ? 2 : minutes < 30 ? 3 : 4);

const ms = (x: number) => `${Math.abs(x)} ms ${x < 0 ? 'early' : 'late'}`;
function timingWords(mean: number) {
  return Math.abs(mean) < 15 ? 'right on the beat' : `${ms(mean)} on average`;
}

/** The profile page; with an account, its card (guest or signed in) comes first. */
export function renderProfile(p: { store: Store; mastery: Mastery }, now = new Date(), acct?: Account): HTMLElement {
  const today = dayOf(now);
  const meta = p.mastery.meta;
  const lv = levelOf(meta.xp);
  const prof = p.mastery.profile;
  const totals = prof.totals();
  const streak = p.mastery.currentStreak(now);
  const xpToday = meta.xpDay === today ? meta.xpToday : 0;

  const stat = (value: string | number, label: string) => h('div', { class: 'stat' }, h('strong', {}, String(value)), h('span', {}, label));
  const levelCard = h('section', { class: 'card profile-level' },
    h('div', { class: 'level-badge' }, h('span', {}, 'Level'), h('strong', {}, String(lv.level))),
    h('div', { class: 'level-main' },
      h('div', { class: 'level-bar', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': lv.span, 'aria-valuenow': lv.into },
        h('span', { style: `width: ${Math.round((100 * lv.into) / lv.span)}%` })),
      h('p', { class: 'small' }, `${lv.into} / ${lv.span} XP to level ${lv.level + 1}`),
      h('div', { class: 'stats' },
        stat(meta.xp, 'XP in all'),
        stat(xpToday, 'XP today'),
        stat(streak, 'day streak'),
        stat(meta.bestStreak ?? meta.streak, 'best streak'))));

  // Calendar: one column per week, Monday at the top.
  const cal = prof.calendar(today, 12);
  const firstDow = (new Date(`${cal[0].day}T12:00:00`).getDay() + 6) % 7;
  const cells = [...Array(firstDow).fill(null), ...cal];
  const grid = h('div', { class: 'cal-grid', role: 'img', 'aria-label': 'Practice over the last 12 weeks' },
    ...cells.map((c) => {
      if (!c) return h('span', { class: 'cal-day empty' });
      const min = c.log ? Math.round(c.log.ms / 60_000) : 0;
      return h('span', {
        class: `cal-day s${shade(min)}${c.day === today ? ' today' : ''}`,
        title: c.log ? `${c.day}: ${min} min, ${c.log.takes} takes, ${c.log.xp} XP` : `${c.day}: no practice`,
      });
    }));
  // Month names over the week where a month starts, weekday names down the side.
  const weeks = Math.ceil(cells.length / 7);
  let lastMonth = -1;
  const months = h('div', { class: 'cal-months', 'aria-hidden': 'true' }, ...Array.from({ length: weeks }, (_, w) => {
    const first = cells.slice(w * 7, w * 7 + 7).find((c) => c);
    const m = first ? new Date(`${first.day}T12:00:00`).getMonth() : lastMonth;
    const label = m !== lastMonth ? new Date(2000, m, 1).toLocaleString('en', { month: 'short' }) : '';
    lastMonth = m;
    return h('span', {}, label);
  }));
  const weekdays = h('div', { class: 'cal-weekdays', 'aria-hidden': 'true' }, ...['Mon', '', 'Wed', '', 'Fri', '', ''].map((d) => h('span', {}, d)));
  const calendar = h('div', { class: 'cal-wrap' }, h('span'), months, weekdays, grid);
  const lessons = [...content.lessons.values()];
  const lessonsDone = lessons.filter((l) => p.store.lessonDone(lessonGoals(l))).length;
  const calendarCard = h('section', { class: 'card' },
    h('h2', {}, 'Practice'),
    calendar,
    h('div', { class: 'cal-legend small' }, 'Less', ...[0, 1, 2, 3, 4].map((s) => h('span', { class: `cal-day s${s}` })), 'More'),
    h('div', { class: 'stats' },
      stat(totals.days, 'days practised'),
      stat(totals.minutes, 'minutes'),
      stat(totals.takes, 'takes'),
      stat(totals.clean, 'clean takes'),
      stat(`${lessonsDone} / ${lessons.length}`, 'lessons done')));

  // Skills: the tree's strands, how far along their written nodes are.
  const rows = strandMastery(treeNodes.values(), (id) => p.mastery.state(id));
  const skillsCard = h('section', { class: 'card' },
    h('h2', {}, 'Skills'),
    h('p', { class: 'small' }, 'Each skill strand of the tree: how many of its lessons are Practised, Solid and Mastered.'),
    h('div', { class: 'strands' }, ...STRANDS.filter((s) => rows.get(s)!.total).map((s) => {
      const r = rows.get(s)!;
      const pct = (n: number) => `${(100 * n) / r.total}%`;
      return h('div', { class: 'strand' },
        h('span', { class: 'strand-name' }, STRAND_LABEL[s]),
        h('div', { class: 'strand-bar', title: `${r.mastered} Mastered, ${r.solid} Solid, ${r.practised} Practised of ${r.total}` },
          h('span', { class: 'mastered', style: `width: ${pct(r.mastered)}` }),
          h('span', { class: 'solid', style: `width: ${pct(r.solid)}` }),
          h('span', { class: 'practised', style: `width: ${pct(r.practised)}` })),
        h('span', { class: 'strand-count' }, `${r.solid + r.mastered} / ${r.total}`));
    })),
    h('div', { class: 'cal-legend small' },
      h('span', { class: 'key mastered' }), 'Mastered', h('span', { class: 'key solid' }), 'Solid', h('span', { class: 'key practised' }), 'Practised'));

  // Timing per hand, from the last timed takes.
  const t = prof.timingSummary();
  const hands = (['right', 'left'] as Hand[]).filter((x) => t[x]);
  const timingCard = h('section', { class: 'card' },
    h('h2', {}, 'Timing'),
    hands.length ? h('div', { class: 'timing-hands' }, ...hands.map((hand) => {
      const s = t[hand]!;
      const trend = s.before === undefined ? '' : Math.abs(s.mean) < Math.abs(s.before) - 5 ? `Better than before (${timingWords(s.before)}).`
        : Math.abs(s.mean) > Math.abs(s.before) + 5 ? `Was ${timingWords(s.before)} before.` : '';
      return h('div', { class: `timing-hand ${hand}` },
        h('h3', {}, HAND_LABEL[hand]),
        h('p', { class: 'timing-big' }, timingWords(s.mean)),
        h('p', { class: 'small' }, s.spread === null ? '' : `Steadiness: notes land within ±${s.spread} ms. `, trend,
          ` From the last ${Math.min(s.takes, 10)} timed ${s.takes === 1 ? 'take' : 'takes'}.`));
    })) : h('p', { class: 'small' }, 'Play a timed exercise to see how each hand keeps time.'));

  return h('div', { class: 'profile' }, acct ? accountCard(acct) : null, levelCard, calendarCard, skillsCard, timingCard);
}

/**
 * Throwaway progress with a made-up history, for the demo: seven weeks of practice with a few
 * rest days, a streak, timing that improves, and the first nodes of the tree climbing.
 */
export function sampleProgress(now = new Date()): { store: Store; mastery: Mastery } {
  const s = new Store(memoryBackend());
  const m = new Mastery(s, treeNodes, (l) => { const x = content.lessons.get(l); return x ? lessonExercises(x) : []; });
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const days: Record<string, DayLog> = {};
  const timing: TimingEntry[] = [];
  let xp = 0;
  for (let i = 48; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000);
    if (i > 9 && rnd() < 0.25) continue; // a rest day now and then, none in the last 10 days
    const minutes = Math.round(6 + rnd() * 28);
    const takes = Math.round(minutes * 1.4);
    const dayXp = Math.round(minutes * 7);
    xp += dayXp;
    days[dayOf(d)] = { xp: dayXp, takes, clean: Math.round(takes * 0.35), ms: minutes * 60_000, lastAt: d.getTime() };
    const at = d.toISOString();
    timing.push({ at, hand: 'right', mean: Math.round(45 * (i / 48) + 4 + rnd() * 10), spread: Math.round(30 + 25 * (i / 48)) });
    timing.push({ at, hand: 'left', mean: Math.round(-30 * (i / 48) - 18 + rnd() * 8), spread: Math.round(45 + 20 * (i / 48)) });
  }
  s.put('profile.days', days);
  s.put('profile.timing', timing);
  s.put('mastery.meta', { xp, xpDay: dayOf(now), xpToday: days[dayOf(now)]?.xp ?? 0, streak: 10, streakDay: dayOf(now), bestStreak: 14 });
  const states: NodeState[] = ['mastered', 'mastered', 'solid', 'solid', 'practised', 'practised', 'practised'];
  const written = [...treeNodes.values()].filter((n) => n.lesson && !n.planned && n.strand !== 'all');
  written.slice(0, 28).forEach((n, i) => s.put(`mastery.${n.id}`, { state: states[i % states.length], box: 1, lastGood: dayOf(now) }));
  return { store: s, mastery: m };
}

export const profileView: View = (root) => {
  root.append(demo.active ? renderProfile(demoProgress(), new Date(), demoAccount().account) : renderProfile({ store, mastery }, new Date(), account));
};
