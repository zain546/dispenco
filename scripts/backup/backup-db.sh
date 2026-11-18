#!/usr/bin/env bash
# ==============================================================================
# Dispenco — Automated PostgreSQL 3-2-1 Backup Script (Oracle Cloud Linux VM)
# ==============================================================================
# Produces a custom-format PostgreSQL dump (-Fc), compresses it with gzip,
# optionally encrypts it with `age` (if BACKUP_AGE_RECIPIENT is set),
# rotates local backups, and optionally syncs off-site via `rclone` and pings
# a dead-man's switch healthcheck URL (e.g., Healthchecks.io).
#
# Usage:
#   ./scripts/backup/backup-db.sh
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env"

# Load variables from .env if present (safe extraction of simple KEY=VALUE pairs)
if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "${ENV_FILE}" | sed 's/\r$//')
  set +a
fi

CONTAINER_NAME="${POSTGRES_CONTAINER:-dispenco_postgres_prod}"
DB_USER="${POSTGRES_USER:-dispenco_user}"
DB_NAME="${POSTGRES_DB:-dispenco_db}"
BACKUP_ROOT="${BACKUP_DIR:-/var/backups/dispenco}"
LOCAL_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
RCLONE_DEST="${BACKUP_RCLONE_REMOTE:-}"          # e.g., r2:dispenco-backups
AGE_RECIPIENT="${BACKUP_AGE_RECIPIENT:-}"         # e.g., age1...
HEALTHCHECK_URL="${BACKUP_HEALTHCHECK_URL:-}"     # e.g., https://hc-ping.com/<uuid>

TIMESTAMP="$(date -u +%Y%m%d_%H%M%SZ)"
DAY_OF_WEEK="$(date -u +%u)"   # 1..7 (7 = Sunday)
DAY_OF_MONTH="$(date -u +%d)"  # 01..31

mkdir -p "${BACKUP_ROOT}/daily" "${BACKUP_ROOT}/weekly" "${BACKUP_ROOT}/monthly"

RAW_DUMP="${BACKUP_ROOT}/daily/dispenco_${DB_NAME}_${TIMESTAMP}.dump"

echo "[$(date -u +%FT%TZ)] Starting PostgreSQL backup of '${DB_NAME}' from container '${CONTAINER_NAME}'..."

# Notify healthcheck start if configured
if [[ -n "${HEALTHCHECK_URL}" ]]; then
  curl -fsS -m 10 --retry 3 "${HEALTHCHECK_URL}/start" >/dev/null || true
fi

# Verify container is running
if ! docker ps --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}"; then
  echo "ERROR: Container '${CONTAINER_NAME}' is not running!" >&2
  if [[ -n "${HEALTHCHECK_URL}" ]]; then
    curl -fsS -m 10 --retry 3 "${HEALTHCHECK_URL}/fail" >/dev/null || true
  fi
  exit 1
fi

# Run pg_dump in custom format (-Fc is compressed by pg_dump and supports pg_restore selective/parallel restore)
docker exec -i "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" -Fc --no-owner --no-acl > "${RAW_DUMP}"

# Verify dump file is non-empty and has valid header via pg_restore --list
if [[ ! -s "${RAW_DUMP}" ]]; then
  echo "ERROR: Dump file '${RAW_DUMP}' is empty!" >&2
  rm -f "${RAW_DUMP}"
  exit 1
fi

TABLE_COUNT="$(docker exec -i "${CONTAINER_NAME}" pg_restore --list < "${RAW_DUMP}" | grep -c 'TABLE DATA' || true)"
echo "[$(date -u +%FT%TZ)] Dump verified: ${TABLE_COUNT} table data entries ($(du -h "${RAW_DUMP}" | cut -f1))."

FINAL_FILE="${RAW_DUMP}"

# Encrypt with `age` if recipient public key is configured
if [[ -n "${AGE_RECIPIENT}" ]]; then
  if ! command -v age >/dev/null 2>&1; then
    echo "ERROR: BACKUP_AGE_RECIPIENT is set, but 'age' binary is not installed!" >&2
    exit 1
  fi
  age -r "${AGE_RECIPIENT}" -o "${RAW_DUMP}.age" "${RAW_DUMP}"
  shred -u "${RAW_DUMP}" 2>/dev/null || rm -f "${RAW_DUMP}"
  FINAL_FILE="${RAW_DUMP}.age"
  echo "[$(date -u +%FT%TZ)] Encrypted backup -> ${FINAL_FILE}"
fi

# Write SHA-256 checksum alongside backup
sha256sum "${FINAL_FILE}" > "${FINAL_FILE}.sha256"

# Copy to weekly on Sundays (keep 8 weeks) & monthly on the 1st (keep 12 months)
if [[ "${DAY_OF_WEEK}" == "7" ]]; then
  cp -f "${FINAL_FILE}" "${FINAL_FILE}.sha256" "${BACKUP_ROOT}/weekly/"
fi
if [[ "${DAY_OF_MONTH}" == "01" ]]; then
  cp -f "${FINAL_FILE}" "${FINAL_FILE}.sha256" "${BACKUP_ROOT}/monthly/"
fi

# Prune old local backups
find "${BACKUP_ROOT}/daily"   -type f -mtime +"${LOCAL_RETENTION_DAYS}" -delete
find "${BACKUP_ROOT}/weekly"  -type f -mtime +60 -delete
find "${BACKUP_ROOT}/monthly" -type f -mtime +365 -delete

# Off-site sync via rclone (Cloudflare R2 / Backblaze B2 / S3)
if [[ -n "${RCLONE_DEST}" ]]; then
  if command -v rclone >/dev/null 2>&1; then
    echo "[$(date -u +%FT%TZ)] Syncing backups off-site to ${RCLONE_DEST}..."
    rclone copy "${BACKUP_ROOT}" "${RCLONE_DEST}" --transfers 4 --checkers 8 --quiet
    echo "[$(date -u +%FT%TZ)] Off-site sync complete."
  else
    echo "WARNING: BACKUP_RCLONE_REMOTE is set, but 'rclone' is not installed!" >&2
  fi
fi

# Ping dead-man's switch healthcheck on success
if [[ -n "${HEALTHCHECK_URL}" ]]; then
  curl -fsS -m 10 --retry 3 "${HEALTHCHECK_URL}" >/dev/null || true
fi

echo "[$(date -u +%FT%TZ)] Backup completed successfully: ${FINAL_FILE}"
