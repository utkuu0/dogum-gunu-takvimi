import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as WebBrowser from 'expo-web-browser';
import BackgroundService from 'react-native-background-actions';
import { useLocalSearchParams } from 'expo-router';
import { clearScanCache, getFaceProfile } from '../../../src/faceMatch/db';
import { GooglePhotosAuthCancelledError, connectGooglePhotos, isGooglePhotosConnected } from '../../../src/faceMatch/googlePhotosAuth';
import {
  createPickerSession,
  getDownloadToken,
  listPickedItems,
  waitForSelection,
} from '../../../src/faceMatch/googlePhotosPicker';
import {
  matchGooglePhotosItems,
  requestAndroidNotificationPermission,
  runScanLoop,
} from '../../../src/faceMatch/scanLoop';
import { getMatchThreshold } from '../../../src/faceMatch/settings';
import {
  getScanEntry,
  isCancelRequested,
  setCancelRequested,
  subscribeScanEntry,
  updateScanEntry,
  type MatchItem,
  type ScanEntry,
} from '../../../src/faceMatch/scanStore';

export default function ScanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entry, setEntry] = useState<ScanEntry>(() => getScanEntry(id));
  const [referenceEmbedding, setReferenceEmbedding] = useState<number[] | null | 'loading'>('loading');
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  useEffect(() => {
    return subscribeScanEntry(id, setEntry);
  }, [id]);

  useEffect(() => {
    getFaceProfile(id).then(setReferenceEmbedding);
  }, [id]);

  async function startScan() {
    if (referenceEmbedding === 'loading' || !referenceEmbedding) return;

    const mediaPermission = await MediaLibrary.requestPermissionsAsync();
    if (!mediaPermission.granted) {
      Alert.alert('İzin gerekli', 'Galeriyi tarayabilmek için medya erişim izni vermelisin.');
      return;
    }

    updateScanEntry(id, { error: null, matches: getScanEntry(id).matches.filter((m) => m.source !== 'device') });
    setCancelRequested(id, false);

    let metadata;
    try {
      metadata = await new MediaLibrary.Query()
        .eq(MediaLibrary.AssetField.MEDIA_TYPE, MediaLibrary.MediaType.IMAGE)
        .orderBy({ key: MediaLibrary.AssetField.CREATION_TIME, ascending: false })
        .exeForMetadata();
    } catch (err) {
      updateScanEntry(id, { error: err instanceof Error ? err.message : 'Galeri okunamadı.' });
      return;
    }

    const threshold = await getMatchThreshold();
    const total = metadata.length;
    updateScanEntry(id, { scanState: { phase: 'scanning', processed: 0, total } });

    const updateProgress = (processed: number, totalCount: number) => {
      updateScanEntry(id, { scanState: { phase: 'scanning', processed, total: totalCount } });
    };

    const mergeMatches = (deviceMatches: MatchItem[]) => {
      const others = getScanEntry(id).matches.filter((m) => m.source !== 'device');
      updateScanEntry(id, { matches: [...others, ...deviceMatches].sort((a, b) => b.similarity - a.similarity) });
    };

    if (Platform.OS === 'android') {
      await requestAndroidNotificationPermission();

      try {
        await BackgroundService.start(
          async () => {
            try {
              const result = await runScanLoop({
                referenceEmbedding,
                metadata,
                threshold,
                shouldStop: () => !BackgroundService.isRunning(),
                onProgress: (processed, totalCount) => {
                  updateProgress(processed, totalCount);
                  BackgroundService.updateNotification({
                    taskDesc: `${processed} / ${totalCount} fotoğraf tarandı`,
                    progressBar: { max: totalCount, value: processed, indeterminate: false },
                  }).catch(() => {});
                },
                onMatches: mergeMatches,
              });

              updateScanEntry(id, {
                scanState: { phase: 'done', processed: result.processed, total, cancelled: result.cancelled },
              });
            } catch (err) {
              updateScanEntry(id, {
                error: err instanceof Error ? err.message : 'Tarama sırasında beklenmeyen bir hata oluştu.',
                scanState: { phase: 'done', processed: 0, total, cancelled: true },
              });
            } finally {
              if (BackgroundService.isRunning()) {
                await BackgroundService.stop();
              }
            }
          },
          {
            taskName: `GaleriTaramasi-${id}`,
            taskTitle: 'Galeri taranıyor',
            taskDesc: `0 / ${total} fotoğraf tarandı`,
            taskIcon: { name: 'ic_launcher', type: 'mipmap' },
            color: '#2563eb',
            foregroundServiceType: ['dataSync'],
            progressBar: { max: total, value: 0, indeterminate: false },
          }
        );
      } catch (err) {
        updateScanEntry(id, {
          error:
            err instanceof Error
              ? `Arka plan servisi başlatılamadı: ${err.message}`
              : 'Arka plan servisi başlatılamadı.',
          scanState: { phase: 'idle' },
        });
      }
    } else {
      const result = await runScanLoop({
        referenceEmbedding,
        metadata,
        threshold,
        shouldStop: () => isCancelRequested(id),
        onProgress: updateProgress,
        onMatches: mergeMatches,
      });

      updateScanEntry(id, {
        scanState: { phase: 'done', processed: result.processed, total, cancelled: result.cancelled },
      });
    }
  }

  async function cancelScan() {
    if (Platform.OS === 'android' && BackgroundService.isRunning()) {
      await BackgroundService.stop();
    } else {
      setCancelRequested(id, true);
    }
  }

  async function startGooglePhotosPicker() {
    if (referenceEmbedding === 'loading' || !referenceEmbedding) return;

    try {
      updateScanEntry(id, { error: null, googlePhotosState: { phase: 'connecting' } });

      const connected = await isGooglePhotosConnected();
      if (!connected) {
        await connectGooglePhotos();
      }

      const session = await createPickerSession();
      WebBrowser.openBrowserAsync(session.pickerUri).catch(() => {});

      updateScanEntry(id, { googlePhotosState: { phase: 'waiting-for-selection' } });

      const completedSession = await waitForSelection(session, () => false);
      await WebBrowser.dismissBrowser().catch(() => {});

      const items = await listPickedItems(completedSession.id);
      if (items.length === 0) {
        updateScanEntry(id, { googlePhotosState: { phase: 'idle' } });
        return;
      }

      const threshold = await getMatchThreshold();
      const accessToken = await getDownloadToken();

      updateScanEntry(id, { googlePhotosState: { phase: 'matching', processed: 0, total: items.length } });

      const found = await matchGooglePhotosItems(items, referenceEmbedding, threshold, accessToken, (processed, total) => {
        updateScanEntry(id, { googlePhotosState: { phase: 'matching', processed, total } });
      });

      const others = getScanEntry(id).matches.filter((m) => m.source !== 'google-photos');
      updateScanEntry(id, {
        googlePhotosState: { phase: 'done' },
        matches: [...others, ...found].sort((a, b) => b.similarity - a.similarity),
      });
    } catch (err) {
      if (err instanceof GooglePhotosAuthCancelledError) {
        updateScanEntry(id, { googlePhotosState: { phase: 'idle' } });
        return;
      }
      updateScanEntry(id, {
        googlePhotosState: { phase: 'idle' },
        error: err instanceof Error ? err.message : 'Google Photos taraması başarısız oldu.',
      });
    }
  }

  async function handleClearCache() {
    await clearScanCache();
    Alert.alert('Tamam', 'Tarama önbelleği temizlendi. Bir sonraki tarama tüm fotoğrafları yeniden işleyecek.');
  }

  const { scanState, matches, error, googlePhotosState } = entry;
  const scanning = scanState.phase === 'scanning';
  const googlePhotosBusy = googlePhotosState.phase !== 'idle' && googlePhotosState.phase !== 'done';

  if (referenceEmbedding === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!referenceEmbedding) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>
          Bu arkadaş için kayıtlı bir yüz profili yok. Önce net bir fotoğraf ekleyerek profili güncelle.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!scanning ? (
        <Pressable style={styles.scanButton} onPress={startScan}>
          <Text style={styles.scanButtonText}>📱 Galeriyi Tara</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.cancelButton} onPress={cancelScan}>
          <Text style={styles.scanButtonText}>İptal</Text>
        </Pressable>
      )}

      <Pressable
        style={[styles.googlePhotosButton, googlePhotosBusy && styles.scanButtonDisabled]}
        onPress={startGooglePhotosPicker}
        disabled={googlePhotosBusy}
      >
        {googlePhotosBusy ? (
          <ActivityIndicator color="#2563eb" />
        ) : (
          <Text style={styles.googlePhotosButtonText}>☁️ Google Photos’tan Seç</Text>
        )}
      </Pressable>

      {googlePhotosState.phase === 'connecting' && (
        <Text style={styles.progressText}>Google Photos yetkilendirmesi bekleniyor…</Text>
      )}
      {googlePhotosState.phase === 'waiting-for-selection' && (
        <Text style={styles.progressText}>
          Tarayıcıda açılan Google Photos ekranında fotoğraf seç, seçim bitince buraya otomatik dönülecek.
        </Text>
      )}
      {googlePhotosState.phase === 'matching' && (
        <Text style={styles.progressText}>
          {googlePhotosState.processed} / {googlePhotosState.total} seçilen fotoğraf işleniyor…
        </Text>
      )}

      {scanning && (
        <Text style={styles.backgroundHint}>
          {Platform.OS === 'android'
            ? 'Taramayı başka bir uygulamaya geçerek arka planda sürdürebilirsin — bildirimden ilerlemeyi takip edebilirsin.'
            : 'iOS kısıtları nedeniyle tarama sırasında uygulamayı önde tutman gerekiyor.'}
        </Text>
      )}

      {scanState.phase !== 'idle' && (
        <View style={styles.progressBox}>
          {scanning && <ActivityIndicator size="small" />}
          <Text style={styles.progressText}>
            {scanState.phase === 'scanning' &&
              `${scanState.processed} / ${scanState.total} fotoğraf tarandı…`}
            {scanState.phase === 'done' &&
              (scanState.cancelled
                ? `İptal edildi — ${scanState.processed} / ${scanState.total} tarandı.`
                : `Galeri taraması bitti — ${scanState.processed} fotoğraf tarandı.`)}
          </Text>
        </View>
      )}

      {matches.length > 0 && (
        <Text style={styles.resultSummary}>{matches.length} eşleşme bulundu.</Text>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {matches.length > 0 && (
        <View style={styles.grid}>
          {matches.map((item) => (
            <Pressable
              key={item.assetId}
              style={styles.gridItem}
              onPress={() => setPreviewUri(item.uri)}
            >
              <Image source={{ uri: item.thumbnailUri }} style={styles.gridImage} />
              <Text style={styles.gridSource}>{item.source === 'device' ? '📱' : '☁️'}</Text>
              <Text style={styles.gridScore}>{(item.similarity * 100).toFixed(0)}%</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable style={styles.clearCacheButton} onPress={handleClearCache} disabled={scanning}>
        <Text style={styles.clearCacheText}>Tarama önbelleğini temizle</Text>
      </Pressable>

      <Modal visible={previewUri !== null} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <Pressable style={styles.previewBackdrop} onPress={() => setPreviewUri(null)}>
          {previewUri && <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" />}
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scanButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    minWidth: 220,
    alignItems: 'center',
  },
  scanButtonDisabled: {
    opacity: 0.6,
  },
  cancelButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    minWidth: 220,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  googlePhotosButton: {
    backgroundColor: '#eef2ff',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    minWidth: 220,
    alignItems: 'center',
  },
  googlePhotosButtonText: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 16,
  },
  backgroundHint: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  progressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    fontSize: 13,
    color: '#444',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  resultSummary: {
    fontSize: 13,
    color: '#444',
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    padding: 14,
    width: '100%',
  },
  errorText: {
    color: '#991b1b',
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridSource: {
    position: 'absolute',
    top: 4,
    left: 4,
    fontSize: 14,
  },
  gridScore: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  clearCacheButton: {
    paddingVertical: 8,
  },
  clearCacheText: {
    fontSize: 12,
    color: '#888',
    textDecorationLine: 'underline',
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '80%',
  },
});
