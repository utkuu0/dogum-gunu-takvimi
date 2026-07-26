import { File, Paths } from 'expo-file-system';
import { apiClient } from '../api/client';

export interface PickerSession {
  id: string;
  pickerUri: string;
  mediaItemsSet: boolean;
  pollingConfig?: { pollInterval?: string; timeoutIn?: string };
}

export interface PickedMediaItem {
  id: string;
  createTime: string;
  baseUrl: string;
  mimeType: string;
}

export async function createPickerSession(): Promise<PickerSession> {
  const { data } = await apiClient.post<PickerSession>('/photos/sessions');
  return data;
}

export async function getPickerSession(sessionId: string): Promise<PickerSession> {
  const { data } = await apiClient.get<PickerSession>(`/photos/sessions/${sessionId}`);
  return data;
}

export async function listPickedItems(sessionId: string): Promise<PickedMediaItem[]> {
  const { data } = await apiClient.get<PickedMediaItem[]>(`/photos/sessions/${sessionId}/items`);
  return data;
}

export async function getDownloadToken(): Promise<string> {
  const { data } = await apiClient.get<{ accessToken: string }>('/photos/download-token');
  return data.accessToken;
}

/**
 * Google'ın Picker API dokümantasyonu pollingConfig.pollInterval'ı protobuf Duration
 * string'i olarak döner (örn. "5s"); parseFloat baştaki sayıyı alıp "s" harfinde durur.
 */
function pollIntervalMs(session: PickerSession): number {
  const parsed = session.pollingConfig?.pollInterval ? parseFloat(session.pollingConfig.pollInterval) : NaN;
  return Number.isFinite(parsed) ? parsed * 1000 : 2000;
}

/** Kullanıcı Google'ın picker arayüzünde seçimini tamamlayana kadar session'ı periyodik olarak sorgular. */
export async function waitForSelection(
  session: PickerSession,
  shouldStop: () => boolean
): Promise<PickerSession> {
  let current = session;
  while (!current.mediaItemsSet) {
    if (shouldStop()) return current;
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs(current)));
    current = await getPickerSession(current.id);
  }
  return current;
}

/** Picker API baseUrl'i doğrudan erişilebilir değil, Authorization header + boyut parametresi gerekiyor. */
export async function downloadPickedItem(item: PickedMediaItem, accessToken: string): Promise<string> {
  const destination = new File(Paths.cache, `gphotos-${item.id}.jpg`);
  const file = await File.downloadFileAsync(`${item.baseUrl}=w512`, destination, {
    headers: { Authorization: `Bearer ${accessToken}` },
    idempotent: true,
  });
  return file.uri;
}
