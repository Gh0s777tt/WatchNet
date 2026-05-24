# Market Research GIS OSINT Data Sources Design

**Issue:** https://github.com/simplifaisoul/osiris/issues/173

**User outcome:** OSIRIS can show a curated, scored catalog of GIS-ready market research data sources across CPG, pharma, finance, policymaking, and live risk layers, with enough metadata to decide what to integrate next.

## Context

OSIRIS is a Next.js 16 and MapLibre GL dashboard with route-handler APIs under `src/app/api/*`, layer toggles in `src/components/LayerPanel.tsx`, map rendering in `src/components/OsirisMap.tsx`, and a market surface in `src/components/MarketsPanel.tsx`. Existing live feeds already include GDELT-style incidents, NASA FIRMS fires, USGS earthquakes, EONET weather, air quality, markets, and static infrastructure.

The user asked for data sources similar to IPUMS and OSINT sources that can support a GIS market-research visualization tool. The important product distinction is that many high-value market datasets are not actually real time. Public authoritative sources are often annual, quarterly, monthly, daily, or release-calendar based. Truly live sources are mostly weather, hazards, market prices, filings, news/events, alerts, and some commercial place/mobility APIs.

## Design

Build a metadata-first market source catalog before implementing live connectors. The first release should list and score sources, group them by market-research domain, and make them visible in OSIRIS as catalog points or catalog cards. Each record should make the freshness, GIS readiness, access requirements, cost risk, and integration burden explicit.

Use existing OSIRIS patterns:

- Static or semi-static data lives in `src/lib/*` and is exposed by a Next route under `src/app/api/*/route.ts`.
- Map-visible records are normalized server-side into a small payload that can become a GeoJSON `FeatureCollection`.
- Layer toggles reuse `src/components/LayerPanel.tsx`.
- Map rendering reuses `src/components/OsirisMap.tsx` source, layer, popup, `setGeo`, and visibility patterns.
- Catalog browsing can extend the existing tabbed `src/components/MarketsPanel.tsx` pattern or become a focused `MarketSourcesPanel.tsx`.

## Canonical Catalog Record

```ts
type MarketSourceRecord = {
  id: string;
  name: string;
  provider: string;
  domain: 'backbone' | 'cpg_retail' | 'pharma_health' | 'finance_macro' | 'policy_regulation' | 'live_risk';
  summary: string;
  geography: 'global' | 'us' | 'state_local' | 'regional';
  geometryMode: 'coordinates' | 'bbox' | 'boundary_join' | 'address_geocode' | 'not_spatial_native';
  layerType: 'point_events' | 'poi_points' | 'choropleth' | 'polygons' | 'time_series' | 'docket_feed' | 'enrichment_table';
  endpointUrl: string;
  docsUrl: string;
  authMode: 'none' | 'free_key' | 'account_key' | 'oauth' | 'commercial_contract';
  accessCost: 'open' | 'freemium' | 'commercial' | 'restricted';
  refreshCadence: 'real_time' | 'minutes' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'release_calendar';
  spatialResolution: string;
  joinKeys: string[];
  licenseNotes: string;
  caveats: string[];
  scores: {
    sourceAuthority: number;
    domainFit: number;
    gisReadiness: number;
    freshness: number;
    APIReadiness: number;
    licenseSafety: number;
    integrationPriority: number;
  };
};
```

## Priority Source Families

### GIS Backbone

- IPUMS NHGIS API: historical Census, ACS, crosswalks, boundaries, annual tract estimates.
- U.S. Census Data API, TIGERweb REST, and Census Geocoder: demographics, business data, GEOID/FIPS joins, boundary lookup.
- OpenStreetMap Overpass API: POIs, amenities, roads, land use, retail adjacency, transport context.
- Overture Maps Places, Buildings, Addresses, Transportation, and Divisions: open GeoParquet releases for global POIs and base map joins.
- Data.gov CKAN API: discovery layer for federal datasets; metadata, not the actual dataset payload.
- Socrata SODA APIs: state and municipal permits, 311, inspections, licenses, parcels, crashes, crime, and public health.
- ArcGIS REST FeatureServer and MapServer endpoints: the de facto public-sector GIS API surface.

### CPG And Retail

- Foursquare Places API: commercial POI search, categories, place metadata, geotagging, and real-time place lookup.
- Placer.ai API: commercial foot traffic, trade areas, demographics, venue rankings, and visit trends.
- SafeGraph Places and Geometry: commercial POI and geometry files, generally monthly file delivery rather than live public API.
- USDA FoodData Central API: branded food/product attributes and nutrition metadata; useful for CPG taxonomy, not GIS-native.
- USDA NASS Quick Stats API: crop, livestock, price, and production estimates by state/county.
- Census CBP/ZBP and LEHD/LODES: establishments, employment, and job flows by industry and geography.
- BLS API: CPI, average prices, wages, labor, and regional economic signals.

### Pharma And Health

- openFDA APIs: drug adverse events, recalls, labels, NDC directory, approvals, shortages, and enforcement data.
- ClinicalTrials.gov API v2: trial sites, sponsors, recruiting status, conditions, and facility addresses.
- CDC PLACES via data.cdc.gov/Socrata: county/place/tract/ZCTA health outcomes and risk factors.
- CMS Data API and Provider Data API: provider enrollment, facilities, utilization, quality, Medicare datasets.
- NPPES NPI Registry API: provider lookup and addresses.
- HealthData.gov: HHS dataset discovery for public health, hospitals, programs, and public APIs.

### Finance, Macro, And Real Estate

- SEC EDGAR data APIs: real-time submission history, company facts, XBRL frames, and nightly bulk ZIPs.
- FRED and GeoFRED APIs: macro and regional economic time series and map-ready regional data.
- BEA API: GDP, personal income, industry, and regional economic accounts.
- CFPB HMDA API: mortgage applications and lending patterns for housing and credit market geography.
- FHFA HPI and HUD datasets: home price, fair market rent, housing, public assistance, and ZIP/geography crosswalks.
- USAspending API: grants, contracts, loans, recipient locations, place of performance, NAICS, and agencies.
- EIA API: electricity, petroleum, natural gas, prices, consumption, and regional energy data.
- Polygon.io, Nasdaq Data Link, Alpha Vantage: market prices, commodities, crypto, and delayed or real-time quote feeds.
- OpenFIGI API: securities identifier mapping for joining ticker, CIK, FIGI, and exchange context.

### Policymaking And Regulation

- Congress.gov API: bills, members, amendments, committees, actions, and related legislative metadata.
- Federal Register API: rules, proposed rules, notices, presidential documents, agencies, and publication dates.
- Regulations.gov API: dockets, documents, comments, rulemaking materials, and agency proceedings.
- FEC API: candidates, committees, filings, independent expenditures, and campaign-finance geography.
- Open States API: state legislation and state-level representatives.
- SAM.gov/FPDS and procurement portals: contract opportunities and federal procurement signals, subject to auth and reliability caveats.

### Live OSINT And Risk Layers

- GDELT APIs: global news, events, entities, themes, tone, and geography.
- ACLED API: conflict, protest, and political violence events; authenticated access.
- ReliefWeb API: humanitarian reports, disasters, maps, jobs, and organizations.
- NOAA/NWS API: active weather alerts, observations, forecasts, and CAP/GeoJSON-compatible alert data.
- USGS Earthquake GeoJSON feeds: minute-updated real-time earthquake events.
- NASA FIRMS API: near-real-time active fire/hotspot detections.
- OpenAQ API v3 and AirNow API: air quality observations and station metadata.
- OpenFEMA API: disaster declarations, assistance, grants, and FEMA region datasets.
- NASA EONET and GDACS: natural hazards and disaster event feeds.

## Scoring Model

Use a 0-5 score for each dimension and keep notes for auditability:

- `sourceAuthority`: official/primary source strength.
- `domainFit`: direct usefulness for CPG, pharma, finance, policy, or market risk.
- `gisReadiness`: native lat/lng, geometry, FIPS/GEOID, bbox, or geocoding burden.
- `freshness`: real-time through annual.
- `APIReadiness`: documented API, rate limits, pagination, bulk access, examples.
- `licenseSafety`: open terms, attribution burden, commercial restrictions, redistribution limits.
- `integrationPriority`: product value adjusted by implementation burden.

## V1 Scope

V1 should ship a curated source catalog and optional map layer. It should not ship paid connectors, credential management, scraping, warehouse infrastructure, predictive market scoring, or user-upload joins.

V1 should include:

- 50-80 curated records with official documentation URLs.
- A domain filter and source cards.
- A map-visible catalog layer using provider headquarters, representative country centroids, or bbox centroids, clearly labeled as source locations rather than dataset observations.
- A clear `refreshCadence` field so "live" is not overstated.
- A validation script that fails when required fields are missing or scores are outside 0-5.

## Verification

The current planning issue is complete when this spec and its implementation plan exist. A future implementation issue should use a stronger exit criterion, for example:

```bash
node scripts/validate-market-research-sources.mjs && test -s src/app/api/market-sources/route.ts
```

The existing repository-wide `npm run lint` is currently red before this work because of pre-existing `no-explicit-any`, unused-variable, hook-dependency, and React compiler errors.

