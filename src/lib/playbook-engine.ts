/**
 * ═══════════════════════════════════════════════════════════════
 *  OSIRIS — Operational Playbook Engine
 *  Rule-based trigger → action automation
 * ═══════════════════════════════════════════════════════════════
 */

export type TriggerType =
  | 'earthquake_magnitude'
  | 'gps_jamming_detected'
  | 'malware_severity'
  | 'conflict_severity'
  | 'fire_detected'
  | 'pin_proximity'
  | 'multi_event_cluster';

export type ActionType =
  | 'fly_to'
  | 'drop_pin'
  | 'toggle_layer'
  | 'run_deep_dive'
  | 'run_region_dossier'
  | 'run_osint_sweep'
  | 'send_alert'
  | 'generate_briefing';

export interface PlaybookTrigger {
  type: TriggerType;
  label: string;
  params: Record<string, any>;
}

export interface PlaybookAction {
  type: ActionType;
  label: string;
  params: Record<string, any>;
}

export interface Playbook {
  id: string;
  name: string;
  enabled: boolean;
  triggers: PlaybookTrigger[];
  actions: PlaybookAction[];
  cooldown: number;       // ms between firings
  lastFiredAt: number;
  fireCount: number;
  createdAt: string;
}

export interface PlaybookEvent {
  playbookId: string;
  playbookName: string;
  trigger: PlaybookTrigger;
  actions: PlaybookAction[];
  location: { lat: number; lng: number };
  timestamp: string;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Evaluate all enabled playbooks against current data.
 * Returns fired events that callers can execute.
 */
export function evaluatePlaybooks(
  playbooks: Playbook[],
  data: Record<string, any>,
): PlaybookEvent[] {
  const events: PlaybookEvent[] = [];
  const now = Date.now();

  for (const pb of playbooks) {
    if (!pb.enabled) continue;
    // Cooldown check
    if (now - pb.lastFiredAt < pb.cooldown) continue;

    for (const trigger of pb.triggers) {
      const match = evaluateTrigger(trigger, data);
      if (match) {
        events.push({
          playbookId: pb.id,
          playbookName: pb.name,
          trigger,
          actions: pb.actions,
          location: match,
          timestamp: new Date().toISOString(),
        });
        pb.lastFiredAt = now;
        pb.fireCount++;
        break; // Fire once per trigger set
      }
    }
  }

  return events;
}

function evaluateTrigger(
  trigger: PlaybookTrigger,
  data: Record<string, any>,
): { lat: number; lng: number } | null {
  switch (trigger.type) {
    case 'earthquake_magnitude': {
      const minMag = trigger.params.minMagnitude || 5;
      const quakes = Array.isArray(data.earthquakes) ? data.earthquakes : [];
      for (const eq of quakes) {
        if ((eq.magnitude || eq.mag || 0) >= minMag && eq.lat && eq.lng) {
          return { lat: eq.lat, lng: eq.lng || eq.lon };
        }
      }
      return null;
    }

    case 'gps_jamming_detected': {
      const minIntensity = trigger.params.minIntensity || 30;
      const jamming = Array.isArray(data.gps_jamming) ? data.gps_jamming : [];
      for (const jam of jamming) {
        if ((jam.intensity || 0) >= minIntensity && jam.lat && jam.lng) {
          return { lat: jam.lat, lng: jam.lng };
        }
      }
      return null;
    }

    case 'malware_severity': {
      const minRisk = trigger.params.minRisk || 7;
      const malware = Array.isArray(data.malware_threats) ? data.malware_threats : [];
      for (const mw of malware) {
        if ((mw.risk || 0) >= minRisk && mw.lat && mw.lng) {
          return { lat: mw.lat, lng: mw.lng };
        }
      }
      return null;
    }

    case 'conflict_severity': {
      const minSeverity = trigger.params.minSeverity || 'HIGH';
      const levels = ['LOW', 'ELEVATED', 'HIGH', 'CRITICAL'];
      const minIdx = levels.indexOf(minSeverity);
      const gdelt = Array.isArray(data.gdelt) ? data.gdelt : [];
      for (const g of gdelt) {
        const sevIdx = levels.indexOf(g.severity || 'LOW');
        if (sevIdx >= minIdx && g.lat && g.lng) {
          return { lat: g.lat, lng: g.lng };
        }
      }
      return null;
    }

    case 'fire_detected': {
      const fires = Array.isArray(data.fires) ? data.fires : [];
      if (fires.length > 0 && fires[0].lat && fires[0].lng) {
        return { lat: fires[0].lat, lng: fires[0].lng || fires[0].lon };
      }
      return null;
    }

    case 'pin_proximity': {
      const distance = trigger.params.distance || 200;
      const threatType = trigger.params.threatType || 'earthquake';
      const pins: any[] = trigger.params.pins || [];
      if (pins.length === 0) return null;

      let events: any[] = [];
      if (threatType === 'earthquake') events = Array.isArray(data.earthquakes) ? data.earthquakes : [];
      else if (threatType === 'fire') events = Array.isArray(data.fires) ? data.fires : [];
      else if (threatType === 'gdelt') events = Array.isArray(data.gdelt) ? data.gdelt : [];

      for (const pin of pins) {
        if (!pin.lat || !pin.lng) continue;
        for (const ev of events) {
          if (!ev.lat || !ev.lng) continue;
          if (haversineKm(pin.lat, pin.lng, ev.lat, ev.lng) <= distance) {
            return { lat: ev.lat, lng: ev.lng || ev.lon };
          }
        }
      }
      return null;
    }

    default:
      return null;
  }
}

// ── BUILT-IN PLAYBOOK TEMPLATES ──

export const PLAYBOOK_TEMPLATES: Playbook[] = [
  {
    id: 'template_quake_response',
    name: 'Earthquake Response',
    enabled: false,
    triggers: [
      { type: 'earthquake_magnitude', label: 'M6+ Earthquake detected', params: { minMagnitude: 6 } },
    ],
    actions: [
      { type: 'fly_to', label: 'Fly to epicenter', params: { zoom: 10 } },
      { type: 'toggle_layer', label: 'Enable fires layer', params: { layer: 'fires', state: true } },
      { type: 'drop_pin', label: 'Drop assessment pin', params: { severity: 'alert', category: 'threat' } },
      { type: 'run_region_dossier', label: 'Run region dossier', params: {} },
    ],
    cooldown: 900000, // 15 min
    lastFiredAt: 0,
    fireCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'template_gps_jamming',
    name: 'GPS Jamming Alert',
    enabled: false,
    triggers: [
      { type: 'gps_jamming_detected', label: 'GPS Jamming >50 intensity', params: { minIntensity: 50 } },
    ],
    actions: [
      { type: 'fly_to', label: 'Fly to jamming location', params: { zoom: 12 } },
      { type: 'toggle_layer', label: 'Enable maritime layer', params: { layer: 'maritime', state: true } },
      { type: 'drop_pin', label: 'Drop GPS jamming pin', params: { severity: 'alert', category: 'threat' } },
    ],
    cooldown: 600000, // 10 min
    lastFiredAt: 0,
    fireCount: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'template_cyber_incident',
    name: 'Cyber Incident Response',
    enabled: false,
    triggers: [
      { type: 'malware_severity', label: 'High-risk malware detected', params: { minRisk: 8 } },
    ],
    actions: [
      { type: 'fly_to', label: 'Fly to malware location', params: { zoom: 10 } },
      { type: 'drop_pin', label: 'Drop cyber threat pin', params: { severity: 'critical', category: 'threat' } },
      { type: 'run_deep_dive', label: 'AI deep dive on threat', params: {} },
    ],
    cooldown: 600000, // 10 min
    lastFiredAt: 0,
    fireCount: 0,
    createdAt: new Date().toISOString(),
  },
];

export function createPlaybookId(): string {
  return `pb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
