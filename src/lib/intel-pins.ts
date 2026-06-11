'use client';

/* ═══════════════════════════════════════════════════════════════
   OSIRIS — Intel Pins Types & Storage
   ═══════════════════════════════════════════════════════════════ */

export type PinSeverity = 'info' | 'watch' | 'alert' | 'critical';
export type PinCategory = 'observation' | 'threat' | 'infrastructure' | 'source' | 'general';

export interface IntelPin {
  id: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  severity: PinSeverity;
  category: PinCategory;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;        // optional expiry timestamp
  linkedEntity?: string;     // optional: callsign/MMSI/IP that was under cursor
  linkedEntityType?: string; // 'flight' | 'ship' | 'cctv' | etc
  tags: string[];
}

const STORAGE_KEY = 'osiris_intel_pins';

export const SEVERITY_COLORS: Record<PinSeverity, string> = {
  info: '#39FF14',       // green
  watch: '#FFD500',      // yellow
  alert: '#FF3D3D',      // red
  critical: '#D500F9',   // purple
};

export const SEVERITY_LABELS: Record<PinSeverity, string> = {
  info: 'INFO',
  watch: 'WATCH',
  alert: 'ALERT',
  critical: 'CRITICAL',
};

export const CATEGORY_ICONS: Record<PinCategory, string> = {
  observation: '👁',
  threat: '⚡',
  infrastructure: '🏗',
  source: '📡',
  general: '📌',
};

export function loadPins(): IntelPin[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as IntelPin[];
      // Filter out expired pins
      const now = Date.now();
      return parsed.filter(p => !p.expiresAt || p.expiresAt > now);
    }
  } catch {}
  return [];
}

export function savePins(pins: IntelPin[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
  } catch {}
}

export function generateId(): string {
  return `pin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Parse a GeoJSON FeatureCollection and return IntelPin[] */
export function importPinsGeoJSON(geoJsonStr: string): IntelPin[] {
  try {
    const data = JSON.parse(geoJsonStr);
    if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
      throw new Error('Invalid GeoJSON: must be a FeatureCollection');
    }
    const pins: IntelPin[] = [];
    for (const f of data.features) {
      if (!f.geometry || f.geometry.type !== 'Point') continue;
      const coords = f.geometry.coordinates;
      const lng = coords[0];
      const lat = coords[1];
      if (typeof lat !== 'number' || typeof lng !== 'number') continue;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;

      const p = f.properties || {};
      const title = p.title || p.name || p.label || `PIN ${lat.toFixed(3)}, ${lng.toFixed(3)}`;
      const severity = (['info','watch','alert','critical'] as PinSeverity[]).includes(p.severity)
        ? p.severity as PinSeverity : 'info';
      const category = (['observation','threat','infrastructure','source','general'] as PinCategory[]).includes(p.category)
        ? p.category as PinCategory : 'general';
      const tags = typeof p.tags === 'string'
        ? p.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : Array.isArray(p.tags) ? p.tags.map(String) : [];

      pins.push({
        id: generateId(),
        title: String(title).slice(0, 120),
        description: String(p.description || p.desc || ''),
        lat,
        lng,
        severity,
        category,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        expiresAt: p.expiry_hours ? Date.now() + Number(p.expiry_hours) * 3600000 : undefined,
        tags,
        linkedEntity: p.linked_entity || p.linkedEntity || '',
      });
    }
    return pins;
  } catch (e: any) {
    throw new Error(`GeoJSON parse failed: ${e.message}`);
  }
}

export function exportPinsGeoJSON(pins: IntelPin[]): string {
  const features = pins.map(p => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
    properties: {
      id: p.id,
      title: p.title,
      description: p.description,
      severity: p.severity,
      category: p.category,
      created: new Date(p.createdAt).toISOString(),
      tags: p.tags.join(', '),
      linked_entity: p.linkedEntity || '',
    },
  }));
  const geo = { type: 'FeatureCollection', features };
  return JSON.stringify(geo, null, 2);
}
