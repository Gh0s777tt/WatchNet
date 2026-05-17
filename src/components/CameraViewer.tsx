'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, RefreshCw, MapPin, Camera, Maximize2 } from 'lucide-react';

interface CameraViewerProps {
  camera: any | null;
  onClose: () => void;
  onLocate?: (lat: number, lng: number) => void;
}

export default function CameraViewer({ camera, onClose, onLocate }: CameraViewerProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!camera) return;
    setLoading(true);
    setError(false);
    // Add cache-busting for live feeds
    const url = camera.feed_url?.includes('?')
      ? `${camera.feed_url}&_t=${Date.now()}`
      : `${camera.feed_url}?_t=${Date.now()}`;
    setImageUrl(url);
  }, [camera, refreshKey]);

  // Auto-refresh every 10 seconds for live feeds
  useEffect(() => {
    if (!camera) return;
    const iv = setInterval(() => setRefreshKey(k => k + 1), 30000); // 30s (was 10s)
    return () => clearInterval(iv);
  }, [camera]);

  if (!camera) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className={`fixed z-[500] ${
          fullscreen 
            ? 'inset-2 md:inset-4' 
            : 'bottom-[70px] left-2 right-2 md:bottom-6 md:right-6 md:left-auto md:w-[420px]'
        }`}
      >
        <div className="glass-panel osiris-glow overflow-hidden h-full flex flex-col" style={{ borderColor: 'rgba(57, 255, 20, 0.3)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 border-b border-[var(--border-secondary)]">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-2 h-2 rounded-full bg-[#39FF14] animate-osiris-pulse flex-shrink-0" />
              <Camera className="w-3.5 h-3.5 text-[#39FF14] flex-shrink-0" />
              <div className="min-w-0">
                <h3 className="text-[10px] md:text-[11px] font-mono font-bold text-[#39FF14] tracking-wider truncate">{camera.name}</h3>
                <p className="text-[6px] md:text-[7px] font-mono text-[var(--text-muted)]">{camera.city}, {camera.country} · {camera.source}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => setRefreshKey(k => k + 1)} className="p-1.5 rounded hover:bg-[var(--hover-accent)] transition-colors" title="Refresh feed">
                <RefreshCw className="w-3 h-3 text-[var(--text-muted)] hover:text-[#39FF14]" />
              </button>
              {camera.lat && camera.lng && (
                <button onClick={() => onLocate?.(camera.lat, camera.lng)} className="p-1.5 rounded hover:bg-[var(--hover-accent)] transition-colors" title="Fly to location">
                  <MapPin className="w-3 h-3 text-[var(--text-muted)] hover:text-[var(--gold-primary)]" />
                </button>
              )}
              <button onClick={() => setFullscreen(!fullscreen)} className="hidden md:block p-1.5 rounded hover:bg-[var(--hover-accent)] transition-colors" title="Toggle fullscreen">
                <Maximize2 className="w-3 h-3 text-[var(--text-muted)]" />
              </button>
              <button onClick={onClose} className="p-1.5 rounded hover:bg-red-900/30 transition-colors">
                <X className="w-4 h-4 md:w-3 md:h-3 text-[var(--text-muted)] hover:text-red-400" />
              </button>
            </div>
          </div>

          {/* Camera Feed */}
          <div className={`relative bg-black ${fullscreen ? 'flex-1' : 'aspect-video max-h-[35vh] md:max-h-none'}`}>
            {loading && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                <div className="text-center">
                  <div className="w-6 h-6 border-2 border-[#39FF14] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span className="text-[8px] font-mono text-[#39FF14] tracking-widest">CONNECTING TO FEED...</span>
                </div>
              </div>
            )}

            {error ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90">
                <div className="text-center">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center mb-2"><Camera className="w-4 h-4 text-red-400" /></div>
                  <span className="text-[9px] font-mono text-red-400 tracking-widest block mb-1">FEED UNAVAILABLE</span>
                  <span className="text-[7px] font-mono text-[var(--text-muted)]">Camera may be offline or restricted</span>
                  <button onClick={() => { setError(false); setRefreshKey(k => k + 1); }} className="block mx-auto mt-3 px-3 py-1 text-[8px] font-mono text-[#39FF14] border border-[#39FF14]/30 rounded hover:bg-[#39FF14]/10 transition-colors tracking-wider">
                    RETRY
                  </button>
                </div>
              </div>
            ) : imageUrl ? (
              <img
                key={refreshKey}
                src={imageUrl}
                alt={camera.name}
                className={`w-full ${fullscreen ? 'h-full object-contain' : 'h-full object-cover'}`}
                onLoad={() => setLoading(false)}
                onError={() => { setLoading(false); setError(true); }}
              />
            ) : null}

            {/* Live indicator */}
            {!error && !loading && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2 py-1 rounded">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-osiris-pulse" />
                <span className="text-[7px] font-mono text-white tracking-widest">LIVE</span>
              </div>
            )}

            {/* Timestamp */}
            {!error && !loading && (
              <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded">
                <span className="text-[7px] font-mono text-[var(--text-muted)]">{new Date().toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          {/* Footer with coords + links */}
          <div className="px-3 md:px-4 py-2 border-t border-[var(--border-secondary)] flex items-center justify-between">
            <div className="text-[7px] md:text-[8px] font-mono text-[var(--text-muted)]">
              {camera.lat?.toFixed(4)}, {camera.lng?.toFixed(4)}
            </div>
            <div className="flex gap-2">
              {camera.feed_url && (
                <a href={camera.feed_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[7px] font-mono text-[#39FF14] hover:underline tracking-wider">
                  <ExternalLink className="w-2.5 h-2.5" /> FEED
                </a>
              )}
              <a href={`https://www.google.com/maps/@${camera.lat},${camera.lng},17z`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[7px] font-mono text-[var(--cyan-primary)] hover:underline tracking-wider">
                <MapPin className="w-2.5 h-2.5" /> MAP
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
