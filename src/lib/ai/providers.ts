import type {
  AiProvider, AiProviderInterface, AiModelConfig,
  AiCompletionRequest, AiCompletionResponse,
} from './types';

class GeminiProvider implements AiProviderInterface {
  name: AiProvider = 'gemini';
  private config: AiModelConfig;

  constructor(config: AiModelConfig) {
    this.config = config;
  }

  async complete(req: AiCompletionRequest): Promise<AiCompletionResponse> {
    const apiKey = this.config.apiKey || process.env.GEMINI_API_KEY || '';
    const model = req.model || this.config.model || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const contents = req.messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

    const systemInstruction = req.messages.find(m => m.role === 'system')?.content;

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: req.temperature ?? this.config.temperature ?? 0.7,
        maxOutputTokens: req.maxTokens ?? this.config.maxTokens ?? 8192,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      content: text,
      model,
      provider: 'gemini',
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
    };
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.config.apiKey || process.env.GEMINI_API_KEY);
  }
}

class OpenAIProvider implements AiProviderInterface {
  name: AiProvider = 'openai';

  constructor(private config: AiModelConfig) {}

  async complete(req: AiCompletionRequest): Promise<AiCompletionResponse> {
    const apiKey = this.config.apiKey || process.env.OPENAI_API_KEY || '';
    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';
    const model = req.model || this.config.model || 'gpt-4o';

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: req.messages,
        temperature: req.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? this.config.maxTokens ?? 8192,
      }),
    });

    if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);

    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content || '',
      model,
      provider: 'openai',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.config.apiKey || process.env.OPENAI_API_KEY);
  }
}

class ClaudeProvider implements AiProviderInterface {
  name: AiProvider = 'claude';

  constructor(private config: AiModelConfig) {}

  async complete(req: AiCompletionRequest): Promise<AiCompletionResponse> {
    const apiKey = this.config.apiKey || process.env.ANTHROPIC_API_KEY || '';
    const model = req.model || this.config.model || 'claude-sonnet-4-20250514';

    const systemMsg = req.messages.find(m => m.role === 'system');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        system: systemMsg?.content,
        messages: req.messages.filter(m => m.role !== 'system'),
        max_tokens: req.maxTokens ?? this.config.maxTokens ?? 8192,
        temperature: req.temperature ?? this.config.temperature ?? 0.7,
      }),
    });

    if (!res.ok) throw new Error(`Claude error: ${res.status}`);

    const data = await res.json();
    return {
      content: data.content?.[0]?.text || '',
      model,
      provider: 'claude',
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      } : undefined,
    };
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.config.apiKey || process.env.ANTHROPIC_API_KEY);
  }
}

class OllamaProvider implements AiProviderInterface {
  name: AiProvider = 'ollama';

  constructor(private config: AiModelConfig) {}

  async complete(req: AiCompletionRequest): Promise<AiCompletionResponse> {
    const baseUrl = this.config.baseUrl || 'http://127.0.0.1:11434';
    const model = req.model || this.config.model || 'gemma3:12b';

    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: req.messages.filter(m => m.role !== 'system').map(m => ({
          role: m.role,
          content: m.content,
        })),
        stream: false,
        options: {
          temperature: req.temperature ?? this.config.temperature ?? 0.7,
          num_predict: req.maxTokens ?? this.config.maxTokens ?? 4096,
        },
      }),
    });

    if (!res.ok) throw new Error(`Ollama error: ${res.status}`);

    const data = await res.json();
    return {
      content: data.message?.content || '',
      model,
      provider: 'ollama',
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.baseUrl || 'http://127.0.0.1:11434'}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

class OpenRouterProvider implements AiProviderInterface {
  name: AiProvider = 'openrouter';
  private openAI: OpenAIProvider;

  constructor(config: AiModelConfig) {
    this.openAI = new OpenAIProvider({
      ...config,
      baseUrl: config.baseUrl || 'https://openrouter.ai/api/v1',
    });
  }

  async complete(req: AiCompletionRequest): Promise<AiCompletionResponse> {
    const result = await this.openAI.complete(req);
    return { ...result, provider: 'openrouter' };
  }

  async isAvailable(): Promise<boolean> {
    return this.openAI.isAvailable();
  }
}

class CustomProvider implements AiProviderInterface {
  name: AiProvider = 'custom';

  constructor(private config: AiModelConfig) {}

  async complete(req: AiCompletionRequest): Promise<AiCompletionResponse> {
    const baseUrl = this.config.baseUrl || process.env.CUSTOM_AI_URL || 'http://127.0.0.1:8080';
    const apiKey = this.config.apiKey || process.env.CUSTOM_AI_KEY || '';
    const model = req.model || this.config.model || 'custom-model';

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: req.messages,
        temperature: req.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? this.config.maxTokens ?? 4096,
      }),
    });

    if (!res.ok) throw new Error(`Custom AI error: ${res.status}`);

    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content || data.content || data.response || '',
      model,
      provider: 'custom',
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.baseUrl || 'http://127.0.0.1:8080'}/v1/models`, {
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export function createProvider(config: AiModelConfig): AiProviderInterface {
  switch (config.provider) {
    case 'gemini': return new GeminiProvider(config);
    case 'openai': return new OpenAIProvider(config);
    case 'claude': return new ClaudeProvider(config);
    case 'ollama': return new OllamaProvider(config);
    case 'openrouter': return new OpenRouterProvider(config);
    case 'custom': return new CustomProvider(config);
    default: return new GeminiProvider(config);
  }
}
