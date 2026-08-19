# U-Build — Interactive 3D Steel Building Configurator

A browser-based 3D configurator that allows website visitors to design a steel-frame building (dimensions, roof type, colors, openings, structural add-ons), render it live in 3D, and request a direct quote. The system ships as a single WordPress page template with a flat set of native ES modules — requiring no build step, bundler, or package manager.

## 1. Feature Overview

- **Parametric Building Generation** — Width, length, height, roof pitch, and roof type (gabled, left-sloped, right-sloped) are controlled via linked slider and numeric inputs to drive real-time procedural 3D rebuilding.
- **Roof & Wall Panel Profiles** — Selectable profile families (Roof: AWR, SSR24; Walls: AWR, Delta Span, Elite Rib, IMP, Ultra Span, Widespan) and independently colorable surfaces (roof, wall, trim, eave-trim, wainscot, mezzanine, ceiling) powered by WordPress ACF palettes.
- **Interactive Openings (Windows & Doors)** — Six opening types (Window, two Walk-Door variants, Overhead Panel Door, Bi-Fold Door, Hydraulic Door) placeable per elevation with direct 3D drag-and-drop repositioning, axis-aligned collision resolution, and a modal editor for fine dimension/offset adjustments.
- **Structural Add-ons** — Wainscot banding, interior liner (cladding), raised mezzanine bays, overhead bridge cranes, adjustable eave overhangs, gutters/downspouts, concrete driveway slabs, and configurable lean-tos/awnings on all four walls (with independent drop, depth, pitch, and end-wall options).
- **Reference-Scale 3D Props** — Runtime-loaded GLTF props (car, forklift, airplane, semi-truck) auto-scaled to real-world dimensions and draggable across the ground plane for scale reference.
- **Dual-Unit System (Imperial / Metric)** — Every input maintains both a display value (ft or m) and a canonical metric attribute (`data-current-m`). Switching units updates display values instantly without compounding rounding errors or triggering model rebuilds.
- **Inside View Mode** — One-click camera transition to a first-person interior vantage point with automatic camera restoration upon exiting.
- **Save, Gallery & Compare** — Client-side serialization into browser `localStorage` (no server database required). Users can save multiple designs, reload/delete them via the Gallery, or view them side-by-side in the Compare matrix.
- **Shareable URL Configurations** — Full design states are serialized into a base64-encoded URL query string (`?config=...`), enabling instant reconstruction via direct links or the quote request pipeline.
- **Integrated Lead Capture** — Modal captures a real-time JPEG canvas snapshot, populates a Gravity Forms instance (Form ID: 4) with dimensions, link, and a human-readable spec dump, and includes custom drag-and-drop attachment handling.
- **Live Boundary Validation** — Dimensions are continuously validated against admin-defined maximums, triggering Bootstrap toast alerts whenever values are clamped.

## 2. Technology Stack

| Layer | Technology | Implementation Details |
|---|---|---|
| 3D Rendering | Three.js (r0.136.0) | Loaded directly via `<script type="importmap">` from unpkg.com — zero build step / no npm. |
| Scene Controls | OrbitControls, GLTFLoader | Modular Three.js add-ons sourced via CDN. |
| Frontend Core | Vanilla JavaScript (ES2020+) | Native ES modules (`type="module"`), no frameworks (React/Vue/Svelte), no TypeScript. |
| Backend / CMS | WordPress PHP Template | Template: `3D Design Tool [NEW]`, Advanced Custom Fields (ACF) for limits/colors, Gravity Forms for lead generation. |
| UI Framework | Bootstrap 5.3 + Custom CSS | Bootstrap CDN (grid, modals, toasts) plus `style.css` and `template-style.css`. |
| Data Storage | Client-side localStorage | Pure browser-level persistence — no dedicated backend database or custom REST endpoints. |
| 3D Assets | Binary glTF (.glb) | Self-hosted static models in the active theme directory (`/3d-models/`). |

## 3. Architecture & Execution Flow

### 3.1 Rendering Lifecycle: Full Rebuild Model

The configurator uses a direct DOM-driven procedural model rather than a reactive virtual-DOM:

- **DOM as Source of Truth** — Sliders, selects, and checkboxes hold the primary application state. Functions like `collectCurrentState()` in `state.js` read ~30 input elements on demand.
- **Synchronous Full Rebuild** — Every parameter change executes `updateBuilding()` in `builder.js`:
  1. Clears the main scene container (`mainGroup.clear()`).
  2. Reads current values from the DOM.
  3. Runs ~15 procedural factory functions in order:
     Foundation → Frames → Walls/Openings → Overhangs → Awnings → Wainscot → Interior Liner → Mezzanine → Crane → Trims → Girts → Purlins → End-Wall Columns → Driveway → Logo
  4. Adds the newly instantiated `THREE.Group` elements back into the scene.
- **Decoupled Render Loop** — `requestAnimationFrame` (`animate()` in `scene.js`) handles solely camera controls, damping, and frame draws. Geometry calculations never execute inside the render loop.

```
[ User Input (Slider / Toggle) ]
               │
               ▼
   [ updateBuilding() in builder.js ]
               │
               ├─► mainGroup.clear()
               ├─► Read DOM (state.js)
               ├─► Run ~15 create*Group() modules
               └─► mainGroup.add(newMeshes)
```

### 3.2 Module Dependency Graph

```
3d-design-tool-new.php (WordPress Template)
 ├── js/template-handler.js (Gravity Forms UI, UTM Capture)
 └── js/app-new.js (Main Entry Point)
      ├── state.js (Shared State & DOM Reader)
      ├── scene.js (Three.js Scene, Camera, Drag/Drop Raycaster)
      ├── ui.js (Control Panel, Event Listeners, Gallery/Compare)
      │    ├── colorise.js (Material & Color Management)
      │    ├── texturiser.js (Texture Loading & Mapping)
      │    └── external-references-models.js (GLTF Prop Spawner)
      ├── builder.js (Rebuild Orchestration)
      │    ├── foundation.js
      │    ├── main-frames.js (Tapered I-Beams)
      │    ├── building.js (Walls & Roof Geometry)
      │    ├── panelSystem.js (Shared UV & Normal Profiles)
      │    ├── wainscot.js
      │    ├── overhangs.js
      │    ├── interior-liner.js
      │    ├── mezzanine.js
      │    ├── crane.js
      │    ├── trims.js / girts.js / purlins.js / end-wall-columns.js
      │    ├── driveway.js
      │    ├── logo.js
      │    ├── awnings.js
      │    └── windows.js / doors.js
      └── tools-actions.js (Quote Modal, URL Sharing, Compare, Reset)
```

### 3.3 Directory Structure & Code Generations

```
wp-content/themes/U-Build/
├── 3d-design-tool-new.php          # ACTIVE: WordPress Page Template
└── js/
    ├── app-new.js                  # ACTIVE: Production Entry Point
    ├── state.js                    # ACTIVE: Central State Manager
    ├── scene.js                    # ACTIVE: Three.js Setup & Raycasting
    ├── builder.js                  # ACTIVE: Assembly Pipeline
    ├── ui.js                       # ACTIVE: UI Bindings
    ├── tools-actions.js            # ACTIVE: Utilities & Exporters
    ├── panelSystem.js              # ACTIVE: Unified Panel Texture Pipeline
    ├── [18 specialized .js files]  # ACTIVE: Modular Geometry Generators
    │
    ├── modules/                    # LEGACY: Intermediate 7-file monolithic rewrite
    │   └── (app.js, builder.js, geometry.js, materials.js, ...)
    │
    └── old/                        # LEGACY: Original deprecated architecture
        └── (builder.js, structure-builder.js, scene-events.js, ...)
```

`js/modules/` and `js/old/` are unreferenced in production. All active development takes place in the root `/js/` directory targeting `app-new.js`.

### 3.4 Unified Wall & Wainscot Panel System

To prevent texture stretching when adjusting building scale, wall and wainscot surfaces share a single coordinate pipeline defined in `panelSystem.js`:

- **Single Source of Truth** — Panel width, profile rib density, normal maps, UV offsets, and panel count calculations are centralized in `panelSystem.js`.
- **Fixed Physical Pitch** — Building dimension changes increase the vertex panel count rather than scaling the texture.
- **UV Coordinate Calculation**:
  - For physical panel width `P`: `U = X / P`
  - For physical panel height `H`: `V = Y / H`

```
                   panelSystem.js (UV & Normal Coordinates)
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
       wallPanelMaterial                      wainscotPanelMaterial
  (Color: colorWall / Pitch: P)           (Color: colorWainscot / Pitch: P)
```

## 4. WordPress & Backend Integration

All server-side integration is strictly read-only at template render time, except for lead submissions through Gravity Forms.

**Site-Wide Constraints (ACF Options)** — configured in meters in the backend, transformed to feet for display:
- `ubuild_max_width`
- `ubuild_max_length`
- `ubuild_max_height`
- `ubuild_max_overhang`
- `ubuild_max_foundation_height`
- `ubuild_pitch_awr`
- `ubuild_pitch_ssr24`

**Feature Toggles (ACF Options)** — boolean controls toggling structural features and prop models:
- `ubuild_allow_vehicle`
- `ubuild_allow_forklift`
- `ubuild_allow_airplane`
- `ubuild_allow_truck`
- `ubuild_allow_interior_liner`
- `ubuild_allow_mezzanine`
- `ubuild_allow_crane`
- `ubuild_allow_downspouts`

**Color Palette Repeater (`add_remove_color`)** — provides rows of `color_name`, `color_hexcode`, `color_category`, and `in_use` status to dynamically populate frontend selectors for Roof, Wall, Trim, Wainscot, Mezzanine, and Ceiling.

**Lead Capture Pipeline** — uses Gravity Forms Form 4 embedded via shortcode. The quote modal injects dynamic snapshot blobs, specs, dimensions, and URL parameters directly into form inputs (`input_4_9` through `input_4_20`).

## 5. Implementation Details

- **Tapered I-Beam Fabrication** — `main-frames.js` procedurally generates structurally accurate portal frames with tapered webs (wider at haunch/eave, narrower at base) and welded flanges mitered precisely to the roof pitch angle using trigonometry (`Math.atan2`, `Math.cos`).
- **True CSG-Style Wall Openings** — Openings are not decals. Cutouts are punched directly into the 2D wall paths via `THREE.Shape.holes.push(...)` prior to extrusion, preserving natural light and shadow pass-through.
- **Strict 2D Axis-Aligned Collision** — `resolveStrictCollisions()` in `scene.js` dynamically clamps dragged openings in both X and Y dimensions against all adjacent openings on the active wall plane.
- **Procedural Topographic Terrain** — The ground mesh is a 128×128-segment `PlaneGeometry` sculpted with layered trigonometric noise, radial distance falloff, vertex-color variation, and normal mapping to avoid a sterile flat plane.
- **Automatic Prop Normalization** — Loaded GLTF props are dynamically bounded via `THREE.Box3`, scaled to standardized real-world measurements from a lookup registry, and grounded directly at `Y = 0`.

## 6. Technical Characteristics & Known Limitations

| # | Limitation | Details |
|---|---|---|
| 6.1 | GPU Memory Management on Rebuild | `mainGroup.clear()` unlinks scene objects but does not invoke `.geometry.dispose()` or `.material.dispose()`. Frequent slider manipulation during long sessions generates orphaned GPU buffer allocations that clear only on page refresh. |
| 6.2 | Coexisting Legacy Trees | Redundant files exist inside `/modules/` and `/old/`. Edits made to files with identical names (e.g., `js/modules/builder.js`) will not reflect on the live site. |
| 6.3 | Client-Bound Data Persistence | Saved configurations and comparisons exist solely inside the browser's `localStorage` (`configurator_designs`). Clearing browser caches permanently wipes saved work unless saved via the `?config=` URL parameter. |
| 6.4 | Unpinned CDN Dependencies | Core libraries (Three.js, OrbitControls, GLTFLoader) are imported directly from unpkg.com without Subresource Integrity (SRI) hashes or local fallbacks. Network disruptions or CDN changes can prevent initialization. |
| 6.5 | Absence of Automated Test Suites | The application lacks unit, integration, or visual regression tests. Core calculations (trigonometric mitering, boundary checks, collision limits) require manual verification. |
| 6.6 | Distributed DOM-State Coupling | State retrieval is distributed across isolated `document.getElementById` calls throughout the codebase. Renaming a DOM ID in the PHP template without updating every corresponding JS query silently causes the application to fall back to hardcoded defaults. |