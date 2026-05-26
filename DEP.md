# DEP Breach Intelligence Integration

This document covers configuration and usage of the [Double Extortion Platform (DEP)](https://doubleextortion.com) integration in OSIRIS.

DEP adds two features to the dashboard:

- **Breach Events map layer** — victim companies from the DEP privlist plotted as geo-points, colored by threat type (ransomware, privacy breach, DDoS, etc.)
- **DEP Threat Search panel** — keyword or domain search against the CTR Search API, displayed in the right HUD

---

## Prerequisites

You need an active DEP subscription. Contact DEP to obtain:

- An **API key** (`x-api-key` header)
- An **AWS Cognito Client ID** for your account
- Either a **refresh token** (recommended) or your **username + password**

---

## Environment Variables

Add these to your `.env` (local) or Vercel / Docker environment:

```env
# Required
DEP_API_KEY=                   # Your DEP API key
DEP_API_ENDPOINT=https://api.eu-ep1.doubleextortion.com/v1
DEP_AUTH_ENDPOINT=https://auth.eu-ep1.doubleextortion.com/
DEP_CLIENT_ID=                 # Cognito app client ID (provided by DEP)

# Authentication — provide EITHER the refresh token OR username + password
DEP_REFRESH_TOKEN=             # Recommended: Cognito refresh token
DEP_USERNAME=                  # Alternative: your DEP login email
DEP_PASSWORD=                  # Alternative: your DEP login password

# Optional privacy control
DEP_HIDE_VICTIM_NAME=true      # Set to "true" to redact victim names and domains
```

If `DEP_API_KEY` or `DEP_AUTH_ENDPOINT` are not set, both features silently return `503` and the layer toggle has no effect — no errors are shown to end users.

### Victim name redaction

Set `DEP_HIDE_VICTIM_NAME=true` to redact identifying information before it reaches the browser. When active:

| Field | Privlist layer | Search panel |
|-------|---------------|--------------|
| `victim` | `[REDACTED]` | `[REDACTED]` |
| `site` / `domain` | `null` | `null` |
| `victimAddress` | `null` | — |
| `annLink` | — | `null` |

Sector, actor, country, city, and date are **not** redacted — they are useful for threat analysis without identifying a specific organisation. This mode is intended for demo deployments, analyst training environments, or any context where victim identity must not be exposed.

### Authentication flow

OSIRIS uses the AWS Cognito `InitiateAuth` endpoint to obtain an `IdToken`. The token is cached in-memory for 55 minutes and refreshed automatically before it expires.

| Variable | Auth flow used |
|----------|---------------|
| `DEP_REFRESH_TOKEN` set | `REFRESH_TOKEN_AUTH` — preferred, no password in env |
| `DEP_USERNAME` + `DEP_PASSWORD` set | `USER_PASSWORD_AUTH` — fallback |
| Neither set | Server returns `500` on first request |

---

## Enabling the map layer

1. Start OSIRIS with the env vars above set
2. Open the **Layers** panel (left HUD)
3. Expand **THREATS & INFRA**
4. Toggle **DEP Breach Events** on

The layer fetches the last 30 days of privlist data across the `ext`, `prv`, and `dds` datasets by default, then refreshes every 30 minutes.

### Customising the fetch

The privlist endpoint accepts query parameters you can pass directly:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `ts` | 30 days ago | Start date `YYYY-MM-DD` |
| `te` | today | End date `YYYY-MM-DD` |
| `dset` | `ext,prv,dds` | Comma-separated dataset codes |

Example — last 90 days, extortion only:
```
/api/dep/privlist?ts=2026-02-25&te=2026-05-26&dset=ext
```

### Dataset color coding

| Code | Label | Map color |
|------|-------|-----------|
| `ext` | Ransomware / Extortion | Red `#FF3D3D` |
| `prv` | Privacy breach | Orange `#FF9500` |
| `dds` | DDoS | Yellow `#FFD700` |
| `nws` | Open news | Cyan `#00E5FF` |
| `vnd` | Vandalism | Purple `#E040FB` |
| `frm` | Underground forum | Green `#00E676` |

---

## DEP Threat Search panel

The search panel is always visible in the right HUD, regardless of whether the map layer is active.

1. Choose **KEYWORD** or **DOMAIN** mode
2. Select a dataset from the dropdown
3. Type your query and press Enter (or click the search button)

**Keyword** — searches by company name fragment (e.g. `bank`, `hospital`)  
**Domain** — searches by domain name (e.g. `example.com`; comma-separate for multiple)

Results show: victim name, threat actor, date, sector, location, and a link to the original source announcement.

---

## Geocoding

The map layer uses the extended privlist response fields (`victimCity`, `victimCC`) to place victims on the map. Resolution happens in two tiers:

| Tier | Source | Jitter |
|------|--------|--------|
| **City-level** | Built-in lookup table (~300 cities) matched on `victimCity:victimCC` | ±0.3° |
| **Country-level** | Country centroid from ISO 2-letter code | ±0.8° |

The popup for each dot shows which tier was used (`📍 CITY-LEVEL` or `🌍 COUNTRY-LEVEL`).

Victims with no usable location (`victimCC` is null) are silently dropped from the map.

### Adding cities to the lookup

The city table lives in `src/app/api/dep/geocode.ts`. Entries use the format:

```typescript
'city_name_lowercase:CC': [longitude, latitude],
```

Example:
```typescript
'turin:IT': [7.6869, 45.0703],
'lausanne:CH': [6.6322, 46.5196],
```

---

## Vercel deployment

`vercel.json` already sets `maxDuration: 30` for all API routes, which covers the privlist fetch time on a Pro plan. If you are on a Hobby plan (10s limit) consider reducing the number of datasets queried at once.

Set all `DEP_*` variables under **Settings → Environment Variables** in your Vercel project dashboard.

---

## Docker / self-hosted

Pass the variables via your `.env` file or `docker compose` environment block:

```yaml
environment:
  DEP_API_KEY: "your-key"
  DEP_API_ENDPOINT: "https://api.eu-ep1.doubleextortion.com/v1"
  DEP_AUTH_ENDPOINT: "https://auth.eu-ep1.doubleextortion.com/"
  DEP_CLIENT_ID: "your-cognito-client-id"
  DEP_REFRESH_TOKEN: "your-refresh-token"
```

See [DOCKER.md](DOCKER.md) for the full self-hosting guide.

---

## API routes reference

| Route | Method | Description |
|-------|--------|-------------|
| `/api/dep/privlist` | GET | Fetch geocoded victim list for the map layer |
| `/api/dep/search` | GET | Keyword or domain search (CTR Search API proxy) |

Both routes return `503` with `{ error: "DEP integration not configured" }` when credentials are absent, and `500` with `{ error: "..." }` on upstream failures.
