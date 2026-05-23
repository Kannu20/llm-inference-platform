// src/stores/settingsStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Provider } from '../types';

interface ProviderSettings {
  apiKey: string;
  model: string;
  enabled: boolean;
}

interface SettingsState {
  activeProvider: Provider;
  providers: Record<Provider, ProviderSettings>;
  theme: 'dark' | 'light' | 'system';
  streamingEnabled: boolean;
  piiRedactionEnabled: boolean;

  setActiveProvider: (provider: Provider) => void;
  updateProviderSettings: (provider: Provider, settings: Partial<ProviderSettings>) => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setStreamingEnabled: (v: boolean) => void;
  setPiiRedactionEnabled: (v: boolean) => void;
  getActiveModel: () => string;
}

const DEFAULT_MODELS: Record<Provider, string> = {
  GEMINI: 'gemini-2.0-flash',
  OPENAI: 'gpt-4o-mini',
  CLAUDE: 'claude-3-5-haiku-20241022',
  GROK: 'grok-beta',
  OPENROUTER: 'qwen/qwen3.7-max',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      activeProvider: 'OPENROUTER',
      providers: {
        GEMINI: { apiKey: '', model: DEFAULT_MODELS.GEMINI, enabled: false },
        OPENAI: { apiKey: '', model: DEFAULT_MODELS.OPENAI, enabled: false },
        CLAUDE: { apiKey: '', model: DEFAULT_MODELS.CLAUDE, enabled: false },
        GROK: { apiKey: '', model: DEFAULT_MODELS.GROK, enabled: false },
        OPENROUTER: { apiKey: '', model: DEFAULT_MODELS.OPENROUTER, enabled: true },
      },
      theme: 'dark',
      streamingEnabled: true,
      piiRedactionEnabled: true,

      setActiveProvider: (provider) => set({ activeProvider: provider }),

      updateProviderSettings: (provider, settings) =>
        set(state => ({
          providers: {
            ...state.providers,
            [provider]: { ...state.providers[provider], ...settings },
          },
        })),

      setTheme: (theme) => set({ theme }),
      setStreamingEnabled: (v) => set({ streamingEnabled: v }),
      setPiiRedactionEnabled: (v) => set({ piiRedactionEnabled: v }),

      getActiveModel: () => {
        const { activeProvider, providers } = get();
        return providers[activeProvider].model || DEFAULT_MODELS[activeProvider];
      },
    }),
    { name: 'llm-platform-settings' }
  )
);
