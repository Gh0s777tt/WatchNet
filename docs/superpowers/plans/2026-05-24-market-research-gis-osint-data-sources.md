# Market Research GIS OSINT Data Sources Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a curated OSIRIS catalog of GIS-ready market-research data sources for CPG, pharma, finance, policymaking, and live risk analysis.

**Architecture:** Start with a metadata-first source registry, validate it with a small script, expose it through a Next.js route handler, and reuse existing MapLibre and panel patterns for display. Do not add direct paid API connectors in the first implementation pass.

**Tech Stack:** Next.js 16 App Router route handlers, TypeScript 5, React 19, MapLibre GL JS, existing OSIRIS CSS and panel components.

---

## Issue Discipline

- Issue: https://github.com/simplifaisoul/osiris/issues/173
- Worktree: `../osiris-wt-market-sources`
- Branch: `plan/market-research-gis-sources`
- Current planning exit criterion:

```bash
test -s docs/superpowers/plans/2026-05-24-market-research-gis-osint-data-sources.md
```

Assignment note: `gh issue edit 173 --add-assignee @me` failed with `'aviyashchin' not found`, so the issue has a coordination comment instead of an assignee.

Overlap scan: `gh pr list --search "market research GIS OSINT source catalog OR data sources" --state open --limit 20` returned no matching open PRs.

## Reuse First Findings

- Reuse route-handler response patterns from `src/app/api/infrastructure/route.ts`, `src/app/api/gdelt/route.ts`, and `src/app/api/markets/route.ts`.
- Reuse map source, layer, popup, `setGeo`, and visibility patterns from `src/components/OsirisMap.tsx`.
- Reuse layer toggle/count patterns from `src/components/LayerPanel.tsx`.
- Reuse the collapsible tabbed panel pattern from `src/components/MarketsPanel.tsx`.
- Read Next.js 16 route-handler docs before code changes: `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`.
- No relevant source-catalog helper library was found in `src`, `docs`, `README.md`, `package.json`, or installed `node_modules` using `rg`.

## Source Priorities

### Tier 1: Build The GIS Spine

Use these first because they unlock joins for every market dataset:

- IPUMS NHGIS API: https://developer.ipums.org/docs/v2/apiprogram/apis/nhgis/
- U.S. Census Data API: https://www.census.gov/data/developers/guidance/api-user-guide.html
- TIGERweb REST services: https://tigerweb.geo.census.gov/tigerwebmain/TIGERweb_main.html
- Census Geocoder: covered in the Census developer guide.
- OpenStreetMap Overpass API: https://wiki.openstreetmap.org/wiki/Overpass_API
- Overture Maps data: https://docs.overturemaps.org/
- Data.gov CKAN API: https://open.gsa.gov/api/datadotgov/
- Socrata SODA API: https://dev.socrata.com/docs/endpoints
- ArcGIS REST FeatureServer query: https://developers.arcgis.com/rest/services-reference/enterprise/query-feature-service-layer/

### Tier 2: Market-Research Domains

CPG and retail:

- Foursquare Places API: https://docs.foursquare.com/developer/docs/places-api-overview
- Placer.ai API: https://www.placer.ai/products/api
- SafeGraph Places and Geometry delivery: https://docs.safegraph.com/docs/delivery-file-structure
- USDA FoodData Central API: https://fdc.nal.usda.gov/api-guide/
- USDA NASS Quick Stats API: https://quickstats.nass.usda.gov/api
- Census CBP/ZBP and LEHD/LODES.
- BLS API: https://www.bls.gov/bls/api_features.htm

Pharma and health:

- openFDA drug APIs: https://open.fda.gov/apis/drug/
- ClinicalTrials.gov API: https://clinicaltrials.gov/data-about-studies/learn-about-api
- CDC PLACES: https://www.cdc.gov/places/
- CMS Data API: https://data.cms.gov/api-docs
- NPPES NPI Registry: https://npiregistry.cms.hhs.gov/api-page
- HealthData.gov: https://healthdata.gov/

Finance, macro, and real estate:

- SEC EDGAR APIs: https://www.sec.gov/search-filings/edgar-application-programming-interfaces
- FRED and GeoFRED: https://fred.stlouisfed.org/docs/api/geofred/regional_data.html
- BEA API: https://www.bea.gov/tools
- CFPB HMDA: https://ffiec.cfpb.gov/
- USAspending API: https://api.usaspending.gov/docs/intro-tutorial
- EIA API: https://www.eia.gov/opendata/documentation.php
- OpenFIGI API: https://www.openfigi.com/api/documentation
- Polygon.io, Nasdaq Data Link, and Alpha Vantage for market quote overlays.

Policymaking and regulation:

- Congress.gov API: https://api.congress.gov/
- Federal Register API: https://www.federalregister.gov/developers/documentation/api/v1
- Regulations.gov API: https://open.gsa.gov/api/regulationsgov/
- FEC API: https://api.open.fec.gov/developers/
- Open States API: https://docs.openstates.org/
- USAspending and SAM.gov/FPDS for federal awards and procurement.

Live OSINT and risk:

- GDELT GEO and events APIs: https://blog.gdeltproject.org/gdelt-geo-2-0-api-debuts/
- ACLED API: https://acleddata.com/acled-api-documentation
- ReliefWeb API: https://apidoc.reliefweb.int/
- NOAA/NWS alerts API: https://www.weather.gov/documentation/services-web-alerts
- USGS Earthquake GeoJSON: https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
- NASA FIRMS API: https://firms.modaps.eosdis.nasa.gov/api/
- OpenAQ API v3: https://docs.openaq.org/
- OpenFEMA API: https://www.fema.gov/about/openfema/api

## Data Freshness Rules

- Label `real_time` only for event streams or APIs with minute-level updates, such as NWS alerts, USGS feeds, SEC dissemination, commercial market feeds, FIRMS near-real-time products, and some news/event feeds.
- Label `minutes` or `daily` for GDELT, openFDA updates, ClinicalTrials.gov, ReliefWeb, AirNow/OpenAQ, and most operational portals.
- Label `monthly` for SafeGraph, Overture releases, many commercial POI files, and local government extracts.
- Label `annual` or `release_calendar` for ACS, CBP/ZBP, BEA regional accounts, PLACES, NASS annual releases, and many policy/statistical products.
- Never imply that ACS, IPUMS, CBP, PLACES, or commercial POI file drops are live.

## Chunk 1: Catalog Schema And Seed Records

### Task 1: Read Relevant Local Docs

**Files:**
- Read: `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- Read: `src/app/api/infrastructure/route.ts`
- Read: `src/app/api/gdelt/route.ts`
- Read: `src/components/LayerPanel.tsx`
- Read: `src/components/OsirisMap.tsx`

- [ ] **Step 1: Confirm route-handler requirements**

Run:

```bash
sed -n '1,220p' node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md
```

Expected: Route handler docs are visible locally.

- [ ] **Step 2: Confirm existing API response patterns**

Run:

```bash
sed -n '1,120p' src/app/api/infrastructure/route.ts
```

Expected: Static JSON response and `Cache-Control` pattern are visible.

### Task 2: Add Catalog Types

**Files:**
- Create: `src/lib/market-research-source-types.ts`

- [ ] **Step 1: Add strict source types**

```ts
export type MarketSourceDomain =
  | 'backbone'
  | 'cpg_retail'
  | 'pharma_health'
  | 'finance_macro'
  | 'policy_regulation'
  | 'live_risk';

export type MarketSourceRecord = {
  id: string;
  name: string;
  provider: string;
  domain: MarketSourceDomain;
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
  representativePoint: { lat: number; lng: number } | null;
  bbox: [number, number, number, number] | null;
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

- [ ] **Step 2: Commit**

```bash
git add src/lib/market-research-source-types.ts
git commit -m "feat: add market source catalog types"
```

### Task 3: Seed The Catalog

**Files:**
- Create: `src/lib/market-research-sources.ts`

- [ ] **Step 1: Add 50-80 curated source records**

Include all Tier 1 sources and at least 8 sources per market-research domain. Start with official/open sources, then mark commercial APIs as `commercial` with clear caveats.

- [ ] **Step 2: Use representative points carefully**

For sources that are not dataset observations, set `representativePoint` to the provider or program location and add this caveat:

```ts
'Map point represents source/provider location, not observation geography.'
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/market-research-sources.ts
git commit -m "feat: seed market research data source catalog"
```

## Chunk 2: Validation And API

### Task 4: Add Catalog Validation

**Files:**
- Create: `scripts/validate-market-research-sources.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the validation script**

Validate required string fields, URL fields, score range 0-5, unique IDs, and freshness labels.

- [ ] **Step 2: Add a package script**

Add:

```json
"validate:market-sources": "node scripts/validate-market-research-sources.mjs"
```

- [ ] **Step 3: Run validation**

Run:

```bash
npm run validate:market-sources
```

Expected:

```text
Validated market research source catalog
```

- [ ] **Step 4: Commit**

```bash
git add scripts/validate-market-research-sources.mjs package.json
git commit -m "test: validate market source catalog"
```

### Task 5: Add The API Route

**Files:**
- Create: `src/app/api/market-sources/route.ts`

- [ ] **Step 1: Implement a read-only route**

Return:

```ts
{
  sources,
  total: sources.length,
  domains,
  timestamp: new Date().toISOString()
}
```

Support query parameters:

- `domain`
- `accessCost`
- `refreshCadence`
- `minPriority`

- [ ] **Step 2: Add cache headers**

Use a long cache because this is a curated metadata catalog:

```ts
headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' }
```

- [ ] **Step 3: Verify API shape locally**

Run:

```bash
npm run validate:market-sources
```

Expected: validation passes.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/market-sources/route.ts
git commit -m "feat: expose market source catalog API"
```

## Chunk 3: UI And Map Integration

### Task 6: Add A Layer Toggle

**Files:**
- Modify: `src/components/LayerPanel.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add `market_sources` to active layer state**

Default it to `false` so the catalog does not increase initial map load.

- [ ] **Step 2: Add it to `LayerPanel`**

Place it under a new or existing market/intel group with a database or bar-chart icon.

- [ ] **Step 3: Add lazy fetch in `page.tsx`**

Fetch `/api/market-sources` only when `activeLayers.market_sources` is enabled and `layerFetchedRef` has not already fetched it.

- [ ] **Step 4: Commit**

```bash
git add src/components/LayerPanel.tsx src/app/page.tsx
git commit -m "feat: add market source layer toggle"
```

### Task 7: Render Catalog Points On The Map

**Files:**
- Modify: `src/components/OsirisMap.tsx`

- [ ] **Step 1: Add a `market-sources` GeoJSON source**

Follow the existing `infrastructure` and `gdelt` source patterns.

- [ ] **Step 2: Add circle and label layers**

Color by domain. Keep the source label small and only visible at closer zooms.

- [ ] **Step 3: Add popup content**

Show source name, domain, freshness, auth mode, API docs link, caveats, and a "not observation geography" warning when applicable.

- [ ] **Step 4: Commit**

```bash
git add src/components/OsirisMap.tsx
git commit -m "feat: render market source catalog on map"
```

### Task 8: Add A Catalog Panel Surface

**Files:**
- Create: `src/components/MarketSourcesPanel.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Build tabbed domain browsing**

Use the `MarketsPanel.tsx` collapsible tab pattern. Tabs should be:

- Backbone
- CPG
- Pharma
- Finance
- Policy
- Live Risk

- [ ] **Step 2: Add filters**

Use compact controls for:

- Access: open, freemium, commercial, restricted
- Freshness: real-time/minutes, daily/weekly, monthly/annual
- Priority: 4+

- [ ] **Step 3: Add direct links**

Each source card should link to `docsUrl` and show `authMode`, `accessCost`, `refreshCadence`, and `spatialResolution`.

- [ ] **Step 4: Commit**

```bash
git add src/components/MarketSourcesPanel.tsx src/app/page.tsx
git commit -m "feat: add market source catalog panel"
```

## Chunk 4: Documentation And Verification

### Task 9: Add Source Catalog Notes

**Files:**
- Create: `docs/market-research-gis-sources.md`

- [ ] **Step 1: Document source tiers**

Explain the backbone/domain/live-risk split, freshness labels, scoring model, and commercial caveats.

- [ ] **Step 2: Document "real-time" caveat**

State plainly that most authoritative market data is not real time; the live feeds are risk, event, alert, filing, and market-price sources.

- [ ] **Step 3: Commit**

```bash
git add docs/market-research-gis-sources.md
git commit -m "docs: document market research GIS source catalog"
```

### Task 10: Run Exit Verification

**Files:**
- No edits.

- [ ] **Step 1: Run catalog validation**

```bash
npm run validate:market-sources
```

Expected:

```text
Validated market research source catalog
```

- [ ] **Step 2: Run the app build or scoped alternative**

Try:

```bash
npm run build
```

If build or lint fails because of unrelated pre-existing repo issues, paste the failure summary into the PR and use the catalog validation script as the scoped exit criterion. Do not claim repository-wide lint/build is green unless it actually is.

- [ ] **Step 3: Paste raw verification output into the PR description**

The PR is not ready until the agreed exit criterion returns 0.

## Out Of Scope

- Paid API credential UX.
- Direct commercial connector implementation.
- Scraping Google Maps, proprietary retail panels, loyalty-card panels, or paywalled market datasets.
- Predictive opportunity scoring.
- PostGIS, H3, vector-tile, or warehouse infrastructure.
- Refactoring unrelated map, market, or OSINT components.
- Editing the primary checkout.

## Current Baseline Risk

`npm run lint` currently fails before implementation with 253 errors and 27 warnings. The failures are broad existing issues such as `@typescript-eslint/no-explicit-any`, unused imports/variables, hook dependency warnings, and a React compiler warning for `Date.now` during render. A future implementation PR should either fix the touched-file lint issues it introduces or use a scoped validation command until repository-wide lint is cleaned up in a separate issue.

