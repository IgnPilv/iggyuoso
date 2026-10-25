import { PREVIEW } from '../preview';

// Where the account server is. Empty until the backend project exists: the app then runs as a
// guest only and says accounts are coming. Set at build time from the repository secrets (or
// variables) SUPABASE_URL and SUPABASE_ANON_KEY (see .github/workflows/pages.yml and
// docs/accounts.md), so the values stay out of the repository's files.
// The anon key is public by design: row-level security on the server keeps each account's rows
// to itself.

const env = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export const SYNC_CONFIG = {
  url: env(import.meta.env.VITE_SUPABASE_URL).replace(/\/+$/, ''),
  anonKey: env(import.meta.env.VITE_SUPABASE_ANON_KEY),
};

// A preview build (src/core/preview.ts) is guest only, so trying an idea never touches the account.
export const syncConfigured = () => !PREVIEW && !!(SYNC_CONFIG.url && SYNC_CONFIG.anonKey);
