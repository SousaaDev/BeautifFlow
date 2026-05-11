import { Pool } from 'pg';
import { connectDatabase } from '../src/database/connection';

async function addSettingsColumn() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Adding settings column to beauty_shops table...');

    await pool.query(`
      ALTER TABLE beauty_shops
      ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';
    `);

    console.log('✓ Settings column added successfully');
  } catch (error) {
    console.error('Error adding settings column:', error);
  } finally {
    await pool.end();
  }
}

// Run migration
addSettingsColumn();