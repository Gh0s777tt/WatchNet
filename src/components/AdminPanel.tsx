'use client';

/**
 * ═══════════════════════════════════════════════════════════════
 *  OSIRIS — Admin Console
 *  Admin-only panel with two capabilities:
 *
 *   1. User Management — list every account and change role tiers
 *      (viewer / analyst / admin) via /api/auth/users.
 *
 *   2. Live Ontology Builder — manual link-analysis against the
 *      SERVER ontology (/api/ontology/entities). Unlike the per-user
 *      Personal Graph (localStorage), this writes to the shared,
 *      process-wide store, so an admin can build and reshape the
 *      ontology on the fly and have it apply to the already-running
 *      system for every user. Reuses the LinkEditorGraph canvas.
 * ═══════════════════════════════════════════════════════════════
 */

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import {
  X, Shield, Users, Network, Plus, RefreshCw, Loader2, Zap, Radio,
} from 'lucide-react';
import { useAuth, type UserRole } from './AuthProvider';
import {
  PersonalEntity, PersonalRelationship, PersonalEntityType,
  PERSONAL_TYPE_COLORS, PERSONAL_TYPE_LABELS, generateEntityId,
} from '@/lib/personal-ontology';

const LinkEditorGraph = dynamic(() => import('./LinkEditorGraph'), { ssr: false });

type AdminTab = 'users' | 'ontology';

const ROLES: UserRole[] = ['viewer', 'analyst', 'admin'];
const ROLE_COLORS: Record<UserRole, string> = { viewer: '#00E676', analyst: '#4FC3F7', admin: '#FF3D3D' };

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

interface Props {
  show: boolean;
  onClose: () => void;
}

export default function AdminPanel({ show, onClose }: Props) {
  const { token, user, hasRole } = useAuth();
  const [tab, setTab] = useState<AdminTab>('users');

  if (!show) return null;
  // Hard gate — never render admin tooling for non-admins.
  if (!hasRole('admin')) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[450] flex flex-col"
      style={{ background: 'radial-gradient(ellipse at center, #0a0a14 0%, #050508 100%)' }}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/40">
        <div className="flex items-center gap-3">
          <Shield className="w-4 h-4 text-[#FF3D3D]" />
          <span className="text-[12px] font-mono font-bold tracking-[0.2em] text-[#FF3D3D]">ADMIN CONSOLE</span>
          <span className="text-[9px] font-mono text-white/40">SIGNED IN AS {user?.username?.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded overflow-hidden border border-white/10">
            <button onClick={() => setTab('users')}
              className="flex items-center gap-1 px-2 py-1 text-[8px] font-mono transition-colors"
              style={{
                backgroundColor: tab === 'users' ? 'rgba(255,61,61,0.15)' : 'rgba(255,255,255,0.03)',
                color: tab === 'users' ? '#FF3D3D' : 'rgba(255,255,255,0.5)',
              }}>
              <Users className="w-3 h-3" /> USERS
            </button>
            <button onClick={() => setTab('ontology')}
              className="flex items-center gap-1 px-2 py-1 text-[8px] font-mono transition-colors"
              style={{
                backgroundColor: tab === 'ontology' ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.03)',
                color: tab === 'ontology' ? '#00E5FF' : 'rgba(255,255,255,0.5)',
              }}>
              <Network className="w-3 h-3" /> ONTOLOGY BUILDER
            </button>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#FF1744]/20 rounded transition-colors">
            <X className="w-4 h-4 text-[#FF1744]" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {tab === 'users' ? <UsersTab token={token} /> : <OntologyTab token={token} />}
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════
//  USER MANAGEMENT TAB
// ════════════════════════════════════════════════════════════════
function UsersTab({ token }: { token: string | null }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/auth/users', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setUsers(data.users || []);
      else setError(data.error || 'Failed to load users');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const changeRole = useCallback(async (userId: string, role: UserRole) => {
    if (!token) return;
    setSavingId(userId); setError(null);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (res.ok) setUsers(data.users || []);
      else setError(data.error || 'Failed to update role');
    } catch {
      setError('Network error');
    } finally {
      setSavingId(null);
    }
  }, [token]);

  return (
    <div className="h-full overflow-y-auto styled-scrollbar p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold text-white/80 tracking-wider">USER ACCOUNTS</span>
          <span className="text-[9px] font-mono text-white/40">{users.length} TOTAL</span>
        </div>
        <button onClick={load} className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-mono text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors">
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> REFRESH
        </button>
      </div>

      {error && (
        <div className="mb-2 px-3 py-1.5 rounded bg-[#FF1744]/15 border border-[#FF1744]/30">
          <span className="text-[8px] font-mono text-[#FF1744]">{error}</span>
        </div>
      )}

      <div className="rounded border border-white/10 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-white/5 text-[8px] font-mono text-white/40 uppercase tracking-wider">
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                <td className="px-3 py-2 text-[10px] font-mono text-white/90 font-bold">{u.username}</td>
                <td className="px-3 py-2 text-[9px] font-mono text-white/50">{u.email}</td>
                <td className="px-3 py-2 text-[8px] font-mono text-white/40">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <select
                      value={u.role}
                      disabled={savingId === u.id}
                      onChange={e => changeRole(u.id, e.target.value as UserRole)}
                      className="bg-black/50 text-[9px] font-mono px-2 py-1 rounded border outline-none cursor-pointer"
                      style={{ color: ROLE_COLORS[u.role], borderColor: `${ROLE_COLORS[u.role]}40` }}
                    >
                      {ROLES.map(r => <option key={r} value={r} style={{ color: '#fff', background: '#0a0a09' }}>{r.toUpperCase()}</option>)}
                    </select>
                    {savingId === u.id && <Loader2 className="w-3 h-3 text-white/40 animate-spin" />}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && !loading && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-[9px] font-mono text-white/30">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[8px] font-mono text-white/30 leading-relaxed">
        Role tiers: <span style={{ color: ROLE_COLORS.viewer }}>VIEWER</span> (read-only),{' '}
        <span style={{ color: ROLE_COLORS.analyst }}>ANALYST</span> (full investigation tools),{' '}
        <span style={{ color: ROLE_COLORS.admin }}>ADMIN</span> (user management + ontology control).
        Changes take effect on the user's next request.
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  LIVE ONTOLOGY BUILDER TAB
// ════════════════════════════════════════════════════════════════
function OntologyTab({ token }: { token: string | null }) {
  const [entities, setEntities] = useState<PersonalEntity[]>([]);
  const [relationships, setRelationships] = useState<PersonalRelationship[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const authHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [token]);

  // Pull the live server graph.
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/ontology/entities?graph=true');
      const data = await res.json();
      if (res.ok) {
        setEntities(data.entities || []);
        setRelationships(data.relationships || []);
      } else setError(data.error || 'Failed to load ontology');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Draw a relationship on the live server store, then reflect locally.
  const handleConnect = useCallback(async (sourceId: string, targetId: string) => {
    setBusy('relate'); setError(null);
    try {
      const res = await fetch('/api/ontology/entities', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'relate', sourceId, targetId, label: 'linked_to', strength: 1 }),
      });
      const data = await res.json();
      if (res.ok && data.relationship) setRelationships(prev => [...prev, data.relationship]);
      else setError(data.error || 'Failed to create link');
    } catch { setError('Network error'); }
    finally { setBusy(null); }
  }, [authHeaders]);

  const handleDeleteRelationship = useCallback(async (id: string) => {
    setRelationships(prev => prev.filter(r => r.id !== id));
    try {
      await fetch(`/api/ontology/entities?relId=${encodeURIComponent(id)}`, { method: 'DELETE', headers: authHeaders() });
    } catch { /* optimistic */ }
  }, [authHeaders]);

  const handleDeleteEntity = useCallback(async (id: string) => {
    setEntities(prev => prev.filter(e => e.id !== id));
    setRelationships(prev => prev.filter(r => r.sourceId !== id && r.targetId !== id));
    try {
      await fetch(`/api/ontology/entities?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: authHeaders() });
    } catch { /* optimistic */ }
  }, [authHeaders]);

  // Layout is local-only (server store has no layout column) — keep it in state.
  const handleMoveEntity = useCallback((id: string, pos: { x: number; y: number }) => {
    setEntities(prev => prev.map(e => (e.id === id ? { ...e, graphPos: pos } : e)));
  }, []);

  const handleSelectEntity = useCallback(() => { /* selection highlight handled inside canvas */ }, []);

  const addEntity = useCallback(async (type: PersonalEntityType, label: string, description: string) => {
    setBusy('upsert'); setError(null);
    const entity = {
      id: generateEntityId(type),
      type, label, description,
      properties: {}, tags: [], source: 'admin',
    };
    try {
      const res = await fetch('/api/ontology/entities', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ action: 'upsert', entity }),
      });
      const data = await res.json();
      if (res.ok && data.entity) {
        setEntities(prev => [...prev, data.entity]);
        setShowAdd(false);
      } else setError(data.error || 'Failed to add entity');
    } catch { setError('Network error'); }
    finally { setBusy(null); }
  }, [authHeaders]);

  const runCrossReference = useCallback(async () => {
    setBusy('cross-reference'); setError(null);
    try {
      const res = await fetch('/api/ontology/entities', {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ action: 'cross-reference' }),
      });
      const data = await res.json();
      if (res.ok) await load();
      else setError(data.error || 'Cross-reference failed');
    } catch { setError('Network error'); }
    finally { setBusy(null); }
  }, [authHeaders, load]);

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-black/20">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#00E5FF]/10 border border-[#00E5FF]/25">
          <Radio className="w-3 h-3 text-[#00E5FF] animate-pulse" />
          <span className="text-[8px] font-mono text-[#00E5FF]">LIVE · WRITES TO RUNNING SYSTEM</span>
        </div>
        <span className="text-[9px] font-mono text-white/40">{entities.length} NODES · {relationships.length} LINKS</span>
        <div className="flex-1" />
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-mono"
          style={{ backgroundColor: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}>
          <Plus className="w-3 h-3" /> ADD ENTITY
        </button>
        <button onClick={runCrossReference} disabled={!!busy}
          className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-mono text-[#B388FF] bg-[#B388FF]/10 border border-[#B388FF]/25 disabled:opacity-40">
          {busy === 'cross-reference' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />} AUTO-LINK
        </button>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1 px-2 py-1 rounded text-[8px] font-mono text-white/60 hover:text-white bg-white/5 hover:bg-white/10">
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> REFRESH
        </button>
      </div>

      {error && (
        <div className="px-4 py-1.5 bg-[#FF1744]/15 border-b border-[#FF1744]/30">
          <span className="text-[8px] font-mono text-[#FF1744]">{error}</span>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 min-h-0 relative">
        <LinkEditorGraph
          entities={entities}
          relationships={relationships}
          onConnect={handleConnect}
          onDeleteRelationship={handleDeleteRelationship}
          onDeleteEntity={handleDeleteEntity}
          onMoveEntity={handleMoveEntity}
          onSelectEntity={handleSelectEntity}
        />
      </div>

      {showAdd && <AddEntityForm busy={busy === 'upsert'} onAdd={addEntity} onClose={() => setShowAdd(false)} />}
    </div>
  );
}

// ── Compact add-entity form for the ontology builder ──
function AddEntityForm({ busy, onAdd, onClose }: {
  busy: boolean;
  onAdd: (type: PersonalEntityType, label: string, description: string) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<PersonalEntityType>('person');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }}
        className="w-[420px] rounded-xl border border-white/10 bg-[#0a0a09] p-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-mono font-bold text-[#D4AF37] tracking-wider">ADD ONTOLOGY ENTITY</span>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {(Object.entries(PERSONAL_TYPE_COLORS) as [PersonalEntityType, string][]).map(([t, c]) => (
            <button key={t} onClick={() => setType(t)}
              className="px-2 py-1 rounded text-[8px] font-mono transition-colors"
              style={{
                backgroundColor: type === t ? `${c}20` : 'rgba(255,255,255,0.03)',
                color: type === t ? c : 'rgba(255,255,255,0.5)',
                border: `1px solid ${type === t ? `${c}40` : 'rgba(255,255,255,0.1)'}`,
              }}>
              {PERSONAL_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <input value={label} onChange={e => setLabel(e.target.value)} autoFocus
          placeholder={`${PERSONAL_TYPE_LABELS[type]} NAME / IDENTIFIER *`}
          className="w-full bg-black/40 text-[9px] font-mono text-white px-2 py-1.5 rounded outline-none border border-white/10 focus:border-[#D4AF37] mb-1.5" />
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
          placeholder="DESCRIPTION (OPTIONAL)"
          className="w-full bg-black/40 text-[8px] font-mono text-white/70 px-2 py-1.5 rounded outline-none border border-white/10 resize-none mb-2" />

        <button onClick={() => label.trim() && onAdd(type, label.trim(), description.trim())}
          disabled={!label.trim() || busy}
          className="w-full py-2 rounded text-[9px] font-mono font-bold transition-colors disabled:opacity-30 flex items-center justify-center gap-1.5"
          style={{ backgroundColor: 'rgba(212,175,55,0.15)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)' }}>
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} ADD TO LIVE ONTOLOGY
        </button>
      </motion.div>
    </motion.div>
  );
}
