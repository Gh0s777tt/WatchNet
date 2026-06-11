import { NextResponse } from 'next/server';
import { registerUser, bootstrapAdmin } from '@/lib/auth';

/**
 * POST /api/auth/register
 * Creates a new user account. First user auto-becomes admin.
 * Body: { username, email, password }
 */
export async function POST(request: Request) {
  try {
    // Bootstrap admin on first-ever registration
    bootstrapAdmin();

    const body = await request.json();
    const { username, email, password } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email, and password are required' },
        { status: 400 }
      );
    }

    const result = registerUser(username, email, password);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 409 }
      );
    }

    return NextResponse.json({ user: result.user }, { status: 201 });
  } catch (e) {
    console.error('[AUTH] Register error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
