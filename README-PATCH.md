# U-Build Sky / Ground / Weather Patch

Based on commit `0c61f94`.

## What this fixes

1. **Ground texturing by season** — loads `winter.jpg / spring.jpg / summer.jpg / fall.jpg` from `js/Environment/` (with procedural fallback if load fails).
2. **Procedural sky** — gradient + sun disc + **FBM clouds** (animated).
3. **Weather** — `clear | cloudy | rain | snow | fog` affects cloud cover, haze, fog density, ground tint.
4. **Time of day** — sun position + sky/lighting phase via existing `SolarPosition` + `LightingSystem`.

## Install

From repo root (after checkout of `0c61f94` or compatible):

```bash
# backup
cp -r js/Environment js/Environment.bak
cp js/runtime/UBuildRuntime.js js/runtime/UBuildRuntime.js.bak

# apply
cp -r path/to/ubuild-sky-patch/js/Environment/* js/Environment/
cp path/to/ubuild-sky-patch/js/runtime/UBuildRuntime.js js/runtime/UBuildRuntime.js

# If your bundler/OS is case-sensitive and imports use lowercase paths:
mkdir -p js/environment js/lighting
cp js/Environment/EnvironmentSystem.js js/environment/
cp js/Environment/*.jpg js/environment/
cp js/Lighting/*.js js/lighting/
```

## Usage

```js
runtime.setDateTimeLocation({
  date: '2026-12-21',   // season → winter texture + winter sky colors
  time: '07:30',        // sunrise lighting + sky
  weather: 'snow',      // clouds + fog + ground tint
  latitude: 49.9,
  longitude: -97.1
});
```

Weather values: `clear`, `cloudy`, `rain`, `snow`, `fog`.

## Files in this patch

| Path | Change |
|------|--------|
| `js/Environment/EnvironmentSystem.js` | Seasonal ground maps + sky shader with clouds |
| `js/Environment/*.jpg` | Season ground textures (same as repo) |
| `js/runtime/UBuildRuntime.js` | Calls `environment.tick()` each render (cloud motion) |
| `js/Lighting/*` | Unchanged (included for convenience) |

## Notes

- Cloud animation needs the render loop; `tick()` is called from `render()`.
- Texture URL resolution: `import.meta.url` first, then `window.UBUILD_CONFIG.themeUrl`, then relative `js/Environment/...`.
- On case-sensitive hosts, keep both `Environment` and `environment` folders if imports use lowercase.
