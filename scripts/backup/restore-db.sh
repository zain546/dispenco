#!/usr/bin/env bash
# ==============================================================================
# Dispenco — PostgreSQL Restore & Verification Script
# ==============================================================================
# Modes:
#   1. --verify <backup_file>
#      Spins up a temporary test database (`dispenco_restore_verify`) inside the
#      Postgres container, restores the backup into it, prints row counts for key
#      pharmacy tables (Tenant, User, Product, Batch, Sale, Invoice), and drops
#      the temporary database. Safe to run at any time on production!
#
#   2. --restore-production <backup_file>
#      Restores the backup into the live database (`dispenco_db`). Prompts for
#      explicit confirmation and creates a pre-restore safety snapshot first.
#
# If the file ends with `.age`, set AGE_KEY_FILE=/path/to/backup-key.txt.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source <(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "${ENV_FILE}" | sed 's/\r$//')
  set +a
fi

CONTAINER_NAME="${POSTGRES_CONTAINER:-dispenco_postgres_prod}"
DB_USER="${POSTGRES_USER:-dispenco_user}"
DB_NAME="${POSTGRES_DB:-dispenco_db}"
AGE_KEY_FILE="${AGE_KEY_FILE:-/root/.config/dispenco/backup-key.txt}"

usage() {
  cat <<EOF
Usage:
  $0 --verify <path/to/backup.dump[.age]>
  $0 --restore-production <path/to/backup.dump[.age]>
EOF
  exit 1
}

if [[ $# -lt 2 ]]; then
  usage
fi

MODE="$1"
INPUT_FILE="$2"

if [[ ! -f "${INPUT_FILE}" ]]; then
  echo "ERROR: Backup file not found: ${INPUT_FILE}" >&2
  exit 1
fi

# Verify SHA-256 checksum if present
if [[ -f "${INPUT_FILE}.sha256" ]]; then
  echo "Verifying SHA-256 checksum..."
  (cd "$(dirname "${INPUT_FILE}")" && sha256sum -c "$(basename "${INPUT_FILE}.sha256")")
fi

TEMP_DUMP=""
cleanup() {
  if [[ -n "${TEMP_DUMP}" && -f "${TEMP_DUMP}" ]]; then
    shred -u "${TEMP_DUMP}" 2>/dev/null || rm -f "${TEMP_DUMP}"
  fi
}
trap cleanup EXIT

# Decrypt if `.age`
if [[ "${INPUT_FILE}" == *.age ]]; then
  if [[ ! -f "${AGE_KEY_FILE}" ]]; then
    echo "ERROR: Encrypted backup requires AGE_KEY_FILE (not found at ${AGE_KEY_FILE})." >&2
    exit 1
  fi
  TEMP_DUMP="$(mktemp /tmp/dispenco_restore_XXXXXX.dump)"
  echo "Decrypting ${INPUT_FILE}..."
  age -d -i "${AGE_KEY_FILE}" -o "${TEMP_DUMP}" "${INPUT_FILE}"
  DUMP_PATH="${TEMP_DUMP}"
else
  DUMP_PATH="${INPUT_FILE}"
fi

print_table_counts() {
  local target_db="$1"
  echo "------------------------------------------------------------------"
  echo "Row counts in '${target_db}':"
  docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${target_db}" -Atc "
    SELECT relname || ': ' || n_live_tup
    FROM pg_stat_user_tables
    ORDER BY n_live_tup DESC;
  "
  echo "------------------------------------------------------------------"
}

case "${MODE}" in
  --verify)
    VERIFY_DB="dispenco_restore_verify"
    echo "[1/4] Creating temporary verification database '${VERIFY_DB}'..."
    docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${VERIFY_DB};" >/dev/null
    docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${VERIFY_DB};" >/dev/null

    echo "[2/4] Restoring backup into '${VERIFY_DB}'..."
    docker exec -i "${CONTAINER_NAME}" pg_restore -U "${DB_USER}" -d "${VERIFY_DB}" --no-owner --no-acl < "${DUMP_PATH}"

    echo "[3/4] Running ANALYZE and inspecting restored tables..."
    docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${VERIFY_DB}" -c "ANALYZE;" >/dev/null
    print_table_counts "${VERIFY_DB}"

    echo "[4/4] Dropping temporary verification database '${VERIFY_DB}'..."
    docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${VERIFY_DB};" >/dev/null
    echo "SUCCESS: Backup '${INPUT_FILE}' is valid and restorable!"
    ;;

  --restore-production)
    echo "WARNING: This will overwrite the LIVE database '${DB_NAME}' in '${CONTAINER_NAME}'!"
    read -r -p "Type 'RESTORE-DISPENCO-LIVE' to confirm: " CONFIRM
    if [[ "${CONFIRM}" != "RESTORE-DISPENCO-LIVE" ]]; then
      echo "Aborted."
      exit 1
    fi

    echo "[1/3] Taking pre-restore safety snapshot..."
    "${SCRIPT_DIR}/backup-db.sh"

    echo "[2/3] Restoring into '${DB_NAME}' (--clean --if-exists)..."
    docker exec -i "${CONTAINER_NAME}" pg_restore -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists --no-owner --no-acl < "${DUMP_PATH}"

    echo "[3/3] Analyzing and verifying table counts..."
    docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -c "ANALYZE;" >/dev/null
    print_table_counts "${DB_NAME}"
    echo "SUCCESS: Live database '${DB_NAME}' restored from '${INPUT_FILE}'."
    ;;

  *)
    usage
    ;;
esac
