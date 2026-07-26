import * as SecureStore from 'expo-secure-store';
import { DEFAULT_MATCH_THRESHOLD } from './faceMatch';

const MATCH_THRESHOLD_KEY = 'dogumgunu_match_threshold';

export async function getMatchThreshold(): Promise<number> {
  const stored = await SecureStore.getItemAsync(MATCH_THRESHOLD_KEY);
  const parsed = stored ? Number(stored) : NaN;
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 1 ? parsed : DEFAULT_MATCH_THRESHOLD;
}

export async function setMatchThreshold(threshold: number): Promise<void> {
  await SecureStore.setItemAsync(MATCH_THRESHOLD_KEY, String(threshold));
}
