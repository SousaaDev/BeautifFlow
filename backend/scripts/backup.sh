#!/bin/bash
# BarberFlow PITR Backup Script
# Usage: ./backup.sh [base|wal]

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

case $1 in
  base)
    echo "Creating base backup..."
    psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT create_base_backup('base_backup_$TIMESTAMP');"
    pg_basebackup -h $DB_HOST -U $DB_USER -D $BACKUP_DIR/base_$TIMESTAMP -Ft -z -P
    psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT complete_base_backup();"
    echo "Base backup completed: $BACKUP_DIR/base_$TIMESTAMP"
    ;;
  wal)
    echo "WAL archiving is automatic via archive_command"
    ;;
  *)
    echo "Usage: $0 {base|wal}"
    exit 1
    ;;
esac
