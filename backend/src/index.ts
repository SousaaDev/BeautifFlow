import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { connectDatabase, pool } from './database/connection';
import { setupRoutes } from './routes';
import { redisClient } from './infrastructure/redis';
import { WorkerService } from './infrastructure/workers';
import { auditMiddleware } from './middleware/audit.middleware';

console.log('Starting BeautyFlow backend...');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet());

const allowedOrigins: string[] = [
  process.env.FRONTEND_URL || '',
  'https://frontend-production-811b3.up.railway.app', // Sua URL de produção
  'http://localhost:3000',
  'http://localhost:3001'
].filter(Boolean); // Remove strings vazias e garante apenas strings válidas

app.use(
  cors({
    origin: (origin, callback) => {
      // Se não houver origin (ex: chamadas internas do próprio server), ou se estiver na lista
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS origin denied: ${origin}`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

app.use(express.json());
app.use(auditMiddleware);

// Initialize Infrastructure
(async () => {
  let redisConnected = false;
  try {
    console.log('Attempting to connect to Redis...');
    await redisClient.connect();
    redisConnected = true;
    WorkerService.startAllWorkers();
  } catch (error) {
    console.warn('⚠️  Redis not available - running without cache and distributed locks');
    console.warn('⚠️  Some background workers disabled');
    console.warn('⚠️  To enable Redis features: install and start Redis server');
  }

  // Start appointment completion worker regardless of Redis status
  console.log('Starting appointment completion worker...');
  WorkerService.startAppointmentCompletionWorker();
  console.log('✓ Appointment completion worker started');
})();

// Routes
setupRoutes(app);

const ensureCustomerSchema = async () => {
  try {
    await pool.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS password_hash VARCHAR(200);`);
    await pool.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;`);
    await pool.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS birth_date DATE;`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS professional_services (
        professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        PRIMARY KEY (professional_id, service_id)
      );
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_professional_services_service ON professional_services(service_id);`
    );
    await pool.query(`
      INSERT INTO professional_services (professional_id, service_id)
      SELECT p.id, s.id FROM professionals p
      INNER JOIN services s ON s.tenant_id = p.tenant_id AND s.is_active = true
      ON CONFLICT DO NOTHING
    `);
    console.log('Ensured customers schema is up to date');
  } catch (error) {
    console.warn('Warning: failed to ensure customers schema:', error);
  }
};

const startServer = async () => {
  await connectDatabase();
  await ensureCustomerSchema();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
