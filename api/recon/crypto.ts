/**
 * RECON · Crypto wallet trace  (BUILT NEW for WatchNet)
 *
 * OSIRIS advertised BTC/ETH wallet tracing but never shipped it — this is a
 * fresh, self-contained Vercel Edge implementation:
 *   - BTC balance + tx count via blockstream.info Esplora API (keyless)
 *   - ETH balance + tx count via Blockscout public instance (keyless)
 *   - OFAC SDN sanctioned-address check via the public 0xB10C list mirror
 *
 * Hand-written (exceptions: `deferred`) pending proto migration — see whois.ts.
 */

export const config = { runtime: 'edge' };

const ETH_RE = /^0x[a-fA-F0-9]{40}$/;
const BTC_RE = /^(bc1[a-z0-9]{20,80}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/;

const OFAC_LIST: Record<string, string> = {
  ETH: 'https://raw.githubusercontent.com/0xB10C/ofac-sanctioned-digital-currency-addresses/lists/sanctioned_addresses_ETH.txt',
  BTC: 'https://raw.githubusercontent.com/0xB10C/ofac-sanctioned-digital-currency-addresses/lists/sanctioned_addresses_XBT.txt',
};

function cors(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}
function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200 ? 'public, s-maxage=120, stale-while-revalidate=600' : 'no-store',
      ...cors(origin),
    },
  });
}

/** Returns true/false if the OFAC list is reachable, null if it can't be checked. */
async function isSanctioned(chain: 'ETH' | 'BTC', address: string): Promise<boolean | null> {
  try {
    const res = await fetch(OFAC_LIST[chain] as string, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const text = await res.text();
    const needle = chain === 'ETH' ? address.toLowerCase() : address;
    for (const line of text.split('\n')) {
      const entry = chain === 'ETH' ? line.trim().toLowerCase() : line.trim();
      if (entry && entry === needle) return true;
    }
    return false;
  } catch {
    return null;
  }
}

async function traceBtc(address: string): Promise<{ balance: number; tx_count: number } | null> {
  try {
    const res = await fetch(`https://blockstream.info/api/address/${encodeURIComponent(address)}`, {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const d = (await res.json()) as Record<string, any>;
    const funded = Number(d.chain_stats?.funded_txo_sum ?? 0);
    const spent = Number(d.chain_stats?.spent_txo_sum ?? 0);
    return {
      balance: (funded - spent) / 1e8,
      tx_count: Number(d.chain_stats?.tx_count ?? 0) + Number(d.mempool_stats?.tx_count ?? 0),
    };
  } catch {
    return null;
  }
}

async function traceEth(address: string): Promise<{ balance: number; tx_count: number } | null> {
  try {
    const [balRes, cntRes] = await Promise.allSettled([
      fetch(`https://eth.blockscout.com/api/v2/addresses/${encodeURIComponent(address)}`, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/json' },
      }),
      fetch(`https://eth.blockscout.com/api/v2/addresses/${encodeURIComponent(address)}/counters`, {
        signal: AbortSignal.timeout(8000),
        headers: { Accept: 'application/json' },
      }),
    ]);
    let balance = 0;
    let txCount = 0;
    if (balRes.status === 'fulfilled' && balRes.value.ok) {
      const d = (await balRes.value.json()) as Record<string, any>;
      balance = Number(d.coin_balance ?? 0) / 1e18;
    }
    if (cntRes.status === 'fulfilled' && cntRes.value.ok) {
      const d = (await cntRes.value.json()) as Record<string, any>;
      txCount = Number(d.transactions_count ?? 0);
    }
    return { balance, tx_count: txCount };
  } catch {
    return null;
  }
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405, origin);

  const address = new URL(req.url).searchParams.get('address')?.trim();
  if (!address) return json({ error: 'Missing address parameter' }, 400, origin);

  const chain: 'ETH' | 'BTC' | null = ETH_RE.test(address) ? 'ETH' : BTC_RE.test(address) ? 'BTC' : null;
  if (!chain) return json({ error: 'Unrecognized address — expected a BTC or ETH address' }, 400, origin);

  const [trace, sanctioned] = await Promise.all([
    chain === 'BTC' ? traceBtc(address) : traceEth(address),
    isSanctioned(chain, address),
  ]);

  if (!trace) return json({ error: `${chain} lookup failed` }, 502, origin);

  return json(
    {
      address,
      chain,
      balance: trace.balance,
      balance_unit: chain,
      tx_count: trace.tx_count,
      sanctioned, // true | false | null (list unreachable)
      sanctions_source: sanctioned ? 'OFAC SDN (0xB10C mirror)' : null,
      source: chain === 'BTC' ? 'blockstream.info' : 'blockscout',
      timestamp: new Date().toISOString(),
    },
    200,
    origin,
  );
}
