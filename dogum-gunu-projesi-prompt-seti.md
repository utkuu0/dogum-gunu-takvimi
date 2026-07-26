# Doğum Günü Takvimi Projesi — Prompt Seti

Stack: React Native (Expo) + TypeScript · NestJS + Prisma + PostgreSQL · BullMQ + FCM · On-device yüz tanıma (TFLite)

Promptları sırayla kullan. Her adım bittiğinde çalıştığını doğrula, sonra bir sonrakine geç. Takıldığın hataları aynı sohbete yapıştırıp devam ettir.

---

## Adım 0 — PoC: Yüz Eşleştirme (EN ÖNCE BUNU YAP)

Bu promptu daha önce verdim (iki fotoğraf karşılaştıran tek ekranlık uygulama). PoC çalışmadan diğer adımlara geçme. Çalıştıysa devam.

---

## Adım 1 — Monorepo Kurulumu

```
Turborepo ile bir TypeScript monorepo kur. Yapı şöyle olsun:

- apps/mobile: Expo (React Native) uygulaması, Expo Dev Client kullanacak
- apps/api: NestJS uygulaması
- packages/shared: iki tarafın paylaşacağı tipler ve yardımcı fonksiyonlar
  (örn. Birthday, Friend, User tipleri, cosine similarity fonksiyonu)

Gereksinimler:
- pnpm workspace kullan
- Her pakette ayrı tsconfig, kökte ortak base tsconfig
- ESLint + Prettier kökten paylaşılsın
- turbo.json içinde dev, build, lint görevleri tanımlı olsun
- apps/mobile ve apps/api, packages/shared'ı import edebilsin
- Kurulum ve çalıştırma komutlarını README olarak ver

Henüz uygulama kodu yazma, sadece iskelet ve konfigürasyon.
```

---

## Adım 2 — Backend Temeli (NestJS + Prisma + Docker)

```
Monorepo içindeki apps/api klasöründe NestJS backend'ini kur.

Gereksinimler:
- NestJS + TypeScript, modüler yapı (her domain ayrı modül)
- Prisma ORM + PostgreSQL
- Docker Compose dosyası: postgres ve redis servisleri (api'yi şimdilik
  lokal çalıştıracağım, container'a alma)
- .env yönetimi: @nestjs/config ile, .env.example dosyası da oluştur
- Global validation pipe (class-validator) ve exception filter
- Health check endpoint'i: GET /health

Prisma şeması (ilk versiyon):
- User: id, email, name, googleId, fcmToken (nullable), createdAt
- Friend: id, userId (User'a ilişki), name, birthDate (Date),
  photoUrl (nullable), notes (nullable), createdAt
- Bir kullanıcının birden çok arkadaşı olabilir

Migration'ı oluştur ve çalıştırma komutlarını ver. Seed script'i de
ekle (test için 1 kullanıcı + 3 arkadaş).
```

---

## Adım 3 — Auth (Google OAuth + JWT)

```
NestJS backend'ime Google ile giriş ekle.

Akış şöyle olacak:
1. Mobil uygulama (Expo) Google Sign-In ile idToken alacak
2. Backend'e POST /auth/google ile bu idToken'ı gönderecek
3. Backend google-auth-library ile token'ı doğrulayacak
4. Kullanıcı yoksa oluşturacak, varsa bulacak
5. Kendi JWT access token + refresh token çiftimizi dönecek

Gereksinimler:
- Passport.js + passport-jwt ile JwtAuthGuard
- Access token 15 dk, refresh token 30 gün
- POST /auth/refresh endpoint'i
- Korunan endpoint'lerde request'ten user'ı almak için @CurrentUser()
  decorator'ı yaz
- Google Cloud Console'da hangi ayarları yapmam gerektiğini
  (OAuth client ID'ler: iOS, Android, Web) adım adım açıkla

Not: İleride Google Photos API de kullanacağım, o yüzden OAuth scope
yapısını buna genişletilebilir kur ama şimdilik sadece login yap.
```

---

## Adım 4 — Doğum Günü CRUD API

```
NestJS backend'ime arkadaş/doğum günü yönetimi endpoint'lerini ekle.
Tüm endpoint'ler JwtAuthGuard ile korunacak ve sadece kullanıcının
kendi kayıtlarına erişmesine izin verecek.

Endpoint'ler:
- POST /friends — arkadaş ekle (name, birthDate, notes?, photoUrl?)
- GET /friends — kullanıcının tüm arkadaşları, yaklaşan doğum gününe
  göre sıralı (bugünden itibaren en yakın önce)
- GET /friends/:id — tek arkadaş
- PATCH /friends/:id — güncelle
- DELETE /friends/:id — sil
- GET /friends/upcoming?days=30 — önümüzdeki X gün içinde doğum günü
  olanlar, her biri için "kaç gün kaldı" ve "kaç yaşına girecek" bilgisi

Gereksinimler:
- DTO'lar class-validator ile doğrulansın
- DTO tiplerini packages/shared'a da ekle ki mobil taraf kullanabilsin
- Doğum günü hesaplamalarında yıl dönümü mantığına dikkat et
  (29 Şubat doğumlular dahil)
- Her endpoint için basit e2e test yaz (supertest)
```

---

## Adım 5 — Bildirim Sistemi (BullMQ + FCM)

```
NestJS backend'ime doğum günü hatırlatma bildirimleri ekle.

Mimari:
- BullMQ (Redis) ile repeatable job: her gece 00:05'te çalışacak
- Job, ertesi gün ve 1 hafta sonra doğum günü olan arkadaşları bulacak
- Her biri için ilgili kullanıcıya FCM push bildirimi gönderecek
  ("Yarın Ali'nin doğum günü! 🎂" / "1 hafta sonra Ayşe'nin doğum günü")

Gereksinimler:
- firebase-admin SDK sadece FCM göndermek için kullanılacak,
  service account json'ı .env üzerinden yönetilecek
- PATCH /users/me/fcm-token endpoint'i: mobil uygulama token'ını
  kaydedecek
- Bildirim gönderimi başarısız olursa (geçersiz token) token'ı
  veritabanından temizle
- Zaman dilimi: şimdilik kullanıcının cihaz saat dilimini User
  modelinde timezone alanı olarak tut ve bildirimi ona göre hesapla
- Test için POST /notifications/test endpoint'i (sadece dev ortamında
  aktif): kendime anında test bildirimi atabileyim
- Firebase Console'da FCM için yapmam gereken kurulum adımlarını açıkla
```

---

## Adım 6 — Mobil Uygulama İskeleti

```
Monorepo'daki apps/mobile içinde Expo uygulamasının iskeletini kur.
Expo Dev Client kullanıyorum (PoC'den gelen native modüller var).

Gereksinimler:
- Expo Router ile navigasyon, yapı:
  - (auth)/login — Google ile giriş ekranı
  - (tabs)/index — Ana ekran: yaklaşan doğum günleri listesi
  - (tabs)/calendar — Takvim görünümü
  - (tabs)/settings — Ayarlar
  - friend/[id] — Arkadaş detay
  - friend/new — Arkadaş ekleme
- TanStack Query + axios ile API katmanı: baseURL .env'den,
  JWT token'ı interceptor ile header'a eklensin, 401'de refresh
  token akışı çalışsın
- Token saklama: expo-secure-store
- Google Sign-In: @react-native-google-signin/google-signin ile,
  alınan idToken backend'e POST /auth/google ile gönderilsin
- packages/shared'daki tipleri kullan
- Login olmayan kullanıcı (auth) grubuna, olan kullanıcı (tabs)
  grubuna yönlensin
- Şimdilik ekranlar placeholder olabilir, auth akışı uçtan uca çalışsın
```

---

## Adım 7 — Takvim ve Doğum Günü Ekranları

```
Expo uygulamama doğum günü yönetimi ekranlarını yaz. Backend API'si
hazır (Adım 4'teki endpoint'ler).

Ekranlar:

1. Ana ekran (yaklaşan doğum günleri):
   - GET /friends/upcoming'den gelen liste
   - Her kart: fotoğraf (yoksa baş harfli avatar), isim, "X gün kaldı",
     kaç yaşına gireceği
   - Bugün doğum günü olan varsa en üstte kutlama görünümüyle vurgula
   - Pull-to-refresh

2. Takvim ekranı:
   - react-native-calendars ile aylık görünüm
   - Doğum günü olan günler işaretli (dot)
   - Güne tıklayınca o günkü doğum günleri alt panelde listelensin

3. Arkadaş ekleme (friend/new):
   - İsim, doğum tarihi (native date picker), not alanı
   - Fotoğraf seçimi: expo-image-picker ile galeriden (şimdilik sadece
     lokal URI sakla, yüz tanıma sonraki adımda gelecek)
   - Kaydet → POST /friends → listeye dön ve cache'i güncelle

4. Arkadaş detay (friend/[id]):
   - Bilgiler + düzenle + sil (silmeden önce onay dialogu)

Gereksinimler:
- Tüm veri işlemleri TanStack Query ile (optimistic update sil ve
  ekle işlemlerinde)
- Boş durumlar (hiç arkadaş yokken) için anlamlı empty state
- Tarih formatlama Türkçe locale ile (date-fns kullan)
```

---

## Adım 8 — Yüz Eşleştirme Entegrasyonu (PoC → Gerçek Uygulama)

```
Elimde çalışan bir yüz eşleştirme PoC'si var: ML Kit ile yüz tespiti,
react-native-fast-tflite + MobileFaceNet ile embedding çıkarma ve
cosine similarity karşılaştırması yapıyor. Bunu asıl uygulamama
entegre etmek istiyorum.

Senaryo:
1. Kullanıcı arkadaş eklerken/düzenlerken o kişinin net bir fotoğrafını
   seçiyor → uygulama yüz embedding'ini çıkarıp cihazda saklıyor
   (embedding'ler sunucuya GİTMEYECEK, sadece cihazda)
2. Arkadaş detay ekranında "Galeride bul" butonu olacak
3. Butona basınca uygulama expo-media-library ile cihaz galerisini
   tarayacak, her fotoğrafta yüz tespiti + embedding + karşılaştırma
   yapacak, eşleşen fotoğrafları grid olarak gösterecek

Gereksinimler:
- Embedding'leri expo-sqlite ile lokal DB'de sakla:
  face_profiles(friendId, embedding) ve tarama cache'i için
  scanned_photos(assetId, faceCount, embeddings, scannedAt)
- Tarama artımlı olsun: daha önce taranan fotoğrafları cache'ten oku,
  sadece yenileri işle
- Tarama uzun sürebilir: progress bar göster (X / Y fotoğraf),
  iptal edilebilir olsun, ekran kapansa da devam edebilsin
  (arka plan görevine gerek yok, ekran açıkken çalışsın yeter)
- Performans: fotoğrafları küçültülmüş boyutta işle, batch'ler halinde
  ilerle, UI thread'i kilitleme
- Bir fotoğrafta birden çok yüz varsa hepsini kontrol et
- Eşik değeri ayarlardan değiştirilebilir olsun (varsayılan 0.7)
- Sonuç grid'inde fotoğrafa basınca tam ekran önizleme
```

---

## Adım 9 — Google Photos Entegrasyonu (Opsiyonel/İleri Seviye)

```
Uygulamama Google Photos desteği eklemek istiyorum: kullanıcı isterse
yüz taraması cihaz galerisine ek olarak Google Photos'taki
fotoğraflarda da çalışsın.

Mevcut durum:
- Backend: NestJS, Google OAuth login zaten var
- Mobil: Expo, on-device yüz eşleştirme çalışıyor

Yapılacaklar:
1. Backend: Google Photos Library API için OAuth scope'unu
   (photoslibrary.readonly) incremental authorization ile iste —
   kullanıcı bu özelliği açmak istediğinde ek izin ekranı çıksın,
   login'de değil
2. Backend: access/refresh token'ları güvenli sakla, token yenileme
   mantığını kur
3. Backend: GET /photos/list endpoint'i — Google Photos'tan sayfalı
   şekilde fotoğraf listesi (mediaItems) döndürsün, sadece baseUrl +
   id + creationTime yeterli
4. Mobil: tarama ekranına "Google Photos'u da tara" seçeneği,
   fotoğrafları baseUrl'den küçük boyutta (=w512 parametresiyle) indir,
   aynı yüz eşleştirme pipeline'ından geçir, sonuçları cihaz galerisi
   sonuçlarıyla birlikte göster (kaynağı belli olsun)
5. Google Cloud Console'da Photos Library API'yi açma ve verification
   gereksinimlerini açıkla

Not: Google Photos API'sinin güncel kısıtlamalarını (2024-2025'te
değişen scope politikaları dahil) kontrol et ve tasarımı buna göre yap;
eğer readonly scope artık üçüncü parti uygulamalara kapalıysa
Picker API alternatifiyle çöz.
```

---

## Adım 10 — Push Bildirimlerin Mobil Tarafı

```
Expo uygulamama FCM push bildirim desteği ekle. Backend hazır:
PATCH /users/me/fcm-token endpoint'i token bekliyor, bildirimleri
backend gönderiyor.

Gereksinimler:
- @react-native-firebase/messaging kullan (Expo Dev Client ile,
  config plugin kurulumunu da göster)
- İzin isteme akışı: ilk açılışta değil, kullanıcı ilk arkadaşını
  ekledikten sonra "doğum günlerini hatırlatalım mı?" diyalogu ile iste
- Token'ı al ve backend'e gönder, token yenilenirse tekrar gönder
- Bildirime tıklanınca ilgili arkadaşın detay ekranına deep link
- Uygulama ön plandayken gelen bildirimi in-app banner olarak göster
- iOS için gereken ekstra adımları (APNs key, Xcode capability) açıkla
- Ayarlar ekranına bildirim açma/kapama toggle'ı ekle (kapatınca
  backend'e fcmToken: null gönder)
```

---

## Adım 11 — Deploy

```
Projemi yayına hazırlamak istiyorum.

Backend (NestJS + PostgreSQL + Redis):
- Multi-stage Dockerfile yaz (build + production, pnpm monorepo'ya uygun)
- Production docker-compose.yml: api + postgres + redis + Caddy
  (otomatik HTTPS reverse proxy)
- Hetzner'da bir VPS'e ilk kurulum adımlarını sırala: Docker kurulumu,
  firewall, env dosyaları, migration çalıştırma
- GitHub Actions ile basit CI/CD: main'e push'ta test + build + sunucuya
  deploy (SSH ile)
- Postgres için günlük otomatik yedekleme script'i

Mobil (Expo):
- EAS Build ile iOS ve Android production build alma adımları
- Ortam ayrımı: dev/prod API URL'leri için eas.json profilleri
- App Store ve Play Store'a ilk yükleme için gereken hazırlıkları
  listele (özellikle: galeri erişimi ve yüz verisi işlediğim için
  gereken izin açıklamaları ve gizlilik politikası gereksinimleri —
  Apple'ın yüz verisiyle ilgili özel kuralları dahil)
```

---

## Genel İpuçları

- Her adımda üretilen kodu çalıştırıp test etmeden sonrakine geçme.
- Hata aldığında hatanın tamamını (stack trace dahil) aynı sohbete yapıştır.
- Bir adım çok büyük gelirse "bunu daha küçük parçalara böl, önce sadece X'i yap" de.
- Kütüphane versiyonları hızlı değişiyor; kurulum hatalarında "bu paketin güncel versiyonuyla uyumlu şekilde güncelle" demen genelde çözer.
- Adım 9 (Google Photos) opsiyonel — uygulama onsuz da tam çalışır, en sona bırakabilirsin.
