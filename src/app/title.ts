// The browser tab's title for each page (also what a search engine shows if it renders a page).
// Kept free of the DOM so it can be tested; the shell passes the page's first heading.

/** Home's title, the same as index.html's <title>. */
export const SITE_TITLE = 'iggyuoso: learn piano in your browser with a MIDI keyboard';

/**
 * "<heading> · iggyuoso" for a page, the site title on the main module's home, and
 * "<module> · iggyuoso" on another module's home or a page without a heading.
 */
export function pageTitle(opts: { heading?: string | null; moduleName: string; home: boolean; mainModule: boolean }): string {
  if (opts.home && opts.mainModule) return SITE_TITLE;
  const heading = opts.heading?.replace(/\s+/g, ' ').trim();
  const name = !opts.home && heading ? heading : opts.moduleName;
  return name ? `${name} · iggyuoso` : SITE_TITLE;
}
