// backend/src/db/seed.ts
// Seeds the database with demo data for development

import prisma from './prismaClient';
import { v4 as uuidv4 } from 'uuid';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create demo session
  const sessionId = uuidv4();
  const session = await prisma.session.create({
    data: {
      id: sessionId,
      ipAddress: '127.0.0.1',
      userAgent: 'Demo Seed',
    },
  });

  // Create demo conversations
  const providers: Array<{ provider: any; model: string }> = [
    { provider: 'GEMINI', model: 'gemini-2.0-flash' },
    { provider: 'OPENAI', model: 'gpt-4o-mini' },
    { provider: 'CLAUDE', model: 'claude-3-5-haiku-20241022' },
    { provider: 'OPENROUTER', model: 'qwen/qwen3.7-max' }
  ];

  for (const { provider, model } of providers) {
    const conv = await prisma.conversation.create({
      data: {
        sessionId: session.id,
        title: `Demo ${provider} Conversation`,
        provider,
        model,
      },
    });

    const userMsg = await prisma.message.create({
      data: {
        conversationId: conv.id,
        role: 'user',
        content: 'What is the capital of France?',
        tokenCount: 9,
      },
    });

    const assistantMsg = await prisma.message.create({
      data: {
        conversationId: conv.id,
        role: 'assistant',
        content: 'The capital of France is Paris.',
        tokenCount: 8,
      },
    });

    // Create inference log
    const startedAt = new Date(Date.now() - Math.random() * 3600000);
    const latencyMs = Math.floor(200 + Math.random() * 800);
    await prisma.inferenceLog.create({
      data: {
        messageId: assistantMsg.id,
        conversationId: conv.id,
        sessionId: session.id,
        provider,
        model,
        status: 'SUCCESS',
        inputTokens: 9,
        outputTokens: 8,
        totalTokens: 17,
        latencyMs,
        requestDurationMs: latencyMs + Math.floor(Math.random() * 200),
        startedAt,
        completedAt: new Date(startedAt.getTime() + latencyMs + 200),
        inputPreview: 'What is the capital of France?',
        outputPreview: 'The capital of France is Paris.',
        isStreaming: true,
      },
    });
  }

  // Seed additional random inference logs for dashboard charts
  const now = new Date();
  for (let i = 0; i < 50; i++) {
    const provider = providers[Math.floor(Math.random() * providers.length)];
    const startedAt = new Date(now.getTime() - Math.random() * 3600000);
    const latencyMs = Math.floor(100 + Math.random() * 2000);
    const status = Math.random() > 0.05 ? 'SUCCESS' : 'ERROR';

    await prisma.inferenceLog.create({
      data: {
        conversationId: uuidv4(), // orphaned logs for analytics
        sessionId: session.id,
        provider: provider.provider,
        model: provider.model,
        status,
        inputTokens: Math.floor(50 + Math.random() * 500),
        outputTokens: Math.floor(50 + Math.random() * 1000),
        totalTokens: Math.floor(100 + Math.random() * 1500),
        latencyMs,
        requestDurationMs: latencyMs + Math.floor(Math.random() * 300),
        startedAt,
        completedAt: new Date(startedAt.getTime() + latencyMs + 200),
        isStreaming: Math.random() > 0.3,
        errorMessage: status === 'ERROR' ? 'Provider timeout' : null,
      },
    });
  }

  console.log('✅ Seed complete!');
  console.log(`   Session ID: ${sessionId} (use in browser for demo data)`);
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
