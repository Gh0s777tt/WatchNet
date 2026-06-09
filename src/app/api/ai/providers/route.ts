import { NextRequest, NextResponse } from 'next/server';
import aiManager from '@/lib/ai/manager';

export async function GET() {
  const providers = aiManager.listProviders();
  const available: string[] = [];

  for (const p of providers) {
    try {
      if (await aiManager.isAvailable(p)) available.push(p);
    } catch {}
  }

  const configs: Record<string, unknown> = {};
  for (const p of providers) {
    const cfg = aiManager.getConfig(p);
    if (cfg) {
      configs[p] = {
        provider: cfg.provider,
        model: cfg.model,
        temperature: cfg.temperature,
        maxTokens: cfg.maxTokens,
        hasApiKey: !!cfg.apiKey,
      };
    }
  }

  return NextResponse.json({
    activeProvider: aiManager.getActiveProvider(),
    providers,
    available,
    configs,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, provider } = body;

    if (action === 'set-active') {
      if (!provider) return NextResponse.json({ error: 'Missing provider' }, { status: 400 });
      aiManager.setActiveProvider(provider);
      return NextResponse.json({ activeProvider: provider });
    }

    if (action === 'set-config') {
      if (!provider || !body.config) return NextResponse.json({ error: 'Missing provider/config' }, { status: 400 });
      aiManager.setConfig(provider, body.config);
      return NextResponse.json({ provider, config: aiManager.getConfig(provider) });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
