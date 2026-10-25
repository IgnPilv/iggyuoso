# Being found: search engines and link previews

## The idea

iggyuoso is a single-page app: the server sends one small `index.html`, and JavaScript draws
everything else. Pages live after the `#` in the address (`#/book`), which search engines treat as
one page, the home page. So whatever a search engine or a chat app's link preview should know about
the site has to be in `index.html` itself, as plain HTML. Google also runs the JavaScript and reads
the drawn page, but most link previews (WhatsApp, Slack, Facebook, X) and some search engines do not.

## What is in `index.html`

- **Title and description**: what shows in a search result. The title also sits in
  `src/app/title.ts` (`SITE_TITLE`); a test checks the two match.
- **Canonical link**: "this is the one real address of the page", so copies (with `?` or `#`
  bits, or `www.`) all count for one.
- **Open Graph and Twitter card tags**: the title, text and picture of a link preview. The picture
  is `public/og-image.png` (1200 × 630).
- **Icons and manifest**: `public/favicon.svg` (the tab icon, also the icon in Google results),
  `apple-touch-icon.png` (iPhone home screen), `icon-192.png`, `icon-512.png`,
  `icon-maskable-512.png` and `manifest.webmanifest` (name, colours and icons when the site is
  added to a phone's home screen).
- **Structured data (JSON-LD)**: a machine-readable card saying this is a free educational web app
  (`WebSite` + `WebApplication` on schema.org), what it teaches and what it needs. A test checks it
  is valid JSON.
- **"About iggyuoso"**: a plain-HTML section under `<div id="app">` that says in words what the
  app is, what it teaches and how it works. It is visible to people too, under the home page only:
  the shell (`src/app/shell.ts`) hides it on every other page. Styled by `.site-about` in
  `src/style.css`. Keep it true and readable, never a list of keywords.

## The site's address: one line

`SITE_URL` in `vite.config.ts` is the site's public address. `index.html` writes `__SITE_URL__`
where the address goes (canonical, share tags, picture, structured data) and the build fills it in.
The build also writes `robots.txt` (which pages crawlers may visit, and where the sitemap is) and
`sitemap.xml` (the list of pages; just the home page, since the rest are `#` addresses). When the
site gets its own domain, change that one line.

Note: crawlers read `robots.txt` only at the very root of a host (`https://ignpilv.github.io/robots.txt`),
so on GitHub Pages ours (under `/iggyuoso/`) is not read yet. Nothing is blocked either way, and the
sitemap can be given to Google Search Console by hand. With a custom domain the file starts to count.

## Previews

A preview build (`VITE_PREVIEW`, see [previews.md](../previews.md)) gets
`<meta name="robots" content="noindex, nofollow">`, no canonical link and no robots / sitemap, so
test copies never show up in search results.

## Page titles

The shell sets the browser tab's title on every page change (`pageTitle` in `src/app/title.ts`,
tested): the site title on the piano's home, otherwise the page's first heading and " · iggyuoso"
(for example "The Book · iggyuoso"), or the module's name when a page has no heading.

## Changing the pictures

`public/og-image.png` and the PNG icons are drawn from `tools/seo/card.html` and
`public/favicon.svg` by `node tools/seo/images.mjs` (headless Chromium through Playwright). Change
the card or the icon, run it, and commit the new PNGs.

## Checking

`npm run build`, then `npx vite preview` and a Lighthouse SEO audit
(`npx lighthouse http://localhost:4173/ --only-categories=seo`) scored 100 when this was set up.
Share-card debuggers (Facebook's Sharing Debugger, opengraph.xyz) and Google's Rich Results Test
need the live site.

## What only Ignas can do

These need his accounts, so no session can do them.

**Google Search Console** (tells Google the site exists, shows searches and problems):

1. Open https://search.google.com/search-console, sign in, **Add property**, choose **URL prefix**,
   enter `https://ignpilv.github.io/iggyuoso/`.
2. Choose the **HTML tag** method and copy the tag (`<meta name="google-site-verification" content="…">`).
   Send it to a session, which adds it to `index.html` and merges (the code is not secret: anyone can
   read it in the page). Once it is live, press **Verify**.
3. **Sitemaps** → enter `sitemap.xml` → Submit. Then **URL inspection** → paste the address →
   **Request indexing**.
4. Optional: Bing Webmaster Tools (https://www.bing.com/webmasters) can import the site straight from
   Search Console, which also covers DuckDuckGo and Yahoo.

**A custom domain** (e.g. `iggyuoso.com`; better for search and needed for `robots.txt` to count):

1. Buy it at any registrar (Cloudflare, Namecheap, Porkbun: about €10 a year).
2. At the registrar's DNS settings add four **A** records for the bare domain (`@`) pointing to
   `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`, and a **CNAME** for `www`
   pointing to `ignpilv.github.io`.
3. On GitHub: your profile **Settings → Pages → Add a domain** to verify it (stops anyone else
   claiming it), then the repository's **Settings → Pages → Custom domain**, enter it, Save, wait for
   the DNS check and tick **Enforce HTTPS**.
4. In Supabase: **Authentication → URL Configuration**, set the Site URL to the new address and add it
   to the Redirect URLs, or sign-in links will still lead to the old address.
5. Tell a session: it changes `SITE_URL` in `vite.config.ts` and checks the sign-in link. Then add the
   new domain in Search Console (a **Domain** property, verified by a DNS TXT record) and submit its
   sitemap. GitHub keeps redirecting the old `github.io` address to the new one.
