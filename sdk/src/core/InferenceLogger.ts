// sdk/src/core/InferenceLogger.ts
// The heart of the SDK.
// Captures all inference metadata, redacts PII, queues for async send.
// Never blocks the LLM call. Handles retries and maintains a failure queue.

import { v4 as uuidv4 } from 'uuid';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export type Provider = 'GEMINI' | 'OPENAI' | 'CLAUDE' | 'GROK' | 'OPENROUTER';
export type RequestStatus = 'PENDING' | 'SUCCESS' | 'ERROR' | 'CANCELLED' | 'STREAMING';

export interface InferenceLogEntry {
  id: string;
  messageId?: string;
  conversationId: string;
  sessionId: string;
  provider: Provider;
  model: string;
  status: RequestStatus;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  requestDurationMs?: number;
  startedAt: string;
  completedAt?: string;
  inputPreview?: string;
  outputPreview?: string;
  isStreaming: boolean;
  errorMessage?: string;
  errorCode?: string;
  metadata?: Record<string, unknown>;
}

export interface SDKConfig {
  /** Ingestion endpoint URL */
  endpoint: string;
  /** Session ID — typically browser session */
  sessionId: string;
  /** Max entries held in memory before dropping */
  maxQueueSize?: number;
  /** Max retry attempts per log */
  maxRetries?: number;
  /** Base delay for exponential backoff in ms */
  retryBaseDelay?: number;
  /** Max items in persistent failure queue */
  maxFailureQueue?: number;
  /** Whether to enable PII redaction */
  piiRedaction?: boolean;
  /** Flush interval in ms */
  flushIntervalMs?: number;
  /** Middleware functions applied before sending */
  middleware?: LogMiddleware[];
  /** Debug logging */
  debug?: boolean;
}

export type LogMiddleware = (entry: InferenceLogEntry) => InferenceLogEntry | null;

// ─────────────────────────────────────────────────────────────
// PII Redactor (SDK-side, minimal)
// ─────────────────────────────────────────────────────────────
const PII_PATTERNS = [
  { regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL]' },
  { regex: /(\+?1?\s?)?(\(?\d{3}\)?[\s.\-]?)(\d{3}[\s.\-]?\d{4})/g, replacement: '[PHONE]' },
  { regex: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, replacement: '[SSN]' },
  { regex: /\b(?:\d{4}[\s\-]?){3}\d{4}\b/g, replacement: '[CC]' },
];

function redactPII(text: string): string {
  let result = text;
  for (const { regex, replacement } of PII_PATTERNS) {
    result = result.replace(regex, replacement);
  }
  return result;
}

function makePreview(text: string, maxLen = 500, redact = true): string {
  const truncated = text.slice(0, maxLen * 2);
  const processed = redact ? redactPII(truncated) : truncated;
  return processed.slice(0, maxLen);
}

// ─────────────────────────────────────────────────────────────
// Retry Manager
// ─────────────────────────────────────────────────────────────
interface QueueItem {
  entry: InferenceLogEntry;
  attempts: number;
  nextAttemptAt: number;
}

// ─────────────────────────────────────────────────────────────
// InferenceLogger
// ─────────────────────────────────────────────────────────────
export class InferenceLogger {
  private config: Required<SDKConfig>;
  private queue: QueueItem[] = [];
  private failureQueue: InferenceLogEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isFlushing = false;

  constructor(config: SDKConfig) {
    this.config = {
      maxQueueSize: 500,
      maxRetries: 3,
      retryBaseDelay: 1000,
      maxFailureQueue: 1000,
      piiRedaction: true,
      flushIntervalMs: 2000,
      middleware: [],
      debug: false,
      ...config,
    };

    this.startFlushTimer();

    // Flush on page unload (browser)
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flushSync());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') this.flush();
      });
    }
  }

  /**
   * Start tracking an inference call.
   * Returns a tracker object — call .complete() or .error() when done.
   */
  track(params: {
    conversationId: string;
    provider: Provider;
    model: string;
    input: string;
    isStreaming?: boolean;
    messageId?: string;
    metadata?: Record<string, unknown>;
  }): InferenceTracker {
    const entry: InferenceLogEntry = {
      id: uuidv4(),
      messageId: params.messageId,
      conversationId: params.conversationId,
      sessionId: this.config.sessionId,
      provider: params.provider,
      model: params.model,
      status: 'PENDING',
      isStreaming: params.isStreaming ?? false,
      startedAt: new Date().toISOString(),
      inputPreview: makePreview(params.input, 500, this.config.piiRedaction),
      metadata: params.metadata,
    };

    return new InferenceTracker(entry, this);
  }

  /**
   * Called by InferenceTracker when a call completes.
   */
  _enqueue(entry: InferenceLogEntry): void {
    // Apply middleware pipeline
    let processed: InferenceLogEntry | null = entry;
    for (const mw of this.config.middleware) {
      if (!processed) break;
      processed = mw(processed);
    }
    if (!processed) {
      this._debug('Log dropped by middleware');
      return;
    }

    if (this.queue.length >= this.config.maxQueueSize) {
      this._debug('Queue full, dropping oldest entry');
      this.queue.shift();
    }

    this.queue.push({ entry: processed, attempts: 0, nextAttemptAt: Date.now() });
    this._debug(`Enqueued log ${entry.id}, queue size: ${this.queue.length}`);
  }

  /**
   * Flush queue — sends pending logs to ingestion endpoint.
   * Non-blocking, called on timer and page events.
   */
  async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) return;
    this.isFlushing = true;

    const now = Date.now();
    const ready = this.queue.filter(item => item.nextAttemptAt <= now);

    for (const item of ready) {
      try {
        await this.send(item.entry);
        // Remove from queue on success
        const idx = this.queue.indexOf(item);
        if (idx !== -1) this.queue.splice(idx, 1);
      } catch (err) {
        item.attempts++;
        if (item.attempts >= this.config.maxRetries) {
          // Move to failure queue
          this._debug(`Max retries exceeded for ${item.entry.id}, moving to failure queue`);
          this.queue.splice(this.queue.indexOf(item), 1);
          this.addToFailureQueue(item.entry);
        } else {
          // Exponential backoff
          item.nextAttemptAt = now + this.config.retryBaseDelay * Math.pow(2, item.attempts - 1);
          this._debug(`Retry ${item.attempts} scheduled for ${item.entry.id}`);
        }
      }
    }

    this.isFlushing = false;
  }

  /**
   * Synchronous flush for page unload (uses sendBeacon if available).
   */
  flushSync(): void {
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) return;
    const pending = this.queue.map(i => i.entry);
    const failure = this.failureQueue;
    const all = [...pending, ...failure];
    if (all.length === 0) return;

    navigator.sendBeacon(
      `${this.config.endpoint}/batch`,
      JSON.stringify(all)
    );
  }

  private async send(entry: InferenceLogEntry): Promise<void> {
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
      // Don't block LLM calls — use keepalive for fire-and-forget
      keepalive: true,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  private addToFailureQueue(entry: InferenceLogEntry): void {
    if (this.failureQueue.length >= this.config.maxFailureQueue) {
      this.failureQueue.shift(); // drop oldest
    }
    this.failureQueue.push(entry);
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(err => this._debug(`Flush error: ${err}`));
    }, this.config.flushIntervalMs);

    // Don't keep Node.js alive just for this timer
    if (this.flushTimer.unref) this.flushTimer.unref();
  }

  getQueueStats() {
    return {
      pending: this.queue.length,
      failed: this.failureQueue.length,
    };
  }

  getFailureQueue(): InferenceLogEntry[] {
    return [...this.failureQueue];
  }

  clearFailureQueue(): void {
    this.failureQueue = [];
  }

  destroy(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
  }

  private _debug(msg: string): void {
    if (this.config.debug) console.debug(`[InferenceLogger] ${msg}`);
  }
}

// ─────────────────────────────────────────────────────────────
// InferenceTracker — fluent API for a single LLM call
// ─────────────────────────────────────────────────────────────
export class InferenceTracker {
  private entry: InferenceLogEntry;
  private logger: InferenceLogger;
  private startTime: number;
  private firstByteTime: number | null = null;

  constructor(entry: InferenceLogEntry, logger: InferenceLogger) {
    this.entry = entry;
    this.logger = logger;
    this.startTime = Date.now();
  }

  /** Call when first streaming chunk arrives */
  onFirstByte(): void {
    if (this.firstByteTime === null) {
      this.firstByteTime = Date.now();
      this.entry.status = 'STREAMING';
    }
  }

  /** Call when the inference completes successfully */
  complete(params: {
    output: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  }): void {
    const now = Date.now();
    this.entry.status = 'SUCCESS';
    this.entry.completedAt = new Date().toISOString();
    this.entry.requestDurationMs = now - this.startTime;
    this.entry.latencyMs = this.firstByteTime
      ? this.firstByteTime - this.startTime
      : this.entry.requestDurationMs;
    this.entry.inputTokens = params.inputTokens;
    this.entry.outputTokens = params.outputTokens;
    this.entry.totalTokens = params.totalTokens;
    this.entry.outputPreview = makePreview(params.output, 500, true);
    this.logger._enqueue(this.entry);
  }

  /** Call when the inference fails */
  error(err: Error | string, code?: string): void {
    const now = Date.now();
    this.entry.status = 'ERROR';
    this.entry.completedAt = new Date().toISOString();
    this.entry.requestDurationMs = now - this.startTime;
    this.entry.errorMessage = typeof err === 'string' ? err : err.message;
    this.entry.errorCode = code;
    this.logger._enqueue(this.entry);
  }

  /** Call when the request is cancelled */
  cancel(): void {
    const now = Date.now();
    this.entry.status = 'CANCELLED';
    this.entry.completedAt = new Date().toISOString();
    this.entry.requestDurationMs = now - this.startTime;
    this.logger._enqueue(this.entry);
  }
}
