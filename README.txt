BASE: d4ce9cc604b8b9d02f6587766b10db0bf1c1aa2e

This package contains the ready app-new.js and the exact runtime/material
changes required for the same color fix.

Runtime changes:
1. Add material 'wainscotMetal' using colors.wainscot.
2. Apply nextColors.wainscot to wainscotMetal.
3. Add material 'cornerTrim' using colors.trim.
4. Apply nextColors.trim to cornerTrim.
5. Keep wallMetal driven only by colors.wall.
6. Keep roofMetal driven only by colors.roof.

TrimOrchestrator change:
Resolve cornerMaterial with resolveMaterial(context, 'cornerTrim')
and pass cornerMaterial to createCornerTrimMesh().

No Python, Node, build step, or server-side runtime is required.
