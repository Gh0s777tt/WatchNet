import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');
  if (!username) return NextResponse.json({ error: 'Missing username parameter' }, { status: 400 });
  
  const platforms = [
    { name: 'GitHub', url: `https://github.com/${encodeURIComponent(username)}` },
    { name: 'Twitter/X', url: `https://x.com/${encodeURIComponent(username)}` },
    { name: 'Reddit', url: `https://reddit.com/user/${encodeURIComponent(username)}` },
    { name: 'Instagram', url: `https://instagram.com/${encodeURIComponent(username)}` },
    { name: 'Medium', url: `https://medium.com/@${encodeURIComponent(username)}` },
    { name: 'TikTok', url: `https://tiktok.com/@${encodeURIComponent(username)}` },
    { name: 'YouTube', url: `https://youtube.com/@${encodeURIComponent(username)}` },
    { name: 'Facebook', url: `https://facebook.com/${encodeURIComponent(username)}` },
    { name: 'Telegram', url: `https://t.me/${encodeURIComponent(username)}` },
    { name: 'Keybase', url: `https://keybase.io/${encodeURIComponent(username)}` },
    { name: 'Pinterest', url: `https://pinterest.com/${encodeURIComponent(username)}` },
    { name: 'Twitch', url: `https://twitch.tv/${encodeURIComponent(username)}` },
    { name: 'Steam', url: `https://steamcommunity.com/id/${encodeURIComponent(username)}` },
    { name: 'DeviantArt', url: `https://deviantart.com/${encodeURIComponent(username)}` },
    { name: 'SoundCloud', url: `https://soundcloud.com/${encodeURIComponent(username)}` },
  ];

  const results = await Promise.allSettled(
    platforms.map(async (p) => {
      try {
        const resp = await fetch(p.url, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
        return { ...p, exists: resp.ok || resp.status !== 404, status: resp.status };
      } catch {
        return { ...p, exists: null, status: 0 };
      }
    })
  );
  const checked = results.map(r => r.status === 'fulfilled' ? r.value : { name: 'Error', url: '', exists: null, status: 0 });
  return NextResponse.json({ username, platforms: checked, timestamp: new Date().toISOString() });
}
