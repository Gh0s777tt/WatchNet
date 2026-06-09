export interface SearchResult {
  label: string;
  lat: number;
  lng: number;
  type: string;
  description?: string;
}

export async function searchWikipedia(query: string, limit = 5): Promise<SearchResult[]> {
  if (query.trim().length < 2) return [];

  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=10&format=json&origin=*`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  const pages = searchData.query?.search || [];
  if (pages.length === 0) return [];

  const titles = pages.map((p: any) => p.title).join('|');

  const coordUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${titles}&prop=coordinates|pageprops&format=json&origin=*`;
  const coordRes = await fetch(coordUrl);
  const coordData = await coordRes.json();
  const coordPages = coordData.query?.pages || {};

  const results: SearchResult[] = [];
  const wikidataIds: string[] = [];

  for (const page of pages) {
    const pageData = coordPages[page.pageid];
    if (!pageData) continue;

    if (pageData?.coordinates?.[0]) {
      const coord = pageData.coordinates[0];
      const snippet = page.snippet?.replace(/<[^>]*>/g, '').substring(0, 120) || '';
      results.push({
        label: page.title,
        lat: coord.lat,
        lng: coord.lon,
        type: 'WIKIPEDIA',
        description: snippet,
      });
      if (results.length >= limit) break;
      continue;
    }

    if (pageData.pageprops?.wikibase_item) {
      wikidataIds.push(pageData.pageprops.wikibase_item);
    }
  }

  if (results.length < limit && wikidataIds.length > 0) {
    try {
      const wdUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wikidataIds.join('|')}&props=claims|labels&format=json&origin=*`;
      const wdRes = await fetch(wdUrl);
      const wdData = await wdRes.json();

      for (const page of pages) {
        if (results.length >= limit) break;
        const pageData = coordPages[page.pageid];
        if (!pageData?.pageprops?.wikibase_item) continue;
        const wdid = pageData.pageprops.wikibase_item;
        const wdEntity = wdData.entities?.[wdid];
        if (!wdEntity?.claims?.P625) continue;
        const v = wdEntity.claims.P625[0].mainsnak.datavalue.value;
        const snippet = page.snippet?.replace(/<[^>]*>/g, '').substring(0, 120) || '';
        results.push({
          label: page.title,
          lat: v.latitude,
          lng: v.longitude,
          type: 'WIKIPEDIA',
          description: snippet,
        });
      }
    } catch {}
  }

  return results;
}

export async function searchPersons(query: string, limit = 5): Promise<SearchResult[]> {
  if (query.trim().length < 2) return [];

  const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=it&format=json&origin=*&limit=${limit}`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  const entities = searchData.search || [];
  if (entities.length === 0) return [];

  const ids = entities.map((e: any) => e.id);

  const claimsUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join('|')}&props=claims|labels|descriptions&format=json&origin=*`;
  const claimsRes = await fetch(claimsUrl);
  const claimsData = await claimsRes.json();

  const results: SearchResult[] = [];
  const placeIds = new Set<string>();
  const personPlaceMap: { entityId: string; placeId: string; type: 'birth' | 'death' }[] = [];

  for (const entity of entities) {
    const eid = entity.id;
    const edata = claimsData.entities[eid] || {};
    const claims = edata.claims || {};
    const label = edata.labels?.it?.value || edata.labels?.en?.value || entity.label || eid;
    const description = edata.descriptions?.it?.value || edata.descriptions?.en?.value || entity.description || '';

    if (claims.P625) {
      const v = claims.P625[0].mainsnak.datavalue.value;
      results.push({ label, lat: v.latitude, lng: v.longitude, type: 'PERSONA', description });
      continue;
    }

    if (claims.P19) {
      const pid = claims.P19[0].mainsnak.datavalue.value.id;
      placeIds.add(pid);
      personPlaceMap.push({ entityId: eid, placeId: pid, type: 'birth' });
    }
    if (claims.P20) {
      const pid = claims.P20[0].mainsnak.datavalue.value.id;
      placeIds.add(pid);
      personPlaceMap.push({ entityId: eid, placeId: pid, type: 'death' });
    }
  }

  if (placeIds.size > 0) {
    const placeUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${Array.from(placeIds).join('|')}&props=claims|labels&format=json&origin=*`;
    const placeRes = await fetch(placeUrl);
    const placeData = await placeRes.json();

    for (const m of personPlaceMap) {
      const placeEntity = placeData.entities[m.placeId];
      if (!placeEntity?.claims?.P625) continue;
      const v = placeEntity.claims.P625[0].mainsnak.datavalue.value;
      const placeName = placeEntity.labels?.it?.value || placeEntity.labels?.en?.value || m.placeId;
      const entity = claimsData.entities[m.entityId];
      const label = entity?.labels?.it?.value || entity?.labels?.en?.value || m.entityId;
      const desc = entity?.descriptions?.it?.value || entity?.descriptions?.en?.value || '';
      const suffix = m.type === 'birth' ? ` (nato a ${placeName})` : ` (morto a ${placeName})`;
      results.push({ label: label + suffix, lat: v.latitude, lng: v.longitude, type: 'PERSONA', description: desc });
    }
  }

  return results.slice(0, limit);
}

export async function searchInternet(query: string, limit = 5): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  try {
    const wikiResults = await searchWikipedia(query, limit);
    results.push(...wikiResults);
  } catch {}

  try {
    const personResults = await searchPersons(query, limit);
    const existingKeys = new Set(results.map(r => `${r.lat.toFixed(2)},${r.lng.toFixed(2)}`));
    for (const r of personResults) {
      const k = `${r.lat.toFixed(2)},${r.lng.toFixed(2)}`;
      if (!existingKeys.has(k)) {
        existingKeys.add(k);
        results.push(r);
      }
    }
  } catch {}

  return results.slice(0, limit);
}

export async function searchWeb(query: string): Promise<{ title: string; url: string; snippet: string; source: string; lat?: number; lng?: number }[]> {
  if (query.trim().length < 2) return [];
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}
