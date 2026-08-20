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
        '--- U-BUILD SPECIFICATION ---',
        `Dimensions: ${wFt}ft x ${lFt}ft x ${hFt}ft (${m.width.toFixed(2)}m x ${m.length.toFixed(2)}m x ${m.height.toFixed(2)}m)`,
        `Roof Type: ${model.roof.type}`,
        `Roof Pitch: ${(model.roof.pitchRatio * 12).toFixed(1)}:12`,
        `Overhangs: Front=${model.roof.overhangs.front}m, Back=${model.roof.overhangs.back}m, Left=${model.roof.overhangs.left}m, Right=${model.roof.overhangs.right}m`,
        `Wall Panels: ${model.panels.profile}`,
        `Openings Count: ${model.openings.length}`
    ];

    model.openings.forEach((op, i) => {
        lines.push(`  [${i + 1}] ${op.type} (${op.side}-Wall) W:${(op.width * 3.28084).toFixed(1)}ft H:${(op.height * 3.28084).toFixed(1)}ft`);
    });

    return lines.join('\n');
}

export function submitToGravityForms({ formId, snapshotFieldId, specFieldId, model, geometry, renderer }) {
    const form = document.getElementById(`gform_${formId}`);
    if (!form) return false;

    const snapshot = generateCanvasSnapshot(renderer);
    const specs = formatBuildingSpecificationText(model, geometry);

    const inputSnapshot = document.getElementById(`input_${formId}_${snapshotFieldId}`);
    if (inputSnapshot) inputSnapshot.value = snapshot;

    const inputSpecs = document.getElementById(`input_${formId}_${specFieldId}`);
    if (inputSpecs) inputSpecs.value = specs;

    return true;
}