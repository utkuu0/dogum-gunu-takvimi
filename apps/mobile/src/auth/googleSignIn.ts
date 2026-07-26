import { GoogleSignin } from '@react-native-google-signin/google-signin';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
  configured = true;
}

export class GoogleSignInCancelledError extends Error {
  constructor() {
    super('Google ile giriş iptal edildi.');
    this.name = 'GoogleSignInCancelledError';
  }
}

/** Google Sign-In akışını başlatır, başarılı olursa backend'e gönderilecek idToken'ı döner. */
export async function signInWithGoogle(): Promise<string> {
  ensureConfigured();

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();

  if (response.type === 'cancelled') {
    throw new GoogleSignInCancelledError();
  }

  const idToken = response.data.idToken;
  if (!idToken) {
    throw new Error('Google idToken alınamadı.');
  }
  return idToken;
}

export async function signOutGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Zaten çıkış yapılmışsa sessizce geç.
  }
}
