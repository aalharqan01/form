import { Platform } from 'react-native';

// Where the app talks to and which account it expects.
// - Local development: scripts/dev-roles.mjs serves fixture identities on
//   separate ports; the phones preview picks one with ?role=.
// - Hosted (the deployed website serves the app under /app): the API is the
//   same origin and Cloudflare Access supplies the identity, so no fixed key.
// - Native builds still use the coached fixture until real sign-in exists.
const accounts = {
  client: { userKey: 'local-form-client', origin: 'http://127.0.0.1:3101' },
  solo: { userKey: 'local-form-solo', origin: 'http://127.0.0.1:3103' },
} as const;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
export const HOSTED =
  Platform.OS === 'web' &&
  typeof location !== 'undefined' &&
  !LOCAL_HOSTS.has(location.hostname);
function pick(): { userKey: string; origin: string } {
  if (HOSTED) return { userKey: '', origin: '' };
  if (Platform.OS === 'web' && typeof location !== 'undefined') {
    const role = new URLSearchParams(location.search).get('role');
    if (role && role in accounts)
      return accounts[role as keyof typeof accounts];
  }
  return accounts.client;
}
export const account = pick();
export const API_ORIGIN = account.origin;
/** Fixture account key, or '' when the server decides who is signed in. */
export const USER_KEY = account.userKey;
