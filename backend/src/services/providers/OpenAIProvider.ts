// src/services/providers/OpenAIProvider.ts

import OpenAI from 'openai';
import { BaseProvider, ProviderResponse } from './BaseProvider';
import { ChatMessage, Provider, StreamChunk } from '../../types';

export class OpenAIProvider extends BaseProvider {
  readonly provider: Provider = 'OPENAI';
  readonly defaultModel = 'gpt-4o-mini';

  private client: OpenAI;

  constructor(apiKey: string, model?: string) {
    super(apiKey, model);
    this.client = new OpenAI({ apiKey });
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  private convertMessages(messages: ChatMessage[], systemPrompt?: string): OpenAI.ChatCompletionMessageParam[] {
    const result: OpenAI.ChatCompletionMessageParam[] = [];
    if (systemPrompt) result.push({ role: 'system', content: systemPrompt });
    result.push(...messages.map(m => ({ role: m.role, content: m.content } as OpenAI.ChatCompletionMessageParam)));
    return result;
  }

  async chat(messages: ChatMessage[], systemPrompt?: string): Promise<ProviderResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: this.convertMessages(messages, systemPrompt),
    });

    const choice = response.choices[0];
    return {
      content: choice.message.content || '',
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      totalTokens: response.usage?.total_tokens || 0,
      model: response.model,
      finishReason: choice.finish_reason,
    };
  }

  async stream(
    messages: ChatMessage[],
    systemPrompt?: string,
    onChunk?: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<ProviderResponse> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: this.convertMessages(messages, systemPrompt),
      stream: true,
      stream_options: { include_usage: true },
    });

    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;
    let finishReason: string | undefined;

    for await (const chunk of stream) {
      if (signal?.aborted) {
        stream.controller.abort();
        break;
      }

      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
        if (onChunk) onChunk({ type: 'content', content: delta });
      }

      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens;
        outputTokens = chunk.usage.completion_tokens;
        totalTokens = chunk.usage.total_tokens;
      }

      if (chunk.choices[0]?.finish_reason) {
        finishReason = chunk.choices[0].finish_reason;
      }
    }

    if (onChunk) onChunk({ type: 'done' });

    return {
      content: fullContent,
      inputTokens,
      outputTokens,
      totalTokens,
      model: this.model,
      finishReason,
    };
  }
}
