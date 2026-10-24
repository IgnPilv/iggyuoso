import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadContent } from '../src/content/load';
import type { TimedExercise } from '../src/content/types';
import { parseExercise } from '../src/content/load';
import { parse } from 'yaml';

export function readContentFiles(dir = join(__dirname, '..', 'content')): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.ya?ml$/.test(f)) out[p.replace(/\\/g, '/')] = readFileSync(p, 'utf8');
    }
  };
  walk(dir);
  return out;
}

/** The Book's chapters (content/book/*.md). */
export function readBookFiles(dir = join(__dirname, '..', 'content', 'book')): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of readdirSync(dir)) if (f.endsWith('.md')) out[join(dir, f).replace(/\\/g, '/')] = readFileSync(join(dir, f), 'utf8');
  return out;
}

export const realContent = () => loadContent(readContentFiles());

export function timed(yaml: string): TimedExercise {
  const ex = parseExercise(parse(yaml));
  if (ex.kind !== 'timed') throw new Error('not timed');
  return ex;
}
