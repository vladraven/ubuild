mkdir -p /home/workdir/artifacts/ubuild && cat > /home/workdir/artifacts/ubuild/README.md << 'EOF'
# U-Build — Interactive 3D Steel Building Configurator

A browser-based 3D configurator that lets website visitors design a steel-frame building (dimensions, roof type, colors, openings, structural add-ons), render it live in Three.js, and request a direct quote.

The system ships as a single WordPress page template with native ES modules — **no build step, no bundler, no package manager**.

---

## Features

- Live parametric 3D model of a steel building
- Roof types: Gabled, Left-sloped, Right-sloped
- Configurable dimensions (width / length / height), pitch, overhangs
- Wall & roof panel profiles (AWR, SSR24, Delta Span, Elite Rib, etc.)
- Openings: windows, walk doors, overhead, bi-fold, hydraulic doors (drag & drop)
- Structural elements: main frames, girts, purlins, end-wall columns
- Trims, ridge, gutters + downspouts
- Optional: wainscot, interior liner, mezzanine, crane, awnings, driveway, logo
- Imperial / Metric unit toggle
- Save / Load / Share via URL (`?config=...`)
- Quote request via Gravity Forms (with canvas snapshot)
- Inside View, Compare, Reset tools
- Dynamic environment & solar lighting (date / time / location)

---

## Architecture (Current)

The application follows a strict unidirectional data & geometry pipeline:

```
UI / State
    ↓
UBuildRuntime (orchestrator)
    ↓
BuildingModel  →  BuildingGeometry  (Single Source of Truth)
    ↓
Element Orchestrators (Wall, Roof, Foundation, Structural, Openings, …)
    ↓
Materials / Textures / Colors
    ↓
Three.js Scene
```

### Key principles

| Layer | Responsibility |
|-------|----------------|
| `BuildingModel` | Pure configuration data (dimensions, colors, openings, flags…) |
| `BuildingGeometry` | **Only** place that calculates spatial relationships, bounds, anchors |
| Element Orchestrators | `geometry + config + materials → THREE.Group` |
| `UBuildRuntime` | Scene lifecycle, rebuild, lighting, environment, interaction |
| Resources | Shared materials, textures, color palette (with proper dispose) |

Geometry invariants are validated on every rebuild (`GeometryInvariants.js`).

---

## Project Structure

```
ubuild/
├── 3d-design-tool-new.php          # WordPress page template (production entry)
├── js/
│   ├── app-new.js                  # Bootstrap
│   ├── runtime/
│   │   └── UBuildRuntime.js        # Main orchestrator
│   ├── model/
│   │   ├── buildingModel.js        # Configuration schema + defaults
│   │   ├── geometry/               # Pure spatial calculations
│   │   │   ├── buildingGeometry.js
│   │   │   ├── BuildingEnvelope.js
│   │   │   ├── WallGeometry.js
│   │   │   ├── RoofGeometry.js
│   │   │   ├── StructuralGeometry.js
│   │   │   ├── OpeningGeometry.js
│   │   │   ├── GuttersGeometry.js
│   │   │   ├── TrimsGeometry.js
│   │   │   └── …                  # + GeometryInvariants
│   │   ├── panels/
│   │   └── openings/
│   ├── elements/                   # Visual orchestrators
│   │   ├── ElementRegistry.js
│   │   ├── ElementOrchestrator.js
│   │   ├── wall/
│   │   ├── roof/
│   │   ├── structural/
│   │   ├── opening/
│   │   └── …
│   ├── resources/
│   │   ├── materials/
│   │   ├── textures/
│   │   └── colors/
│   ├── environment/
│   ├── lighting/
│   ├── interaction/
│   ├── integration/                # URL serialize, Gravity Forms
│   ├── ui/
│   ├── testing/
│   │   └── RegressionSuite.js
│   └── style.css
├── legacy/                         # Previous flat architecture (do not use)
└── docs (*.md)                     # Architecture notes, roadmap, tests
```

> **Important:** `js/modules/` and `legacy/` are **LEGACY**. Production code lives only under `js/`.

---

## Technical Specs

| Item | Value |
|------|-------|
| 3D Engine | Three.js (loaded via import maps from unpkg / CDN) |
| Modules | Native ES modules (no bundler) |
| Coordinate system | Right-handed: **X** = width, **Y** = height, **Z** = length |
| Units (internal) | Meters |
| Persistence | `localStorage` + base64 URL query (`?config=…`) |
| Lead capture | WordPress Gravity Forms + canvas JPEG snapshot |
| Browser support | Modern evergreen browsers (Chrome, Firefox, Safari, Edge) |

---

## Quick Start (WordPress)

1. Copy the repository into your theme (or plugin) folder.
2. Create a new Page and assign the template **“3D Building Configurator [NEW]”**.
3. Configure options via WordPress admin (max dimensions, colors, feature flags).
4. Open the page — the configurator boots automatically.

For local development you can serve the `js/` folder with any static server that supports ES modules and import maps.

---

## Public API (window.UBuild)

```js
window.UBuild = {
  runtime,                    // full runtime instance
  get model(),                // current BuildingModel
  get geometry(),             // current BuildingGeometry
  update(model),              // rebuild with new config
  render(),                   // force render
  resize(),                   // handle container resize
  dispose()                   // clean up everything
};
```

Example:

```js
UBuild.update({
  dimensions: { width: 18.288, length: 30.48, height: 4.8768 },
  roof: { type: 'gabled', pitchRatio: 0.25 }
});
```

---

## Regression & Quality

- Full checklist: `U-Build — tests.md`
- Migration stages: `U-Build — Migration Roadmap.md`
- Automated smoke tests: `js/testing/RegressionSuite.js`

Run the regression suite from the browser console after the app has loaded:

```js
// (suite is imported by the app or can be loaded manually)
```

---

## Known Limitations / Work in Progress

- Migration from the old flat architecture is ongoing (see Roadmap).
- GPU resource disposal on frequent rebuilds is improved but still monitored.
- Some visual constants (panel thickness, trim profiles) are still being centralized.
- Dynamic solar lighting & seasonal environment are present but may receive further polish.

---

## License

Proprietary / All rights reserved (unless otherwise stated by the owner).

---

## Credits

Built with [Three.js](https://threejs.org/).
EOF
echo "README created successfully" && wc -l /home/workdir/artifacts/ubuild/README.md && head -30 /home/workdir/artifacts/ubuild/README.md
README created successfully
191 /home/workdir/artifacts/ubuild/README.md
# U-Build — Interactive 3D Steel Building Configurator

A browser-based 3D configurator that lets website visitors design a steel-frame building (dimensions, roof type, colors, openings, structural add-ons), render it live in Three.js, and request a direct quote.

The system ships as a single WordPress page template with native ES modules — **no build step, no bundler, no package manager**.

---

## Features

- Live parametric 3D model of a steel building
- Roof types: Gabled, Left-sloped, Right-sloped
- Configurable dimensions (width / length / height), pitch, overhangs
- Wall & roof panel profiles (AWR, SSR24, Delta Span, Elite Rib, etc.)
- Openings: windows, walk doors, overhead, bi-fold, hydraulic doors (drag & drop)
- Structural elements: main frames, girts, purlins, end-wall columns
- Trims, ridge, gutters + downspouts
- Optional: wainscot, interior liner, mezzanine, crane, awnings, driveway, logo
- Imperial / Metric unit toggle
- Save / Load / Share via URL (`?config=...`)
- Quote request via Gravity Forms (with canvas snapshot)
- Inside View, Compare, Reset tools
- Dynamic environment & solar lighting (date / time / location)

---

## Architecture (Current)

The application follows a strict unidirectional data & geometry pipeline:

