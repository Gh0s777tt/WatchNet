import { DepPrivlistRecord, DepDataset, DepSearchResult } from './types';

interface TokenCache { token: string; expiresAt: number }
let tokenCache: TokenCache | null = null;

async function authenticate(): Promise<string> {
  const loginEndpoint = process.env.DEP_AUTH_ENDPOINT;
  const clientId = process.env.DEP_CLIENT_ID;
  const refreshToken = process.env.DEP_REFRESH_TOKEN;
  const username = process.env.DEP_USERNAME;
  const password = process.env.DEP_PASSWORD;

  if (!loginEndpoint || !clientId) throw new Error('DEP_AUTH_ENDPOINT and DEP_CLIENT_ID are required');

  const headers = {
    'Content-Type': 'application/x-amz-json-1.1',
    'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
  };

  let payload: object;
  if (refreshToken) {
    payload = { AuthFlow: 'REFRESH_TOKEN_AUTH', AuthParameters: { REFRESH_TOKEN: refreshToken }, ClientId: clientId };
  } else if (username && password) {
    payload = { AuthFlow: 'USER_PASSWORD_AUTH', AuthParameters: { USERNAME: username, PASSWORD: password }, ClientId: clientId };
  } else {
    throw new Error('DEP_REFRESH_TOKEN or DEP_USERNAME+DEP_PASSWORD are required');
  }

  const res = await fetch(loginEndpoint, {
    method: 'POST', headers, body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    let body = '';
    try { body = await res.text(); } catch { /* ignore */ }
    throw new Error(`DEP auth failed: ${res.status} — ${body}`);
  }

  const data = await res.json();
  const token: string = data?.AuthenticationResult?.IdToken;
  if (!token) throw new Error('DEP auth: no IdToken in response');
  return token;
}

async function getToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60000) return tokenCache.token;
  const token = await authenticate();
  tokenCache = { token, expiresAt: now + 55 * 60 * 1000 };
  return token;
}

function apiHeaders(token: string): Record<string, string> {
  return { 'x-api-key': process.env.DEP_API_KEY!, Authorization: token };
}

export async function fetchPrivlist(
  datasets: DepDataset[],
  startDate: string,
  endDate: string,
): Promise<Array<DepPrivlistRecord & { dset: DepDataset }>> {
  const apiEndpoint = process.env.DEP_API_ENDPOINT;
  if (!apiEndpoint || !process.env.DEP_API_KEY) throw new Error('DEP_API_ENDPOINT and DEP_API_KEY are required');

  const token = await getToken();
  const results = await Promise.allSettled(
    datasets.map(async (dset) => {
      const params = new URLSearchParams({ ts: startDate, te: endDate, dset, full: 'true' });
      const res = await fetch(`${apiEndpoint}/dbtr/privlist?${params}`, {
        headers: apiHeaders(token), signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) throw new Error(`DEP privlist ${dset}: ${res.status}`);
      const data = await res.json();
      const records = (Array.isArray(data) ? data : []) as DepPrivlistRecord[];
      return records.map(r => ({ ...r, dset }));
    }),
  );

  const all: Array<DepPrivlistRecord & { dset: DepDataset }> = [];
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value);
  }
  return all;
}

export async function searchByKeyword(keyword: string, dset: DepDataset, maxres: number): Promise<DepSearchResult[]> {
  const apiEndpoint = process.env.DEP_API_ENDPOINT;
  if (!apiEndpoint || !process.env.DEP_API_KEY) throw new Error('DEP_API_ENDPOINT and DEP_API_KEY are required');

  const token = await getToken();
  const params = new URLSearchParams({ keyw: keyword, dset, maxres: String(maxres) });
  const res = await fetch(`${apiEndpoint}/dbtr/search?${params}`, {
    headers: apiHeaders(token), signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`DEP search: ${res.status}`);
  const data = await res.json();
  if (!data) return [];
  return (Array.isArray(data) ? data : [data]) as DepSearchResult[];
}

export async function searchByDomains(domains: string[], dset: DepDataset, maxres: number): Promise<DepSearchResult[]> {
  const apiEndpoint = process.env.DEP_API_ENDPOINT;
  if (!apiEndpoint || !process.env.DEP_API_KEY) throw new Error('DEP_API_ENDPOINT and DEP_API_KEY are required');

  const token = await getToken();
  const res = await fetch(`${apiEndpoint}/dbtr/search`, {
    method: 'POST',
    headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain: domains, dset, maxres: String(maxres), extended: 'false' }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`DEP search domains: ${res.status}`);
  const data = await res.json();
  if (!data) return [];
  return (Array.isArray(data) ? data : [data]) as DepSearchResult[];
}
