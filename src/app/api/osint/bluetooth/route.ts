import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const VENDOR_OUI: Record<string, { vendor: string; category: string }> = {
  '00:1A:11': { vendor: 'Google', category: 'smartphone' },
  '00:1E:DF': { vendor: 'Bosch', category: 'smart_home' },
  '00:23:76': { vendor: 'Samsung Electronics', category: 'smartphone' },
  '00:25:00': { vendor: 'Apple', category: 'smartphone' },
  '00:50:F1': { vendor: 'Jabra', category: 'audio' },
  '04:52:C7': { vendor: 'Apple', category: 'smartphone' },
  '08:3A:8C': { vendor: 'Fitbit', category: 'wearable' },
  '08:5B:D6': { vendor: 'Huawei Technologies', category: 'smartphone' },
  '08:71:90': { vendor: 'Sony Corporation', category: 'audio' },
  '08:B6:1F': { vendor: 'LG Electronics', category: 'smartphone' },
  '0C:9B:D7': { vendor: 'Samsung Electronics', category: 'smart_home' },
  '10:08:B1': { vendor: 'Xiaomi Communications', category: 'smartphone' },
  '10:2C:6B': { vendor: 'Google', category: 'smartphone' },
  '10:9F:C8': { vendor: 'Bose Corporation', category: 'audio' },
  '14:22:DB': { vendor: 'Sony Corporation', category: 'audio' },
  '18:65:90': { vendor: 'Garmin', category: 'wearable' },
  '1C:5C:F2': { vendor: 'Samsung Electronics', category: 'audio' },
  '20:18:79': { vendor: 'Apple', category: 'computer' },
  '20:DF:B9': { vendor: 'Xiaomi Communications', category: 'smart_home' },
  '24:05:0F': { vendor: 'Huawei Technologies', category: 'smartphone' },
  '24:4B:FE': { vendor: 'Samsung Electronics', category: 'smartphone' },
  '24:A4:3C': { vendor: 'Google', category: 'smartphone' },
  '28:37:37': { vendor: 'Apple', category: 'smartphone' },
  '28:6A:BA': { vendor: 'Bose Corporation', category: 'audio' },
  '2C:30:33': { vendor: 'Jabra', category: 'audio' },
  '2C:BE:EB': { vendor: 'Sony Corporation', category: 'audio' },
  '30:52:CB': { vendor: 'Apple', category: 'computer' },
  '34:12:F9': { vendor: 'Xiaomi Communications', category: 'smartphone' },
  '34:82:C5': { vendor: 'Samsung Electronics', category: 'wearable' },
  '38:0A:94': { vendor: 'Samsung Electronics', category: 'smartphone' },
  '3C:28:6D': { vendor: 'Google', category: 'smartphone' },
  '3C:D0:F8': { vendor: 'Apple', category: 'tracker' },
  '44:00:10': { vendor: 'Huawei Technologies', category: 'smartphone' },
  '44:4C:8C': { vendor: 'Sony Corporation', category: 'audio' },
  '48:A9:8A': { vendor: 'Apple', category: 'wearable' },
  '4C:11:AE': { vendor: 'Fitbit', category: 'wearable' },
  '50:46:5D': { vendor: 'Garmin', category: 'wearable' },
  '58:CB:52': { vendor: 'Google', category: 'smart_home' },
  '5C:AD:CF': { vendor: 'Huawei Technologies', category: 'smartphone' },
  '60:03:08': { vendor: 'Apple', category: 'computer' },
  '64:D6:0A': { vendor: 'Samsung Electronics', category: 'smartphone' },
  '6C:70:9F': { vendor: 'Apple', category: 'wearable' },
  '70:54:D2': { vendor: 'Samsung Electronics', category: 'audio' },
  '74:DA:38': { vendor: 'Fitbit', category: 'wearable' },
  '78:31:C1': { vendor: 'Sony Corporation', category: 'audio' },
  '7C:11:CB': { vendor: 'Garmin', category: 'wearable' },
  '80:56:F2': { vendor: 'Bose Corporation', category: 'audio' },
  '84:8F:69': { vendor: 'Apple', category: 'tracker' },
  '88:C6:26': { vendor: 'Google', category: 'smart_home' },
  '8C:85:90': { vendor: 'Apple', category: 'computer' },
  '90:3A:E6': { vendor: 'Samsung Electronics', category: 'smart_home' },
  '9C:DA:3E': { vendor: 'Xiaomi Communications', category: 'smartphone' },
  'A0:55:DE': { vendor: 'Apple', category: 'computer' },
  'A4:77:33': { vendor: 'Samsung Electronics', category: 'smartphone' },
  'A8:9C:ED': { vendor: 'Huawei Technologies', category: 'smart_home' },
  'AC:CF:23': { vendor: 'Sony Corporation', category: 'audio' },
  'B0:4E:26': { vendor: 'Samsung Electronics', category: 'smartphone' },
  'B4:45:06': { vendor: 'Bose Corporation', category: 'audio' },
  'BC:D0:74': { vendor: 'Apple', category: 'tracker' },
  'C0:95:6D': { vendor: 'Jabra', category: 'audio' },
  'C4:B3:84': { vendor: 'Xiaomi Communications', category: 'smart_home' },
  'C8:5B:76': { vendor: 'Samsung Electronics', category: 'wearable' },
  'CC:08:FB': { vendor: 'Samsung Electronics', category: 'smartphone' },
  'D0:73:D5': { vendor: 'Google', category: 'smart_home' },
  'D4:08:8B': { vendor: 'Garmin', category: 'wearable' },
  'D8:96:95': { vendor: 'Apple', category: 'computer' },
  'DC:0C:5C': { vendor: 'Samsung Electronics', category: 'smart_home' },
  'E0:63:DA': { vendor: 'Huawei Technologies', category: 'smartphone' },
  'E4:8D:8C': { vendor: 'Samsung Electronics', category: 'smartphone' },
  'E8:50:8B': { vendor: 'Fitbit', category: 'wearable' },
  'EC:26:CA': { vendor: 'Apple', category: 'smartphone' },
  'F0:27:2D': { vendor: 'LG Electronics', category: 'audio' },
  'F4:0F:24': { vendor: 'Samsung Electronics', category: 'smartphone' },
  'F4:4E:FD': { vendor: 'Apple', category: 'computer' },
  'F8:BB:BF': { vendor: 'Google', category: 'smartphone' },
  'FC:03:9F': { vendor: 'Xiaomi Communications', category: 'smartphone' },
  'FC:28:90': { vendor: 'Sony Corporation', category: 'audio' },
};

const DEVICE_NAMES: string[] = [
  'Galaxy S24 Ultra',
  'iPhone 15 Pro',
  'Pixel 8 Pro',
  'Xiaomi 14 Pro',
  'Mate 60 Pro',
  'Galaxy Buds2 Pro',
  'AirPods Pro 2',
  'WH-1000XM5',
  'Bose QuietComfort Earbuds II',
  'Jabra Elite 10',
  'Fitbit Charge 6',
  'Galaxy Watch6 Classic',
  'Apple Watch Ultra 2',
  'Garmin Fenix 7X',
  'Mi Band 8 Pro',
  'iPad Pro 12.9',
  'Galaxy Tab S9 Ultra',
  'MacBook Pro 16',
  'Galaxy Book3 Ultra',
  'Surface Laptop 5',
  'AirTag',
  'Galaxy SmartTag2',
  'Tile Mate',
  'Google Nest Hub Max',
  'Samsung SmartThings Station',
  'Philips Hue Bridge',
  'LG OLED C3',
  'Samsung Frame TV',
  'Sony Bravia XR A95L',
  'Bose SoundLink Revolve+ II',
  'HomePod Mini',
  'Galaxy SmartTag2',
  'Xiaomi Smart Speaker',
  'Huawei Sound X',
  'Nothing Ear (2)',
  'OnePlus Buds Pro 2',
  'Sony WF-1000XM5',
  'Beats Fit Pro',
  'Powerbeats Pro',
  'Galaxy Watch5 Pro',
  'Garmin Venu 3',
  'Fitbit Versa 4',
  'Oura Ring Gen 3',
  'Pixel Watch 2',
  'Raspberry Pi 5',
  'Amazon Echo Dot 5',
  'Google Nest Mini',
  'Xiaomi Robot Vacuum X20',
  'Samsung Bespoke Jet Bot',
  'Apple TV 4K',
];

const TYPES: string[] = [
  'smartphone', 'computer', 'audio', 'wearable', 'smart_home', 'tracker', 'unknown',
];

function randomMac(): string {
  const hex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
  return `${hex()}:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}`;
}

function randomSignal(): number {
  const signals = [-30, -35, -40, -45, -50, -55, -60, -65, -70, -75, -80, -85, -90, -95];
  return signals[Math.floor(Math.random() * signals.length)];
}

function randomDate(daysAgo: number): string {
  const d = new Date(Date.now() - Math.floor(Math.random() * daysAgo * 86400000));
  return d.toISOString();
}

function randomServices(): string[] {
  const pool = [
    'A2DP', 'AVRCP', 'HFP', 'HSP', 'PAN', 'HID', 'SPP', 'GATT',
    'BNEP', 'OBEX', 'PBAP', 'MAP', 'HDP', 'HOGP', 'BLE', 'ANCS',
    'FTP', 'DUN', 'FAX', 'GNSS',
  ];
  const count = Math.floor(Math.random() * 5) + 1;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function lookupOUI(mac: string): { vendor: string; category: string } | null {
  const prefix = mac.substring(0, 8).toUpperCase();
  for (const [oui, info] of Object.entries(VENDOR_OUI)) {
    if (prefix.startsWith(oui)) return info;
  }
  const prefixes = Object.keys(VENDOR_OUI);
  for (const oui of prefixes) {
    if (prefix === oui) return VENDOR_OUI[oui];
  }
  return null;
}

function generateDevice(name?: string, mac?: string): {
  mac: string; name: string; vendor: string; type: string;
  signal_strength: number; first_seen: string; last_seen: string;
  services: string[]; paired: boolean; category: string;
} {
  const addr = mac || randomMac();
  const ouiInfo = lookupOUI(addr);
  const deviceName = name || DEVICE_NAMES[Math.floor(Math.random() * DEVICE_NAMES.length)];
  const vendor = ouiInfo?.vendor || 'Unknown';
  const category = ouiInfo?.category || 'unknown';
  const signal = randomSignal();
  const firstSeen = randomDate(90);
  const lastSeen = Math.random() > 0.3 ? new Date().toISOString() : randomDate(7);
  const services = randomServices();
  const paired = Math.random() > 0.4;

  return {
    mac: addr,
    name: deviceName,
    vendor,
    type: category,
    signal_strength: signal,
    first_seen: firstSeen,
    last_seen: lastSeen,
    services,
    paired,
    category,
  };
}

function generateAllDevices(): ReturnType<typeof generateDevice>[] {
  const devices: ReturnType<typeof generateDevice>[] = [];
  const usedMACs = new Set<string>();

  const vendorEntries = Object.entries(VENDOR_OUI);
  const count = Math.min(vendorEntries.length, 35);
  const shuffled = [...vendorEntries].sort(() => Math.random() - 0.5);

  for (let i = 0; i < count; i++) {
    const [oui, info] = shuffled[i];
    const rest = randomMac().substring(9);
    const mac = `${oui}:${rest}`;
    if (usedMACs.has(mac)) continue;
    usedMACs.add(mac);
    const nameIdx = DEVICE_NAMES.findIndex(
      n => n.toLowerCase().includes(info.category) ||
           (info.vendor.toLowerCase().includes('apple') && n.toLowerCase().includes('apple')) ||
           (info.vendor.toLowerCase().includes('samsung') && n.toLowerCase().includes('galaxy')) ||
           (info.vendor.toLowerCase().includes('google') && n.toLowerCase().includes('pixel')) ||
           (info.vendor.toLowerCase().includes('sony') && n.toLowerCase().includes('sony')) ||
           (info.vendor.toLowerCase().includes('bose') && n.toLowerCase().includes('bose')) ||
           (info.vendor.toLowerCase().includes('xiaomi') && n.toLowerCase().includes('xiaomi'))
    );
    const name = nameIdx >= 0 ? DEVICE_NAMES[nameIdx] : DEVICE_NAMES[Math.floor(Math.random() * DEVICE_NAMES.length)];
    devices.push({
      mac,
      name,
      vendor: info.vendor,
      type: info.category,
      signal_strength: randomSignal(),
      first_seen: randomDate(90),
      last_seen: Math.random() > 0.3 ? new Date().toISOString() : randomDate(7),
      services: randomServices(),
      paired: Math.random() > 0.4,
      category: info.category,
    });
  }

  // Add a few random extra devices
  for (let i = 0; i < 8; i++) {
    const mac = randomMac();
    if (usedMACs.has(mac)) continue;
    usedMACs.add(mac);
    const dev = generateDevice();
    dev.mac = mac;
    devices.push(dev);
  }

  return devices;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q');
  const allDevices = generateAllDevices();

  if (!query) {
    return NextResponse.json({ devices: allDevices, count: allDevices.length, timestamp: new Date().toISOString() });
  }

  const q = query.trim();
  const isMAC = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/.test(q) || /^[0-9A-Fa-f]{12}$/.test(q);
  let results: ReturnType<typeof generateDevice>[] = [];

  if (isMAC) {
    const normalized = q.length === 12 ? q.replace(/(..)/g, '$1:').slice(0, -1).toUpperCase() : q.toUpperCase();
    const ouiInfo = lookupOUI(normalized);
    if (ouiInfo) {
      results = allDevices.filter(d => d.mac.startsWith(normalized.substring(0, 8)));
      if (results.length === 0) {
        const rest = normalized.substring(9);
        results = [{
          mac: normalized,
          name: `${ouiInfo.vendor} Device`,
          vendor: ouiInfo.vendor,
          type: ouiInfo.category,
          signal_strength: randomSignal(),
          first_seen: randomDate(90),
          last_seen: new Date().toISOString(),
          services: randomServices(),
          paired: false,
          category: ouiInfo.category,
        }];
      }
    } else {
      results = allDevices.filter(d => d.mac === normalized);
    }
  } else {
    const lower = q.toLowerCase();
    results = allDevices.filter(d =>
      d.name.toLowerCase().includes(lower) ||
      d.vendor.toLowerCase().includes(lower) ||
      d.mac.toLowerCase().includes(lower)
    );
  }

  return NextResponse.json({
    devices: results,
    count: results.length,
    query: q,
    is_mac: isMAC,
    timestamp: new Date().toISOString(),
  });
}
