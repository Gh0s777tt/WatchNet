import { SeverityLevel, IncidentEntity } from './types';

interface ScoringFactors {
  sourceCredibility: number;
  assetValue: number;
  geoProximity: number;
  recency: number;
  threatIntel: number;
}

const WEIGHTS = {
  sourceCredibility: 0.25,
  assetValue: 0.20,
  geoProximity: 0.20,
  recency: 0.15,
  threatIntel: 0.20,
};

const CREDIBLE_SOURCES = new Set([
  'GDELT', 'USGS', 'NASA', 'NOAA', 'CISA', 'MITRE', 'NVD',
  'SHODAN', 'VIRUSTOTAL', 'ABUSEIPDB', 'CERT-EU',
]);

const HIGH_VALUE_ENTITIES = new Set([
  'government', 'military', 'critical_infrastructure', 'nuclear',
  'airport', 'port', 'dam', 'power_plant', 'hospital',
]);

const HIGH_THREAT_ACTORS = new Set([
  'APT', 'ransomware', 'state-sponsored', 'cybercrime',
  'advanced_persistent_threat', 'malware',
]);

function getSourceCredibility(source: string): number {
  const upper = source.toUpperCase();
  if (CREDIBLE_SOURCES.has(upper)) return 1.0;
  if (upper.includes('CVE') || upper.includes('CERT')) return 0.9;
  if (upper.includes('GOV') || upper.includes('.MIL')) return 0.8;
  if (upper.includes('NEWS') || upper.includes('PRESS')) return 0.6;
  return 0.4;
}

function getAssetValue(entities: IncidentEntity[]): number {
  for (const entity of entities) {
    if (HIGH_VALUE_ENTITIES.has(entity.value.toLowerCase())) return 1.0;
    if (entity.type === 'cve') return 0.8;
    if (entity.type === 'organization' && HIGH_VALUE_ENTITIES.has(entity.value.toLowerCase())) return 0.9;
  }
  return 0.3;
}

function getGeoProximity(entities: IncidentEntity[]): number {
  for (const entity of entities) {
    if (entity.type === 'country') {
      const hotspotCountries = ['US', 'CN', 'RU', 'IR', 'KP', 'UA', 'IL', 'SY'];
      if (hotspotCountries.includes(entity.value.toUpperCase())) return 0.8;
    }
  }
  return 0.4;
}

function getRecency(timestamp: string): number {
  const age = Date.now() - new Date(timestamp).getTime();
  const hours = age / (1000 * 60 * 60);
  if (hours < 1) return 1.0;
  if (hours < 6) return 0.8;
  if (hours < 24) return 0.6;
  if (hours < 72) return 0.4;
  return 0.2;
}

function getThreatIntel(entities: IncidentEntity[], description: string): number {
  const desc = description.toLowerCase();
  for (const entity of entities) {
    if (HIGH_THREAT_ACTORS.has(entity.value.toLowerCase())) return 1.0;
  }
  if (desc.includes('exploit') || desc.includes('zero-day') || desc.includes('cve-')) return 0.8;
  if (desc.includes('breach') || desc.includes('leak') || desc.includes('compromise')) return 0.7;
  return 0.3;
}

function scoreToLevel(score: number): SeverityLevel {
  if (score >= 8) return SeverityLevel.CRITICAL;
  if (score >= 6) return SeverityLevel.HIGH;
  if (score >= 4) return SeverityLevel.MEDIUM;
  return SeverityLevel.LOW;
}

function calculateConfidence(factors: ScoringFactors): number {
  const values = Object.values(factors);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return Math.max(0, Math.min(1, 1 - stdDev));
}

export function scoreIncident(
  source: string,
  timestamp: string,
  entities: IncidentEntity[],
  description: string,
): { score: number; level: SeverityLevel; confidence: number; factors: ScoringFactors } {
  const factors: ScoringFactors = {
    sourceCredibility: getSourceCredibility(source),
    assetValue: getAssetValue(entities),
    geoProximity: getGeoProximity(entities),
    recency: getRecency(timestamp),
    threatIntel: getThreatIntel(entities, description),
  };

  const weighted = (
    factors.sourceCredibility * WEIGHTS.sourceCredibility +
    factors.assetValue * WEIGHTS.assetValue +
    factors.geoProximity * WEIGHTS.geoProximity +
    factors.recency * WEIGHTS.recency +
    factors.threatIntel * WEIGHTS.threatIntel
  );

  const score = Math.round(weighted * 10 * 10) / 10;
  const level = scoreToLevel(score);
  const confidence = calculateConfidence(factors);

  return { score, level, confidence, factors };
}
