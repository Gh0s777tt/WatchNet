'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, X, Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = mode === 'login'
        ? await login(username, password)
        : await register(username, email, password);

      if (result.success) {
        onClose();
        setUsername('');
        setPassword('');
        setEmail('');
      } else {
        setError(result.error || 'Operation failed');
      }
    } catch {
      setError('Unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(m => m === 'login' ? 'register' : 'login');
    setError('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-[360px] max-w-[90vw]"
          >
            <div className="glass-panel p-6 border-[var(--gold-primary)]/30" style={{ boxShadow: '0 0 40px rgba(212, 175, 55, 0.1), 0 0 80px rgba(0, 0, 0, 0.5)' }}>
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 text-white/30 hover:text-white/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-[var(--gold-primary)]/10 border border-[var(--gold-primary)]/30 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[var(--gold-primary)]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold font-mono tracking-wider text-[var(--gold-primary)]">
                    {mode === 'login' ? 'AUTHENTICATE' : 'REGISTER'}
                  </h2>
                  <p className="text-[9px] font-mono text-[var(--text-muted)] tracking-wider">
                    OSIRIS ACCESS CONTROL
                  </p>
                </div>
              </div>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-4 flex items-center gap-2 p-3 rounded bg-[var(--alert-red)]/10 border border-[var(--alert-red)]/30 text-[10px] font-mono text-[var(--alert-red)]"
                >
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-[9px] font-mono text-[var(--text-muted)] tracking-wider block mb-1">USERNAME</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-[11px] font-mono text-white/80 focus:outline-none focus:border-[var(--gold-primary)]/50 transition-colors"
                    placeholder="Enter username"
                    required
                    minLength={3}
                    autoComplete="username"
                  />
                </div>

                {mode === 'register' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <label className="text-[9px] font-mono text-[var(--text-muted)] tracking-wider block mb-1">EMAIL</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-[11px] font-mono text-white/80 focus:outline-none focus:border-[var(--gold-primary)]/50 transition-colors"
                      placeholder="Enter email address"
                      required
                      autoComplete="email"
                    />
                  </motion.div>
                )}

                <div>
                  <label className="text-[9px] font-mono text-[var(--text-muted)] tracking-wider block mb-1">PASSWORD</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-[11px] font-mono text-white/80 focus:outline-none focus:border-[var(--gold-primary)]/50 transition-colors pr-8"
                      placeholder="Enter password"
                      required
                      minLength={6}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-[var(--gold-primary)]/10 hover:bg-[var(--gold-primary)]/20 border border-[var(--gold-primary)]/30 rounded py-2.5 text-[11px] font-mono font-bold text-[var(--gold-primary)] tracking-wider transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <span className="w-3 h-3 border border-[var(--gold-primary)] border-t-transparent rounded-full animate-spin" />
                  ) : mode === 'login' ? (
                    <><LogIn className="w-3 h-3" /> AUTHENTICATE</>
                  ) : (
                    <><UserPlus className="w-3 h-3" /> CREATE ACCOUNT</>
                  )}
                </button>
              </form>

              {/* Toggle mode */}
              <div className="mt-4 text-center">
                <button
                  onClick={switchMode}
                  className="text-[9px] font-mono text-[var(--text-muted)] hover:text-[var(--gold-primary)] transition-colors tracking-wider"
                >
                  {mode === 'login' ? 'NO ACCOUNT? REGISTER →' : 'ALREADY HAVE AN ACCOUNT? LOG IN →'}
                </button>
              </div>

              {/* Role info */}
              <div className="mt-4 pt-3 border-t border-white/5">
                <p className="text-[8px] font-mono text-[var(--text-muted)]/50 text-center tracking-wider">
                  ROLES: VIEWER (read-only) · ANALYST (full tools) · ADMIN (user management)
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
