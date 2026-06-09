import { RemediationPlaybook, RemediationStep } from './types';

const PLAYBOOKS: Record<string, RemediationPlaybook> = {
  'ddos-mitigation': {
    playbookId: 'ddos-mitigation',
    name: 'DDoS Mitigation',
    description: 'Rate limiting, CDN shielding, and WAF rule activation to mitigate DDoS attacks.',
    steps: [
      { action: 'enable_rate_limiting', description: 'Enable rate limiting on edge', automated: true, status: 'pending' },
      { action: 'enable_cdn_shield', description: 'Activate CDN DDoS shielding', automated: true, status: 'pending' },
      { action: 'apply_waf_rules', description: 'Deploy WAF rate-limit rules', automated: true, status: 'pending' },
      { action: 'notify_noc', description: 'Notify NOC team', automated: false, status: 'pending' },
    ],
    estimatedResponseTime: '2-5 minutes',
    autoRun: true,
  },
  'breach-response': {
    playbookId: 'breach-response',
    name: 'Breach Response',
    description: 'Isolate affected systems, scan for persistence, rotate credentials, and notify stakeholders.',
    steps: [
      { action: 'isolate_systems', description: 'Isolate affected systems from network', automated: true, status: 'pending' },
      { action: 'forensic_scan', description: 'Run forensic scan on affected hosts', automated: true, status: 'pending' },
      { action: 'rotate_credentials', description: 'Rotate all exposed credentials', automated: false, status: 'pending' },
      { action: 'notify_dpo', description: 'Notify Data Protection Officer', automated: false, status: 'pending' },
    ],
    estimatedResponseTime: '15-30 minutes',
    autoRun: false,
  },
  'ransomware-containment': {
    playbookId: 'ransomware-containment',
    name: 'Ransomware Containment',
    description: 'Isolate networks, take snapshots, and prepare decryption tools.',
    steps: [
      { action: 'isolate_network', description: 'Isolate affected network segment', automated: true, status: 'pending' },
      { action: 'snapshot_systems', description: 'Take forensic snapshots of affected systems', automated: true, status: 'pending' },
      { action: 'identify_variant', description: 'Identify ransomware variant', automated: false, status: 'pending' },
      { action: 'prepare_recovery', description: 'Prepare decryption or recovery procedures', automated: false, status: 'pending' },
    ],
    estimatedResponseTime: '30-60 minutes',
    autoRun: false,
  },
  'cve-patch': {
    playbookId: 'cve-patch',
    name: 'CVE Patching',
    description: 'Identify affected versions, track patch availability, and deploy updates.',
    steps: [
      { action: 'version_check', description: 'Check all systems for vulnerable versions', automated: true, status: 'pending' },
      { action: 'patch_track', description: 'Track patch availability from vendor', automated: true, status: 'pending' },
      { action: 'deploy_patch', description: 'Deploy patch to staging then production', automated: false, status: 'pending' },
      { action: 'verify_remediation', description: 'Verify patch effectiveness', automated: true, status: 'pending' },
    ],
    estimatedResponseTime: '4-24 hours',
    autoRun: false,
  },
  'geo-incident': {
    playbookId: 'geo-incident',
    name: 'Geopolitical Incident',
    description: 'Assess geopolitical risk, monitor developments, and update threat intelligence.',
    steps: [
      { action: 'assess_risk', description: 'Assess risk to assets and operations', automated: false, status: 'pending' },
      { action: 'monitor_sources', description: 'Monitor GDELT and news sources for developments', automated: true, status: 'pending' },
      { action: 'update_intel', description: 'Update threat intelligence feeds', automated: true, status: 'pending' },
      { action: 'alert_team', description: 'Alert security and executive teams', automated: false, status: 'pending' },
    ],
    estimatedResponseTime: '1-2 hours',
    autoRun: false,
  },
  'earthquake-response': {
    playbookId: 'earthquake-response',
    name: 'Earthquake Response',
    description: 'Assess seismic impact, check infrastructure status, and coordinate emergency response.',
    steps: [
      { action: 'assess_magnitude', description: 'Assess earthquake magnitude and depth', automated: true, status: 'pending' },
      { action: 'check_infrastructure', description: 'Check infrastructure and facility status', automated: true, status: 'pending' },
      { action: 'alert_emergency', description: 'Alert emergency response teams', automated: false, status: 'pending' },
      { action: 'coordinate_relief', description: 'Coordinate relief and recovery efforts', automated: false, status: 'pending' },
    ],
    estimatedResponseTime: '5-15 minutes',
    autoRun: false,
  },
  'wildfire-response': {
    playbookId: 'wildfire-response',
    name: 'Wildfire Response',
    description: 'Monitor wildfire progression, assess asset proximity, and coordinate evacuation.',
    steps: [
      { action: 'assess_proximity', description: 'Assess wildfire proximity to assets', automated: true, status: 'pending' },
      { action: 'monitor_spread', description: 'Monitor fire spread and wind patterns', automated: true, status: 'pending' },
      { action: 'alert_evacuation', description: 'Alert evacuation teams if needed', automated: false, status: 'pending' },
      { action: 'coordinate_response', description: 'Coordinate with emergency services', automated: false, status: 'pending' },
    ],
    estimatedResponseTime: '10-30 minutes',
    autoRun: false,
  },
  'maritime-incident': {
    playbookId: 'maritime-incident',
    name: 'Maritime Incident',
    description: 'Assess maritime security threat, monitor vessel movements, and coordinate response.',
    steps: [
      { action: 'assess_threat', description: 'Assess maritime threat level', automated: true, status: 'pending' },
      { action: 'track_vessel', description: 'Track vessel movements via AIS', automated: true, status: 'pending' },
      { action: 'alert_coast_guard', description: 'Alert coast guard or naval authorities', automated: false, status: 'pending' },
      { action: 'monitor_situation', description: 'Monitor and report situation developments', automated: true, status: 'pending' },
    ],
    estimatedResponseTime: '15-45 minutes',
    autoRun: false,
  },
};

function getPlaybookForIncident(
  title: string,
  description: string,
  tags: string[],
): string {
  const text = `${title} ${description} ${tags.join(' ')}`.toLowerCase();

  if (text.includes('ddos') || text.includes('dos') || text.includes('flood')) return 'ddos-mitigation';
  if (text.includes('breach') || text.includes('data leak') || text.includes('exfil')) return 'breach-response';
  if (text.includes('ransomware') || text.includes('encrypt') || text.includes('lockbit')) return 'ransomware-containment';
  if (text.includes('cve') || text.includes('vulnerability') || text.includes('patch') || text.includes('exploit')) return 'cve-patch';
  if (text.includes('earthquake') || text.includes('seismic') || text.includes('tremor')) return 'earthquake-response';
  if (text.includes('wildfire') || text.includes('fire') || text.includes('burn')) return 'wildfire-response';
  if (text.includes('maritime') || text.includes('ship') || text.includes('piracy') || text.includes('vessel')) return 'maritime-incident';

  return 'geo-incident';
}

export function getRemediation(title: string, description: string, tags: string[]): RemediationPlaybook | undefined {
  const playbookId = getPlaybookForIncident(title, description, tags);
  const playbook = PLAYBOOKS[playbookId];
  if (!playbook) return undefined;
  return {
    ...playbook,
    steps: playbook.steps.map(s => ({ ...s, status: 'pending' as const })),
  };
}

export function listPlaybooks(): RemediationPlaybook[] {
  return Object.values(PLAYBOOKS).map(p => ({
    ...p,
    steps: p.steps.map(s => ({ ...s, status: 'pending' as const })),
  }));
}
