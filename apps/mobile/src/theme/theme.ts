import { Platform } from 'react-native';

export const colors = {
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primaryLight: '#EEF2FF',
  accent: '#F59E0B',
  accentLight: '#FEF3C7',
  accentDark: '#92400E',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  dangerDark: '#991B1B',
  success: '#059669',
  background: '#F7F7FB',
  surface: '#FFFFFF',
  border: '#E7E7F0',
  textPrimary: '#14142B',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const typography = {
  title: { fontSize: 26, fontWeight: '800' as const, color: colors.textPrimary },
  heading: { fontSize: 18, fontWeight: '700' as const, color: colors.textPrimary },
  subheading: { fontSize: 15, fontWeight: '700' as const, color: colors.textPrimary },
  body: { fontSize: 15, fontWeight: '400' as const, color: colors.textPrimary },
  caption: { fontSize: 13, fontWeight: '500' as const, color: colors.textSecondary },
  small: { fontSize: 12, fontWeight: '500' as const, color: colors.textMuted },
};

export const shadow = Platform.select({
  ios: {
    shadowColor: '#14142B',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  android: {
    elevation: 3,
  },
  default: {},
});

export const shadowSm = Platform.select({
  ios: {
    shadowColor: '#14142B',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  android: {
    elevation: 1.5,
  },
  default: {},
});
