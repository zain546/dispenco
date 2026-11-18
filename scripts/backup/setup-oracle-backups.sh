#!/usr/bin/env bash
# ==============================================================================
# Dispenco — One-Time Backup Setup on Oracle Ubuntu 24.04 VM
# ==============================================================================
# Installs `age` (encryption) and `rclone` (off-site cloud sync), creates the
# local backup directory `/var/backups/dispenco`, generates an `age` keypair if
# none exists, and installs the 6-hourly cron job in `/etc/cron.d/dispenco-backup`.
# ==============================================================================

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run with sudo: sudo ./scripts/backup/setup-oracle-backups.sh" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "[1/5] Installing age and rclone..."
apt-get update -qq
apt-get install -y -qq age rclone curl

echo "[2/5] Preparing backup directories and permissions..."
mkdir -p /var/backups/dispenco/{daily,weekly,monthly}
chmod 700 /var/backups/dispenco
chmod +x "${SCRIPT_DIR}/backup-db.sh" "${SCRIPT_DIR}/restore-db.sh"

KEY_DIR="/root/.config/dispenco"
KEY_FILE="${KEY_DIR}/backup-key.txt"
mkdir -p "${KEY_DIR}"
chmod 700 "${KEY_DIR}"

if [[ ! -f "${KEY_FILE}" ]]; then
  echo "[3/5] Generating new age encryption keypair..."
  age-keygen -o "${KEY_FILE}"
  chmod 600 "${KEY_FILE}"
else
  echo "[3/5] Existing age key found at ${KEY_FILE}."
fi

PUB_KEY="$(grep 'public key:' "${KEY_FILE}" | awk '{print $NF}')"

echo "[4/5] Installing 6-hourly cron schedule at /etc/cron.d/dispenco-backup..."
cat >/etc/cron.d/dispenco-backup <<EOF
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
# Run Dispenco database backup every 6 hours (00:15, 06:15, 12:15, 18:15 UTC)
15 */6 * * * root ${SCRIPT_DIR}/backup-db.sh >> /var/log/dispenco-backup.log 2>&1
EOF
chmod 644 /etc/cron.d/dispenco-backup

echo "[5/5] Running initial backup and verification test..."
"${SCRIPT_DIR}/backup-db.sh"

LATEST_DUMP="$(ls -1t /var/backups/dispenco/daily/dispenco_* | grep -v '\.sha256$' | head -n 1)"
AGE_KEY_FILE="${KEY_FILE}" "${SCRIPT_DIR}/restore-db.sh" --verify "${LATEST_DUMP}"

cat <<EOF

================================================================================
✅ DISPENCO BACKUP SYSTEM INSTALLED SUCCESSFULLY
================================================================================
1. IMPORTANT — SAVE THIS PRIVATE KEY IN YOUR PASSWORD MANAGER (Bitwarden/1Password)
   AND ON YOUR PC! Without it, encrypted backups CANNOT be decrypted if the VM dies:
   Run: sudo cat ${KEY_FILE}

2. Your age PUBLIC key (safe to put in ${REPO_ROOT}/.env):
   BACKUP_AGE_RECIPIENT=${PUB_KEY}

3. To enable off-site cloud sync (Cloudflare R2 or Backblaze B2):
   Run: sudo rclone config
   Create a remote named 'r2', then add to ${REPO_ROOT}/.env:
   BACKUP_RCLONE_REMOTE=r2:dispenco-backups
================================================================================
EOF
