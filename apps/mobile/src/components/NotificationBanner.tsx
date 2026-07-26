import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
        <Text style={styles.title}>{title}</Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}
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
    marginHorizontal: 12,
    marginTop: 8,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 14,
  },
  title: {
    color: '#fff',
    fontWeight: '700',
  },
  body: {
    color: '#e5e7eb',
    marginTop: 2,
    fontSize: 13,
  },
});
