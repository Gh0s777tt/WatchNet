import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface CorrelatedDevice {
  mac: string;
  name: string;
  vendor: string;
  category: string;
  ip?: string;
  hostname?: string;
  os?: string;
  open_ports?: { port: number; service: string; protocol: string; state: string }[];
  bluetooth_signal?: number;
  bluetooth_services?: string[];
  bluetooth_paired?: boolean;
  network_type?: string;
  correlation_type: 'mac_match' | 'vendor_match' | 'name_match' | 'bt_only' | 'net_only';
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q')?.trim() || '';
  const ip = searchParams.get('ip')?.trim() || '192.168.1.1';

  try {
    const [btRes, netRes] = await Promise.all([
      fetch(`http://localhost:${process.env.PORT || 3000}/api/osint/bluetooth${query ? `?q=${encodeURIComponent(query)}` : ''}`, { cache: 'no-store' }).catch(() => null),
      fetch(`http://localhost:${process.env.PORT || 3000}/api/osint/network-scan?ip=${encodeURIComponent(ip)}`, { cache: 'no-store' }).catch(() => null),
    ]);

    const btData = btRes?.ok ? await btRes.json() : { devices: [] };
    const netData = netRes?.ok ? await netRes.json() : { devices: [] };

    const btDevices = btData.devices || [];
    const netDevices = netData.devices || [];

    const correlated: CorrelatedDevice[] = [];
    const seen = new Set<string>();

    const normalizeMAC = (mac: string) => mac.replace(/[:-]/g, '').toUpperCase();

    for (const bt of btDevices) {
      const btMAC = normalizeMAC(bt.mac || '');
      let found = false;

      for (const net of netDevices) {
        const netMAC = normalizeMAC(net.mac || '');
        const btPrefix = btMAC.substring(0, 6);
        const netPrefix = netMAC.substring(0, 6);

        if (btMAC && netMAC && btMAC === netMAC) {
          correlated.push({
            mac: bt.mac,
            name: bt.name || '',
            vendor: bt.vendor || '',
            category: bt.category || '',
            ip: net.ip,
            hostname: net.hostname || net.mdns_name,
            os: net.os,
            open_ports: net.open_ports,
            bluetooth_signal: bt.signal_strength,
            bluetooth_services: bt.services,
            bluetooth_paired: bt.paired,
            network_type: net.type,
            correlation_type: 'mac_match',
          });
          seen.add(btMAC);
          found = true;
          break;
        }

        if (!found && btPrefix === netPrefix) {
          correlated.push({
            mac: bt.mac,
            name: bt.name || '',
            vendor: bt.vendor || '',
            category: bt.category || '',
            ip: net.ip,
            hostname: net.hostname || net.mdns_name,
            os: net.os,
            open_ports: net.open_ports,
            bluetooth_signal: bt.signal_strength,
            bluetooth_services: bt.services,
            bluetooth_paired: bt.paired,
            network_type: net.type,
            correlation_type: 'vendor_match',
          });
          seen.add(btMAC);
          found = true;
        }
      }

      if (!found) {
        correlated.push({
          mac: bt.mac,
          name: bt.name || '',
          vendor: bt.vendor || '',
          category: bt.category || '',
          bluetooth_signal: bt.signal_strength,
          bluetooth_services: bt.services,
          bluetooth_paired: bt.paired,
          correlation_type: 'bt_only',
        });
        seen.add(btMAC);
      }
    }

    for (const net of netDevices) {
      const netMAC = normalizeMAC(net.mac || '');
      if (!seen.has(netMAC)) {
        correlated.push({
          mac: net.mac,
          name: net.hostname || net.mdns_name,
          vendor: net.vendor || '',
          category: net.type || '',
          ip: net.ip,
          hostname: net.hostname || net.mdns_name,
          os: net.os,
          open_ports: net.open_ports,
          network_type: net.type,
          correlation_type: 'net_only',
        });
        seen.add(netMAC);
      }
    }

    const stats = {
      total: correlated.length,
      mac_matches: correlated.filter(d => d.correlation_type === 'mac_match').length,
      vendor_matches: correlated.filter(d => d.correlation_type === 'vendor_match').length,
      bt_only: correlated.filter(d => d.correlation_type === 'bt_only').length,
      net_only: correlated.filter(d => d.correlation_type === 'net_only').length,
      unique_vendors: [...new Set(correlated.map(d => d.vendor).filter(Boolean))],
    };

    return NextResponse.json({
      query,
      network_target: ip,
      devices: correlated,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Correlation failed', details: String(err) },
      { status: 500 }
    );
  }
}
