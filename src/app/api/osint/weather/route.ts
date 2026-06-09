import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

// WMO weather code mapping
const weatherCodes: Record<number, string> = {
  0: 'Clear', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Depositing Rime Fog',
  51: 'Light Drizzle', 53: 'Moderate Drizzle', 55: 'Dense Drizzle',
  56: 'Light Freezing Drizzle', 57: 'Dense Freezing Drizzle',
  61: 'Slight Rain', 63: 'Moderate Rain', 65: 'Heavy Rain',
  66: 'Light Freezing Rain', 67: 'Heavy Freezing Rain',
  71: 'Slight Snow', 73: 'Moderate Snow', 75: 'Heavy Snow',
  77: 'Snow Grains',
  80: 'Slight Rain Showers', 81: 'Moderate Rain Showers', 82: 'Violent Rain Showers',
  85: 'Slight Snow Showers', 86: 'Heavy Snow Showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with Slight Hail', 99: 'Thunderstorm with Heavy Hail'
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  if (!lat || !lon) return NextResponse.json({ error: 'Missing lat/lon parameters' }, { status: 400 });
  try {
    const resp = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl,cloud_cover,visibility&timezone=auto`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await resp.json();
    const c = data.current || {};
    return NextResponse.json({
      location: { lat: data.latitude, lon: data.longitude, name: `${lat},${lon}` },
      current: {
        temp_c: c.temperature_2m,
        feels_like: c.apparent_temperature,
        humidity: c.relative_humidity_2m,
        precip: c.precipitation,
        weather_code: c.weather_code,
        weather_desc: weatherCodes[c.weather_code] || 'Unknown',
        wind_speed: c.wind_speed_10m,
        wind_dir: c.wind_direction_10m,
        pressure: c.pressure_msl,
        cloud_cover: c.cloud_cover,
        visibility: c.visibility,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json({ error: 'Weather fetch failed' }, { status: 500 });
  }
}
