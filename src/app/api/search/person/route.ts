import { NextRequest, NextResponse } from 'next/server';

interface PersonResult {
  name: string;
  source: string;
  type: string;
  url?: string;
  confidence: 'alta' | 'media' | 'bassa';
  details?: string;
}

async function searchSherlock(name: string): Promise<PersonResult[]> {
  try {
    const res = await fetch(`http://127.0.0.1:3000/api/osint/sherlock?username=${encodeURIComponent(name)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const results = data?.results || data?.sites || [];
    return results.slice(0, 15).map((r: any) => ({
      name: r.username || name,
      source: r.site || r.name || 'sherlock',
      type: 'social',
      url: r.url || r.profile_url || '',
      confidence: r.status === 'claimed' ? 'alta' : 'media',
      details: r.status || '',
    }));
  } catch { return []; }
}

async function searchWeb(name: string): Promise<PersonResult[]> {
  const results: PersonResult[] = [];
  const sources = [
    { url: `https://api.duckduckgo.com/?q=${encodeURIComponent(name)}&format=json&no_html=1`, name: 'DuckDuckGo', type: 'web' },
  ];

  for (const src of sources) {
    try {
      const res = await fetch(src.url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const data = await res.json();
      const topics = data?.RelatedTopics || [];
      for (const t of topics.slice(0, 10)) {
        const text = t.Text || t.name || '';
        const url = t.FirstURL || '';
        if (text.toLowerCase().includes(name.toLowerCase())) {
          results.push({
            name: name,
            source: src.name,
            type: 'web',
            url: url || undefined,
            confidence: 'media',
            details: text.slice(0, 200),
          });
        }
      }
    } catch { /* skip */ }
  }
  return results;
}

async function searchLeaks(name: string): Promise<PersonResult[]> {
  try {
    const res = await fetch(`http://127.0.0.1:3000/api/osint/leaks?email=${encodeURIComponent(name)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.leaks || []).slice(0, 10).map((l: any) => ({
      name: name,
      source: 'leak-database',
      type: 'leak',
      url: l.url || l.source || '',
      confidence: 'alta',
      details: `${l.breach || l.name || ''} — ${l.year || ''}`,
    }));
  } catch { return []; }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name')?.trim();

  if (!name || name.length < 2) {
    return NextResponse.json({ error: 'Missing name parameter (min 2 chars)' }, { status: 400 });
  }

  const [sherlockResults, webResults, leakResults] = await Promise.all([
    searchSherlock(name),
    searchWeb(name),
    searchLeaks(name),
  ]);

  const allResults = [...sherlockResults, ...webResults, ...leakResults];

  return NextResponse.json({
    query: name,
    total: allResults.length,
    results: allResults.slice(0, 30),
    sources: {
      sherlock: sherlockResults.length,
      web: webResults.length,
      leaks: leakResults.length,
    },
    timestamp: new Date().toISOString(),
  });
}
