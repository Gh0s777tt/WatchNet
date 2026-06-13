'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Shield, Settings, ChevronDown } from 'lucide-react';
import { useAuth, type UserRole } from './AuthProvider';

const ROLE_COLORS: Record<UserRole, string> = {
  viewer: '#00E676',
  analyst: '#4FC3F7',
  admin: '#FF3D3D',
};

const ROLE_BADGES: Record<UserRole, string> = {
  viewer: 'V',
  analyst: 'A',
  admin: 'ADMIN',
};

export default function UserMenu({ onOpenLogin, onOpenAdmin }: { onOpenLogin: () => void; onOpenAdmin?: () => void }) {
  const { user, logout, hasRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  if (!user) {
    return (
      <button
        onClick={onOpenLogin}
        className="pointer-events-auto glass-panel px-2 py-1 flex items-center gap-1.5 text-[8px] font-mono tracking-widest hover:border-[var(--gold-primary)]/40 transition-all border-white/5"
      >
        <User className="w-2.5 h-2.5 text-[var(--gold-primary)]" />
        <span className="text-[var(--gold-primary)] font-bold">LOGIN</span>
      </button>
    );
  }

  return (
    <div ref={menuRef} className="relative pointer-events-auto">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass-panel px-2 py-1 flex items-center gap-1.5 text-[8px] font-mono tracking-widest hover:border-[var(--gold-primary)]/40 transition-all border-white/5"
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: ROLE_COLORS[user.role] }}
        />
        <span className="text-white/80 font-bold truncate max-w-[60px]">{user.username}</span>
        <span
          className="px-1 rounded text-[7px] font-bold"
          style={{ backgroundColor: `${ROLE_COLORS[user.role]}20`, color: ROLE_COLORS[user.role] }}
        >
          {ROLE_BADGES[user.role]}
        </span>
        <ChevronDown className={`w-2 h-2 text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 right-0 min-w-[180px]"
          >
            <div className="glass-panel p-2 border-white/10">
              {/* User info */}
              <div className="px-2 py-1.5 border-b border-white/5 mb-1">
                <div className="text-[9px] font-mono text-white/80 font-bold">{user.username}</div>
                <div className="text-[7px] font-mono text-[var(--text-muted)] truncate">{user.email}</div>
                <div className="flex items-center gap-1 mt-1">
                  <span
                    className="text-[7px] font-mono font-bold px-1 rounded"
                    style={{ backgroundColor: `${ROLE_COLORS[user.role]}20`, color: ROLE_COLORS[user.role] }}
                  >
                    {user.role.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Admin panel link */}
              {hasRole('admin') && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenAdmin?.();
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-[8px] font-mono text-white/60 hover:text-white/80 hover:bg-white/5 rounded transition-colors"
                >
                  <Shield className="w-2.5 h-2.5" />
                  ADMIN PANEL
                </button>
              )}

              {/* Logout */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[8px] font-mono text-[var(--alert-red)]/80 hover:text-[var(--alert-red)] hover:bg-white/5 rounded transition-colors"
              >
                <LogOut className="w-2.5 h-2.5" />
                LOGOUT
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
