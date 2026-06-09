import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q || q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results: any[] = [];
  const seen = new Set<string>();

  const addResult = (r: any) => {
    const key = r.title?.toLowerCase()?.substring(0, 100) || r.url || '';
    if (seen.has(key)) return;
    seen.add(key);
    results.push(r);
  };

  const fetchJson = async (url: string) => {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'OsirisOSINT/1.0' } });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  };

  // ── 1. Wikipedia EN + coordinate ──
  const wikiEnData = await fetchJson(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=5&format=json&origin=*`
  );
  if (wikiEnData?.query?.search?.length) {
    const wikiTitles = wikiEnData.query.search.map((p: any) => p.title).join('|');
    const wikiCoordData = await fetchJson(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${wikiTitles}&prop=coordinates|pageprops|pageimages&piprop=thumbnail&pithumbsize=120&format=json&origin=*`
    );
    for (const page of wikiEnData.query.search) {
      const pdata = wikiCoordData?.query?.pages?.[page.pageid];
      addResult({
        title: page.title,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
        snippet: page.snippet?.replace(/<[^>]*>/g, '').substring(0, 200) || '',
        source: 'wikipedia_en',
        thumbnail: pdata?.thumbnail?.source || null,
        ...(pdata?.coordinates?.[0] ? { lat: pdata.coordinates[0].lat, lng: pdata.coordinates[0].lon } : {}),
      });
    }
  }

  // ── 2. Wikipedia IT (ricerca su Italia) ──
  const wikiItData = await fetchJson(
    `https://it.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=5&format=json&origin=*`
  );
  if (wikiItData?.query?.search?.length) {
    const itTitles = wikiItData.query.search.map((p: any) => p.title).join('|');
    const itCoordData = await fetchJson(
      `https://it.wikipedia.org/w/api.php?action=query&titles=${itTitles}&prop=coordinates|pageprops|pageimages&piprop=thumbnail&pithumbsize=120&format=json&origin=*`
    );
    for (const page of wikiItData.query.search) {
      const pdata = itCoordData?.query?.pages?.[page.pageid];
      addResult({
        title: page.title,
        url: `https://it.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
        snippet: page.snippet?.replace(/<[^>]*>/g, '').substring(0, 200) || '',
        source: 'wikipedia_it',
        thumbnail: pdata?.thumbnail?.source || null,
        ...(pdata?.coordinates?.[0] ? { lat: pdata.coordinates[0].lat, lng: pdata.coordinates[0].lon } : {}),
      });
    }
  }

  // ── 3. Wikidata persone/entità ──
  const wdSearch = await fetchJson(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(q)}&language=it&format=json&origin=*&limit=5`
  );
  if (wdSearch?.search?.length) {
    const ids = wdSearch.search.map((e: any) => e.id).join('|');
    const wdClaims = await fetchJson(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids}&props=claims|labels|descriptions&format=json&origin=*`
    );
    const placeIds = new Set<string>();
    const placeRefs: { eid: string; pid: string; type: string }[] = [];

    for (const entity of wdSearch.search) {
      const claims = wdClaims?.entities?.[entity.id]?.claims || {};
      const label = wdClaims?.entities?.[entity.id]?.labels?.it?.value || wdClaims?.entities?.[entity.id]?.labels?.en?.value || entity.label || entity.id;
      const desc = entity.description || '';

      if (claims.P625) {
        const v = claims.P625[0].mainsnak.datavalue.value;
        addResult({ title: label, url: `https://www.wikidata.org/wiki/${entity.id}`, snippet: desc, source: 'wikidata', lat: v.latitude, lng: v.longitude });
        continue;
      }
      if (claims.P19) {
        const pid = claims.P19[0].mainsnak.datavalue.value.id;
        placeIds.add(pid);
        placeRefs.push({ eid: entity.id, pid, type: 'birth' });
      }
      if (claims.P20) {
        const pid = claims.P20[0].mainsnak.datavalue.value.id;
        placeIds.add(pid);
        placeRefs.push({ eid: entity.id, pid, type: 'death' });
      }
    }

    if (placeIds.size > 0) {
      const placeData = await fetchJson(
        `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${Array.from(placeIds).join('|')}&props=claims|labels&format=json&origin=*`
      );
      for (const ref of placeRefs) {
        const pe = placeData?.entities?.[ref.pid];
        if (!pe?.claims?.P625) continue;
        const v = pe.claims.P625[0].mainsnak.datavalue.value;
        const placeName = pe.labels?.it?.value || pe.labels?.en?.value || ref.pid;
        const entity = wdClaims?.entities?.[ref.eid];
        const label = entity?.labels?.it?.value || entity?.labels?.en?.value || ref.eid;
        const desc = entity?.descriptions?.it?.value || entity?.descriptions?.en?.value || '';
        const suffix = ref.type === 'birth' ? ` (nato a ${placeName})` : ` (morto a ${placeName})`;
        addResult({ title: label + suffix, url: `https://www.wikidata.org/wiki/${ref.eid}`, snippet: desc, source: 'wikidata', lat: v.latitude, lng: v.longitude });
      }
    }
  }

  // ── 4. DuckDuckGo Instant Answer ──
  const ddgData = await fetchJson(
    `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`
  );
  if (ddgData?.AbstractText) {
    addResult({ title: ddgData.Heading || q, url: ddgData.AbstractURL || '', snippet: ddgData.AbstractText.substring(0, 200), source: 'duckduckgo' });
  }
  for (const topic of ddgData?.RelatedTopics || []) {
    if (topic.Name) {
      for (const sub of topic.Topics || []) {
        addResult({ title: sub.Text?.split(' ').slice(0, 8).join(' ') || '', url: sub.FirstURL || '', snippet: (sub.Text || '').substring(0, 200), source: 'duckduckgo' });
        if (results.length >= 15) break;
      }
    } else {
      addResult({ title: topic.Text?.split(' ').slice(0, 8).join(' ') || '', url: topic.FirstURL || '', snippet: (topic.Text || '').substring(0, 200), source: 'duckduckgo' });
    }
    if (results.length >= 15) break;
  }

  // ── 5. OpenCorporates (aziende) ──
  const ocData = await fetchJson(`https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(q)}&jurisdiction_code=it&per_page=5`);
  if (ocData?.results?.companies?.length) {
    for (const c of ocData.results.companies) {
      const co = c.company || {};
      const name = co.name || '';
      const addr = co.registered_address_in_full || '';
      addResult({
        title: `${name} (${co.company_number || ''})`,
        url: co.url || `https://opencorporates.com/companies/${co.jurisdiction_code}/${co.company_number}`,
        snippet: addr ? `Sede: ${addr.substring(0, 200)}` : `Azienda ${co.jurisdiction_code}`,
        source: 'opencorporates',
      });
    }
  }

  // ── 6. Google Custom Search (se GOOGLE_API_KEY configurato) ──
  const gKey = process.env.GOOGLE_API_KEY;
  const gCx = process.env.GOOGLE_CX;
  if (gKey && gCx) {
    const gData = await fetchJson(
      `https://www.googleapis.com/customsearch/v1?key=${gKey}&cx=${gCx}&q=${encodeURIComponent(q)}&lr=lang_it&num=5`
    );
    if (gData?.items) {
      for (const item of gData.items) {
        addResult({
          title: item.title || '',
          url: item.link || '',
          snippet: (item.snippet || '').substring(0, 200),
          source: 'google',
        });
      }
    }
  }

  return NextResponse.json({ results: results.slice(0, 25) });
}
