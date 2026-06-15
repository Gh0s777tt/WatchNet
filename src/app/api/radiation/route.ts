import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * OSIRIS - Radiation Monitoring API
 * Pulls open Safecast radiation measurements for key monitoring regions.
 * Safecast data is published under CC0 and can be queried anonymously.
 */

const SAFECAST_API = 'https://api.safecast.org/measurements.json';
const CPM_TO_NS_PER_HOUR = 1000 / 334; // bGeigie-style CPM approximation.

const REGIONS = [
  { name: 'Fukushima Prefecture', city: 'Fukushima', country: 'Japan', lat: 37.7608, lng: 140.4747, distance: 120000 },
  { name: 'Tokyo Metro', city: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, distance: 70000 },
  { name: 'Chernobyl Exclusion Zone', city: 'Pripyat', country: 'Ukraine', lat: 51.389, lng: 30.099, distance: 120000 },
  { name: 'Kyiv Region', city: 'Kyiv', country: 'Ukraine', lat: 50.4501, lng: 30.5234, distance: 80000 },
  { name: 'Los Angeles Basin', city: 'Los Angeles', country: 'United States', lat: 34.0522, lng: -118.2437, distance: 90000 },
  { name: 'New York Metro', city: 'New York', country: 'United States', lat: 40.7128, lng: -74.006, distance: 70000 },
  { name: 'London Metro', city: 'London', country: 'United Kingdom', lat: 51.5072, lng: -0.1276, distance: 70000 },
  { name: 'Paris Metro', city: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, distance: 70000 },
  { name: 'Berlin Metro', city: 'Berlin', country: 'Germany', lat: 52.52, lng: 13.405, distance: 70000 },
];

interface SafecastMeasurement {
  id: number;
  value: number;
  unit: string;
  location_name?: string | null;
  device_id?: number | null;
  captured_at?: string;
  latitude: number;
  longitude: number;
}

interface RadiationStation {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  reading: number;
  rawValue: number;
  rawUnit: string;
  status: 'OK' | 'WARNING' | 'DANGER';
  network: 'Safecast';
  capturedAt: string;
  deviceId?: number | null;
  source: 'Safecast API';
}

function normalizeReading(value: number, unit: string): number | null {
  const lower = unit.toLowerCase();
  if (lower === 'cpm') return Math.round(value * CPM_TO_NS_PER_HOUR);
  if (lower === 'usv' || lower === 'usv/h' || lower === 'µsv/h') return Math.round(value * 1000);
  if (lower === 'nsv/h') return Math.round(value);
  return null;
}

function statusFor(reading: number): 'OK' | 'WARNING' | 'DANGER' {
  if (reading >= 1000) return 'DANGER';
  if (reading >= 500) return 'WARNING';
  return 'OK';
}

function cacheKey(m: SafecastMeasurement): string {
  const device = m.device_id ? `device:${m.device_id}` : 'device:unknown';
  return `${device}:${m.latitude.toFixed(3)}:${m.longitude.toFixed(3)}`;
}

async function fetchRegion(region: typeof REGIONS[number]): Promise<RadiationStation[]> {
  const params = new URLSearchParams({
    latitude: String(region.lat),
    longitude: String(region.lng),
    distance: String(region.distance),
    per_page: '100',
  });

  const res = await fetch(`${SAFECAST_API}?${params.toString()}`, {
    signal: AbortSignal.timeout(12000),
    headers: {
      Accept: 'application/json',
      'User-Agent': 'OSIRIS-Intelligence-Platform/0.1',
    },
  });

  if (!res.ok) return [];
  const measurements = await res.json();
  if (!Array.isArray(measurements)) return [];

  const latestByDevice = new Map<string, RadiationStation>();
  for (const m of measurements as SafecastMeasurement[]) {
    if (!m.latitude || !m.longitude || typeof m.value !== 'number' || !m.unit) continue;

    const reading = normalizeReading(m.value, m.unit);
    if (reading === null) continue;

    const key = cacheKey(m);
    const existing = latestByDevice.get(key);
    const capturedAt = m.captured_at || '';
    if (existing && capturedAt <= existing.capturedAt) continue;

    latestByDevice.set(key, {
      id: `safecast-${m.id}`,
      name: m.location_name || `${region.name} Monitor`,
      city: region.city,
      country: region.country,
      lat: Math.round(m.latitude * 100000) / 100000,
      lng: Math.round(m.longitude * 100000) / 100000,
      reading,
      rawValue: m.value,
      rawUnit: m.unit,
      status: statusFor(reading),
      network: 'Safecast',
      capturedAt,
      deviceId: m.device_id,
      source: 'Safecast API',
    });
  }

  return Array.from(latestByDevice.values());
}

export async function GET() {
  try {
    const results = await Promise.allSettled(REGIONS.map(fetchRegion));
    const stations = results
      .flatMap(result => result.status === 'fulfilled' ? result.value : [])
      .sort((a, b) => b.reading - a.reading)
      .slice(0, 500);

    return NextResponse.json({
      stations,
      total: stations.length,
      source: 'Safecast',
      license: 'CC0-1.0',
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    console.error('Radiation API error:', error);
    return NextResponse.json({ stations: [], error: 'Failed to fetch radiation data' }, { status: 500 });
  }
}
