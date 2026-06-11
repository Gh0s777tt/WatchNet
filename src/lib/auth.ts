/**
 * ═══════════════════════════════════════════════════════════════
 *  OSIRIS — Authentication System
 *  JWT + password hashing via built-in Node.js crypto (zero deps)
 *  File-based JSON user store at /app/data/users/users.json
 * ═══════════════════════════════════════════════════════════════
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// ── Types ──

export type UserRole = 'viewer' | 'analyst' | 'admin';

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: UserRole;
  config: UserConfig;
  createdAt: string;
}

export interface UserConfig {
  activeLayers: Record<string, boolean>;
  panelStates: Record<string, boolean>;
  mapProjection: 'globe' | 'mercator';
  mapStyle: 'dark' | 'satellite';
  theme: Record<string, string>;
}

export interface AuthToken {
  sub: string;
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// ── Constants ──

const JWT_SECRET=*** || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRY = '7d';
const USERS_DIR = process.env.USERS_DIR || '/app/data/users';
const USERS_FILE = path.join(USERS_DIR, 'users.json');
const SALT_LEN = 32;
const KEY_LEN = 64;
const HASH_ALGO = 'sha512';

const DEFAULT_CONFIG: UserConfig = {
  activeLayers: {},
  panelStates: {},
  mapProjection: 'globe',
  mapStyle: 'dark',
  theme: {},
};

// ── Password Hashing (crypto.scryptSync — no bcrypt needed) ──

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(SALT_LEN).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEY_LEN).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const derived = crypto.scryptSync(password, salt, KEY_LEN).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(hash));
}

// ── JWT (HMAC-SHA256 via built-in crypto) ──

function base64url(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function base64urlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf8');
}

export function signJWT(payload: Omit<AuthToken, 'iat' | 'exp'>): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 7 * 24 * 60 * 60; // 7 days
  const tokenPayload: AuthToken = { ...payload, iat, exp };

  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(tokenPayload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

export function verifyJWT(token: string): AuthToken | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${parts[0]}.${parts[1]}`)
      .digest('base64url');

    // Constant-time comparison
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(parts[2]))) {
      return null;
    }

    const payload: AuthToken = JSON.parse(base64urlDecode(parts[1]));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

// ── User Store (JSON file) ──

function ensureUsersDir(): void {
  try {
    fs.mkdirSync(USERS_DIR, { recursive: true });
  } catch { /* dir exists */ }
}

function readUsers(): User[] {
  ensureUsersDir();
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeUsers(users: User[]): void {
  ensureUsersDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

export function findUserByUsername(username: string): User | undefined {
  return readUsers().find(u => u.username === username);
}

export function findUserByEmail(email: string): User | undefined {
  return readUsers().find(u => u.email === email);
}

export function findUserById(id: string): User | undefined {
  return readUsers().find(u => u.id === id);
}

export interface RegisterResult {
  success: boolean;
  user?: Omit<User, 'passwordHash' | 'salt'>;
  error?: string;
}

export function registerUser(username: string, email: string, password: string, role: UserRole = 'viewer'): RegisterResult {
  // Validation
  if (!username || username.length < 3) return { success: false, error: 'Username must be at least 3 characters' };
  if (!email || !email.includes('@')) return { success: false, error: 'Invalid email address' };
  if (!password || password.length < 6) return { success: false, error: 'Password must be at least 6 characters' };

  const users = readUsers();

  if (findUserByUsername(username)) return { success: false, error: 'Username already exists' };
  if (findUserByEmail(email)) return { success: false, error: 'Email already registered' };

  const { hash, salt } = hashPassword(password);
  const newUser: User = {
    id: crypto.randomUUID(),
    username,
    email,
    passwordHash: hash,
    salt,
    role,
    config: DEFAULT_CONFIG,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  writeUsers(users);

  const { passwordHash, salt: _, ...safeUser } = newUser;
  return { success: true, user: safeUser };
}

export interface LoginResult {
  success: boolean;
  token?: string;
  user?: Omit<User, 'passwordHash' | 'salt'>;
  error?: string;
}

export function authenticateUser(usernameOrEmail: string, password: string): LoginResult {
  const user = findUserByUsername(usernameOrEmail) || findUserByEmail(usernameOrEmail);
  if (!user) return { success: false, error: 'Invalid credentials' };

  if (!verifyPassword(password, user.passwordHash, user.salt)) {
    return { success: false, error: 'Invalid credentials' };
  }

  const token = signJWT({ sub: user.id, username: user.username, role: user.role });
  const { passwordHash, salt: _, ...safeUser } = user;
  return { success: true, token, user: safeUser };
}

export function getUserConfig(userId: string): UserConfig | null {
  const user = findUserById(userId);
  return user ? user.config : null;
}

export function saveUserConfig(userId: string, config: Partial<UserConfig>): boolean {
  const users = readUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return false;
  users[idx].config = { ...users[idx].config, ...config };
  writeUsers(users);
  return true;
}

export function updateUserRole(userId: string, role: UserRole): boolean {
  const users = readUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return false;
  users[idx].role = role;
  writeUsers(users);
  return true;
}

// ── Admin: List all users ──

export function listUsers(): Omit<User, 'passwordHash' | 'salt'>[] {
  return readUsers().map(({ passwordHash, salt: _, ...safe }) => safe);
}

// ── Bootstrap admin user (creates default admin if no users exist) ──

export function bootstrapAdmin(): void {
  const users = readUsers();
  if (users.length > 0) return;

  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const result = registerUser('admin', 'admin@osiris.local', adminPassword, 'admin');
  if (result.success) {
    console.log(`[AUTH] Bootstrap admin created: admin / ${adminPassword}`);
  }
}
