import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { connectDatabase } from './database/connection';
import { setupRoutes } from './routes';
import { redisClient } from './infrastructure/redis';
import { WorkerService } from './infrastructure/workers';
import { auditMiddleware } from './middleware/audit.middleware';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL, // Isso reflete a origem da requisição, permitindo o acesso
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);

app.use(express.json());
app.use(auditMiddleware);

// Initialize Infrastructure
(async () => {
  try {
    await redisClient.connect();
    console.log('✓ Redis connected');
    WorkerService.startAllWorkers();
  } catch (error) {
    console.warn('⚠️  Redis not available - running without cache and distributed locks');
    console.warn('⚠️  Background workers disabled');
    console.warn('⚠️  To enable Redis features: install and start Redis server');
  }
})();

// Routes
setupRoutes(app);

// Database connection
connectDatabase();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
