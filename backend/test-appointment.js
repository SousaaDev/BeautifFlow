const { pool } = require('./src/database/connection');

(async () => {
  try {
    const result = await pool.query(`
      INSERT INTO appointments (id, tenant_id, customer_id, professional_id, service_id, start_time, end_time, status)
      VALUES (gen_random_uuid(), '550e8400-e29b-41d4-a716-446655440000',
        (SELECT id FROM customers LIMIT 1),
        (SELECT id FROM professionals LIMIT 1),
        (SELECT id FROM services LIMIT 1),
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '1 hour',
        'CONFIRMED')
      RETURNING id
    `);
    console.log('Test appointment created:', result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
})();