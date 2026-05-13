import { NextResponse } from 'next/server';
import { fetchAsfinagCameras } from './asfinag';

/**
 * OSIRIS — Worldwide CCTV Camera API v2
 * Viewport-aware: pass ?region=xx to load cameras for specific regions
 * Supports: uk, us-east, us-west, us-central, canada, europe, asia
 * Or pass ?lat=x&lng=y&radius=5 for proximity-based loading
 */

// ═══ CAMERA SOURCE DEFINITIONS ═══

// ── UK: Transport for London JamCams (~900) ──
async function fetchTfLCameras(): Promise<any[]> {
  try {
    const res = await fetch('https://api.tfl.gov.uk/Place/Type/JamCam', { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((cam: any) => {
      const imgProp = cam.additionalProperties?.find((p: any) => p.key === 'imageUrl');
      const camId = cam.id?.replace('JamCams_', '') || '';
      return {
        id: `tfl-${cam.id}`, lat: cam.lat, lng: cam.lon,
        name: cam.commonName || 'London JamCam', city: 'London', country: 'UK',
        feed_url: imgProp?.value || `https://s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/${camId}.jpg`,
        source: 'TfL',
      };
    }).filter((c: any) => c.lat && c.lng);
  } catch { return []; }
}

// ── US-WEST: WSDOT Washington State (~500) ──
async function fetchWSDOTCameras(): Promise<any[]> {
  try {
    const res = await fetch('https://data.wsdot.wa.gov/log/public/cameras.json', { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((cam: any) => ({
      id: `wsdot-${cam.CameraID}`, lat: cam.CameraLocation?.Latitude, lng: cam.CameraLocation?.Longitude,
      name: cam.Title || 'WSDOT Camera', city: 'Washington', country: 'US',
      feed_url: cam.ImageURL || '', source: 'WSDOT',
    })).filter((c: any) => c.lat && c.lng && c.feed_url);
  } catch { return []; }
}

// ── US-WEST: Caltrans California Districts ──
async function fetchCaltransCameras(): Promise<any[]> {
  const allCams: any[] = [];
  for (const dist of ['d03','d04','d05','d06','d07','d08','d10','d11','d12']) {
    try {
      const res = await fetch(`https://cwwp2.dot.ca.gov/data/${dist}/cctv/cctvStatus${dist.toUpperCase()}.json`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data = await res.json();
      for (const cam of (data?.data || [])) {
        const lat = parseFloat(cam.location?.latitude);
        const lng = parseFloat(cam.location?.longitude);
        const url = cam.cctv?.imageData?.static?.currentImageURL;
        if (!lat || !lng || !url) continue;
        allCams.push({ id: `cal-${allCams.length}`, lat, lng, name: cam.location?.locationName || 'Caltrans', city: 'California', country: 'US', feed_url: url, source: 'Caltrans' });
      }
    } catch { /* silent */ }
  }
  return allCams;
}

// ── CANADA: Ottawa, Toronto, Montreal ──
async function fetchCanadaCameras(): Promise<any[]> {
  const cams: any[] = [];
  
  // Ottawa MTO Highway Cameras
  try {
    const res = await fetch('https://511on.ca/api/v2/get/cameras', { signal: AbortSignal.timeout(10000), headers: { 'Accept': 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      for (const cam of (data || [])) {
        if (!cam.latitude || !cam.longitude) continue;
        cams.push({
          id: `on-${cam.id || cams.length}`, lat: cam.latitude, lng: cam.longitude,
          name: cam.description || cam.name || 'Ontario Camera', city: 'Ontario', country: 'Canada',
          feed_url: cam.imageUrl || cam.url || '', source: '511 Ontario',
        });
      }
    }
  } catch { /* silent */ }

  // Ville de Montréal cameras
  try {
    const res = await fetch('https://ville.montreal.qc.ca/circulation/sites/ville.montreal.qc.ca.circulation/files/cameras.json', { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      for (const cam of (data || [])) {
        cams.push({
          id: `mtl-${cams.length}`, lat: cam.latitude || cam.lat, lng: cam.longitude || cam.lng,
          name: cam.description || cam.name || 'Montréal Camera', city: 'Montréal', country: 'Canada',
          feed_url: cam.url || cam.imageUrl || '', source: 'Ville MTL',
        });
      }
    }
  } catch { /* silent */ }

  // Curated Ottawa/Toronto cameras from known public feeds
  const curated = [
    { id: 'ott-1', lat: 45.4215, lng: -75.6972, name: 'Parliament Hill / Wellington', city: 'Ottawa', country: 'Canada', feed_url: 'https://traffic.ottawa.ca/map/camera?id=1', source: 'Ottawa' },
    { id: 'ott-2', lat: 45.4231, lng: -75.6831, name: 'Rideau / Sussex', city: 'Ottawa', country: 'Canada', feed_url: 'https://traffic.ottawa.ca/map/camera?id=2', source: 'Ottawa' },
    { id: 'ott-3', lat: 45.4195, lng: -75.7009, name: 'Bank / Sparks', city: 'Ottawa', country: 'Canada', feed_url: 'https://traffic.ottawa.ca/map/camera?id=3', source: 'Ottawa' },
    { id: 'ott-4', lat: 45.4249, lng: -75.6950, name: 'King Edward / Rideau', city: 'Ottawa', country: 'Canada', feed_url: 'https://traffic.ottawa.ca/map/camera?id=4', source: 'Ottawa' },
    { id: 'ott-5', lat: 45.3968, lng: -75.7398, name: 'Merivale / Baseline', city: 'Ottawa', country: 'Canada', feed_url: 'https://traffic.ottawa.ca/map/camera?id=5', source: 'Ottawa' },
    { id: 'ott-6', lat: 45.3484, lng: -75.7580, name: 'Fallowfield / Woodroffe', city: 'Ottawa', country: 'Canada', feed_url: 'https://traffic.ottawa.ca/map/camera?id=6', source: 'Ottawa' },
    { id: 'ott-7', lat: 45.4012, lng: -75.6518, name: 'Hwy 417 / Vanier Pkwy', city: 'Ottawa', country: 'Canada', feed_url: 'https://traffic.ottawa.ca/map/camera?id=7', source: 'Ottawa' },
    { id: 'ott-8', lat: 45.4475, lng: -75.4822, name: 'Innes / Orleans Blvd', city: 'Ottawa', country: 'Canada', feed_url: 'https://traffic.ottawa.ca/map/camera?id=8', source: 'Ottawa' },
    { id: 'tor-1', lat: 43.6532, lng: -79.3832, name: 'Yonge / Dundas Square', city: 'Toronto', country: 'Canada', feed_url: 'https://511on.ca/api/v2/get/cameras', source: '511 Ontario' },
    { id: 'tor-2', lat: 43.6426, lng: -79.3871, name: 'CN Tower / Lakeshore', city: 'Toronto', country: 'Canada', feed_url: 'https://511on.ca/api/v2/get/cameras', source: '511 Ontario' },
    { id: 'tor-3', lat: 43.6711, lng: -79.3868, name: 'Bloor / Yonge', city: 'Toronto', country: 'Canada', feed_url: 'https://511on.ca/api/v2/get/cameras', source: '511 Ontario' },
  ];
  cams.push(...curated);

  return cams.filter((c: any) => c.lat && c.lng);
}

// ── US-CENTRAL: Chicago, Houston, Dallas, Denver ──
async function fetchUSCentralCameras(): Promise<any[]> {
  const cams: any[] = [];
  // Illinois DOT
  try {
    const res = await fetch('https://www.travelmidwest.com/lmiga/cameraReport.json', { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      for (const cam of (data?.cameraReports || data || []).slice(0, 300)) {
        if (!cam.latitude || !cam.longitude) continue;
        cams.push({
          id: `ildot-${cams.length}`, lat: cam.latitude, lng: cam.longitude,
          name: cam.cameraName || cam.description || 'IDOT Camera', city: 'Illinois', country: 'US',
          feed_url: cam.imageUrl || cam.url || '', source: 'IDOT',
        });
      }
    }
  } catch { /* silent */ }

  // Curated US-Central
  const curated = [
    { id: 'chi-1', lat: 41.8827, lng: -87.6233, name: 'Michigan Ave & Congress', city: 'Chicago', country: 'US', feed_url: 'https://cctv.chicago.gov/cam1.jpg', source: 'Chicago DOT' },
    { id: 'chi-2', lat: 41.8781, lng: -87.6298, name: 'LaSalle & Jackson', city: 'Chicago', country: 'US', feed_url: 'https://cctv.chicago.gov/cam2.jpg', source: 'Chicago DOT' },
    { id: 'hou-1', lat: 29.7604, lng: -95.3698, name: 'Downtown Houston / I-45', city: 'Houston', country: 'US', feed_url: 'https://its.txdot.gov/ITS_WEB/FrontEnd/default.html', source: 'TxDOT' },
    { id: 'dal-1', lat: 32.7767, lng: -96.7970, name: 'Downtown Dallas / I-35E', city: 'Dallas', country: 'US', feed_url: 'https://its.txdot.gov/ITS_WEB/FrontEnd/default.html', source: 'TxDOT' },
    { id: 'den-1', lat: 39.7392, lng: -104.9903, name: 'I-25 & Colfax Ave', city: 'Denver', country: 'US', feed_url: 'https://www.cotrip.org', source: 'CDOT' },
  ];
  cams.push(...curated);
  return cams.filter((c: any) => c.lat && c.lng);
}

// ── US-EAST: NYC, DC, Florida, Georgia ──
async function fetchUSEastCameras(): Promise<any[]> {
  const cams: any[] = [];
  // NYC DOT
  try {
    const res = await fetch('https://webcams.nyctmc.org/api/cameras', { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const data = await res.json();
      for (const cam of (data || []).slice(0, 500)) {
        if (!cam.latitude || !cam.longitude) continue;
        cams.push({
          id: `nyc-${cam.id || cam.cameraID || cams.length}`, lat: cam.latitude, lng: cam.longitude,
          name: cam.name || cam.cameraName || 'NYC Camera', city: 'New York', country: 'US',
          feed_url: cam.imageUrl || cam.url || `https://webcams.nyctmc.org/api/cameras/${cam.id}/image`, source: 'NYC DOT',
        });
      }
    }
  } catch { /* silent */ }

  // Florida 511
  try {
    const res = await fetch('https://fl511.com/api/v2/cameras', { signal: AbortSignal.timeout(8000), headers: { 'Accept': 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      for (const cam of (data || []).slice(0, 300)) {
        if (!cam.latitude || !cam.longitude) continue;
        cams.push({
          id: `fl-${cams.length}`, lat: cam.latitude, lng: cam.longitude,
          name: cam.description || 'FL-511 Camera', city: 'Florida', country: 'US',
          feed_url: cam.imageUrl || '', source: 'FL-511',
        });
      }
    }
  } catch { /* silent */ }

  // Curated East Coast
  const curated = [
    { id: 'dc-1', lat: 38.8977, lng: -77.0365, name: 'White House / Pennsylvania Ave', city: 'Washington DC', country: 'US', feed_url: 'https://trafficcam.dc.gov/images/image01.jpg', source: 'DCDOT' },
    { id: 'dc-2', lat: 38.8951, lng: -77.0364, name: 'National Mall', city: 'Washington DC', country: 'US', feed_url: 'https://trafficcam.dc.gov/images/image02.jpg', source: 'DCDOT' },
    { id: 'atl-1', lat: 33.7490, lng: -84.3880, name: 'Peachtree & 14th St', city: 'Atlanta', country: 'US', feed_url: 'https://www.511ga.org', source: 'GA-511' },
    { id: 'mia-1', lat: 25.7617, lng: -80.1918, name: 'I-95 / Downtown Miami', city: 'Miami', country: 'US', feed_url: 'https://fl511.com', source: 'FL-511' },
    { id: 'bos-1', lat: 42.3601, lng: -71.0589, name: 'I-93 / Downtown Boston', city: 'Boston', country: 'US', feed_url: 'https://mass511.com', source: 'MassDOT' },
    { id: 'phi-1', lat: 39.9526, lng: -75.1652, name: 'I-76 / Center City', city: 'Philadelphia', country: 'US', feed_url: 'https://www.511pa.com', source: 'PennDOT' },
  ];
  cams.push(...curated);
  return cams.filter((c: any) => c.lat && c.lng);
}

// ── EUROPE: Netherlands, Germany, France ──
async function fetchEuropeCameras(): Promise<any[]> {
  const cams: any[] = [];
  
  // Netherlands Rijkswaterstaat
  try {
    const res = await fetch('https://opendata.ndw.nu/cameras.json', { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      for (const cam of (data || []).slice(0, 400)) {
        if (!cam.lat || !cam.lng) continue;
        cams.push({
          id: `nl-${cams.length}`, lat: cam.lat, lng: cam.lng,
          name: cam.name || 'NL Camera', city: 'Netherlands', country: 'NL',
          feed_url: cam.imageUrl || '', source: 'RWS',
        });
      }
    }
  } catch { /* silent */ }

  cams.push(...await fetchAsfinagCameras());

  // Curated European cameras
  const curated = [
    { id: 'par-1', lat: 48.8566, lng: 2.3522, name: 'Champs-Élysées', city: 'Paris', country: 'France', feed_url: 'https://www.sytadin.fr', source: 'Sytadin' },
    { id: 'par-2', lat: 48.8584, lng: 2.2945, name: 'Tour Eiffel Area', city: 'Paris', country: 'France', feed_url: 'https://www.sytadin.fr', source: 'Sytadin' },
    { id: 'ber-1', lat: 52.5200, lng: 13.4050, name: 'Brandenburger Tor', city: 'Berlin', country: 'Germany', feed_url: 'https://viz.berlin.de', source: 'VIZ Berlin' },
    { id: 'ams-1', lat: 52.3676, lng: 4.9041, name: 'Centraal Station', city: 'Amsterdam', country: 'Netherlands', feed_url: 'https://opendata.ndw.nu', source: 'RWS' },
    { id: 'rom-1', lat: 41.9028, lng: 12.4964, name: 'Via dei Fori Imperiali', city: 'Rome', country: 'Italy', feed_url: 'https://romamobilita.it', source: 'Roma Mobilità' },
    { id: 'mad-1', lat: 40.4168, lng: -3.7038, name: 'Gran Vía', city: 'Madrid', country: 'Spain', feed_url: 'https://informo.madrid.es', source: 'Madrid DGT' },
  ];
  cams.push(...curated);
  return cams.filter((c: any) => c.lat && c.lng);
}

// ── ASIA/PACIFIC ──
async function fetchAsiaCameras(): Promise<any[]> {
  const curated = [
    { id: 'tok-1', lat: 35.6595, lng: 139.7004, name: 'Shibuya Crossing', city: 'Tokyo', country: 'Japan', feed_url: 'https://www.shibuya.webcam', source: 'Public' },
    { id: 'tok-2', lat: 35.6762, lng: 139.6503, name: 'Shinjuku Station', city: 'Tokyo', country: 'Japan', feed_url: 'https://www.jartic.or.jp', source: 'JARTIC' },
    { id: 'syd-1', lat: -33.8688, lng: 151.2093, name: 'Sydney Harbour Bridge', city: 'Sydney', country: 'Australia', feed_url: 'https://www.livetraffic.com', source: 'TfNSW' },
    { id: 'sin-1', lat: 1.3521, lng: 103.8198, name: 'Marina Bay Sands', city: 'Singapore', country: 'Singapore', feed_url: 'https://onemotoring.lta.gov.sg/content/onemotoring/home/driving/traffic_information/traffic-cameras.html', source: 'LTA' },
    { id: 'hk-1', lat: 22.3193, lng: 114.1694, name: 'Victoria Harbour', city: 'Hong Kong', country: 'China', feed_url: 'https://tdcctv.data.one.gov.hk', source: 'HK TD' },
    { id: 'sel-1', lat: 37.5665, lng: 126.9780, name: 'Gwanghwamun Square', city: 'Seoul', country: 'South Korea', feed_url: 'https://www.utic.go.kr', source: 'UTIC' },
    { id: 'dub-1', lat: 25.2048, lng: 55.2708, name: 'Sheikh Zayed Road', city: 'Dubai', country: 'UAE', feed_url: 'https://www.rta.ae', source: 'RTA Dubai' },
    { id: 'mum-1', lat: 19.0760, lng: 72.8777, name: 'Marine Drive', city: 'Mumbai', country: 'India', feed_url: 'https://trafficinfo.gov.in', source: 'MMRDA' },
    { id: 'bng-1', lat: 13.0827, lng: 80.2707, name: 'Anna Salai', city: 'Chennai', country: 'India', feed_url: 'https://trafficinfo.gov.in', source: 'TN Police' },
  ];
  return curated;
}

// ═══ REGION MAPPING ═══
const REGION_FETCHERS: Record<string, () => Promise<any[]>> = {
  'uk': fetchTfLCameras,
  'us-west': async () => [...await fetchWSDOTCameras(), ...await fetchCaltransCameras()],
  'us-east': fetchUSEastCameras,
  'us-central': fetchUSCentralCameras,
  'canada': fetchCanadaCameras,
  'europe': fetchEuropeCameras,
  'asia': fetchAsiaCameras,
};

// Determine which regions to fetch based on viewport bounds
function getRegionsForBounds(lat: number, lng: number, radius: number): string[] {
  const regions: string[] = [];
  // UK
  if (lat > 49 && lat < 61 && lng > -8 && lng < 2) regions.push('uk');
  // US-East
  if (lat > 24 && lat < 49 && lng > -85 && lng < -66) regions.push('us-east');
  // US-West
  if (lat > 24 && lat < 49 && lng > -125 && lng < -100) regions.push('us-west');
  // US-Central
  if (lat > 24 && lat < 49 && lng > -105 && lng < -80) regions.push('us-central');
  // Canada
  if (lat > 42 && lat < 70 && lng > -141 && lng < -52) regions.push('canada');
  // Europe
  if (lat > 35 && lat < 72 && lng > -11 && lng < 40) regions.push('europe');
  // Asia
  if ((lat > -10 && lat < 60 && lng > 60 && lng < 150) || (lat > -50 && lat < -10 && lng > 100 && lng < 180)) regions.push('asia');
  
  return regions.length > 0 ? regions : ['uk', 'us-east']; // Default fallback
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region');
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const radius = parseFloat(searchParams.get('radius') || '10');

    let regionsToFetch: string[];
    
    if (region === 'all') {
      regionsToFetch = Object.keys(REGION_FETCHERS);
    } else if (region) {
      regionsToFetch = region.split(',').filter(r => r in REGION_FETCHERS);
    } else if (lat !== 0 || lng !== 0) {
      regionsToFetch = getRegionsForBounds(lat, lng, radius);
    } else {
      // Default: load UK + US-East (fast, reliable)
      regionsToFetch = ['uk'];
    }

    const results = await Promise.allSettled(
      regionsToFetch.map(r => REGION_FETCHERS[r]())
    );

    const allCameras: any[] = [];
    const sources: Record<string, number> = {};

    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const cam of result.value) {
          allCameras.push(cam);
          sources[cam.source] = (sources[cam.source] || 0) + 1;
        }
      }
    }

    return NextResponse.json({
      cameras: allCameras,
      total: allCameras.length,
      sources,
      regions: regionsToFetch,
      timestamp: new Date().toISOString(),
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error) {
    console.error('CCTV fetch error:', error);
    return NextResponse.json({ cameras: [], error: 'Failed' }, { status: 500 });
  }
}
