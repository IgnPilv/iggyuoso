import { describe, expect, it } from 'vitest';
import { attachReadings, loadBook, parseChapterText } from '../src/content/book';
import { loadContent } from '../src/content/load';
import { readBookFiles, readContentFiles } from './helpers';

describe('the Book', () => {
  const files = readContentFiles();
  const { content } = loadContent(files);
  const { book, errors } = loadBook({ ...files, ...readBookFiles() }, content.lessons);

  it('loads every chapter without problems', () => {
    expect(errors).toEqual([]);
    expect(book.chapters.size).toBeGreaterThan(0);
  });

  it('numbers chapters through the book and gives each a reading time', () => {
    [...book.chapters.values()].forEach((c, i) => expect(c.n).toBe(i + 1));
    for (const c of book.chapters.values()) expect(c.minutes).toBeGreaterThanOrEqual(1);
  });

  it('has real readings: several hundred words a chapter', () => {
    for (const c of book.chapters.values()) expect(c.words, c.id).toBeGreaterThan(500);
  });

  it('follows the tree: a chapter never comes before its stage', () => {
    const stages = [...book.chapters.values()].map((c) => c.stage);
    for (let i = 1; i < stages.length; i++) expect(stages[i]).toBeGreaterThanOrEqual(stages[i - 1] - 1);
  });

  it('opens each listed lesson with its chapter', () => {
    const lessons = loadContent(files).content.lessons;
    attachReadings(book, lessons);
    const [id, chapters] = [...book.byLesson][0];
    expect(lessons.get(id)!.steps.slice(0, chapters.length)).toEqual(chapters.map((c) => ({ read: c.id })));
  });
});

describe('chapter format', () => {
  it('splits text and figures', () => {
    const { meta, blocks } = parseChapterText('---\ntitle: T\nstage: 1\n---\nIntro.\n\n```figure\nstaff: "C4:q"\ncaption: A C.\n```\n\nMore.');
    expect(meta.title).toBe('T');
    expect(blocks.map((b) => ('md' in b ? 'md' : 'figure'))).toEqual(['md', 'figure', 'md']);
  });

  it('reports bad figures and missing lessons', () => {
    const lessons = new Map();
    const book = (md: string) => loadBook({ 'content/book/book.yaml': 'parts:\n  - title: P\n    chapters: [a]', 'content/book/a.md': md }, lessons).errors;
    expect(book('---\ntitle: A\nstage: 1\n---\n```figure\nfoo: 1\n```\n')[0]).toMatch(/figure 1/);
    expect(book('---\ntitle: A\nstage: 1\nlessons: [nope]\n---\nText')[0]).toMatch(/lesson "nope" not found/);
    expect(loadBook({ 'content/book/book.yaml': 'parts: []', 'content/book/b.md': '---\ntitle: B\nstage: 1\n---\n' }, lessons).errors[0]).toMatch(/not listed/);
  });
});
