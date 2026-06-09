
import { NextResponse } from 'next/server';
import { stealthFetch } from '@/lib/stealthFetch';

/**
 * OSIRIS — Flight Data API
 * Fetches real-time aircraft positions from adsb.lol (no API key required)
 * Covers 6 global regions for maximum coverage
 */

const REGIONS = [
  { lat: 39.8, lon: -98.5, dist: 2000 },   // Nord America
  { lat: 50.0, lon: 15.0, dist: 2000 },     // Europa
  { lat: 35.0, lon: 105.0, dist: 2000 },    // Asia
  { lat: -25.0, lon: 133.0, dist: 2000 },   // Australia
  { lat: 0.0, lon: 20.0, dist: 2500 },      // Africa
  { lat: -15.0, lon: -60.0, dist: 2000 },   // Sud America
];

// Codici tipo elicottero
const HELI_TYPES = new Set([
  'R22','R44','R66','B06','B06T','B204','B205','B206','B212','B222','B230',
  'B407','B412','B427','B429','B430','B505','B525',
  'AS32','AS35','AS50','AS55','AS65',
  'EC20','EC25','EC30','EC35','EC45','EC55','EC75',
  'H125','H130','H135','H145','H155','H160','H175','H215','H225',
  'S55','S58','S61','S64','S70','S76','S92',
  'A109','A119','A139','A169','A189','AW09',
  'MD52','MD60','MDHI','MD90','NOTR',
  'B47G','HUEY','GAMA','CABR','EXE',
]);

// Tipi jet privati
const PRIVATE_JET_TYPES = new Set([
  'G150','G200','G280','GLEX','G500','G550','G600','G650','G700',
  'GLF2','GLF3','GLF4','GLF5','GLF6','GL5T','GL7T','GV','GIV',
  'CL30','CL35','CL60','BD70','BD10',
  'C25A','C25B','C25C','C500','C510','C525','C550','C560','C56X','C680','C700','C750',
  'E35L','E50P','E55P','E545','E550',
  'FA50','FA7X','FA8X','F900','F2TH',
  'LJ35','LJ40','LJ45','LJ60','LJ70','LJ75',
  'PC12','PC24','TBM7','TBM8','TBM9',
  'PRM1','SF50','EA50','VLJ',
]);

// Indicatori tipo militari
const MILITARY_INDICATORS = new Set([
  'C17','C5M','C130','C30J','KC10','KC46','KC35','E3CF','E3TF','E8A',
  'B1B','B2','B52','F16','F15','F18','F22','F35','A10','F117',
  'RC135','E6B','P8A','P3','MQ9','RQ4','U2','EP3','RC12',
  'V22','CH47','UH60','AH64','AH1Z','MV22',
  'EUFI','RFAL','TORD','TYP','GR4',
]);

const AIRLINE_CODE_RE = /^([A-Z]{3})\d/;

async function fetchRegion(region: typeof REGIONS[0]): Promise<any[]> {
  try {
    const url = `https://api.adsb.lol/v2/lat/${region.lat}/lon/${region.lon}/dist/${region.dist}`;
    const res = await stealthFetch(url, {
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) {
      const data = await res.json();
      return data.ac || [];
    }
  } catch (e) {
    console.warn(`Region fetch failed for lat=${region.lat}:`, e);
  }
  return [];
}

function classifyFlight(f: any) {
  const modelUpper = (f.t || '').toUpperCase();
  const flightStr = (f.flight || '').trim().toUpperCase();
  const dbFlags = (f.dbFlags || 0);

  // Salta strutture fisse
  if (modelUpper === 'TWR') return null;

  const lat = f.lat;
  const lon = f.lon;
  if (lat == null || lon == null) return null;

  const callsign = flightStr || f.hex || 'UNKNOWN';
  const altRaw = f.alt_baro;
  const altMeters = typeof altRaw === 'number' ? altRaw * 0.3048 : 0;
  const speedKnots = typeof f.gs === 'number' ? Math.round(f.gs * 10) / 10 : null;
  const heading = f.track || 0;
  const isHeli = HELI_TYPES.has(modelUpper);
  const isGrounded = typeof altRaw === 'number' && altRaw < 100;

  // Estrai codice compagnia aerea
  const airlineMatch = AIRLINE_CODE_RE.exec(callsign);
  const airlineCode = airlineMatch ? airlineMatch[1] : '';

  // Classificazione
  let category: 'commercial' | 'private' | 'jet' | 'military' = 'commercial';
  if (dbFlags & 1 || MILITARY_INDICATORS.has(modelUpper) || (f.flight || '').match(/^(RCH|KING|DUKE|EVAC|JAKE|REACH|CONVOY)\d/i)) {
    category = 'military';
  } else if (PRIVATE_JET_TYPES.has(modelUpper)) {
    category = 'jet';
  } else if (!airlineCode && modelUpper && !['A319','A320','A321','A332','A333','A339','A343','A359','A388','B737','B738','B739','B38M','B39M','B752','B753','B763','B764','B772','B77L','B77W','B788','B789','B78X','E170','E175','E190','E195','CRJ7','CRJ9','AT43','AT72','DH8D'].includes(modelUpper)) {
    category = 'private';
  }

  return {
    callsign,
    lat: Math.round(lat * 100000) / 100000,
    lng: Math.round(lon * 100000) / 100000,
    alt: Math.round(altMeters),
    heading: Math.round(heading),
    speed_knots: speedKnots,
    model: f.t || 'Unknown',
    icao24: f.hex || '',
    registration: f.r || 'N/A',
    squawk: f.squawk || '',
    airline_code: airlineCode,
    aircraft_category: isHeli ? 'heli' : 'plane',
    category,
    grounded: isGrounded,
    nac_p: f.nac_p,
    type: 'flight',
  };
}

// Cache in memoria per prevenire abuso di fan-out globale
// NOTA (Issue #110): Questa cache è per-isolate in ambienti serverless (Vercel).
// Isolate multipli possono avere la propria cache, ma questo è accettabile perché:
// 1. Unisce richieste concorrenti nello stesso isolate
// 2. Previene il sovraccarico di adsb.lol che causerebbe ban per limite richieste
// Per una cache condivisa globalmente, migrare a Vercel KV o memoria persistente simile.
let cachedData: any = null;
let lastFetchTime = 0;
const CACHE_TTL = 45000; // 45 seconds cache window
let fetchPromise: Promise<any> | null = null;

export async function GET() {
  const now = Date.now();

  // Restituisci dati in cache se entro il TTL
  if (cachedData && now - lastFetchTime < CACHE_TTL) {
    return NextResponse.json(cachedData, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  }

  // Unisci richieste concorrenti: attendi il fetch attivo invece di avviarne uno nuovo
  if (fetchPromise) {
    try {
      const data = await fetchPromise;
      return NextResponse.json(data, {
        headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
      });
    } catch {
      // Fallback a errore se il fetch in sospeso fallisce
      return NextResponse.json({ error: 'Failed to fetch flight data' }, { status: 500 });
    }
  }

  const JAMMING_NACAP_THRESHOLD = 4;

  // Avvia nuovo fetch globale
  fetchPromise = (async () => {
    // Recupera tutte le 6 regioni in parallelo
    const regionResults = await Promise.allSettled(
      REGIONS.map(r => fetchRegion(r))
    );

    const allRaw: any[] = [];
    const seenHex = new Set<string>();

    for (const result of regionResults) {
      if (result.status === 'fulfilled') {
        for (const ac of result.value) {
          const hex = (ac.hex || '').toLowerCase().trim();
          if (hex && !seenHex.has(hex)) {
            seenHex.add(hex);
            allRaw.push(ac);
          }
        }
      }
    }

    // Classifica tutti i voli
    const commercial: any[] = [];
    const privateFl: any[] = [];
    const jets: any[] = [];
    const military: any[] = [];
    const gpsJamming: any[] = [];

    for (const raw of allRaw) {
      const flight = classifyFlight(raw);
      if (!flight) continue;

      // Rilevamento jamming GPS
      if (typeof flight.nac_p === 'number' && flight.nac_p <= JAMMING_NACAP_THRESHOLD && !flight.grounded) {
        gpsJamming.push({
          lat: flight.lat,
          lng: flight.lng,
          nac_p: flight.nac_p,
          callsign: flight.callsign,
        });
      }

      switch (flight.category) {
        case 'military': military.push(flight); break;
        case 'jet': jets.push(flight); break;
        case 'private': privateFl.push(flight); break;
        default: commercial.push(flight);
      }
    }

    // Aggrega zone di jamming GPS (basate su griglia)
    const jammingZones = aggregateJamming(gpsJamming, JAMMING_NACAP_THRESHOLD);

    return {
      commercial_flights: commercial,
      private_flights: privateFl,
      private_jets: jets,
      military_flights: military,
      gps_jamming: jammingZones,
      total: allRaw.length,
      timestamp: new Date().toISOString(),
    };
  })();

  try {
    const data = await fetchPromise;
    cachedData = data;
    lastFetchTime = Date.now();
    fetchPromise = null;

    const cacheControl = data.total < 100 
      ? 'no-store, max-age=0' 
      : 'public, s-maxage=30, stale-while-revalidate=60';

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': cacheControl,
      },
    });
  } catch (error) {
    console.error('Flight fetch error:', error);
    fetchPromise = null;
    return NextResponse.json(
      { error: 'Failed to fetch flight data' },
      { status: 500 }
    );
  }
}

function aggregateJamming(points: any[], threshold: number) {
  if (points.length === 0) return [];
  const grid = new Map<string, { lat: number; lng: number; count: number; total_nac_p: number }>();
  const GRID_SIZE = 2; // degrees

  for (const p of points) {
    const gLat = Math.floor(p.lat / GRID_SIZE) * GRID_SIZE;
    const gLng = Math.floor(p.lng / GRID_SIZE) * GRID_SIZE;
    const key = `${gLat},${gLng}`;

    if (!grid.has(key)) {
      grid.set(key, { lat: gLat + GRID_SIZE / 2, lng: gLng + GRID_SIZE / 2, count: 0, total_nac_p: 0 });
    }
    const cell = grid.get(key)!;
    cell.count++;
    cell.total_nac_p += p.nac_p;
  }

  return Array.from(grid.values())
    .filter(z => z.count >= 3) // Minimo 3 aeromobili con NACp degradato
    .map(z => ({
      lat: z.lat,
      lng: z.lng,
      severity: Math.round((1 - (z.total_nac_p / z.count) / threshold) * 100),
      count: z.count,
    }));
}

