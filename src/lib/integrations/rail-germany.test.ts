import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGermanyRailInfrastructureQuery,
  GERMANY_RAIL_HUBS,
  normalizeOverpassRailElement,
  normalizeStaticRailHub,
} from './rail-germany.ts';

test('builds a Germany-only rail infrastructure query without operational departures', () => {
  const query = buildGermanyRailInfrastructureQuery(80);

  assert.match(query, /ISO3166-1"="DE/);
  assert.match(query, /railway"="rail/);
  assert.match(query, /station\|halt\|yard\|depot\|junction/);
  assert.doesNotMatch(query, /departures|delay|trip|journey/i);
});

test('normalizes German static rail hubs as infrastructure facilities', () => {
  const hub = normalizeStaticRailHub(GERMANY_RAIL_HUBS[0]);

  assert.equal(hub.id, 'rail-de-hub-8011160');
  assert.equal(hub.kind, 'station');
  assert.equal(hub.name, 'Berlin Hbf');
  assert.equal(hub.lat, 52.525592);
  assert.equal(hub.lng, 13.369545);
  assert.equal(hub.source.feed, 'rail-germany-infrastructure');
});

test('normalizes Overpass rail stations with operator and UIC metadata', () => {
  const facility = normalizeOverpassRailElement({
    type: 'node',
    id: 123,
    lat: 52.525592,
    lon: 13.369545,
    tags: {
      railway: 'station',
      name: 'Berlin Hauptbahnhof',
      operator: 'DB InfraGO',
      uic_ref: '8011160',
      network: 'DB',
    },
  });

  assert.deepEqual(facility && {
    id: facility.id,
    kind: facility.kind,
    name: facility.name,
    operator: facility.operator,
    uicRef: facility.uicRef,
    network: facility.network,
    lat: facility.lat,
    lng: facility.lng,
  }, {
    id: 'rail-de-uic-8011160',
    kind: 'station',
    name: 'Berlin Hauptbahnhof',
    operator: 'DB InfraGO',
    uicRef: '8011160',
    network: 'DB',
    lat: 52.525592,
    lng: 13.369545,
  });
});

test('normalizes Overpass railway ways as line infrastructure geometry', () => {
  const line = normalizeOverpassRailElement({
    type: 'way',
    id: 987,
    tags: {
      railway: 'rail',
      name: 'Berlin-Hamburg railway',
      operator: 'DB Netz',
      electrified: 'contact_line',
      usage: 'main',
      gauge: '1435',
    },
    geometry: [
      { lat: 52.52, lon: 13.36 },
      { lat: 52.6, lon: 13.2 },
      { lat: 52.8, lon: 12.9 },
    ],
  });

  assert.equal(line?.id, 'rail-de-way-987');
  assert.equal(line?.kind, 'line');
  assert.equal(line?.operator, 'DB Netz');
  assert.equal(line?.electrified, 'contact_line');
  assert.equal(line?.usage, 'main');
  assert.deepEqual(line?.geometry, {
    type: 'LineString',
    coordinates: [
      [13.36, 52.52],
      [13.2, 52.6],
      [12.9, 52.8],
    ],
  });
});

test('drops non-rail or coordinate-less rail elements', () => {
  assert.equal(normalizeOverpassRailElement({ type: 'node', id: 1, tags: { amenity: 'cafe' } }), null);
  assert.equal(normalizeOverpassRailElement({ type: 'way', id: 2, tags: { railway: 'rail' }, geometry: [{ lat: 1 }] }), null);
});
