#!/bin/bash
# BarberFlow PITR Recovery Script
# Usage: ./recover.sh <target_time> <backup_path>

TARGET_TIME=$1
BACKUP_PATH=$2

if [ -z "$TARGET_TIME" ] || [ -z "$BACKUP_PATH" ]; then
  echo "Usage: $0 <target_time> <backup_path>"
  echo "Example: $0 '2024-01-15 10:30:00' ./backups/base_20240115_100000"
  exit 1
fi

echo "Setting up PITR recovery to: $TARGET_TIME"
echo "Using backup: $BACKUP_PATH"

# Stop PostgreSQL
sudo systemctl stop postgresql

# Restore base backup
sudo -u postgres pg_restore -d postgres $BACKUP_PATH

# Create recovery.conf
cat > /var/lib/postgresql/data/recovery.conf << EOF
restore_command = 'cp ./backups/%f %p'
recovery_target_time = '$TARGET_TIME'
recovery_target_action = 'promote'
EOF

# Start PostgreSQL (will enter recovery mode)
sudo systemctl start postgresql

echo "Recovery initiated. Monitor logs for completion."
