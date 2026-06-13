# OSIRIS GitHub Pages

This folder contains the static GitHub Pages shell for OSIRIS.

Public Pages URL:

https://deerspotter.github.io/osiris-v2/

It provides a static Pages compatible OSIRIS command dashboard:

- OSIRIS splash boot sequence
- `# OSIRIS` global intelligence command header
- Zulu clock, feed count, uptime, system status
- 2D map / satellite tabs
- tactical network map visual
- SDK / Aviation / Maritime / Surveil / Hazard / Threat / Network / Display / Ghost Protocol rail
- coordinate, location, zoom, scale and shortcut HUD

The production Next.js app still lives in `src/` and keeps the API backed features. This `docs/` build is intentionally static so it can run on GitHub Pages without a Node server.