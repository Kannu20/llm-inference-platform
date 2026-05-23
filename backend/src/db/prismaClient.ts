// src/db/prismaClient.ts
// Singleton Prisma client — prevents connection pool exhaustion in dev hot-reload

import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: config.isDev ? ['query', 'error', 'warn'] : ['error'],
  });

if (config.isDev) globalForPrisma.prisma = prisma;

export default prisma;
