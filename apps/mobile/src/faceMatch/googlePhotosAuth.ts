import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { apiClient } from '../api/client';

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

const REDIRECT_URI = AuthSession.makeRedirectUri({ scheme: 'dogumgunu', path: 'google-photos-redirect' });

export class GooglePhotosAuthCancelledError extends Error {
  constructor() {
    super('Google Photos yetkilendirmesi iptal edildi.');
    this.name = 'GooglePhotosAuthCancelledError';
  }
}

/**
 * Not: Google Photos Picker API'nin dokümante edilmiş "photospicker.mediaitems.readonly"
 * scope'una göre yazıldı, gerçek Google kimlik bilgileriyle canlı test edilemedi.
 * GCP kurulumu yapılıp ilk denemede sorun çıkarsa Google'ın güncel dokümantasyonuyla
 * karşılaştırılması gerekir (bkz. README'deki "Google Photos" bölümü).
 */
export async function connectGooglePhotos(): Promise<void> {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const clientId =
    platform === 'ios'
      ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
      : process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

  if (!clientId) {
    throw new Error(
      `EXPO_PUBLIC_GOOGLE_${platform.toUpperCase()}_CLIENT_ID tanımlı değil (.env'e bak).`
    );
  }

  const request = new AuthSession.AuthRequest({
    clientId,
    scopes: ['https://www.googleapis.com/auth/photospicker.mediaitems.readonly'],
    redirectUri: REDIRECT_URI,
    usePKCE: true,
    extraParams: { access_type: 'offline', prompt: 'consent' },
  });

  const result = await request.promptAsync(GOOGLE_DISCOVERY);

  if (result.type !== 'success' || !result.params.code) {
    throw new GooglePhotosAuthCancelledError();
  }

  if (!request.codeVerifier) {
    throw new Error('PKCE code verifier üretilemedi.');
  }

  await apiClient.post('/photos/authorize', {
    code: result.params.code,
    codeVerifier: request.codeVerifier,
    platform,
  });
}

export async function isGooglePhotosConnected(): Promise<boolean> {
  const { data } = await apiClient.get<{ authorized: boolean }>('/photos/authorized');
  return data.authorized;
}
