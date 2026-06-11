import { NextResponse } from 'next/server';
import { authenticateUser, bootstrapAdmin } from '@/lib/auth';

/**
 * POST /api/auth/login
 * Authenticates a user and returns a JWT.
 * Body: { username, password }
 */
export async function POST(request: Request) {
  try {
    bootstrapAdmin();

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const result = authenticateUser(username, password);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    return NextResponse.json({
      token: result.token,
      user: result.user,
    });
  } catch (e) {
    console.error('[AUTH] Login error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
