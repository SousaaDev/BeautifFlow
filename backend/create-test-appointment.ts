import { pool } from './src/database/connection';

(async () => {
  try {
    console.log('Creating test appointment...');

    // Create a test appointment that ended 10 minutes ago
    const result = await pool.query(`
      INSERT INTO appointments (id, tenant_id, customer_id, professional_id, service_id, start_time, end_time, status)
      VALUES (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000',
        (SELECT id FROM customers LIMIT 1),
        (SELECT id FROM professionals LIMIT 1),
        (SELECT id FROM services LIMIT 1),
        NOW() - INTERVAL '30 minutes',
        NOW() - INTERVAL '10 minutes',
        'CONFIRMED')
      RETURNING id, status, end_time
    `);
    console.log('Created test appointment:', result.rows[0]);

    // Check how many appointments need completion
    const countResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM appointments
      WHERE end_time < NOW()
        AND status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS')
    `);
    console.log('Appointments to complete:', countResult.rows[0].count);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
})();