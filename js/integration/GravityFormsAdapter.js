export function generateCanvasSnapshot(renderer, mimeType = 'image/jpeg', quality = 0.9) {
    if (!renderer || !renderer.domElement) {
        throw new TypeError('WebGLRenderer instance is required');
    }
    return renderer.domElement.toDataURL(mimeType, quality);
}

export function formatBuildingSpecificationText(model, geometry) {
    if (!model || !geometry) {
        throw new TypeError('BuildingModel and BuildingGeometry are required');
    }

    const m = model.dimensions;
    const wFt = (m.width * 3.28084).toFixed(1);
    const lFt = (m.length * 3.28084).toFixed(1);
    const hFt = (m.height * 3.28084).toFixed(1);

    const lines = [
        '--- MAIN PARAMETERS ---',
        `Width (W): ${wFt}ft (${m.width.toFixed(2)}m)`,
        `Length (L): ${lFt}ft (${m.length.toFixed(2)}m)`,
        `Height (H): ${hFt}ft (${m.height.toFixed(2)}m)`,
        `Roof Type: ${model.roof.type} (Pitch: ${(model.roof.pitchRatio * 12).toFixed(1)}:12)`,
        `Overhangs: Front=${model.roof.overhangs.front}m, Back=${model.roof.overhangs.back}m, Left=${model.roof.overhangs.left}m, Right=${model.roof.overhangs.right}m`,
        `Wainscot: ${model.panels.wainscotHeight > 0 ? model.panels.wainscotHeight.toFixed(2) + 'm' : 'None'}`,
        ''
    ];

    // Restored: legacy setupQuoteModal() included colors, additional
    // elements (interior walls / ceiling / mezzanine / crane) and awning
    // state in the quote summary text. The refactored version dropped all
    // of this and only listed dimensions/roof/openings.
    lines.push('--- COLORS ---');
    if (model.colors) {
        lines.push(`Roof: ${model.colors.roof || 'N/A'}`);
        lines.push(`Walls: ${model.colors.wall || 'N/A'}`);
        lines.push(`Trim: ${model.colors.eaveTrim || model.colors.trim || 'N/A'}`);
        lines.push(`Wainscot: ${model.colors.wainscot || 'N/A'}`);
    }
    lines.push('');

    lines.push('--- ADDITIONAL ELEMENTS ---');
    lines.push(`Interior Walls: ${model.liner && model.liner.enabled ? 'Yes' : 'No'}`);
    lines.push(`Mezzanine: ${model.mezzanine && model.mezzanine.enabled ? 'Yes' : 'No'}`);
    lines.push(`Crane: ${model.crane && model.crane.enabled ? 'Yes' : 'No'}`);
    lines.push(`Driveway: ${model.driveway && model.driveway.enabled ? 'Yes' : 'No'}`);
    lines.push('');

    if (model.awnings) {
        const sideNames = { front: 'Front', back: 'Back', left: 'Left', right: 'Right' };
        const activeAwnings = Object.entries(model.awnings).filter(([, a]) => a && a.active);
        if (activeAwnings.length) {
            lines.push('--- AWNINGS (LEAN-TOS) ---');
            activeAwnings.forEach(([side, a]) => {
                lines.push(`${sideNames[side] || side} Awning: Drop=${a.drop}m, Depth=${a.depth}m, Pitch=${a.pitch}`);
            });
            lines.push('');
        }
    }

    lines.push(`Wall Panels: ${model.panels.profile}`);
    lines.push(`Openings Count: ${model.openings.length}`);
    if (model.openings.length) {
        lines.push('--- OPENINGS (Windows/Doors) ---');
        model.openings.forEach((op, i) => {
            lines.push(`  [${i + 1}] ${op.type} (${op.side}-Wall) W:${(op.width * 3.28084).toFixed(1)}ft H:${(op.height * 3.28084).toFixed(1)}ft`);
        });
    }

    return lines.join('\n');
}

export function submitToGravityForms({ formId, snapshotFieldId, specFieldId, model, geometry, renderer, fieldMap }) {
    const form = document.getElementById(`gform_${formId}`);
    if (!form) return false;

    const snapshot = generateCanvasSnapshot(renderer);
    const specs = formatBuildingSpecificationText(model, geometry);

    const inputSnapshot = document.getElementById(`input_${formId}_${snapshotFieldId}`);
    if (inputSnapshot) inputSnapshot.value = snapshot;

    const inputSpecs = document.getElementById(`input_${formId}_${specFieldId}`);
    if (inputSpecs) inputSpecs.value = specs;

    // Restored: legacy also populated dedicated per-dimension fields and a
    // shareable config URL field (input_4_10/12/13/14) on the same form -
    // the refactor only ever wrote the snapshot + spec-text fields, so
    // those Gravity Forms fields were silently left blank.
    if (fieldMap) {
        const m = model.dimensions;
        const setField = (fieldId, value) => {
            if (fieldId === undefined || fieldId === null) return;
            const el = document.getElementById(`input_${formId}_${fieldId}`);
            if (el) el.value = value;
        };
        setField(fieldMap.widthFieldId, m.width.toFixed(2) + 'm');
        setField(fieldMap.lengthFieldId, m.length.toFixed(2) + 'm');
        setField(fieldMap.heightFieldId, m.height.toFixed(2) + 'm');
        setField(fieldMap.urlFieldId, fieldMap.shareUrl || '');
    }

    return true;
}