// src/services/providers/BaseProvider.ts
// Abstract base class for all LLM providers
// Enforces a consistent interface for chat + streaming

import { ChatMessage, Provider, StreamChunk } from '../../types';

export interface ProviderResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
  finishReason?: string;
}

export abstract class BaseProvider {
  abstract readonly provider: Provider;
  abstract readonly defaultModel: string;

  protected apiKey: string;
  protected model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || this.defaultModel;
  }

  abstract chat(
    messages: ChatMessage[],
    systemPrompt?: string
  ): Promise<ProviderResponse>;

  abstract stream(
    messages: ChatMessage[],
    systemPrompt?: string,
    onChunk?: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<ProviderResponse>;

  abstract isAvailable(): boolean;

  protected buildModel(requestedModel?: string): string {
    return requestedModel || this.model || this.defaultModel;
  }
}
