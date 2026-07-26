import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../src/auth/AuthContext';
import { GoogleSignInCancelledError } from '../../src/auth/googleSignIn';

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  async function handleSignIn() {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      if (!(err instanceof GoogleSignInCancelledError)) {
        Alert.alert('Giriş yapılamadı', err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.');
      }
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Doğum Günü Takvimi</Text>
      <Text style={styles.subtitle}>Arkadaşlarının doğum günlerini kaçırma.</Text>

      <Pressable style={styles.button} onPress={handleSignIn} disabled={signingIn}>
        {signingIn ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Google ile Giriş Yap</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    minWidth: 220,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
