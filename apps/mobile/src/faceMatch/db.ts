import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

const DB_NAME = 'face-match.db';

let dbPromise: Promise<SQLiteDatabase> | null = null;

function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync(DB_NAME).then(async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS face_profiles (
          friendId TEXT PRIMARY KEY NOT NULL,
          embedding TEXT NOT NULL,
          updatedAt INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS scanned_photos (
          assetId TEXT PRIMARY KEY NOT NULL,
          faceCount INTEGER NOT NULL,
          embeddings TEXT NOT NULL,
          scannedAt INTEGER NOT NULL
        );
      `);
      return db;
    });
  }
  return dbPromise;
}

// --- face_profiles: her arkadaşın referans yüz embedding'i (sadece cihazda) ---

export async function saveFaceProfile(friendId: string, embedding: number[]): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO face_profiles (friendId, embedding, updatedAt) VALUES (?, ?, ?)',
    [friendId, JSON.stringify(embedding), Date.now()]
  );
}

export async function getFaceProfile(friendId: string): Promise<number[] | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ embedding: string }>(
    'SELECT embedding FROM face_profiles WHERE friendId = ?',
    [friendId]
  );
  return row ? (JSON.parse(row.embedding) as number[]) : null;
}

export async function deleteFaceProfile(friendId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM face_profiles WHERE friendId = ?', [friendId]);
}

// --- scanned_photos: galeri taraması önbelleği (artımlı tarama için) ---

export interface CachedScanResult {
  faceCount: number;
  embeddings: number[][];
}

export async function getCachedScan(assetId: string): Promise<CachedScanResult | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ faceCount: number; embeddings: string }>(
    'SELECT faceCount, embeddings FROM scanned_photos WHERE assetId = ?',
    [assetId]
  );
  if (!row) return null;
  return { faceCount: row.faceCount, embeddings: JSON.parse(row.embeddings) as number[][] };
}

export async function setCachedScan(assetId: string, result: CachedScanResult): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO scanned_photos (assetId, faceCount, embeddings, scannedAt) VALUES (?, ?, ?, ?)',
    [assetId, result.faceCount, JSON.stringify(result.embeddings), Date.now()]
  );
}

/** Test/debug amaçlı: tarama önbelleğini tamamen temizler. */
export async function clearScanCache(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM scanned_photos');
}
