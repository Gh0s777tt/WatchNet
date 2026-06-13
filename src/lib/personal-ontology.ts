/**
 * ═══════════════════════════════════════════════════════════════
 *  OSIRIS — Personal Ontology Types
 *  Entity model for personal data cross-referencing
 * ═══════════════════════════════════════════════════════════════
 */

// ── Domain ──
export enum PersonalDomain {
  PERSON = 'PERSON',
  COMMUNICATION = 'COMMUNICATION',
  SOCIAL = 'SOCIAL',
  IDENTITY = 'IDENTITY',
  VEHICLE = 'VEHICLE',
  LOCATION = 'LOCATION',
  NETWORK = 'NETWORK',
  EVENT = 'EVENT',
  MEDIA = 'MEDIA',
}

// ── Entity Types ──
export type PersonalEntityType =
  | 'person'
  | 'phone_number'
  | 'social_profile'
  | 'personal_id'
  | 'vehicle'
  | 'place'
  | 'mac_address'
  | 'wifi_network'
  | 'event'
  | 'image_media';

// ── Core Personal Entity ──
export interface PersonalEntity {
  id: string;
  type: PersonalEntityType;
  domain: PersonalDomain;
  label: string;
  description?: string;
  coordinates?: { lat: number; lng: number };
  timestamp?: string;
  properties: Record<string, any>;
  tags: string[];
  linkedEntityIds?: string[];  // IDs of related entities
  source: string;              // how it was ingested
  createdAt: string;
  updatedAt: string;
  graphPos?: { x: number; y: number };  // persisted layout position for the Link Editor (optional, ignored elsewhere)
}

// ── Relationship Types ──
export interface PersonalRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;           // e.g. "owns", "registered_to", "called", "posted", "located_at"
  strength: number;        // 0-1 confidence
  metadata?: Record<string, any>;
  createdAt: string;
}

// ── Graph Data ──
export interface PersonalGraphNode {
  id: string;
  label: string;
  type: PersonalEntityType;
  domain: PersonalDomain;
  properties?: Record<string, any>;
  coordinates?: { lat: number; lng: number };
  x?: number;
  y?: number;
}

export interface PersonalGraphLink {
  source: string;
  target: string;
  label: string;
  strength: number;
}

export interface PersonalGraphData {
  nodes: PersonalGraphNode[];
  links: PersonalGraphLink[];
}

// ── Colors & Display ──
export const PERSONAL_TYPE_COLORS: Record<PersonalEntityType, string> = {
  person: '#B388FF',
  phone_number: '#00E5FF',
  social_profile: '#FF6D00',
  personal_id: '#D4AF37',
  vehicle: '#FF3D3D',
  place: '#76FF03',
  mac_address: '#39FF14',
  wifi_network: '#00BCD4',
  event: '#FF9500',
  image_media: '#E040FB',
};

export const PERSONAL_DOMAIN_COLORS: Record<PersonalDomain, string> = {
  PERSON: '#B388FF',
  COMMUNICATION: '#00E5FF',
  SOCIAL: '#FF6D00',
  IDENTITY: '#D4AF37',
  VEHICLE: '#FF3D3D',
  LOCATION: '#76FF03',
  NETWORK: '#39FF14',
  EVENT: '#FF9500',
  MEDIA: '#E040FB',
};

export const PERSONAL_TYPE_LABELS: Record<PersonalEntityType, string> = {
  person: 'Person',
  phone_number: 'Phone Number',
  social_profile: 'Social Media',
  personal_id: 'ID Document',
  vehicle: 'Vehicle',
  place: 'Place',
  mac_address: 'MAC Address',
  wifi_network: 'WiFi Network',
  event: 'Event',
  image_media: 'Image/Media',
};

// ── LocalStorage Store ──
const STORE_KEY = 'osiris_personal_graph';

export interface PersonalStore {
  entities: PersonalEntity[];
  relationships: PersonalRelationship[];
  version: number;
}

/**
 * Per-user workspace isolation: when a user id is supplied the store is
 * namespaced to that account, so each analyst's personal graph is kept
 * separate on the same browser. Logged-out / anonymous sessions fall back
 * to the shared base key (backward compatible with older saves).
 */
function storeKey(userId?: string): string {
  return userId ? `${STORE_KEY}:${userId}` : STORE_KEY;
}

export function loadPersonalStore(userId?: string): PersonalStore {
  try {
    const raw = localStorage.getItem(storeKey(userId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { entities: [], relationships: [], version: 1 };
}

export function savePersonalStore(store: PersonalStore, userId?: string) {
  try {
    localStorage.setItem(storeKey(userId), JSON.stringify({ ...store, version: (store.version || 0) + 1 }));
  } catch {}
}

// ── Graph Builder ──
export function buildGraph(store: PersonalStore): PersonalGraphData {
  const nodes: PersonalGraphNode[] = store.entities.map(e => ({
    id: e.id,
    label: e.label,
    type: e.type,
    domain: e.domain,
    properties: e.properties,
    coordinates: e.coordinates,
  }));

  const links: PersonalGraphLink[] = store.relationships.map(r => ({
    source: r.sourceId,
    target: r.targetId,
    label: r.label,
    strength: r.strength,
  }));

  return { nodes, links };
}

// ── Cross-Referencing Engine ──
const CROSS_REF_RULES: {
  sourceType: PersonalEntityType;
  targetType: PersonalEntityType;
  label: string;
  match: (src: PersonalEntity, tgt: PersonalEntity) => number; // 0 = no match, >0 = confidence
}[] = [
  // Phone → Person: same name in contact
  {
    sourceType: 'phone_number', targetType: 'person',
    label: 'contact_of',
    match: (src, tgt) => {
      const srcName = (src.properties.contactName || '').toLowerCase();
      const tgtName = (tgt.label || '').toLowerCase();
      if (srcName && tgtName && srcName.includes(tgtName)) return 0.9;
      return 0;
    },
  },
  // Phone → Social: same number in bio/contact
  {
    sourceType: 'phone_number', targetType: 'social_profile',
    label: 'linked_to',
    match: (src, tgt) => {
      const num = src.properties.number || src.label;
      const bio = (tgt.properties.bio || tgt.properties.description || '').toLowerCase();
      if (num && bio.includes(num.replace(/[^0-9]/g, ''))) return 0.85;
      return 0;
    },
  },
  // Social → Person: same name
  {
    sourceType: 'social_profile', targetType: 'person',
    label: 'profile_of',
    match: (src, tgt) => {
      const srcName = (src.properties.displayName || src.label).toLowerCase();
      const tgtName = (tgt.label || '').toLowerCase();
      if (srcName && tgtName && (srcName.includes(tgtName) || tgtName.includes(srcName))) return 0.8;
      // Check email overlap
      const email = (src.properties.email || '').toLowerCase();
      const personEmail = (tgt.properties.email || '').toLowerCase();
      if (email && personEmail && email === personEmail) return 1.0;
      return 0;
    },
  },
  // Vehicle → Person: owner field
  {
    sourceType: 'vehicle', targetType: 'person',
    label: 'owned_by',
    match: (src, tgt) => {
      const owner = (src.properties.owner || '').toLowerCase();
      const tgtName = (tgt.label || '').toLowerCase();
      if (owner && tgtName && owner.includes(tgtName)) return 0.9;
      return 0;
    },
  },
  // MAC → WiFi: seen on this network
  {
    sourceType: 'mac_address', targetType: 'wifi_network',
    label: 'connected_to',
    match: (src, tgt) => {
      const srcNetworks: string[] = src.properties.wifiNetworks || [];
      if (srcNetworks.includes(tgt.properties.ssid || tgt.label)) return 0.95;
      return 0;
    },
  },
  // MAC → Person: device owner
  {
    sourceType: 'mac_address', targetType: 'person',
    label: 'device_of',
    match: (src, tgt) => {
      const owner = (src.properties.owner || '').toLowerCase();
      const tgtName = (tgt.label || '').toLowerCase();
      if (owner && tgtName && owner.includes(tgtName)) return 0.85;
      return 0;
    },
  },
  // Place → Person: residence
  {
    sourceType: 'place', targetType: 'person',
    label: 'residence_of',
    match: (src, tgt) => {
      const residents: string[] = src.properties.residents || [];
      const tgtName = (tgt.label || '').toLowerCase();
      if (residents.some(r => r.toLowerCase().includes(tgtName))) return 0.9;
      return 0;
    },
  },
  // ID → Person
  {
    sourceType: 'personal_id', targetType: 'person',
    label: 'identifies',
    match: (src, tgt) => {
      const nameOnID = (src.properties.fullName || '').toLowerCase();
      const tgtName = (tgt.label || '').toLowerCase();
      if (nameOnID && tgtName && nameOnID.includes(tgtName)) return 0.95;
      return 0;
    },
  },
  // Event → Place: occurred at
  {
    sourceType: 'event', targetType: 'place',
    label: 'occurred_at',
    match: (src, tgt) => {
      if (!src.coordinates || !tgt.coordinates) return 0;
      const d = haversineKm(src.coordinates.lat, src.coordinates.lng, tgt.coordinates.lat, tgt.coordinates.lng);
      return d < 1 ? 0.95 : d < 10 ? 0.7 : d < 50 ? 0.4 : 0;
    },
  },
  // Event → Person: involved
  {
    sourceType: 'event', targetType: 'person',
    label: 'involved',
    match: (src, tgt) => {
      const participants: string[] = src.properties.participants || [];
      const tgtName = (tgt.label || '').toLowerCase();
      if (participants.some(p => p.toLowerCase().includes(tgtName))) return 0.9;
      return 0;
    },
  },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Run cross-reference rules between all entities in the store.
 * Returns newly discovered relationships.
 */
export function crossReferenceStore(store: PersonalStore): PersonalRelationship[] {
  const existing = new Set(store.relationships.map(r => `${r.sourceId}:${r.targetId}:${r.label}`));
  const newRels: PersonalRelationship[] = [];
  const entities = store.entities;

  for (let i = 0; i < entities.length; i++) {
    for (let j = 0; j < entities.length; j++) {
      if (i === j) continue;
      const src = entities[i];
      const tgt = entities[j];

      for (const rule of CROSS_REF_RULES) {
        if (rule.sourceType !== src.type || rule.targetType !== tgt.type) continue;
        const key = `${src.id}:${tgt.id}:${rule.label}`;
        if (existing.has(key)) continue;
        const confidence = rule.match(src, tgt);
        if (confidence > 0.5) {
          newRels.push({
            id: `rel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            sourceId: src.id,
            targetId: tgt.id,
            label: rule.label,
            strength: confidence,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  return newRels;
}

// ── Entity ID Generator ──
export function generateEntityId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Type Glyphs (2-char badge labels for the interactive Link Editor) ──
// Ported from the OSINT-Mapping-Tool identifier registry concept so each
// person-data node carries a compact, recognisable badge on the canvas.
export const PERSONAL_TYPE_GLYPHS: Record<PersonalEntityType, string> = {
  person: 'PR',
  phone_number: '☎',
  social_profile: '@',
  personal_id: 'ID',
  vehicle: 'CR',
  place: 'PL',
  mac_address: 'MAC',
  wifi_network: 'WiFi',
  event: 'EV',
  image_media: 'IMG',
};

// Common relationship labels offered when wiring two nodes together by hand.
export const RELATIONSHIP_LABELS: string[] = [
  'linked_to',
  'owns',
  'owned_by',
  'registered_to',
  'contact_of',
  'profile_of',
  'identifies',
  'located_at',
  'residence_of',
  'connected_to',
  'device_of',
  'involved',
  'family_of',
  'associate_of',
];

/**
 * Build a brand-new relationship record between two entities.
 * Used by the interactive Link Editor when an analyst draws an edge.
 */
export function makeRelationship(
  sourceId: string,
  targetId: string,
  label: string = 'linked_to',
  strength: number = 1,
): PersonalRelationship {
  return {
    id: `rel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sourceId,
    targetId,
    label,
    strength,
    createdAt: new Date().toISOString(),
  };
}
