'use client';

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane, Satellite, Activity, Sun, AlertTriangle, Camera, Flame, Target,
  CloudLightning, Radiation, Tv, Anchor, Ship, Newspaper,
  Network, Share2, Radio, Server, Shield, Flag, BookOpen,
  Building2, Castle, Leaf, Ghost, Gauge, RadioTower, Wind,
  X
} from 'lucide-react';

interface LayerPanelProps {
  data: any;
  activeLayers: any;
  setActiveLayers: React.Dispatch<React.SetStateAction<any>>;
  isMobile?: boolean;
  onClose?: () => void;
}

const LAYER_GROUPS = [
  {
    label: 'SDK',
    fullLabel: 'OSIRIS SDK',
    color: '#1565C0',
    layers: [
      { key: 'sdk_sea', label: 'Linee Marittime', icon: Anchor, color: '#4FC3F7', dataKey: 'sdk_entities' },
      { key: 'sdk_ransomware', label: 'Flusso Ransomware', icon: AlertTriangle, color: '#FF3D3D', dataKey: 'sdk_entities' },
      { key: 'tor_nodes', label: 'Nodi Tor', icon: Network, color: '#E040FB', dataKey: 'tor_exit_nodes' },
    ],
  },
  {
    label: 'AVIAZIONE',
    fullLabel: 'AVIAZIONE',
    color: '#00E5FF',
    layers: [
      { key: 'flights', label: 'Commerciali', icon: Plane, color: '#00E5FF', dataKey: 'commercial_flights' },
      { key: 'private', label: 'Privati', icon: Plane, color: '#00E676', dataKey: 'private_flights' },
      { key: 'jets', label: 'Jet Privati', icon: Plane, color: '#FF69B4', dataKey: 'private_jets' },
      { key: 'military', label: 'Militari', icon: Shield, color: '#FF3D3D', dataKey: 'military_flights' },
      { key: 'airports', label: 'Aeroporti', icon: Flag, color: '#FFD700', dataKey: 'airports' },
    ],
  },
  {
    label: 'MARITTIMO',
    fullLabel: 'MARITTIMO & SPAZIO',
    color: '#00BCD4',
    layers: [
      { key: 'maritime', label: 'Marittimo / Navale', icon: Ship, color: '#00BCD4', dataKey: 'maritime_ships,maritime_ports,maritime_chokepoints' },
      { key: 'cables', label: 'Cavi Sottomarini', icon: Share2, color: '#4FC3F7', dataKey: 'submarine_cables' },
      { key: 'satellites', label: 'Satelliti', icon: Satellite, color: '#D4AF37', dataKey: 'satellites' },
      { key: 'maritime_routes', label: 'Rotte Marittime', icon: Ship, color: '#00ACC1', dataKey: 'maritime_routes' },
      { key: 'shipwrecks', label: 'Relitti', icon: Ship, color: '#607D8B', dataKey: 'shipwrecks' },
    ],
  },
  {
    label: 'SORVEGLIANZA',
    fullLabel: 'SORVEGLIANZA',
    color: '#39FF14',
    layers: [
      { key: 'cctv', label: 'Telecamere CCTV', icon: Camera, color: '#39FF14', dataKey: 'cameras' },
      { key: 'live_news', label: 'Flussi Notizie Live', icon: Tv, color: '#FF4081', dataKey: 'live_feeds' },
    ],
  },
  {
    label: 'RISCHI',
    fullLabel: 'RISCHI NATURALI',
    color: '#FF9500',
    layers: [
      { key: 'earthquakes', label: 'Terremoti (24h)', icon: Activity, color: '#FF9500', dataKey: 'earthquakes' },
      { key: 'fires', label: 'Incendi Attivi', icon: Flame, color: '#FF6B00', dataKey: 'fires' },
      { key: 'weather', label: 'Maltempo', icon: CloudLightning, color: '#E040FB', dataKey: 'weather_events' },
      { key: 'volcanoes', label: 'Vulcani', icon: Flame, color: '#FF4500', dataKey: 'volcanoes' },
      { key: 'weather_alerts', label: 'Allerte Meteo', icon: CloudLightning, color: '#FFB300', dataKey: 'alerts' },
      { key: 'natural_disasters', label: 'Disastri Naturali', icon: AlertTriangle, color: '#FF3D3D', dataKey: 'disasters' },
      { key: 'wikipedia_geo', label: 'Wikipedia Geo', icon: BookOpen, color: '#9C27B0', dataKey: 'wikipedia_articles' },
      { key: 'meteorites', label: 'Meteoriti', icon: Flame, color: '#FF6F00', dataKey: 'meteorites' },
      { key: 'fault_lines', label: 'Faglie Sismiche', icon: Activity, color: '#8D6E63', dataKey: 'fault_lines' },
    ],
  },
  {
    label: 'MINACCE',
    fullLabel: 'MINACCE & INFRASTRUTTURE',
    color: '#FF3D3D',
    layers: [
      { key: 'infrastructure', label: 'Impianti Nucleari', icon: Radiation, color: '#76FF03', dataKey: 'infrastructure' },
      { key: 'global_incidents', label: 'Incidenti Globali', icon: AlertTriangle, color: '#FF3D3D', dataKey: 'gdelt' },
      { key: 'gps_jamming', label: 'Disturbo GPS', icon: Radio, color: '#FF4444', dataKey: 'gps_jamming' },
      { key: 'datacenters', label: 'Data Center', icon: Server, color: '#00E5FF', dataKey: 'datacenters' },
      { key: 'ixps', label: 'Internet Exchange', icon: Network, color: '#448AFF', dataKey: 'ixps' },
      { key: 'military_bases', label: 'Basi Militari', icon: Shield, color: '#4CAF50', dataKey: 'military_bases' },
      { key: 'embassies', label: 'Ambasciate', icon: Flag, color: '#FFD700', dataKey: 'embassies' },
      { key: 'power_plants', label: 'Centrali Elettriche', icon: Gauge, color: '#76FF03', dataKey: 'power_plants' },
      { key: 'radio_towers', label: 'Torri Radio', icon: RadioTower, color: '#FF6F00', dataKey: 'radio_towers' },
      { key: 'nuclear_facilities', label: 'Impianti Nucleari', icon: Radiation, color: '#FF1744', dataKey: 'nuclear_facilities' },
    ],
  },
  {
    label: 'ANOMALIE',
    fullLabel: 'ANOMALIE & MISTERI',
    color: '#9400D3',
    layers: [
      { key: 'underground_bases', label: 'Basi Sotterranee', icon: Building2, color: '#8B0000', dataKey: 'underground_bases' },
      { key: 'underground_cities', label: 'Città Sotterranee', icon: Castle, color: '#8B4513', dataKey: 'underground_cities' },
      { key: 'crop_circles', label: 'Cerchi nel Grano', icon: Leaf, color: '#90EE90', dataKey: 'crop_circles' },
      { key: 'mystery_locations', label: 'Luoghi Misteriosi', icon: Ghost, color: '#9400D3', dataKey: 'mystery_locations' },
      { key: 'ufo_reports', label: 'Avvistamenti UFO', icon: Ghost, color: '#7B1FA2', dataKey: 'ufo_reports' },
      { key: 'mines', label: 'Miniere', icon: Building2, color: '#FF6B00', dataKey: 'mines' },
      { key: 'pyramids', label: 'Piramidi', icon: Building2, color: '#FFD700', dataKey: 'pyramids' },
      { key: 'caves', label: 'Grotte/Caverne', icon: Building2, color: '#4FC3F7', dataKey: 'caves' },
      { key: 'lost_cities', label: 'Città Perdute', icon: Castle, color: '#FF9500', dataKey: 'lost_cities' },
      { key: 'antarctica_anomalies', label: 'Anomalie Antartide', icon: Ghost, color: '#00E5FF', dataKey: 'antarctica_anomalies' },
    ],
  },
  {
    label: 'DISPLAY',
    fullLabel: 'DISPLAY',
    color: '#448AFF',
    layers: [
      { key: 'day_night', label: 'Ciclo Giorno/Notte', icon: Sun, color: '#448AFF', dataKey: '' },
    ],
  },
  {
    label: 'ITALIA',
    fullLabel: 'ITALIA',
    color: '#008C45',
    layers: [
      { key: 'italy_cameras', label: 'Telecamere Italia', icon: Camera, color: '#FFD700', dataKey: 'italy_cameras' },
      { key: 'bluetooth_devices', label: 'Dispositivi Bluetooth', icon: Radio, color: '#00BFFF', dataKey: 'bluetooth_devices' },
      { key: 'network_devices', label: 'Dispositivi Rete', icon: Server, color: '#39FF14', dataKey: 'network_devices' },
    ],
  },
];

const ALL_LAYERS = LAYER_GROUPS.flatMap(g => g.layers);

function LayerPanel({ data, activeLayers, setActiveLayers, isMobile, onClose }: LayerPanelProps) {
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [clickedGroup, setClickedGroup] = useState<string | null>(null);
  const [flyoutTop, setFlyoutTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const groupRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const updateFlyoutPosition = useCallback(() => {
    const label = hoveredGroup || clickedGroup;
    if (!label || !containerRef.current) return;
    const groupEl = groupRefs.current.get(label);
    if (!groupEl) return;
    const groupRect = groupEl.getBoundingClientRect();
    const panelRect = containerRef.current.getBoundingClientRect();
    setFlyoutTop(groupRect.top - panelRect.top + groupRect.height / 2);
  }, [hoveredGroup, clickedGroup]);

  useEffect(() => {
    updateFlyoutPosition();
  }, [updateFlyoutPosition]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = () => updateFlyoutPosition();
    el.addEventListener('scroll', handler);
    return () => el.removeEventListener('scroll', handler);
  }, [updateFlyoutPosition]);

  useEffect(() => {
    if (!clickedGroup) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        flyoutRef.current && !flyoutRef.current.contains(target)
      ) {
        setClickedGroup(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [clickedGroup]);

  const activeGroupLabel = hoveredGroup || clickedGroup;
  const activeGroup = activeGroupLabel
    ? LAYER_GROUPS.find(g => g.label === activeGroupLabel)
    : null;

  const toggle = (key: string) => setActiveLayers((prev: any) => ({ ...prev, [key]: !prev[key] }));
  
  const getCount = (dk: string): number | null => {
    if (!dk) return null;
    let total = 0;
    let found = false;
    for (const k of dk.split(',')) {
      if (data[k] && Array.isArray(data[k])) {
        total += data[k].length;
        found = true;
      }
    }
    return found ? total : null;
  };

  if (isMobile) {
    return (
      <div className="flex flex-col gap-4 py-2">
        {LAYER_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-2">
            <div 
              className="text-[12px] font-bold font-mono tracking-widest border-b border-white/10 pb-1"
              style={{ color: group.color }}
            >
              {group.fullLabel}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {group.layers.map((layer) => {
                const isLayerActive = activeLayers[layer.key];
                const count = getCount(layer.dataKey);
                
                return (
                  <button
                    key={layer.key}
                    onClick={() => toggle(layer.key)}
                    className={`flex items-center gap-2 px-2 py-2 rounded border transition-colors ${
                      isLayerActive 
                        ? 'bg-white/10 border-white/20' 
                        : 'bg-transparent border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div 
                      className={`w-2 h-2 rounded-full border flex-shrink-0 transition-all ${
                        isLayerActive ? 'bg-current border-current scale-100' : 'bg-transparent border-white/30 scale-75'
                      }`}
                      style={{ color: isLayerActive ? layer.color : 'inherit', boxShadow: isLayerActive ? `0 0 8px ${layer.color}` : 'none' }}
                    />
                    <span className={`text-[13px] font-mono uppercase tracking-wider flex-1 text-left ${isLayerActive ? 'text-white' : 'text-white/60'}`}>
                      {layer.label}
                    </span>
                    {count !== null && (
                      <span className="text-[10px] font-mono tabular-nums opacity-60">
                        {count.toLocaleString()}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="absolute top-0 left-0 h-full w-[200px] border-r border-white/5 flex flex-col pt-32 pb-8 z-[200] pointer-events-auto bg-black/40 backdrop-blur-md">
      
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-6 h-6 rounded flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors z-10"
          title="Chiudi pannello"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      <div ref={scrollRef} className="flex-1 flex flex-col gap-6 px-4 overflow-y-auto styled-scrollbar">
        {LAYER_GROUPS.map((group) => {
          const groupActiveCount = group.layers.filter(l => activeLayers[l.key]).length;
          const isActive = groupActiveCount > 0;
          const isHovered = hoveredGroup === group.label;
          const isClicked = clickedGroup === group.label;

          return (
            <div 
              key={group.label} 
              className="relative flex justify-center items-center"
              ref={el => { groupRefs.current.set(group.label, el); }}
              onMouseEnter={() => {
                clearHideTimeout();
                setHoveredGroup(group.label);
              }}
              onMouseLeave={() => {
                if (clickedGroup === group.label) return;
                hideTimeoutRef.current = setTimeout(() => {
                  setHoveredGroup(prev => prev === group.label ? null : prev);
                }, 120);
              }}
            >
              {/* Etichetta Verticale */}
              <div 
                className={`text-[14px] font-mono font-bold cursor-pointer select-none transition-all duration-300 flex items-center justify-center`}
                style={{
                  writingMode: 'horizontal-tb',
                  color: isActive ? group.color : 'rgba(255, 255, 255, 0.4)',
                  textShadow: isActive ? `0 0 10px ${group.color}80` : 'none',
                  letterSpacing: '0.1em',
                  opacity: isActive || isHovered || isClicked ? 1 : 0.5,
                }}
                onClick={() => setClickedGroup(clickedGroup === group.label ? null : group.label)}
              >
                {/* Punto indicatore attivo */}
                {isActive && (
                  <div 
                    className="absolute -left-1 w-1 h-1 rounded-full animate-pulse"
                    style={{ backgroundColor: group.color, boxShadow: `0 0 8px ${group.color}` }}
                  />
                )}
                {group.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Flyout fuori dal contenitore scrollabile per evitare clipping overflow */}
      <AnimatePresence>
        {activeGroup && (
          <motion.div
            key={activeGroup.label}
            ref={flyoutRef}
            onMouseEnter={clearHideTimeout}
            onMouseLeave={() => {
              if (clickedGroup) return;
              setHoveredGroup(null);
            }}
            initial={{ opacity: 0, x: -10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -5, filter: 'blur(2px)' }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute min-w-[300px] bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-4 shadow-2xl z-[200] pointer-events-auto"
            style={{
              left: '206px',
              top: flyoutTop,
              transform: 'translateY(-50%)',
              boxShadow: `0 0 30px ${activeGroup.color}15, inset 0 0 20px ${activeGroup.color}05`
            }}
          >
            <div className="text-[13px] font-bold font-mono mb-3 tracking-widest border-b border-white/10 pb-2" style={{ color: activeGroup.color }}>
              {activeGroup.fullLabel}
            </div>
            <div className="flex flex-col gap-1.5">
              {activeGroup.layers.map((layer) => {
                const isLayerActive = activeLayers[layer.key];
                const count = getCount(layer.dataKey);
                const Icon = layer.icon || Shield;
                
                return (
                  <button
                    key={layer.key}
                    onClick={() => toggle(layer.key)}
                    className="w-full flex items-center gap-3 px-2 py-1.5 rounded bg-transparent hover:bg-white/5 transition-colors group"
                  >
                    <div 
                      className={`w-2 h-2 rounded-full border flex-shrink-0 transition-all duration-300 ${isLayerActive ? 'bg-current border-current scale-100' : 'bg-transparent border-white/30 scale-75'}`}
                      style={{ color: isLayerActive ? layer.color : 'inherit', boxShadow: isLayerActive ? `0 0 8px ${layer.color}` : 'none' }}
                    />
                    <span className={`text-[13px] font-mono uppercase tracking-wider flex-1 text-left transition-colors duration-200 ${isLayerActive ? 'text-white' : 'text-white/50 group-hover:text-white/80'}`}>
                      {layer.label}
                    </span>
                    {count !== null && (
                      <span className="text-[13px] font-mono tabular-nums opacity-60">
                        {count.toLocaleString()}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(LayerPanel);
