// Draws the site's share and app-icon images into public/ (run by hand after a design change:
// `node tools/seo/images.mjs`). Uses the pre-installed Playwright Chromium. docs/dev/seo.md.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// require() also finds a globally installed Playwright, which import does not.
const { chromium } = createRequire(import.meta.url)('playwright');

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const pub = here('../../public/');
const icon = readFileSync(pub + 'favicon.svg', 'utf8');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto('file://' + here('card.html'));
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: pub + 'og-image.png' });

for (const [name, size, pad] of [['apple-touch-icon.png', 180, 0], ['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['icon-maskable-512.png', 512, 0.1]]) {
  const p = await browser.newPage({ viewport: { width: size, height: size } });
  // Maskable icons keep the mark inside the safe circle, on a full-bleed background.
  const inner = pad ? icon.replace('rx="16"', 'rx="0"').replace(/(<rect x=[^>]*>)+/, (bars) => `<g transform="translate(32 32) scale(${1 - pad * 2}) translate(-32 -32)">${bars}</g>`) : icon;
  await p.setContent(`<style>html,body{margin:0;background:transparent}svg{width:100%;height:100%;display:block}</style>${inner}`);
  await p.screenshot({ path: pub + name, omitBackground: !pad });
}
await browser.close();
console.log('Images written to public/');
