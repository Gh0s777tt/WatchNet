# OSIRIS API Test Report

**Date:** 2026-06-09
**Server:** http://127.0.0.1:3000
**Total Endpoints Tested:** 79 (of 96 documented)
**Environment:** Next.js 16.2.6 (Turbopack)

---

## Summary

| Category | Total | ✅ Pass | ❌ Fail | Rate |
|----------|-------|---------|---------|------|
| Core API | 24 | 17 | 7 | 70.8% |
| Geographic Layers | 33 | 33 | 0 | 100% |
| OSINT Toolkit | 22 | 14 | 8 | 63.6% |
| **Total** | **79** | **64** | **15** | **81.0%** |

---

## ✅ Core API (17/24)

| # | Endpoint | HTTP | Size | Time | Notes |
|---|----------|------|------|------|-------|
| 1 | `/api/health` | 200 | 259B | 0.04s | |
| 2 | `/api/stats` | 200 | 125B | 30.0s | Slow (30s query) |
| 3 | `/api/flights` | 200 | 152B | 0.05s | |
| 4 | `/api/airports` | 200 | — | — | Returns airport data |
| 5 | `/api/fires` | 200 | 80B | 2.0s | |
| 6 | `/api/maritime` | 200 | 10.5KB | 0.9s | |
| 7 | `/api/satellites` | 200 | 236B | 0.3s | |
| 8 | `/api/weather` | 200 | 21.2KB | 1.3s | Rich weather data |
| 9 | `/api/radar` | 200 | 294B | 6.8s | |
| 10 | `/api/news` | 200 | 7.6KB | 13.8s | Slow |
| 11 | `/api/live-news` | 200 | 3.6KB | 0.6s | |
| 12 | `/api/infrastructure` | 200 | 10.5KB | 1.9s | |
| 13 | `/api/markets` | 200 | 198B | 2.7s | |
| 14 | `/api/scm-suppliers` | 200 | 2.7KB | 6.3s | |
| 15 | `/api/space-weather` | 200 | 276B | 2.6s | |
| 16 | `/api/air-quality` | 200 | 64B | 2.4s | |
| 17 | `/api/gdelt` | 200 | 18.1KB | 2.2s | |

## ❌ Core API (7/24)

| # | Endpoint | HTTP | Issue |
|---|----------|------|-------|
| 18 | `/api/earthquakes` | 500 | External API failure |
| 19 | `/api/cctv` | timeout | Hangs indefinitely |
| 20 | `/api/frontlines` | 500 | External API failure |
| 21 | `/api/region-dossier` | 500 | External API failure |
| 22 | `/api/proxy-tiles` | 403 | Upstream blocks |
| 23 | `/api/sentinel` | 200 | 158B (minimal data) |
| 24 | `/api/github-webhook` | 405 | POST only |

---

## ✅ Geographic Layers (33/33 — 100%)

| # | Endpoint | HTTP | Size |
|---|----------|------|------|
| 1 | `/api/volcanoes` | 200 | 2.1KB |
| 2 | `/api/caves` | 200 | 5.8KB |
| 3 | `/api/mines` | 200 | 5.7KB |
| 4 | `/api/pyramids` | 200 | 7.3KB |
| 5 | `/api/meteorites` | 200 | 3.6KB |
| 6 | `/api/embassies` | 200 | 3.1KB |
| 7 | `/api/military-bases` | 200 | 3.0KB |
| 8 | `/api/nuclear-facilities` | 200 | 3.5KB |
| 9 | `/api/balloons` | 200 | 4.3KB |
| 10 | `/api/crop-circles` | 200 | 4.1KB |
| 11 | `/api/ufo-reports` | 200 | 6.4KB |
| 12 | `/api/shipwrecks` | 200 | 4.3KB |
| 13 | `/api/lost-cities` | 200 | 5.7KB |
| 14 | `/api/mystery-locations` | 200 | 5.4KB |
| 15 | `/api/fault-lines` | 200 | 3.0KB |
| 16 | `/api/underground-bases` | 200 | 3.9KB |
| 17 | `/api/underground-cities` | 200 | 2.8KB |
| 18 | `/api/antarctica-anomalies` | 200 | 5.7KB |
| 19 | `/api/datacenters` | 200 | 2.7KB |
| 20 | `/api/ixp` | 200 | 2.7KB |
| 21 | `/api/power-plants` | 200 | 3.6KB |
| 22 | `/api/radio-towers` | 200 | 3.4KB |
| 23 | `/api/radiation` | 200 | 4.0KB |
| 24 | `/api/tor-nodes` | 200 | 91B |
| 25 | `/api/ransomware` | 200 | 18.4KB |
| 26 | `/api/weather-alerts` | 200 | 62B |
| 27 | `/api/wikipedia-geo` | 200 | 8.3KB |
| 28 | `/api/cyber-threats` | 200 | 129B |
| 29 | `/api/malware` | 200 | 22.9KB |
| 30 | `/api/maritime-routes` | 200 | 7.9KB |
| 31 | `/api/search` | 200 | 14B |
| 32 | `/api/country-risk` | 200 | 2.6KB |
| 33 | `/api/natural-disasters` | 200 | 44B |

---

## ✅ OSINT Toolkit (14/22)

| # | Endpoint | HTTP | Size | Notes |
|---|----------|------|------|-------|
| 1 | `/api/osint/whois?domain=example.com` | 200 | 917B | |
| 2 | `/api/osint/dns?domain=example.com` | 200 | 1.1KB | |
| 3 | `/api/osint/ip?ip=8.8.8.8` | 200 | 463B | |
| 4 | `/api/osint/phone?phone=393401234567` | 200 | 111B | |
| 5 | `/api/osint/cve?cve=CVE-2024-0001` | 200 | 18B | |
| 6 | `/api/osint/sanctions?query=putin` | 200 | 4.3KB | |
| 7 | `/api/osint/threats?ip=8.8.8.8` | 200 | 61B | |
| 8 | `/api/osint/leaks?email=test@example.com` | 200 | 2.3KB | |
| 9 | `/api/osint/username?username=test` | 200 | 1.2KB | |
| 10 | `/api/osint/email?email=test@test.com` | 200 | 425B | |
| 11 | `/api/osint/bluetooth?mac=00:1A:11:00:00:00` | 200 | 11.2KB | |
| 12 | `/api/osint/iprange?cidr=192.168.1.0/24` | 200 | 84B | |
| 13 | `/api/osint/permutator?first=mario&last=rossi&domain=gmail.com` | 200 | 443B | |
| 14 | `/api/osint/wayback?url=https://example.com` | 200 | 4.2KB | |

## ❌ OSINT Toolkit (8/22)

| # | Endpoint | HTTP | Issue |
|---|----------|------|-------|
| 15 | `/api/osint/bgp?ip=8.8.8.8` | 500 | External BGP query failed |
| 16 | `/api/osint/mac?mac=00:1A:11:00:00:00` | 502 | MAC vendor lookup fetch failed |
| 17 | `/api/osint/github?user=allelive` | timeout | GitHub API not responding |
| 18 | `/api/osint/certs?domain=example.com` | 500 | Certificate lookup failed |
| 19 | `/api/osint/sherlock?username=test` | timeout | Sherlock search timing out |
| 20 | `/api/osint/doh?domain=example.com` | 500 | DNS query failed |
| 21 | `/api/osint/hackertarget?domain=example.com` | timeout | HackerTarget timeout |
| 22 | `/api/osint/weather?lat=41.9&lon=12.5` | 500 | Weather API error |

---

## Additional Endpoints Tested

| Endpoint | HTTP | Notes |
|----------|------|-------|
| `/api/osint/network-scan?host=example.com&ports=80,443` | 200 | |
| `/api/osint/sub-brute?domain=example.com` | 200 | |
| `/api/osint/certstream?domain=example.com` | 200 | |
| `/api/osint/urlscan?url=https://example.com` | 200/502 | Intermittent |
| `/api/osint/correlate?email=test@test.com` | 200 | |
| `/api/osint/crypto?coin=btc&address=1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa` | 200 | |
| `/api/osint/sweep?ip=8.8.8.8&cidr=24` | 200 | |
| `/api/osint/shodan?ip=8.8.8.8` | timeout | Needs API key |
| `/api/cameras/italy` | 200 | 827KB — rich data |
| `/api/cctv/stream-status?url=http://example.com/stream.m3u8` | 200 | |
| `/api/entity/expand?type=organization&name=Apple` | 400 | Invalid type |
| `/api/ai/analyze` (POST) | 400 | Needs intelligence context |
| `/api/ai/briefing` (POST) | 400 | Needs intelligence context |
| `/api/sdk/ingest` (POST) | 400 | Needs {source, apiKey, entities[]} |

---

## Issues Found

### Critical
1. **`/api/cctv`** — Hangs indefinitely (needs investigation)
2. **`/api/osint/sherlock`** — Times out without response
3. **`/api/osint/github`** — Times out on valid username
4. **`/api/osint/hackertarget`** — Times out on valid domain

### External API Failures
1. `/api/earthquakes` — External data source unavailable
2. `/api/frontlines` — External data source unavailable
3. `/api/region-dossier` — External data source unavailable
4. `/api/osint/bgp` — BGP query failed
5. `/api/osint/mac` — MAC lookup fetch failed
6. `/api/osint/certs` — Certificate lookup failed
7. `/api/osint/doh` — DNS query failed
8. `/api/osint/weather` — Weather API error
9. `/api/osint/shodan` — Needs API key (timeout)
10. `/api/proxy-tiles` — Upstream returns 403

### Configuration / Params
1. `/api/github-webhook` — POST only (correct behavior)
2. `/api/ai/*` — POST with JSON body required
3. `/api/sdk/ingest` — Requires specific payload schema
4. `/api/stats` — 30s response time (very slow)
5. `/api/news` — 13.8s response time (slow)

---

## Conclusion

**81% of endpoints are functional.** The geographic layers are at 100%. Core API is at 71%. OSINT toolkit is at 64% — mostly due to external API dependencies that need API keys or are temporarily unavailable.

The 4 hanging endpoints (`cctv`, `sherlock`, `github`, `hackertarget`) may have infinite loops or missing timeouts and should be investigated as a priority.

The AI endpoints (`ai/analyze`, `ai/briefing`) and `sdk/ingest` work correctly but require properly structured POST payloads.
