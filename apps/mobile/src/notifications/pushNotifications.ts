import { PermissionsAndroid, Platform } from 'react-native';
import { getApp } from '@react-native-firebase/app';
import {
  AuthorizationStatus,
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  requestPermission,
} from '@react-native-firebase/messaging';
import { apiClient } from '../api/client';
import { areNotificationsEnabled, setNotificationsEnabled } from './notificationPreference';

const messagingInstance = () => getMessaging(getApp());

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const androidResult = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    if (androidResult !== PermissionsAndroid.RESULTS.GRANTED) return false;
  }

  const authStatus = await requestPermission(messagingInstance());
  return authStatus === AuthorizationStatus.AUTHORIZED || authStatus === AuthorizationStatus.PROVISIONAL;
}

/** Cihaz zaman dilimini de gönderir — bildirim zamanlaması (Adım 5) bunu kullanıyor. */
export async function registerFcmToken(): Promise<void> {
  const token = await getToken(messagingInstance());
  await apiClient.patch('/users/me/fcm-token', {
    fcmToken: token,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  await setNotificationsEnabled(true);
}

export async function unregisterFcmToken(): Promise<void> {
  await apiClient.patch('/users/me/fcm-token', { fcmToken: null });
  await setNotificationsEnabled(false);
}

/**
 * Kullanıcı ayarlardan bildirimleri kapattıysa token yenilendiğinde sessizce
 * tekrar backend'e kaydedip bildirimleri "geri açmamalı" — bu yüzden her
 * yenilemede tercihi kontrol ediyoruz.
 */
export function subscribeToTokenRefresh(): () => void {
  return onTokenRefresh(messagingInstance(), (token) => {
    areNotificationsEnabled().then((enabled) => {
      if (!enabled) return;
      apiClient.patch('/users/me/fcm-token', { fcmToken: token }).catch(() => {});
    });
  });
}

function extractFriendId(data: Record<string, string | number | object> | undefined): string | undefined {
  const value = data?.friendId;
  return typeof value === 'string' ? value : undefined;
}

/** Bildirime tıklanıp uygulama açıldığında (arkaplandan ya da kapalıyken) çağrılır. */
export function subscribeToNotificationOpened(onTap: (friendId: string) => void): () => void {
  const unsubscribe = onNotificationOpenedApp(messagingInstance(), (remoteMessage) => {
    const friendId = extractFriendId(remoteMessage.data);
    if (friendId) onTap(friendId);
  });

  getInitialNotification(messagingInstance()).then((remoteMessage) => {
    const friendId = extractFriendId(remoteMessage?.data);
    if (friendId) onTap(friendId);
  });

  return unsubscribe;
}

export interface ForegroundMessage {
  title: string;
  body: string;
  friendId?: string;
}

/** Uygulama ön plandayken gelen bildirim sistem bildirimi olarak göstermiyor, bu yüzden in-app banner gerekiyor. */
export function subscribeToForegroundMessages(
  onMessageReceived: (message: ForegroundMessage) => void
): () => void {
  return onMessage(messagingInstance(), (remoteMessage) => {
    onMessageReceived({
      title: remoteMessage.notification?.title ?? '',
      body: remoteMessage.notification?.body ?? '',
      friendId: extractFriendId(remoteMessage.data),
    });
  });
}
