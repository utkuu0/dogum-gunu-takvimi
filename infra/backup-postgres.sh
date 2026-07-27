#!/usr/bin/env bash
# Günlük Postgres yedeği. VPS'te crontab ile bu script'in bulunduğu dizinden (infra/)
# çağrılması bekleniyor — bkz. README "Hetzner VPS kurulumu" bölümü.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

set -a
source .env
set +a

mkdir -p "$BACKUP_DIR"

OUT_FILE="$BACKUP_DIR/${POSTGRES_DB}-${TIMESTAMP}.sql.gz"

docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$OUT_FILE"

find "$BACKUP_DIR" -name '*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete

echo "Backup tamamlandı: $OUT_FILE"
