# OSIRIS Public Data Integrations Design

Date: 2026-06-04
Status: Design ready for user review

## Goal

Expand OSIRIS with a broad set of public data integrations while keeping the product reliable, attributable and useful for decision-making. The work should turn OSIRIS from a collection of live map feeds into a correlation cockpit that can answer questions such as:

- Which active incidents affect infrastructure, suppliers, vessels, aircraft or public assets?
- Which cyber findings are actually urgent because exploitation is likely or known?
- Which environmental or humanitarian events change operational risk in the next 24-72 hours?
- Which source produced the signal, how fresh is it and how much confidence should the user place in it?

## Product Principles

1. Keyless sources ship first.
   Public feeds that work without new accounts create immediate user value and reduce rollout friction.

2. API-key sources are optional connectors.
   Sources such as AISStream and OpenSky OAuth are prepared behind server-side environment variables. Missing keys should disable only that connector, not the whole app.

3. Correlation beats feed volume.
   New data should not only add points to the map. Each integration should support cross-layer interpretation: event near infrastructure, supplier in risk zone, active CVE affecting a scanned host, vessel movement near a chokepoint, or forecast worsening an incident.

4. Source trust must be visible.
   Every normalized record carries source, timestamp, confidence, freshness and attribution metadata.

## Scope

### Phase 1: Keyless Core

Implement or upgrade these integrations first:

| Domain | Source | Intended product value |
| --- | --- | --- |
| Air quality | OpenAQ v3 | Replace old OpenAQ v2 usage and restore a global air-quality layer. |
| Humanitarian/disaster impact | ReliefWeb | Add reports and situation updates tied to countries and incidents. |
| Disaster alerts | GDACS | Add authoritative disaster-alert context to existing hazards. |
| Cyber prioritization | FIRST EPSS | Rank CVEs by exploitation probability. |
| Malware and phishing indicators | URLhaus | Enrich RECON results with malicious URL and IOC context. |
| Forecast weather | Open-Meteo | Add forward-looking weather risk for selected locations. |
| Infrastructure context | Overpass/OSM | Add global infrastructure points and lines for power, transport, ports and hospitals. |
| US critical infrastructure | HIFLD | Add US-specific critical infrastructure context where available. |
| Entity identity | GLEIF | Normalize legal entities and supplier/company identity. |
| Sanctions/watchlists | OpenSanctions and OFAC | Extend existing sanctions workflows and entity cross-checks. |

### Phase 2: Optional API-Key Connectors

Add connectors that require accounts or keys, but keep them disabled unless configured:

| Domain | Source | Runtime behavior |
| --- | --- | --- |
| Live maritime | AISStream | Server-side WebSocket or polling bridge. Disabled without `AISSTREAM_API_KEY`. |
| Aviation fallback/enrichment | OpenSky OAuth | Used when `OPENSKY_CLIENT_ID` and `OPENSKY_CLIENT_SECRET` exist. |
| Satellite enrichment | Existing N2YO-style key path or other configured source | Disabled without the matching environment variable. |

### Phase 3: Correlation Layer

Add derived findings on top of raw feeds:

- `event_near_infrastructure`: hazard or conflict event within a configurable radius of critical infrastructure.
- `supplier_in_risk_zone`: supplier/entity linked to a location with active risk.
- `cve_priority`: CVE enriched with EPSS probability, CISA KEV status and NVD severity.
- `chokepoint_pressure`: vessel or port risk combined with incidents, weather or market signals.
- `environmental_exposure`: air-quality or weather risk affecting selected regions or assets.

## Non-Goals

- Do not scrape sources where an official public API or data file exists.
- Do not add user-personal breach lookups beyond existing explicit RECON actions.
- Do not require new API keys for the base app to boot.
- Do not mix unrelated data-source cleanup into the initial connector commits unless required for correctness.

## Architecture

### Connector Boundary

Each source gets a small connector module responsible for:

- Fetching from the external source.
- Applying timeout and retry policy.
- Returning raw-but-typed source records.
- Exposing source metadata, attribution and recommended cache TTL.

API routes should not embed large source-specific parsing logic directly. Routes compose connector output into OSIRIS-normalized records.

### Normalized Record Shape

All new feeds should map into a shared shape where possible:

```ts
type OsirisSourceMeta = {
  provider: string;
  feed: string;
  url?: string;
  attribution?: string;
  license?: string;
  fetchedAt: string;
  observedAt?: string;
  cacheTtlSeconds: number;
  confidence: number;
};

type OsirisGeoRecord = {
  id: string;
  domain: 'ENV' | 'HUMANITARIAN' | 'CYBER' | 'INFRA' | 'ENTITY' | 'MARITIME' | 'AIR' | 'SPACE';
  type: string;
  title: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  lat?: number;
  lng?: number;
  geometry?: GeoJSON.Geometry;
  countryCode?: string;
  tags: string[];
  source: OsirisSourceMeta;
  raw?: unknown;
};
```

Connectors that are not geospatial, such as EPSS or GLEIF, should still use source metadata and return records that can enrich map entities, RECON results or supplier graphs.

### API Routes

Add or upgrade routes around product domains, not vendor names:

- `/api/air-quality`: migrate to OpenAQ v3 and keep current consumer contract as stable as practical.
- `/api/disasters`: compose GDACS and ReliefWeb summaries.
- `/api/cyber-priority`: compose EPSS, CISA KEV and NVD/CVE metadata.
- `/api/infrastructure/context`: compose Overpass/OSM and HIFLD.
- `/api/entities/resolve`: resolve entity identity from GLEIF and sanctions sources.
- `/api/maritime/live`: optional AIS connector, disabled without key.

Existing routes can call the new connectors internally where that avoids UI churn.

## UX Design

Phase 1 should add value without overwhelming the map:

- Add one new "Impact" or "Disasters" layer for ReliefWeb/GDACS.
- Fix/restore the existing air-quality route before adding new UI complexity.
- Add cyber prioritization inside the existing RECON/CVE surface rather than creating a new panel.
- Add infrastructure context as a layer with conservative default density and viewport-scoped queries.
- Surface source freshness and attribution in popovers or detail panels.

Correlation findings should appear as concise alerts, not as another dense layer by default.

## Caching, Rate Limits and Failure Behavior

- Every connector must define a cache TTL based on feed volatility.
- Keyless public APIs should be protected with server-side caching and request de-duplication.
- Large responses should not be cached through mechanisms that exceed Next.js data cache limits.
- A failed connector returns a partial response with source-specific status instead of failing a composed endpoint.
- Optional API-key connectors return a disabled state when the key is absent.

Recommended initial TTLs:

| Source type | TTL |
| --- | --- |
| EPSS, sanctions, entity identity | 12-24 hours |
| ReliefWeb/GDACS | 15-60 minutes |
| OpenAQ/Open-Meteo | 15-60 minutes |
| Overpass/HIFLD | 24 hours or viewport cache |
| AISStream/OpenSky | near real-time with throttling |

## Security, Privacy and Compliance

- Keep all API keys server-side.
- Do not send sensitive user-entered identifiers to enrichment APIs unless the user intentionally triggers a RECON action.
- Display attribution for feeds that require it.
- Store only normalized operational data in memory/cache unless a source license allows broader persistence.
- Avoid uncontrolled scraping of camera, social, breach or personal-data surfaces.

## Testing Strategy

Use tests proportional to each connector:

- Unit tests for normalizers with fixture payloads.
- Route tests for disabled API-key behavior and partial failures.
- Smoke tests for keyless routes returning stable shapes.
- Browser validation for new visible layers and RECON UI enrichment.
- Build verification after each phase.

Acceptance criteria for each source:

- App boots without the source configured.
- Route returns a clear success, partial or disabled state.
- Records include source metadata and freshness.
- UI does not render blank or blocking overlays when the source fails.
- External calls are cached or throttled.

## Rollout Plan

1. Connector foundation and OpenAQ v3 migration.
2. Disaster and humanitarian impact route.
3. Cyber prioritization enrichment.
4. Infrastructure context route and layer.
5. Entity resolution and sanctions enrichment.
6. Optional API-key connector framework.
7. AISStream/OpenSky optional connectors.
8. Correlation findings.
9. UI polish and source freshness indicators.

This order maximizes immediate user value while deferring streaming and account-dependent work until the app has a stable connector foundation.

## Review Decision

Proceed with the design as a phased implementation. The first implementation plan should cover steps 1-3 only, because they are mostly keyless, have limited UI blast radius and create the foundation for the later sources.
