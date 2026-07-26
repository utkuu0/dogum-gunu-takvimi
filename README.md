# Doğum Günü Takvimi — Monorepo

Turborepo + pnpm workspace. Yapı:

- `apps/mobile` — Expo (React Native) uygulaması, Expo Dev Client ile çalışır
- `apps/api` — NestJS backend
- `packages/shared` — her iki tarafın da kullandığı tipler (`User`, `Friend`, `Birthday`, `CreateFriendInput`), `cosineSimilarity` ve `getNextBirthdayInfo` yardımcı fonksiyonları

`poc-face-match/` bu monorepo'nun **dışında**, ayrı bir Git reposu olarak duruyor — Adım 0'daki yüz eşleştirme PoC'si. Yüz eşleştirme entegrasyonu (Adım 8) sırasında oradaki kod bu monorepo'ya taşınacak.

## Kurulum

Gerekli: Node 20+, [pnpm](https://pnpm.io) (`corepack enable` ile gelir).

```bash
pnpm install
```

## Çalıştırma

```bash
# Tüm paketlerde dev modunu başlat (api + mobile aynı anda)
pnpm dev

# Sadece API
pnpm --filter @dogum-gunu/api dev

# Sadece mobil (Expo Dev Client, kendi build'in telefonda kurulu olmalı)
pnpm --filter @dogum-gunu/mobile dev
```

## Build / Lint / Typecheck

```bash
pnpm build
pnpm lint
pnpm typecheck
```

Bunların hepsi Turborepo üzerinden ilgili paketlerde sırayla/paralel çalışır (`turbo.json`).

## Backend (apps/api) — veritabanı kurulumu

Postgres ve Redis Docker Compose ile lokalde çalışıyor, `api` ise Docker'a alınmadan doğrudan makinede çalışıyor.

```bash
cd apps/api

# .env dosyanı oluştur (yoksa)
cp .env.example .env

# Postgres + Redis'i ayağa kaldır
pnpm docker:up

# Prisma client'ı üret
pnpm db:generate

# Migration'ları oluştur/uygula (ilk seferinde "init" migration'ını yaratır)
pnpm db:migrate

# Test verisini yükle (1 kullanıcı + 3 arkadaş)
pnpm db:seed

# API'yi başlat
pnpm dev
```

Doğrulama: `curl http://localhost:3000/health` → `{"status":"ok","database":"up"}` dönmeli.

Notlar:
- Prisma **v7** kullanılıyor: client `prisma/schema.prisma`'daki `generator` bloğuyla `apps/api/src/generated/prisma`'ya
  üretiliyor (git'e girmez, `db:generate` ile yeniden oluşturulur) ve bağlantı `@prisma/adapter-pg` driver adapter'ı
  üzerinden kuruluyor — v7'de SQL adapter'lar zorunlu.
- Bağlantı ayarları artık `schema.prisma` içinde değil, `prisma.config.ts`'de (`env('DATABASE_URL')`);
  CLI komutları için ortam değişkenleri `dotenv/config` ile elle yükleniyor (v7'de otomatik `.env` yükleme kaldırıldı).
- `docker-compose.yml` sadece `postgres` ve `redis` servislerini içeriyor; `api` şimdilik container'a alınmıyor.
- Docker Compose aynı dizindeki `.env`'i otomatik okuduğu için `POSTGRES_USER/PASSWORD/DB` değerleri de oradan geliyor.

## Auth (Google Sign-In + kendi JWT'imiz)

Akış: mobil Google Sign-In ile bir **idToken** alır → `POST /auth/google` ile backend'e gönderir → backend
`google-auth-library` ile idToken'ı doğrular → kullanıcı yoksa oluşturur → kendi **access (15dk) + refresh (30gün)**
JWT çiftini döner. Korumalı endpoint'ler `JwtAuthGuard` + `@CurrentUser()` ile korunur.

Uçlar:
- `POST /auth/google` — body: `{ "idToken": string }` → `{ user, accessToken, refreshToken }`
- `POST /auth/refresh` — body: `{ "refreshToken": string }` → yeni `{ accessToken, refreshToken }`
- `GET /auth/me` — `Authorization: Bearer <accessToken>` → `{ id, email, name }`

### Google Cloud Console kurulumu

idToken'ı doğrulayabilmek için aynı Google Cloud projesinde **3 ayrı OAuth Client ID** oluşturman gerekiyor
(iOS, Android, Web) — üçü de aynı anda `audience` listesine giriyor, backend hepsini kabul ediyor.

1. [Google Cloud Console](https://console.cloud.google.com/) → yeni proje oluştur (ya da var olanı seç).
2. **APIs & Services → OAuth consent screen** — "External" seç, uygulama adı/destek e-postası gibi zorunlu alanları doldur.
   Şimdilik sadece temel profil/email scope'ları yeterli (Photos scope'u Adım 9'da eklenecek).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** — üç kez, üç farklı tip için:
   - **iOS**: Bundle ID gerekiyor (`apps/mobile/app.json` → `expo.ios.bundleIdentifier`, Adım 6'da tanımlanacak).
   - **Android**: Package name + SHA-1 sertifika parmak izi gerekiyor
     (`apps/mobile/app.json` → `expo.android.package`; SHA-1 için `eas credentials` ya da lokal debug keystore'dan
     `keytool -list -v -keystore ~/.android/debug.keystore` ile alınabilir).
   - **Web**: Bu, idToken doğrulamasında `aud` (audience) olarak kullanılacak asıl client — Authorized redirect URI
     gerekmez, sadece client ID yeterli (backend sadece doğrulama için kullanıyor, kendi OAuth akışını yürütmüyor).
4. Oluşan üç client ID'yi `apps/api/.env`'e yaz:
   ```
   GOOGLE_IOS_CLIENT_ID=...
   GOOGLE_ANDROID_CLIENT_ID=...
   GOOGLE_WEB_CLIENT_ID=...
   ```
5. Mobil tarafta (Adım 6) `@react-native-google-signin/google-signin` bu client ID'lerden Android/iOS'unkini native
   tarafta, Web'inkini ise `webClientId` olarak kullanacak (Google Sign-In SDK'sının idToken'ı Web client ID'ye
   göre imzalaması için gerekiyor — bu yüzden Web client ID her iki platformda da mobil tarafın config'ine giriyor).

Not: Google Photos API (Adım 9) için gereken `photoslibrary.readonly` scope'u bu login akışına **eklenmeyecek** —
incremental authorization ile ayrı, kullanıcı özelliği açtığında tetiklenen bir authorization-code akışı olacak
(access/refresh token'ların kendi saklama mantığıyla). Şimdiki JWT çiftimiz sadece kimlik doğrulama için.

## Doğum günü CRUD (`/friends`)

Tüm uçlar `JwtAuthGuard` ile korumalı ve `@CurrentUser()` üzerinden sadece isteği atan kullanıcının kendi
kayıtlarına erişmesine izin veriyor — başkasının arkadaşına erişim/güncelleme/silme denemesi `404` döner
(var olup olmadığını sızdırmamak için `403` değil `404`).

- `POST /friends` — `{ name, birthDate, notes?, photoUrl? }`
- `GET /friends` — kullanıcının tüm arkadaşları, yaklaşan doğum gününe göre sıralı
- `GET /friends/upcoming?days=30` — önümüzdeki X gün içinde doğum günü olanlar
- `GET /friends/:id`, `PATCH /friends/:id`, `DELETE /friends/:id`

Doğum günü hesaplaması (`packages/shared`'daki `getNextBirthdayInfo`) hem backend hem ileride mobil tarafından
kullanılabilecek şekilde paylaşılan pakette — 29 Şubat doğumlular artık yılı olmayan yıllarda 28 Şubat'ta
kutlanmış sayılıyor.

### e2e testler

```bash
cd apps/api
pnpm test:e2e
```

Not: Prisma 7'nin WASM query compiler'ı runtime'da dinamik `import()` kullanıyor; Jest'in CommonJS test ortamı
bunu `--experimental-vm-modules` olmadan çalıştıramıyor. `test:e2e` script'i bu yüzden `jest` yerine
`node --experimental-vm-modules .../jest.js` ile çağrılıyor — elle `npx jest` çalıştırırsan aynı bayrağı eklemen gerekir.

## Bildirimler (BullMQ + FCM)

Her gece **00:05'te** (sunucu saati, cron: `5 0 * * *`) BullMQ'da bir repeatable job çalışır: `fcmToken`'ı olan
her kullanıcının arkadaşları arasında, **kullanıcının kendi `timezone` alanına göre** yarın ya da 1 hafta sonra
doğum günü olanları bulur ve FCM push bildirimi gönderir ("Yarın Ali'nin doğum günü! 🎂" / "1 hafta sonra Ayşe'nin
doğum günü"). Gönderim geçersiz/silinmiş bir token hatası dönerse (`messaging/registration-token-not-registered`
vb.) token otomatik olarak veritabanından temizlenir.

Uçlar:
- `PATCH /users/me/fcm-token` — body: `{ fcmToken: string | null, timezone?: string }` → mobil, cihaz token'ını
  (ve isteğe bağlı IANA zaman dilimini, örn. `"Europe/Istanbul"`) burada kaydeder; bildirimleri kapatmak için
  `fcmToken: null` gönderilir.
- `POST /notifications/test` — **sadece `NODE_ENV=development` iken** aktif (aksi halde `404`), kendi
  `fcmToken`'ına anında bir test bildirimi gönderir.

`FIREBASE_SERVICE_ACCOUNT_BASE64` boşsa (henüz gerçek bir Firebase projesi kurulmadıysa) `FirebaseService`
göndermek yerine sadece debug log basar — uygulama çökmez, geliştirme sırasında Firebase'siz de her şey test
edilebilir.

### Firebase Console kurulumu

1. [Firebase Console](https://console.firebase.google.com/) → yeni proje oluştur (ya da Google Cloud'daki
   mevcut projeyi Firebase'e bağla — Auth için kullandığın proje ile **aynı** GCP projesini kullanman önerilir).
2. Proje ayarları → **Cloud Messaging** sekmesi: FCM zaten varsayılan olarak açık, ekstra bir "etkinleştirme"
   adımı gerekmiyor.
3. Proje ayarları → **Service accounts** → "Generate new private key" → bir JSON dosyası iner.
   Bu dosyayı **asla commit etme**.
4. İndirilen JSON'ı base64'e çevirip `.env`'e yaz:
   ```bash
   # macOS/Linux
   base64 -i service-account.json | tr -d '\n'
   # Windows PowerShell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("service-account.json"))
   ```
   Çıktıyı `apps/api/.env`'deki `FIREBASE_SERVICE_ACCOUNT_BASE64` değişkenine yapıştır.
5. Mobil tarafta (Adım 10) uygulamanın Firebase projesine kayıtlı olması gerekiyor: Android için
   `google-services.json`, iOS için `GoogleService-Info.plist` indirilip `apps/mobile`'a eklenecek —
   bu ikisi Firebase Console'daki proje ayarlarında "Add app" ile Android/iOS paket adı girilerek üretilir
   (aynı `expo.android.package` / `expo.ios.bundleIdentifier` değerleri kullanılmalı, Adım 6/10'da işlenecek).

### Manuel test (gerçek Firebase olmadan)

```bash
cd apps/api
pnpm dev
# başka bir terminalde: giriş yapmış bir kullanıcının access token'ıyla
curl -X PATCH http://localhost:3000/users/me/fcm-token \
  -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
  -d '{"fcmToken":"herhangi-bir-deger","timezone":"Europe/Istanbul"}'
curl -X POST http://localhost:3000/notifications/test -H "Authorization: Bearer <accessToken>"
```

Redis'te repeatable job'ın kurulduğunu görmek için: `docker exec api-redis-1 redis-cli KEYS "*birthday-reminders*"`.

## Mobil uygulama (apps/mobile)

Expo Router (dosya tabanlı routing) kullanıyor:

```
app/
  _layout.tsx           — QueryClientProvider + AuthProvider + auth durumuna göre yönlendirme
  (auth)/login.tsx      — Google ile giriş
  (tabs)/index.tsx      — yaklaşan doğum günleri: avatar, bugün vurgusu, pull-to-refresh
  (tabs)/calendar.tsx   — react-native-calendars aylık görünüm, günlere göre doğum günü paneli
  (tabs)/settings.tsx   — profil, çıkış, galeride-bul eşik değeri
  friend/new.tsx        — arkadaş ekleme: native tarih seçici, fotoğraf, optimistic create
  friend/[id]/index.tsx — arkadaş detay: inline düzenleme, optimistic delete, "Galeride bul"
  friend/[id]/scan.tsx  — kayıtlı yüz profiliyle galeri taraması (bkz. Yüz eşleştirme bölümü)
src/
  api/client.ts         — axios instance, JWT interceptor, 401'de tek-uçuşlu refresh + retry
  api/queryClient.ts    — TanStack QueryClient
  auth/                 — AuthContext, expo-secure-store token saklama, Google Sign-In sarmalayıcısı
  faceMatch/            — yüz eşleştirme (aşağıya bak)
  components/Avatar.tsx — fotoğraf ya da baş harfli avatar
```

`.env` (kopyala `.env.example`'dan):
```
EXPO_PUBLIC_API_URL=http://<bilgisayarının-LAN-IP'si>:3000
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<Google Cloud Console'daki Web client ID>
```

**Önemli — canlı test için gerekenler:** Google Sign-In, yüz eşleştirme (ML Kit/TFLite) ve arka plan
tarama servisi hepsi native modüller; Expo Go'da çalışmazlar. Gerçek cihazda denemeden önce:
1. Adım 3'teki Google Cloud Console adımlarını tamamlayıp `GOOGLE_WEB_CLIENT_ID`'yi hem `apps/api/.env`'e
   hem `apps/mobile/.env`'e (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`) yazman gerekiyor.
2. `poc-face-match`'teki gibi bu proje için de kendi **dev client**'ının derlenmesi gerekiyor:
   `cd apps/mobile && pnpm native:prebuild && pnpm android` (ya da `pnpm ios`), telefon USB'ye bağlıyken.
3. Derleme bitince `pnpm dev` ile Metro'yu başlatıp QR ile bağlanabilirsin (bkz. daha önceki Wi-Fi/QR akışı).

Bu adımlar tamamlanmadan kod seviyesinde doğrulanabilen: routing yapısı, API client, token saklama,
yüz eşleştirme mantığı — hepsi `pnpm typecheck`/`lint`/`build` (Metro export dahil, model dosyası dahil
tüm asset'lerle) ile test edildi ve geçiyor.

## Yüz eşleştirme (`src/faceMatch`)

`poc-face-match`'teki çalışan PoC buraya taşındı ve `Friend` modeliyle entegre edildi. Embedding'ler
**hiçbir zaman sunucuya gitmiyor**, sadece cihazdaki `expo-sqlite` veritabanında (`face-match.db`) duruyor.

Akış:
1. Arkadaş eklerken/düzenlerken fotoğraf seçilince (`friend/new.tsx`, `friend/[id]/index.tsx`) arka planda
   ML Kit ile yüz tespit edilip MobileFaceNet (`react-native-fast-tflite`) ile embedding çıkarılıyor;
   sunucudan gerçek `friendId` dönünce `face_profiles` tablosuna yazılıyor. Fotoğrafta yüz yoksa sessizce
   atlanıyor — arkadaş eklemeyi engellemiyor.
2. Yüz profili olan arkadaşların detay sayfasında **"Galeride bul"** butonu çıkıyor (`friend/[id]/scan.tsx`).
3. Tarama: `expo-media-library` ile galeri taranıyor, her fotoğrafta yüz tespiti + embedding + cosine
   similarity karşılaştırması yapılıyor (eşik `Ayarlar`dan, varsayılan 0.7). Sonuçlar daha önce taranan
   fotoğrafları atlayan bir önbellek (`scanned_photos` tablosu) sayesinde artımlı ilerliyor.
4. Android'de tarama `react-native-background-actions` ile foreground service içinde sürüyor — ekrandan
   çıkıp girsen bile devam ediyor (tarama durumu component state'i değil `src/faceMatch/scanStore.ts`'teki
   friendId'ye göre modül seviyesinde bir store'da tutuluyor, ekran her mount olduğunda kaldığı yerden okuyor).
   iOS'ta uygulamanın önde kalması gerekiyor.

`assets/models/mobilefacenet.tflite` buraya kopyalandı; Metro'nun `.tflite`'ı asset olarak tanıması için
`metro.config.js` eklendi (`resolver.assetExts.push('tflite')`) — bu dosya olmadan Metro modeli bundle'a
alamıyor.

## Google Photos (opsiyonel, Adım 9)

**Önemli kısıt:** Google, 2024-2025'te üçüncü parti uygulamalar için `photoslibrary.readonly` (tüm
kütüphaneyi otomatik listeleme) scope'unu kapattı. Yerine gelen **Photos Picker API**, kullanıcının
Google'ın kendi arayüzünden **elle fotoğraf seçmesini** gerektiriyor — cihaz galerisi taraması gibi
sessiz/otomatik bir tam kütüphane taraması artık mümkün değil. Bu yüzden akış şöyle:

1. Arkadaş detayında **"☁️ Google Photos'tan Seç"** butonuna basılır.
2. İlk kullanımda incremental authorization tetiklenir: `expo-auth-session` ile PKCE tabanlı bir OAuth
   akışı, `photospicker.mediaitems.readonly` scope'unu ister (login'deki scope'lardan bağımsız, ayrı).
   Alınan `code` + `codeVerifier` `POST /photos/authorize`'a gönderilir; backend bunu Google'ın token
   endpoint'inde değiştirip access/refresh token'ları `GooglePhotosAuthorization` tablosunda saklar.
3. Backend `POST /photos/sessions` ile bir picker session'ı açar, dönen `pickerUri` tarayıcıda açılır
   (`expo-web-browser`). Kullanıcı Google'ın arayüzünde fotoğraf(lar) seçer.
4. Uygulama `GET /photos/sessions/:id`'i session'ın `pollingConfig`'ine göre pollar; seçim tamamlanınca
   `GET /photos/sessions/:id/items` ile seçilen `mediaItems` (`baseUrl` + `id` + `createTime`) alınır.
5. Her fotoğraf `baseUrl=w512` boyutunda, `GET /photos/download-token`'dan alınan access token'la
   `expo-file-system`'in yeni `File.downloadFileAsync` API'siyle indirilir, aynı on-device yüz
   eşleştirme pipeline'ından geçirilir. Eşleşenler galeri sonuçlarıyla aynı grid'de ama 📱/☁️ ikonuyla
   kaynağı belli şekilde gösterilir.

Backend'de PKCE code exchange **client secret gerektirmiyor** — Android/iOS OAuth client ID'leri (Web
değil) public/secretsiz client tipinde olduğu için `GOOGLE_PHOTOS_REDIRECT_URI` + platform client ID'si
yeterli (`apps/api/src/photos/photos.service.ts`).

### Google Cloud Console kurulumu

1. [Google Cloud Console](https://console.cloud.google.com/) → aynı projede **APIs & Services → Library**
   → "Google Photos Picker API"yi ara ve etkinleştir.
2. OAuth consent screen'de bu scope'u (`photospicker.mediaitems.readonly`) "sensitive scopes" listesine
   eklemen gerekebilir — Google'ın verification süreci sürebilir (production'a çıkmadan önce, dev'de
   test kullanıcıları için verification gerekmez).
3. Adım 3'te oluşturduğun Android/iOS OAuth client ID'lerini kullan (yeni client ID gerekmiyor), ancak
   bu client ID'lerin **Authorized redirect URI**'sine `dogumgunu://google-photos-redirect` eklemen gerekiyor
   (Android/iOS tipi client'larda bu genelde paket adı/bundle ID doğrulamasıyla otomatik kabul edilir,
   ama sorun çıkarsa GCP Console'da ilgili client'ın ayarlarını kontrol et).
4. `apps/api/.env`'deki `GOOGLE_PHOTOS_REDIRECT_URI` ile `apps/mobile`'daki `AuthSession.makeRedirectUri`
   çıktısının birebir eşleştiğinden emin ol (ikisi de `dogumgunu://google-photos-redirect`).

**Dürüstlük notu:** Bu özellik (backend'deki Picker API çağrıları, token exchange, mobildeki
`expo-auth-session` akışı) Google'ın dokümante ettiği REST şemasına göre yazıldı ama **gerçek Google
kimlik bilgileriyle canlı test edilemedi** — Picker API göreceli yeni, şema küçük detaylarda
(alan adları, response şekli) değişmiş olabilir. GCP kurulumu yapılıp ilk denemede hata alınırsa
Google'ın güncel dokümantasyonuyla (`https://developers.google.com/photos/picker`) karşılaştırılması
gerekir — en kırılgan/en az doğrulanmış kısım burası.

## Push bildirimler — mobil taraf (Adım 10)

Backend zaten (Adım 5) FCM gönderiyor; bu adım mobilde token'ı alıp kaydetme, bildirime tıklayınca
yönlenme ve ön planda banner gösterme tarafı. `@react-native-firebase/messaging` kullanılıyor
(`src/notifications/pushNotifications.ts`) — `expo-notifications` değil, çünkü backend zaten
`firebase-admin` ile ham FCM gönderiyor ve `data.friendId` payload'ını taşıyabilmek için native
Firebase SDK'sı daha doğrudan bir eşleşme.

Akış:
- **İzin isteme zamanı**: uygulama açılışında değil, kullanıcı **ilk arkadaşını ekledikten hemen sonra**
  "Doğum günlerini hatırlatalım mı?" diyalogu çıkar (`friend/new.tsx`) — bir kere sorulur
  (`notificationPreference.ts`'teki kalıcı bayrak sayesinde).
- **Evet** denirse: bildirim izni istenir (Android 13+'ta ayrıca `POST_NOTIFICATIONS` izni), FCM token'ı
  alınıp `PATCH /users/me/fcm-token`'a cihaz saat dilimiyle birlikte gönderilir.
- **Token yenilenirse** (`onTokenRefresh`) otomatik tekrar gönderilir — ama kullanıcı ayarlardan kapattıysa
  sessizce atlanır (aksi halde kapatma işe yaramazdı).
- **Bildirime tıklama**: `onNotificationOpenedApp` / `getInitialNotification` ile `data.friendId` okunup
  `friend/[id]`'e yönlendirilir (`app/_layout.tsx`).
- **Ön planda gelen bildirim**: FCM ön plandayken sistem bildirimi göstermediği için `onMessage` ile
  yakalanıp `NotificationBanner` component'i üstte 4 saniyeliğine gösterilir, tıklanırsa aynı şekilde
  arkadaş detayına gider.
- **Ayarlar**'da aç/kapa toggle'ı var; kapatılınca `fcmToken: null` gönderilir.

### Kurulum (native dosyalar + Firebase Console)

`@react-native-firebase/app` ve `@react-native-firebase/messaging` config plugin'leri `app.json`'a zaten
eklendi, ama şu iki dosya olmadan `expo prebuild` başarısız olur — Firebase Console'dan indirip
`apps/mobile/` köküne koyman gerekiyor (Adım 5'teki Firebase Console adımlarının devamı):
- Android: proje ayarları → "Add app" → Android, paket adı `com.utqute.dogumgunu` → `google-services.json` indir.
- iOS: aynı şekilde "Add app" → iOS, bundle ID `com.utqute.dogumgunu` → `GoogleService-Info.plist` indir.

Bu iki dosya `.gitignore`'a eklenmedi çünkü genelde (API key'leri client tarafında zaten görünür olduğu
için) commit edilebilir kabul edilir, ama istersen ekleyip her geliştiricinin kendi indirmesini
sağlayabilirsin.

### iOS ekstra adımlar (APNs)

FCM, iOS'ta arka planda APNs (Apple Push Notification service) üzerinden çalışır — Android'den farklı
olarak ekstra bir sertifika/key adımı gerekiyor:

1. [Apple Developer Console](https://developer.apple.com/account/) → **Certificates, Identifiers & Profiles
   → Keys** → yeni bir **APNs key** oluştur (tüm bundle ID'ler için tek bir key yeterli, uygulama başına
   ayrı sertifikaya gerek yok — Apple'ın önerdiği modern yöntem bu).
2. İndirilen `.p8` dosyasını, Key ID'sini ve Team ID'ni **Firebase Console → Proje ayarları →
   Cloud Messaging → Apple app configuration** kısmına yükle.
3. Xcode'da (EAS Build kullanıyorsan `eas build` bunu büyük ölçüde otomatik hallediyor, ama manuel
   derlersen): hedef → **Signing & Capabilities** → **+ Capability** → **Push Notifications** ekle,
   ayrıca **Background Modes** capability'sinde **Remote notifications** kutucuğunu işaretle.
4. Fiziksel bir iOS cihazda test etmen gerekiyor — push bildirimler simülatörde (Xcode 15+ bazı sınırlı
   senaryolar hariç) genelde çalışmaz.

## Paket yapısı notları

- Ortak TS ayarları `tsconfig.base.json`'da; `packages/shared` ve `apps/api` bunu `extends` eder.
  `apps/mobile` Metro/Expo'nun kendi gereksinimleri nedeniyle `expo/tsconfig.base`'i extend eder — bu bilinçli bir istisna.
- ESLint kökten `eslint.base.mjs` ile paylaşılıyor; her paket kendi `eslint.config.mjs`'inde bunu import edip
  framework'e özgü ek kurallar (Nest için Node globals, mobil için `eslint-config-expo`) ekliyor.
- Prettier tek bir kök `.prettierrc.json` üzerinden tüm workspace'i kapsıyor, paketlerde ayrı kopya yok.
- `packages/shared`'ı diğer paketlerden kullanmak için: `import { cosineSimilarity, type Friend } from '@dogum-gunu/shared'`.
- `packages/shared`'ın `main`/`types`'ı `dist/`'a işaret ediyor (ham `src/*.ts`'e değil) — çünkü `apps/api`'nin
  derlenmiş çıktısı (`node dist/main.js`) bu paketi gerçek bir Node runtime'ında çalıştırıyor ve Node'un yerleşik
  TS desteği, TypeScript'in kendi `nodenext` uzantı-eşleme mantığını uygulamıyor. Bu yüzden `packages/shared`'da
  değişiklik yaptıktan sonra `apps/api`'yi tek başına (turbo olmadan) test edecekesen önce
  `pnpm --filter @dogum-gunu/shared build` çalıştırman gerekir — `pnpm build`/`pnpm typecheck` (kök script'ler)
  bunu zaten turbo'nun bağımlılık sırasıyla otomatik yapıyor.
