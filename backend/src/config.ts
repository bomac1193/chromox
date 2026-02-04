export const config = {
  port: Number(process.env.CHROMOX_PORT ?? 4414),
  provider: {
    kitsAiApiKey: process.env.KITS_AI_API_KEY ?? 'demo-key',
    fishAudioApiKey: process.env.FISH_AUDIO_API_KEY ?? 'demo-key',
    cambAiApiKey: process.env.CAMB_AI_API_KEY ?? 'demo-key',
    minimaxApiKey: process.env.MINIMAX_API_KEY ?? 'demo-key',
    minimaxGroupId: process.env.MINIMAX_GROUP_ID ?? ''
  },
  llm: {
    apiKey: process.env.LLM_API_KEY ?? 'demo-llm'
  },
  effects: {
    serviceUrl: process.env.EFFECTS_SERVICE_URL ?? 'http://localhost:5009'
  }
};
