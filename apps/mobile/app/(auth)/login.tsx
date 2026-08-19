import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/auth/AuthContext';
import { GoogleSignInCancelledError } from '../../src/auth/googleSignIn';
import { colors, radius, shadow, spacing, typography } from '../../src/theme/theme';

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
    <SafeAreaView style={styles.container}>
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />

      <View style={styles.content}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🎂</Text>
        </View>

        <Text style={styles.title}>Doğum Günü Takvimi</Text>
        <Text style={styles.subtitle}>Arkadaşlarının doğum günlerini kaçırma.</Text>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={handleSignIn}
          disabled={signingIn}
        >
          {signingIn ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <View style={styles.googleBadge}>
                <Text style={styles.googleBadgeText}>G</Text>
              </View>
              <Text style={styles.buttonText}>Google ile Giriş Yap</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.footnote}>Giriş yaparak arkadaşlarını ekleyip doğum günü hatırlatmaları alabilirsin.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  blobTop: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
  },
  blobBottom: {
    position: 'absolute',
    bottom: -140,
    left: -100,
    width: 280,
    height: 280,
    borderRadius: radius.full,
    backgroundColor: colors.accentLight,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    ...shadow,
  },
  logoEmoji: {
    fontSize: 44,
  },
  title: {
    ...typography.title,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.full,
    minWidth: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    ...shadow,
  },
  buttonPressed: {
    backgroundColor: colors.primaryDark,
  },
  googleBadge: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBadgeText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  buttonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  footnote: {
    ...typography.small,
    marginTop: spacing.xl,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
