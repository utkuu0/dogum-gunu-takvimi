# Ücretsiz deploy: Oracle Cloud Always Free + DuckDNS

Google Cloud denemesi bittiği için API + Postgres + Redis tek bir Oracle Always Free ARM VM'ine
taşınır. `docker-compose.prod.yml` ve Caddy olduğu gibi kullanılır, kod değişikliği yok.
(Google OAuth client ID'leri ve Firebase/FCM GCP'de kalır — onlar ücretsiz, taşınmaz.)

Maliyet: VM 0 €, alan adı (DuckDNS) 0 €, HTTPS (Caddy / Let's Encrypt) 0 €.

> Oracle'ın free tier şartları zamanla değişebilir; kayıttan önce
> <https://www.oracle.com/cloud/free/> sayfasını kontrol et.

## 1. Oracle hesabı ve VM

1. <https://signup.cloud.oracle.com> ile kayıt ol. Kredi kartı doğrulama için istenir; **"Pay As You Go"ya
   yükseltme**, hesap Free kalsın. Home region'ı sonradan değiştiremezsin, yakın bir bölge seç (örn. Frankfurt).
2. **Compute → Instances → Create instance**
   - Image: **Ubuntu 24.04** (aarch64)
   - Shape: **Ampere → VM.Standard.A1.Flex**, 2 OCPU / 12 GB RAM yeterli (free limit 4 OCPU / 24 GB)
   - Boot volume: 50 GB
   - SSH key: kendi public key'ini yükle ya da Oracle'ın ürettiğini indir (kaybetme)
   - "Out of capacity for shape" hatası alırsan: başka Availability Domain dene ya da birkaç saat sonra tekrar dene.
3. VM açılınca **Public IP**'yi not et.

## 2. Ağ portlarını aç (Oracle'da iki katman var)

**a) Cloud firewall:** Networking → VCN → Subnet → Security List → *Add Ingress Rules*:
Source `0.0.0.0/0`, TCP, Destination Port `80` ve ayrıca `443`.

**b) VM içindeki iptables** (Oracle Ubuntu imajında varsayılan olarak 80/443'ü kapatır):

```bash
ssh ubuntu@<PUBLIC_IP>

sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo apt-get update && sudo apt-get install -y iptables-persistent   # "Yes" de, kuralları kaydeder
sudo netfilter-persistent save
```

(`ufw` kullanma — Oracle imajında iptables ile çakışır.)

## 3. Ücretsiz alan adı (DuckDNS)

1. <https://www.duckdns.org> → GitHub/Google ile giriş → bir alt alan adı oluştur (örn. `dogumgunu-api`).
2. `current ip` alanına VM'in Public IP'sini yaz → *update ip*.
3. `DOMAIN` değerin: `dogumgunu-api.duckdns.org`

Public IP'yi sabit tutmak için Oracle'da instance'a **Reserved Public IP** ata
(Networking → Reserved Public IPs; free tier'da 1 tane ücretsiz) — aksi halde VM'i
durdurup başlatırsan IP değişebilir.

## 4. Docker kurulumu

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
exit   # yeniden bağlan
```

## 5. Kodu çek ve yapılandır

```bash
sudo mkdir -p /opt/dogumgunu && sudo chown $USER:$USER /opt/dogumgunu
git clone https://github.com/utkuu0/dogum-gunu-takvimi.git /opt/dogumgunu
cd /opt/dogumgunu/infra
cp .env.example .env
nano .env
```

`.env` içinde doldur:

| Değişken | Değer |
| --- | --- |
| `DOMAIN` | `dogumgunu-api.duckdns.org` |
| `POSTGRES_PASSWORD` | güçlü rastgele parola (`openssl rand -hex 24`) |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | iki ayrı rastgele değer (`openssl rand -hex 32`) |
| `GOOGLE_IOS/ANDROID/WEB_CLIENT_ID` | GCP Console'daki mevcut client ID'ler (değişmez) |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | mevcut service account JSON'unun base64'ü |

> Veriler önemsiz olduğu için eski GCP veritabanından taşıma yok; yeni DB boş başlar.
> Yeni JWT secret'ları kullanmak, eski token'ları geçersiz kılar — sorun değil, kullanıcılar tekrar giriş yapar.

## 6. İlk çalıştırma

```bash
cd /opt/dogumgunu/infra
docker compose -f docker-compose.prod.yml build api        # ARM'da ilk build birkaç dakika sürer
docker compose -f docker-compose.prod.yml run --rm migrate
docker compose -f docker-compose.prod.yml up -d

curl https://dogumgunu-api.duckdns.org/health    # {"status":"ok","database":"up"}
```

Sertifika alınamazsa: `docker compose -f docker-compose.prod.yml logs caddy`
(genelde DNS henüz yayılmamıştır ya da 80/443 hâlâ kapalıdır — 2. adımı kontrol et).

## 7. Günlük yedek

```bash
crontab -e
0 3 * * * cd /opt/dogumgunu/infra && ./backup-postgres.sh >> /var/log/dogumgunu-backup.log 2>&1
```

Yedekler `infra/backups/` altında kalır. Veri önemsiz olsa da arada bir kopyasını makinene indir:
`scp ubuntu@<IP>:/opt/dogumgunu/infra/backups/*.sql.gz .`

## 8. GitHub Actions ile otomatik deploy (opsiyonel)

`.github/workflows/api-deploy.yml` secret adlarında "HETZNER" geçse de **herhangi bir SSH sunucusunda** çalışır.
Repo → Settings → Secrets → Actions:

- `HETZNER_HOST` = VM'in Public IP'si
- `HETZNER_USER` = `ubuntu`
- `HETZNER_SSH_KEY` = bu VM'e girebilen, **parolasız** private key

## 9. Mobil uygulamayı yeni adrese bağla

`apps/mobile/.env`:

```
EXPO_PUBLIC_API_URL=https://dogumgunu-api.duckdns.org
```

Sonra build al (`EXPO_PUBLIC_*` değişkenleri build anında gömülür, değişirse yeniden build gerekir):

```bash
cd apps/mobile
eas build --profile preview --platform android
```

EAS build sunucusu `.env`'yi görmeyebilir; gerekirse `eas env:create` ile `EXPO_PUBLIC_API_URL`'i EAS'a da tanımla.

## Sorun giderme

- **VM'e dışarıdan erişilemiyor:** hem Security List hem `iptables` kuralları gerekir (2. adım).
- **Oracle idle VM'i geri alabilir:** düzenli çalışan API + günlük backup cron'u genelde bunu önler; yine de
  Oracle'dan gelen e-postaları takip et.
- **Yer kalmazsa / Oracle olmazsa:** aynı adımlar Hetzner CX22 (~4-5 €/ay) için de geçerli; sadece 2. adım
  (Oracle'a özel firewall) atlanır, README'deki `ufw` kurulumunu kullan.
