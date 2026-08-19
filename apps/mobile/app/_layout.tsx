import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { queryClient } from '../src/api/queryClient';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { NotificationBanner } from '../src/components/NotificationBanner';
import { colors } from '../src/theme/theme';
import {
  subscribeToForegroundMessages,
  subscribeToNotificationOpened,
  subscribeToTokenRefresh,
  type ForegroundMessage,
} from '../src/notifications/pushNotifications';

function RootNavigation() {
  const { isLoading, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [banner, setBanner] = useState<ForegroundMessage | null>(null);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isLoading, isAuthenticated, segments, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribeOpened = subscribeToNotificationOpened((friendId) => {
      router.push({ pathname: '/friend/[id]', params: { id: friendId } });
    });
    const unsubscribeRefresh = subscribeToTokenRefresh();
    const unsubscribeForeground = subscribeToForegroundMessages(setBanner);

    return () => {
      unsubscribeOpened();
      unsubscribeRefresh();
      unsubscribeForeground();
    };
  }, [isAuthenticated, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="friend/[id]/index"
          options={{ headerShown: true, title: 'Arkadaş Detayı', presentation: 'card' }}
        />
        <Stack.Screen
          name="friend/[id]/scan"
          options={{ headerShown: true, title: 'Galeride Bul', presentation: 'card' }}
        />
        <Stack.Screen
          name="friend/new"
          options={{ headerShown: true, title: 'Arkadaş Ekle', presentation: 'modal' }}
        />
      </Stack>

      {banner && (
        <NotificationBanner
          title={banner.title}
          body={banner.body}
          onDismiss={() => setBanner(null)}
          onPress={() => {
            if (banner.friendId) {
              router.push({ pathname: '/friend/[id]', params: { id: banner.friendId } });
            }
            setBanner(null);
          }}
        />
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="auto" />
          <RootNavigation />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
