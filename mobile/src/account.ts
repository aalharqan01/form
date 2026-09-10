import { Platform } from 'react-native';

// Local development identities served by scripts/dev-roles.mjs. On web the
// preview page picks the account with ?role=; native builds use the coached
// client until real sign-in exists.
const accounts = {
  client: { userKey: 'local-form-client', origin: 'http://127.0.0.1:3101' },
  solo: { userKey: 'local-form-solo', origin: 'http://127.0.0.1:3103' },
} as const;
function pick(): (typeof accounts)[keyof typeof accounts] {
  if (Platform.OS === 'web' && typeof location !== 'undefined') {
    const role = new URLSearchParams(location.search).get('role');
    if (role && role in accounts) return accounts[role as keyof typeof accounts];
  }
  return accounts.client;
}
export const account = pick();
export const API_ORIGIN = account.origin;
export const USER_KEY = account.userKey;
