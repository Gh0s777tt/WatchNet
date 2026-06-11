import { NextResponse } from 'next/server';
import { verifyJWT, getTokenFromRequest, findUserById } from '@/lib/auth';

/**
 * GET /api/auth/me
 * Returns the current user from the JWT token.
 * Requires Authorization: Bearer <token> header.
 */
export async function GET(request: Request) {
  try {
    const tokenStr = getTokenFromRequest(request);
    if (!tokenStr) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const payload = verifyJWT(tokenStr);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const user = findUserById(payload.sub);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { passwordHash, salt, ...safeUser } = user;
    return NextResponse.json({ user: safeUser });
  } catch (e) {
    console.error('[AUTH] Me error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
