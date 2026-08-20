README.mdU-Build — Interactive 3D Steel Building ConfiguratorA browser-based 3D configurator that allows website visitors to design a steel-frame building (dimensions, roof type, colors, openings, structural add-ons), render it live in 3D, and request a direct quote. The system ships as a single WordPress page template with a flat set of native ES modules — requiring no build step, bundler, or package manager.  1. Core Architecture & PipelineThe application follows a strict unidirectional data and geometry pipeline to maintain spatial consistency and prevent coordinate mismatches:UI / State
    ↓
builder.js (Orchestrator)
    ↓
buildingGeometry.js (Single Source of Truth)
    ↓
Element Orchestrators (Foundation, Frames, Walls, Roof, Trims, etc.)
    ↓
colorise.js / texturiser.js / panelSystem.js (Materials, UVs, & Textures)
    ↓
THREE.js Scene Rendering
builder.js acts strictly as an orchestrator. It gathers parameters, invokes createBuildingGeometry(), passes geometry data to element modules, and manages the scene lifecycle (mainGroup) without performing independent spatial math.buildingGeometry.js is the sole source of truth for all spatial coordinates, dimensions, transformations, and relationships (building, walls, roof, foundation, wainscot, panels, main frames, girts, purlins, end-wall columns, trims, ridge, gutters, awnings, liner, mezzanine, crane, driveway, logo, openings, and overhangs).panelSystem.js centralizes panel geometry, layout logic, rib density, and material assignments for both walls and wainscot.colorise.js is the exclusive repository for shared materials (wallMat, roofMat, trimMat, frameMat, steelMat, concreteMat, etc.), ensuring centralized color updates via updateMaterialColors().texturiser.js manages procedural normal/bump maps and UV mapping configurations.2. Module Dependency Graph3d-design-tool-new.php (WordPress Template)
└── js/
    ├── app-new.js                  # Production Entry Point
    ├── state.js                    # Shared State & DOM Reader
    ├── scene.js                    # Three.js Scene Setup, Lighting & Raycasting
    ├── builder.js                  # Rebuild Orchestrator
    ├── buildingGeometry.js         # Central Spatial Source of Truth
    ├── colorise.js                 # Centralized Shared Materials & Colors
    ├── texturiser.js               # Texture & Normal Map Generator
    ├── panelSystem.js              # Unified Panel Layout & UV Pipeline
    ├── ui.js                       # Control Panel, Event Listeners & UI Binding
    ├── tools-actions.js            # Quote Modal, URL Sharing, Compare, Reset
    └── [Element Orchestrators]     # foundation.js, main-frames.js, building.js, 
                                    # wainscot.js, overhangs.js, interior-liner.js, 
                                    # mezzanine.js, crane.js, trims.js, ridge.js, 
                                    # gutters.js, girts.js, purlins.js, 
                                    # end-wall-columns.js, driveway.js, logo.js, 
                                    # awnings.js, windows.js, doors.js
```[cite: 1]

---

## 3. Technical Specifications

* **3D Rendering Engine:** Three.js (r0.136.0) loaded via import maps from unpkg.com[cite: 1].
* **Coordinate System:** Standard right-handed Cartesian coordinates ($X = \text{width}$, $Y = \text{height}$, $Z = \text{length}$).
* **Data Persistence:** Client-side storage via browser `localStorage` and base64-encoded URL query strings (`?config=...`)[cite: 1].
* **Lead Integration:** WordPress Gravity Forms (Form ID: 4) populated dynamically with real-time JPEG canvas snapshots and formatted specification dumps[cite: 1].

---

# todo.md

# Architectural Refactoring & Implementation Roadmap

## Phase 1 — Materials
* [ ] Remove local instances of `frameMat`, `steelMat`, and `concreteMat` from element modules.
* [ ] Migrate all structural modules (`main-frames.js`, `girts.js`, `purlins.js`, `end-wall-columns.js`, `foundation.js`) to import shared materials exclusively from `colorise.js`.
* [ ] Centralize structural element coloring through `updateMaterialColors()`.

## Phase 2 — State Isolation
* [ ] Remove direct imports of `ltState` (from `state.js`) inside `awnings.js`.
* [ ] Fully encapsulate awning configuration data within `geometry.awnings` produced by `buildingGeometry.js`.
* [ ] Audit remaining element modules to ensure zero direct dependencies on `state.js` for spatial rendering.

## Phase 3 — Geometry Purity
* [ ] Strip out residual building geometry calculations from element renderers (`ridge.js`, `gutters.js`, `awnings.js`).
* [ ] Ensure all eave, rake, ridge, and roof edge positions are consumed directly from `buildingGeometry.js`.

## Phase 4 — Magic Offsets
* [ ] Audit codebase for hardcoded spatial offsets (e.g., `-0.124`, `-0.135`, `0.05`).
* [ ] Classify offsets into physical parameters, element parameters, or geometry references, establishing named constants.

## Phase 5 — Resource Lifecycle
* [ ] Implement a robust disposal traversal mechanism (`disposeObjectTree`) to release geometries, local materials, and textures on scene rebuild without destroying shared resources from `colorise.js`.
* [ ] Eliminate or properly manage cloned materials (e.g., `wallMat.clone()`) to prevent GPU memory leaks.

## Phase 6 — Verification
* [ ] Verify spatial invariants across dimension changes, roof types, overhangs, panels, wainscot, trims, ridge, gutters, awnings, and openings.
* [ ] Test metric/imperial unit switching, saving, sharing, and quote export pipelines.

## Phase 7 — Documentation
* [ ] Keep `README.md` and `todo.md` synchronized with the active production module graph and architectural invariants.