// Where the account server is. Empty until the backend project exists: the app then runs as a
// guest only and says accounts are coming. Set at build time from the repository variables
// SUPABASE_URL and SUPABASE_ANON_KEY (see .github/workflows/pages.yml and docs/accounts.md).
// The anon key is public by design: row-level security on the server keeps each account's rows
// to itself.

export const SYNC_CONFIG = {
  url: (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/\/+$/, '') ?? '',
  anonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '',
};

export const syncConfigured = () => !!(SYNC_CONFIG.url && SYNC_CONFIG.anonKey);
