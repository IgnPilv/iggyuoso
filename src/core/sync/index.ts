import { deviceData, memoryBackend, SCHEMA_VERSION } from '../storage';
import { upgradeAll } from '../records';
import { Account } from './account';
import { SYNC_CONFIG, syncConfigured } from './config';
import { memoryProvider } from './memory';
import { supabaseProvider } from './supabase';
import { tracked } from './tracker';

/** The player on this device, one account for every module: a guest, or signed in once the account server is set up. */
export const account = new Account(deviceData, syncConfigured() ? supabaseProvider(SYNC_CONFIG) : null, {
  schema: SCHEMA_VERSION,
  upgradeFrom: upgradeAll,
  // Sign-in comes back to the app's own address: a link with the session in the hash, Google
  // with `?code=` in the query (both must be allowed under the server's Redirect URLs).
  redirectTo: () => `${location.origin}${location.pathname}`,
});

/** A guest account on throwaway data with a pretend server, for the demo. */
export function demoAccount(go: (url: string) => void = () => {}) {
  const server = memoryProvider();
  const data = tracked(memoryBackend());
  return { server, data, account: new Account(data, server, { schema: SCHEMA_VERSION, upgradeFrom: () => {}, redirectTo: () => '', go }) };
}

/** Whether a page address is a sign-in link coming back. */
export const isSignInReturn = (hash: string) => /(^|[#&])(access_token|error_description|error)=/.test(hash);

/** Whether a page's query is Google sign-in coming back (`?code=` or `?error=`). */
export const isOAuthReturn = (search: string) => /(^\?|&)(code|error)=/.test(search);
