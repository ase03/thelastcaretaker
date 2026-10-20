# TLC Hub Map

The existing static SvelteKit app provides `/map`, the build optimizer and inventory calculator.
Run `npm run dev`; build with `npm run build`, preview with `npm run preview`.
World Catalog deployment is described below.

## World Catalog references

Opening a local area requests one small JSON per unique exact Full definition
path (SHA-256 filename), with at most six concurrent requests. Names update the
list, local marker labels and item heading without modifying the accepted Full,
occurrence IDs or group assignments. Stale group/import responses are ignored;
missing names retain the original technical text. Item icons stay in cards only.
No full catalog/index is downloaded. No assetName lookup,
coordinates, discovery, ownership or availability are inferred. Save facts and
reference data remain separate. The existing installed/reviewed metadata build
is used for lookup; the actual save build stays unknown.

`tools/catalog-view.mjs` uses system Node 20+ to read the existing catalog and
write `data/world-catalog-view/<build>/<sha256>.json`. The existing build also
runs it if TLC_WORLD_CATALOG is set. Only selected observed item types, inline
SourceString or exact StringTable name, and original Category, Quality, Weight,
MaxStackCount are emitted. No units/defaults or translation fallback are invented.
Icons require explicit Icon bindings and exactly one original decoded image;
unresolved `.0` references stay unresolved. No quest, recipe, loot or spatial
graph is emitted. Missing references are displayed as unavailable.

Known POI use their original Full ComponentPath for an exact catalog join.
The same per-object reference format and URL serve icon-only component views.
The only accepted chain is VoyageLocatorComponent OverrideIndicator binding →
VoyageIndicatorData Icons entry for effective Config.Type Location → explicit
texture binding → one available original image. Effective Config is selected
using observed bUseConfigAsset and a bound VoyageLocatorPropertyData; absent
defaults, widget fallback and ambiguous references are not reconstructed.
These rules follow the build25982825 research in tlc-hub and existing
Voyage-TLC Reports/2026-10-18-location-display-build25982825/report.ru.md,
plus Reports/2026-10-18-world-catalog-visual-assets/report.ru.md. That research
confirms component OverrideIndicator selection, effective config replacement
(no scalar merge), and the type-keyed Icons lookup. No resources were extracted.

Only POI DOM markers may show these images. Missing JSON/PNG keeps the original
glyph. Selection and labels remain on the existing button, and both renderers
retain the original coordinates. Finds and area markers never get map icons.
Area grouping remains the original 200×200m algorithm and camera transitions
are unchanged; asynchronous display-name updates preserve the camera.

Compose mounts the existing catalog and generated view read-only in the same
container, retaining port 3080:80. Nginx permits only hashed item JSON and PNG
paths below `/world-catalog/25982825/`; catalog.json and other paths return 404.
The original PNGs are served directly without copying. All data/ is excluded
from Git and Docker context. Private Full files stay outside mounted directories.

User-run deployment on the existing Linux VM, with system Node available:

```sh
set -eu
cd /home/w10/thelastcaretaker
test -z "$(git status --porcelain)"
git pull --ff-only origin main
test -f data/world-catalog/25982825/catalog.json
TLC_WORLD_CATALOG="$PWD/data/world-catalog/25982825" node tools/catalog-view.mjs
docker compose config
docker compose up -d --build
curl -f http://localhost:3080/map >/dev/null
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3080/world-catalog/25982825/catalog.json
```

The last request must return 404. In `/map`, import Full, enable finds, open a
group and select an item to see a separate reference card. Nothing uploads Full.
No live deployment is performed by this change. Do not run local Nginx, Docker,
test web servers or browser UI checks for this task. The user performs visual
verification on the existing Hyper-V site at http://tlc.aqua.lan:3080/map.

Verified with the existing local build 25982825 catalog (15,611,054-byte JSON,
7,793 objects, 594 images): projection emits 798 item references plus 23 POI
component icon references (22 GrowRoom and one Scanner). Only Seed Vault and
Lazarus indicators have confirmed Icons-to-texture bindings; the other 27
indicator assets remain unavailable for map imagery despite existing PNGs.
The current private Full fixture matches three known Seed Reserve POI icons;
876 of its 884 eligible occurrences have a reference name, with eight retaining
technical text. DA_ItemLoot_Teddy_02 resolves exactly to Teddy Bear; its icon
is unresolved and stays absent. No extraction or catalog transfer was performed.
Checks: 56 unit tests; svelte-check zero errors or warnings; production build.
No browser, web server, Nginx or Docker was launched for this update.

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
