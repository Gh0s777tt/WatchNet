import { createHash } from 'crypto';

interface DedupEntry {
  hash: string;
  timestamp: number;
}

const TTL_MS = 24 * 60 * 60 * 1000;
const dedupStore = new Map<string, DedupEntry>();

function generateHash(content: string): string {
  const normalized = content.toLowerCase().replace(/\s+/g, ' ').trim();
  return createHash('sha256').update(normalized).digest('hex');
}

export function isDuplicate(title: string, source: string, description: string): boolean {
  const now = Date.now();
  cleanup(now);

  const content = `${source}|${title}|${description}`;
  const hash = generateHash(content);

  const existing = dedupStore.get(hash);
  if (existing) {
    existing.timestamp = now;
    return true;
  }

  dedupStore.set(hash, { hash, timestamp: now });
  return false;
}

function cleanup(now: number): void {
  const cutoff = now - TTL_MS;
  for (const [key, entry] of dedupStore) {
    if (entry.timestamp < cutoff) {
      dedupStore.delete(key);
    }
  }
}

export function getDedupStats(): { totalTracked: number; oldest: number } {
  const now = Date.now();
  let oldest = now;
  for (const entry of dedupStore.values()) {
    if (entry.timestamp < oldest) oldest = entry.timestamp;
  }
  return { totalTracked: dedupStore.size, oldest };
}
