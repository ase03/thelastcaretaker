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
geometry extraction and height filtering are deferred. The basic perspective projector is described below.

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

## Permanent POI labels

Names are visible beside projected markers without selecting a POI. Text uses
13px system-ui, a dark backdrop and text shadow. Marker size and raw XYZ are
unchanged. Screen-space layout tries right, left, above-right and below-right;
conflicting secondary labels are suppressed, but every marker remains available.
Selected labels have first placement priority and remain visible. Labels avoid
other marker centres, the toolbar and bottom readout. Long text is ellipsized;
the complete name remains available via the button title and POI list.

Hovering either dot or label highlights both without selecting or centering.
Selected yellow styling takes precedence over hover. Text and dot share one
button hit area; text placement does not depend on hover, preventing flicker.

The checkout now lives in the permanent source directory. Private local imports
belong in the laboratory's `User-Exports/Map` directory outside the repository.
Paths are user-selected at import or supplied to tests via `TLC_MAP_LOCAL_JSON`;
no workstation-specific absolute path is embedded in the application.

Chromium verification with the same 50 POI includes Full HD and 390px viewport,
permanent names, hover enter/leave, yellow selection, overlapping marker selection,
search, focus, pan, cursor zoom, 1cm grid, and the existing application routes.
Compared with the previous 18.0 / 16.6 / 16.6 ms mean frame intervals, the first
labelled run measured 20.4 / 16.6 / 16.6 ms at overview / 8 / 16 zoom steps.
This small local sample indicates extra layout work at overview; it is not a
hardware-independent performance claim. Type checking still reports only the
47 pre-existing solver errors; map files have no diagnostics.


## Basic 3D projector

Use the 2D / 3D buttons on `/map`; 2D remains the default. Import the same local
JSON in either mode. Records, search and selection stay in page memory when
switching. A newly entered mode starts at overview, or focuses the selected POI;
previous camera orientation/zoom is not retained. No backend or JSON changes.

3D loads a separate client-only renderer with PerspectiveCamera / OrbitControls:
left drag rotates/tilts; right drag pans; wheel zooms. Touch supports one-finger
orbit and two-finger pan/zoom. Controls use damping; focus is an immediate shift
of camera and orbit target preserving viewing direction and distance.

The same UE-cm coordinate adapter supplies GPU point positions and DOM label
projections. Known Z controls height, with a thin vertical stem to world Z=0.
Negative heights remain below the plane. Null Z projects onto Z=0 and uses a
hollow diamond hit marker; the underlying immutable record stays null. This is
an arbitrary reference plane, not a sea-level claim. The grid has no occluding
surface, so negative-Z POI remain visible. Selection is yellow, hover is cyan/
white, and layer visibility controls GPU points, stems and DOM labels together.

Origin rebasing translates camera and orbit target together on the CPU before
building Float32 buffers. Grid density follows camera distance; original records
never change. Adaptive near/far clipping protects zoom precision. Both renderers
release their frame callbacks, resources and event handlers on mode switch and
page exit. 3D cursor X/Y are ray intersections with the reference plane, not POI
picking or terrain coordinates. The 3D span readout estimates width at orbit focus.

No geometry, textures, elevation exaggeration, height filtering or animated focus
transition is supplied. At world overview, small genuine height differences may
be subtle; zoom toward a POI to inspect them. The measured 3D continuous-wheel
mean frame interval with 50 local POI was 17.1 ms (p95 18 ms) in headless Chromium
on this machine; this is a local scheduling sample, not a general FPS guarantee.

Verification: production build; 8 coordinate tests; 5 Chromium checks covering
existing routes and 2D, local imports, 3D orbit/pan/zoom, distinct positive/negative
heights at identical XY, unknown height, hover, selected focus, repeated switching,
Full HD and narrow viewport, and real 50-POI performance. Existing solver type
errors remain outside this change. Private campaign JSON is excluded from Git/build.
