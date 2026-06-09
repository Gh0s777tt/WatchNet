export type AiProvider = 'gemini' | 'openai' | 'claude' | 'ollama' | 'openrouter' | 'custom';

export interface AiModelConfig {
  provider: AiProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiCompletionRequest {
  messages: AiMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface AiCompletionResponse {
  content: string;
  model: string;
  provider: AiProvider;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AiProviderInterface {
  name: AiProvider;
  complete(req: AiCompletionRequest): Promise<AiCompletionResponse>;
  streamComplete?(req: AiCompletionRequest): AsyncGenerator<string>;
  isAvailable(): Promise<boolean>;
}

export const DEFAULT_CONFIGS: Record<AiProvider, AiModelConfig> = {
  gemini: { provider: 'gemini', model: 'gemini-2.0-flash', temperature: 0.7, maxTokens: 8192 },
  openai: { provider: 'openai', model: 'gpt-4o', temperature: 0.7, maxTokens: 8192 },
  claude: { provider: 'claude', model: 'claude-sonnet-4-20250514', temperature: 0.7, maxTokens: 8192 },
  ollama: { provider: 'ollama', model: 'gemma3:12b', temperature: 0.7, maxTokens: 4096, baseUrl: 'http://127.0.0.1:11434' },
  openrouter: { provider: 'openrouter', model: 'openai/gpt-4o', temperature: 0.7, maxTokens: 8192, baseUrl: 'https://openrouter.ai/api/v1' },
  custom: { provider: 'custom', model: '', temperature: 0.7, maxTokens: 4096 },
};
