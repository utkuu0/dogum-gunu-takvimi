import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createTheme, lightColors, type Theme } from './theme';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'theme-mode';

interface ThemeContextValue extends Theme {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const lightTheme = createTheme(false);
const darkTheme = createTheme(true);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'dark' || stored === 'light') setModeState(stored);
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ ...(mode === 'dark' ? darkTheme : lightTheme), mode, setMode, toggleMode }),
    [mode, setMode, toggleMode]
  );

  // Kayıtlı tercih okunana kadar bekle, açılışta açık→koyu yanıp sönmesin.
  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: lightColors.background }} />;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme, ThemeProvider içinde kullanılmalı.');
  return ctx;
}
