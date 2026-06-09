export enum SeverityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface GeoLocation {
  lat: number;
  lng: number;
  place?: string;
  country?: string;
}

export interface IncidentEntity {
  type: 'ip' | 'domain' | 'url' | 'hash' | 'cve' | 'actor' | 'organization' | 'country';
  value: string;
}

export interface RemediationStep {
  action: string;
  description: string;
  automated: boolean;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface RemediationPlaybook {
  playbookId: string;
  name: string;
  description: string;
  steps: RemediationStep[];
  estimatedResponseTime: string;
  autoRun: boolean;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  source: string;
  severityScore: number;
  severityLevel: SeverityLevel;
  confidence: number;
  timestamp: string;
  location?: GeoLocation;
  entities: IncidentEntity[];
  dedupHash: string;
  remediation?: RemediationPlaybook;
  status: 'new' | 'acknowledged' | 'investigating' | 'mitigated' | 'resolved' | 'false_positive';
  tags: string[];
  rawData?: Record<string, unknown>;
}
