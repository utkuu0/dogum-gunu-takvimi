import { Image, StyleSheet, Text, View } from 'react-native';

const PALETTE = ['#2563eb', '#7c3aed', '#db2777', '#059669', '#d97706', '#dc2626'];

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
}

export function Avatar({ name, photoUrl, size = 48 }: AvatarProps) {
  const dimensionStyle = { width: size, height: size, borderRadius: size / 2 };

  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={[styles.image, dimensionStyle]} />;
  }

  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <View style={[styles.fallback, dimensionStyle, { backgroundColor: colorForName(name) }]}>
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#eee',
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
