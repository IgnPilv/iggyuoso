import { stopAll } from '../audio/audio';
import type { Calibration } from '../calibration';
import { book, content, nodeOfLesson } from '../content';
import type { Chapter } from '../content/book';
import type { Figure } from '../content/types';
import { demo, DEMO_CALIBRATION } from '../demo/demo';
import { store } from '../progress/store';
import { h, type View } from './dom';
import { bookMarkdown, markdown } from './markdown';
import { checkQuestion, soundButton, theoryKeys, theoryStaff } from './theory';
import { BRANCH_LABEL } from './treeView';

// The Book (#/book): theory to read, chapter by chapter, with pictures on the staff and the keys
// and sounds to hear. A lesson that a chapter lists opens with it (the `read` step).

const READ = 'book.read';

/** Chapters read, with the day each was first finished. The demo never saves. */
export const chaptersRead = (): Record<string, string> => store.get<Record<string, string>>(READ) ?? {};
export function markRead(id: string) {
  if (demo.active || chaptersRead()[id]) return;
  store.put(READ, { ...chaptersRead(), [id]: new Date().toISOString().slice(0, 10) });
}

const calibration = (): Calibration => (demo.active ? DEMO_CALIBRATION : store.calibration ?? DEMO_CALIBRATION);

function figure(f: Figure, cal: Calibration): { el: HTMLElement; destroy: () => void } {
  const check = f.check ? checkQuestion(f.check, cal, () => {}) : undefined;
  const caption = f.caption ? h('figcaption', {}) : '';
  if (caption) caption.innerHTML = markdown(f.caption!);
  const el = h('figure', { class: 'book-figure' },
    f.staff ? theoryStaff(f.staff) : '',
    f.keys ? theoryKeys(f.keys, cal) : '',
    f.sound ? h('div', { class: 'controls' }, soundButton(f.sound)) : '',
    caption,
    check?.el ?? '');
  return { el, destroy: () => check?.destroy() };
}

/** A chapter's text and pictures, as an article. */
export function chapterArticle(ch: Chapter, cal = calibration()): { el: HTMLElement; destroy: () => void } {
  const parts: (() => void)[] = [];
  const body = h('div', { class: 'book-text' });
  for (const b of ch.blocks) {
    if ('md' in b) {
      const div = h('div');
      div.innerHTML = bookMarkdown(b.md);
      body.append(...div.childNodes);
    } else {
      const f = figure(b.figure, cal);
      parts.push(f.destroy);
      body.append(f.el);
    }
  }
  return { el: body, destroy: () => { parts.forEach((d) => d()); stopAll(); } };
}

const goBtn = (label: string, path: string, cls = '', before?: () => void) =>
  h('button', { class: cls, onclick: () => { before?.(); location.hash = path; } }, label);

const meta = (ch: Chapter) => `Chapter ${ch.n} · ${ch.minutes} min read · stage ${ch.stage}`;

function practiseIt(ch: Chapter): HTMLElement | '' {
  const ls = ch.lessons.map((id) => content.lessons.get(id)).filter((l) => !!l);
  if (!ls.length) return '';
  return h('div', { class: 'book-practise' },
    h('span', { class: 'eyebrow' }, 'Practise it'),
    h('ul', {}, ...ls.map((l) => {
      const n = nodeOfLesson(l!.id);
      return h('li', {}, h('a', { href: `#/lesson/${l!.id}` }, l!.title), n ? h('span', { class: 'small' }, ` ${BRANCH_LABEL[n.branch] ?? 'Song'} · stage ${n.stage}`) : '');
    })));
}

function tocView(root: HTMLElement) {
  const read = chaptersRead();
  const all = [...book.chapters.values()];
  const next = all.find((c) => !read[c.id]);
  const done = all.filter((c) => read[c.id]).length;
  const intro = h('div', { class: 'explain' });
  intro.innerHTML = markdown(book.intro);
  root.append(h('section', { class: 'card book-hero' },
    h('span', { class: 'eyebrow' }, `${all.length} chapters · ${Math.round(all.reduce((a, c) => a + c.minutes, 0) / 60 * 10) / 10} hours of reading`),
    h('h1', {}, book.title),
    intro,
    h('div', { class: 'controls' },
      next ? goBtn(done ? `Continue: ${next.title}` : `Start reading: ${next.title}`, `/book/${next.id}`) : '',
      h('span', { class: 'small' }, `${done} of ${all.length} read`))));
  for (const p of book.parts) {
    root.append(h('section', { class: 'card book-part' },
      h('span', { class: 'eyebrow' }, `Part ${p.n}`),
      h('h2', {}, p.title),
      p.summary ? h('p', { class: 'small' }, p.summary) : '',
      h('ol', { class: 'book-toc' }, ...p.chapters.map((c) => h('li', { class: read[c.id] ? 'read' : '' },
        h('a', { href: `#/book/${c.id}` },
          h('span', { class: 'toc-n' }, String(c.n)),
          h('span', { class: 'toc-title' }, c.title, c.summary ? h('span', { class: 'toc-summary' }, c.summary) : ''),
          h('span', { class: 'toc-meta' }, read[c.id] ? '✓ read' : `${c.minutes} min`)))))));
  }
}

function chapterView(root: HTMLElement, ch: Chapter) {
  const all = [...book.chapters.values()];
  const prev = all[ch.n - 2];
  const next = all[ch.n];
  const part = book.parts[ch.part - 1];
  const art = chapterArticle(ch);
  const end = h('div', { class: 'book-end' });
  // Reaching the end of the text marks the chapter read.
  let seen: IntersectionObserver | undefined;
  if ('IntersectionObserver' in window) {
    seen = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { markRead(ch.id); seen?.disconnect(); } });
    seen.observe(end);
  }
  root.append(h('article', { class: 'card book-chapter' },
    h('a', { class: 'small book-crumb', href: '#/book' }, `${book.title} · Part ${part.n}: ${part.title}`),
    h('span', { class: 'eyebrow' }, meta(ch)),
    h('h1', {}, ch.title),
    ch.summary ? h('p', { class: 'book-lede' }, ch.summary) : '',
    art.el,
    end,
    practiseIt(ch),
    h('nav', { class: 'book-nav controls' },
      prev ? goBtn(`← ${prev.title}`, `/book/${prev.id}`, 'secondary') : '',
      goBtn('Contents', '/book', 'secondary'),
      next ? goBtn(`${next.title} →`, `/book/${next.id}`, '', () => markRead(ch.id)) : '')));
  window.scrollTo?.(0, 0);
  return () => { seen?.disconnect(); art.destroy(); };
}

export const bookView: View = (root, id) => {
  const ch = id ? book.chapters.get(id) : undefined;
  if (id && !ch) { root.append(h('p', {}, 'Chapter not found. ', h('a', { href: '#/book' }, 'Contents'))); return; }
  return ch ? chapterView(root, ch) : tocView(root);
};

/**
 * The reading at the start of a lesson: the whole chapter the first time; once read, a short card
 * that can open it again. Next is always allowed; leaving the step marks the chapter read.
 */
export function readStep(ch: Chapter, cal: Calibration): { el: HTMLElement; destroy: () => void; leave: () => void } {
  let art: { el: HTMLElement; destroy: () => void } | undefined;
  const box = h('div', { class: 'read-step' });
  const head = h('div', { class: 'read-head' },
    h('span', { class: 'eyebrow' }, `Read first · ${meta(ch)}`),
    h('h3', {}, ch.title),
    ch.summary ? h('p', { class: 'small' }, ch.summary) : '');
  const open = () => {
    art = chapterArticle(ch, cal);
    box.replaceChildren(head, art.el, h('p', { class: 'small' }, 'Also in ', h('a', { href: `#/book/${ch.id}` }, `${book.title}, chapter ${ch.n}`), '. Next: the screens and questions that go with it.'));
  };
  if (chaptersRead()[ch.id] && !demo.active) {
    box.append(head, h('div', { class: 'controls' },
      h('button', { class: 'secondary', onclick: open }, 'Read it again'),
      h('span', { class: 'small' }, '✓ You have read this chapter.')));
  } else open();
  return { el: box, destroy: () => art?.destroy(), leave: () => markRead(ch.id) };
}
