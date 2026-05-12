import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { connectDatabase } from './database/connection';
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

// Database connection
connectDatabase();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
