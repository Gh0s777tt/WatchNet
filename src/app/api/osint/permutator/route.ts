import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const first = searchParams.get('first') || '';
  const last = searchParams.get('last') || '';
  const domain = searchParams.get('domain') || '';
  if (!first && !last) return NextResponse.json({ error: 'Provide at least first or last name' }, { status: 400 });
  const f = first.toLowerCase().trim(), l = last.toLowerCase().trim(), d = domain.toLowerCase().trim() || 'example.com';
  const fi = f.charAt(0), li = l.charAt(0);
  const p: string[] = [];
  const add = (e: string) => p.push(e);
  if (f && l) {
    add(`${f}@${d}`); add(`${l}@${d}`); add(`${f}${l}@${d}`); add(`${f}.${l}@${d}`); add(`${fi}${l}@${d}`);
    add(`${f}${li}@${d}`); add(`${fi}.${l}@${d}`); add(`${f}.${li}@${d}`); add(`${l}${f}@${d}`); add(`${l}.${f}@${d}`);
    add(`${li}${f}@${d}`); add(`${f}_${l}@${d}`); add(`${l}_${f}@${d}`); add(`${f}-${l}@${d}`); add(`${l}-${f}@${d}`);
  } else if (f) { add(`${f}@${d}`); add(`${fi}@${d}`); }
  else if (l) { add(`${l}@${d}`); add(`${li}@${d}`); }
  return NextResponse.json({ first, last, domain, permutations: [...new Set(p)], total: [...new Set(p)].length, timestamp: new Date().toISOString() });
}
