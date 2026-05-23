// src/services/providers/OpenRouterProvider.ts
// OpenRouter provider — routes to 200+ models via a single OpenAI-compatible API.
// Key differences from plain OpenAI:
//   1. Base URL is https://openrouter.ai/api/v1
//   2. Requires HTTP-Referer and X-Title headers for rankings/analytics
//   3. Usage is returned in the final streaming chunk, not intermediate ones
//   4. generation_id in response lets you fetch full generation stats post-call
//   5. Some models support provider-specific params (temperature, top_p, etc.)
//   6. Cost metadata returned in x-openrouter-* response headers

import OpenAI from 'openai';
import { BaseProvider, ProviderResponse } from './BaseProvider';
import { ChatMessage, Provider, StreamChunk } from '../../types';

// OpenRouter-specific generation stats fetched after completion
export interface OpenRouterGenerationStats {
  id: string;
  total_cost: number;
  created_at: string;
  model: string;
  origin: string;
  tokens_prompt: number;
  tokens_completion: number;
  native_tokens_prompt?: number;
  native_tokens_completion?: number;
  num_media_prompt?: number;
  num_media_completion?: number;
  cancel_reason?: string;
  finish_reason?: string;
  generation_time?: number;
  latency?: number;
  usage?: number;
  is_byok?: boolean;
  upstream_id?: string;
  app_id?: number;
  streamed?: boolean;
  cancelled?: boolean;
}

export class OpenRouterProvider extends BaseProvider {
  readonly provider: Provider = 'OPENROUTER';
  readonly defaultModel = 'qwen/qwen3.7-max';

  private client: OpenAI;
  private siteUrl: string;
  private siteName: string;
  private apiKey: string;

  constructor(apiKey: string, model?: string, siteUrl?: string, siteName?: string) {
    super(apiKey, model);
    this.apiKey = apiKey;
    this.siteUrl = siteUrl || 'http://localhost:3000';
    this.siteName = siteName || 'LLM Inference Platform';

    // OpenRouter uses the OpenAI SDK with a custom baseURL + extra headers
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': this.siteUrl,
        'X-Title': this.siteName,
      },
    });
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  private buildMessages(
    messages: ChatMessage[],
    systemPrompt?: string
  ): OpenAI.ChatCompletionMessageParam[] {
    const result: OpenAI.ChatCompletionMessageParam[] = [];
    if (systemPrompt) {
      result.push({ role: 'system', content: systemPrompt });
    }
    result.push(
      ...messages.map(
        m => ({ role: m.role, content: m.content } as OpenAI.ChatCompletionMessageParam)
      )
    );
    return result;
  }

  async chat(messages: ChatMessage[], systemPrompt?: string): Promise<ProviderResponse> {
    // const response = await this.client.chat.completions.create({
    //   model: this.model,
    //   messages: this.buildMessages(messages, systemPrompt),
    //   // OpenRouter-specific: ask for usage in response
    //   usage: { include: true } as any,
    // } as any);
    const response = await this.client.chat.completions.create({
  model: this.model,
  messages: this.buildMessages(messages, systemPrompt),
  max_tokens: 512,
  temperature: 0.7,
  usage: { include: true } as any,
} as any);

    const choice = response.choices[0];
    const usage = response.usage;

    // Extract generation_id for potential cost lookup
    const generationId = (response as any).id;

    return {
      content: choice.message.content || '',
      inputTokens: usage?.prompt_tokens || 0,
      outputTokens: usage?.completion_tokens || 0,
      totalTokens: usage?.total_tokens || 0,
      model: response.model || this.model,
      finishReason: choice.finish_reason || undefined,
      metadata: {
        generationId,
        // Cost data if returned by OpenRouter
        nativeTokensPrompt: (usage as any)?.prompt_tokens_details?.cached_tokens,
      },
    } as ProviderResponse & { metadata?: Record<string, unknown> };
  }

  // async stream(
  //   messages: ChatMessage[],
  //   systemPrompt?: string,
  //   onChunk?: (chunk: StreamChunk) => void,
  //   signal?: AbortSignal
  // ): Promise<ProviderResponse> {
  //   const stream = await this.client.chat.completions.create({
  //     model: this.model,
  //     messages: this.buildMessages(messages, systemPrompt),
  //     stream: true,
  //     // OpenRouter: include usage in the final streaming chunk
  //     stream_options: { include_usage: true },
  //   } as any);

  //   let fullContent = '';
  //   let inputTokens = 0;
  //   let outputTokens = 0;
  //   let totalTokens = 0;
  //   let finishReason: string | undefined;
  //   let generationId: string | undefined;

  //   for await (const chunk of stream as any) {
  //     if (signal?.aborted) {
  //       (stream as any).controller?.abort();
  //       break;
  //     }

  //     // Capture generation ID from first chunk
  //     if (!generationId && chunk.id) {
  //       generationId = chunk.id;
  //     }

  //     const delta = chunk.choices?.[0]?.delta?.content;
  //     if (delta) {
  //       fullContent += delta;
  //       if (onChunk) onChunk({ type: 'content', content: delta });
  //     }

  //     // Final chunk carries usage stats on OpenRouter
  //     if (chunk.usage) {
  //       inputTokens = chunk.usage.prompt_tokens || 0;
  //       outputTokens = chunk.usage.completion_tokens || 0;
  //       totalTokens = chunk.usage.total_tokens || 0;
  //     }

  //     if (chunk.choices?.[0]?.finish_reason) {
  //       finishReason = chunk.choices[0].finish_reason;
  //     }
  //   }

  //   if (onChunk) onChunk({ type: 'done' });

  //   return {
  //     content: fullContent,
  //     inputTokens,
  //     outputTokens,
  //     totalTokens,
  //     model: this.model,
  //     finishReason,
  //   };
  // }
  async stream(
    messages: ChatMessage[],
    systemPrompt?: string,
    onChunk?: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<ProviderResponse> {

    try {
      console.log("OPENROUTER STREAM START");
      console.log("Model:", this.model);

      // const stream = await this.client.chat.completions.create({
      //   model: this.model,
      //   messages: this.buildMessages(messages, systemPrompt),
      //   stream: true,
      //   stream_options: { include_usage: true },
      // });
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: this.buildMessages(messages, systemPrompt),
        stream: true,
        max_tokens: 512,     // add this
        temperature: 0.7,
        stream_options: { include_usage: true },
      });

      console.log("Stream created");

      let fullContent = '';

      for await (const chunk of stream as any) {

        console.log("Chunk:", JSON.stringify(chunk));

        const delta = chunk.choices?.[0]?.delta?.content;

        if (delta) {
          console.log("TEXT:", delta);

          fullContent += delta;

          onChunk?.({
            type: 'content',
            content: delta
          });
        }
      }

      return {
        content: fullContent,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        model: this.model
      };

    } catch (err) {
      console.log("OPENROUTER ERROR:");
      console.error(err);

      throw err;
    }
  }

  /**
   * Fetch detailed generation statistics from OpenRouter API.
   * Call this after completion to get cost, latency, and native token counts.
   * Non-blocking — fire-and-forget, log the result separately.
   */
  async fetchGenerationStats(generationId: string): Promise<OpenRouterGenerationStats | null> {
    try {
      const response = await fetch(
        `https://openrouter.ai/api/v1/generation?id=${generationId}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );
      if (!response.ok) return null;
      const data = await response.json();
      return data.data as OpenRouterGenerationStats;
    } catch {
      return null;
    }
  }

  /**
   * Fetch all available models from OpenRouter.
   * Returns name, id, context_length, pricing, etc.
   */
  static async fetchAvailableModels(apiKey: string): Promise<OpenRouterModel[]> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!response.ok) return OPENROUTER_POPULAR_MODELS;
      const data = await response.json();
      return (data.data || []) as OpenRouterModel[];
    } catch {
      return OPENROUTER_POPULAR_MODELS;
    }
  }
}

// ─────────────────────────────────────────────────────────────
// OpenRouter Model Types
// ─────────────────────────────────────────────────────────────
export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  architecture?: {
    modality: string;
    tokenizer: string;
    instruct_type?: string;
  };
  pricing?: {
    prompt: string;      // Cost per prompt token in USD
    completion: string;  // Cost per completion token in USD
    image?: string;
    request?: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
  per_request_limits?: Record<string, string>;
}

// Popular OpenRouter models grouped by underlying provider
// Used as fallback when API call fails or for offline display
export const OPENROUTER_POPULAR_MODELS: OpenRouterModel[] = [
  // OpenAI via OpenRouter
  { id: 'openai/gpt-4o', name: 'GPT-4o', context_length: 128000 },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', context_length: 128000 },
  { id: 'openai/o1', name: 'OpenAI o1', context_length: 200000 },
  { id: 'openai/o3-mini', name: 'OpenAI o3-mini', context_length: 200000 },

  // Anthropic via OpenRouter
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', context_length: 200000 },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', context_length: 200000 },
  { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', context_length: 200000 },

  // Google via OpenRouter
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', context_length: 1048576 },
  { id: 'google/gemini-flash-1.5', name: 'Gemini 1.5 Flash', context_length: 1000000 },
  { id: 'google/gemini-pro-1.5', name: 'Gemini 1.5 Pro', context_length: 2000000 },

  // Meta via OpenRouter
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', context_length: 131072 },
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', context_length: 131072 },
  { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B', context_length: 131072 },

  // Mistral via OpenRouter
  { id: 'mistralai/mistral-large', name: 'Mistral Large', context_length: 131072 },
  { id: 'mistralai/mistral-nemo', name: 'Mistral Nemo', context_length: 131072 },
  { id: 'mistralai/mixtral-8x7b-instruct', name: 'Mixtral 8x7B', context_length: 32768 },

  // DeepSeek via OpenRouter
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3', context_length: 65536 },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', context_length: 65536 },

  // Qwen via OpenRouter
  { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', context_length: 131072 },
  { id: 'qwen/qwq-32b-preview', name: 'QwQ 32B Preview', context_length: 32768 },

  // Free models
  { id: 'meta-llama/llama-3.2-3b-instruct:free', name: 'Llama 3.2 3B (Free)', context_length: 131072 },
  { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B (Free)', context_length: 8192 },
  { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)', context_length: 32768 },
];

// Grouped for UI display
export const OPENROUTER_MODEL_GROUPS: Record<string, string[]> = {
  'OpenAI': ['openai/gpt-4o', 'openai/gpt-4o-mini', 'openai/o1', 'openai/o3-mini'],
  'Anthropic': ['anthropic/claude-3.5-sonnet', 'anthropic/claude-3.5-haiku', 'anthropic/claude-3-opus'],
  'Google': ['google/gemini-2.0-flash-001', 'google/gemini-flash-1.5', 'google/gemini-pro-1.5'],
  'Meta': ['meta-llama/llama-3.3-70b-instruct', 'meta-llama/llama-3.1-8b-instruct', 'meta-llama/llama-3.1-405b-instruct'],
  'Mistral': ['mistralai/mistral-large', 'mistralai/mistral-nemo', 'mistralai/mixtral-8x7b-instruct'],
  'DeepSeek': ['deepseek/deepseek-chat', 'deepseek/deepseek-r1'],
  'Qwen': ['qwen/qwen-2.5-72b-instruct', 'qwen/qwq-32b-preview'],
  'Free Models': ['meta-llama/llama-3.2-3b-instruct:free', 'google/gemma-2-9b-it:free', 'mistralai/mistral-7b-instruct:free'],
};