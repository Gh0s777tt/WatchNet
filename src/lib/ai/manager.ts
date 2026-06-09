import type { AiProvider, AiModelConfig, AiCompletionRequest, AiCompletionResponse } from './types';
import { createProvider } from './providers';
import { DEFAULT_CONFIGS } from './types';

class AiManager {
  private providers = new Map<AiProvider, ReturnType<typeof createProvider>>();
  private activeProvider: AiProvider = 'gemini';
  private configs: Map<AiProvider, AiModelConfig> = new Map();

  constructor() {
    this.loadFromEnv();
  }

  private loadFromEnv() {
    for (const [provider, config] of Object.entries(DEFAULT_CONFIGS)) {
      const p = provider as AiProvider;
      this.configs.set(p, { ...config });

      const envKey = `${p.toUpperCase()}_API_KEY`;
      const envUrl = `${p.toUpperCase()}_BASE_URL`;
      const envModel = `${p.toUpperCase()}_MODEL`;

      const cfg = this.configs.get(p)!;
      if (process.env[envKey]) cfg.apiKey = process.env[envKey];
      if (process.env[envUrl]) cfg.baseUrl = process.env[envUrl];
      if (process.env[envModel]) cfg.model = process.env[envModel];
    }

    for (const [provider, config] of this.configs) {
      try {
        this.providers.set(provider, createProvider(config));
      } catch {}
    }
  }

  setActiveProvider(provider: AiProvider) {
    if (this.providers.has(provider)) {
      this.activeProvider = provider;
    }
  }

  getActiveProvider(): AiProvider {
    return this.activeProvider;
  }

  setConfig(provider: AiProvider, config: Partial<AiModelConfig>) {
    const existing = this.configs.get(provider) || DEFAULT_CONFIGS[provider];
    const updated = { ...existing, ...config };
    this.configs.set(provider, updated);
    try {
      this.providers.set(provider, createProvider(updated));
    } catch {}
  }

  getConfig(provider: AiProvider): AiModelConfig | undefined {
    return this.configs.get(provider);
  }

  async complete(req: AiCompletionRequest & { provider?: AiProvider }): Promise<AiCompletionResponse> {
    const provider = req.provider || this.activeProvider;
    const impl = this.providers.get(provider);
    if (!impl) throw new Error(`Provider ${provider} not available`);
    return impl.complete(req);
  }

  async isAvailable(provider?: AiProvider): Promise<boolean> {
    const p = provider || this.activeProvider;
    const impl = this.providers.get(p);
    if (!impl) return false;
    return impl.isAvailable();
  }

  async getAvailableProviders(): Promise<AiProvider[]> {
    const available: AiProvider[] = [];
    for (const [provider, impl] of this.providers) {
      try {
        if (await impl.isAvailable()) available.push(provider);
      } catch {}
    }
    return available;
  }

  listProviders(): AiProvider[] {
    return [...this.providers.keys()];
  }
}

export const aiManager = new AiManager();
export default aiManager;
