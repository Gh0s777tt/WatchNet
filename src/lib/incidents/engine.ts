import { Incident, SeverityLevel } from './types';
import { isDuplicate } from './dedup';
import { scoreIncident } from './scoring';
import { getRemediation } from './remediation';
import { randomUUID } from 'crypto';

const incidents = new Map<string, Incident>();
const MAX_INCIDENTS = 1000;

type IncidentListener = (incident: Incident) => void;
const listeners = new Set<IncidentListener>();

export function onIncident(cb: IncidentListener): () => void {
  listeners.add(cb);
  return () => listeners.remove(cb);
}

function broadcast(incident: Incident): void {
  for (const listener of listeners) {
    try { listener(incident); } catch { /* */ }
  }
}

export function createIncident(params: {
  title: string;
  description: string;
  source: string;
  location?: { lat: number; lng: number; place?: string; country?: string };
  entities?: { type: 'ip' | 'domain' | 'url' | 'hash' | 'cve' | 'actor' | 'organization' | 'country'; value: string }[];
  tags?: string[];
  timestamp?: string;
}): Incident | null {
  const timestamp = params.timestamp || new Date().toISOString();
  const entities = params.entities || [];
  const tags = params.tags || [];

  const dedupContent = `${params.source}|${params.title}|${params.description}`;
  const normalized = dedupContent.toLowerCase().replace(/\s+/g, ' ').trim();
  const dedupHash = require('crypto').createHash('sha256').update(normalized).digest('hex');

  if (isDuplicate(params.title, params.source, params.description)) {
    return null;
  }

  const { score, level, confidence } = scoreIncident(
    params.source,
    timestamp,
    entities,
    params.description,
  );

  const incident: Incident = {
    id: randomUUID().slice(0, 8),
    title: params.title,
    description: params.description,
    source: params.source,
    severityScore: score,
    severityLevel: level,
    confidence,
    timestamp,
    location: params.location,
    entities,
    dedupHash,
    remediation: getRemediation(params.title, params.description, tags),
    status: 'new',
    tags,
  };

  incidents.set(incident.id, incident);
  if (incidents.size > MAX_INCIDENTS) {
    const oldest = [...incidents.entries()].sort(([, a], [, b]) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )[0][0];
    incidents.delete(oldest);
  }

  broadcast(incident);

  return incident;
}

export function getIncidents(filters?: {
  status?: string;
  severity?: string;
  source?: string;
  limit?: number;
}): Incident[] {
  let result = [...incidents.values()];

  if (filters?.status) {
    result = result.filter(i => i.status === filters.status);
  }
  if (filters?.severity) {
    result = result.filter(i => i.severityLevel === filters.severity);
  }
  if (filters?.source) {
    result = result.filter(i => i.source.toLowerCase().includes(filters.source!.toLowerCase()));
  }

  result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (filters?.limit) {
    result = result.slice(0, filters.limit);
  }

  return result;
}

export function acknowledgeIncident(id: string): Incident | undefined {
  const incident = incidents.get(id);
  if (incident) {
    incident.status = 'acknowledged';
    broadcast(incident);
  }
  return incident;
}

export function updateIncidentStatus(id: string, status: Incident['status']): Incident | undefined {
  const incident = incidents.get(id);
  if (incident) {
    incident.status = status;
    broadcast(incident);
  }
  return incident;
}

export function getIncidentStats() {
  const all = [...incidents.values()];
  return {
    total: all.length,
    bySeverity: {
      [SeverityLevel.LOW]: all.filter(i => i.severityLevel === SeverityLevel.LOW).length,
      [SeverityLevel.MEDIUM]: all.filter(i => i.severityLevel === SeverityLevel.MEDIUM).length,
      [SeverityLevel.HIGH]: all.filter(i => i.severityLevel === SeverityLevel.HIGH).length,
      [SeverityLevel.CRITICAL]: all.filter(i => i.severityLevel === SeverityLevel.CRITICAL).length,
    },
    byStatus: {
      new: all.filter(i => i.status === 'new').length,
      acknowledged: all.filter(i => i.status === 'acknowledged').length,
      investigating: all.filter(i => i.status === 'investigating').length,
      mitigated: all.filter(i => i.status === 'mitigated').length,
      resolved: all.filter(i => i.status === 'resolved').length,
      false_positive: all.filter(i => i.status === 'false_positive').length,
    },
  };
}
