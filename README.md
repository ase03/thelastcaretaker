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

- **SvelteKit 2** + **Svelte 5** + **TypeScript** — static SPA with runes (no server runtime)
- **javascript-lp-solver** — pure JS integer linear programming solver
- **nginx** — static file serving in Docker

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

Serves on port **3080**.

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
