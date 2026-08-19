import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing } from '../theme/theme';

interface NotificationBannerProps {
  title: string;
  body: string;
  onPress: () => void;
  onDismiss: () => void;
}

export function NotificationBanner({ title, body, onPress, onDismiss }: NotificationBannerProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <SafeAreaView style={styles.container} pointerEvents="box-none">
      <Pressable style={styles.banner} onPress={onPress}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>🎂</Text>
        </View>
        <View style={styles.textGroup}>
          <Text style={styles.title}>{title}</Text>
          {body ? <Text style={styles.body}>{body}</Text> : null}
        </View>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.secondaryDark,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.accent,
    ...shadow,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
  textGroup: {
    flex: 1,
  },
  title: {
    color: colors.white,
    fontWeight: '800',
  },
  body: {
    color: '#EDE9FE',
    marginTop: 2,
    fontSize: 13,
  },
});
