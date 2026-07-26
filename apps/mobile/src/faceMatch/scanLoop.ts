import { PermissionsAndroid, Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { cosineSimilarity } from '@dogum-gunu/shared';
import { getCachedScan, setCachedScan } from './db';
import { createThumbnail, getAllFaceEmbeddings } from './faceMatch';
import { downloadPickedItem, type PickedMediaItem } from './googlePhotosPicker';
import type { MatchItem } from './scanStore';

export interface RunScanLoopParams {
  referenceEmbedding: number[];
  metadata: MediaLibrary.AssetMetadata[];
  threshold: number;
  shouldStop: () => boolean;
  onProgress: (processed: number, total: number) => void;
  onMatches: (matches: MatchItem[]) => void;
}

export async function runScanLoop({
  referenceEmbedding,
  metadata,
  threshold,
  shouldStop,
  onProgress,
  onMatches,
}: RunScanLoopParams): Promise<{ processed: number; cancelled: boolean }> {
  const found: MatchItem[] = [];
  let processed = 0;

  for (let i = 0; i < metadata.length; i++) {
    if (shouldStop()) break;

    const assetId = metadata[i].id;

    try {
      let embeddings: number[][];
      const cached = await getCachedScan(assetId);

      if (cached) {
        embeddings = cached.embeddings;
      } else {
        const asset = new MediaLibrary.Asset(assetId);
        const uri = await asset.getUri();
        embeddings = await getAllFaceEmbeddings(uri);
        await setCachedScan(assetId, { faceCount: embeddings.length, embeddings });
      }

      const bestSimilarity = embeddings.reduce(
        (best, embedding) => Math.max(best, cosineSimilarity(referenceEmbedding, embedding)),
        -1
      );

      if (bestSimilarity >= threshold) {
        const asset = new MediaLibrary.Asset(assetId);
        const uri = await asset.getUri();
        let thumbnailUri = uri;
        try {
          thumbnailUri = await createThumbnail(uri);
        } catch {
          // Thumbnail üretilemezse orijinal görseli kullan (yavaş ama çalışır).
        }
        found.push({ assetId, uri, thumbnailUri, similarity: bestSimilarity, source: 'device' });
        onMatches([...found].sort((a, b) => b.similarity - a.similarity));
      }
    } catch {
      // Bozuk/okunamayan tek bir fotoğraf taramanın tamamını durdurmasın.
    }

    processed = i + 1;
    onProgress(processed, metadata.length);
  }

  return { processed, cancelled: shouldStop() };
}

/**
 * Kullanıcının Google Photos picker'da seçtiği (küçük, ad-hoc) fotoğraf grubunu
 * indirip yüz eşleştirmeden geçirir. Cihaz galerisi taramasının aksine burada
 * artımlı önbellek yok — seçim her seferinde yeni ve küçük olduğu için gerekmiyor.
 */
export async function matchGooglePhotosItems(
  items: PickedMediaItem[],
  referenceEmbedding: number[],
  threshold: number,
  accessToken: string,
  onProgress: (processed: number, total: number) => void
): Promise<MatchItem[]> {
  const found: MatchItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const localUri = await downloadPickedItem(item, accessToken);
      const embeddings = await getAllFaceEmbeddings(localUri);

      const bestSimilarity = embeddings.reduce(
        (best, embedding) => Math.max(best, cosineSimilarity(referenceEmbedding, embedding)),
        -1
      );

      if (bestSimilarity >= threshold) {
        let thumbnailUri = localUri;
        try {
          thumbnailUri = await createThumbnail(localUri);
        } catch {
          // Thumbnail üretilemezse indirilen görseli kullan.
        }
        found.push({
          assetId: `gphotos-${item.id}`,
          uri: localUri,
          thumbnailUri,
          similarity: bestSimilarity,
          source: 'google-photos',
        });
      }
    } catch {
      // Tek bir fotoğrafın indirilememesi/işlenememesi taramanın tamamını durdurmasın.
    }

    onProgress(i + 1, items.length);
  }

  return found;
}

export async function requestAndroidNotificationPermission(): Promise<void> {
  if (Platform.OS !== 'android' || Platform.Version < 33) return;
  try {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  } catch {
    // İzin reddedilse de foreground service çalışmaya devam eder, sadece bildirim görünmez.
  }
}
