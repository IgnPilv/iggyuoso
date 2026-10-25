/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite';

// The site's public address: canonical link, share cards, sitemap and robots.txt all come from it
// (docs/dev/seo.md). Change this one line when the site moves to its own domain. Keep the slash.
export const SITE_URL = 'https://ignpilv.github.io/iggyuoso/';

// Search-engine files. index.html writes __SITE_URL__ where the address goes; the build adds
// robots.txt and sitemap.xml. A preview build (VITE_PREVIEW, docs/previews.md) asks not to be
// indexed and drops the canonical link, so only the main site shows up in search.
function seo(): Plugin {
  const preview = !!process.env.VITE_PREVIEW?.trim();
  return {
    name: 'iggyuoso-seo',
    transformIndexHtml(html) {
      let out = html.replaceAll('__SITE_URL__', SITE_URL);
      if (preview) {
        out = out.replace(/\s*<link rel="canonical"[^>]*>/, '')
          .replace('<meta name="robots" content="index, follow" />', '<meta name="robots" content="noindex, nofollow" />');
      }
      return out;
    },
    generateBundle() {
      if (preview) return;
      const path = new URL(SITE_URL).pathname;
      const today = new Date().toISOString().slice(0, 10);
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source:
        `# Crawlers read robots.txt only at the root of a host; on GitHub Pages this file starts to\n` +
        `# count once the site has its own domain (docs/dev/seo.md).\n` +
        `User-agent: *\nAllow: ${path}\nDisallow: ${path}preview/\n\nSitemap: ${SITE_URL}sitemap.xml\n` });
      // The app's pages are hash addresses (#/book), which search engines treat as one page.
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source:
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        `  <url><loc>${SITE_URL}</loc><lastmod>${today}</lastmod></url>\n</urlset>\n` });
    },
  };
}

// Relative base so the same build works on GitHub Pages (/iggyuoso/) and locally.
// Routing is hash-based, so no server rewrites are needed.
export default defineConfig({
  base: './',
  plugins: [seo()],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
