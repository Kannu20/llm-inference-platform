// src/services/providers/GeminiProvider.ts
// Google Gemini provider with streaming support
// Uses @google/generative-ai SDK

import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseProvider, ProviderResponse } from './BaseProvider';
import { ChatMessage, Provider, StreamChunk } from '../../types';

export class GeminiProvider extends BaseProvider {
  readonly provider: Provider = 'GEMINI';
  readonly defaultModel = 'gemini-2.0-flash';

  private client: GoogleGenerativeAI;

  constructor(apiKey: string, model?: string) {
    super(apiKey, model);
    this.client = new GoogleGenerativeAI(apiKey);
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  private convertMessages(messages: ChatMessage[]) {
    // Gemini uses 'user'/'model' roles, not 'user'/'assistant'
    return messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
  }

  // async chat(messages: ChatMessage[], systemPrompt?: string): Promise<ProviderResponse> {
  //   const model = this.client.getGenerativeModel({
  //     model: this.model,
  //     systemInstruction: systemPrompt,
  //   });

  //   const history = this.convertMessages(messages.slice(0, -1));
  //   const lastMessage = messages[messages.length - 1];

  //   const chat = model.startChat({ history });
  //   const result = await chat.sendMessage(lastMessage.content);
  //   const response = result.response;

  //   const content = response.text();
  //   const usage = response.usageMetadata;

  //   return {
  //     content,
  //     inputTokens: usage?.promptTokenCount || 0,
  //     outputTokens: usage?.candidatesTokenCount || 0,
  //     totalTokens: usage?.totalTokenCount || 0,
  //     model: this.model,
  //     finishReason: response.candidates?.[0]?.finishReason,
  //   };
  // }
  async chat(messages: ChatMessage[], systemPrompt?: string): Promise<ProviderResponse> {
    try {
      const model = this.client.getGenerativeModel({
        model: this.model,
        systemInstruction: systemPrompt,
      });

      const history = this.convertMessages(messages.slice(0, -1))
        .filter(m => m.parts?.[0]?.text?.trim());

      const lastMessage = messages[messages.length - 1];

      console.log("Sending to Gemini:", lastMessage.content);

      const chat = model.startChat({
        history: history.length ? history : [],
      });

      const result = await chat.sendMessage(lastMessage.content);

      const response = result.response;

      const content = response.text();

      console.log("Gemini response:", content);

      const usage = response.usageMetadata || {};

      return {
        content,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        model: this.model,
        finishReason: response.candidates?.[0]?.finishReason,

      };
    } catch (err) {
      console.error("Gemini Error:", err);
      throw err;
    }
  }

  // async stream(
  //   messages: ChatMessage[],
  //   systemPrompt?: string,
  //   onChunk?: (chunk: StreamChunk) => void,
  //   signal?: AbortSignal
  // ): Promise<ProviderResponse> {
  //   const model = this.client.getGenerativeModel({
  //     model: this.model,
  //     systemInstruction: systemPrompt,
  //   });

  //   const history = this.convertMessages(messages.slice(0, -1));
  //   const lastMessage = messages[messages.length - 1];

  //   const chat = model.startChat({ history });
  //   const result = await chat.sendMessageStream(lastMessage.content);
  //   async stream(
  //   messages: ChatMessage[],
  //   systemPrompt?: string,
  //   onChunk?: (chunk: StreamChunk) => void,
  //   signal?: AbortSignal
  // ): Promise<ProviderResponse> {

  //   console.log("STREAM FUNCTION CALLED");
  //   console.log("Messages:", messages);

  //   const model = this.client.getGenerativeModel({
  //     model: this.model,
  //     systemInstruction: systemPrompt,
  //   });

  //   console.log("Model created");

  //   const history = this.convertMessages(messages.slice(0,-1));
  //   const lastMessage = messages[messages.length-1];

  //   console.log("Last message:", lastMessage.content);

  //   const chat = model.startChat({history});

  //   console.log("Chat started");

  //   // const result = await chat.sendMessageStream(
  //   //     lastMessage.content
  //   // );

  //   const result = await chat.sendMessage(
  //     lastMessage.content
  //   );

  //   console.log("Gemini stream request sent");

  //     let fullContent = '';
  //     let inputTokens = 0;
  //     let outputTokens = 0;
  //     let totalTokens = 0;
  //     let finishReason: string | undefined;

  //     for await (const chunk of result.stream) {
  //       if (signal?.aborted) break;

  //       const chunkText = chunk.text();
  //       fullContent += chunkText;

  //       if (chunkText && onChunk) {
  //         onChunk({ type: 'content', content: chunkText });
  //       }
  //     }

  //     const finalResponse = await result.response;
  //     const usage = finalResponse.usageMetadata;
  //     inputTokens = usage?.promptTokenCount || 0;
  //     outputTokens = usage?.candidatesTokenCount || 0;
  //     totalTokens = usage?.totalTokenCount || 0;
  //     finishReason = finalResponse.candidates?.[0]?.finishReason;

  //     if (onChunk) onChunk({ type: 'done' });

  //     return {
  //       content: fullContent,
  //       inputTokens,
  //       outputTokens,
  //       totalTokens,
  //       model: this.model,
  //       finishReason,
  //     };
  //   }
  // }

  async stream(
    messages: ChatMessage[],
    systemPrompt?: string,
    onChunk?: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<ProviderResponse> {

    try {
      console.log("STREAM FUNCTION CALLED");

      const model = this.client.getGenerativeModel({
        model: this.model,
        systemInstruction: systemPrompt,
      });

      const history = this.convertMessages(messages.slice(0, -1))
        .filter(m => m.parts?.[0]?.text?.trim());

      const lastMessage = messages[messages.length - 1];

      const chat = model.startChat({
        history: history.length ? history : [],
      });

      const result = await chat.sendMessage(
        lastMessage.content
      );

      const response = result.response;
      const content = response.text();

      console.log("Gemini response:", content);

      if (onChunk) {
        onChunk({
          type: "content",
          content
        });

        onChunk({
          type: "done"
        });
      }

      const usage = response.usageMetadata || {};

      return {
        content,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        model: this.model,
        finishReason: response.candidates?.[0]?.finishReason,

      };

    } catch (err) {
      console.error("Gemini Stream Error:", err);
      throw err;
    }
  }
}