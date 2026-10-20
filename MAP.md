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

Full remains local in page memory. Its confirmed POI knowledge joins the base
only by exact ComponentPath and matching reviewed catalog build, preserving base
identity, title and coordinates. No match means unknown knowledge, never unopened.
A green outline indicates confirmed Full knowledge; static presence is not a
save fact. Additional unmatched confirmed Full POIs remain visible. Importing
another Full replaces personal knowledge, not the static roster. Findings, 200 m
areas, local 3D and saved global camera return use the existing mechanisms.

Item references still use small hashed JSON files, at most six concurrent
requests. Exact definition names update the list, local marker labels and item
heading; stale responses are ignored and missing names retain technical text.
Item icons appear in cards only, never on the map. The accepted Full, occurrence
IDs, coordinates, groups and ownership evidence remain untouched.

## Data delivery on the existing Linux VM

The same Compose service, Nginx and port 3080 remain. Existing read-only mounts
serve generated reference views and original PNGs. The only new permitted URL is
the compact pois.json; the full catalog and other paths still return 404. All
data/ remains excluded from Git and Docker context. No private Full is deployed.

The user transfers the updated local
`C:/Users/aseco/Voyage-TLC/Static/WorldCatalog/25982825/catalog.json` to
`/home/w10/thelastcaretaker/data/world-catalog/25982825/catalog.json` on the VM.
Original PNGs did not change; keep the existing images/ tree. If it has not yet
been transferred, the original files referenced by the projection must also be
present. Regenerate views on the VM; no generated projection needs to enter Git.

User-run commands, with system Node available:

```sh
set -eu
cd /home/w10/thelastcaretaker
test -z "$(git status --porcelain)"
git pull --ff-only origin main
# Transfer catalog.json here, keeping the existing original images/ tree.
TLC_WORLD_CATALOG="$PWD/data/world-catalog/25982825" node tools/catalog-view.mjs
docker compose up -d --build
curl -f http://localhost:3080/world-catalog/25982825/pois.json >/dev/null
```

The generator must report 116 static POIs and 116 original icons. Visual
verification is user-run on http://tlc.aqua.lan:3080/map: open without Full,
select Lazarus, import Full and confirm the base count and identities persist,
then check findings/local 3D and return to the global camera. Deployment, SMB,
local servers, Docker and browser UI tests were not run by this change.

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
`npm run build` builds the static site. `npx playwright install chromium` installs test Chromium
in the standard user browser cache. `npm run test:ui` checks import replacement, labels, both
camera modes, local groups, exact camera return and calculator interaction.
An optional `TLC_FULL_JSON` environment variable enables a private official Full UI test.
Do not commit private snapshots, discovery lists, screenshots or source paths.
Real-data measurements belong in the user's local Voyage-TLC Reports directory.
