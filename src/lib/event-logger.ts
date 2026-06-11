/**
 * ═══════════════════════════════════════════════════════════════
 *  OSIRIS — Event Logger
 *  Structured logging for all AI pipeline operations.
 *  In-memory ring buffer, accessible via GET /api/ai/logs.
 * ═══════════════════════════════════════════════════════════════
 */

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface LogEvent {
  id: number;
  timestamp: string;
  level: LogLevel;
  source: string;        // which component / route
  action: string;        // what operation
  target: string;        // who/what it called (API URL, service name)
  status: 'OK' | 'FAIL' | 'PENDING';
  durationMs: number;
  requestContext?: string;   // brief context (lat/lng, query, pin title)
  responseSummary?: string;  // brief summary of result
  error?: string;
}

const MAX_LOG_ENTRIES = 500;
const logBuffer: LogEvent[] = [];
let logIdCounter = 0;

function formatDuration(start: number): number {
  return Math.round((performance.now() - start) * 100) / 100;
}

export function startLog(
  source: string,
  action: string,
  target: string,
  requestContext?: string
): () => void {
  const start = performance.now();
  const id = ++logIdCounter;
  const entry: LogEvent = {
    id,
    timestamp: new Date().toISOString(),
    level: 'INFO',
    source,
    action,
    target,
    status: 'PENDING',
    durationMs: 0,
    requestContext,
  };
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_ENTRIES) logBuffer.shift();

  // Return a finish function
  return (overrides?: Partial<LogEvent>) => {
    const elapsed = formatDuration(start);
    const existing = logBuffer.find(e => e.id === id);
    if (existing) {
      existing.durationMs = elapsed;
      existing.status = overrides?.status || (overrides?.error ? 'FAIL' : 'OK');
      if (overrides?.error) existing.error = overrides.error;
      if (overrides?.level) existing.level = overrides.level;
      if (overrides?.responseSummary) existing.responseSummary = overrides.responseSummary;
      if (overrides?.requestContext) existing.requestContext = overrides.requestContext;
    }
    // Also write to console for server-side visibility
    const icon = existing?.status === 'FAIL' ? '✗' : existing?.status === 'PENDING' ? '⋯' : '✓';
    const levelTag = existing?.level === 'ERROR' ? 'ERR' : existing?.level === 'WARN' ? 'WRN' : 'INF';
    console.log(`[${levelTag}][${source}] ${icon} ${action} → ${target} (${elapsed.toFixed(1)}ms)${overrides?.error ? ` ERR:${overrides.error}` : ''}`);
  };
}

export function getLogs(limit = 100, offset = 0): LogEvent[] {
  return logBuffer.slice(-(offset + limit)).slice(0, limit).reverse();
}

export function getLogsBySource(source: string, limit = 50): LogEvent[] {
  return logBuffer.filter(e => e.source === source).reverse().slice(0, limit);
}

export function getRecentErrors(limit = 20): LogEvent[] {
  return logBuffer.filter(e => e.level === 'ERROR').reverse().slice(0, limit);
}

export function getLogStats(): { total: number; errors: number; sources: Record<string, number> } {
  const sources: Record<string, number> = {};
  let errors = 0;
  for (const e of logBuffer) {
    sources[e.source] = (sources[e.source] || 0) + 1;
    if (e.level === 'ERROR') errors++;
  }
  return { total: logBuffer.length, errors, sources };
}

export function clearLogs(): void {
  logBuffer.length = 0;
}
