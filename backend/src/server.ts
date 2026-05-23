// src/server.ts
// Main server entry point
// Sets up Express, Socket.io, BullMQ workers, and Prometheus metrics

import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { Server as SocketServer } from 'socket.io';
import { collectDefaultMetrics, Registry, Counter, Histogram } from 'prom-client';

import { config } from './config';
import { apiRateLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { eventBus, Events } from './events/eventBus';
import { startLogProcessorWorker, startAnalyticsWorker } from './workers/logProcessor';
import logger from './utils/logger';
import prisma from './db/prismaClient';

// Routes
import logsRouter from './api/routes/logs';
import conversationRouter from './api/routes/conversations';
import chatRouter from './api/routes/chat';
import dashboardRouter from './api/routes/dashboard';
import openrouterRouter from './api/routes/openrouter';

// ── App setup ────────────────────────────────────────────────
const app = express();
const httpServer = http.createServer(app);

// ── Prometheus metrics ────────────────────────────────────────
const register = new Registry();
collectDefaultMetrics({ register });

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [50, 100, 200, 300, 500, 1000, 2000, 5000],
  registers: [register],
});

const inferenceCounter = new Counter({
  name: 'llm_inference_total',
  help: 'Total LLM inference requests',
  labelNames: ['provider', 'model', 'status'],
  registers: [register],
});

// ── Socket.io setup ───────────────────────────────────────────
const io = new SocketServer(httpServer, {
  cors: {
    origin: config.cors.origins,
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

io.on('connection', (socket) => {
  logger.debug({ socketId: socket.id }, 'Socket client connected');

  socket.on('join:dashboard', () => {
    socket.join('dashboard');
    logger.debug({ socketId: socket.id }, 'Client joined dashboard room');
  });

  socket.on('join:conversation', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
  });

  socket.on('disconnect', () => {
    logger.debug({ socketId: socket.id }, 'Socket client disconnected');
  });
});

// Broadcast new log events to dashboard room
eventBus.on(Events.LOG_INGESTED, (payload) => {
  io.to('dashboard').emit('log:new', payload);
  inferenceCounter.inc({
    provider: payload.provider,
    model: payload.model,
    status: payload.status,
  });
});

// ── Express middleware ─────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.cors.origins, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (config.isDev) {
  app.use(morgan('dev'));
}

// Request duration tracking
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    httpRequestDuration.observe(
      { method: req.method, route: req.route?.path || req.path, status_code: res.statusCode },
      Date.now() - start
    );
  });
  next();
});

app.use(apiRateLimiter);

// ── Routes ────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/api/logs', logsRouter);
app.use('/api/conversations', conversationRouter);
app.use('/api/chat', chatRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/openrouter', openrouterRouter);

app.use(notFoundHandler);
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────
async function start() {
  try {
    // Test DB connection
    await prisma.$connect();
    logger.info('Database connected');

    // Start BullMQ workers
    startLogProcessorWorker();
    startAnalyticsWorker();

    httpServer.listen(config.server.port, config.server.host, () => {
      logger.info(
        { port: config.server.port, env: config.env },
        '🚀 Server started'
      );
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

start();

export { app, io };
