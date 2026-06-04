import { sourceMeta } from './source-metadata.ts';

export const OVERPASS_CAMPING_URL = 'https://overpass-api.de/api/interpreter';

export type CampingBbox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

type OverpassCampingElement = {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

export type CampingSite = {
  id: string;
  name: string;
  kind: 'camp_site' | 'caravan_site';
  lat: number;
  lng: number;
  operator?: string;
  website?: string;
  phone?: string;
  capacity?: string;
  tags: Record<string, string>;
  source: ReturnType<typeof sourceMeta>;
};

export function buildOverpassCampingQuery(bbox: CampingBbox): string {
  assertCampingBbox(bbox);
  const box = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  return `[out:json][timeout:10];(
node["tourism"="camp_site"](${box});
way["tourism"="camp_site"](${box});
relation["tourism"="camp_site"](${box});
node["tourism"="caravan_site"](${box});
way["tourism"="caravan_site"](${box});
relation["tourism"="caravan_site"](${box});
);out center 300;`;
}

export function normalizeCampingElement(element: OverpassCampingElement): CampingSite | null {
  const lat = typeof element.lat === 'number' ? element.lat : element.center?.lat;
  const lng = typeof element.lon === 'number' ? element.lon : element.center?.lon;
  if (!element.type || typeof element.id !== 'number' || typeof lat !== 'number' || typeof lng !== 'number') return null;

  const tags = element.tags || {};
  const tourism = tags.tourism === 'caravan_site' ? 'caravan_site' : 'camp_site';

  return {
    id: `osm-${element.type}-${element.id}`,
    name: tags.name || tags.operator || (tourism === 'caravan_site' ? 'Unnamed caravan site' : 'Unnamed camp site'),
    kind: tourism,
    lat,
    lng,
    operator: tags.operator,
    website: tags.website || tags['contact:website'],
    phone: tags.phone || tags['contact:phone'],
    capacity: tags.capacity || tags['capacity:caravans'] || tags['capacity:tents'],
    tags,
    source: sourceMeta({
      provider: 'OpenStreetMap/Overpass',
      feed: 'camping-sites',
      url: OVERPASS_CAMPING_URL,
      attribution: 'OpenStreetMap contributors',
      license: 'ODbL',
      cacheTtlSeconds: 86400,
      confidence: 0.72,
    }),
  };
}

export async function fetchCampingSites(bbox: CampingBbox): Promise<CampingSite[]> {
  const query = buildOverpassCampingQuery(bbox);
  const res = await fetch(OVERPASS_CAMPING_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'OSIRIS/0.1 camping sites',
    },
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);

  const data = (await res.json()) as { elements?: OverpassCampingElement[] };
  return (data.elements || []).map(normalizeCampingElement).filter((item): item is CampingSite => Boolean(item));
}

function assertCampingBbox(bbox: CampingBbox) {
  const width = bbox.east - bbox.west;
  const height = bbox.north - bbox.south;
  if (![bbox.south, bbox.west, bbox.north, bbox.east].every(Number.isFinite)) {
    throw new Error('Invalid bbox coordinates');
  }
  if (width <= 0 || height <= 0 || width > 3 || height > 3) {
    throw new Error('Camping bbox must be positive and no larger than 3 degrees per axis');
  }
}
