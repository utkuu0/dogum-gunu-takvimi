import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function colorAt(colors: string[], t: number): string {
  const stops = colors.length - 1;
  const scaled = t * stops;
  const index = Math.min(Math.floor(scaled), stops - 1);
  const localT = scaled - index;
  const [r1, g1, b1] = hexToRgb(colors[index]);
  const [r2, g2, b2] = hexToRgb(colors[index + 1]);
  return `rgb(${lerp(r1, r2, localT)}, ${lerp(g1, g2, localT)}, ${lerp(b1, b2, localT)})`;
}

interface GradientViewProps {
  colors: string[];
  direction?: 'horizontal' | 'vertical';
  steps?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/**
 * Native modül gerektirmeyen gradyan View'ı. Çubukları arka planda mutlak
 * konumlandırıp `children`'ı normal akışta üstüne bindirir, böylece dıştaki
 * `style` (padding/alignItems/borderRadius vb.) her zamanki gibi davranır.
 */
export function GradientView({ colors, direction = 'horizontal', steps = 20, style, children }: GradientViewProps) {
  const bars = Array.from({ length: steps }, (_, i) => colorAt(colors, i / (steps - 1)));

  return (
    <View style={[styles.wrapper, style]}>
      <View
        style={[
          styles.fill,
          direction === 'horizontal' ? styles.row : styles.column,
        ]}
      >
        {bars.map((color, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: color }} />
        ))}
      </View>
      {children}
    </View>
  );
}

const styles = {
  wrapper: { overflow: 'hidden' as const },
  fill: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 },
  row: { flexDirection: 'row' as const },
  column: { flexDirection: 'column' as const },
};
