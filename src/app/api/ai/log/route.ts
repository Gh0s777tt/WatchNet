/**
 * ═══════════════════════════════════════════════════════════════
 *  OSIRIS — Client-Side Event Log Ingest
 *  POST /api/ai/log — client-side components send events here
 * ═══════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import { startLog } from '@/lib/event-logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { source, action, target, requestContext, status, error } = body;
    if (!source || !action) {
      return NextResponse.json({ error: 'source and action required' }, { status: 400 });
    }
    const logDone = startLog(
      `client:${source}`,
      action,
      target || 'browser',
      requestContext || ''
    );
    logDone({
      status: (status || 'OK') as 'OK' | 'FAIL' | 'PENDING',
      error: error || undefined,
      responseSummary: body.responseSummary,
    });
    return NextResponse.json({ logged: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
