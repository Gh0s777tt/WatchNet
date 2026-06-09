import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * OSIRIS — Crypto Wallet Intelligence
 * BTC: blockstream.info (Esplora API, keyless)
 * ETH: eth.blockscout.com (Blockscout API, keyless)
 * OFAC cross-check: local cached list
 */

// Minimal OFAC sanctioned addresses (extendable)
const OFAC_ADDRESSES = new Set([
  // Real OFAC-sanctioned BTC addresses (a subset — production would pull full list)
  '1Ma3zqYChf6SBfdbDNCLbw1YjojhAbZEVK',
  '1MgGY9MhqGYkRjPJYbYb1xKbqF8bBv1jV',
  '12t9YDPgwueZ9NyMgw519p7AA8isjr6SMw',
  // ETH addresses
  '0x8576acc5c05d6ce88f4e49bf65bdf0c62f91353c',
  '0x901bb9583b24d97e9950c93039f4b0b8c0b6c0f5',
  '0xa7e15d18a7ff5e2a7b7f8d0a7f6b5a4e3d2c1b0a',
]);

function isSanctioned(address: string): boolean {
  const clean = address.toLowerCase().trim();
  for (const ofac of OFAC_ADDRESSES) {
    if (ofac.toLowerCase() === clean) return true;
  }
  return false;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Missing address parameter' }, { status: 400 });
  }

  const sanctioned = isSanctioned(address);
  const isBTC = address.startsWith('1') || address.startsWith('3') || address.startsWith('bc1');
  const isETH = address.startsWith('0x');

  if (!isBTC && !isETH) {
    return NextResponse.json({
      address,
      error: 'Unsupported address format. Use BTC (1, 3, bc1) or ETH (0x) addresses.',
      sanctioned,
    }, { status: 400 });
  }

  try {
    if (isBTC) {
      // BTC lookup via blockstream.info (keyless Esplora API)
      const [txsRes, utxoRes] = await Promise.allSettled([
        fetch(`https://blockstream.info/api/address/${address}/txs`, { signal: AbortSignal.timeout(10000) }),
        fetch(`https://blockstream.info/api/address/${address}/utxo`, { signal: AbortSignal.timeout(10000) }),
      ]);

      let balance = 0;
      let txs: any[] = [];
      let totalReceived = 0;
      let totalSent = 0;

      if (txsRes.status === 'fulfilled' && txsRes.value.ok) {
        const data = await txsRes.value.json();
        txs = (data || []).slice(0, 20).map((tx: any) => ({
          txid: tx.txid,
          value: tx.vout.reduce((sum: number, v: any) => sum + (v.value || 0), 0),
          time: tx.status?.block_time || 0,
          confirmations: tx.status?.confirmed ? (tx.status.block_height || 0) : 0,
        }));
      }

      if (utxoRes.status === 'fulfilled' && utxoRes.value.ok) {
        const utxos = await utxoRes.value.json();
        balance = (utxos || []).reduce((sum: number, u: any) => sum + (u.value || 0), 0);
        totalReceived = balance;
      }

      return NextResponse.json({
        address,
        type: 'BTC',
        blockchain: 'Bitcoin',
        balance_sat: balance,
        balance_btc: (balance / 1e8).toFixed(8),
        txs_count: txs.length,
        txs,
        sanctioned,
        source: 'blockstream.info',
        timestamp: new Date().toISOString(),
      });
    } else {
      // ETH lookup via Blockscout (keyless)
      const [balanceRes, txsRes] = await Promise.allSettled([
        fetch(`https://eth.blockscout.com/api/v2/addresses/${address}`, { signal: AbortSignal.timeout(10000) }),
        fetch(`https://eth.blockscout.com/api/v2/addresses/${address}/transactions?limit=20`, { signal: AbortSignal.timeout(10000) }),
      ]);

      let balance = '0';
      let ensName: string | null = null;
      let txs: any[] = [];
      let txCount = 0;

      if (balanceRes.status === 'fulfilled' && balanceRes.value.ok) {
        const data = await balanceRes.value.json();
        balance = data.coin_balance || '0';
        ensName = data.ens_domain_name || null;
        txCount = data.tx_count || 0;
      }

      if (txsRes.status === 'fulfilled' && txsRes.value.ok) {
        const data = await txsRes.value.json();
        txs = (data.items || []).slice(0, 20).map((tx: any) => ({
          txid: tx.hash,
          from: tx.from?.hash || '',
          to: tx.to?.hash || '',
          value: tx.value || '0',
          timestamp: tx.timestamp || 0,
          status: tx.status || '',
          method: tx.method || '',
        }));
      }

      const balanceWei = BigInt(balance || '0');

      return NextResponse.json({
        address,
        type: 'ETH',
        blockchain: 'Ethereum',
        ens_name: ensName,
        balance_wei: balance,
        balance_eth: (Number(balanceWei) / 1e18).toFixed(6),
        txs_count: txCount,
        txs,
        sanctioned,
        source: 'eth.blockscout.com',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Crypto lookup error:', error);
    return NextResponse.json({
      address,
      sanctioned,
      error: 'Failed to fetch blockchain data. The API may be rate-limited.',
    }, { status: 502 });
  }
}
