import { Platform } from 'react-native';

const sharedColors = {
  primary: '#EC4899',
  primaryDark: '#DB2777',
  secondary: '#8B5CF6',
  secondaryDark: '#7C3AED',
  accent: '#F97316',
  yellow: '#FBBF24',
  danger: '#EF4444',
  success: '#10B981',
  white: '#FFFFFF',
};

export const lightColors = {
  ...sharedColors,
  primaryLight: '#FCE7F3',
  secondaryLight: '#EDE9FE',
  accentLight: '#FFEDD5',
  accentDark: '#9A3412',
  yellowLight: '#FEF3C7',
  dangerLight: '#FEE2E2',
  dangerDark: '#B91C1C',
  background: '#FFF7FB',
  surface: '#FFFFFF',
  border: '#FBCFE8',
  textPrimary: '#1F1035',
  textSecondary: '#6F6390',
  textMuted: '#A99CC4',
};

export type ThemeColors = typeof lightColors;

export const darkColors: ThemeColors = {
  ...sharedColors,
  primaryLight: '#4A1634',
  secondaryLight: '#2D2252',
  accentLight: '#4A2810',
  accentDark: '#FDBA74',
  yellowLight: '#453A12',
  dangerLight: '#4A1A1E',
  dangerDark: '#FCA5A5',
  background: '#0F0A1A',
  surface: '#1C1430',
  border: '#3B2D5C',
  textPrimary: '#F6F0FF',
  textSecondary: '#B9ADD3',
  textMuted: '#7F7299',
};

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

function makeTypography(colors: ThemeColors) {
  return {
    title: { fontSize: 28, fontWeight: '900' as const, color: colors.textPrimary },
    heading: { fontSize: 19, fontWeight: '800' as const, color: colors.textPrimary },
    subheading: { fontSize: 15, fontWeight: '800' as const, color: colors.textPrimary },
    body: { fontSize: 15, fontWeight: '500' as const, color: colors.textPrimary },
    caption: { fontSize: 13, fontWeight: '600' as const, color: colors.textSecondary },
    small: { fontSize: 12, fontWeight: '700' as const, color: colors.textMuted },
  };
}

function makeShadows(isDark: boolean) {
  const shadow = Platform.select({
    ios: {
      shadowColor: isDark ? '#000000' : '#DB2777',
      shadowOpacity: isDark ? 0.5 : 0.22,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: isDark ? 4 : 6 },
    default: {},
  });

  const shadowSm = Platform.select({
    ios: {
      shadowColor: isDark ? '#000000' : '#7C3AED',
      shadowOpacity: isDark ? 0.4 : 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: isDark ? 2 : 2.5 },
    default: {},
  });

  return { shadow: shadow ?? {}, shadowSm: shadowSm ?? {} };
}

export function createTheme(isDark: boolean) {
  const colors = isDark ? darkColors : lightColors;
  return {
    isDark,
    colors,
    typography: makeTypography(colors),
    ...makeShadows(isDark),
  };
}

export type Theme = ReturnType<typeof createTheme>;
