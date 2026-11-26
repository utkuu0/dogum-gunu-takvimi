import { Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const PALETTE = ['#EC4899', '#8B5CF6', '#F97316', '#10B981', '#FBBF24', '#3B82F6'];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: number;
  ring?: boolean;
}

export function Avatar({ name, photoUrl, size = 48, ring = false }: AvatarProps) {
  const { colors } = useTheme();
  const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };
  const ringStyle = ring
    ? { borderWidth: Math.max(2, size * 0.05), borderColor: colors.accent }
    : null;

  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={[styles.image, dimensionStyle, ringStyle]} />;
  }

  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <View
      style={[styles.fallback, dimensionStyle, ringStyle, { backgroundColor: colorForName(name) }]}
    >
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#C9BEDC',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#fff',
    fontWeight: '700',
  },
});
