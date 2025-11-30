export const config = {
  port: Number(process.env.CHROMOX_PORT ?? 4414),
  provider: {
    kitsAiApiKey: process.env.KITS_AI_API_KEY ?? 'demo-key'
  },
  llm: {
    apiKey: process.env.LLM_API_KEY ?? 'demo-llm'
  },
  effects: {
    serviceUrl: process.env.EFFECTS_SERVICE_URL ?? 'http://localhost:5009'
  }
};
