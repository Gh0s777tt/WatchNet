# WatchNet

**Real-time global intelligence dashboard** — AI-powered news aggregation, geopolitical monitoring, infrastructure tracking, and an active OSINT/RECON toolkit in a single situational-awareness interface.

🔗 **Live:** [watchnet.vercel.app](https://watchnet.vercel.app)

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Vercel](https://img.shields.io/badge/Vercel-deployed-black?style=flat&logo=vercel)](https://watchnet.vercel.app)

---

## What this is

WatchNet is a **merge of two open-source intelligence projects** into one product:

| Upstream | Role in WatchNet | Author | License |
|----------|------------------|--------|---------|
| **[World Monitor](https://github.com/koala73/worldmonitor)** | Base platform — map, panels, data pipeline, desktop, AI | Elie Habib | AGPL-3.0 |
| **[OSIRIS](https://github.com/simplifaisoul/osiris)** | Unique modules absorbed — **RECON/OSINT toolkit**, entity intel | simplifaisoul | MIT |

The strategy is **absorption**: World Monitor is the host (it already covers ~70% of OSIRIS's
data layers, more maturely). OSIRIS contributes the capabilities World Monitor lacked —
chiefly an **active reconnaissance toolkit** (WHOIS/RDAP, DNS, IP intel, CVE, certs, threat
lookups) — ported into World Monitor's panel + edge-function architecture.

> The combined work is distributed under **AGPL-3.0** (World Monitor's copyleft absorbs the
> MIT-licensed OSIRIS code). Original copyright notices and attribution are retained.

---

## Merge status

| Capability | Status |
|------------|--------|
| World Monitor base (500+ feeds, dual map, 100+ panels, 24 languages) | ✅ inherited |
| **RECON · WHOIS/RDAP** (`/api/recon/whois` + `ReconPanel`) | ✅ ported & live |
| RECON · DNS / IP intel / CVE / certs / threats / BGP | ⏳ next slices (same pattern) |
| Entity intel (OpenSanctions + Wikidata) | ⏳ planned |
| Crypto wallet trace (BTC/ETH on-chain + OFAC) | 🔨 to build (not in OSIRIS code) |

Architecture note: World Monitor is proto-first (proto → `buf generate` → handler). The first
RECON slice ships as a self-contained edge function registered in
`api/api-route-exceptions.json` (category `deferred`) pending proto migration on a Go-capable
toolchain. See the panel at `src/components/ReconPanel.ts` and the endpoint at
`api/recon/whois.ts`.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
npm run typecheck    # tsc (src + api)
npm run build        # production build → dist/
```

Runtime secrets live in a gitignored `.env.local` (Redis, LLM provider). The app runs with no
keys for most layers; feature-specific sources may require credentials (see `.env.example`).

### Deployment

Deployed on **Vercel** with GitHub-connected CI/CD — every push to `main` triggers an
automatic build and deploy. Cross-instance cache uses **Upstash Redis**. The LLM gateway
(`server/_shared/llm.ts`) accepts any OpenAI-compatible provider via `LLM_API_URL`/`LLM_API_KEY`.

---

## Tech stack

Vanilla TypeScript · Vite · deck.gl + globe.gl + MapLibre · Tauri 2 (desktop) · Convex ·
Protocol Buffers (sebuf) · Vercel Edge Functions · Upstash Redis.

---

## License & attribution

**AGPL-3.0-only.** This is a derivative work. Credit and thanks to the upstream authors:

- **World Monitor** © 2024–2026 Elie Habib — [github.com/koala73/worldmonitor](https://github.com/koala73/worldmonitor)
- **OSIRIS** © simplifaisoul — [github.com/simplifaisoul/osiris](https://github.com/simplifaisoul/osiris)

See [LICENSE](LICENSE) for the full terms.
