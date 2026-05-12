import { pool } from './src/database/connection';

(async () => {
  try {
    console.log('Testing appointment completion...');

    // Check appointments that should be completed
    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM appointments
      WHERE end_time < NOW()
        AND status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS')
    `);
    console.log('Appointments to complete:', result.rows[0].count);

    // Update them
    const updateResult = await pool.query(`
      UPDATE appointments
      SET status = 'COMPLETED'
      WHERE status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS')
        AND end_time < NOW()
    `);
    console.log('Updated appointments:', updateResult.rowCount);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
})();