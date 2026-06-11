import { NextResponse } from 'next/server';
import { verifyJWT, getTokenFromRequest, getUserConfig, saveUserConfig } from '@/lib/auth';

/**
 * GET /api/auth/config
 * Returns the current user's panel configuration.
 * PUT /api/auth/config
 * Updates the current user's panel configuration.
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

    const config = getUserConfig(payload.sub);
    if (!config) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ config });
  } catch (e) {
    console.error('[AUTH] Config GET error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/auth/config
 */
export async function PUT(request: Request) {
  try {
    const tokenStr = getTokenFromRequest(request);
    if (!tokenStr) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const payload = verifyJWT(tokenStr);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const body = await request.json();
    const success = saveUserConfig(payload.sub, body);

    if (!success) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const config = getUserConfig(payload.sub);
    return NextResponse.json({ config });
  } catch (e) {
    console.error('[AUTH] Config PUT error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
