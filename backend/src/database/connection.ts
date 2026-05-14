import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // O Railway exige SSL para conexões externas
  ssl: {
    rejectUnauthorized: false
  }
});

export const connectDatabase = async () => {
  try {
    // É recomendável testar a conexão com um query simples
    const client = await pool.connect();
    console.log('Connected to PostgreSQL (Railway)');
    client.release(); // Sempre libere o cliente após testar
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

export { pool };