# TLC Hub Map prototype

Existing checkout, branch `local`; static SvelteKit / Docker configuration retained.

Run `npm install`, `npm run dev`, open http://localhost:5173/map.
Production: `npm run build`; `npm run preview` (http://localhost:4173/map).
Publish from the existing server checkout with `docker compose up -d --build` after separately authorized transfer of the commit. No push/deploy performed here.

## Local import

JSON object: `schemaVersion: 1`, `units: "UE-cm"`, `pois: [...]`.
Each POI needs `id`, `name`, `world: {x, y, z}`, `source`, `gameBuild`,
`knowledge: "known"`, `accuracy`, `layer: "poi"`, `visibility: "local"`.
Coordinates are finite numbers in raw UE centimetres, Z is a number or null.
IDs must be unique. Maximum 1000 records / 2 MB. Import is transactional;
invalid input leaves previous records intact. No network upload or persistence.
The importer validates structure, not the truth of the supplied knowledge assertion.
Never import a hidden catalog for public distribution.

`tools/export-known-pois.mjs` is an offline adapter for the existing reviewed
50-record TLC Hub anchor set, not a save parser. It verifies the known root-locator
provenance and strips internal paths and all unrelated fields. Missing localized
names use the exact asset identifier rather than inventing a display name.
Canonical IDs identify the build and full world locator component path; they are
locator identities, not an asserted cross-build asset identity.

Run with Node 22.18+:
`node --experimental-strip-types tools/export-known-pois.mjs INPUT OUTPUT 25827816`
Output must be outside the checkout. The verified local source contains 49 serialized
discoveries and one explicitly known Lazarus locator. The build is Update 6 / 25827816.
Private exports and campaign discovery lists must not be committed or bundled.

## Rendering and future layers

Raw XYZ are immutable CPU Number records. The adapter uses metres in Three.js:
`scene = ((X-Ox)/100, (Z-Oz)/100, (Y-Oy)/100)`.
Unknown Z stays null; top-down DOM glyphs are only XY projections.
Every view update rebases the origin to the double-precision camera centre, builds
only visible grid lines, and reconstructs the local camera. Subtraction happens
before Float32 conversion. No affine/raster transform. +X right, +Y down; no compass
or sea-level claim. Z=0 is an arbitrary projection reference.

The camera width ranges from 10 UE units (10 cm) to 1e9 UE units. At Full HD,
1 UE-unit grid spacing is reachable and clearly separated on screen. Coordinate
extent ±1e12 UE units protects arithmetic; it is not an asserted game boundary.
The 1/2/5 major grid and minor lines scale with the viewport, not world area.
The renderer draws only when dirty and disposes GPU resources, observers and input
handlers on navigation. Marker projections use double precision before DOM pixels.
Overlapping glyphs remain distinct records and can be selected through the list.
Shared World/SpatialRecord types retain XYZ/provenance/visibility for future layers;
geometry extraction, tilt, height filtering and perspective rendering are deferred.

## Checks

`npm test`: coordinate roundtrip, origin rebasing, 1 cm at large coordinates,
orientation, nullable Z, cursor anchored zoom, unchanged raw values, import policy.
`npm run test:ui`: Chromium Full HD regression of /, /inventory, /map, empty state,
synthetic import, exact coordinates, focus, drag, zoom and 1 cm grid.
Optional `TLC_MAP_LOCAL_JSON` adds real 50-POI import, narrow viewport and continuous
wheel benchmark at overview and 8/16 zoom steps. Synthetic records are test-only.

Observed on this machine in headless Chromium with 50 real POI:
mean frame interval 17.26 / 16.56 / 16.55 ms; p95 18.3 / 18 / 18 ms respectively.
These include browser scheduling and are not GPU timings or universal FPS promises.
An idle map does not redraw the WebGL scene. No 1k/10k/50k scalability claim.

Production build and both browser checks passed. Coordinate tests: 8 passed.
`svelte-check` reports 47 existing errors, all in unchanged `src/lib/solver.ts`;
no errors reported in map files. Dependency audit reports 11 issues in the existing
application dependency tree; no unrelated dependency upgrades were applied.

No geographic raster, game geometry or public POI catalog is supplied. The local
known set works now; future geometry and unknown locations require separate data
and disclosure decisions. There is no blocking data dependency for the grid MVP.
