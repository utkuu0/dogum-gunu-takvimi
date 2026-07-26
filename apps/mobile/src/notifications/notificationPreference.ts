import * as SecureStore from 'expo-secure-store';

const ENABLED_KEY = 'dogumgunu_notifications_enabled';
const PROMPT_SHOWN_KEY = 'dogumgunu_notification_prompt_shown';

/** Kullanıcı ayarlardan kapatana kadar varsayılan açık sayılır (izin verildiyse). */
export async function areNotificationsEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(ENABLED_KEY);
  return value !== 'false';
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(ENABLED_KEY, enabled ? 'true' : 'false');
}

/** İlk arkadaş eklendikten sonraki izin diyalogunun sadece bir kez gösterilmesi için. */
export async function hasShownNotificationPrompt(): Promise<boolean> {
  return (await SecureStore.getItemAsync(PROMPT_SHOWN_KEY)) === 'true';
}

export async function markNotificationPromptShown(): Promise<void> {
  await SecureStore.setItemAsync(PROMPT_SHOWN_KEY, 'true');
}
