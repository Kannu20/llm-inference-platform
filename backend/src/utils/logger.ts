// src/utils/logger.ts
import pino from 'pino';
import { config } from '../config';

const logger = pino({
  level: config.logging.level,
  ...(config.isDev && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
    },
  }),
});

export default logger;
