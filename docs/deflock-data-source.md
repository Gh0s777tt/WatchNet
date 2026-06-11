# DeFlock data source option

OSIRIS now includes a DeFlock-compatible OpenStreetMap surveillance pull as an optional backend data source.

## What DeFlock does

DeFlock pulls mapped surveillance nodes from OpenStreetMap through Overpass. The pattern is:

1. Build an Overpass QL query scoped to a bounding box.
2. POST the query as `data=<query>` to the DeFlock Overpass endpoint.
3. Fall back to the public Overpass endpoint if the DeFlock endpoint is unavailable.
4. Parse returned OSM `node` elements into local camera/surveillance records.
5. Split large query areas into smaller quadrants when Overpass reports node limits or timeouts.

## OSIRIS endpoints

```text
/api/deflock?bbox=south,west,north,east
/api/deflock?lat=39.95&lng=-75.16&radiusKm=25
/api/cctv/deflock?bbox=south,west,north,east
/api/cctv/deflock?lat=39.95&lng=-75.16&radiusKm=25
```

The `/api/cctv/deflock` route is an alias so this can be treated as a CCTV/surveillance source option without changing the existing `/api/cctv` regional fetcher.

## Response shape

The route returns the same top-level camera feed shape used by OSIRIS CCTV consumers:

```json
{
  "cameras": [],
  "total": 0,
  "sources": {},
  "regions": ["deflock"],
  "timestamp": "2026-06-11T00:00:00.000Z"
}
```

Each camera record includes OSIRIS map fields plus the original OSM tags:

```json
{
  "id": "deflock-osm-123",
  "osm_id": 123,
  "lat": 39.95,
  "lng": -75.16,
  "name": "Flock Safety surveillance camera",
  "source": "DeFlock Overpass / OpenStreetMap",
  "external_url": "https://www.openstreetmap.org/node/123",
  "deflock_tags": {}
}
```

## Query filters

The OSIRIS route searches public OSM nodes matching common DeFlock surveillance tags:

```text
man_made=surveillance
surveillance=*
surveillance:type=*
camera:type=*
brand/manufacturer/operator ~= Flock Safety|Motorola|Vigilant|Genetec|Leonardo|ELSAG|Neology
```

## Safety and performance limits

- Bounding boxes are required unless `lat,lng,radiusKm` is supplied.
- Radius is capped at 250 km.
- Very large boxes are pre-split before querying.
- Overpass timeouts and node-limit responses trigger recursive quadrant splitting.
- Results are deduplicated by OSM node ID.
