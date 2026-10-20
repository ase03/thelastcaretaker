# TLC Hub Map

The existing SvelteKit/Three.js frontend provides `/map`, the build optimizer and
inventory calculator. Build with `npm run build`.

## Independent world map

Opening `/map` requests one compact `/world-catalog/25982825/pois.json` projection:
116 authored static root placements, without importing Full. Each identity is the
complete ComponentPath, with unchanged world XYZ. Primary titles come from
LocationAsset.Properties.Name; differing component DisplayName is retained as
additional text (for example Eden Cradle / Seed Vault 2). Lazarus is included.
The 12 unplaced definitions and 309 historical teleport destinations are excluded.

`tools/catalog-view.mjs` extends the existing deploy-time projection. It selects
exact actor.RootComponent and LocationAsset bindings, verifies unattached roots,
complete finite XYZ and primary titles, and requires 116 placements for this build.
Icons follow component OverrideIndicator → effective Config.Type Location →
Icons entry → explicit Texture2D binding → one original PNG. Missing bindings or
images never remove a coordinate-confirmed POI; unresolved icons use the standard
marker. Asset config replaces inline config; no scalar merge. Pishon has no
serialized ConfigAsset reference and uses its observed inline Location config for
this static projection. Its game ShowInMap=0 does not hide the overview POI.

The updated catalog provides all 116 icons from 24 original textures. The browser
receives the small POI projection and PNGs, never the 15 MB catalog or a world
index. No component-only reference files duplicate the static projection.

Once loaded from the API or a manual file, Full stays in page memory. Its confirmed POI knowledge joins the base
only by exact ComponentPath and matching reviewed catalog build, preserving base
identity, title and coordinates. No match means unknown knowledge, never unopened.
A green outline indicates confirmed Full knowledge; static presence is not a
save fact. Additional unmatched confirmed Full POIs remain visible. Importing
another Full replaces personal knowledge, not the static roster. Findings, 200 m
areas, local 3D and saved global camera return use the existing mechanisms.

Item references still use small hashed JSON files, at most six concurrent
requests. Exact definition names update the list, local marker labels and item
heading; stale responses are ignored and missing names retain technical text.
Within a local findings area, exact item icons appear in the list, scene markers
and the existing reference card. Missing references or failed PNGs retain the
standard marker and resolved name. Local scene badges show ×N for quantities
greater than one; the list always shows the exact quantity. Global world/POI
and area markers are unchanged and never receive item icons. The accepted Full, occurrence
IDs, coordinates, groups and ownership evidence remain untouched.

## Data delivery on the existing Linux VM

Compose now runs Nginx on host port **80** and one internal Node application on
port 3000. Nginx retains read-only catalog/view mounts and proxies pages/assets
and uncached `/api/` to Node. Writable `data/player-states` retains one latest Full
per SteamID64 across rebuilds; no database or published-state history exists.
All `data/` remains outside Git and Docker context. Only allowed reference URLs
are served; the full catalog stays unavailable.

The exact user-run VM deployment sequence and checks are maintained in
[README deployment](README.md#docker-deployment). The local catalog source is
`C:/Users/aseco/Voyage-TLC/Static/WorldCatalog/25982825/catalog.json`; the user transfers
it and any required original PNGs to the VM's existing
`/home/w10/thelastcaretaker/data/world-catalog/25982825/` tree before regenerating views.
The map URL is `http://tlc.aqua.lan/map`. A source update does not confirm deployment;
no VM or SMB access is part of this documentation update.

## Published Full selection

The map loads `/api/players` and offers SteamID64 selection and explicit list/Full
refresh. Selection GETs `/api/players/<SteamID64>/state`, using the same strict Full
reader as manual import and checking the selected SteamID. The latest selection/import
wins even if an earlier response arrives later. Player loading clears personal data
first; a failed load cannot show the previous player's layer. Invalid manual import
preserves the accepted view. Neither path polls or uploads from the browser. Full
bytes and projection stay in page memory; static POIs/icons remain independent.
SteamID selection is not authentication.

## Local Full v1 import

Select the official `full.json` with the file picker. The only accepted root contract is
`schema: "tlc-full-snapshot/1"`, `representation: "full"`. Scanner, experimental
MapSnapshot/POI exports and other versions are rejected. No Scanner file is required.
SHA-256 verification uses WebCrypto when available and the local `@noble/hashes`
SHA-256 implementation otherwise, including ordinary HTTP. Both hash the same UTF-8
sourceRecord bytes and verify the full stable ID; no server or certificate change is needed.
The complete accepted document and its exact JSON text remain in page memory, separately
from the derived map projection. Reload discards them. Nothing is uploaded or stored in
localStorage. Invalid imports leave the previously accepted snapshot, view and selection intact.

`full-snapshot.ts` validates the source and identity metadata, units/coordinate contract,
retained evidence and explicit nulls, stable IDs (SHA-256 of UTF-8 sourceRecord), unique
object/POI identities, finite admissible coordinates, qualification and applicable coverage
counts. Optional additional keys are retained without interpretation. Large integers supplied
as strings remain strings. Unsafe numeric integers are rejected instead of silently rounded.
Quantities in the display projection use BigInt, including aggregate totals.
The coordinate safety bound ±1e12 cm protects renderer arithmetic; it is not a game boundary.
There are no legacy record-count or 16 MB import limits.

`projectFull` in `snapshot.ts` creates the derived display view. Only POIs with serialized
discovery and static root world-coordinate evidence are known POIs. Object markers require
validated xyz, world-space spatial-cell corroboration, confirmed selective-contract confidence,
positive units and the producer's scannerCategory. Category and player-storage exclusions
are checked locally. Producer eligibility also encapsulates its procedural-buoy exclusions;
the browser does not rederive missing containment evidence. Raw coordinateObservation values
never authorize a marker. The reader does not infer ownership or decode retained raw states.

Finds use deterministic 200×200 m XY display cells, with all exact member XYZ preserved
for local 3D. Cell boundaries may split nearby finds; equal cells do not imply a common
structure. No nearest-POI assignment, geometric inference or building membership is asserted.
Derived group/item markers carry knowledge=unknown; only confirmed POIs carry knowledge=known.
The default global view shows the static world plus confirmed Full knowledge; a toggle adds one marker per display cell.
A selected area opens its eligible members in local 3D, then returns to the saved global camera.

## Rendering

The existing 2D/3D renderers, camera navigation, labels and height palette are retained.
Coordinates transform as `((X-Ox)/100, (Z-Oz)/100, (Y-Oy)/100)`, with CPU origin rebasing
before Float32 conversion. Z=0 is an arbitrary reference, not sea level. This is a point scene,
not terrain, collision or building geometry. Labels are decluttered in screen space only.
Coincident markers remain selectable in the lists. Unknown Z support remains in renderer math;
official Full known POIs and eligible objects require complete finite XYZ.

## Checks

`npm test` checks the Full reader, projection, unknown-coordinate exclusion and renderer math.
`npx svelte-check --tsconfig ./tsconfig.json` checks Svelte/TypeScript.
`npm run build` builds the adapter-node site and API. `npx playwright install chromium` installs test Chromium
in the standard user browser cache. `npm run test:ui` checks import replacement, labels, both
camera modes, local groups, exact camera return and calculator interaction.
An optional `TLC_FULL_JSON` environment variable enables a private official Full UI test.
Do not commit private snapshots, discovery lists, screenshots or source paths.
Real-data measurements belong in the user's local Voyage-TLC Reports directory.
