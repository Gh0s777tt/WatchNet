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

Questo fork è basato sul progetto originale [simplifaisoul/osiris](https://github.com/simplifaisoul/osiris). Il codice originale (mappa MapLibre, toolkit RECON, pipeline dati OSINT) è interamente merito di `simplifaisoul`. Questo fork aggiunge **67 nuovi endpoint API**, **6 nuovi componenti UI**, **utility e strumenti** per un totale di **97 strumenti**.

**Original creator:** [simplifaisoul](https://github.com/simplifaisoul)

---

## Tutti i 97 Strumenti — Descrizione Completa

### API — Intelligence Layer (mappa e dati geografici)

| # | Endpoint | Descrizione | Metodo |
|---|----------|-------------|--------|
| 1 | `flights` | ✈️ **Voli aerei real-time**. Traccia aerei commerciali, privati, militari via OpenSky Network / adsb.lol (6 regioni globali). Nessuna chiave API richiesta. | `GET` |
| 2 | `airports` | 🛫 **Database aeroporti mondiali**. Oltre 50 aeroporti con coordinate, codice IATA/ICAO, numero piste. Dati statici. | `GET` |
| 3 | `earthquakes` | 🌍 **Terremoti in tempo reale**. Dati USGS ultimi 30 giorni, magnitudo 2.5+. Include epicentro, profondità, timestamp. | `GET` |
| 4 | `fires` | 🔥 **Incendi attivi**. Hotspot da NASA FIRMS MODIS/VIIRS aggiornati ogni 3 ore. Coordinate e intensità. | `GET` |
| 5 | `maritime` | 🚢 **Tracciamento navi live**. Posizioni AIS da Barents Sea + hub globale gratuito. Rotte, velocità, destinazione. | `GET` |
| 6 | `maritime-routes` | 🌊 **Rotte marittime globali**. Linee di navigazione principali tra porti mondiali. Dati statici. | `GET` ✦ |
| 7 | `satellites` | 🛰️ **Satelliti in orbita**. Starlink, ISS, NOAA da Celestrak TLE. Posizioni calcolate in tempo reale. | `GET` |
| 8 | `space-weather` | ☀️ **Meteo spaziale**. Attività solare (Kp index, flares, CME) da NOAA SWPC. | `GET` |
| 9 | `weather` | 🌤️ **Meteo attuale**. Temperatura, vento, precipitazioni da Open-Meteo. Autocomplete città via Nominatim. | `GET ?lat=&lng=` |
| 10 | `air-quality` | 🌬️ **Qualità aria**. Indice AQ + inquinanti (PM2.5, PM10, NO2, O3) da Open-Meteo Air Quality API. | `GET ?lat=&lng=` |
| 11 | `weather-alerts` | ⚠️ **Allerte meteo severe**. Alluvioni, uragani, tempeste da NOAA NWS. | `GET` ✦ |
| 12 | `radar` | 📡 **Radar composito**. Mappe radar + satellitari da OpenWeatherMap + NOAA GOES. Tile proxy. | `GET` |
| 13 | `cctv` | 📹 **Telecamere pubbliche mondiali**. 2000+ stream RTSP/HTTP da UK, USA, Australia, Turchia, Grecia, Germania, Francia, Spagna, Italia, Giappone, Polonia, Romania, Serbia, Macedonia, Bulgaria, Repubblica Ceca, Slovacchia. | `GET` |
| 14 | `cctv/stream-status` | ✅ **Verifica stream CCTV**. Ping/check disponibilità stream RTSP via rtsp.me. | `GET ?url=` |
| 15 | `cameras/italy` | 🇮🇹 **Telecamere Italia**. Traffico/webcam italiane per città con coordinate. | `GET` ✦ |
| 16 | `news` | 📰 **Notizie globali**. Aggregatore RSS multi-fonte: BBC, Reuters, Al Jazeera, Guardian, CNN, Sky News. | `GET` |
| 17 | `live-news` | 📺 **Notizie 24/7**. Stream live da 25+ broadcaster globali (NBC, CBS, ABC, France 24, NHK, WION). | `GET` |
| 18 | `gdelt` | 📊 **Eventi GDELT 2.0**. Monitoraggio eventi globali con sentiment, rilevanza, attori. | `GET ?keyword=&lastHours=` |
| 19 | `frontlines` | ⚔️ **Fronti di guerra attivi**. Ucraina, Gaza, Sudan, Myanmar, DRC, Yemen, Siria, Libano, Sahel, Somalia, Mar Rosso, Stretto Taiwan, DMZ Corea. | `GET` |
| 20 | `infrastructure` | 🏭 **Infrastrutture critiche**. Nodi energetici, idrici, comunicazione globali. | `GET` |
| 21 | `markets` | 💹 **Mercati finanziari**. Borse mondiali con coordinate. | `GET` |
| 22 | `scm-suppliers` | 🔗 **Vendor supply chain**. Semiconduttori, aerospace, difesa, energia. | `GET` |
| 23 | `region-dossier` | 📋 **Dossier intelligence paese**. Geografia, governo, economia, porti, aeroporti, rischi. | `GET ?country=` |
| 24 | `scanner` | 🔎 **Scanner vulnerabilità**. Backend scanner porte e servizi. | `GET` |
| 25 | `health` | 💓 **Health check sistema**. Uptime, versione, conteggio endpoint attivi, stato memoria. | `GET` |
| 26 | `stats` | 📊 **Statistiche dashboard**. Conteggio endpoint, uptime, memoria, allerte meteo attive. | `GET` |
| 27 | `proxy-tiles` | 🗺️ **Proxy tile mappe**. Proxy whitelist per .cartocdn.com (mappe di sfondo). | `GET ?url=` |
| 28 | `sentinel` | 🛰️ **Proxy Sentinel Copernicus**. Immagini satellitari Sentinel-2 via tile proxy. | `GET ?layer=&z=&x=&y=` |
| 29 | `github-webhook` | 🔗 **Webhook GitHub**. Riceve eventi GitHub, verifica firma HMAC-SHA256, forward a Discord. | `POST` |
| 30 | `search` | 🔍 **Ricerca unificata**. Cerca su tutti i layer geografici (aeroporti, grotte, piramidi, vulcani, città perse, ecc.) | `GET ?q=&category=&lat=&lng=` ✦ |
| 31 | `country-risk` | 🚨 **Valutazione rischio paesi**. Viaggio, salute, sicurezza, stabilità politica. | `GET ?country=` |

### API — Nuovi Layer Geografici (aggiunti in questo fork)

| # | Endpoint | Descrizione | Metodo |
|---|----------|-------------|--------|
| 32 | `antarctica-anomalies` | ❄️ **28 anomalie Antartide**. Fenomeni naturali, teorie, basi di ricerca con coordinate. | `GET` ✦ |
| 33 | `balloons` | 🎈 **Palloni aerostatici**. Palloni spia, meteo, ricerca con coordinate e quota. | `GET` ✦ |
| 34 | `caves` | 🕳️ **Grotte e caverne**. Sistemi sotterranei notabili mondiali. | `GET` ✦ |
| 35 | `crop-circles` | 🌾 **Cerchi nel grano**. Formazioni documentate con coordinate e anno. | `GET` ✦ |
| 36 | `cyber-threats` | 💀 **Minacce cyber live**. Feed AbuseIPDB + Blocklist.de. | `GET` ✦ |
| 37 | `datacenters` | 🏢 **Data center mondiali**. AWS, Azure, Google Cloud, OVH, ecc. con coordinate. | `GET` ✦ |
| 38 | `embassies` | 🏛️ **Ambasciate/consolati**. Sedi diplomatiche mondiali con coordinate. | `GET` ✦ |
| 39 | `fault-lines` | 🌋 **Faglie tettoniche**. Placche e faglie principali mondiali. | `GET` ✦ |
| 40 | `ixp` | 🌐 **Internet Exchange Points**. IXP mondiali (AMS-IX, DE-CIX, LINX, ecc.). | `GET` ✦ |
| 41 | `lost-cities` | 🏚️ **Città perdute**. Atlantide, El Dorado, Shambhala, Troy, Machu Picchu, Petra, ecc. | `GET` ✦ |
| 42 | `malware` | 🦠 **Feed malware live**. AbuseIPDB + URLhaus + MalShare. | `GET` ✦ |
| 43 | `meteorites` | ☄️ **Impatti meteoritici**. Crateri e siti d'impatto notabili. | `GET` ✦ |
| 44 | `military-bases` | 🏴 **Basi militari**. Installazioni militari USA, Russia, Cina, NATO, ecc. | `GET` ✦ |
| 45 | `mines` | ⛏️ **Miniere mondiali**. Oro, diamanti, rame, ferro, carbone, uranio. | `GET` ✦ |
| 46 | `mystery-locations` | 👽 **Luoghi misteriosi**. Triangolo Bermuda, Area 51, Linee di Nazca, Cerchi di Gobekli Tepe, Zona del Silenzio. | `GET` ✦ |
| 47 | `natural-disasters` | 🌪️ **Disastri naturali live**. GDACS + USGS: terremoti, tsunami, uragani, alluvioni, incendi. | `GET` ✦ |
| 48 | `nuclear-facilities` | ☢️ **Impianti nucleari**. Centrali, siti test, depositi scorie con coordinate. | `GET` ✦ |
| 49 | `power-plants` | ⚡ **Centrali elettriche**. Idroelettriche, termiche, solari, eoliche, geotermiche. | `GET` ✦ |
| 50 | `pyramids` | 🔺 **Piramidi mondiali**. Egitto, Messico, Perù, Cina, Sudan, Iraq, Italia. | `GET` ✦ |
| 51 | `radiation` | 📟 **Stazioni monitoraggio radiazioni**. Rete globale sensori radioattività. | `GET` ✦ |
| 52 | `radio-towers` | 📡 **Torri radio**. Trasmittenti notabili: Tokyo Skytree, KVLY-TV, Burj Khalifa, Eiffel. | `GET` ✦ |
| 53 | `ransomware` | 💀 **Ransomware tracker**. Gruppi attivi, varianti, vittime da URLhaus + ThreatFox. | `GET` ✦ |
| 54 | `shipwrecks` | ⚓ **Relitti navali**. Titanic, Bismarck, Lusitania, Andrea Doria, Costa Concordia, Edmund Fitzgerald. | `GET` ✦ |
| 55 | `tor-nodes` | 🧅 **Nodi Tor exit list**. IP nodi Tor attivi da TorProject. | `GET` ✦ |
| 56 | `ufo-reports` | 🛸 **Avvistamenti UFO**. Casi documentati: Roswell, Phoenix Lights, Rendlesham, Tic-Tac, Westall. | `GET` ✦ |
| 57 | `underground-bases` | 🏗️ **Basi sotterranee**. Installazioni militari sotterranee note/presunte: Cheyenne Mountain, Dulce, Area 51, Pine Gap, Raven Rock. | `GET` ✦ |
| 58 | `underground-cities` | 🏙️ **Città sotterranee**. Derinkuyu, Coober Pedy, Montreal RÉSO, Seattle Underground, Setenil de las Bodegas. | `GET` ✦ |
| 59 | `volcanoes` | 🌋 **Vulcani attivi/dormienti**. Da Smithsonian Global Volcanism Program. | `GET` ✦ |
| 60 | `wikipedia-geo` | 📚 **Articoli Wikipedia geolocalizzati**. Cerca pagine Wikipedia con coordinate. | `GET ?q=` ✦ |
| 61 | `entity/expand` | 🔗 **Espansione entità**. Grafo connessioni tra entità (aerei, navi, aziende, persone). | `GET ?id=` |

### API — OSINT Toolkit (31 endpoint intelligence)

| # | Endpoint | Descrizione | Metodo |
|---|----------|-------------|--------|
| 62 | `osint/whois` | ℹ️ **WHOIS dominio/IP**. Registrante, date creazione/scadenza, nameserver. | `GET ?domain=` |
| 63 | `osint/dns` | 🌐 **Record DNS completi**. A, AAAA, MX, NS, TXT, CNAME, SOA via Google DNS-over-HTTPS. | `GET ?domain=` |
| 64 | `osint/doh` | 🛡️ **DNS-over-HTTPS**. Risoluzione DNS crittografata via Google DNS. | `GET ?domain=&type=` ✦ |
| 65 | `osint/ip` | 📍 **Geolocalizzazione IP**. Posizione, ASN, ISP, threat reputation. | `GET ?ip=` |
| 66 | `osint/iprange` | 📐 **Espansione subnet CIDR**. Enumerazione IP in range. | `GET ?cidr=` ✦ |
| 67 | `osint/bgp` | 🔄 **Route BGP**. Prefisso, ASN, peers via RIPEstat. | `GET ?ip= or ?asn=` |
| 68 | `osint/phone` | 📞 **Ricerca numero telefono**. Paese, operatore, tipo linea, validazione. | `GET ?phone=` |
| 69 | `osint/email` | ✉️ **Email OSINT**. Verifica esistenza + breach check. | `GET ?email=` ✦ |
| 70 | `osint/leaks` | 🔓 **Breach email**. Cerca fughe dati via XposedOrNot API. | `GET ?email=` |
| 71 | `osint/cve` | 🐛 **Ricerca CVE**. Vulnerabilità per ID o keyword da NVD API 2.0. | `GET ?cve= or ?keyword=` |
| 72 | `osint/threats` | ⚠️ **Threat intelligence**. Reputazione IP su AbuseIPDB. | `GET ?ip=` |
| 73 | `osint/shodan` | 🔎 **Shodan search**. Dispositivi connessi (richiede SHODAN_API_KEY). | `GET ?query=&page=` |
| 74 | `osint/sweep` | 📡 **IP sweep**. Geolocalizza + scansiona range CIDR (/24-32). | `GET ?ip=&cidr=` |
| 75 | `osint/network-scan` | 🔌 **Scansione porte**. HTTP, SSH, FTP, SMTP, DNS, MySQL, RDP, PostgreSQL, Redis, MongoDB. | `GET ?host=&ports=` ✦ |
| 76 | `osint/certs` | 📜 **Certificati SSL**. Enumerazione subdomini da Certificate Transparency (crt.sh). | `GET ?domain=` |
| 77 | `osint/certstream` | 📋 **Monitoraggio CT log**. Certificate Transparency log search. | `GET ?domain=` ✦ |
| 78 | `osint/mac` | 🖥️ **MAC address lookup**. Vendor, produttore da prefisso MAC. | `GET ?mac=` |
| 79 | `osint/bluetooth` | 📶 **Bluetooth OSINT**. Ricerca dispositivi Bluetooth via database OUI vendor. Categoria, vendor. | `GET ?mac=` ✦ |
| 80 | `osint/sherlock` | 👤 **Sherlock search**. Ricerca username su 300+ piattaforme social via Sherlock API. | `GET ?username=` ✦ |
| 81 | `osint/username` | 🔍 **Username search**. Instagram, Twitter/X, GitHub, Reddit, Telegram. | `GET ?username=` ✦ |
| 82 | `osint/sub-brute` | 🌐 **Subdomain brute-force**. Scoperta sottodomini via wordlist DNS. | `GET ?domain=` ✦ |
| 83 | `osint/permutator` | 🔀 **Permutatore email**. Genera varianti email da nome/cognome/dominio. | `GET ?first=&last=&domain=` ✦ |
| 84 | `osint/hackertarget` | 🎯 **HackerTarget API**. DNS lookup, reverse IP, whois, port scan. | `GET ?query=&type=` ✦ |
| 85 | `osint/urlscan` | 🔗 **URL scan**. Scansione sicurezza URL via urlscan.io. | `GET ?url=` ✦ |
| 86 | `osint/wayback` | 📚 **Wayback Machine**. Snapshot storici di siti web. | `GET ?url=` ✦ |
| 87 | `osint/weather` | 🌤️ **Meteo OSINT**. Condizioni attuali + forecast per target intelligence. | `GET ?lat=&lng=` ✦ |
| 88 | `osint/github` | 💻 **GitHub OSINT**. Repo utente, email da commit, membri organizzazione. | `GET ?username=` |
| 89 | `osint/sanctions` | 🚫 **Sanzioni OFAC SDN**. Ricerca persone, organizzazioni, navi, aerei sanzionati. | `GET ?query=&schema=&limit=` |
| 90 | `osint/correlate` | 🔗 **Correlazione OSINT**. Incrocia dati da email, domini, breach. | `GET ?email=` ✦ |
| 91 | `osint/crypto` | ₿ **Crypto wallet**. Ricerca wallet BTC/ETH via Blockchair (saldo, transazioni). | `GET ?coin=&address=` ✦ |
| 92 | `osint/dns` | 🌐 **DNS lookup**. A/AAAA/MX/NS/TXT/CNAME/SOA via Google DoH. | `GET ?domain=` |

### API — AI e SDK

| # | Endpoint | Descrizione | Metodo |
|---|----------|-------------|--------|
| 93 | `ai/analyze` | 🤖 **Analisi AI**. Analizza intelligence con LLM OpenRouter. Rate: 10 richieste/minuto. | `POST ?query=&context=` |
| 94 | `ai/briefing` | 📝 **Briefing AI**. Genera report intelligence con LLM OpenRouter. Rate: 5/minuto. | `POST ?context=` |
| 95 | `sdk/ingest` | 📦 **SDK ingest**. Polybolos — importa entità JSON nello store condiviso. | `POST` (JSON body) |
| 96 | `sdk/stream` | 📡 **SDK stream**. SSE real-time — aggiornamenti entità in tempo reale. | `GET` (SSE) |

---

### Componenti UI (23 totali)

| # | Componente | Descrizione |
|---|------------|-------------|
| 1 | **AiAnalyst** | 🤖 Interfaccia chat per analisi intelligence con Gemini 2.0 Flash. Pannello stile vetro premium. |
| 2 | **BookmarksPanel** | 🔖 Salva e organizza posizioni mappa preferite (localStorage). Crea categorie e note. ✦ |
| 3 | **CameraViewer** | 📹 Visualizzatore CCTV live stream con HLS, picture-in-picture, modalità fullscreen. |
| 4 | **CorrelationPanel** | 🔗 Pannello correlazione OSINT: Bluetooth discovery, network sweep, esportazione Maltego. ✦ |
| 5 | **EntityGraphPanel** | 🔗 Grafo entità interattivo force-directed. Connessioni tra aerei, navi, aziende, persone. |
| 6 | **ErrorBoundary** | 🛡️ Gestione errori React con fallback UI e nome componente. |
| 7 | **GeoJSONOverlay** | 📐 Upload file GeoJSON come overlay mappa. Salva preset localmente. ✦ |
| 8 | **GlobalStatusBar** | 📊 Barra stato globale: borse aperte/chiuso, rischio paesi, minacce cyber attive. |
| 9 | **IntelFeed** | 📰 Feed intelligence: notizie aggregate con scoring rischio stile SIGINT. |
| 10 | **KeyboardShortcuts** | ⌨️ Dialog scorciatoie tastiera: F (voli), E (terremoti), S (satelliti), D (giorno/notte). |
| 11 | **LayerPanel** | 📋 Pannello laterale per attivare/disattivare 30+ layer mappa intelligence. |
| 12 | **LayerPresets** | 💾 Salva/carica preset di layer configurazioni (localStorage). ✦ |
| 13 | **LiveAlerts** | 🚨 Allerte real-time: news, terremoti, video live con codifica colore (rosso=critico, giallo=medio, verde=basso). |
| 14 | **MarketsPanel** | 💹 Pannello mercati: indici globali, difesa, energia, commodity, crypto ticker. |
| 15 | **OsintPanel** | 🔎 Toolkit OSINT multi-tab: port scanner, DNS lookup, WHOIS, certificati SSL, threat intel, URL scan, subdomain enum. |
| 16 | **OsirisMap** | 🗺️ Mappa interattiva MapLibre GL WebGL. Layer multipli, terminator solare, tracciamento satelliti, click entità. |
| 17 | **ScaleBar** | 📏 Barra scala dinamica che si adatta a zoom e latitudine. |
| 18 | **ScmPanel** | 🔗 Supply chain: rischi fornitori, congestione porti, analisi chokepoint marittimi. |
| 19 | **SearchBar** | 🔍 Barra ricerca geocoding con cronologia, autocomplete, navigazione mappa. |
| 20 | **SearchPanel** | 📑 Pannello risultati ricerca da Wikidata, Wikipedia, Nominatim. ✦ |
| 21 | **SharePanel** | 🔗 Condivisione vista mappa con URL contenente stato layer attivo. |
| 22 | **TimelineSlider** | ⏱️ Filtro temporale 48 ore con play/pausa animazione. ✦ |
| 23 | **ViewPresets** | 🎯 Navigazione rapida: viste globali, regionali, hotspot predefiniti. |

✦ = aggiunto in questo fork

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      OSIRIS CLIENT                        │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────┐   │
│  │  MapLibre   │  │    HUD     │  │   RECON Toolkit  │   │
│  │  GL (WebGL) │  │  30+ Layer │  │   Scanner/DNS/   │   │
│  │  60fps GPU  │  │  UI Panel  │  │   WHOIS/CVE/     │   │
│  │  Render     │  │  Controls  │  │   Crypto/Sherlock│   │
│  └────────────┘  └────────────┘  └──────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  NEW: Bookmarks · Correlation · GeoJSON · Search    │ │
│  │       Timeline · LayerPresets · MaltegoExport       │ │
│  └─────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────┤
│                 NEXT.JS 16 API ROUTES (96 endpoint)       │
│  ┌─────────────── REAL-TIME INTELLIGENCE ──────────────┐ │
│  │  flights · cctv · earthquakes · fires · maritime    │ │
│  │  satellites · weather · radar · news · gdelt        │ │
│  │  space-weather · air-quality · frontlines           │ │
│  └─────────────────────────────────────────────────────┘ │
│  ┌─────────────── GEOGRAPHIC LAYERS (NEW) ─────────────┐ │
│  │  volcanoes · caves · mines · pyramids · meteorites  │ │
│  │  embassies · military-bases · nuclear-facilities    │ │
│  │  balloons · crop-circles · ufo-reports · shipwrecks │ │
│  │  lost-cities · mystery-locations · fault-lines      │ │
│  │  underground-bases/cities · antarctica-anomalies    │ │
│  │  datacenters · ixp · power-plants · radio-towers   │ │
│  │  radiation · tor-nodes · ransomware · weather-alerts│ │
│  │  wikipedia-geo · natural-disasters · cyber-threats  │ │
│  │  malware · airports · maritime-routes · cameras/ita │ │
│  └─────────────────────────────────────────────────────┘ │
│  ┌─────────────── OSINT TOOLKIT ───────────────────────┐ │
│  │  whois · dns · doh · ip · iprange · bgp · phone    │ │
│  │  email · leaks · cve · threats · shodan · sweep     │ │
│  │  network-scan · certs · certstream · mac · bluetooth│ │
│  │  sherlock · username · sub-brute · permutator       │ │
│  │  hackertarget · urlscan · wayback · weather · github│ │
│  │  sanctions · correlate · crypto                     │ │
│  └─────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────┤
│                 EXTERNAL DATA SOURCES                     │
│  OpenSky · USGS · NASA · NOAA · TfL · NVD · GDELT       │
│  GDACS · EONET · FIRMS · N2YO · RSS Feeds · AIS         │
│  Celestrak · Open-Meteo · Nominatim · Wikipedia          │
│  AbuseIPDB · URLhaus · ThreatFox · TorProject            │
│  Sherlock · crt.sh · Blockchair · HackerTarget           │
│  urlscan.io · Wayback Machine · XposedOrNot              │
│  OpenSanctions · IP-api.com · macvendors.co              │
│  Smithsonian · OpenFlights · Copernicus                  │
└──────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisiti
- **Node.js 20+** (consigliato: 22)
- **npm** (incluso con Node.js)
- **Git**

### Installazione

```bash
# Clona questo fork
git clone https://github.com/allelive/osiris.git
cd osiris

# Installa dipendenze
npm install

# Copia template environment (opzionale — funziona anche senza)
cp .env.template .env

# Avvia il server di sviluppo
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000)

### Build Produzione

```bash
npm run build
npm start
```

### Docker

```bash
git clone https://github.com/allelive/osiris.git
cd osiris
cp .env.template .env
docker compose up -d
```

Porta personalizzata in `.env`:
```env
OSIRIS_PORT=3005
```

---

## Dipendenze Complete

| Pacchetto | Versione | Funzione |
|-----------|----------|----------|
| `next` | 16.2.6 | Framework (App Router, Turbopack) |
| `react` / `react-dom` | 19.2.4 | UI Library |
| `maplibre-gl` | 5.24.0 | Motore mappa WebGL |
| `react-map-gl` | 8.1.1 | Bindings React per MapLibre |
| `framer-motion` | 12.38.0 | Animazioni UI |
| `lucide-react` | 1.14.0 | Icone |
| `hls.js` | 1.6.16 | Streaming video HLS |
| `satellite.js` | 7.0.0 | Calcolo posizione satelliti |
| `rss-parser` | 3.13.0 | Parsing feed RSS |
| `ws` | 8.21.0 | WebSocket client (SDK stream) |
| `sharp` | 0.34.5 | Elaborazione immagini |
| `@google/generative-ai` | 0.24.1 | AI Analyst con Gemini |
| `google-libphonenumber` | 3.2.44 | Validazione numeri telefono |
| `react-force-graph-2d` | 1.29.1 | Grafo entità interattivo |
| `tailwindcss` | 4 | CSS utility framework |
| `typescript` | 5 | Type safety |

---

## Project Structure

```
osiris/
├── src/
│   ├── app/
│   │   ├── api/              # 96 endpoint API (Next.js Route Handlers)
│   │   │   ├── flights/      # Voli real-time (OpenSky/adsb.lol)
│   │   │   ├── cctv/         # Telecamere CCTV mondiali
│   │   │   ├── osint/        # Toolkit intelligence (31 endpoint)
│   │   │   ├── ai/           # AI Analyst (Gemini + OpenRouter)
│   │   │   ├── sdk/          # Polybolos SDK
│   │   │   └── ...           # 80+ altri endpoint
│   │   ├── globals.css       # Stili globali
│   │   ├── layout.tsx        # Layout root
│   │   └── page.tsx          # Pagina principale
│   ├── components/           # 23 componenti React
│   │   ├── OsirisMap.tsx     # Mappa interattiva MapLibre
│   │   ├── LayerPanel.tsx    # Pannello layer
│   │   ├── OsintPanel.tsx    # Toolkit OSINT
│   │   ├── AiAnalyst.tsx     # Chat AI
│   │   ├── ...               # Altri componenti
│   └── lib/
│       ├── ai-engine.ts      # Motore AI Gemini
│       ├── maltego-export.ts # Export Maltego CTI
│       └── search-utils.ts   # Utility ricerca
├── public/                   # Asset statici
├── scripts/                  # Script utilità
├── docker-compose.yml        # Docker compose
├── Dockerfile                # Build Docker multi-stage
├── README.md                 # Questo file
└── package.json              # Dipendenze e script
```

---

## Stato Implementazione e Test

### Testato e Funzionante ✅

#### API Intelligence
- `flights`, `earthquakes`, `fires`, `maritime`, `satellites`, `weather`
- `news`, `live-news`, `gdelt`, `cctv` (2000+ telecamere), `frontlines`
- `health`, `stats`, `radar`, `proxy-tiles`, `sentinel`
- `cctv/stream-status`, `infrastructure`, `markets`, `scm-suppliers`, `region-dossier`

#### API Nuovi Layer
- `volcanoes`, `caves`, `mines`, `pyramids`, `meteorites`, `embassies`
- `military-bases`, `nuclear-facilities`, `balloons`, `crop-circles`
- `ufo-reports`, `shipwrecks`, `lost-cities`, `mystery-locations`
- `fault-lines`, `underground-bases/cities`, `antarctica-anomalies`
- `datacenters`, `ixp`, `power-plants`, `radio-towers`, `radiation`
- `tor-nodes`, `ransomware`, `weather-alerts`, `wikipedia-geo`
- `cyber-threats`, `malware`, `air-quality`, `space-weather`

#### OSINT
- `osint/whois`, `osint/dns`, `osint/ip`, `osint/phone`, `osint/bgp`
- `osint/cve`, `osint/mac`, `osint/github`, `osint/sanctions`, `osint/threats`
- `osint/certs`, `osint/leaks`, `osint/sweep`, `osint/shodan`

#### UI
- `AiAnalyst`, `CameraViewer`, `EntityGraphPanel`, `ErrorBoundary`
- `GlobalStatusBar`, `IntelFeed`, `KeyboardShortcuts`, `LayerPanel`
- `LiveAlerts`, `MarketsPanel`, `OsintPanel`, `OsirisMap`, `ScaleBar`
- `ScmPanel`, `SearchBar`, `SharePanel`, `ViewPresets`

### Da Testare 🧪

| Endpoint | Cosa testare | Come testare |
|----------|-------------|--------------|
| `osint/sherlock` | Ricerca username su 300+ piattaforme | `curl /api/osint/sherlock?username=test` |
| `osint/username` | Ricerca su Instagram, Twitter, GitHub | `curl /api/osint/username?username=test` |
| `osint/email` | Verifica email + breach check | `curl /api/osint/email?email=test@test.com` |
| `osint/correlate` | Correlazione email -> domini/breach | `curl /api/osint/correlate?email=test@test.com` |
| `osint/crypto` | Ricerca wallet BTC/ETH | `curl /api/osint/crypto?coin=btc&address=...` |
| `osint/bluetooth` | Ricerca dispositivi Bluetooth via MAC | `curl /api/osint/bluetooth?mac=00:1A:11:00:00:00` |
| `osint/certstream` | CT log search per dominio | `curl /api/osint/certstream?domain=example.com` |
| `osint/doh` | DNS-over-HTTPS lookup | `curl /api/osint/doh?domain=example.com&type=A` |
| `osint/iprange` | Espansione subnet CIDR | `curl /api/osint/iprange?cidr=192.168.1.0/24` |
| `osint/network-scan` | Scansione porte host | `curl /api/osint/network-scan?host=example.com&ports=80,443` |
| `osint/permutator` | Generazione permutazioni email | `curl /api/osint/permutator?first=mario&last=rossi&domain=gmail.com` |
| `osint/sub-brute` | Subdomain brute-force | `curl /api/osint/sub-brute?domain=example.com` |
| `osint/hackertarget` | HackerTarget API proxy | `curl /api/osint/hackertarget?query=example.com&type=dns` |
| `osint/urlscan` | URL scan submission | `curl /api/osint/urlscan?url=https://example.com` |
| `osint/wayback` | Snapshot storici URL | `curl /api/osint/wayback?url=https://example.com` |
| `osint/weather` | Meteo OSINT per target | `curl /api/osint/weather?lat=41.9&lng=12.5` |
| `search` | Ricerca unificata layer | `curl /api/search?q=roma&category=all` |
| `cameras/italy` | Telecamere italiane | `curl /api/cameras/italy` |
| `airports` | Database aeroporti | `curl /api/airports` |
| `country-risk` | Rischio paese | `curl /api/country-risk?country=italy` |
| `entity/expand` | Espansione entità grafo | `curl /api/entity/expand?id=1` |
| `ai/analyze` | Analisi AI intelligence | `POST /api/ai/analyze?query=what+is+this` |
| `ai/briefing` | Briefing AI generazione report | `POST /api/ai/briefing?context=test` |

### Nuovi Componenti UI (da esplorare)

| Componente | Cosa fa |
|------------|---------|
| **BookmarksPanel** | Salva posizioni mappa preferite |
| **CorrelationPanel** | Correlazione dati OSINT + export Maltego |
| **GeoJSONOverlay** | Carica file GeoJSON come overlay |
| **LayerPresets** | Salva/carica preset layer |
| **SearchPanel** | Pannello risultati ricerca avanzata |
| **TimelineSlider** | Filtro temporale 48h |

---

## Come Testare

### Locale
```bash
# Avvia server
npm run dev

# Test endpoint via curl
curl http://localhost:3000/api/volcanoes
curl http://localhost:3000/api/osint/sherlock?username=test
curl http://localhost:3000/api/search?q=roma

# Oppure apri nel browser
open http://localhost:3000
```

### Segnalare Bug o Suggerimenti
1. Apri una issue su [GitHub Issues](https://github.com/allelive/osiris/issues)
2. Specifica l'endpoint testato
3. Allega eventuali errori dalla console browser (F12)

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `F` | Toggle layer voli |
| `E` | Toggle terremoti |
| `S` | Toggle satelliti |
| `D` | Toggle giorno/notte |
| `Escape` | Chiudi pannelli |

---

## Tech Stack

| Layer | Tecnologia |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Linguaggio | TypeScript 5 |
| Mappa | MapLibre GL JS (WebGL GPU) |
| Animazioni | Framer Motion |
| Icone | Lucide React |
| Stili | Custom CSS + Tailwind CSS 4 |
| AI | Google Gemini 2.0 Flash + OpenRouter |
| Streaming | HLS.js per CCTV |
| Deploy | Vercel / Docker |

---

## License

MIT — see [LICENSE](LICENSE) for details.

Codice originale di [simplifaisoul](https://github.com/simplifaisoul). Questo fork estende il lavoro originale con endpoint aggiuntivi, componenti e layer geografici.

---

<div align="center">

**Built on the work of [simplifaisoul](https://github.com/simplifaisoul)** · Fork by [allelive](https://github.com/allelive)

Se trovi utile questo progetto, supporta il creatore originale:

🔗 [Support OSIRIS on Patreon](https://www.patreon.com/posts/159077425)

</div>
