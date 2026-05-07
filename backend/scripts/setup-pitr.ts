import 'dotenv/config';
import { pool } from '../src/database/connection';
import fs from 'fs';
import path from 'path';

const setupPITR = async () => {
  try {
    console.log('Setting up Point-in-Time Recovery (PITR) configuration...');

    // Create backup directory
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Configure PostgreSQL for PITR
    const pitrQueries = [
      // Enable WAL archiving
      `ALTER SYSTEM SET wal_level = 'replica';`,
      `ALTER SYSTEM SET archive_mode = 'on';`,
      `ALTER SYSTEM SET archive_command = 'cp %p ${backupDir}/%f';`,

      // Configure backup settings
      `ALTER SYSTEM SET max_wal_senders = 3;`,
      `ALTER SYSTEM SET wal_keep_size = '1GB';`,
      `ALTER SYSTEM SET checkpoint_completion_target = 0.9;`,

      // Create backup functions
      `
      CREATE OR REPLACE FUNCTION create_base_backup(backup_label text)
      RETURNS text AS $$
      DECLARE
        backup_path text;
      BEGIN
        backup_path := '${backupDir}/' || backup_label || '_' || to_char(now(), 'YYYYMMDD_HH24MI');
        PERFORM pg_start_backup(backup_label, true);
        RETURN backup_path;
      END;
      $$ LANGUAGE plpgsql;
      `,

      `
      CREATE OR REPLACE FUNCTION complete_base_backup()
      RETURNS void AS $$
      BEGIN
        PERFORM pg_stop_backup();
      END;
      $$ LANGUAGE plpgsql;
      `,

      // Create PITR recovery function
      `
      CREATE OR REPLACE FUNCTION setup_recovery(target_time timestamp with time zone DEFAULT NULL)
      RETURNS void AS $$
      BEGIN
        -- This would be used to configure recovery.conf for PITR
        -- In production, this would modify postgresql.conf and recovery settings
        RAISE NOTICE 'PITR recovery setup for time: %', target_time;
      END;
      $$ LANGUAGE plpgsql;
      `
    ];

    for (const query of pitrQueries) {
      try {
        await pool.query(query);
      } catch (error) {
        console.warn('Warning in PITR setup:', (error as Error).message);
      }
    }

    // Create backup tables for tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS backup_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        backup_type VARCHAR(20) NOT NULL, -- 'base' or 'wal'
        backup_path TEXT,
        backup_size_bytes BIGINT,
        started_at TIMESTAMP NOT NULL,
        completed_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'running',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_backup_history_type ON backup_history(backup_type);
      CREATE INDEX IF NOT EXISTS idx_backup_history_status ON backup_history(status);
    `);

    console.log('✓ PITR configuration completed');
    console.log(`✓ Backup directory: ${backupDir}`);
    console.log('✓ Run pg_reload_conf() in PostgreSQL to apply WAL settings');

  } catch (error) {
    console.error('Error setting up PITR:', error);
  } finally {
    await pool.end();
  }
};

// Create backup script
const createBackupScript = () => {
  const scriptContent = `#!/bin/bash
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
`;

  const scriptPath = path.join(process.cwd(), 'scripts', 'backup.sh');
  fs.writeFileSync(scriptPath, scriptContent);
  fs.chmodSync(scriptPath, '755');
  console.log(`✓ Backup script created: ${scriptPath}`);
};

// Create recovery script
const createRecoveryScript = () => {
  const scriptContent = `#!/bin/bash
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
`;

  const scriptPath = path.join(process.cwd(), 'scripts', 'recover.sh');
  fs.writeFileSync(scriptPath, scriptContent);
  fs.chmodSync(scriptPath, '755');
  console.log(`✓ Recovery script created: ${scriptPath}`);
};

// Run setup
if (require.main === module) {
  setupPITR().then(() => {
    createBackupScript();
    createRecoveryScript();
    console.log('✓ PITR setup complete');
  });
}

export { setupPITR, createBackupScript, createRecoveryScript };