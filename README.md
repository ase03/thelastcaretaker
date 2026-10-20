# The Last Caretaker - Build Optimizer

A web-based profession build optimizer for [The Last Caretaker](https://store.steampowered.com/app/2722340/The_Last_Caretaker/). Select a profession and instantly get the optimal combination of Food and Memory items to meet its stat requirements with the minimum total items.

**Live:** [thelastcaretaker.chorestory.com](https://thelastcaretaker.chorestory.com)

## Features

### Build Optimizer (`/`)
- **40 Professions** across 10 categories (Engineer, Military, Science, etc.), each with 4 tiers
- **ILP Optimization** — uses integer linear programming to find the minimum items needed
- **Food Optimization** — computes optimal food items for physical stats (Weight, Height, Life Exp., Strength, Intellect)
- **Save Scarce food strategy** — allows up to 25% more portions than Fewest Food and caps shark-derived materials at the larger of 7 or their Fewest Food use. It then minimizes calcium (Bio Dark), vitamin D (Bio Light), and advanced materials (Bio Flesh), prefers varied common recipes, and finally minimizes portions
- **Memory Optimization** — computes optimal memory items for psychological traits (Adaptability, Creativity, Communication, etc.)
- **Dual Memory Strategies** — tab toggle between:
  - **Fewest Items** — minimizes total memory item count
  - **Fewest Types** — minimizes the number of distinct memory types used (via big-M ILP), allowing more copies of fewer items
- **Crafting Materials** — shows total ingredients needed to craft the recommended food items
- **Item Icons** — all 55 item icons sourced from the [wiki](https://thelastcaretaker.wiki.gg)
- **Instant Results** — all computation runs client-side, no server round-trips

### Inventory Mode (`/inventory`)
- **Memory Inventory** — set quantities for each of the 33 memory items you have available
- **Profession Ranking** — see all 40 professions ranked by achievability:
  - **Achievable** professions show the minimum memories needed from your inventory plus food items and crafting materials
  - **Partial** professions show trait coverage percentage and specific shortfalls
- **Persistent Inventory** — quantities are saved to localStorage and persist across page changes and browser refreshes

## Tech Stack

- **SvelteKit 2** + **Svelte 5** + **TypeScript** — SPA with runes and adapter-node API
- **javascript-lp-solver** — pure JS integer linear programming solver
- **nginx** — sole public entry point; Node is internal to Docker

## Game Data

| Data | Count |
|------|-------|
| Food Items | 13 |
| Memory Items | 33 |
| Crafting Ingredients | 9 |
| Professions | 40 (10 categories x 4 tiers) |

All data verified against raw wikitext from [thelastcaretaker.wiki.gg](https://thelastcaretaker.wiki.gg).

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Docker Deployment

```bash
docker compose up -d --build
```

Serves on port **80** at `http://tlc.aqua.lan`; ensure this LAN name resolves to the VM.
Only Nginx publishes a host port. `app` is a single Node process on the Compose network.
Keep both existing World Catalog directories under `data/`; the new writable bind is
`data/player-states`. No database or published-state history is created.

From the existing repository directory on the VM, the user deploys manually:

```bash
git status --short
git fetch origin
git merge --ff-only origin/main
mkdir -p data/player-states
docker compose config
docker compose up -d --build --remove-orphans
docker compose ps
curl -i http://tlc.aqua.lan/api/players
```

Stop on unexpected local changes or a non-fast-forward merge. The Compose update replaces
the old static container, changes 3080 to 80, and starts the internal Node application.
Nginx retains catalog aliases, proxies `/api/` without caching, and proxies pages/assets
to Node. Do not expose port 3000. `ORIGIN` must match the LAN site URL if the hostname changes.

### Full publication and verification

`PUT /api/players/<17-digit SteamID>/state` accepts the existing strict Full v1 JSON,
unchanged. The URL and metadata SteamID must agree. Both Nginx and Node limit requests
to 64 MiB (67,108,864 bytes). A retained enriched Full from build 25982825 was checked
at 38,555,210 bytes; no new save extraction is required for transport.

First publication requires `If-None-Match: *`; replacement requires the current GET's
`ETag` in `If-Match`. Exact byte repeats return 200 without writing, including retries
with an old precondition. Changed bytes with the same generation, an older source mtime,
or equal mtime with a different source SHA return 409. A stale precondition returns 412.
One active publisher per SteamID is assumed: mtime is a file ordering policy, not a
game clock or cross-PC chronology. Do not automatically force/rebase conflicting uploads.
API responses use `Cache-Control: no-store`.

On a machine with a confirmed current-contract Full, substitute its SteamID and path:

```bash
curl -i -X PUT 'http://tlc.aqua.lan/api/players/76561198436735921/state' \
  -H 'Content-Type: application/json' -H 'If-None-Match: *' --data-binary @full.json
curl -i 'http://tlc.aqua.lan/api/players/76561198436735921/state'
curl -i 'http://tlc.aqua.lan/api/players'
```

For replacement use `-H 'If-Match: "<GET ETag hash>"'` instead of If-None-Match.
On Windows use `curl.exe`; the command above is shell syntax for the VM or another Unix
client. Prefer the Agent's automatic sender for ordinary use. A manual identical repeat
must return 200; malformed Full/SteamID must be rejected while the prior GET stays intact.

Open `/map`, select a listed SteamID, check the source label and personal POI/finds;
use **Обновить список** / **Обновить Full** to refresh. Switch quickly between players,
then import a local Full: the last selection wins. Failed player loads leave the personal
layer empty. Static POI/icons and local 3D remain available. No polling or upload occurs
from the map; manual files stay in browser memory. This LAN API has no authentication.

### Checks without a running server

```bash
npm ci
npm run check
npm test
npm run build
npm run test:api
```

The built API test calls SvelteKit directly with Request/Response objects: no listening
server, Docker or browser is started. Player switching/manual-import races use the same
loader as `/map`; rendering is checked by svelte-check and production compilation.

## Project Structure

```
src/
├── app.html                    # HTML shell
├── app.css                     # Global dark sci-fi theme
├── lib/
│   ├── types.ts                # TypeScript interfaces
│   ├── solver.ts               # ILP optimizer (food + memories + inventory)
│   ├── data/
│   │   ├── food.ts             # 13 food items with stats + ingredients
│   │   ├── memories.ts         # 33 memory items with trait values
│   │   └── professions.ts      # 40 professions with requirements
│   └── components/
│       ├── ProfessionPicker.svelte    # Category/Profession dropdowns
│       ├── ResultsPanel.svelte        # Build results with tab toggle
│       ├── StatsTable.svelte          # Achieved vs Required comparison
│       ├── FoodBreakdown.svelte       # Food items + crafting materials
│       ├── MemoryBreakdown.svelte     # Memory items breakdown
│       ├── InventoryGrid.svelte       # Memory quantity input grid
│       └── ProfessionRanking.svelte   # Ranked profession results
└── routes/
    ├── +page.svelte             # Build Optimizer page
    └── inventory/
        └── +page.svelte         # Inventory Mode page
```
