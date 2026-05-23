# API Documentation

Base URL: `http://localhost:4000`

All responses follow the structure:
```json
{
  "success": true,
  "data": {},
  "error": "string (on failure)",
  "meta": { "page": 1, "limit": 20, "total": 100 }
}
```

---

## Chat

### POST /api/chat/message
Send a chat message. Supports streaming via SSE.

**Request:**
```json
{
  "sessionId": "uuid",
  "conversationId": "uuid (optional — omit to create new)",
  "messages": [
    { "role": "user", "content": "Hello!" }
  ],
  "provider": "GEMINI | OPENAI | CLAUDE | GROK",
  "model": "gemini-2.0-flash (optional)",
  "systemPrompt": "You are a helpful assistant (optional)",
  "stream": true
}
```

**Streaming Response** (`Content-Type: text/event-stream`):
```
data: {"type":"meta","conversationId":"uuid","logId":"uuid"}

data: {"type":"content","content":"Hello"}

data: {"type":"content","content":"! How"}

data: {"type":"done"}
```

**Non-streaming Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "uuid",
    "messageId": "uuid",
    "content": "Hello! How can I help you?",
    "usage": { "inputTokens": 10, "outputTokens": 20, "totalTokens": 30 }
  }
}
```

**Rate limit:** 30 requests/minute per session

---

## Logs

### POST /api/logs
Ingest an inference log from the SDK. Returns immediately (async write).

**Request:**
```json
{
  "conversationId": "uuid",
  "sessionId": "uuid",
  "provider": "GEMINI",
  "model": "gemini-2.0-flash",
  "status": "SUCCESS",
  "inputTokens": 150,
  "outputTokens": 230,
  "totalTokens": 380,
  "latencyMs": 340,
  "requestDurationMs": 1250,
  "startedAt": "2024-01-15T14:00:00.000Z",
  "completedAt": "2024-01-15T14:00:01.250Z",
  "inputPreview": "Tell me about...",
  "outputPreview": "Sure! Here is...",
  "isStreaming": true
}
```

**Response (202 Accepted):**
```json
{ "success": true, "message": "Log accepted", "data": { "jobId": "1" } }
```

### POST /api/logs/batch
Batch ingest up to 100 logs (for SDK failure queue drain).

**Request:** Array of log objects (same schema as above)

### GET /api/logs
List inference logs with pagination and filtering.

**Query params:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `provider` (GEMINI | OPENAI | CLAUDE | GROK)
- `status` (SUCCESS | ERROR | CANCELLED | STREAMING | PENDING)
- `conversationId`

**Response:**
```json
{
  "success": true,
  "data": [...],
  "meta": { "page": 1, "limit": 20, "total": 1500 }
}
```

### GET /api/logs/health
Returns BullMQ queue health stats.

```json
{
  "success": true,
  "data": { "waiting": 3, "active": 1, "failed": 0, "completed": 1247 }
}
```

---

## Conversations

### GET /api/conversations
List conversations for the current session.

**Headers:** `x-session-id: uuid`

**Query params:** `page`, `limit`

### GET /api/conversations/:id
Get a conversation with all messages.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Conversation title",
    "provider": "GEMINI",
    "model": "gemini-2.0-flash",
    "createdAt": "...",
    "messages": [
      { "id": "uuid", "role": "user", "content": "...", "createdAt": "..." },
      { "id": "uuid", "role": "assistant", "content": "...", "createdAt": "..." }
    ]
  }
}
```

### DELETE /api/conversations/:id
Archive a conversation (soft delete).

### PATCH /api/conversations/:id/title
Update conversation title.

**Request:** `{ "title": "New title" }`

---

## Dashboard

### GET /api/dashboard
Get aggregated metrics for the dashboard.

**Query params:**
- `window` (minutes, default: 60)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRequests": 1250,
    "successRate": 97.6,
    "errorRate": 2.4,
    "avgLatencyMs": 342,
    "requestsPerMinute": 20.8,
    "providerUsage": {
      "GEMINI": 800,
      "OPENAI": 350,
      "CLAUDE": 100
    },
    "tokenUsage": {
      "input": 125000,
      "output": 89000,
      "total": 214000
    },
    "throughput": 0.347,
    "recentLogs": [...],
    "latencyOverTime": [
      { "time": "2024-01-15T14:00:00.000Z", "avg": 320, "p95": 890 }
    ]
  }
}
```

### GET /api/dashboard/providers
Get available providers and their default models.

### GET /api/dashboard/health
Server and queue health check.

---

## WebSocket Events (Socket.io)

### Client → Server

```js
socket.emit('join:dashboard')         // Join dashboard room for live updates
socket.emit('join:conversation', id)  // Join conversation room
```

### Server → Client

```js
socket.on('log:new', (log) => {})     // New inference log (dashboard room)
```

---

## Error Codes

| HTTP Status | Meaning |
|---|---|
| 400 | Validation error (check `data` for field errors) |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
