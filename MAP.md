# TLC Hub Map

The existing static SvelteKit app provides `/map`, the build optimizer and inventory calculator.
Run `npm run dev`; build with `npm run build`, preview with `npm run preview`.
No deployment changes are required.

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
The default global view shows known POIs; a toggle adds one marker per display cell.
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
