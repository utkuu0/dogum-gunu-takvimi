/**
 * Android'de tarama bir foreground service içinde sürüyor; kullanıcı bu ekrandan
 * çıkıp girerse (ya da başka bir arkadaşın tarama ekranını açarsa) component
 * unmount/remount olabilir. Tarama durumunu bu yüzden component state'i değil,
 * friendId'ye göre modül seviyesinde bir store'da tutuyoruz — arka plandaki
 * döngü hep aynı store'u güncelliyor, ekran her mount olduğunda kaldığı yerden okuyor.
 */

export interface MatchItem {
  assetId: string;
  uri: string;
  thumbnailUri: string;
  similarity: number;
  source: 'device' | 'google-photos';
}

export type ScanState =
  | { phase: 'idle' }
  | { phase: 'scanning'; processed: number; total: number }
  | { phase: 'done'; processed: number; total: number; cancelled: boolean };

export type GooglePhotosState =
  | { phase: 'idle' }
  | { phase: 'connecting' }
  | { phase: 'waiting-for-selection' }
  | { phase: 'matching'; processed: number; total: number }
  | { phase: 'done' };

export interface ScanEntry {
  scanState: ScanState;
  matches: MatchItem[];
  error: string | null;
  googlePhotosState: GooglePhotosState;
}

const DEFAULT_ENTRY: ScanEntry = {
  scanState: { phase: 'idle' },
  matches: [],
  error: null,
  googlePhotosState: { phase: 'idle' },
};

const stores = new Map<string, ScanEntry>();
const listeners = new Map<string, Set<(entry: ScanEntry) => void>>();
const cancelFlags = new Map<string, boolean>();

export function getScanEntry(friendId: string): ScanEntry {
  return stores.get(friendId) ?? DEFAULT_ENTRY;
}

export function updateScanEntry(friendId: string, partial: Partial<ScanEntry>): void {
  const next = { ...getScanEntry(friendId), ...partial };
  stores.set(friendId, next);
  listeners.get(friendId)?.forEach((listener) => listener(next));
}

export function subscribeScanEntry(friendId: string, listener: (entry: ScanEntry) => void): () => void {
  if (!listeners.has(friendId)) {
    listeners.set(friendId, new Set());
  }
  listeners.get(friendId)!.add(listener);
  return () => listeners.get(friendId)?.delete(listener);
}

export function setCancelRequested(friendId: string, value: boolean): void {
  cancelFlags.set(friendId, value);
}

export function isCancelRequested(friendId: string): boolean {
  return cancelFlags.get(friendId) ?? false;
}
