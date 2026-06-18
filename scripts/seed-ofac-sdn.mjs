/**
 * Seed the OFAC SDN list (OpenSanctions us_ofac_sdn) into Redis for the RECON
 * sanctions-search tool. Trims to searchable fields and chunks under the
 * Upstash REST 1MB request limit. Re-run daily (cron/Railway) to stay current.
 *
 * Run: UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=... node scripts/seed-ofac-sdn.mjs
 */
import Papa from 'papaparse';

const SRC = 'https://data.opensanctions.org/datasets/latest/us_ofac_sdn/targets.simple.csv';
const PREFIX = 'recon:ofac';
const CHUNK_SIZE = 4000;

const U = process.env.UPSTASH_REDIS_REST_URL;
const T = process.env.UPSTASH_REDIS_REST_TOKEN;
if (!U || !T) {
  console.error('Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN');
  process.exit(1);
}

async function redis(cmd) {
  const r = await fetch(U, {
    method: 'POST',
    headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error(`Redis ${r.status}: ${await r.text()}`);
  return (await r.json()).result;
}

console.log('[ofac] fetching', SRC);
const csv = await (await fetch(SRC)).text();
console.log(`[ofac] downloaded ${(csv.length / 1e6).toFixed(1)} MB`);

const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
const rows = parsed.data;
console.log(`[ofac] parsed ${rows.length} rows`);

// Trim to searchable fields: name, aliases, schema(type), programs, countries.
const out = rows
  .map((r) => ({ n: r.name, a: r.aliases || '', t: r.schema, p: r.program_ids || '', c: r.countries || '' }))
  .filter((e) => e.n);

// Chunk under the Upstash 1MB request limit.
const chunks = [];
for (let i = 0; i < out.length; i += CHUNK_SIZE) chunks.push(out.slice(i, i + CHUNK_SIZE));

for (let i = 0; i < chunks.length; i++) {
  const body = JSON.stringify(chunks[i]);
  await redis(['SET', `${PREFIX}:${i}`, body]);
  console.log(`[ofac] chunk ${i}: ${chunks[i].length} entries, ${(body.length / 1024).toFixed(0)} KB`);
}
await redis([
  'SET',
  `${PREFIX}:meta`,
  JSON.stringify({ chunks: chunks.length, count: out.length, fetchedAt: new Date().toISOString() }),
]);

console.log(`[ofac] DONE — ${out.length} entities in ${chunks.length} chunks`);
