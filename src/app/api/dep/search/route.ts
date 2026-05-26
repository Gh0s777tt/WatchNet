import { NextRequest, NextResponse } from 'next/server';
import { searchByKeyword, searchByDomains } from '../client';
import { DepDataset } from '../types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!process.env.DEP_API_KEY || !process.env.DEP_AUTH_ENDPOINT) {
    return NextResponse.json({ results: [], error: 'DEP integration not configured' }, { status: 503 });
  }

  const { searchParams } = req.nextUrl;
  const keyw = searchParams.get('keyw')?.trim();
  const domain = searchParams.get('domain')?.trim();
  const dset = (searchParams.get('dset') || 'ext') as DepDataset;
  const maxres = Math.min(parseInt(searchParams.get('maxres') || '10', 10), 50);

  if (!keyw && !domain) {
    return NextResponse.json({ results: [], error: 'keyw or domain parameter required' }, { status: 400 });
  }

  const hideIdentity = process.env.DEP_HIDE_VICTIM_NAME === 'true';

  try {
    const raw = domain
      ? await searchByDomains(domain.split(',').map((d: string) => d.trim()), dset, maxres)
      : await searchByKeyword(keyw!, dset, maxres);

    const results = hideIdentity
      ? raw.map((r: any) => ({ ...r, victim: '[REDACTED]', domain: null, victimDomain: null, annLink: null }))
      : raw;

    return NextResponse.json({ results, total: results.length }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (err) {
    console.error('[DEP search]', err);
    return NextResponse.json({ results: [], error: 'DEP search failed' }, { status: 500 });
  }
}
