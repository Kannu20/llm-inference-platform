# LLM Inference Logging & Ingestion Platform

A production-grade, full-stack LLM observability platform with multi-provider support, real-time streaming, and comprehensive analytics.

---

## A. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                       │
│                                                                             │
│   ┌──────────────────────────────────────────────────────────────────┐     │
│   │                   Next.js 15 Frontend                            │     │
│   │   ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌──────────┐  │     │
│   │   │   Chat   │  │  Conversations│  │Dashboard │  │ Settings │  │     │
│   │   │   Page   │  │     List     │  │   Page   │  │   Page   │  │     │
│   │   └────┬─────┘  └──────┬───────┘  └────┬─────┘  └────┬─────┘  │     │
│   │        │               │               │              │         │     │
│   │        └───────────────┴───────────────┴──────────────┘         │     │
│   │                              │                                   │     │
│   │                     Zustand Store + SDK                          │     │
│   └──────────────────────────────┬───────────────────────────────────┘     │
└──────────────────────────────────│─────────────────────────────────────────┘
                                   │ HTTP / WebSocket (Socket.io)
┌──────────────────────────────────▼─────────────────────────────────────────┐
│                          API GATEWAY LAYER                                  │
│                                                                             │
│   ┌────────────────────────────────────────────────────────────────────┐   │
│   │              Express.js API Server (Node.js + TypeScript)          │   │
│   │                                                                    │   │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │   │
│   │  │POST /logs│ │GET /logs │ │GET /conv │ │GET /dash │            │   │
│   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │   │
│   │                                                                    │   │
│   │  Middleware: Auth │ Rate Limit │ Validation │ PII Redaction       │   │
│   └──────────────────────────┬─────────────────────────────────────────┘   │
└─────────────────────────────│──────────────────────────────────────────────┘
                              │
         ┌────────────────────┼──────────────────────┐
         │                    │                       │
┌────────▼──────┐   ┌─────────▼──────┐   ┌──────────▼──────────┐
│   PostgreSQL   │   │     Redis       │   │   LLM Providers     │
│   (Prisma)    │   │  (BullMQ Queue) │   │                     │
│               │   │                 │   │  ┌───────────────┐  │
│ ┌───────────┐ │   │ ┌─────────────┐ │   │  │ Gemini (Free) │  │
│ │   Users   │ │   │ │  Log Queue  │ │   │  ├───────────────┤  │
│ ├───────────┤ │   │ ├─────────────┤ │   │  │   OpenAI      │  │
│ │Conversations│ │  │ │Retry Queue  │ │   │  ├───────────────┤  │
│ ├───────────┤ │   │ ├─────────────┤ │   │  │   Claude      │  │
│ │ Messages  │ │   │ │Failure Queue│ │   │  ├───────────────┤  │
│ ├───────────┤ │   │ └─────────────┘ │   │  │   Grok        │  │
│ │Inf. Logs  │ │   │                 │   │  └───────────────┘  │
│ ├───────────┤ │   │ Workers:        │   └─────────────────────┘
│ │ Sessions  │ │   │ LogProcessor    │
│ ├───────────┤ │   │ AnalyticsWorker │
│ │ Analytics │ │   └─────────────────┘
│ └───────────┘ │
└───────────────┘
         │
┌────────▼──────────────┐
│  Monitoring            │
│  Prometheus + Grafana  │
└────────────────────────┘
```

---

## B. Folder Structure

```
llm-inference-platform/
├── frontend/                      # Next.js 15 app
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── chat/
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── conversations/
│   │   │   │   └── page.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── TopBar.tsx
│   │   │   ├── chat/
│   │   │   │   ├── ChatWindow.tsx
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   ├── MessageInput.tsx
│   │   │   │   └── StreamingIndicator.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── MetricCard.tsx
│   │   │   │   ├── LatencyChart.tsx
│   │   │   │   ├── ProviderUsage.tsx
│   │   │   │   └── LogsTable.tsx
│   │   │   └── settings/
│   │   │       ├── ProviderConfig.tsx
│   │   │       └── ApiKeyForm.tsx
│   │   ├── stores/
│   │   │   ├── chatStore.ts
│   │   │   ├── settingsStore.ts
│   │   │   └── dashboardStore.ts
│   │   ├── hooks/
│   │   │   ├── useChat.ts
│   │   │   ├── useStream.ts
│   │   │   └── useDashboard.ts
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   ├── socket.ts
│   │   │   └── utils.ts
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   ├── tailwind.config.ts
│   └── next.config.ts
│
├── backend/                       # Express API server
│   ├── src/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── logs.ts
│   │   │   │   ├── conversations.ts
│   │   │   │   ├── chat.ts
│   │   │   │   └── dashboard.ts
│   │   │   ├── controllers/
│   │   │   │   ├── LogController.ts
│   │   │   │   ├── ConversationController.ts
│   │   │   │   ├── ChatController.ts
│   │   │   │   └── DashboardController.ts
│   │   │   └── validators/
│   │   │       ├── logSchema.ts
│   │   │       └── chatSchema.ts
│   │   ├── services/
│   │   │   ├── providers/
│   │   │   │   ├── BaseProvider.ts
│   │   │   │   ├── GeminiProvider.ts
│   │   │   │   ├── OpenAIProvider.ts
│   │   │   │   ├── ClaudeProvider.ts
│   │   │   │   └── GrokProvider.ts
|   |   |   |   |_ OpenRouter.ts
│   │   │   ├── logging/
│   │   │   │   ├── LogService.ts
│   │   │   │   └── PIIRedactor.ts
│   │   │   └── analytics/
│   │   │       └── AnalyticsService.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── rateLimit.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── requestLogger.ts
│   │   ├── workers/
│   │   │   ├── logProcessor.ts
│   │   │   └── analyticsWorker.ts
│   │   ├── events/
│   │   │   └── eventBus.ts
│   │   ├── config/
│   │   │   └── index.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── db/
│   │   │   └── prismaClient.ts
│   │   └── server.ts
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
│
├── sdk/                           # Inference Logging SDK
│   ├── src/
│   │   ├── core/
│   │   │   ├── InferenceLogger.ts
│   │   │   ├── LogQueue.ts
│   │   │   └── RetryManager.ts
│   │   ├── providers/
│   │   │   └── ProviderWrapper.ts
│   │   ├── utils/
│   │   │   ├── piiRedactor.ts
│   │   │   └── tokenCounter.ts
│   │   └── index.ts
│   └── package.json
│
├── k8s/                           # Kubernetes manifests
│   ├── base/
│   │   ├── namespace.yaml
│   │   ├── backend-deployment.yaml
│   │   ├── frontend-deployment.yaml
│   │   ├── postgres-statefulset.yaml
│   │   ├── redis-deployment.yaml
│   │   └── services.yaml
│   └── overlays/
│       ├── production/
│       └── staging/
│
├── docker/
│   └── docker-compose.yml
│
├── docs/
│   └── API.md
│
└── README.md
```

---

## C. Database Schema (Conceptual)

### Users
- id (UUID PK), email, name, api_key_hash, created_at, updated_at

### Sessions
- id (UUID PK), user_id (FK→Users), metadata (JSONB), started_at, last_active_at, ip_address, user_agent

### Conversations
- id (UUID PK), user_id (FK→Users), session_id (FK→Sessions), title, provider, model, system_prompt, created_at, updated_at, is_archived

### Messages
- id (UUID PK), conversation_id (FK→Conversations), role (enum: user/assistant/system), content (TEXT), token_count, created_at

### InferenceLogs
- id (UUID PK), message_id (FK→Messages), conversation_id (FK→Conversations), session_id (FK→Sessions)
- provider, model, status (enum: pending/success/error/cancelled)
- input_tokens, output_tokens, total_tokens
- latency_ms, request_duration_ms
- started_at, completed_at
- input_preview, output_preview (first 500 chars)
- error_message, error_code
- is_streaming, metadata (JSONB)

### Analytics (materialized/aggregated)
- id, period (hourly bucket), provider, model
- total_requests, success_count, error_count
- avg_latency_ms, p95_latency_ms, p99_latency_ms
- total_input_tokens, total_output_tokens
- created_at

### Key Indexes
- messages: (conversation_id, created_at)
- inference_logs: (conversation_id), (session_id), (started_at), (provider, status)
- analytics: (period, provider)

---

## E. API Contracts

```
POST   /api/logs                    — Ingest inference log
GET    /api/logs?page&limit&provider&status  — List logs
GET    /api/conversations           — List conversations
GET    /api/conversations/:id       — Get conversation with messages
DELETE /api/conversations/:id       — Archive conversation
POST   /api/chat/message            — Send chat message (streaming)
GET    /api/dashboard               — Aggregated metrics
GET    /api/dashboard/realtime      — WebSocket endpoint
```

---

## N. Architecture Notes

**Why BullMQ + Redis for log queue?**
Log writes are fire-and-forget from the SDK. Decoupling ingestion from DB writes via a queue prevents chat latency from being affected by log write failures or DB slowness. BullMQ provides retry, dead-letter queue, and rate limiting out of the box.

**Why event-driven for analytics?**
Analytics aggregation is expensive if done per-request. An event bus (EventEmitter + BullMQ delayed jobs) triggers aggregation periodically, not per log write. This is a pragmatic tradeoff for a startup.

**Why Prisma?**
Prisma gives us type-safe DB access with migration management. For a startup, the productivity gain outweighs raw performance vs. Drizzle. We can always swap if needed.

**Why Socket.io for real-time?**
Streaming LLM responses require SSE or WebSocket. Socket.io gives us both with fallback handling and room-based broadcasting for dashboard updates.

---

## O. Scaling Strategy

1. **Horizontal scaling**: Backend is stateless (sessions in Redis). Scale with K8s HPA.
2. **Queue-based ingestion**: BullMQ workers can scale independently.
3. **Read replicas**: Analytics queries hit a read replica.
4. **CDN**: Static Next.js assets behind CDN (Vercel/CloudFront).
5. **Connection pooling**: PgBouncer in front of Postgres.

---

## P. Failure Handling

- **Provider failure**: SDK catches, logs error status, tries next available provider if configured.
- **Queue overflow**: Redis max memory eviction policy set to `allkeys-lru`. Failed jobs go to dead-letter queue, retried 3x with exponential backoff.
- **DB unavailable**: Logs held in SDK memory (capped at 1000), written when DB recovers.
- **Frontend disconnect**: Streaming state preserved in Zustand. Resume on reconnect via session ID.

---

## Q. Tradeoffs

| Decision | Chosen | Alternative | Reason |
|---|---|---|---|
| ORM | Prisma | Drizzle | DX > raw perf for startup |
| Queue | BullMQ | Kafka | Simpler ops, sufficient scale |
| Auth | API key | JWT/OAuth | Simpler for assignment scope |
| SSE vs WS | Both | SSE only | WS needed for dashboard push |
| Analytics | Materialized in PG | ClickHouse | Avoids another service |

---

## R. Future Improvements

- OpenTelemetry integration for distributed tracing
- ClickHouse for analytics at 10M+ logs/day
- Fine-grained RBAC
- A/B testing provider routing
- Cost tracking per conversation
- Webhook support for log events
- SDK as npm package with tree-shaking

---

## S. Step-by-Step Implementation Plan

1. Set up monorepo structure + Docker Compose
2. Initialize Postgres + run Prisma migrations
3. Build Express backend with core routes
4. Implement provider adapters (Gemini first)
5. Build SDK with queue and retry logic
6. Wire backend log ingestion endpoint
7. Build Next.js frontend shell with sidebar
8. Implement chat UI with streaming
9. Build dashboard with Recharts
10. Add Socket.io for real-time dashboard
11. Implement BullMQ workers
12. Add rate limiting + PII redaction
13. Write Kubernetes manifests
14. Integration testing end-to-end
15. Add Prometheus metrics endpoint
