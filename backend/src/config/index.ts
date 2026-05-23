// src/config/index.ts
// All configuration loaded from environment variables with validation

import dotenv from 'dotenv';
dotenv.config();

console.log("OpenRouter:", process.env.OPENROUTER_API_KEY ? "Loaded" : "Missing");
console.log("DB:", process.env.DATABASE_URL ? "Loaded" : "Missing");

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

function optional(key: string, defaultVal: string): string {
  return process.env[key] || defaultVal;
}

export const config = {
  env: optional('NODE_ENV', 'development'),
  isDev: optional('NODE_ENV', 'development') === 'development',

  server: {
    port: parseInt(optional('PORT', '4000')),
    host: optional('HOST', '0.0.0.0'),
  },

  database: {
    url: required('DATABASE_URL'),
  },

  redis: {
    url: optional('REDIS_URL', 'redis://localhost:6379'),
  },

  cors: {
    origins: optional('CORS_ORIGINS', 'http://localhost:3000').split(','),
  },

  rateLimit: {
    windowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '60000')), // 1 min
    maxRequests: parseInt(optional('RATE_LIMIT_MAX', '100')),
  },

  providers: {
    
    gemini: {
      
      apiKey: optional('GEMINI_API_KEY', ''),
      defaultModel: optional('GEMINI_MODEL', 'gemini-2.0-flash'),
    },
    openai: {
      apiKey: optional('OPENAI_API_KEY', ''),
      defaultModel: optional('OPENAI_MODEL', 'gpt-4o-mini'),
    },
    claude: {
      apiKey: optional('ANTHROPIC_API_KEY', ''),
      defaultModel: optional('CLAUDE_MODEL', 'claude-3-5-haiku-20241022'),
    },
    grok: {
      apiKey: optional('GROK_API_KEY', ''),
      baseUrl: optional('GROK_BASE_URL', 'https://api.x.ai/v1'),
      defaultModel: optional('GROK_MODEL', 'grok-beta'),
    },
     openrouter: {
      apiKey: optional('OPENROUTER_API_KEY', ''),
      defaultModel: optional('OPENROUTER_MODEL', 'qwen/qwen3.7-max'),
      siteUrl: optional('OPENROUTER_SITE_URL', 'http://localhost:3000'),
      siteName: optional('OPENROUTER_SITE_NAME', 'LLM Inference Platform'),
    },
  },

  queue: {
    logQueueName: 'inference-logs',
    analyticsQueueName: 'analytics',
    maxAttempts: 3,
    backoffDelay: 1000,
  },

  logging: {
    level: optional('LOG_LEVEL', 'info'),
  },

  pii: {
    redactionEnabled: optional('PII_REDACTION_ENABLED', 'true') === 'true',
  },
} as const;
