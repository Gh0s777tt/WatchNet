import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeIntelligence,
  type IntelligenceContext,
} from '@/lib/ai-engine';

export const dynamic = 'force-dynamic';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count, resetIn: entry.resetAt - now };
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 120_000);

interface AnalyzeRequestBody {
  query: string;
  context: IntelligenceContext;
}

interface AnalyzeResponse {
  analysis: string;
  model: string;
  timestamp: string;
}

interface ErrorResponse {
  error: string;
  code: string;
  retryAfter?: number;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<AnalyzeResponse | ErrorResponse>> {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Maximum 10 requests per minute.',
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil(rateCheck.resetIn / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(rateCheck.resetIn / 1000)),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(rateCheck.resetIn / 1000)),
        },
      }
    );
  }

  const userKey = request.headers.get('x-openrouter-key')?.trim();
  const envKey = process.env.OPENROUTER_API_KEY?.trim();
  const aiBaseUrl = process.env.AI_BASE_URL?.trim() || 'http://127.0.0.1:8080';
  const noKeyRequired = aiBaseUrl.includes('127.0.0.1') || aiBaseUrl.includes('localhost') || aiBaseUrl.includes('api-inference.huggingface.co');
  const apiKey = (userKey || envKey) || (noKeyRequired ? 'free' : '');

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'No OpenRouter API key configured. Set OPENROUTER_API_KEY in environment or provide a key via the settings panel.',
        code: 'NO_API_KEY',
      },
      { status: 503 }
    );
  }

  let body: AnalyzeRequestBody;
  try {
    body = (await request.json()) as AnalyzeRequestBody;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body.', code: 'INVALID_BODY' },
      { status: 400 }
    );
  }

  if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
    return NextResponse.json(
      { error: 'Query field is required.', code: 'MISSING_QUERY' },
      { status: 400 }
    );
  }

  if (!body.context) {
    return NextResponse.json(
      { error: 'Intelligence context is required.', code: 'MISSING_CONTEXT' },
      { status: 400 }
    );
  }

  try {
    const analysis = await analyzeIntelligence(apiKey, body.context, body.query.trim());

    return NextResponse.json(
      {
        analysis,
        model: 'llama-3.1-8b-instruct (OpenRouter)',
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'X-RateLimit-Remaining': String(rateCheck.remaining),
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown AI API error';
    if (err instanceof Error) console.error('[OSIRIS AI] Analysis error stack:', err.stack);

    if (message.includes('API_KEY_INVALID') || message.includes('401')) {
      return NextResponse.json(
        { error: 'Invalid OpenRouter API key.', code: 'INVALID_KEY' },
        { status: 401 }
      );
    }

    if (message.includes('RESOURCE_EXHAUSTED') || message.includes('quota') || message.includes('429')) {
      return NextResponse.json(
        {
          error: 'API quota exhausted. Try again later or provide your own OpenRouter key.',
          code: 'QUOTA_EXHAUSTED',
        },
        { status: 429 }
      );
    }

    console.error('[OSIRIS AI] Analysis error:', message);
    return NextResponse.json(
      { error: 'Intelligence analysis failed. Please try again.', code: 'ANALYSIS_FAILED' },
      { status: 500 }
    );
  }
}
