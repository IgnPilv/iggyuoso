import { parse as parseYaml } from 'yaml';
import { parseFigure } from './load';
import type { Figure, Lesson } from './types';

// The Book: theory written out as chapters to read, like a music-school textbook. The order and
// the parts are in content/book/book.yaml; each chapter is content/book/<id>.md, Markdown with a
// front matter and ```figure blocks (format in content/README.md, "The Book").

export type BookBlock = { md: string } | { figure: Figure };

export interface Chapter {
  id: string;
  /** Chapter number, 1-based, through the whole book. */
  n: number;
  part: number;
  title: string;
  summary: string;
  stage: number;
  /** Lessons that open with this chapter. */
  lessons: string[];
  blocks: BookBlock[];
  words: number;
  /** Reading time at about 200 words a minute. */
  minutes: number;
}

export interface BookPart {
  n: number;
  title: string;
  summary: string;
  chapters: Chapter[];
}

export interface Book {
  title: string;
  intro: string;
  parts: BookPart[];
  chapters: Map<string, Chapter>;
  /** The chapters a lesson opens with, in book order. */
  byLesson: Map<string, Chapter[]>;
}

type Raw = Record<string, unknown>;
const base = (path: string) => path.split('/').pop()!.replace(/\.(md|ya?ml)$/, '');

/** Prose fields (`title`, `summary`, `caption`, `ask`, `why`) may hold colons: plain values are read as text. */
const quoteProse = (yaml: string) =>
  yaml.replace(/^(\s*)(caption|ask|why|title|summary):[ \t]+(?![|>])(.+)$/gm, (line: string, indent: string, key: string, value: string) =>
    (/^(["']).*\1$/.test(value.trim()) ? line : `${indent}${key}: ${JSON.stringify(value.trim())}`));

/** Splits a chapter into its front matter and Markdown / figure blocks. */
export function parseChapterText(text: string): { meta: Raw; blocks: BookBlock[] } {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text.replace(/\r\n/g, '\n'));
  if (!m) throw new Error('should start with a front matter between "---" lines');
  const meta = (parseYaml(quoteProse(m[1])) ?? {}) as Raw;
  const blocks: BookBlock[] = [];
  const re = /^```figure\n([\s\S]*?)^```\s*$/gm;
  let at = 0;
  let hit: RegExpExecArray | null;
  const pushMd = (s: string) => { if (s.trim()) blocks.push({ md: s.trim() }); };
  while ((hit = re.exec(m[2]))) {
    pushMd(m[2].slice(at, hit.index));
    let raw: Raw;
    try {
      raw = parseYaml(quoteProse(hit[1])) as Raw;
      if (!raw || typeof raw !== 'object') throw new Error('empty');
    } catch (e) {
      throw new Error(`figure ${blocks.filter((b) => 'figure' in b).length + 1}: ${(e as Error).message}`);
    }
    try {
      blocks.push({ figure: parseFigure(raw) });
    } catch (e) {
      throw new Error(`figure ${blocks.filter((b) => 'figure' in b).length + 1}: ${(e as Error).message}`);
    }
    at = hit.index + hit[0].length;
  }
  pushMd(m[2].slice(at));
  return { meta, blocks };
}

export const countWords = (blocks: BookBlock[]) =>
  blocks.reduce((n, b) => n + ('md' in b ? b.md.replace(/[#>*|`_[\]()-]/g, ' ').split(/\s+/).filter(Boolean).length : (b.figure.caption ?? '').split(/\s+/).filter(Boolean).length), 0);

export function loadBook(files: Record<string, string>, lessons: Map<string, Lesson>): { book: Book; errors: string[] } {
  const errors: string[] = [];
  const book: Book = { title: 'The Book', intro: '', parts: [], chapters: new Map(), byLesson: new Map() };
  const indexPath = Object.keys(files).find((p) => p.endsWith('content/book/book.yaml'));
  if (!indexPath) return { book, errors };
  const texts = new Map(Object.entries(files).filter(([p]) => p.includes('content/book/') && p.endsWith('.md')).map(([p, t]) => [base(p), t]));
  let index: Raw;
  try {
    index = parseYaml(files[indexPath]) as Raw;
  } catch (e) {
    return { book, errors: [`content/book/book.yaml: ${(e as Error).message}`] };
  }
  book.title = String(index.title ?? book.title);
  book.intro = String(index.intro ?? '');
  const listed = new Set<string>();
  let n = 0;
  (Array.isArray(index.parts) ? index.parts : []).forEach((p: Raw, pi: number) => {
    const part: BookPart = { n: pi + 1, title: String(p.title ?? `Part ${pi + 1}`), summary: String(p.summary ?? ''), chapters: [] };
    book.parts.push(part);
    for (const id of (Array.isArray(p.chapters) ? p.chapters : []).map(String)) {
      if (listed.has(id)) { errors.push(`content/book/book.yaml: chapter "${id}" is listed twice`); continue; }
      listed.add(id);
      const text = texts.get(id);
      if (text === undefined) { errors.push(`content/book/book.yaml: chapter "${id}" has no file content/book/${id}.md`); continue; }
      try {
        const { meta, blocks } = parseChapterText(text);
        if (meta.id !== undefined && String(meta.id) !== id) throw new Error(`id "${meta.id}" should match the file name "${id}"`);
        if (!meta.title) throw new Error('missing "title"');
        const stage = Number(meta.stage);
        if (!Number.isInteger(stage) || stage < 1) throw new Error('"stage" should be a stage number');
        const ls = Array.isArray(meta.lessons) ? meta.lessons.map(String) : [];
        for (const l of ls) if (!lessons.has(l)) throw new Error(`lesson "${l}" not found`);
        const words = countWords(blocks);
        const ch: Chapter = {
          id, n: ++n, part: part.n, title: String(meta.title), summary: String(meta.summary ?? ''), stage, lessons: ls, blocks,
          words, minutes: Math.max(1, Math.round(words / 200)),
        };
        part.chapters.push(ch);
        book.chapters.set(id, ch);
        for (const l of ls) book.byLesson.set(l, [...(book.byLesson.get(l) ?? []), ch]);
      } catch (e) {
        errors.push(`content/book/${id}.md: ${(e as Error).message}`);
      }
    }
  });
  for (const id of texts.keys()) if (!listed.has(id)) errors.push(`content/book/${id}.md: not listed in content/book/book.yaml`);
  return { book, errors };
}

/** Puts a `read` step at the start of every lesson a chapter lists. */
export function attachReadings(book: Book, lessons: Map<string, Lesson>) {
  for (const [id, chapters] of book.byLesson) {
    const l = lessons.get(id);
    if (!l || l.steps.some((s) => 'read' in s)) continue;
    l.steps.unshift(...chapters.map((c) => ({ read: c.id })));
  }
}
