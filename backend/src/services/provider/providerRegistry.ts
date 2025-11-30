import { KitsAiProvider } from './kitsAiProvider';
import { RVCProvider } from './rvcProvider';
import { ElevenLabsProvider } from './elevenLabsProvider';
import { OpenAIVoiceProvider } from './openaiVoiceProvider';
import { SingingProvider } from './base';

const kitsProvider = new KitsAiProvider();
const rvcProvider = new RVCProvider();
const elevenLabsProvider = new ElevenLabsProvider();
const openaiProvider = new OpenAIVoiceProvider();

const providerRegistry: Record<string, SingingProvider> = {
  'kits-ai': kitsProvider,
  rvc: rvcProvider,
  elevenlabs: elevenLabsProvider,
  'openai-voice': openaiProvider,
  'chromox-clone': rvcProvider
};

export function resolveProvider(providerKey: string | undefined) {
  if (!providerKey) return kitsProvider;
  return providerRegistry[providerKey] ?? kitsProvider;
}

export function listProviders() {
  return Object.entries(providerRegistry).map(([key, provider]) => ({
    key,
    label: provider.label
  }));
}
