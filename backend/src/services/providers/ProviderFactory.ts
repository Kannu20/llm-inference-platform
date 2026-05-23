// // src/services/providers/ProviderFactory.ts
// // Factory pattern for creating provider instances
// // Reads API keys from config or per-request overrides

// import { Provider } from '../../types';
// import { config } from '../../config';
// import { BaseProvider } from './BaseProvider';
// import { GeminiProvider } from './GeminiProvider';
// import { OpenAIProvider } from './OpenAIProvider';
// import { ClaudeProvider } from './ClaudeProvider';
// import { GrokProvider } from './GrokProvider';

// export interface ProviderOptions {
//   apiKey?: string;
//   model?: string;
// }

// export class ProviderFactory {
//   static create(provider: Provider, options?: ProviderOptions): BaseProvider {
//     switch (provider) {
//       case 'GEMINI':
//         return new GeminiProvider(
//           options?.apiKey || config.providers.gemini.apiKey,
//           options?.model || config.providers.gemini.defaultModel
//         );
//       case 'OPENAI':
//         return new OpenAIProvider(
//           options?.apiKey || config.providers.openai.apiKey,
//           options?.model || config.providers.openai.defaultModel
//         );
//       case 'CLAUDE':
//         return new ClaudeProvider(
//           options?.apiKey || config.providers.claude.apiKey,
//           options?.model || config.providers.claude.defaultModel
//         );
//       case 'GROK':
//         return new GrokProvider(
//           options?.apiKey || config.providers.grok.apiKey,
//           options?.model || config.providers.grok.defaultModel,
//           config.providers.grok.baseUrl
//         );
//       default:
//         throw new Error(`Unknown provider: ${provider}`);
//     }
//   }

//   static getAvailableProviders(): Provider[] {
//     const available: Provider[] = [];
//     if (config.providers.gemini.apiKey) available.push('GEMINI');
//     if (config.providers.openai.apiKey) available.push('OPENAI');
//     if (config.providers.claude.apiKey) available.push('CLAUDE');
//     if (config.providers.grok.apiKey) available.push('GROK');
//     return available;
//   }

//   static getDefaultModels(): Record<Provider, string> {
//     return {
//       GEMINI: config.providers.gemini.defaultModel,
//       OPENAI: config.providers.openai.defaultModel,
//       CLAUDE: config.providers.claude.defaultModel,
//       GROK: config.providers.grok.defaultModel,
//     };
//   }
// }

// src/services/providers/ProviderFactory.ts
// Factory pattern for creating provider instances
// Reads API keys from config or per-request overrides

import { Provider } from '../../types';
import { config } from '../../config';
import { BaseProvider } from './BaseProvider';
import { GeminiProvider } from './GeminiProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { ClaudeProvider } from './ClaudeProvider';
import { GrokProvider } from './GrokProvider';
import { OpenRouterProvider } from './OpenRouterProvider';

export interface ProviderOptions {
  apiKey?: string;
  model?: string;
}

export class ProviderFactory {
  static create(provider: Provider, options?: ProviderOptions): BaseProvider {
    switch (provider) {
      case 'GEMINI':
        return new GeminiProvider(
          options?.apiKey || config.providers.gemini.apiKey,
          options?.model || config.providers.gemini.defaultModel
        );
      case 'OPENAI':
        return new OpenAIProvider(
          options?.apiKey || config.providers.openai.apiKey,
          options?.model || config.providers.openai.defaultModel
        );
      case 'CLAUDE':
        return new ClaudeProvider(
          options?.apiKey || config.providers.claude.apiKey,
          options?.model || config.providers.claude.defaultModel
        );
      case 'GROK':
        return new GrokProvider(
          options?.apiKey || config.providers.grok.apiKey,
          options?.model || config.providers.grok.defaultModel,
          config.providers.grok.baseUrl
        );
      case 'OPENROUTER':
        return new OpenRouterProvider(
          options?.apiKey || config.providers.openrouter.apiKey,
          options?.model || config.providers.openrouter.defaultModel,
          config.providers.openrouter.siteUrl,
          config.providers.openrouter.siteName
        );
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  static getAvailableProviders(): Provider[] {
    const available: Provider[] = [];
    if (config.providers.gemini.apiKey) available.push('GEMINI');
    if (config.providers.openai.apiKey) available.push('OPENAI');
    if (config.providers.claude.apiKey) available.push('CLAUDE');
    if (config.providers.grok.apiKey) available.push('GROK');
    if (config.providers.openrouter.apiKey) available.push('OPENROUTER');
    return available;
  }

  static getDefaultModels(): Record<Provider, string> {
    return {
      GEMINI: config.providers.gemini.defaultModel,
      OPENAI: config.providers.openai.defaultModel,
      CLAUDE: config.providers.claude.defaultModel,
      GROK: config.providers.grok.defaultModel,
      OPENROUTER: config.providers.openrouter.defaultModel,
    };
  }
}