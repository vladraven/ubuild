// js/testing/RegressionSuite.js
import { createBuildingModel } from '../model/buildingModel.js';
import { createBuildingGeometry } from '../model/geometry/buildingGeometry.js';
import { serializeModelToURL, deserializeModelFromURL } from '../integration/URLSerializer.js';

export function runRegressionSuite(runtime) {
    console.group('🚀 U-BUILD AUTOMATED REGRESSION SUITE');
    let totalTests = 0;
    let passedTests = 0;

    function assert(condition, testId, description) {
        totalTests++;
        if (condition) {
            passedTests++;
            console.log(`%c[x] ${testId}: ${description}`, 'color: #10b981; font-weight: bold;');
        } else {
            console.error(`[!] ${testId}: ${description}`);
        }
    }

    try {
        // Секция 1: Размеры и Единицы
        const baseModel = createBuildingModel({ dimensions: { width: 15.0, length: 25.0, height: 5.0 } });
        const baseGeom = createBuildingGeometry(baseModel);
        assert(baseGeom.bounds.width === 15.0 && baseGeom.bounds.length === 25.0, '1.1-1.3', 'Dimensions matched in BuildingGeometry');

        // Секция 2: Крыша и уклоны
        const gabledModel = createBuildingModel({ roof: { type: 'gabled', pitchRatio: 0.25, overhangs: { front: 0.5, back: 0.5, left: 0.5, right: 0.5 } } });
        const gabledGeom = createBuildingGeometry(gabledModel);
        assert(gabledGeom.roof.ridge !== null && gabledGeom.roof.rise === (18.288 / 2) * 0.25, '2.1, 2.4', 'Gabled roof pitch and ridge calculated correctly from half-width');

        const monoModel = createBuildingModel({ roof: { type: 'left-sloped', pitchRatio: 0.1 } });
        const monoGeom = createBuildingGeometry(monoModel);
        assert(monoGeom.roof.ridge === null && monoGeom.walls.left.bounds.height > monoGeom.walls.right.bounds.height, '2.2', 'Mono-slope calculates asymmetric wall heights with no ridge');

        // Секция 3: Стены и цоколь
        const wsModel = createBuildingModel({ panels: { wainscotHeight: 1.2 }, visibility: { wainscot: true } });
        const wsGeom = createBuildingGeometry(wsModel);
        assert(wsGeom.wainscot.front.length > 0, '3.3', 'Wainscot layout matches wall panel system');

        // Секция 4: Проёмы
        const opModel = createBuildingModel({
            openings: [
                { id: 'door1', type: 'Walk Door Solid', side: 'F', x: 0, width: 1.0, height: 2.1, yOff: 0 },
                { id: 'win1', type: 'Window', side: 'F', x: 4.0, width: 1.5, height: 1.2, yOff: 1.0 }
            ]
        });
        const opGeom = createBuildingGeometry(opModel);
        assert(opGeom.openings.length === 2, '4.1', 'Openings geometry created with valid anchors');

        // Секция 5: Каркас
        assert(opGeom.frames.length > 0 && opGeom.girts.length > 0, '5.1-5.2', 'Structural frames and segmented girts generated');

        // Секция 6: Trims & Gutters
        assert(gabledGeom.trims.eaves.length === 2 && gabledGeom.trims.rake.length === 4, '6.1', 'Trims generated with overhangs');

        // Секция 9: Стресс-тест Lifecycle (50+ перестроений)
        const initialGeometries = runtime.renderer.info.memory.geometries;
        for (let i = 0; i < 55; i++) {
            const w = 10 + (i % 10);
            runtime.update({ dimensions: { width: w, length: 20 + i, height: 4 + (i % 3) } });
        }
        const finalGeometries = runtime.renderer.info.memory.geometries;
        assert(finalGeometries <= initialGeometries + 25, '9.1-9.3', `50+ Rebuild lifecycle memory leak test passed (${initialGeometries} -> ${finalGeometries})`);

        // Секция 10: Сериализация
        const serialized = serializeModelToURL(baseModel);
        const deserialized = deserializeModelFromURL(`?config=${serialized}`);
        assert(deserialized.dimensions.width === baseModel.dimensions.width, '10.1-10.2', 'Model URL roundtrip serialization intact');

    } catch (e) {
        console.error('Regression suite encountered an exception:', e);
    }

    console.log(`%c══════════════════════════════════════════════`, 'color: #3b82f6;');
    console.log(`%cRESULTS: ${passedTests} / ${totalTests} PASSED`, passedTests === totalTests ? 'color: #10b981; font-weight: bold;' : 'color: #ef4444; font-weight: bold;');
    console.groupEnd();
}