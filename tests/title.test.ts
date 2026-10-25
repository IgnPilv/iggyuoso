import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { pageTitle, SITE_TITLE } from '../src/app/title';

describe('page titles', () => {
  it('uses the site title on the main home and matches index.html', () => {
    expect(pageTitle({ heading: 'Easy as C D E.', moduleName: 'Piano', home: true, mainModule: true })).toBe(SITE_TITLE);
    expect(readFileSync('index.html', 'utf8')).toContain(`<title>${SITE_TITLE}</title>`);
  });
  it('names a page by its heading', () => {
    expect(pageTitle({ heading: '  Chord\n finder ', moduleName: 'Piano', home: false, mainModule: true })).toBe('Chord finder · iggyuoso');
  });
  it('falls back to the module name', () => {
    expect(pageTitle({ heading: null, moduleName: 'Piano', home: false, mainModule: true })).toBe('Piano · iggyuoso');
    expect(pageTitle({ heading: 'Sums', moduleName: 'Sums', home: true, mainModule: false })).toBe('Sums · iggyuoso');
  });
});

describe('search tags in index.html', () => {
  const html = readFileSync('index.html', 'utf8');
  it('has one description, a canonical link and share tags', () => {
    expect(html.match(/<meta name="description"/g)).toHaveLength(1);
    for (const tag of ['rel="canonical"', 'og:title', 'og:image', 'twitter:card', 'rel="manifest"']) expect(html).toContain(tag);
  });
  it('has valid JSON-LD', () => {
    const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1];
    const data = JSON.parse(json.replaceAll('__SITE_URL__', 'https://example.org/'));
    expect(data['@graph'].map((n: { '@type': string }) => n['@type'])).toEqual(['WebSite', 'WebApplication']);
  });
});
