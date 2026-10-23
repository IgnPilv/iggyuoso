// Accounts and sync across devices. Progress always lives on the device (see progress/store.ts);
// a signed-in account copies it to a server and back. The server sits behind SyncProvider, so
// the backend can change without touching the store or the screens.

/** A signed-in account on this device. Saved locally as `iggyuoso.account`, never synced. */
export interface AccountSession {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  /** When the access token runs out, ms since 1970. */
  expiresAt: number;
}

/** One saved record on the server: a store key (without the `iggyuoso.` prefix) and its value. */
export interface RemoteRow {
  key: string;
  /** The parsed JSON value; null when the record was cleared. */
  value: unknown;
  /** Store schema version (SCHEMA_VERSION) of the app that saved it. */
  schema: number;
  /** Server time of the last change (ISO). */
  updatedAt: string;
}

export type OutRow = Omit<RemoteRow, 'updatedAt'>;

export interface SyncProvider {
  /** Shown in Settings and the profile, e.g. "Supabase". */
  readonly name: string;
  /** Email a sign-in link that comes back to `redirectTo`. */
  sendSignInLink(email: string, redirectTo: string): Promise<void>;
  /**
   * Finish signing in from the link's return address (its `#...` part). Null when the hash is not
   * a sign-in; throws with a message to show when the link failed (expired, used twice).
   */
  completeSignIn(hash: string): Promise<AccountSession | null>;
  /** A fresh access token for a session whose token ran out. */
  refresh(s: AccountSession): Promise<AccountSession>;
  /** Every row of the account changed after `since` (server time), or all rows without it. */
  pull(s: AccountSession, since?: string): Promise<RemoteRow[]>;
  /** Save rows (insert or replace by key). */
  push(s: AccountSession, rows: OutRow[]): Promise<void>;
  /** End the session on the server (best effort). */
  signOut(s: AccountSession): Promise<void>;
}

/** Thrown by a provider when the session is no longer valid and the player must sign in again. */
export class SignedOutError extends Error {}
