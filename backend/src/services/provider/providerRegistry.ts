import { KitsAiProvider } from './kitsAiProvider';
import { RVCProvider } from './rvcProvider';
import { ElevenLabsProviderEnhanced } from './elevenLabsProviderEnhanced';
import { OpenAIVoiceProvider } from './openaiVoiceProvider';
import { FishAudioProvider } from './fishAudioProvider';
import { CambAiProvider } from './cambAiProvider';
import { MiniMaxProvider } from './minimaxProvider';
import { SingingProvider } from './base';

const kitsProvider = new KitsAiProvider();
const rvcProvider = new RVCProvider();
const elevenLabsProvider = new ElevenLabsProviderEnhanced();
const openaiProvider = new OpenAIVoiceProvider();
const fishAudioProvider = new FishAudioProvider();
const cambAiProvider = new CambAiProvider();
const minimaxProvider = new MiniMaxProvider();

const providerRegistry: Record<string, SingingProvider> = {
  'kits-ai': kitsProvider,
  rvc: rvcProvider,
  elevenlabs: elevenLabsProvider,
  'openai-voice': openaiProvider,
  'fish-audio': fishAudioProvider,
  'camb-ai': cambAiProvider,
  minimax: minimaxProvider,
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
