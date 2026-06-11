/**
 * ═══════════════════════════════════════════════════════════════
 *  OSIRIS — AI Event Logs Endpoint
 *  GET /api/ai/logs?limit=50&source=...
 *  GET /api/ai/logs/stats
 *  DELETE /api/ai/logs (clear)
 * ═══════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLogs, getLogsBySource, getRecentErrors, getLogStats, clearLogs } from '@/lib/event-logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');
  const source = searchParams.get('source');
  const errorsOnly = searchParams.get('errors') === 'true';
  const stats = searchParams.get('stats') === 'true';

  if (stats) {
    return NextResponse.json(getLogStats());
  }

  let logs;
  if (errorsOnly) {
    logs = getRecentErrors(limit);
  } else if (source) {
    logs = getLogsBySource(source, limit);
  } else {
    logs = getLogs(limit, offset);
  }

  return NextResponse.json({ logs, count: logs.length, total: getLogStats().total });
}

export async function DELETE() {
  clearLogs();
  return NextResponse.json({ cleared: true });
}
