<div align="center">

# ⬡ OSIRIS

### Open Source Intelligence & Reconnaissance Integrated System

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![MapLibre](https://img.shields.io/badge/MapLibre_GL-GPU_Rendered-396CB2?style=for-the-badge)](https://maplibre.org)
[![DeepSeek](https://img.shields.io/badge/AI-DeepSeek-4F6FFF?style=for-the-badge)](https://deepseek.com)
[![License](https://img.shields.io/badge/License-MIT-D4AF37?style=for-the-badge)](LICENSE)

**A real-time global intelligence dashboard with personal OSINT ontology, AI-powered data ingestion, and Palantir-style C2 visualization.**

</div>

---

## Table of Contents

- [System Architecture](#system-architecture)
- [How It's Built](#how-its-built)
- [What's New (Main Updates)](#whats-new-main-updates)
- [Features Overview](#features-overview)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Docker Deployment](#docker-deployment)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Future Improvements](#future-improvements)
- [License](#license)

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         OSIRIS CLIENT                            │
│  ┌─────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │   MapLibre GL   │  │  Right Tool    │  │  Left Sidebar    │  │
│  │   WebGL Render  │  │  Strip         │  │  Layer Panel     │  │
│  │   · Flights     │  │  · AI Chat     │  │  · Aviation      │  │
│  │   · Maritime    │  │  · Intel Pins  │  │  · Maritime      │  │
│  │   · Satellites  │  │  · CLAUSED     │  │  · Conflict      │  │
│  │   · Fires       │  │  · Ontology    │  │  · Satellite     │  │
│  │   · Earthquakes │  │  · Gotham      │  │  · Intel         │  │
│  │   · CCTV        │  │  · Watchlist   │  │  · DISPLAY       │  │
│  │   · Weather     │  │  · Markets     │  │                   │  │
│  └─────────────────┘  └────────────────┘  └──────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│                      NEXT.JS API LAYER (85+ Routes)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────────────┐ │
│  │ Data     │ │ OSINT    │ │ AI       │ │ Internal            │ │
│  │ /flights │ │ /osint/ip│ │ /ai/     │ │ /claused-pipeline   │ │
│  │ /cctv    │ │ /whois   │ │ analyze   │ │ /correlations       │ │
│  │ /fires   │ │ /dns     │ │ /briefing│ │ /workspaces         │ │
│  │ /news    │ │ /cve     │ │ /deep-dive│ │ /entity/expand      │ │
│  │ /maritime│ │ /sanctions│ │ /chat    │ │ /sdk/ingest         │ │
│  │ /weather │ │ /crypto  │ │ /ontology│ │ /health             │ │
│  └──────────┘ └──────────┘ └──────────┘ └─────────────────────┘ │
├──────────────────────────────────────────────────────────────────┤
│                  EXTERNAL DATA SOURCES                            │
│  OpenSky · USGS · NASA FIRMS · NOAA · N2YO · TfL · NVD         │
│  aisstream.io · blockstream.info · OpenSanctions · ip-api.com   │
│  25+ Live News Broadcasters · RSS Feeds · t.me web previews     │
└──────────────────────────────────────────────────────────────────┘
```

### Layer Architecture

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Client** | React 19 + TypeScript 5 | UI rendering, state, animations (Framer Motion) |
| **Map** | MapLibre GL JS (WebGL) | GPU-accelerated geospatial rendering |
| **API** | Next.js 16 App Router | Server-side data fetching, caching, stream |
| **AI Engine** | DeepSeek (native fetch) | Intel analysis, ontology extraction, briefing |
| **SDK** | Polybolos / Lattice | Entity streaming and ingestion protocol |
| **Cache** | nginx | Reverse proxy + response caching |
| **Storage** | Docker volumes + localStorage | Uploads, workspaces, client persistence |

---

## How It's Built

### Frontend Stack

- **Next.js 16** with App Router and standalone output mode — compiles to a self-contained `/app` directory with zero server dependencies beyond Node.js
- **TypeScript 5** throughout — strict typing across all 85+ API routes and 25+ components
- **MapLibre GL JS** — GPU-accelerated WebGL map with 16 toggleable data layers, each with real-time entity counts
- **Framer Motion** — panel transitions, slideouts, and AnimatePresence for smooth UI state changes
- **Lucide React** — consistent iconography across tool strips and panels
- **Custom CSS Design System** — dark-theme HUD with amber/gold accents, variable-based theming

### Backend / API

- **Server-side data aggregation** via Next.js route handlers — each data source has a dedicated API route
- **SSRF protection** via a centralized `ssrf-guard.ts` — all outbound requests validated against an allowlist
- **Stealth fetch layer** — rate-limit-aware fetching with retry logic and user-agent rotation
- **Ring-buffer event logger** — in-memory event history for debugging AI pipeline flows

### AI Intelligence Layer

- **DeepSeek API** via native `fetch()` — no npm SDK needed, zero install overhead
- **Round-robin key rotation** — up to 8 API keys for high-traffic deployments
- **Routes**: `/api/ai/analyze` (threat analysis), `/briefing` (dashboard briefing), `/deep-dive` (entity deep-dive), `/osiris-chat` (RAG chat with context)
- **Context serializer** — compresses 10+ data domains into token-efficient prompts

### Data Pipeline

- **Polling system** — each layer fetches on-demand when activated, with adaptive polling intervals (5s for flights, 15-30min for stable sources)
- **Viewport-awareness** — only fetches data for the visible map region
- **Dual-pipeline layers** — OpenSource + CLAUSED pipelines in the left sidebar with separate layer groups and active counts
- **CCTV aggregator** — 2,000+ cameras across 15 countries, served from static data with online/offline stream status

---

## What's New (Main Updates)

This fork extends the original OSIRIS dashboard with significant new capabilities:

### 1. CLAUSED Pipeline — Multi-Tab Data Ingestion
A 5-tab intelligence ingestion system that accepts files (JSON/PDF/TXT/CSV), images (PNG/JPG), audio (MP3/WAV), URLs — and has an AI-powered ONTOLOGY tab for personal data extraction. Each input is processed through DeepSeek AI analysis, severity-rated (INFO/WATCH/ALERT/CRITICAL), and fed into the dashboard.

### 2. Personal Ontology Graph
A force-directed graph for tracking personal intelligence targets across 9 domains:
- **PERSON** — individuals, aliases
- **COMMUNICATION** — phone numbers, emails
- **SOCIAL** — social media profiles
- **IDENTITY** — national IDs, passports
- **VEHICLE** — cars, plates, VINs
- **LOCATION** — addresses, places
- **NETWORK** — MAC addresses, WiFi networks, IPs
- **EVENT** — meetings, incidents
- **MEDIA** — photos, documents, recordings

Cross-referencing engine with 10 rule types (Haversine proximity, temporal adjacency, shared identifiers, etc.)

### 3. AI Chat Panel
Side panel for querying ontology data using natural language. Streaming responses from DeepSeek with full conversation history and context from stored entities.

### 4. Gotham C2 Dashboard
Palantir-style Command & Control overlay with 5 configurable sections:
- SITUATIONAL OVERVIEW — metric cards
- THREAT MATRIX — severity-grid
- ENTITY CATALOG — searchable entity browser
- NETWORK INTELLIGENCE — connectivity graph
- RECENT EVENTS — timeline feed

Toggle with the map via the right tool strip Eye button.

### 5. Intel Pins System
Persistent geospatial bookmarking with severity (INFO/WATCH/ALERT/CRITICAL), GeoJSON import/export, zoom-on-click at level 18, per-coordinate proximity data (80th-percentile adaptive radius), nearest-named-entity lookup, and cross-type top-3 sorting by real distance.

### 6. DeepSeek AI Engine (Gemini Replacement)
Full migration from Google Generative AI SDK to native `fetch()` against DeepSeek's OpenAI-compatible API. Zero npm dependencies, faster Docker builds, round-robin key rotation across up to 8 keys.

### 7. AI-Powered Ontology Ingestion API
Three-action endpoint at `/api/ai/ontology-query` — `ingest` (unstructured text → entities + relationships), `query` (ask about stored data), `suggest` (suggest entities to add). Auto-cross-reference trigger after every ingestion.

### 8. Workspace / Correlation / Playbook System
Data persistence layer with workspaces, cross-domain correlation engine (10 rules running against all entities), and playbook automation for common OSINT workflows.

### 9. Event Logger
In-memory ring buffer (500 entries) for debugging AI pipeline flows. Accessible via `/api/ai/logs`.

### 10. Architecture Upgrades
- Docker standalone mode (node:22-alpine, ~220MB, non-root)
- Nginx cache layer (osiris-cache on port 8080)
- Cross-compile build workflow (ARM build on Pi, deploy to x86 VM)
- WebGL canvas screenshot interceptor for reliable map capture

---

## Features Overview

### Intelligence Layers (16 toggleable)
- Aviation (commercial, private, military, jets) — OpenSky Network
- Maritime (39 ports, chokepoints, vessel tracking) — aisstream.io
- CCTV (2,000+ cameras, 15 countries)
- Seismic (M2.5+ real-time) — USGS
- Active Fires — NASA FIRMS
- Live News (25+ broadcasters)
- Weather (severe events) — NASA EONET
- Space Weather / Satellites — NOAA SWPC, N2YO
- Cyber Threats — NVD, custom scanner
- Conflict Zones (13 active zones)
- Crypto Wallet Trace (BTC + ETH)
- OFAC Sanctions (SDN cross-check)
- Telegram OSINT (geoparsed public channels)
- **CLAUSED Pipeline** (ingested intel layer)

### RECON Toolkit
- Port Scanner — TCP connect with service fingerprinting
- DNS Lookup — A, AAAA, MX, NS, TXT, CNAME
- WHOIS — Domain/IP registration (auto-cross-checked against OFAC SDN)
- SSL/TLS Inspector — Certificate chain analysis
- IP Intelligence — Geolocation, ASN, threat reputation
- Vulnerability Scanner — CVE via NVD
- Crypto Wallet Trace — BTC + ETH balance, tx history
- OFAC Sanctions Search — persons, orgs, vessels
- MAC Address Lookup — OUI vendor identification
- Phone Number Lookup — carrier, region
- GitHub OSINT — user/repo recon
- Shodan Integration — connected device search

### Data Ingestion (CLAUSED Pipeline)
- **FILE** — JSON/PDF/TXT/CSV/MD/XML/LOG drag-drop or paste
- **IMAGE** — Vision analysis via DeepSeek
- **AUDIO** — File upload for analysis
- **URL** — Web page fetch + content extraction + AI analysis
- **ONTOLOGY** — Personal data extraction into the ontology graph

### C2 / Command Overlay
- Gotham Dashboard with amber accent palette
- Situational overview with metric cards
- Threat matrix with severity sorting
- Entity catalog with locate-to-map
- Network intelligence view
- Recent events timeline

---

## Installation

### Quick Start (Development)

```bash
# Clone the repo
git clone https://github.com/rioned/osiris.git
cd osiris

# Install dependencies
npm install

# Copy environment template (no keys required for core features)
cp .env.template .env.local

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Docker (Production / Self-Hosted)

```bash
git clone https://github.com/rioned/osiris.git
cd osiris
cp .env.template .env
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000). The image is a multi-stage `node:22-alpine` standalone build (~220 MB, non-root). See [DOCKER.md](DOCKER.md) for API key setup and CasaOS integration.

### Build from Source (ARM / Raspberry Pi)

On ARM platforms, Turbopack is unavailable. Use the webpack fallback:

```bash
npx next build --webpack
```

Then copy `.next/standalone/` and `.next/static/` to your deployment target.

---

## Environment Variables

OSIRIS works **partially without any API keys** — all core feeds use public, keyless sources. Copy [`.env.template`](.env.template) to `.env` and set only what you need:

```env
# Published host port (container always listens on 3000). Default: 3000
OSIRIS_PORT=3000

# AI Intelligence (DeepSeek) — at least one key required for AI features
DEEPSEEK_API_KEY_1=sk-...    # platform.deepseek.com/api_keys

# RECON scanner backend
SCANNER_URL=
SCANNER_KEY=

# Optional data source keys (for higher rate limits / additional sources)
FIRMS_API_KEY=                # NASA FIRMS
OPENSKY_CLIENT_ID=            # OpenSky OAuth2
OPENSKY_CLIENT_SECRET=
N2YO_API_KEY=                 # N2YO satellites
AIS_API_KEY=                  # aisstream.io maritime
```

Without `SCANNER_URL`/`SCANNER_KEY` the RECON toolkit returns `503`; every other layer works out of the box. `.env` is gitignored — only the template is committed.

---

## Docker Deployment

The Docker Compose stack has three services:

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| **osiris** | `node:22-alpine` + built app | 3000 | Main dashboard (standalone Next.js) |
| **osiris-cache** | `nginx:alpine` | 8080 | Reverse proxy / response cache |
| **osiris-intel** | Custom | 4000 | Intel ontology backend |

### Port Configuration

Set `OSIRIS_PORT` in `.env` to change the published host port (e.g. `OSIRIS_PORT=3005`) without editing the compose file.

### Prebuilt Image

```bash
docker pull ghcr.io/aiacos/osiris:latest
docker run -d -p 3000:3000 --env-file .env ghcr.io/aiacos/osiris:latest
```

### Stale Build Cleanup

If Docker builds hang or fail:

```bash
docker rm -f $(docker ps -q --filter ancestor=node:22-alpine) 2>/dev/null
docker builder prune -af
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `F` | Toggle flight layers |
| `E` | Toggle earthquakes |
| `S` | Toggle satellites |
| `D` | Toggle day/night cycle |
| `Escape` | Close all panels |

---

## Future Improvements

1. **Multi-user authentication & role-based access** — JWT-based login with viewer/analyst/admin tiers, per-user panel configuration and workspace isolation.

2. **WebSocket real-time push** — Replace polling with WebSocket/SSE connections for flight, maritime, and alert data — instant updates without API call overhead.

3. **Automated report generation** — Scheduled PDF/XLSX briefings compiled from active intelligence layers, ontology entities, and AI analysis — emailed or webhook-delivered.

4. **Threat scoring engine** — ML-based scoring that weighs entity proximity, temporal recency, severity distribution, and cross-source correlation into a single threat score per entity/region.

5. **Plugin system** — Third-party plugin API for custom data sources, visualization modules, and AI pipelines — hot-loadable without rebuilding the core.

6. **Advanced graph analytics** — Community detection (Louvain/Leiden), centrality scoring, pathfinding between entities in the ontology graph — identify hidden connections.

7. **Natural language search** — Full-text + semantic search across all intelligence layers, ontology entities, and ingested data — "show me all flights near this phone number's location in the last 24 hours".

8. **Automated OSINT playbooks** — Triggerable sequences of RECON toolkit operations with conditional branching — e.g., "when a new phone number is ingested, run OSINT sweep on it, cross-check against sanctions, and create an Intel Pin".

9. **Historical timeline playback** — Record and replay entity movements (flights, vessels) with a scrubable timeline — reconstruct past events from cached geospatial data.

10. **Dark web monitoring integration** — Tor/onion scanner module for surface-level dark web OSINT, with automatic entity extraction and linkage to the ontology graph.

11. **Geofence alerts** — Define geographic boundaries that trigger alerts when aircraft, vessels, or tracked entities enter/exit — with notification delivery via Telegram, email, or webhook.

12. **Federated OSINT sharing** — Peer-to-peer sharing of anonymized intelligence between OSIRIS instances with cryptographic attestation and reputation scoring.

13. **Mobile companion app** — React Native or PWA frontend for field operations — camera-based document scanning, GPS tagging, push alerts.

14. **SOC/IDS integration** — Connect to SIEM platforms (Splunk, Elastic) or IDS (Suricata, Zeek) to overlay network security events on the geospatial dashboard — map IP-based threats to physical locations.

15. **LLM fine-tuning** — Train a domain-specific model on OSINT report corpora for improved entity extraction, relationship inference, and false-positive reduction in the ontology engine.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built by [rioned](https://github.com/rioned)**

Forked from [simplifaisoul/osiris](https://github.com/simplifaisoul/osiris)

</div>
