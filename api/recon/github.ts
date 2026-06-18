/**
 * RECON · GitHub recon  (ported from OSIRIS `osint/github`)
 *
 * Self-contained Vercel Edge Function. Public GitHub profile + recent repos for
 * a username (keyless, GitHub REST). Part of the OSIRIS → WatchNet merge.
 * Hand-written (exceptions: `deferred`).
 */

export const config = { runtime: 'edge' };

const USER_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

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
      'Cache-Control': status === 200 ? 'public, s-maxage=600, stale-while-revalidate=1800' : 'no-store',
      ...cors(origin),
    },
  });
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405, origin);

  const user = new URL(req.url).searchParams.get('user')?.trim();
  if (!user) return json({ error: 'Missing user parameter' }, 400, origin);
  if (!USER_RE.test(user)) return json({ error: 'Invalid GitHub username' }, 400, origin);

  const headers = { 'User-Agent': 'WatchNet-RECON/1.0', Accept: 'application/vnd.github+json' };
  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${encodeURIComponent(user)}`, { headers, signal: AbortSignal.timeout(8000) }),
      fetch(`https://api.github.com/users/${encodeURIComponent(user)}/repos?sort=updated&per_page=5`, {
        headers,
        signal: AbortSignal.timeout(8000),
      }),
    ]);
    if (userRes.status === 404) return json({ error: 'User not found' }, 404, origin);
    if (!userRes.ok) return json({ error: `GitHub HTTP ${userRes.status}` }, 502, origin);

    const u = (await userRes.json()) as Record<string, any>;
    const repos = reposRes.ok ? ((await reposRes.json()) as any[]) : [];

    return json(
      {
        username: u.login,
        name: u.name,
        company: u.company,
        blog: u.blog,
        location: u.location,
        email: u.email,
        bio: u.bio,
        twitter: u.twitter_username,
        public_repos: u.public_repos,
        followers: u.followers,
        created_at: u.created_at,
        recent_repos: Array.isArray(repos)
          ? repos.map((r) => ({ name: r.name, language: r.language, updated: r.updated_at }))
          : [],
        timestamp: new Date().toISOString(),
      },
      200,
      origin,
    );
  } catch {
    return json({ error: 'GitHub lookup failed' }, 502, origin);
  }
}
