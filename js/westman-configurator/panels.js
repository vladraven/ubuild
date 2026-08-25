//panels.js
export const PANEL_DATA = {
    roofing: [
        { name: "SNAP LOK 16” - 26Ga", coverage: [16], gauges: [24, 26] },
        { name: "SNAP LOK 12” - 26Ga", coverage: [12], gauges: [24, 26] },
        //{ name: "1½” SNAP SEAM", coverage: [11.5, 17.125, 19.5], gauges: [22, 24] },
        //{ name: "PINNACLE RIB", coverage: [32], gauges: [26, 28] },
        //{ name: "1½” MECHANICAL LOCK", coverage: [12, 17.625, 20], gauges: [22, 24] },
        //{ name: "2” MECHANICAL LOCK", coverage: [11, 16.625, 19], gauges: [22, 24] },
        //{ name: "7/8” CORRUGATED", coverage: [32, 37], gauges: [22, 24, 26] },
        { name: "TOUGH RIB", coverage: [36], gauges: [26, 28] },
        { name: "936", coverage: [36], gauges: [26, 28] },
        { name: "RAINBOW RIB", coverage: [37], gauges: [28] },
        { name: "DIAMOND RIB 36", coverage: [36], gauges: [24, 26] },
        { name: "DIAMOND RIB 30", coverage: [30], gauges: [26, 28] },
        //{ name: "SSR 24", coverage: [24], gauges: [22, 24] },
        { name: "AWR", coverage: [36], gauges: [22, 24, 26] }
        //{ name: "VAPOURGUARD 32", coverage: [32], gauges: [24, 26] },
        //{ name: "1/2” CORRUGATED", coverage: [34.6875], gauges: [26] },
        //{ name: "DECK MATE", coverage: [36], gauges: [22, 24, 26] },
        //{ name: "RD36", coverage: [36], gauges: [22, 24, 26] }
    ],
    cladding: [
        { name: "WS200 – WS300", coverage: [8, 12], gauges: [22, 24] },
        { name: "WS279", coverage: [12], gauges: [22, 24] },
        { name: "7/8” CORRUGATED", coverage: [32, 37], gauges: [22, 24, 26] },
        { name: "TOUGH RIB", coverage: [36], gauges: [26, 28] },
        { name: "936", coverage: [36], gauges: [26, 28] },
        { name: "RAINBOW RIB", coverage: [37], gauges: [28] },
        { name: "DIAMOND RIB WALL LAP", coverage: [36], gauges: [24, 26, 28] },
        { name: "DIAMOND RIB 36", coverage: [36], gauges: [24, 26] },
        { name: "DIAMOND RIB 30", coverage: [30], gauges: [26, 28] },
        { name: "AWR", coverage: [36], gauges: [22, 24, 26] },
        { name: "WIDESPAN", coverage: [36], gauges: [22, 24, 26] },
        { name: "1/2” CORRUGATED", coverage: [34.6875], gauges: [26] },
        { name: "ELITE RIB", coverage: [36], gauges: [22, 24, 26] },
        { name: "ULTRA SPAN", coverage: [36], gauges: [22, 24, 26] },
        //{ name: "DECK MATE", coverage: [36], gauges: [22, 24, 26] },
        //{ name: "DELUXE MESA", coverage: [37.125], gauges: [26, 28] },
        //{ name: "VAPOURGUARD 32", coverage: [32], gauges: [24, 26] },
        { name: "DELTA SPAN", coverage: [36], gauges: [22, 24, 26] },
        { name: "WD36", coverage: [36], gauges: [22, 24, 26] }
    ]
};

export function setupPanelUI(type, onUpdate) {
    const modelSelect = document.getElementById(`${type}-panel-model`);
    const covDiv = document.getElementById(`${type}-coverage-options`);
    const gaugeDiv = document.getElementById(`${type}-gauge-options`);

    if (!modelSelect || !covDiv) return;

    const data = type === 'roof' ? PANEL_DATA.roofing : PANEL_DATA.cladding;
    modelSelect.innerHTML = data.map(p => `<option value="${p.name}">${p.name}</option>`).join('');

    const updateOptions = () => {
        const selected = data.find(p => p.name === modelSelect.value);
        if (!selected) return;

        covDiv.innerHTML = '<span>Coverage: </span>' + selected.coverage.map((c, i) => `
            <label><input type="radio" name="${type}-cov" value="${c}" ${i===0?'checked':''}> ${c}"</label>
        `).join('');

        if (gaugeDiv) {
            gaugeDiv.innerHTML = '<span>GA: </span>' + selected.gauges.map((g, i) => `
                <label><input type="radio" name="${type}-ga" value="${g}" ${i===0?'checked':''}> ${g}</label>
            `).join('');
        }
        onUpdate();
    };

    modelSelect.onchange = updateOptions;
    covDiv.onchange = onUpdate;
    updateOptions();
}