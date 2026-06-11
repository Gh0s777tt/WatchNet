/**
 * ═══════════════════════════════════════════════════════════════
 *  OSIRIS — Intelligence Fusion Correlation Engine
 *  Cross-references live data feeds to detect compound patterns
 * ═══════════════════════════════════════════════════════════════
 */

export interface Correlation {
  id: string;
  type: CorrelationType;
  title: string;
  description: string;
  compoundRiskScore: number;   // 0-100
  severity: 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  entities: CorrelationEntity[];
  location: { lat: number; lng: number; label: string };
  timestamp: string;
  ttl: number;  // seconds until auto-expire
}

export type CorrelationType =
  | 'GPS_JAMMING_AT_CHOKEPOINT'
  | 'FLIGHT_DIVERSION_NEAR_QUAKE'
  | 'CYBER_NEAR_CONFLICT'
  | 'QUAKE_NEAR_INFRASTRUCTURE'
  | 'CCTV_NEAR_CONFLICT'
  | 'MARITIME_ANOMALY'
  | 'MULTI_EVENT_CLUSTER';

interface CorrelationEntity {
  type: string;
  label: string;
  details: string;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

let _corrId = 0;
function nextId(): string {
  return `corr_${Date.now()}_${++_corrId}`;
}

/** Empty GeoJSON point */
const NO_LOC = { lat: 0, lng: 0, label: 'Unknown' };

/**
 * Run all correlation rules against the current data snapshot.
 * Returns correlations sorted by compoundRiskScore descending.
 */
export function computeCorrelations(data: Record<string, any>): Correlation[] {
  const results: Correlation[] = [];
  const now = Date.now();

  // ── Helper: parse timestamp ──
  const ts = (v: any): number => {
    if (!v) return now;
    if (typeof v === 'number') return v;
    const d = new Date(v).getTime();
    return isNaN(d) ? now : d;
  };

  // ── 1. GPS Jamming near Maritime Chokepoints ──
  const jamming = Array.isArray(data.gps_jamming) ? data.gps_jamming : [];
  const chokepoints = Array.isArray(data.maritime_chokepoints) ? data.maritime_chokepoints : [];
  for (const jam of jamming) {
    if (!jam.lat || !jam.lng) continue;
    for (const cp of chokepoints) {
      if (!cp.lat || !cp.lng) continue;
      const d = haversineKm(jam.lat, jam.lng, cp.lat, cp.lng);
      if (d < 500) {
        const intensity = Math.min(100, (jam.intensity || 50) * (1 - d / 500));
        results.push({
          id: nextId(),
          type: 'GPS_JAMMING_AT_CHOKEPOINT',
          title: `GPS Jamming near ${cp.name || 'Chokepoint'}`,
          description: `GPS interference detected ${d.toFixed(0)}km from ${cp.name || 'maritime chokepoint'} — elevated navigation risk for vessels transiting the area.`,
          compoundRiskScore: Math.round(intensity),
          severity: intensity > 70 ? 'CRITICAL' : intensity > 40 ? 'HIGH' : intensity > 20 ? 'ELEVATED' : 'LOW',
          entities: [
            { type: 'GPS Jamming', label: `${jam.region || 'Unknown'}`, details: `Intensity: ${jam.intensity || 'N/A'}` },
            { type: 'Chokepoint', label: cp.name || 'Unnamed', details: `${d.toFixed(0)}km away` },
          ],
          location: { lat: cp.lat, lng: cp.lng, label: cp.name || 'Chokepoint' },
          timestamp: new Date().toISOString(),
          ttl: 600,
        });
      }
    }
  }

  // ── 2. Flight diversion near Earthquakes ──
  const allFlights = [
    ...(Array.isArray(data.commercial_flights) ? data.commercial_flights : []),
    ...(Array.isArray(data.private_flights) ? data.private_flights : []),
    ...(Array.isArray(data.military_flights) ? data.military_flights : []),
  ];
  const quakes = Array.isArray(data.earthquakes) ? data.earthquakes : [];
  for (const eq of quakes) {
    if (!eq.lat || !eq.lng) continue;
    const mag = eq.magnitude || eq.mag || 0;
    if (mag < 5) continue; // Only significant quakes
    const recentFlights = allFlights.filter((f: any) => {
      if (!f.lat || !f.lng) return false;
      return haversineKm(eq.lat, eq.lng, f.lat, f.lng) < 300;
    });
    if (recentFlights.length > 0) {
      const avgAlt = recentFlights.reduce((s: number, f: any) => s + (f.altitude || f.alt || 0), 0) / recentFlights.length;
      const diversion = avgAlt > 30000 ? 'diverting to higher altitude' : 'operating near affected area';
      const score = Math.min(100, Math.round(mag * 12 + recentFlights.length * 3));
      results.push({
        id: nextId(),
        type: 'FLIGHT_DIVERSION_NEAR_QUAKE',
        title: `M${mag} Quake — ${recentFlights.length} Aircraft Nearby`,
        description: `${recentFlights.length} aircraft within 300km of M${mag} earthquake${eq.place ? ` near ${eq.place}` : ''}. Aircraft ${diversion}. Potential airspace disruption.`,
        compoundRiskScore: score,
        severity: score > 70 ? 'CRITICAL' : score > 40 ? 'HIGH' : score > 20 ? 'ELEVATED' : 'LOW',
        entities: [
          { type: 'Earthquake', label: `M${mag}${eq.place ? ` ${eq.place}` : ''}`, details: `Depth: ${eq.depth || '?'}km` },
          { type: 'Aircraft', label: `${recentFlights.length} nearby`, details: `Avg altitude: ${avgAlt.toFixed(0)}m` },
        ],
        location: { lat: eq.lat, lng: eq.lng, label: eq.place || 'Epicenter' },
        timestamp: new Date(ts(eq.time)).toISOString(),
        ttl: 900,
      });
    }
  }

  // ── 3. Cyber Threats near Conflict Zones (GDELT) ──
  const malware = Array.isArray(data.malware_threats) ? data.malware_threats : [];
  const gdelt = Array.isArray(data.gdelt) ? data.gdelt : [];
  for (const mw of malware) {
    if (!mw.lat || !mw.lng) continue;
    for (const g of gdelt) {
      if (!g.lat || !g.lng) continue;
      const d = haversineKm(mw.lat, mw.lng, g.lat, g.lng);
      if (d < 800) {
        const score = Math.min(100, Math.round((mw.risk || 5) * 10 + (g.severity === 'CRITICAL' ? 40 : g.severity === 'HIGH' ? 25 : 10) * (1 - d / 800)));
        results.push({
          id: nextId(),
          type: 'CYBER_NEAR_CONFLICT',
          title: `Malware Activity near Conflict Zone`,
          description: `${mw.name || 'Malware threat'} detected ${d.toFixed(0)}km from conflict event "${(g.title || g.name || '').slice(0, 60)}". Possible cyber-enabled warfare coordination.`,
          compoundRiskScore: score,
          severity: score > 70 ? 'CRITICAL' : score > 40 ? 'HIGH' : 'ELEVATED',
          entities: [
            { type: 'Malware', label: mw.name || 'Unknown', details: `Risk: ${mw.risk || '?'}` },
            { type: 'Conflict Event', label: (g.title || g.name || '').slice(0, 50), details: `${d.toFixed(0)}km away` },
          ],
          location: { lat: g.lat, lng: g.lng, label: g.region || '' },
          timestamp: new Date().toISOString(),
          ttl: 900,
        });
      }
    }
  }

  // ── 4. Earthquakes near Nuclear Infrastructure ──
  const infrastructure = Array.isArray(data.infrastructure) ? data.infrastructure : [];
  for (const eq of quakes) {
    if (!eq.lat || !eq.lng) continue;
    const mag = eq.magnitude || eq.mag || 0;
    if (mag < 4) continue;
    for (const inf of infrastructure) {
      if (!inf.lat || !inf.lng) continue;
      const d = haversineKm(eq.lat, eq.lng, inf.lat, inf.lng);
      if (d < 300) {
        const score = Math.min(100, Math.round(mag * 15 + (inf.type === 'nuclear' ? 30 : 10) * (1 - d / 300)));
        results.push({
          id: nextId(),
          type: 'QUAKE_NEAR_INFRASTRUCTURE',
          title: `M${mag} Quake near ${inf.name || 'Facility'}`,
          description: `Earthquake ${d.toFixed(0)}km from ${inf.name || 'critical infrastructure'} (${inf.type || inf.status || 'facility'}). Potential structural risk.`,
          compoundRiskScore: score,
          severity: score > 60 ? 'CRITICAL' : score > 35 ? 'HIGH' : score > 15 ? 'ELEVATED' : 'LOW',
          entities: [
            { type: 'Earthquake', label: `M${mag}`, details: `${d.toFixed(0)}km from facility` },
            { type: 'Infrastructure', label: inf.name || 'Facility', details: inf.type || inf.status || '' },
          ],
          location: { lat: inf.lat, lng: inf.lng, label: inf.name || 'Facility' },
          timestamp: new Date(ts(eq.time)).toISOString(),
          ttl: 900,
        });
      }
    }
  }

  // ── 5. CCTV near Conflict/Tensions ──
  const cams = Array.isArray(data.cameras) ? data.cameras : [];
  for (const cam of cams) {
    if (!cam.lat || !cam.lng) continue;
    for (const g of gdelt) {
      if (!g.lat || !g.lng) continue;
      const d = haversineKm(cam.lat, cam.lng, g.lat, g.lng);
      if (d < 200 && (g.severity === 'CRITICAL' || g.severity === 'HIGH')) {
        const score = Math.min(100, Math.round(30 + 30 * (1 - d / 200)));
        results.push({
          id: nextId(),
          type: 'CCTV_NEAR_CONFLICT',
          title: `CCTV Coverage near Conflict — ${cam.country || cam.city || ''}`,
          description: `CCTV camera at ${cam.city || cam.name || 'unknown location'} is ${d.toFixed(0)}km from a ${g.severity} conflict event. Potential visual intelligence opportunity.`,
          compoundRiskScore: score,
          severity: score > 60 ? 'HIGH' : 'ELEVATED',
          entities: [
            { type: 'CCTV', label: cam.name || 'Camera', details: `${cam.city || ''} ${cam.country || ''}` },
            { type: 'Conflict', label: (g.title || g.name || '').slice(0, 50), details: `${d.toFixed(0)}km` },
          ],
          location: { lat: cam.lat, lng: cam.lng, label: cam.city || cam.name || 'Camera' },
          timestamp: new Date().toISOString(),
          ttl: 1200,
        });
      }
    }
  }

  // ── 6. Multi-Event Cluster (3+ event types within 200km) ──
  const allEvents: { lat: number; lng: number; type: string; label: string; severity: number }[] = [
    ...quakes.map((e: any) => ({ lat: e.lat, lng: e.lng, type: 'Earthquake', label: `M${e.magnitude || e.mag || '?'}`, severity: (e.magnitude || e.mag || 0) * 10 })),
    ...gdelt.map((e: any) => ({ lat: e.lat, lng: e.lng, type: 'Incident', label: (e.title || e.name || '').slice(0, 40), severity: e.severity === 'CRITICAL' ? 80 : e.severity === 'HIGH' ? 50 : 20 })),
    ...(Array.isArray(data.fires) ? data.fires : []).map((e: any) => ({ lat: e.lat, lng: e.lng, type: 'Fire', label: e.name || 'Active Fire', severity: 30 })),
  ].filter((e: any) => e.lat && e.lng);

  for (let i = 0; i < allEvents.length; i++) {
    const cluster: typeof allEvents = [allEvents[i]];
    for (let j = 0; j < allEvents.length; j++) {
      if (i !== j && haversineKm(allEvents[i].lat, allEvents[i].lng, allEvents[j].lat, allEvents[j].lng) <= 200) {
        cluster.push(allEvents[j]);
      }
    }
    const types = new Set(cluster.map(e => e.type));
    if (types.size >= 3 && cluster.length >= 4) {
      const avgLat = cluster.reduce((s, e) => s + e.lat, 0) / cluster.length;
      const avgLng = cluster.reduce((s, e) => s + e.lng, 0) / cluster.length;
      const score = Math.min(100, Math.round(cluster.reduce((s, e) => s + e.severity, 0) / cluster.length));
      const typeStr = Array.from(types).join(' + ');
      results.push({
        id: nextId(),
        type: 'MULTI_EVENT_CLUSTER',
        title: `Multi-Event Cluster: ${typeStr}`,
        description: `${cluster.length} events across ${types.size} categories within 200km radius. Potential compound crisis scenario. Event types: ${typeStr}.`,
        compoundRiskScore: score,
        severity: score > 60 ? 'CRITICAL' : score > 35 ? 'HIGH' : 'ELEVATED',
        entities: Array.from(types).map(t => ({ type: t, label: `${cluster.filter(e => e.type === t).length} events`, details: '' })),
        location: { lat: avgLat, lng: avgLng, label: `${avgLat.toFixed(2)}, ${avgLng.toFixed(2)}` },
        timestamp: new Date().toISOString(),
        ttl: 600,
      });
      break; // One cluster result per scan
    }
  }

  // Deduplicate by type + location proximity
  const seen = new Set<string>();
  const deduped = results.filter(r => {
    const key = `${r.type}_${r.location.lat.toFixed(1)}_${r.location.lng.toFixed(1)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by risk score descending, take top 20
  return deduped.sort((a, b) => b.compoundRiskScore - a.compoundRiskScore).slice(0, 20);
}
