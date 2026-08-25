# Changelog

This file is part of every commit. Each entry must state the release version or
commit identifier, the changed file and line range in the resulting revision,
and the purpose of the change.

## 1.0.0.0 - 2026-07-31

### `a2613b2` - Fix browser module and error handling

| File | Changed lines | Purpose |
| --- | --- | --- |
| `app.js` | 22-25 | Version the PDF-related module URLs so browsers cannot reuse a cached module without the required exports. |
| `app.js` | 203-222 | Convert failed configuration-save responses into a specific user notification instead of a console error. |
| `app.js` | 761 | Remove the call to the nonexistent `gatherStandardConstraints` function. |
| `app.js` | 1292-1319 | Build OBJ model URLs from the active WordPress theme URL and show a user-facing load failure notice. |
| `app.js` | 1493-1506 | Handle non-JSON and failed quote-submission responses without emitting console errors. |
| `assets/script.js` | 1 | Normalize and version the PDF module import. |
| `savepdf.js` | 1 | Version the PDF module import shared by PDF upload logic. |
| `functions.php` | 659-663 | Expose the active WordPress theme URL to browser modules. |
| `template-configurator.php` | 700-701 | Load browser modules only for authenticated users, after the Three.js import map, with deployment-aware cache-busting URLs. |
| `template-configurator.php` | 743-750 | Ignore the expected skipped view-transition cancellation so it is not reported as an unhandled rejection. |

### Documentation policy

Future commits must update this file in the same commit. New entries are added
above the previous release entry and must use line numbers from the final
committed files.
