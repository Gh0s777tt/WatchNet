/**
 * ═══════════════════════════════════════════════════════════════
 *  OSIRIS — Intelligence Fusion Correlations API
 *  POST /api/correlations
 *  Accepts current data snapshot, returns fused correlations
 * ═══════════════════════════════════════════════════════════════
 */
import { NextRequest, NextResponse } from 'next/server';
import { computeCorrelations } from '@/lib/correlation-engine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const data = body.data || {};
    const correlations = computeCorrelations(data);

    return NextResponse.json({
      correlations,
      count: correlations.length,
      computedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, correlations: [], count: 0 }, { status: 500 });
  }
}
