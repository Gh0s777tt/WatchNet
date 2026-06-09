export interface MaltegoEntity {
  type: string
  value: string
  properties: Record<string, string>
}

export interface MaltegoLink {
  source: string
  target: string
  label?: string
}

export interface MaltegoGraph {
  entities: MaltegoEntity[]
  links: MaltegoLink[]
}

export function toMaltegoCSV(graph: MaltegoGraph): string {
  const header = 'Entity,Type,Properties'
  const rows = graph.entities.map(e => {
    const props = Object.entries(e.properties)
      .map(([k, v]) => `${k}=${v}`)
      .join(';')
    return `"${e.value}","${e.type}","${props}"`
  })
  return [header, ...rows].join('\n')
}

export function toMaltegoTRX(graph: MaltegoGraph): string {
  const entitiesXML = graph.entities.map(e => {
    const propsXML = Object.entries(e.properties)
      .map(([k, v]) => `    <Property name="${k}" value="${v}"/>`)
      .join('\n')
    return `  <Entity type="${e.type}" value="${e.value}">\n${propsXML}\n  </Entity>`
  }).join('\n')

  const linksXML = graph.links.map(l =>
    `  <Link source="${l.source}" target="${l.target}"${l.label ? ` label="${l.label}"` : ''}/>`
  ).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<MaltegoGraph>
  <Entities>
${entitiesXML}
  </Entities>
  <Links>
${linksXML}
  </Links>
</MaltegoGraph>`
}

export function downloadMaltego(graph: MaltegoGraph, filename: string, format: 'csv' | 'trx' = 'csv') {
  const content = format === 'csv' ? toMaltegoCSV(graph) : toMaltegoTRX(graph)
  const mime = format === 'csv' ? 'text/csv' : 'application/xml'
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.${format === 'csv' ? 'csv' : 'trx'}`
  a.click()
  URL.revokeObjectURL(url)
}

export function entitiesFromSweepDevices(devices: any[]): MaltegoEntity[] {
  return devices.map(d => ({
    type: 'maltego.Device',
    value: d.ip || '',
    properties: {
      mac: d.mac || '',
      hostname: d.hostname || d.mdns_name || '',
      vendor: d.vendor || '',
      os: d.os || '',
      device_type: d.device_type || d.type || '',
      ports: (d.ports || d.open_ports || []).map((p: any) => p.port || p).join(','),
      risk: d.risk_level || '',
    },
  }))
}

export function entitiesFromBluetoothDevices(devices: any[]): MaltegoEntity[] {
  return devices.map(d => ({
    type: 'maltego.BluetoothDevice',
    value: d.mac || d.name || '',
    properties: {
      mac: d.mac || '',
      name: d.name || '',
      vendor: d.vendor || '',
      category: d.category || d.type || '',
      signal: String(d.signal_strength ?? ''),
      services: (d.services || []).join(','),
      paired: String(d.paired ?? ''),
      first_seen: d.first_seen || '',
      last_seen: d.last_seen || '',
    },
  }))
}

export function entitiesFromSearchResults(results: any, type: string): MaltegoEntity[] {
  if (!results) return []
  const entities: MaltegoEntity[] = []

  switch (type) {
    case 'dns':
    case 'doh':
      if (Array.isArray(results.records)) {
        results.records.forEach((r: any) => {
          entities.push({
            type: 'maltego.DNSRecord',
            value: r.name || r.value || '',
            properties: {
              type: r.type || '',
              value: r.value || '',
              ttl: String(r.ttl ?? ''),
            },
          })
        })
      }
      break
    case 'whois':
      entities.push({
        type: 'maltego.Domain',
        value: results.domain || '',
        properties: {
          registrar: results.registrar || '',
          creation_date: results.creation_date || '',
          expiration_date: results.expiration_date || '',
          org: results.org || '',
          country: results.country || '',
        },
      })
      break
    case 'threats':
      if (Array.isArray(results.threats)) {
        results.threats.forEach((t: any) => {
          entities.push({
            type: 'maltego.Threat',
            value: t.ioc || t.ip || t.domain || '',
            properties: {
              type: t.type || '',
              source: t.source || '',
              severity: t.severity || '',
              first_seen: t.first_seen || '',
              last_seen: t.last_seen || '',
            },
          })
        })
      }
      break
    case 'mac':
      entities.push({
        type: 'maltego.MACAddress',
        value: results.mac || '',
        properties: {
          vendor: results.vendor || '',
          device_type: results.device_type || '',
          first_seen: results.first_seen || '',
        },
      })
      break
    case 'phone':
      entities.push({
        type: 'maltego.PhoneNumber',
        value: results.phone || '',
        properties: {
          country: results.country || '',
          carrier: results.carrier || '',
          region: results.region || '',
          line_type: results.line_type || '',
        },
      })
      break
    case 'email':
      entities.push({
        type: 'maltego.EmailAddress',
        value: results.email || '',
        properties: {
          domain: results.domain || '',
          username: results.username || '',
          disposable: String(results.disposable ?? ''),
        },
      })
      break
    case 'ip':
    case 'scanner':
      entities.push({
        type: 'maltego.IPAddress',
        value: results.ip || results.target || '',
        properties: {
          isp: results.isp || results.org || '',
          country: results.country || '',
          region: results.region || '',
          city: results.city || '',
          asn: String(results.asn ?? ''),
          ports: (results.ports || []).join(','),
        },
      })
      break
  }

  return entities
}
