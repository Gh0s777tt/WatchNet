import { sourceMeta } from './source-metadata.ts';

export const OVERPASS_INTERPRETER_URL = 'https://overpass-api.de/api/interpreter';

export type GermanyRailKind = 'station' | 'halt' | 'yard' | 'depot' | 'junction' | 'line';

export type StaticRailHub = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  operator?: string;
  network?: string;
};

export type GermanyRailInfrastructure = {
  id: string;
  kind: GermanyRailKind;
  name: string;
  lat?: number;
  lng?: number;
  operator?: string;
  network?: string;
  uicRef?: string;
  ref?: string;
  electrified?: string;
  usage?: string;
  gauge?: string;
  geometry?: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  tags: Record<string, string>;
  source: ReturnType<typeof sourceMeta>;
};

type OverpassGeometryPoint = {
  lat?: number;
  lon?: number;
};

type OverpassElement = {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  geometry?: OverpassGeometryPoint[];
  tags?: Record<string, string>;
};

export const GERMANY_RAIL_HUBS: StaticRailHub[] = [
  { id: '8011160', name: 'Berlin Hbf', lat: 52.525592, lng: 13.369545, operator: 'DB InfraGO', network: 'DB' },
  { id: '8000105', name: 'Frankfurt(Main)Hbf', lat: 50.107149, lng: 8.663785, operator: 'DB InfraGO', network: 'DB' },
  { id: '8000261', name: 'München Hbf', lat: 48.140232, lng: 11.558335, operator: 'DB InfraGO', network: 'DB' },
  { id: '8002549', name: 'Hamburg Hbf', lat: 53.552733, lng: 10.006909, operator: 'DB InfraGO', network: 'DB' },
  { id: '8000207', name: 'Köln Hbf', lat: 50.943029, lng: 6.958729, operator: 'DB InfraGO', network: 'DB' },
  { id: '8000080', name: 'Düsseldorf Hbf', lat: 51.219961, lng: 6.794138, operator: 'DB InfraGO', network: 'DB' },
  { id: '8000096', name: 'Dortmund Hbf', lat: 51.517899, lng: 7.459294, operator: 'DB InfraGO', network: 'DB' },
  { id: '8000098', name: 'Dresden Hbf', lat: 51.040562, lng: 13.732035, operator: 'DB InfraGO', network: 'DB' },
  { id: '8010205', name: 'Leipzig Hbf', lat: 51.345477, lng: 12.382128, operator: 'DB InfraGO', network: 'DB' },
  { id: '8000290', name: 'Nürnberg Hbf', lat: 49.445435, lng: 11.082276, operator: 'DB InfraGO', network: 'DB' },
  { id: '8000091', name: 'Hannover Hbf', lat: 52.377689, lng: 9.741859, operator: 'DB InfraGO', network: 'DB' },
  { id: '8000090', name: 'Stuttgart Hbf', lat: 48.78395, lng: 9.181635, operator: 'DB InfraGO', network: 'DB' },
];

export function buildGermanyRailInfrastructureQuery(limit = 160): string {
  const boundedLimit = Math.min(500, Math.max(1, Math.round(limit)));
  return `[out:json][timeout:18];area["ISO3166-1"="DE"][admin_level=2]->.de;(
node["railway"~"station|halt|yard|depot|junction"](area.de);
way["railway"~"station|halt|yard|depot"](area.de);
way["railway"="rail"](area.de);
);out center geom ${boundedLimit};`;
}

export function normalizeStaticRailHub(hub: StaticRailHub): GermanyRailInfrastructure {
  return {
    id: `rail-de-hub-${hub.id}`,
    kind: 'station',
    name: hub.name,
    lat: hub.lat,
    lng: hub.lng,
    operator: hub.operator,
    network: hub.network,
    uicRef: hub.id,
    tags: {
      railway: 'station',
      uic_ref: hub.id,
      operator: hub.operator || '',
      network: hub.network || '',
    },
    source: railSourceMeta('rail-germany-infrastructure', 86400, 0.65),
  };
}

export function normalizeOverpassRailElement(element: OverpassElement): GermanyRailInfrastructure | null {
  if (!element.type || typeof element.id !== 'number') return null;
  const tags = element.tags || {};
  const kind = classifyRailKind(tags);
  if (!kind) return null;

  const geometry = kind === 'line' ? normalizeLineGeometry(element.geometry) : undefined;
  const lat = typeof element.lat === 'number' ? element.lat : element.center?.lat;
  const lng = typeof element.lon === 'number' ? element.lon : element.center?.lon;
  if (!geometry && (typeof lat !== 'number' || typeof lng !== 'number')) return null;

  return {
    id: buildRailId(element, tags),
    kind,
    name: tags.name || tags.ref || railKindLabel(kind),
    lat,
    lng,
    operator: tags.operator,
    network: tags.network,
    uicRef: tags.uic_ref,
    ref: tags.ref,
    electrified: tags.electrified,
    usage: tags.usage,
    gauge: tags.gauge,
    geometry,
    tags,
    source: railSourceMeta('rail-germany-infrastructure', 86400, 0.78),
  };
}

export async function fetchGermanyRailInfrastructure(limit = 160): Promise<GermanyRailInfrastructure[]> {
  const query = buildGermanyRailInfrastructureQuery(limit);
  const res = await fetch(OVERPASS_INTERPRETER_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'OSIRIS/0.1 germany rail infrastructure',
    },
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(18000),
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);

  const data = (await res.json()) as { elements?: OverpassElement[] };
  return dedupeRailInfrastructure(
    (data.elements || [])
      .map(normalizeOverpassRailElement)
      .filter((item): item is GermanyRailInfrastructure => Boolean(item)),
  );
}

export function staticGermanyRailInfrastructure(): GermanyRailInfrastructure[] {
  return GERMANY_RAIL_HUBS.map(normalizeStaticRailHub);
}

function classifyRailKind(tags: Record<string, string>): GermanyRailKind | null {
  const railway = tags.railway;
  if (railway === 'rail') return 'line';
  if (railway === 'station') return 'station';
  if (railway === 'halt') return 'halt';
  if (railway === 'yard') return 'yard';
  if (railway === 'depot') return 'depot';
  if (railway === 'junction') return 'junction';
  return null;
}

function normalizeLineGeometry(points?: OverpassGeometryPoint[]): GermanyRailInfrastructure['geometry'] | undefined {
  const coordinates = (points || [])
    .map((point): [number, number] | null => (
      typeof point.lon === 'number' && typeof point.lat === 'number' ? [point.lon, point.lat] : null
    ))
    .filter((point): point is [number, number] => Boolean(point));

  if (coordinates.length < 2) return undefined;
  return { type: 'LineString', coordinates };
}

function buildRailId(element: OverpassElement, tags: Record<string, string>): string {
  if (tags.uic_ref) return `rail-de-uic-${tags.uic_ref}`;
  return `rail-de-${element.type}-${element.id}`;
}

function railKindLabel(kind: GermanyRailKind): string {
  if (kind === 'line') return 'Rail line';
  if (kind === 'yard') return 'Rail yard';
  if (kind === 'depot') return 'Rail depot';
  if (kind === 'junction') return 'Rail junction';
  if (kind === 'halt') return 'Rail halt';
  return 'Rail station';
}

function railSourceMeta(feed: string, cacheTtlSeconds: number, confidence: number) {
  return sourceMeta({
    provider: 'OpenStreetMap/Overpass',
    feed,
    url: OVERPASS_INTERPRETER_URL,
    attribution: 'OpenStreetMap contributors',
    license: 'ODbL',
    cacheTtlSeconds,
    confidence,
  });
}

function dedupeRailInfrastructure(items: GermanyRailInfrastructure[]): GermanyRailInfrastructure[] {
  const seen = new Set<string>();
  const deduped: GermanyRailInfrastructure[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
  }
  return deduped;
}
