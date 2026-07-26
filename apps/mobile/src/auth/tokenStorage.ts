import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'dogumgunu_access_token';
const REFRESH_TOKEN_KEY = 'dogumgunu_refresh_token';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setTokens({ accessToken, refreshToken }: TokenPair) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
  ]);
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}
