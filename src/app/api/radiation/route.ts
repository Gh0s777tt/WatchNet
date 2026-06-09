import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface Station {
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  reading: number;
  status: 'NORMAL' | 'WARNING' | 'DANGER';
  network: string;
}

const STATIONS: Station[] = [
  // Giappone — monitoraggio Fukushima
  { name: 'Fukushima Daini', city: 'Fukushima', country: 'Japan', lat: 37.316, lng: 141.033, reading: 0.15, status: 'NORMAL', network: 'MEXT' },
  { name: 'Fukushima Daiichi', city: 'Fukushima', country: 'Japan', lat: 37.421, lng: 141.033, reading: 2.40, status: 'WARNING', network: 'MEXT' },
  { name: 'Tokyo Inst. Tech.', city: 'Tokyo', country: 'Japan', lat: 35.676, lng: 139.650, reading: 0.08, status: 'NORMAL', network: 'JAEA' },
  // Europa
  { name: 'Vienna PR Kopf', city: 'Vienna', country: 'Austria', lat: 48.208, lng: 16.373, reading: 0.09, status: 'NORMAL', network: 'BML' },
  { name: 'Barcelona UAB', city: 'Barcelona', country: 'Spain', lat: 41.498, lng: 2.110, reading: 0.07, status: 'NORMAL', network: 'CSN' },
  { name: 'Paris Saclay', city: 'Paris', country: 'France', lat: 48.711, lng: 2.205, reading: 0.11, status: 'NORMAL', network: 'IRSN' },
  { name: 'Berlin FU', city: 'Berlin', country: 'Germany', lat: 52.457, lng: 13.288, reading: 0.10, status: 'NORMAL', network: 'BfS' },
  { name: 'Rome ENEA', city: 'Rome', country: 'Italy', lat: 41.902, lng: 12.496, reading: 0.12, status: 'NORMAL', network: 'ENEA' },
  { name: 'London Heathrow', city: 'London', country: 'UK', lat: 51.471, lng: -0.456, reading: 0.08, status: 'NORMAL', network: 'UKHSA' },
  { name: 'Stockholm', city: 'Stockholm', country: 'Sweden', lat: 59.329, lng: 18.068, reading: 0.06, status: 'NORMAL', network: 'SSM' },
  { name: 'Helsinki', city: 'Helsinki', country: 'Finland', lat: 60.169, lng: 24.938, reading: 0.07, status: 'NORMAL', network: 'STUK' },
  { name: 'Pripyat', city: 'Pripyat', country: 'Ukraine', lat: 51.405, lng: 30.057, reading: 3.80, status: 'DANGER', network: 'SAKURA' },
  { name: 'Chernobyl NPP', city: 'Chernobyl', country: 'Ukraine', lat: 51.276, lng: 30.222, reading: 2.15, status: 'WARNING', network: 'SAKURA' },
  // America del Nord
  { name: 'San Francisco', city: 'San Francisco', country: 'USA', lat: 37.774, lng: -122.419, reading: 0.09, status: 'NORMAL', network: 'US EPA' },
  { name: 'New York City', city: 'New York', country: 'USA', lat: 40.712, lng: -74.005, reading: 0.10, status: 'NORMAL', network: 'US EPA' },
  { name: 'Los Angeles', city: 'Los Angeles', country: 'USA', lat: 34.052, lng: -118.243, reading: 0.08, status: 'NORMAL', network: 'US EPA' },
  { name: 'Chicago', city: 'Chicago', country: 'USA', lat: 41.878, lng: -87.629, reading: 0.07, status: 'NORMAL', network: 'US EPA' },
  { name: 'Washington DC', city: 'Washington DC', country: 'USA', lat: 38.907, lng: -77.036, reading: 0.09, status: 'NORMAL', network: 'US EPA' },
  { name: 'Toronto', city: 'Toronto', country: 'Canada', lat: 43.653, lng: -79.383, reading: 0.08, status: 'NORMAL', network: 'CNSC' },
  // Asia
  { name: 'Seoul KINS', city: 'Seoul', country: 'South Korea', lat: 37.566, lng: 126.978, reading: 0.11, status: 'NORMAL', network: 'KINS' },
  { name: 'Beijing', city: 'Beijing', country: 'China', lat: 39.904, lng: 116.407, reading: 0.13, status: 'NORMAL', network: 'MEE China' },
  { name: 'Taipei', city: 'Taipei', country: 'Taiwan', lat: 25.032, lng: 121.565, reading: 0.10, status: 'NORMAL', network: 'AEC' },
  { name: 'Mumbai BARC', city: 'Mumbai', country: 'India', lat: 19.076, lng: 72.877, reading: 0.09, status: 'NORMAL', network: 'BARC' },
  { name: 'Bangkok', city: 'Bangkok', country: 'Thailand', lat: 13.756, lng: 100.501, reading: 0.08, status: 'NORMAL', network: 'OAP' },
  { name: 'Dubai', city: 'Dubai', country: 'UAE', lat: 25.204, lng: 55.270, reading: 0.07, status: 'NORMAL', network: 'FANR' },
  // Russia
  { name: 'Moscow', city: 'Moscow', country: 'Russia', lat: 55.755, lng: 37.617, reading: 0.12, status: 'NORMAL', network: 'Roshydromet' },
  { name: 'Murmansk', city: 'Murmansk', country: 'Russia', lat: 68.958, lng: 33.082, reading: 0.14, status: 'NORMAL', network: 'Roshydromet' },
  // Emisfero Sud
  { name: 'Sydney ANSTO', city: 'Sydney', country: 'Australia', lat: -33.868, lng: 151.209, reading: 0.06, status: 'NORMAL', network: 'ANSTO' },
  { name: 'Sao Paulo', city: 'Sao Paulo', country: 'Brazil', lat: -23.550, lng: -46.633, reading: 0.08, status: 'NORMAL', network: 'CNEN' },
  { name: 'Cape Town', city: 'Cape Town', country: 'South Africa', lat: -33.924, lng: 18.424, reading: 0.07, status: 'NORMAL', network: 'NNR' },
];

// Simula variazione reale — aggiungi rumore alle letture
function jitterReading(base: number): { reading: number; status: Station['status'] } {
  const noise = (Math.random() - 0.5) * base * 0.3;
  const reading = Math.round(Math.max(0.01, base + noise) * 100) / 100;
  let status: Station['status'] = 'NORMAL';
  if (reading > 2.0) status = 'DANGER';
  else if (reading > 1.0) status = 'WARNING';
  return { reading, status };
}

export async function GET() {
  try {
    const stations = STATIONS.map(s => {
      const { reading, status } = jitterReading(s.reading);
      return { ...s, reading, status };
    });

    return NextResponse.json({
      stations,
      total: stations.length,
      timestamp: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('Radiation data error:', error);
    return NextResponse.json({ stations: [], error: 'Failed to load radiation data' }, { status: 500 });
  }
}
