<!-- ╔═══════════════════════════════════════════════════════════════╗
     ║   GHOST EMPIRE · WatchNet README — black & red "Netflix" theme ║
     ╚═══════════════════════════════════════════════════════════════╝ -->
<a name="top"></a>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:E50914,100:0B0B0B&height=210&section=header&text=WatchNet&fontSize=78&fontColor=ffffff&fontAlignY=36&desc=Real-Time%20Global%20Intelligence%20%C2%B7%20OSINT%20%2F%20RECON%20Toolkit&descAlignY=58&descSize=17&animation=fadeIn" alt="WatchNet"/>
</p>

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=19&pause=900&color=E50914&center=true&vCenter=true&width=860&lines=Real-Time+Global+Intelligence+Dashboard;15-tool+RECON+%2F+OSINT+toolkit+%E2%80%94+live;OSIRIS+%2B+World+Monitor+%E2%80%94+merged+into+one;Deployed+on+Vercel+%C2%B7+NVIDIA-powered+AI+briefs;Black.+Red.+Production-grade." alt="tagline"/>
</p>

<p align="center">
  <a href="https://watchnet.vercel.app"><img src="https://img.shields.io/badge/%E2%96%B6%20LIVE-watchnet.vercel.app-E50914?style=for-the-badge&logo=vercel&logoColor=white&labelColor=0B0B0B" alt="live"/></a>
  <img src="https://img.shields.io/badge/License-AGPL--3.0-E50914?style=for-the-badge&labelColor=0B0B0B" alt="license"/>
  <img src="https://img.shields.io/badge/RECON-15%20tools-b20710?style=for-the-badge&logo=hackthebox&logoColor=white&labelColor=0B0B0B" alt="tools"/>
  <img src="https://img.shields.io/badge/CI%2FCD-auto--deploy-b20710?style=for-the-badge&logo=githubactions&logoColor=white&labelColor=0B0B0B" alt="cicd"/>
  <img src="https://img.shields.io/badge/part%20of-GHOST%20EMPIRE-8a0a10?style=for-the-badge&labelColor=0B0B0B" alt="ghost empire"/>
</p>

<p align="center"><img src="https://raw.githubusercontent.com/Gh0s777tt/Gh0s777tt/main/assets/divider.svg" width="100%" alt=""/></p>

## ▶ &nbsp; ABOUT THIS ORIGINAL

<table>
<tr><td width="62%" valign="top">

> **WatchNet** is a real-time global intelligence dashboard — a **merge of two
> open-source OSINT projects** into one hardened product: AI-powered news
> aggregation, geopolitical monitoring, infrastructure tracking, and an
> **active 15-tool RECON / OSINT toolkit**.
>
> Built by absorption: **World Monitor** is the host platform; **OSIRIS** brings
> the reconnaissance toolkit it lacked — ported into the panel + edge-function
> architecture and shipped live. Black-and-red, production-grade. 🔴⚫

- 🛰️ &nbsp;**Intelligence** — 500+ feeds, dual map (deck.gl + globe.gl), 80+ map layers
- 🛠️ &nbsp;**RECON toolkit** — 15 live OSINT tools (WHOIS · DNS · IP · CVE · crypto · sanctions · AI brief · graph)
- 🤖 &nbsp;**AI** — analyst briefs grounded in real OFAC SDN data (NVIDIA NIM, OpenAI-compatible)
- ⚡ &nbsp;**Stack** — Vanilla TS · Vite · Vercel Edge · Upstash Redis · Tauri 2

</td><td width="38%" valign="top" align="center">

<img src="https://img.shields.io/badge/TypeScript-0d0d0d?style=for-the-badge&logo=typescript&logoColor=E50914" alt="ts"/>
<img src="https://img.shields.io/badge/Vite-0d0d0d?style=for-the-badge&logo=vite&logoColor=E50914" alt="vite"/>
<img src="https://img.shields.io/badge/Vercel-0d0d0d?style=for-the-badge&logo=vercel&logoColor=E50914" alt="vercel"/>
<img src="https://img.shields.io/badge/Redis-0d0d0d?style=for-the-badge&logo=redis&logoColor=E50914" alt="redis"/>
<img src="https://img.shields.io/badge/NVIDIA-0d0d0d?style=for-the-badge&logo=nvidia&logoColor=E50914" alt="nvidia"/>
<img src="https://img.shields.io/badge/Tauri-0d0d0d?style=for-the-badge&logo=tauri&logoColor=E50914" alt="tauri"/>
<img src="https://img.shields.io/badge/deck.gl-0d0d0d?style=for-the-badge&logo=deckdotgl&logoColor=E50914" alt="deckgl"/>

</td></tr>
</table>

<p align="center"><img src="https://raw.githubusercontent.com/Gh0s777tt/Gh0s777tt/main/assets/divider.svg" width="100%" alt=""/></p>

## 🎬 &nbsp; THE MERGE

| Upstream | Role in WatchNet | License |
|---|---|---|
| **[World Monitor](https://github.com/koala73/worldmonitor)** — Elie Habib | Base platform — map, panels, data pipeline, desktop, AI | `AGPL-3.0` |
| **[OSIRIS](https://github.com/simplifaisoul/osiris)** — simplifaisoul | Absorbed modules — **RECON / OSINT toolkit**, entity intel | `MIT` |

> The combined work ships under **AGPL-3.0** (copyleft absorbs the MIT code).
> Original copyright notices and attribution are retained.

<p align="center"><img src="https://raw.githubusercontent.com/Gh0s777tt/Gh0s777tt/main/assets/divider.svg" width="100%" alt=""/></p>

## 🛠️ &nbsp; RECON TOOLKIT &nbsp;<sub>·&nbsp;15 tools, live &amp; verified</sub>

| # | Tool | Source (keyless) |
|---|------|------------------|
| 01 | **WHOIS** | RDAP + live security-header grade |
| 02 | **DNS** | Google DNS-over-HTTPS |
| 03 | **IP** | ip-api.com geo + reputation |
| 04 | **CVE** | MITRE CVE 5.0 + CIRCL |
| 05 | **CRYPTO** | blockstream + Blockscout + **OFAC SDN** address check |
| 06 | **CERTS** | Certspotter (Certificate Transparency) |
| 07 | **BGP** | RIPEstat (ASN / prefixes) |
| 08 | **SHODAN** | InternetDB (passive ports / CVEs) |
| 09 | **SANCTIONS** | OFAC SDN search — **~20k entities** in Redis |
| 10 | **THREATS** | AlienVault OTX + Tor exit-node check |
| 11 | **LEAKS** | XposedOrNot email-breach |
| 12 | **GITHUB** | profile recon |
| 13 | **MAC** | OUI vendor lookup |
| 14 | **AI BRIEF** | analyst brief grounded in OFAC data (NVIDIA) |
| 15 | **GRAPH** | infrastructure graph (d3-force) — domain → IP → ASN → subdomains |

<p align="center"><img src="https://raw.githubusercontent.com/Gh0s777tt/Gh0s777tt/main/assets/divider.svg" width="100%" alt=""/></p>

## ⚙️ &nbsp; QUICK START

```sh
npm install
npm run dev          # http://localhost:3000
npm run typecheck    # tsc (src + api)
npm run build        # production build → dist/
```

> Runtime secrets live in a gitignored `.env.local` (Redis, LLM provider). Deployed
> on **Vercel** with GitHub-connected CI/CD — every push to `main` auto-builds and
> deploys. The LLM gateway accepts any OpenAI-compatible provider via `LLM_API_URL`.

<p align="center"><img src="https://raw.githubusercontent.com/Gh0s777tt/Gh0s777tt/main/assets/divider.svg" width="100%" alt=""/></p>

## 🏆 &nbsp; STATUS &amp; ATTRIBUTION

<div align="center">

<img src="https://img.shields.io/badge/RECON-15%2F15%20live-E50914?style=for-the-badge&logo=hackthebox&logoColor=white&labelColor=0B0B0B" alt="recon"/>
<img src="https://img.shields.io/badge/AI%20briefs-grounded%20(OFAC)-b20710?style=for-the-badge&logo=openai&logoColor=white&labelColor=0B0B0B" alt="ai"/>
<img src="https://img.shields.io/badge/Crypto%20trace-BTC%20%2F%20ETH%20%2B%20OFAC-b20710?style=for-the-badge&logo=bitcoin&logoColor=white&labelColor=0B0B0B" alt="crypto"/>
<img src="https://img.shields.io/badge/Deploy-Vercel%20Edge-8a0a10?style=for-the-badge&logo=vercel&logoColor=white&labelColor=0B0B0B" alt="deploy"/>

</div>

<br/>

**AGPL-3.0-only.** Derivative work — credit & thanks to the upstream authors:
**World Monitor** © 2024–2026 Elie Habib · **OSIRIS** © simplifaisoul. See [LICENSE](LICENSE).

<br/>

<div align="center">
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:8a0a10,100:e50914&height=110&section=footer&text=%E2%9F%A1%20WATCHNET%20%C2%B7%20GHOST%20EMPIRE&fontColor=ffffff&fontSize=20&fontAlignY=78&desc=Empire%20Forge&descAlignY=92&descSize=12" width="100%" alt="footer"/>

<sub><i>Black. Red. Production-grade. — © GHOST EMPIRE · Empire Forge</i></sub>
</div>
