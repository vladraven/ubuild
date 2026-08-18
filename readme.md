# U-Build — Interactive 3D Steel Building Configurator

A browser-based 3D configurator that lets a website visitor design a steel-frame
building (dimensions, roof type, colors, openings, add-ons) and see it rendered
live in 3D, then request a quote directly from the configurator. It ships as a
single WordPress page template plus a flat set of ES modules — there is no
build step, bundler, or package manager involved.

---

## 1. What it does (feature overview)

- **Parametric building generation** — width, length, height, roof pitch,
  and roof type (gabled / left-sloped / right-sloped) are set via linked
  slider + numeric inputs and drive a full procedural 3D rebuild.
- **Roof & wall panel profiles** — selectable profile families (AWR,
  SSR24 for roof; AWR, Delta Span, Elite Rib, IMP, Ultra Span, Widespan for
  walls) and independently colorable roof / wall / trim / eave-trim /
  wainscot / mezzanine / ceiling surfaces, driven by a WordPress ACF color
  palette (see §4).
- **Openings (windows & doors)** — six opening types (Window, two walk-door
  variants, overhead panel door, bi-fold door, hydraulic door) that can be
  placed per wall, then **dragged directly on the 3D wall** to reposition,
  with strict axis-aligned collision resolution against neighboring
  openings and a right-click-style popup editor for precise width / height /
  offset values.
- **Structural add-ons** — wainscot band, interior liner (cladding), raised
  mezzanine bay, overhead bridge crane, roof overhangs per side, gutters,
  a concrete driveway slab, and awnings/lean-tos on any of the four
  elevations (each with its own drop, depth, pitch, and end-wall
  configuration).
- **Reference-scale 3D props** — optional GLTF models (car, forklift,
  airplane, semi-truck) that spawn next to the building, auto-scaled to a
  realistic real-world size, and can be dragged around the ground plane for
  a sense of scale.
- **Dual unit system** — every dimension input carries both a display value
  (ft or m) and a canonical metric value (`data-current-m`), toggled live
  by a single Imperial/Metric switch without re-deriving the model from
  scratch.
- **Inside View** — one-click camera jump to a first-person, inside-the-building
  vantage point, with the previous outside camera position/target restored on
  toggle-off.
- **Save / Gallery / Compare** — designs are serialized and stored in the
  browser's `localStorage` (no server-side persistence); the Gallery lets a
  user reload or delete past designs, and Compare lays multiple saved
  designs side-by-side with their thumbnails and specs.
- **Shareable links** — the full design state is base64-encoded into a
  `?config=` URL query parameter, so a link alone reproduces an exact
  design on load (`applyUrlConfig`) — this is also what the Gallery's
  "Load Design" button uses internally.
- **Quote request flow** — a modal captures a live JPEG snapshot of the
  current 3D view, auto-fills a Gravity Forms form (dimensions, a shareable
  link, and a full human-readable spec dump) with a custom drag-and-drop
  file uploader for drawings, wired into the theme's Gravity Forms
  instance (form ID 4).
- **Aspect-ratio / limit validation** — width/height/length are clamped
  live against admin-configured maximums, with a Bootstrap toast
  notification when a value gets clamped.

---

## 2. Technology stack

| Layer | Technology |
|---|---|
| Rendering | [Three.js](https://threejs.org/) r0.136.0, loaded via `<script type="importmap">` directly from `unpkg.com` — **no bundler, no npm install** |
| 3D controls / loaders | `OrbitControls`, `GLTFLoader` (Three.js examples, also from unpkg) |
| Language | Vanilla ES2020+ JavaScript, native ES modules (`type="module"`), no TypeScript, no framework (no React/Vue/Svelte) |
| Backend | WordPress PHP page template (`Template Name: 3D Design Tool [NEW]`), Advanced Custom Fields (ACF) for admin-configurable options, Gravity Forms for lead capture |
| Styling | Bootstrap 5.3 (CSS + JS bundle from CDN) plus two hand-written stylesheets (`style.css`, `template-style.css`) |
| Persistence | Browser `localStorage` only — **no database table, no REST endpoint, no user accounts** back this configurator |
| 3D assets | External `.glb` models loaded at runtime from the active theme's `/3d-models/` directory |

There is no `package.json`, no `composer.json`, and no CI configuration in
the repository — it is a plain drop-in WordPress theme template.

---

## 3. Architecture

### 3.1 Rendering model: full rebuild, not a diff

The configurator does **not** use a virtual-DOM/reactive-state pattern.
Instead:

1. All configuration lives directly **in the DOM** — sliders, checkboxes,
   and `<select>` elements are the single source of truth (see
   `collectCurrentState()` in `state.js`, which reads ~30 DOM elements by
   ID on demand).
2. Every change (slider drag, checkbox toggle, color pick) calls
   `updateBuilding()` (`builder.js`), which:
   - clears the entire `mainGroup` Three.js group (`mainGroup.clear()`),
   - re-reads every relevant DOM value,
   - calls ~15 `create*Group(...)` factory functions in sequence
     (foundation → main frames → walls/openings → overhangs → awnings →
     wainscot → interior liner → mezzanine → crane → trims → girts →
     purlins → end-wall columns → driveway → logo),
   - and re-adds each returned `THREE.Group` to the scene.
3. There is a persistent `requestAnimationFrame` loop (`animate()` in
   `scene.js`) that only handles camera damping and rendering — geometry is
   never rebuilt inside the render loop itself, only on explicit user
   input.

This is simple and easy to reason about, but it means **every** parameter
change reconstructs the entire building from scratch, including parts that
didn't change (e.g., dragging the wainscot-height slider also rebuilds the
roof, all four walls, and every structural add-on). See §6 for the
practical implications.

### 3.2 Module graph (production path)

The WordPress template enqueues exactly two scripts:

```
3d-design-tool-new.php
 └─ js/app-new.js   (type="module", entry point)
 └─ js/template-handler.js   (Gravity Forms / UI polish, independent)
```

`app-new.js` imports, in order: `state.js` → `scene.js` → `ui.js` →
`builder.js` → `tools-actions.js`. From there, `builder.js` pulls in the
~19 geometry-generator modules listed in §3.1, and `ui.js` pulls in
`colorise.js`, `texturiser.js`, and `external-references-models.js`.

### 3.3 Directory structure

```
3d-design-tool-new.php      WordPress page template — all HTML/PHP UI markup
js/
├── app-new.js               ← ACTIVE entry point (loaded by the template)
├── template-handler.js      ← ACTIVE — Gravity Forms UX polish, UTM capture
├── state.js                 ← ACTIVE — shared mutable state + DOM state reader
├── scene.js                 ← ACTIVE — Three.js scene/camera/renderer, terrain,
│                               drag-to-move-openings, opening edit popup
├── builder.js                ← ACTIVE — orchestrates the full rebuild
├── ui.js                     ← ACTIVE — all control-panel wiring, save/gallery,
│                               unit toggle, accordion, opening list UI
├── tools-actions.js          ← ACTIVE — quote modal, share link, reset, compare,
│                               inside-view toggle, URL config apply
├── foundation.js, main-frames.js, building.js, wainscot.js,
│   overhangs.js, interior-liner.js, mezzanine.js, crane.js,
│   trims.js, girts.js, purlins.js, end-wall-columns.js,
│   driveway.js, logo.js, awnings.js, windows.js, doors.js,
│   colorise.js, texturiser.js, external-references-models.js
│                             ← ACTIVE — one geometry/material concern each
│
├── modules/                  ⚠ LEGACY — a self-contained middle-generation
│   (builder.js, export.js, gallery.js, geometry.js,           rewrite (7 monolithic
│    materials.js, scene.js, state.js, ui.js)                  files instead of ~25).
│                             Entry point would be js/app.js, which the
│                             production template does NOT enqueue.
│                             Not reachable from the live page.
│
└── old/                      ⚠ LEGACY — the original, oldest implementation
    (builder.js, export.js, gallery.js, geometry.js,           (monolithic, pre-refactor).
     materials.js, scene-events.js, state.js,                  Not reachable from the
     structure-builder.js)                                     live page either.
```

**`js/modules/` and `js/old/` are dead code from the repository's point of
view** — nothing in the enqueued template graph imports them. They appear
to be two earlier generations of the same configurator kept in-tree rather
than removed. See §6.2.

---

## 4. WordPress / backend integration surface

The PHP template reads the following from WordPress on every page load —
this is the entire admin-configurable surface of the tool:

**Site-wide numeric limits** (ACF Options, in meters, converted to feet in
PHP for display):
`ubuild_max_width`, `ubuild_max_length`, `ubuild_max_height`,
`ubuild_max_overhang`, `ubuild_max_foundation_height`,
`ubuild_pitch_awr`, `ubuild_pitch_ssr24`

**Feature toggles** (ACF Options, booleans):
`ubuild_allow_vehicle`, `ubuild_allow_forklift`, `ubuild_allow_airplane`,
`ubuild_allow_truck`, `ubuild_allow_interior_liner`,
`ubuild_allow_mezzanine`, `ubuild_allow_crane`, `ubuild_allow_downspouts`

**Color palette** (ACF Options repeater field `add_remove_color`, rows of
`color_name` / `color_hexcode` / `color_category` / `in_use`) — filtered
client-side-equivalent in PHP by category (`Roof`, `Wall`, `Trim`,
`Wainscot`, `Mezzanine`, `Ceiling`) to populate each `<select>`.

**Default color per category** (ACF Options repeater
`category_color_defaults`) — maps a category to its pre-selected color
name.

**Lead capture**: Gravity Forms form ID `4`, embedded via
`do_shortcode('[gravityform id="4" ...]')`. The quote modal writes into
specific Gravity Forms field IDs directly by DOM id (`input_4_9` through
`input_4_20`) — width/length/height, a generated shareable link, a full
plain-text spec dump, and UTM parameters lifted from the page URL.

There is **no custom REST API, no custom database table, and no AJAX
endpoint** defined by this feature — all backend interaction is either
(a) PHP reading ACF options at template-render time, or (b) the existing
Gravity Forms submission pipeline.

---

## 5. Notable implementation details

- **Structurally-informed steel framing** — `main-frames.js` doesn't draw
  boxes for columns and rafters; it builds tapered I-beam profiles (wider
  at the base than the eave, matching how real steel portal frames are
  fabricated) as extruded web + flange meshes, mitered to the roof pitch
  angle via trigonometry (`Math.atan`/`Math.cos`/`Math.tan` throughout).
- **Wall openings are true geometric holes**, not overlaid decals — window
  and door cut-outs are punched into the wall's `THREE.Shape` via
  `shape.holes.push(...)` before extrusion, so lighting/shadows read
  correctly through the opening.
- **Collision-aware opening placement** — dragging a window or door along
  a wall (`resolveStrictCollisions` in `scene.js`) clamps its position
  against every other opening on the same wall using an axis-aligned
  bounding check on both X and Y, not just a simple bounding-box overlap
  test.
- **Procedurally colored/shaded terrain** — the ground plane is a single
  128×128-segment `PlaneGeometry` with per-vertex height (radial hill
  falloff via layered sine noise) and per-vertex vertex-colors (HSL noise)
  blended with a tiled grass texture and a bump map, rather than a flat
  green plane.
- **Real-world auto-scaling for reference models** — each loaded GLTF
  prop is measured via `THREE.Box3`, scaled to a known real-world
  dimension (vehicle length, forklift height, plane wingspan-adjacent
  max-dimension, truck height) from a lookup table, and vertically
  grounded to `y = 0` by compensating for its own bounding-box minimum —
  so props always sit correctly on the terrain regardless of the source
  model's original scale or pivot point.
- **Dual-unit inputs carry two values simultaneously** — every dimension
  `<input>` has both a display `value` (in the user's chosen unit) and a
  canonical `data-current-m` attribute (always metric); all internal
  geometry math reads only `data-current-m`, so unit-toggling is a pure
  display transform with no risk of compounding rounding error into the
  model itself.
- **Shareable state is intentionally partial** — `collectCurrentState()`
  captures every configurator input plus opening/lean-to state, but not
  camera position or which reference models are visible beyond a
  checkbox id list; loading a shared link reproduces the *building*
  exactly, not the exact prior viewport.

---

## 6. Technical characteristics & known limitations

This section documents behavior that a maintainer should be aware of —
not necessarily bugs, but consequences of the architecture in §3.1 worth
knowing before extending the tool.

### 6.1 No geometry/material disposal on rebuild
`mainGroup.clear()` (Three.js) removes children from the scene graph but
does **not** call `.geometry.dispose()` / `.material.dispose()` on the
meshes being discarded. Since every slider drag triggers a full rebuild,
long editing sessions with many incremental changes create GPU-side
garbage (orphaned geometry buffers) that only clears on a full page
reload. `roofMat`/`wallMat`/etc. themselves are module-level singletons
reused across rebuilds (good — colors update in place via
`updateMaterialColors()`), but the geometries built fresh in each
`create*Group()` call are not.

### 6.2 Three coexisting code generations
`js/old/` (oldest, monolithic) and `js/modules/` (an intermediate,
7-file modular rewrite with its own `app.js` entry point) remain in the
repository but are not referenced by the live template. This roughly
triples the JS payload of the repo without benefiting the running page,
and creates a real risk of a future contributor editing the wrong
`builder.js` or `state.js` (there are three files with each of those
names) and wondering why changes don't appear on the live page.

### 6.3 No persistence beyond the browser
Saved designs, and the Compare feature that depends on them, live
entirely in `localStorage` under the key `configurator_designs`. This
means: designs don't sync across devices or browsers, clearing site data
silently deletes all saved designs with no recovery path, and there is no
way for a site admin to see what visitors have designed. The `?config=`
shareable-link mechanism is the only persistence path that survives a
browser data wipe, and only for as long as the link itself is retained
somewhere.

### 6.4 No dependency pinning / offline resilience
Three.js and its `OrbitControls`/`GLTFLoader` addons are loaded at
runtime from `unpkg.com` via an import map, and Bootstrap's JS bundle
from `cdn.jsdelivr.net`. There's no vendoring, no subresource integrity
(SRI) hash, and no fallback — if either CDN is unreachable or unpkg ever
removes the pinned `@0.136.0` version, the configurator fails to load
with no on-page indication beyond the generic loading spinner never
resolving.

### 6.5 No automated tests
There is no test suite (unit, integration, or visual-regression) anywhere
in the repository, and no CI configuration. Regressions in geometry
generation (e.g., a roof-pitch edge case, or an opening collision bug)
would only surface through manual visual inspection.

### 6.6 DOM-as-state has no single validation boundary
Because configuration state is read ad hoc from `document.getElementById(...)`
calls scattered across `state.js`, `builder.js`, `ui.js`, and
`tools-actions.js` (rather than one central state object with a schema),
adding a new configurator control requires updating DOM reads in multiple
files individually, and there's no compile-time or runtime guarantee that
a renamed element `id` is caught — it silently falls back to the
hardcoded default in every read site instead of throwing.