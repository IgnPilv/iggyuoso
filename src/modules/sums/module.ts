import type { Module } from '../../core/module';
import { h, type View } from '../../core/dom';
import { ModuleRecords } from '../../core/storage';

// A SAMPLE module: it only shows how a second module sits next to the piano (its own header
// links, home page, routes and saved records on the same account). It is deliberately tiny;
// replace it or delete it when a real second module (a math tutor, a painting course) is built.

const ICON = {
  sums: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M7 9h4M9 7v4M13.5 9h4M7 15.5h4M13.5 14.5h4M13.5 16.5h4"/></svg>',
  about: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r="0.6" fill="currentColor"/></svg>',
};

/** Saved as `iggyuoso.sums.*`, so it syncs with the account next to the piano's progress. */
export const sumsRecords = new ModuleRecords('sums');

export interface SumsBest { score: number; of: number; at: string }

const ROUND = 5;

/** A round of additions within 20, each with four answers to pick from. */
export function sumsRound(rnd = Math.random): { a: number; b: number; choices: number[] }[] {
  return Array.from({ length: ROUND }, () => {
    const a = 1 + Math.floor(rnd() * 10);
    const b = 1 + Math.floor(rnd() * 10);
    const set = new Set([a + b]);
    while (set.size < 4) set.add(Math.max(0, a + b + Math.floor(rnd() * 7) - 3));
    return { a, b, choices: [...set].sort((x, y) => x - y) };
  });
}

const sampleNote = () => h('p', { class: 'banner' }, h('strong', {}, 'Sample module. '),
  'This is a placeholder that shows how iggyuoso can hold more than the piano: its own pages and header links, on the same account. Switch back to the piano with the button next to the logo.');

/** Home: a round of five sums; the best round is saved (the demo passes throwaway records). */
export function sumsPage(root: HTMLElement, records: ModuleRecords = sumsRecords) {
  const best = () => records.get<SumsBest>('best');
  const bestLine = h('p', { class: 'small' });
  const showBest = () => { const b = best(); bestLine.textContent = b ? `Best round: ${b.score} of ${b.of}.` : 'No round played yet.'; };
  const box = h('div');
  const start = () => {
    const qs = sumsRound();
    let i = 0;
    let right = 0;
    const ask = () => {
      if (i === qs.length) {
        const b = best();
        if (!b || right > b.score) records.put('best', { score: right, of: qs.length, at: new Date().toISOString() });
        showBest();
        box.replaceChildren(h('p', { class: 'ask' }, `${right} of ${qs.length} right.`),
          h('div', { class: 'controls' }, h('button', { onclick: start }, 'Another round')));
        return;
      }
      const q = qs[i];
      const feedback = h('p', { class: 'small' }, `Question ${i + 1} of ${qs.length}`);
      box.replaceChildren(h('p', { class: 'ask' }, `${q.a} + ${q.b} = ?`),
        h('div', { class: 'controls' }, ...q.choices.map((c) => h('button', { class: 'secondary', onclick: () => {
          if (c === q.a + q.b) right++;
          i++;
          ask();
        } }, String(c)))),
        feedback);
    };
    ask();
  };
  showBest();
  box.append(h('div', { class: 'controls' }, h('button', { onclick: start }, 'Start a round')));
  root.append(sampleNote(), h('section', { class: 'card' }, h('h2', {}, 'Sums'), h('p', {}, 'Five additions within 20. Pick the answer.'), box, bestLine));
}

const aboutView: View = (root) => {
  root.append(sampleNote(), h('section', { class: 'card' },
    h('h2', {}, 'About this sample'),
    h('p', {}, 'Each module brings its own home page, pages and header links, and keeps its progress under its own name in your account. The account, your profile, the look of the app and Settings → Appearance are shared by every module.'),
    h('p', { class: 'small' }, 'For developers: docs/modules.md in the repository says how a module is added.')));
};

export const sums: Module = {
  id: 'sums',
  name: 'Sums',
  description: 'Sample module: how a second subject would sit next to the piano',
  tagline: 'a sample module',
  icon: ICON.sums,
  sample: true,
  routes: { '': (root) => sumsPage(root), about: aboutView },
  nav: [
    { href: 'sums', label: 'Sums', icon: ICON.sums },
    { href: 'sums/about', label: 'About', icon: ICON.about },
  ],
  summary: () => {
    const b = sumsRecords.get<SumsBest>('best');
    return b ? `best round ${b.score} of ${b.of}` : undefined;
  },
  profile: (root) => {
    const b = sumsRecords.get<SumsBest>('best');
    root.append(h('section', { class: 'card' }, h('h2', {}, 'Sums'), h('p', {}, b ? `Best round: ${b.score} of ${b.of}.` : 'No round played yet.')));
  },
  redrawOnSync: [''],
};
