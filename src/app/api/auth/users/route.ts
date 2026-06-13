/**
 * ════════════════════════════════════════════════════════════════
 *  OSIRIS — Admin User Management API
 *  Admin-only: list all users and change their roles.
 *  Backs the User Management tab of the Admin Console.
 * ════════════════════════════════════════════════════════════════
 */

import { NextResponse } from 'next/server';
import {
  verifyJWT, getTokenFromRequest, listUsers, updateUserRole, findUserById,
  type UserRole,
} from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROLES: UserRole[] = ['viewer', 'analyst', 'admin'];

/** Resolve the caller and require the admin role. Returns the admin's id or an error response. */
function requireAdmin(request: Request): { ok: true; adminId: string } | { ok: false; res: NextResponse } {
  const token = getTokenFromRequest(request);
  if (!token) return { ok: false, res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const payload = verifyJWT(token);
  if (!payload) return { ok: false, res: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }) };
  if (payload.role !== 'admin') return { ok: false, res: NextResponse.json({ error: 'Admin access required' }, { status: 403 }) };
  return { ok: true, adminId: payload.sub };
}

/** GET /api/auth/users — list all users (admin only). */
export async function GET(request: Request) {
  const gate = requireAdmin(request);
  if (!gate.ok) return gate.res;
  return NextResponse.json({ users: listUsers() });
}

/** PATCH /api/auth/users — change a user's role (admin only). Body: { userId, role }. */
export async function PATCH(request: Request) {
  const gate = requireAdmin(request);
  if (!gate.ok) return gate.res;

  let body: { userId?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { userId, role } = body;
  if (!userId || !role) return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
  if (!ROLES.includes(role as UserRole)) {
    return NextResponse.json({ error: `role must be one of: ${ROLES.join(', ')}` }, { status: 400 });
  }
  if (!findUserById(userId)) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Guard against an admin demoting the last remaining admin (lockout protection).
  if (role !== 'admin') {
    const admins = listUsers().filter(u => u.role === 'admin');
    if (admins.length <= 1 && admins[0]?.id === userId) {
      return NextResponse.json({ error: 'Cannot remove the last admin' }, { status: 409 });
    }
  }

  const updated = updateUserRole(userId, role as UserRole);
  if (!updated) return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });

  return NextResponse.json({ success: true, users: listUsers() });
}
