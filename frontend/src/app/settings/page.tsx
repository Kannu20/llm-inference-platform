'use client';
// src/app/settings/page.tsx

import { useState } from 'react';
import { Settings, Key, Eye, EyeOff, CheckCircle, Save } from 'lucide-react';
import { Sidebar } from '../../components/layout/Sidebar';
import { useSettingsStore } from '../../stores/settingsStore';
import { Provider } from '../../types';
import { PROVIDER_LABELS, PROVIDER_COLORS } from '../../lib/utils';
import { cn } from '../../lib/utils';

const PROVIDERS: Provider[] = ['GEMINI', 'OPENAI', 'CLAUDE', 'GROK'];

const PROVIDER_MODELS: Record<Provider, string[]> = {
  GEMINI: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  OPENAI: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo'],
  CLAUDE: ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
  GROK: ['grok-beta', 'grok-2'],
};

const PROVIDER_DOCS: Record<Provider, string> = {
  GEMINI: 'https://aistudio.google.com/app/apikey',
  OPENAI: 'https://platform.openai.com/api-keys',
  CLAUDE: 'https://console.anthropic.com/settings/keys',
  GROK: 'https://console.x.ai/',
};

export default function SettingsPage() {
  const {
    activeProvider,
    providers,
    streamingEnabled,
    piiRedactionEnabled,
    setActiveProvider,
    updateProviderSettings,
    setStreamingEnabled,
    setPiiRedactionEnabled,
  } = useSettingsStore();

  const [showKeys, setShowKeys] = useState<Record<Provider, boolean>>({
    GEMINI: false, OPENAI: false, CLAUDE: false, GROK: false,
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-zinc-950">
        <div className="px-6 py-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-zinc-100">Settings</h1>
          </div>

          {/* Provider Selection */}
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Active Provider
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDERS.map(provider => (
                <button
                  key={provider}
                  onClick={() => setActiveProvider(provider)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all',
                    activeProvider === provider
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-zinc-800 bg-zinc-900 hover:border-zinc-600'
                  )}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: PROVIDER_COLORS[provider] }}
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{PROVIDER_LABELS[provider]}</p>
                    <p className="text-xs text-zinc-500">{providers[provider].model}</p>
                  </div>
                  {activeProvider === provider && (
                    <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Provider API Keys */}
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              API Keys & Models
            </h2>
            <div className="space-y-4">
              {PROVIDERS.map(provider => (
                <div
                  key={provider}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: PROVIDER_COLORS[provider] }}
                    />
                    <span className="text-sm font-medium text-zinc-200">{PROVIDER_LABELS[provider]}</span>
                    <a
                      href={PROVIDER_DOCS[provider]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-xs text-zinc-600 hover:text-emerald-400 transition-colors"
                    >
                      Get API Key →
                    </a>
                  </div>

                  {/* API Key input */}
                  <div className="flex gap-2 mb-2">
                    <div className="relative flex-1">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                      <input
                        type={showKeys[provider] ? 'text' : 'password'}
                        value={providers[provider].apiKey}
                        onChange={e => updateProviderSettings(provider, { apiKey: e.target.value })}
                        placeholder={`${PROVIDER_LABELS[provider]} API Key`}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-9 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
                      />
                      <button
                        onClick={() => setShowKeys(s => ({ ...s, [provider]: !s[provider] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                      >
                        {showKeys[provider] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Model select */}
                  <select
                    value={providers[provider].model}
                    onChange={e => updateProviderSettings(provider, { model: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                  >
                    {PROVIDER_MODELS[provider].map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </section>

          {/* Behavior Settings */}
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Behavior
            </h2>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
              <ToggleRow
                label="Streaming Responses"
                description="Stream tokens as they arrive instead of waiting for full response"
                checked={streamingEnabled}
                onChange={setStreamingEnabled}
              />
              <ToggleRow
                label="PII Redaction"
                description="Automatically redact emails, phone numbers, and sensitive data from logs"
                checked={piiRedactionEnabled}
                onChange={setPiiRedactionEnabled}
              />
            </div>
          </section>

          {/* Save */}
          <button
            onClick={handleSave}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all',
              saved
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-900'
            )}
          >
            {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save Settings'}
          </button>

          <p className="text-xs text-zinc-600 mt-3">
            Settings are persisted locally in your browser. API keys are never sent to our servers — they are sent directly to provider APIs.
          </p>
        </div>
      </main>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-4 gap-4">
      <div>
        <p className="text-sm text-zinc-200">{label}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'w-10 h-5.5 rounded-full transition-colors shrink-0',
          checked ? 'bg-emerald-500' : 'bg-zinc-700'
        )}
        role="switch"
        aria-checked={checked}
      >
        <div
          className={cn(
            'w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5',
            checked ? 'translate-x-4' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}
