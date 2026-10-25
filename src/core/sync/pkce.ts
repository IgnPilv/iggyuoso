// PKCE (proof key for code exchange) for signing in with Google without a server of our own:
// before leaving for Google the device keeps a random verifier and sends only its SHA-256 hash
// (the challenge); the code that comes back is worth nothing without the verifier.

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** A random verifier: 64 characters of base64url. */
export function makeVerifier(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(48)));
}

/** The challenge for a verifier: base64url of its SHA-256 (method S256). */
export async function challengeOf(verifier: string): Promise<string> {
  return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
}
