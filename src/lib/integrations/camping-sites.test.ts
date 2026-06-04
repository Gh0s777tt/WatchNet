import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOverpassCampingQuery,
  normalizeCampingElement,
} from './camping-sites.ts';

test('builds bounded Overpass camping query', () => {
  const query = buildOverpassCampingQuery({
    south: 42.2,
    west: 24.4,
    north: 43.4,
    east: 26.0,
  });

  assert.match(query, /tourism"="camp_site/);
  assert.match(query, /tourism"="caravan_site/);
  assert.match(query, /out center 300/);
});

test('normalizes Overpass camping element', () => {
  const item = normalizeCampingElement({
    type: 'node',
    id: 123,
    lat: 42.7,
    lon: 25.4,
    tags: {
      tourism: 'camp_site',
      name: 'Camping A',
      website: 'https://example.com',
      capacity: '40',
    },
  });

  assert.equal(item?.id, 'osm-node-123');
  assert.equal(item?.kind, 'camp_site');
  assert.equal(item?.name, 'Camping A');
  assert.equal(item?.website, 'https://example.com');
  assert.equal(item?.capacity, '40');
  assert.equal(item?.source.provider, 'OpenStreetMap/Overpass');
});
