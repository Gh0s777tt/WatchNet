'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type UserRole = 'viewer' | 'analyst' | 'admin';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  config: {
    activeLayers: Record<string, boolean>;
    panelStates: Record<string, boolean>;
    mapProjection: 'globe' | 'mercator';
    mapStyle: 'dark' | 'satellite';
    theme: Record<string, string>;
  };
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateConfig: (config: Partial<User['config']>) => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: () => {},
  updateConfig: async () => {},
  hasRole: () => false,
});

const TOKEN_KEY = 'osiris_auth_token';
const USER_KEY = 'osiris_auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedToken && savedUser) {
      try {
        // Verify token is still valid by hitting /api/auth/me
        fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${savedToken}` },
        }).then(res => {
          if (res.ok) {
            res.json().then(d => {
              setUser(d.user);
              setToken(savedToken);
            });
          } else {
            // Token expired — clear
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
          }
        }).catch(() => {
          // Offline — use cached user
          setUser(JSON.parse(savedUser));
          setToken(savedToken);
        });
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Login failed' };

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Network error — unable to reach server' };
    }
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Registration failed' };

      // Auto-login after registration
      return await login(username, password);
    } catch (e) {
      return { success: false, error: 'Network error — unable to reach server' };
    }
  }, [login]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  const updateConfig = useCallback(async (config: Partial<User['config']>) => {
    if (!token || !user) return;
    try {
      const res = await fetch('/api/auth/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(prev => prev ? { ...prev, config: data.config } : null);
      }
    } catch {
      // Silent fail — config is non-critical
    }
  }, [token, user]);

  const hasRole = useCallback((...roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateConfig, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
