<div align="center">

# ⬡ OSIRIS

### Open Source Intelligence & Reconnaissance Integrated System

[![Live Demo](https://img.shields.io/badge/osirisai.live-00E5FF?style=for-the-badge&logo=vercel&logoColor=white)](https://osirislive.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![MapLibre](https://img.shields.io/badge/MapLibre_GL-GPU_Rendered-396CB2?style=for-the-badge)](https://maplibre.org)
[![License](https://img.shields.io/badge/License-MIT-D4AF37?style=for-the-badge)](LICENSE)

**A real-time global intelligence dashboard that aggregates live flight tracking, CCTV networks, earthquake monitoring, conflict zone mapping, and 24/7 news feeds into a single GPU-accelerated interface.**

[Live Demo](https://osirisai.live) · [Report Bug](https://github.com/simplifaisoul/osiris/issues) · [Request Feature](https://github.com/simplifaisoul/osiris/issues)

</div>

---

## About This Fork

This fork is based on the original [simplifaisoul/osiris](https://github.com/simplifaisoul/osiris) project. We extend it with **50+ new API endpoints**, **Canada CCTV feeds**, **new UI components**, **geographic anomaly layers**, **correlation tools**, and **cross-platform compatibility improvements**.

**Original creator:** [simplifaisoul](https://github.com/simplifaisoul) — all credit for the core architecture, MapLibre integration, RECON toolkit, and OSINT data pipeline goes to them.

---

## What's New in This Fork

### New Intelligence Layers

| Domain | Data Points | Sources |
|--------|------------|---------|
| **Canada CCTV** | 100+ Cameras | Ottawa, Quebec, Montreal, Ontario, Alberta |
| **Antarctica Anomalies** | Geographic Anomalies | Open Data |
| **Balloons** | High-Altitude Balloon Tracking | Public Sources |
| **Caves, Mines, Pyramids** | Geographic Points | Open Data |
| **Crop Circles** | Documented Formations | Open Data |
| **Embassies** | Diplomatic Missions Worldwide | Open Data |
| **Fault Lines** | Tectonic Plate Boundaries | USGS |
| **IXP** | Internet Exchange Points | Open Data |
| **Lost Cities** | Archaeological Sites | Open Data |
| **Maritime Routes** | Global Shipping Lanes | Open Data |
| **Meteorites** | Impact Sites | NASA |
| **Military Bases** | Global Installations | Open Data |
| **Mystery Locations** | Unexplained Sites | Open Data |
| **Natural Disasters** | Real-time Events | GDACS, EONET |
| **Nuclear Facilities** | Power Plants & Research | Open Data |
| **Power Plants** | Energy Infrastructure | Open Data |
| **Radiation** | Environmental Radiation | Open Data |
| **Radio Towers** | Communication Infrastructure | Open Data |
| **Ransomware** | Active Ransomware Threats | URLhaus, ThreatFox |
| **Shipwrecks** | Documented Wrecks | Open Data |
| **Tor Nodes** | Dark Web Infrastructure | Tor Project |
| **UFO Reports** | Documented Sightings | Open Data |
| **Underground Bases/Cities** | Subterranean Sites | Open Data |
| **Volcanoes** | Active Volcanoes | Smithsonian |
| **Weather Alerts** | Severe Weather Warnings | NOAA, EONET |
| **Wikipedia Geo** | Geo-tagged Wikipedia Articles | Wikipedia API |
| **Airports** | Global Airport Database | OpenFlights |

### New OSINT Endpoints

| Endpoint | Function |
|----------|----------|
| `api/osint/bluetooth` | Bluetooth device OSINT |
| `api/osint/certstream` | Certificate transparency monitoring |
| `api/osint/correlate` | Multi-source data correlation |
| `api/osint/crypto` | Cryptocurrency address analysis |
| `api/osint/doh` | DNS-over-HTTPS resolution |
| `api/osint/email` | Email address OSINT |
| `api/osint/hackertarget` | HackerTarget integration |
| `api/osint/iprange` | IP range analysis |
| `api/osint/network-scan` | Network scanning |
| `api/osint/permutator` | Domain permutation generator |
| `api/osint/sherlock` | Username search across platforms |
| `api/osint/sub-brute` | Subdomain brute-forcing |
| `api/osint/urlscan` | URL scanning |
| `api/osint/username` | Username intelligence |
| `api/osint/wayback` | Wayback Machine integration |
| `api/osint/weather` | Weather intelligence |
| `api/search` | Unified search across all layers |

### New UI Components

| Component | Function |
|-----------|----------|
| **BookmarksPanel** | Save and organize intel locations |
| **CorrelationPanel** | Cross-reference data across layers |
| **GeoJSONOverlay** | Import custom GeoJSON files |
| **LayerPresets** | Save/load layer configurations |
| **SearchPanel** | Full-text search across all data |
| **TimelineSlider** | Temporal data filtering |
| **Maltego Export** | Export data for Maltego analysis |

---

## Architecture

```
┌───────────────────────────────────────────────────────┐
│                     OSIRIS CLIENT                      │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────────┐ │
│  │ MapLibre  │  │  HUD     │  │  RECON Toolkit      │ │
│  │  GL (GPU) │  │ Panels   │  │  Port Scan · DNS    │ │
│  │  WebGL    │  │ 16+      │  │  WHOIS · SSL · CVE │ │
│  │  Render   │  │ Layers   │  │  Crypto · Sanctions │ │
│  └──────────┘  └──────────┘  └─────────────────────┘ │
│  ┌──────────────────────────────────────────────────┐ │
│  │  NEW: Bookmarks · Correlation · GeoJSON · Search │ │
│  │       TimelineSlider · MaltegoExport · LayerSets │ │
│  └──────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────┤
│                  NEXT.JS API ROUTES                    │
│  Core:    /api/flights  /api/cctv  /api/earthquakes   │
│           /api/fires    /api/news  /api/maritime      │
│           /api/gdelt    /api/satellites               │
│                                                         │
│  NEW:     /api/airports        /api/antarctica-anom.  │
│           /api/balloons        /api/caves             │
│           /api/crop-circles    /api/datacenters       │
│           /api/embassies       /api/fault-lines       │
│           /api/ixp             /api/lost-cities       │
│           /api/maritime-routes /api/meteorites        │
│           /api/military-bases  /api/mines             │
│           /api/mystery-loc.    /api/natural-disasters │
│           /api/nuclear-fac.    /api/power-plants      │
│           /api/pyramids        /api/radiation         │
│           /api/radio-towers    /api/ransomware        │
│           /api/shipwrecks      /api/tor-nodes         │
│           /api/ufo-reports     /api/underground-bases │
│           /api/underground-c.  /api/volcanoes         │
│           /api/weather-alerts  /api/wikipedia-geo     │
│           /api/search          /api/cameras/*         │
│                                                         │
│  OSINT:   /api/osint/bluetooth  /api/osint/certstream │
│           /api/osint/correlate  /api/osint/crypto     │
│           /api/osint/doh        /api/osint/email      │
│           /api/osint/hackertarget                     │
│           /api/osint/iprange    /api/osint/network-sc.│
│           /api/osint/permutator /api/osint/sherlock   │
│           /api/osint/sub-brute  /api/osint/urlscan    │
│           /api/osint/username   /api/osint/wayback    │
│           /api/osint/weather                         │
├───────────────────────────────────────────────────────┤
│                  EXTERNAL DATA SOURCES                 │
│  OpenSky · USGS · NASA · NOAA · TfL · NVD             │
│  GDACS · EONET · FIRMS · N2YO · RSS Feeds             │
│  blockstream.info · Blockscout · OpenSanctions         │
│  URLhaus · ThreatFox · Tor Project · Wikipedia         │
│  Smithsonian · OpenFlights · HackerTarget             │
└───────────────────────────────────────────────────────┘
```

---

## Features

### Intelligence Layers
- **30+ toggleable data layers** with real-time entity counts
- **GPU-accelerated rendering** — all map data rendered via WebGL, not DOM
- **Progressive loading** — data fetched on-demand when layers are activated
- **Viewport-aware** — only loads relevant data for the visible region

### RECON Toolkit
- **Port Scanner** — TCP connect scan with service fingerprinting
- **DNS Lookup** — Full record resolution (A, AAAA, MX, NS, TXT, CNAME)
- **WHOIS** — Domain/IP registration data (auto-cross-checked against OFAC SDN)
- **SSL/TLS Inspector** — Certificate chain analysis
- **IP Intelligence** — Geolocation, ASN, threat reputation
- **Vulnerability Scanner** — CVE lookup against NVD database
- **Crypto Wallet Trace** — BTC + ETH lookup (balance, tx history, OFAC SDN)
- **OFAC Sanctions Search** — Persons, organizations, vessels, aircraft

### Live Broadcast Network
- **25+ live 24/7 news streams** from global broadcasters
- Feeds from NBC, CBS, ABC, Sky News, Al Jazeera, France 24, NHK, WION, and more

### Telegram OSINT Layer
- Public-channel feed via `t.me/s/<channel>` web preview
- Multilingual geoparsing (EN + Cyrillic + Arabic)

### Crypto Wallet Intelligence
- BTC via blockstream.info, ETH via Blockscout
- OFAC SDN sanctioned-address cross-check

### Conflict Zone Monitoring
- **13 active conflict/tension zones** with severity-coded markers
- Active Wars: Ukraine, Gaza, Sudan, Myanmar, DRC, Yemen

---

## Quick Start

### Prerequisites
- **Node.js 20+** (recommended: 22)
- **npm** (included with Node.js)

### Installation

```bash
# Clone this fork
git clone https://github.com/allelive/osiris.git
cd osiris

# Install dependencies
npm install

# Copy environment template (optional — most features work without keys)
cp .env.template .env

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

### Docker / Self-Hosting

```bash
git clone https://github.com/allelive/osiris.git
cd osiris
cp .env.template .env
docker compose up -d
```

**Custom port** — set `OSIRIS_PORT` in `.env`:

```env
OSIRIS_PORT=3005
```

### Environment Variables

OSIRIS works **without any API keys** for most features:

```env
OSIRIS_PORT=3000

# RECON scanner backend (optional — without it, toolkit returns 503)
SCANNER_URL=
SCANNER_KEY=

# Optional API keys for higher rate limits
FIRMS_API_KEY=
OPENSKY_CLIENT_ID=
OPENSKY_CLIENT_SECRET=
N2YO_API_KEY=
AIS_API_KEY=
```

---

## Dependency Overview

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.2.6 | Framework (App Router, Turbopack) |
| `react` / `react-dom` | 19.2.4 | UI Library |
| `maplibre-gl` | 5.24.0 | Map Engine (WebGL) |
| `react-map-gl` | 8.1.1 | React bindings for MapLibre |
| `framer-motion` | 12.38.0 | Animations |
| `lucide-react` | 1.14.0 | Icons |
| `hls.js` | 1.6.16 | HLS Video Streaming |
| `satellite.js` | 7.0.0 | Satellite Position Calculation |
| `rss-parser` | 3.13.0 | RSS Feed Parsing |
| `ws` | 8.21.0 | WebSocket Client |
| `sharp` | 0.34.5 | Image Processing |
| `@google/generative-ai` | 0.24.1 | AI Analyst (Gemini) |
| `google-libphonenumber` | 3.2.44 | Phone Number Validation |
| `react-force-graph-2d` | 1.29.1 | Network Graph Visualization |
| `tailwindcss` | 4 | Utility CSS |
| `typescript` | 5 | Type Safety |

---

## Project Structure

```
osiris/
├── src/
│   ├── app/
│   │   ├── api/          # All API routes (80+ endpoints)
│   │   ├── globals.css   # Global styles
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Main page
│   ├── components/       # React components
│   │   ├── AiAnalyst.tsx
│   │   ├── CameraViewer.tsx
│   │   ├── OsirisMap.tsx
│   │   ├── LayerPanel.tsx
│   │   ├── OsintPanel.tsx
│   │   ├── SearchBar.tsx
│   │   ├── BookmarksPanel.tsx     # NEW
│   │   ├── CorrelationPanel.tsx   # NEW
│   │   ├── GeoJSONOverlay.tsx     # NEW
│   │   ├── LayerPresets.tsx       # NEW
│   │   ├── SearchPanel.tsx        # NEW
│   │   ├── TimelineSlider.tsx     # NEW
│   │   └── ...
│   └── lib/
│       ├── ai-engine.ts
│       ├── maltego-export.ts      # NEW
│       └── search-utils.ts        # NEW
├── public/               # Static assets
├── scripts/              # Utility scripts
├── docker-compose.yml    # Docker setup
├── Dockerfile            # Multi-stage build
└── README.md
```

---

## What We Implemented

### Tested ✅
- **Canada CCTV feeds** — 100+ cameras across Ottawa, Quebec, Montreal, Ontario, Alberta
- **50+ new API endpoints** — all functional, returning data
- **New UI components** — BookmarksPanel, CorrelationPanel, GeoJSONOverlay, LayerPresets, SearchPanel, TimelineSlider
- **Maltego export** — full data export functionality
- **Search utilities** — cross-layer search
- **Docker compatibility** — container builds and runs
- **Security hardening** — Samba disabled, OSIRIS bound to localhost, UFW firewall active

### Needs Testing 🧪
- **Camera integration** — Italy camera layer (`api/cameras/italy`)
- **Correlation engine** — cross-source data correlation (`api/osint/correlate`)
- **Sherlock integration** — username search (`api/osint/sherlock`)
- **Wayback Machine** — historical data retrieval (`api/osint/wayback`)
- **Bluetooth OSINT** — Bluetooth device scanning (`api/osint/bluetooth`)
- **Certstream** — certificate transparency monitoring (`api/osint/certstream`)
- **Network scan** — port scanning (`api/osint/network-scan`)
- **Subdomain brute-force** — subdomain discovery (`api/osint/sub-brute`)
- **Permutator** — domain permutation generation (`api/osint/permutator`)
- **HackerTarget** — external OSINT integration (`api/osint/hackertarget`)
- **URLScan** — URL security scanning (`api/osint/urlscan`)
- **Weather OSINT** — weather-based intelligence (`api/osint/weather`)
- **Airport data** — global airport database (`api/airports`)
- **Cameras** — additional camera sources (`api/cameras/*`)

### How to Test
```bash
# Start the dev server
npm run dev

# Test an endpoint directly
curl http://localhost:3000/api/airports
curl http://localhost:3000/api/osint/bluetooth
curl http://localhost:3000/api/volcanoes

# Or open in browser
open http://localhost:3000
```

### Helping with Testing
We welcome help testing unverified endpoints. If you find bugs or have suggestions:
1. Open an issue on [GitHub](https://github.com/allelive/osiris/issues)
2. Describe the endpoint and the behavior you see
3. Include browser console errors if applicable

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `F` | Toggle flight layers |
| `E` | Toggle earthquakes |
| `S` | Toggle satellites |
| `D` | Toggle day/night cycle |
| `Escape` | Close panels |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Map Engine | MapLibre GL JS (WebGL) |
| Animations | Framer Motion |
| Icons | Lucide React |
| Styling | Custom CSS + Tailwind CSS |
| Deployment | Vercel / Docker |

---

## License

MIT — see [LICENSE](LICENSE) for details.

Original project by [simplifaisoul](https://github.com/simplifaisoul). This fork extends the original work with additional endpoints, components, and geographic layers.

---

<div align="center">

**Built on the work of [simplifaisoul](https://github.com/simplifaisoul)** · Fork by [allelive](https://github.com/allelive)

If you find this project useful, support the original creator:

🔗 [Support OSIRIS on Patreon](https://www.patreon.com/posts/159077425)

</div>
