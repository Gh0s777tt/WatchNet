import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface DeviceInfo {
  ip: string;
  mac: string;
  hostname: string;
  vendor: string;
  os: string;
  type: string;
  open_ports: { port: number; service: string; protocol: string; state: string }[];
  first_seen: string;
  last_seen: string;
  dhcp: boolean;
  mdns_name: string;
}

const VENDOR_OUI: Record<string, string> = {
  '00:14:6C': 'Cisco Systems',
  '00:17:C5': 'Netgear',
  '00:18:0A': 'Intel Corporate',
  '00:1A:11': 'Google',
  '00:1A:8C': 'Dell',
  '00:1B:21': 'Hewlett Packard',
  '00:1D:72': 'Apple',
  '00:21:5A': 'Samsung Electronics',
  '00:22:6B': 'Microsoft',
  '00:23:76': 'Samsung Electronics',
  '00:24:36': 'Intel Corporate',
  '00:24:D6': 'Sony Corporation',
  '00:25:00': 'Apple',
  '00:26:18': 'ASUSTek Computer',
  '00:30:48': 'Dell',
  '00:50:56': 'VMware',
  '00:55:DA': 'Apple',
  '04:4B:ED': 'LG Electronics',
  '04:C5:A4': 'Huawei Technologies',
  '08:05:1B': 'Apple',
  '08:23:27': 'Samsung Electronics',
  '08:5B:D6': 'Huawei Technologies',
  '08:71:90': 'Sony Corporation',
  '08:96:D7': 'Apple',
  '0C:4D:E9': 'Cisco Systems',
  '10:02:B5': 'Synology Incorporated',
  '10:08:B1': 'Xiaomi Communications',
  '10:3D:1C': 'Apple',
  '14:99:E2': 'Samsung Electronics',
  '18:31:BF': 'Apple',
  '1C:69:7A': 'ASUSTek Computer',
  '20:68:8D': 'Sony Corporation',
  '24:4B:FE': 'Samsung Electronics',
  '28:37:37': 'Apple',
  '2C:30:33': 'Jabra',
  '30:52:CB': 'Apple',
  '30:8C:FB': 'Intel Corporate',
  '34:12:F9': 'Xiaomi Communications',
  '38:0A:94': 'Samsung Electronics',
  '3C:28:6D': 'Google',
  '3C:D0:F8': 'Apple',
  '40:31:3C': 'LG Electronics',
  '44:00:10': 'Huawei Technologies',
  '44:44:44': 'Samsung Electronics',
  '48:8E:C6': 'Dell',
  '4C:11:AE': 'Fitbit',
  '50:46:5D': 'Garmin',
  '58:CB:52': 'Google',
  '60:03:08': 'Apple',
  '64:9E:F3': 'TP-Link Technologies',
  '6C:9C:ED': 'Netgear',
  '6C:D6:8C': 'Huawei Technologies',
  '70:5A:0F': 'Raspberry Pi Foundation',
  '78:8C:B5': 'Sony Corporation',
  '80:2A:A8': 'Xiaomi Communications',
  '84:A9:38': 'Synology Incorporated',
  '88:66:5A': 'Samsung Electronics',
  '8C:85:90': 'Apple',
  '90:32:4B': 'Amazon Technologies',
  '94:65:2D': 'Intel Corporate',
  '98:DA:92': 'LG Electronics',
  'A0:55:DE': 'Apple',
  'A4:77:33': 'Samsung Electronics',
  'A8:9C:ED': 'Huawei Technologies',
  'AC:84:C6': 'Amazon Technologies',
  'B0:4E:26': 'Samsung Electronics',
  'B4:45:06': 'Bose Corporation',
  'B8:27:EB': 'Raspberry Pi Foundation',
  'BC:EA:2B': 'ASUSTek Computer',
  'C0:98:79': 'Netgear',
  'C4:B3:84': 'Xiaomi Communications',
  'C8:3A:35': 'Apple',
  'CC:2D:8C': 'Google',
  'D0:73:D5': 'Google',
  'D4:6E:0E': 'Intel Corporate',
  'D8:96:95': 'Apple',
  'DC:A6:32': 'Cisco Systems',
  'E0:5A:1F': 'Samsung Electronics',
  'E4:5F:01': 'TP-Link Technologies',
  'E8:50:8B': 'Fitbit',
  'EC:26:CA': 'Apple',
  'F0:27:2D': 'LG Electronics',
  'F4:0F:24': 'Samsung Electronics',
  'F4:4E:FD': 'Apple',
  'F8:BB:BF': 'Google',
  'FC:03:9F': 'Xiaomi Communications',
  'FC:A6:67': 'RPIBrew',
};

const HOSTNAME_TEMPLATES: string[] = [
  'router', 'gateway', 'nas', 'media-server', 'workstation', 'laptop',
  'desktop', 'htpc', 'printer', 'smart-tv', 'console', 'ip-camera',
  'pi-hole', 'plex-server', 'homebridge', 'esp32-sensor',
];

const MDNS_TEMPLATES: string[] = [
  'Router', 'Home-NAS', 'MediaServer', 'John-MacBook-Pro',
  'Office-PC', 'Living-Room-TV', 'PlayStation-5', 'Xbox-Series-X',
  'Samsung-Frame-TV', 'HP-LaserJet', 'Canon-MG3600', 'Ring-Doorbell',
  'Nest-Cam-Outdoor', 'Philips-Hue-Bridge', 'Sonos-Play-1',
  'Raspberry-Pi-5', 'Synology-DS923+', 'HomePod-Mini',
];

function randomMac(prefix?: string): string {
  const hex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
  if (prefix) {
    return `${prefix}:${hex()}:${hex()}:${hex()}`;
  }
  return `${hex()}:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}`;
}

function randomDate(daysAgo: number): string {
  const d = new Date(Date.now() - Math.floor(Math.random() * daysAgo * 86400000));
  return d.toISOString();
}

function generateIP(baseIP: string, offset: number): string {
  const parts = baseIP.split('.');
  if (parts.length === 4) {
    parts[3] = (parseInt(parts[3]) + offset).toString();
  }
  return parts.join('.');
}

function getOpenPorts(type: string): { port: number; service: string; protocol: string; state: string }[] {
  const commonPorts: Record<string, { port: number; service: string; protocol: string }[]> = {
    router: [
      { port: 80, service: 'HTTP', protocol: 'TCP' },
      { port: 443, service: 'HTTPS', protocol: 'TCP' },
      { port: 22, service: 'SSH', protocol: 'TCP' },
      { port: 23, service: 'Telnet', protocol: 'TCP' },
      { port: 53, service: 'DNS', protocol: 'UDP' },
      { port: 67, service: 'DHCP', protocol: 'UDP' },
      { port: 1900, service: 'UPnP', protocol: 'UDP' },
    ],
    computer: [
      { port: 22, service: 'SSH', protocol: 'TCP' },
      { port: 80, service: 'HTTP', protocol: 'TCP' },
      { port: 443, service: 'HTTPS', protocol: 'TCP' },
      { port: 3389, service: 'RDP', protocol: 'TCP' },
      { port: 445, service: 'SMB', protocol: 'TCP' },
      { port: 5900, service: 'VNC', protocol: 'TCP' },
      { port: 3000, service: 'HTTP-Alt', protocol: 'TCP' },
      { port: 8443, service: 'HTTPS-Alt', protocol: 'TCP' },
    ],
    smartphone: [
      { port: 62078, service: 'iPhone-Sync', protocol: 'TCP' },
      { port: 5000, service: 'DAAP', protocol: 'TCP' },
    ],
    printer: [
      { port: 80, service: 'HTTP(IPP)', protocol: 'TCP' },
      { port: 443, service: 'HTTPS', protocol: 'TCP' },
      { port: 515, service: 'LPD', protocol: 'TCP' },
      { port: 631, service: 'IPP', protocol: 'TCP' },
      { port: 9100, service: 'JetDirect', protocol: 'TCP' },
    ],
    smart_tv: [
      { port: 80, service: 'HTTP', protocol: 'TCP' },
      { port: 443, service: 'HTTPS', protocol: 'TCP' },
      { port: 1900, service: 'UPnP', protocol: 'UDP' },
      { port: 7000, service: 'DLNA', protocol: 'TCP' },
    ],
    iot: [
      { port: 80, service: 'HTTP', protocol: 'TCP' },
      { port: 554, service: 'RTSP', protocol: 'TCP' },
      { port: 8883, service: 'MQTT', protocol: 'TCP' },
    ],
    nas: [
      { port: 80, service: 'HTTP', protocol: 'TCP' },
      { port: 443, service: 'HTTPS', protocol: 'TCP' },
      { port: 22, service: 'SSH', protocol: 'TCP' },
      { port: 445, service: 'SMB', protocol: 'TCP' },
      { port: 139, service: 'NetBIOS', protocol: 'TCP' },
      { port: 548, service: 'AFP', protocol: 'TCP' },
      { port: 2049, service: 'NFS', protocol: 'TCP' },
      { port: 5000, service: 'DSM', protocol: 'TCP' },
      { port: 5001, service: 'DSM-SSL', protocol: 'TCP' },
    ],
    console: [
      { port: 80, service: 'HTTP', protocol: 'TCP' },
      { port: 443, service: 'HTTPS', protocol: 'TCP' },
      { port: 1935, service: 'RTMP', protocol: 'TCP' },
      { port: 3074, service: 'Xbox-Live', protocol: 'UDP' },
      { port: 27015, service: 'Steam', protocol: 'UDP' },
      { port: 27036, service: 'Steam-Stream', protocol: 'TCP' },
    ],
  };
  return (commonPorts[type] || [])
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.floor(Math.random() * 4) + 2)
    .map(p => ({ ...p, state: 'open' }));
}

function generateDevices(baseIP: string, range: number): DeviceInfo[] {
  const devices: DeviceInfo[] = [];

  // Router / Gateway (.1)
  devices.push({
    ip: generateIP(baseIP, 1),
    mac: randomMac('00:14:6C'),
    hostname: 'router',
    vendor: 'Cisco Systems',
    os: 'Cisco IOS 15.9(3)M',
    type: 'router',
    open_ports: getOpenPorts('router'),
    first_seen: randomDate(365),
    last_seen: new Date().toISOString(),
    dhcp: true,
    mdns_name: 'Gateway-Router',
  });

  // NAS (.2)
  devices.push({
    ip: generateIP(baseIP, 2),
    mac: randomMac('84:A9:38'),
    hostname: 'nas',
    vendor: 'Synology Incorporated',
    os: 'DSM 7.2 (Linux 4.4.302+)',
    type: 'nas',
    open_ports: getOpenPorts('nas'),
    first_seen: randomDate(365),
    last_seen: new Date().toISOString(),
    dhcp: false,
    mdns_name: 'Synology-DS923+',
  });

  // Windows Desktop (.10)
  devices.push({
    ip: generateIP(baseIP, 10),
    mac: randomMac('00:1B:21'),
    hostname: 'desktop',
    vendor: 'Hewlett Packard',
    os: 'Windows 11 Pro 23H2 (Build 22631)',
    type: 'computer',
    open_ports: getOpenPorts('computer'),
    first_seen: randomDate(180),
    last_seen: new Date().toISOString(),
    dhcp: true,
    mdns_name: 'Office-PC',
  });

  // MacBook (.11)
  devices.push({
    ip: generateIP(baseIP, 11),
    mac: randomMac('00:25:00'),
    hostname: 'laptop',
    vendor: 'Apple',
    os: 'macOS Sonoma 14.5 (Build 23F79)',
    type: 'computer',
    open_ports: getOpenPorts('computer').filter(p => p.port !== 3389),
    first_seen: randomDate(120),
    last_seen: new Date().toISOString(),
    dhcp: true,
    mdns_name: 'John-MacBook-Pro',
  });

  // Linux Workstation (.12)
  devices.push({
    ip: generateIP(baseIP, 12),
    mac: randomMac('00:1A:11'),
    hostname: 'workstation',
    vendor: 'Google',
    os: 'Debian 12 (Bookworm) — Kernel 6.6.15-amd64',
    type: 'computer',
    open_ports: [
      { port: 22, service: 'SSH', protocol: 'TCP', state: 'open' },
      { port: 80, service: 'HTTP', protocol: 'TCP', state: 'open' },
      { port: 443, service: 'HTTPS', protocol: 'TCP', state: 'open' },
      { port: 3000, service: 'HTTP-Alt', protocol: 'TCP', state: 'open' },
    ],
    first_seen: randomDate(90),
    last_seen: new Date().toISOString(),
    dhcp: true,
    mdns_name: 'Debian-Workstation',
  });

  // Samsung Smart TV (.20)
  devices.push({
    ip: generateIP(baseIP, 20),
    mac: randomMac('88:66:5A'),
    hostname: 'smart-tv',
    vendor: 'Samsung Electronics',
    os: 'Tizen 7.0 (Samsung TV OS)',
    type: 'smart_tv',
    open_ports: getOpenPorts('smart_tv'),
    first_seen: randomDate(200),
    last_seen: new Date().toISOString(),
    dhcp: true,
    mdns_name: 'Samsung-Frame-TV',
  });

  // Stampante (.30)
  devices.push({
    ip: generateIP(baseIP, 30),
    mac: randomMac('00:30:48'),
    hostname: 'printer',
    vendor: 'Dell',
    os: 'Dell Printing System Firmware v3.2',
    type: 'printer',
    open_ports: getOpenPorts('printer'),
    first_seen: randomDate(300),
    last_seen: new Date().toISOString(),
    dhcp: true,
    mdns_name: 'HP-LaserJet',
  });

  // PlayStation 5 (.40)
  devices.push({
    ip: generateIP(baseIP, 40),
    mac: randomMac('00:24:D6'),
    hostname: 'console',
    vendor: 'Sony Corporation',
    os: 'PlayStation 5 System Software 24.04-10.00.00',
    type: 'console',
    open_ports: getOpenPorts('console'),
    first_seen: randomDate(150),
    last_seen: new Date().toISOString(),
    dhcp: true,
    mdns_name: 'PlayStation-5',
  });

  // iPhone (.50)
  devices.push({
    ip: generateIP(baseIP, 50),
    mac: randomMac('28:37:37'),
    hostname: 'iphone',
    vendor: 'Apple',
    os: 'iOS 17.5.1 (Build 21F90)',
    type: 'smartphone',
    open_ports: getOpenPorts('smartphone'),
    first_seen: randomDate(60),
    last_seen: new Date().toISOString(),
    dhcp: true,
    mdns_name: 'John-iPhone-15-Pro',
  });

  // Samsung Galaxy (.51)
  devices.push({
    ip: generateIP(baseIP, 51),
    mac: randomMac('A4:77:33'),
    hostname: 'galaxy',
    vendor: 'Samsung Electronics',
    os: 'Android 14 (One UI 6.1)',
    type: 'smartphone',
    open_ports: getOpenPorts('smartphone'),
    first_seen: randomDate(90),
    last_seen: new Date().toISOString(),
    dhcp: true,
    mdns_name: 'Galaxy-S24-Ultra',
  });

  // Telecamera IP (.60)
  devices.push({
    ip: generateIP(baseIP, 60),
    mac: randomMac('C4:B3:84'),
    hostname: 'ip-camera',
    vendor: 'Xiaomi Communications',
    os: 'Xiaomi IoT Embedded Linux 2.1.4',
    type: 'iot',
    open_ports: getOpenPorts('iot'),
    first_seen: randomDate(250),
    last_seen: new Date().toISOString(),
    dhcp: true,
    mdns_name: 'Xiaomi-Camera-2K',
  });

  // Raspberry Pi (.70)
  devices.push({
    ip: generateIP(baseIP, 70),
    mac: randomMac('B8:27:EB'),
    hostname: 'pi-hole',
    vendor: 'Raspberry Pi Foundation',
    os: 'Raspberry Pi OS Lite (Debian 12, Kernel 6.6.31+rpt-rpi-2712)',
    type: 'computer',
    open_ports: [
      { port: 22, service: 'SSH', protocol: 'TCP', state: 'open' },
      { port: 53, service: 'DNS', protocol: 'UDP', state: 'open' },
      { port: 80, service: 'HTTP(Pi-hole)', protocol: 'TCP', state: 'open' },
    ],
    first_seen: randomDate(200),
    last_seen: new Date().toISOString(),
    dhcp: false,
    mdns_name: 'Raspberry-Pi-5',
  });

  // Smart Home Hub (.80)
  devices.push({
    ip: generateIP(baseIP, 80),
    mac: randomMac('CC:2D:8C'),
    hostname: 'homebridge',
    vendor: 'Google',
    os: 'Google Nest Hub OS (Cast 3.56)',
    type: 'iot',
    open_ports: [
      { port: 80, service: 'HTTP', protocol: 'TCP', state: 'open' },
      { port: 443, service: 'HTTPS', protocol: 'TCP', state: 'open' },
      { port: 1900, service: 'UPnP', protocol: 'UDP', state: 'open' },
      { port: 5353, service: 'mDNS', protocol: 'UDP', state: 'open' },
    ],
    first_seen: randomDate(180),
    last_seen: new Date().toISOString(),
    dhcp: true,
    mdns_name: 'Google-Nest-Hub-Max',
  });

  // Xbox (.90)
  devices.push({
    ip: generateIP(baseIP, 90),
    mac: randomMac('00:22:6B'),
    hostname: 'xbox',
    vendor: 'Microsoft',
    os: 'Xbox OS 10.0.25398.2321',
    type: 'console',
    open_ports: getOpenPorts('console').filter(p => p.service !== 'Steam' && p.service !== 'Steam-Stream'),
    first_seen: randomDate(100),
    last_seen: new Date().toISOString(),
    dhcp: true,
    mdns_name: 'Xbox-Series-X',
  });

  return devices;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ip = searchParams.get('ip') || '192.168.1.1';
  const rangeParam = searchParams.get('range');
  const range = rangeParam ? parseInt(rangeParam, 10) : 24;

  // Valida formato IP
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4.test(ip)) {
    return NextResponse.json({ error: 'Invalid IP format' }, { status: 400 });
  }

  if (isNaN(range) || range < 8 || range > 32) {
    return NextResponse.json({ error: 'Invalid range (must be between 8 and 32)' }, { status: 400 });
  }

  const baseIP = ip.substring(0, ip.lastIndexOf('.') + 1) + '0';
  const devices = generateDevices(baseIP, range);

  const networkInfo = {
    subnet: `${baseIP}/${range}`,
    gateway: generateIP(baseIP, 1),
    dhcp_server: generateIP(baseIP, 1),
    dns_servers: [generateIP(baseIP, 1), '8.8.8.8'],
    total_hosts: Math.pow(2, 32 - range) - 2,
    scanned_ip_range: `${generateIP(baseIP, 1)} — ${generateIP(baseIP, 254)}`,
  };

  return NextResponse.json({
    network: networkInfo,
    devices,
    count: devices.length,
    scan_parameters: { target: ip, range },
    timestamp: new Date().toISOString(),
  });
}
