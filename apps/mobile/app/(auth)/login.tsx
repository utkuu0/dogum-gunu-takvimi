import { useState, useMemo } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/auth/AuthContext';
import { GoogleSignInCancelledError } from '../../src/auth/googleSignIn';
import { GradientView } from '../../src/theme/GradientView';
import { radius, spacing, type Theme } from '../../src/theme/theme';
import { useTheme } from '../../src/theme/ThemeContext';

const CONFETTI: {
  emoji: string;
  top: string;
  left?: string;
  right?: string;
  size: number;
  rotate: string;
}[] = [
  { emoji: '🎉', top: '8%', left: '10%', size: 30, rotate: '-15deg' },
  { emoji: '🎈', top: '14%', right: '12%', size: 34, rotate: '10deg' },
  { emoji: '✨', top: '26%', left: '6%', size: 22, rotate: '5deg' },
  { emoji: '🎊', top: '4%', right: '30%', size: 24, rotate: '-8deg' },
  { emoji: '🎁', top: '70%', right: '8%', size: 28, rotate: '12deg' },
  { emoji: '🥳', top: '76%', left: '8%', size: 30, rotate: '-10deg' },
];

export default function LoginScreen() {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { signInWithGoogle } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  async function handleSignIn() {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      if (!(err instanceof GoogleSignInCancelledError)) {
        Alert.alert(
          'Giriş yapılamadı',
          err instanceof Error ? err.message : 'Bilinmeyen bir hata oluştu.'
        );
      }
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <GradientView
        colors={[colors.primaryLight, colors.accentLight]}
        direction="vertical"
        style={styles.blobPink}
      />
      <GradientView
        colors={[colors.secondaryLight, colors.primaryLight]}
        direction="vertical"
        style={styles.blobPurple}
      />
      <GradientView
        colors={[colors.yellowLight, colors.accentLight]}
        direction="vertical"
        style={styles.blobYellow}
      />

      {CONFETTI.map((item, index) => (
        <Text
          key={index}
          style={[
            styles.confetti,
            {
              top: item.top as any,
              left: item.left as any,
              right: item.right as any,
              fontSize: item.size,
              transform: [{ rotate: item.rotate }],
            },
          ]}
        >
          {item.emoji}
        </Text>
      ))}

      <View style={styles.content}>
        <GradientView
          colors={[colors.accent, colors.primary, colors.secondary]}
          style={styles.logoRing}
        >
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🎂</Text>
          </View>
        </GradientView>

        <Text style={styles.title}>Doğum Günü{'\n'}Takvimi</Text>
        <Text style={styles.subtitle}>Arkadaşlarının doğum günlerini{'\n'}asla kaçırma.</Text>

        <Pressable style={styles.buttonShadowWrap} onPress={handleSignIn} disabled={signingIn}>
          <View style={styles.button}>
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
          </View>
        </Pressable>

        <Text style={styles.footnote}>Giriş yaparak partiyi kaçırmayacaksın.</Text>
      </View>
    </SafeAreaView>
  );
}

const createStyles = ({ colors, typography, shadow }: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      overflow: 'hidden',
    },
    blobPink: {
      position: 'absolute',
      top: -100,
      right: -90,
      width: 240,
      height: 240,
      borderRadius: radius.full,
      backgroundColor: colors.primaryLight,
    },
    blobPurple: {
      position: 'absolute',
      bottom: -160,
      left: -110,
      width: 300,
      height: 300,
      borderRadius: radius.full,
      backgroundColor: colors.secondaryLight,
    },
    blobYellow: {
      position: 'absolute',
      bottom: 60,
      right: -60,
      width: 140,
      height: 140,
      borderRadius: radius.full,
      backgroundColor: colors.yellowLight,
    },
    confetti: {
      position: 'absolute',
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    logoRing: {
      width: 116,
      height: 116,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xl,
      ...shadow,
    },
    logoCircle: {
      width: 96,
      height: 96,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoEmoji: {
      fontSize: 46,
    },
    title: {
      ...typography.title,
      fontSize: 32,
      textAlign: 'center',
      lineHeight: 38,
    },
    subtitle: {
      ...typography.body,
      color: colors.textSecondary,
      marginTop: spacing.md,
      marginBottom: spacing.xxl,
      textAlign: 'center',
      lineHeight: 21,
    },
    buttonShadowWrap: {
      borderRadius: radius.full,
      ...shadow,
    },
    button: {
      backgroundColor: colors.primary,
      flexDirection: 'row',
      paddingVertical: 17,
      paddingHorizontal: spacing.xl,
      borderRadius: radius.full,
      minWidth: 270,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    googleBadge: {
      width: 24,
      height: 24,
      borderRadius: radius.full,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    googleBadgeText: {
      color: colors.primary,
      fontWeight: '900',
      fontSize: 14,
    },
    buttonText: {
      color: colors.white,
      fontWeight: '800',
      fontSize: 16,
    },
    footnote: {
      ...typography.small,
      marginTop: spacing.xl,
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
    },
  });
