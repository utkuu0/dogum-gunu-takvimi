import { Platform } from 'react-native';

export const colors = {
  primary: '#EC4899',
  primaryDark: '#DB2777',
  primaryLight: '#FCE7F3',
  secondary: '#8B5CF6',
  secondaryDark: '#7C3AED',
  secondaryLight: '#EDE9FE',
  accent: '#F97316',
  accentLight: '#FFEDD5',
  accentDark: '#9A3412',
  yellow: '#FBBF24',
  yellowLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  dangerDark: '#B91C1C',
  success: '#10B981',
  background: '#FFF7FB',
  surface: '#FFFFFF',
  border: '#FBCFE8',
  textPrimary: '#1F1035',
  textSecondary: '#8478A0',
  textMuted: '#C3B4DA',
  white: '#FFFFFF',
} as const;

export const confettiPalette = [colors.primary, colors.secondary, colors.accent, colors.yellow] as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  full: 999,
} as const;

export const typography = {
  title: { fontSize: 28, fontWeight: '900' as const, color: colors.textPrimary },
  heading: { fontSize: 19, fontWeight: '800' as const, color: colors.textPrimary },
  subheading: { fontSize: 15, fontWeight: '800' as const, color: colors.textPrimary },
  body: { fontSize: 15, fontWeight: '500' as const, color: colors.textPrimary },
  caption: { fontSize: 13, fontWeight: '600' as const, color: colors.textSecondary },
  small: { fontSize: 12, fontWeight: '700' as const, color: colors.textMuted },
};

export const shadow = Platform.select({
  ios: {
    shadowColor: '#DB2777',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  android: {
    elevation: 6,
  },
  default: {},
});

export const shadowSm = Platform.select({
  ios: {
    shadowColor: '#7C3AED',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  android: {
    elevation: 2.5,
  },
  default: {},
});
