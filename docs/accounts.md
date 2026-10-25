# Accounts and sync

One account serves every module of the site (the piano tutor, and any module added later; see
`docs/modules.md`). Each module keeps its records under its own name, so the account holds them
side by side. iggyuoso works in two ways:

- **Guest** (the default). Progress is saved in the browser, on this device only. Nothing leaves
  the device. Another device or browser, or clearing the site's data, starts from zero.
- **Signed in.** The same progress, copied to an account server and back, so it follows the
  player to every device. Sign-in is with Google ("Continue with Google"), or by an emailed link
  ("Use email instead"); no password either way. Signing in keeps the
  guest's progress and adds it to the account; signing out keeps everything on the device as a
  guest again.

The app always plays from the progress on the device; the account only copies it. So it works
offline and syncs when the network comes back.

## How it is built

- `src/core/storage.ts`: the key-value backend every module saves through. The real one
  (`deviceData`) is localStorage wrapped by `src/core/sync/tracker.ts`, which stamps every change to
  a synced record in `iggyuoso.sync.changes`. A module saves `iggyuoso.<module id>.*` records
  (`ModuleRecords`); the piano predates modules and keeps its old names (`ex.*`, `mastery.*`, ...;
  `src/modules/piano/progress/store.ts` and `records.ts`).
- Synced: every `iggyuoso.*` record except the device's own (`schema`, `settings`, `account`,
  `module` from the shell; `calibration` from the piano: the keyboard, latency, look and open
  module) and `sync.*`. New records of any module sync without any change here.
- **Signing in with Google** (OAuth with PKCE, no server of ours, no SDK): the device keeps a
  random verifier (`iggyuoso.sync.pkce`, `src/core/sync/pkce.ts`) and sends the browser to
  `<Supabase>/auth/v1/authorize?provider=google` with its SHA-256 challenge. Supabase sends it on
  to Google and back to the app with `?code=...` in the query; the shell cleans the address to
  `#/profile` and the code and verifier are traded at `/auth/v1/token?grant_type=pkce` for a
  session. The email link comes back with the session in the hash instead. Both come back to the
  app's own address, which must be in Supabase's Redirect URLs. Preview copies stay guest only.
- `src/core/sync/account.ts`: who is playing (guest or account), sign-in, sign-out and the sync
  itself: pull rows changed on the server since the last pull, merge records changed on both
  sides, push what changed here. Sync runs on start, a few seconds after each change, when the
  tab is hidden, when the window gets focus and when the network comes back.
- **Wipe progress** (account card on the Profile): deletes every progress record on the device
  and, when signed in, every row of the account, in every module, except each module's own work (the piano's sketches
  and my songs; `keepOnWipe` in `src/core/records.ts`, declared by each module),
  then saves a `wiped` row with the time. A device that synced before that time wipes itself on
  its next pull; a device signing in for the first time afterwards keeps its guest progress.
  Nothing is deleted when the account can't be reached.
- `src/core/sync/merge.ts`: merges a record changed on both sides with the rules modules declare
  (`Module.records.merge`). The piano's (`src/modules/piano/progress/records.ts`): exercise records,
  the practice log, timing and XP keep the most of both sides; everything else takes the newer
  version.
- Rows carry the app-wide `schema` version (`src/core/storage.ts`). Rows from a newer app are left
  alone (the profile asks for a reload); rows from an older app are written and upgraded by each
  module's `records.upgrade` (the piano's is `Store.upgradeFrom`).
- `src/core/sync/types.ts`: `SyncProvider`, the only thing a backend has to implement.
  `src/core/sync/supabase.ts` is the real one, `src/core/sync/memory.ts` a pretend one for tests and the
  demo.
- `src/core/sync/config.ts`: the server address and key, read at build time from `VITE_SUPABASE_URL`
  and `VITE_SUPABASE_ANON_KEY`. Without them the app is guest only and the profile says accounts
  are coming.

## Backend: Supabase (free plan)

Why Supabase: free plan, works straight from a static GitHub Pages site (plain HTTPS calls, no
server of our own, no SDK in the bundle), email-link sign-in built in, and the data is one
ordinary Postgres table with row-level security. Things to know: free projects that see no use
for a week can be paused (the app keeps working on the device; press "Restore" in the Supabase
dashboard), and the built-in email sender sends only about two sign-in emails an hour, which is
why Google is the main way in (it sends no email, so it has no such limit).

## Switching accounts on (for Ignas, about 10 minutes)

1. Go to https://supabase.com, choose **Start your project**, and sign in with GitHub.
2. **New project**: organisation = your own, name `iggyuoso`, make up a database password (you
   will not need it again; let it generate one), region = the one nearest you (e.g. Central EU),
   plan **Free**. Create it and wait a minute or two until it is ready.
3. Left menu **SQL Editor** → **New query**. Paste everything from
   [`docs/supabase.sql`](supabase.sql) and press **Run**. It should say "Success. No rows
   returned".
4. Left menu **Authentication** → **URL Configuration**:
   - **Site URL**: `https://ignpilv.github.io/iggyuoso/`
   - **Redirect URLs** → **Add URL**: `https://ignpilv.github.io/iggyuoso/**`
   - Save.
5. Left menu **Project Settings** → **API Keys** (on some projects: **API**). Copy two things:
   the **Project URL** (looks like `https://abcdefgh.supabase.co`; it is also under
   **Data API**) and the **anon public** key (a long `eyJ...` text; or the **publishable** key,
   `sb_publishable_...`, if that is what it shows). Both are safe to share; never copy the
   `service_role` or **secret** key.
6. Give them to the app, either way:
   - Paste both in a Claude thread and ask for accounts to be switched on, or
   - On GitHub: the repository → **Settings** → **Secrets and variables** → **Actions** →
     **Secrets** tab → **New repository secret**, twice (variables work too): `SUPABASE_URL` = the Project URL,
     `SUPABASE_ANON_KEY` = the key. Then **Actions** → **Deploy to GitHub Pages** → **Run
     workflow**.
7. Open the app → **Profile** → type your email → **Email me a sign-in link** → open the link
   from the email on that device. Do the same on every other device.

## Switching on Google sign-in (for Ignas, about 15 minutes)

Until this is done, "Continue with Google" ends on a Supabase page saying the provider is not
enabled; email links keep working.

**A. Google Cloud Console** (https://console.cloud.google.com, signed in with your Google account)

1. Top bar, the project picker → **New project**. Name `iggyuoso`, **Create**, then pick it in the
   project picker.
2. Left menu (☰) → **APIs & Services** → **OAuth consent screen** (newer consoles call it
   **Google Auth Platform** → **Branding**). Press **Get started** (or **Configure**):
   - App name `iggyuoso`, User support email = your Gmail. **Next**.
   - Audience: **External**. **Next**.
   - Contact information: your Gmail. **Next**, tick the policy box, **Create**.
3. **Data access** (older consoles: **Scopes** on the same screen) → **Add or remove scopes** →
   tick `.../auth/userinfo.email`, `.../auth/userinfo.profile` and `openid` → **Update** →
   **Save**. These need no review by Google.
4. **Audience** → **Publishing status** → **Publish app** → **Confirm**. (While it says
   "Testing", only Google accounts you add under **Test users** can sign in.)
5. **Clients** (older consoles: **Credentials** → **Create credentials** → **OAuth client ID**) →
   **Create client**:
   - Application type **Web application**, name `iggyuoso web`.
   - **Authorized JavaScript origins** → **Add URI**: `https://ignpilv.github.io`
   - **Authorized redirect URIs** → **Add URI**:
     `https://iczywvdbdejlgdskqjtw.supabase.co/auth/v1/callback`
   - **Create**. Copy the **Client ID** and the **Client secret** from the box that opens (the
     secret is shown in full only now; you can make a new one later).

**B. Supabase dashboard** (https://supabase.com/dashboard, project `iggyuoso`)

6. Left menu **Authentication** → **Sign In / Providers** (older: **Providers**) → **Google** →
   switch **Enable Sign in with Google** on, paste the **Client ID** and **Client Secret**
   (Secret) from step 5, leave the rest, **Save**. The Callback URL it shows should be the one
   you pasted in step 5.
7. **Authentication** → **URL Configuration**: check **Site URL** is
   `https://ignpilv.github.io/iggyuoso/` and **Redirect URLs** has
   `https://ignpilv.github.io/iggyuoso/**` (both were set for email links; add them if not).
   **Save**.

**C. Try it**: open https://ignpilv.github.io/iggyuoso/#/profile → **Continue with Google** →
pick your account → you land back on the Profile, signed in, with your progress synced. The
Client secret stays in Supabase only: never paste it in a thread or the repository.
