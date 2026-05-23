// src/services/providers/ClaudeProvider.ts

import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider, ProviderResponse } from './BaseProvider';
import { ChatMessage, Provider, StreamChunk } from '../../types';

export class ClaudeProvider extends BaseProvider {
  readonly provider: Provider = 'CLAUDE';
  readonly defaultModel = 'claude-3-5-haiku-20241022';

  private client: Anthropic;

  constructor(apiKey: string, model?: string) {
    super(apiKey, model);
    this.client = new Anthropic({ apiKey });
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  private convertMessages(messages: ChatMessage[]): Anthropic.MessageParam[] {
    return messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));
  }

  async chat(messages: ChatMessage[], systemPrompt?: string): Promise<ProviderResponse> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: this.convertMessages(messages),
    });

    const content = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as Anthropic.TextBlock).text)
      .join('');

    return {
      content,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      model: response.model,
      finishReason: response.stop_reason || undefined,
    };
  }

  async stream(
    messages: ChatMessage[],
    systemPrompt?: string,
    onChunk?: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<ProviderResponse> {
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: this.convertMessages(messages),
    });

    let fullContent = '';

    for await (const event of stream) {
      if (signal?.aborted) {
        stream.abort();
        break;
      }

      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullContent += event.delta.text;
        if (onChunk) onChunk({ type: 'content', content: event.delta.text });
      }
    }

    const finalMessage = await stream.getFinalMessage();

    if (onChunk) onChunk({ type: 'done' });

    return {
      content: fullContent,
      inputTokens: finalMessage.usage.input_tokens,
      outputTokens: finalMessage.usage.output_tokens,
      totalTokens: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
      model: finalMessage.model,
      finishReason: finalMessage.stop_reason || undefined,
    };
  }
}
