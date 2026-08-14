import { collectCurrentState } from './export.js';
import { renderer, scene, camera } from './scene.js';
import { ltState, openingsData, setOpeningIdCounter } from './state.js';
import { populateOpeningsUI } from './ui.js';

function applyConfigState(config) {
    const applyInputVal = (id, val, isM) => {
        const el = document.getElementById(id);
        if (el && val !== undefined) {
            if (isM) {
                el.setAttribute('data-current-m', val);
                const isMetric = document.getElementById('unitToggle')?.checked || false;
                el.value = isMetric ? val : (val * 3.28084);
            } else {
                el.value = val;
            }
            const targetId = el.getAttribute('data-target');
            if (targetId) {
                const targetInput = document.getElementById(targetId);
                if (targetInput) {
                    targetInput.value = parseFloat(el.value).toFixed(2);
                }
            }
        }
    };

    const applyCheckbox = (id, val, blockId) => {
        const el = document.getElementById(id);
        if (el && val !== undefined) {
            el.checked = val;
            if (blockId) {
                const blk = document.getElementById(blockId);
                if (blk) blk.style.display = val ? 'block' : 'none';
            }
        }
    };

    applyInputVal('inputW', config.w, true);
    applyInputVal('inputL', config.l, true);
    applyInputVal('inputH', config.h, true);

    if (config.pitch !== undefined) document.getElementById('inputPitch').value = config.pitch;
    if (config.roofType !== undefined) document.getElementById('roofType').value = config.roofType;
    if (config.roofColor !== undefined) document.getElementById('colorRoof').value = config.roofColor;
    if (config.wallColor !== undefined) document.getElementById('colorWall').value = config.wallColor;
    if (config.trimColor !== undefined) document.getElementById('colorTrim').value = config.trimColor;
    if (config.wainscotColor !== undefined && document.getElementById('colorWainscot')) document.getElementById('colorWainscot').value = config.wainscotColor;
    if (config.ceilingColor !== undefined && document.getElementById('colorCeiling')) document.getElementById('colorCeiling').value = config.ceilingColor;
    if (config.mezzanineColor !== undefined && document.getElementById('colorMezzanine')) document.getElementById('colorMezzanine').value = config.mezzanineColor;

    applyCheckbox('wainscotEn', config.wainscotEn, 'wsSettingsBlock');
    applyInputVal('inputWSHeight', config.wsHeight, true);

    applyCheckbox('intWallsEn', config.intWallsEn, 'intWallsSettings');
    if (config.intWallsH !== undefined) applyInputVal('intWallsH', config.intWallsH, false);

    applyCheckbox('ceilEn', config.ceilEn, 'ceilSettings');
    applyCheckbox('mezzEn', config.mezzEn, 'mezzSettings');
    
    if (config.mezzCov !== undefined) document.getElementById('mezzCov').value = config.mezzCov;
    if (config.mezzZ !== undefined) applyInputVal('mezzZ', config.mezzZ, false);
    if (config.mezzH !== undefined) applyInputVal('mezzH', config.mezzH, false);

    applyCheckbox('craneEn', config.craneEn, 'craneSettings');
    if (config.craneZ !== undefined) applyInputVal('craneZ', config.craneZ, false);

    applyInputVal('overL', config.overL, true);
    applyInputVal('overR', config.overR, true);
    applyInputVal('overF', config.overF, true);
    applyInputVal('overB', config.overB, true);

    applyCheckbox('wF', config.wF, null);
    applyCheckbox('wB', config.wB, null);
    applyCheckbox('wL', config.wL, null);
    applyCheckbox('wR', config.wR, null);
    if (document.getElementById('checkRoof') && config.checkRoof !== undefined) {
        document.getElementById('checkRoof').checked = config.checkRoof;
    }

    applyCheckbox('drivewayEn', config.drivewayEn, null);

    if (config.ltState) {
        Object.assign(ltState, config.ltState);
        ['L', 'R', 'F', 'B'].forEach(s => {
            const state = ltState[s];
            applyCheckbox(`ltEn${s}`, state.active, `ltSettings${s}`);
            applyInputVal(`ltDrop${s}`, state.drop, true);
            applyInputVal(`ltDepth${s}`, state.depth, true);
            applyInputVal(`ltCutL${s}`, state.cutL, true);
            applyInputVal(`ltCutR${s}`, state.cutR, true);
            if (document.getElementById(`ltPitch${s}`)) document.getElementById(`ltPitch${s}`).value = state.pitch;
            applyCheckbox(`ltWallL${s}`, state.wallL, null);
            applyCheckbox(`ltWallR${s}`, state.wallR, null);
            applyCheckbox(`ltWallF${s}`, state.wallF, null);
        });
    }

    if (config.openingsData) {
        Object.keys(config.openingsData).forEach(side => {
            openingsData[side] = [];
            config.openingsData[side].forEach(op => {
                openingsData[side].push(Object.assign({}, op));
            });
        });
        
        let maxId = -1;
        ['F', 'B', 'L', 'R'].forEach(s => {
            openingsData[s].forEach(op => {
                if (op.id > maxId) maxId = op.id;
            });
        });
        setOpeningIdCounter(maxId + 1);
    }

    if (config.selectedReferenceModels) {
        document.querySelectorAll('.ref-model-checkbox').forEach(cb => {
            cb.checked = config.selectedReferenceModels.includes(cb.value);
        });
    } else if (config.externalModelSelect) {
        document.querySelectorAll('.ref-model-checkbox').forEach(cb => {
            cb.checked = (cb.value === config.externalModelSelect);
        });
    }
}

export function saveDesign() {
    const name = prompt("Enter design name:", "My Building");
    if (!name) return;

    renderer.render(scene, camera);

    const canvas = renderer.domElement;
    const thumbnail = canvas.toDataURL('image/jpeg', 0.85);

    const selectedModels = [];
    document.querySelectorAll('.ref-model-checkbox').forEach(cb => {
        if (cb.checked) selectedModels.push(cb.value);
    });

    const currentState = collectCurrentState();
    currentState.selectedReferenceModels = selectedModels;
    if (document.getElementById('checkRoof')) {
        currentState.checkRoof = document.getElementById('checkRoof').checked;
    }

    const design = {
        id: Date.now(),
        name: name,
        thumbnail: thumbnail,
        created: new Date().toLocaleDateString(),
        state: currentState
    };

    let designs = JSON.parse(localStorage.getItem('configurator_designs') || '[]');
    designs.push(design);
    localStorage.setItem('configurator_designs', JSON.stringify(designs));
    alert("Design saved successfully!");
}

export function loadGallery(renderCallback) {
    const grid = document.getElementById('galleryGrid');
    const overlay = document.getElementById('gallery-overlay');
    if (!grid || !overlay) return;

    grid.innerHTML = '';
    const designs = JSON.parse(localStorage.getItem('configurator_designs') || '[]');
    
    if (designs.length === 0) {
        grid.innerHTML = '<p class="text-white text-center w-100 py-5">No saved designs found. Click "Save Design" to create one.</p>';
    }

    designs.forEach(d => {
        const card = document.createElement('div');
        card.className = 'gallery-card bg-dark border p-2 rounded';
        card.innerHTML = `
            <img src="${d.thumbnail}" class="gallery-thumb w-100 img-fluid rounded mb-2" style="max-height:160px; object-fit:cover;">
            <div class="gallery-info text-white mb-2">
                <h6 class="mb-0">${d.name}</h6>
                <small class="text-muted">${d.created}</small>
            </div>
            <div class="gallery-actions d-flex gap-2">
                <button class="btn btn-sm btn-success load-btn flex-grow-1" data-id="${d.id}">Load</button>
                <button class="btn btn-sm btn-danger del-btn" data-id="${d.id}"><i class="bi bi-trash"></i></button>
            </div>
        `;
        grid.appendChild(card);
    });

    overlay.style.display = 'block';

    grid.querySelectorAll('.load-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            const design = designs.find(d => d.id === id);
            if (design && design.state) {
                applyConfigState(design.state);
                populateOpeningsUI(renderCallback);
                overlay.style.display = 'none';
                renderCallback();
            }
        });
    });

    grid.querySelectorAll('.del-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            if (confirm("Delete this design permanently?")) {
                const updated = designs.filter(d => d.id !== id);
                localStorage.setItem('configurator_designs', JSON.stringify(updated));
                loadGallery(renderCallback);
            }
        });
    });

    document.getElementById('btnCloseGallery')?.addEventListener('click', () => {
        overlay.style.display = 'none';
    });
}

// Новое КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: точное абсолютное позиционирование хелпа строго под кнопкой
export function initHelpPopover() {
    const btnHelp = document.getElementById('btnHelp');
    const popover = document.getElementById('custom-help-popover');
    const btnCloseHelp = document.getElementById('btnCloseHelp');

    if (!btnHelp || !popover) return;

    btnHelp.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = popover.classList.contains('custom-popover-hidden');
        
        if (isHidden) {
            // Берем координаты относительно контейнера #top-tools, чтобы исключить влияние скролла
            const topOffset = btnHelp.offsetTop;
            const leftOffset = btnHelp.offsetLeft;
            const btnWidth = btnHelp.offsetWidth;
            const popoverWidth = 320; // жесткая ширина из CSS

            popover.style.position = 'absolute';
            popover.style.top = `${topOffset + btnHelp.offsetHeight + 10}px`;
            // Центрируем поповер относительно кнопки Help
            popover.style.left = `${leftOffset + (btnWidth / 2) - (popoverWidth / 2)}px`;
            
            popover.classList.remove('custom-popover-hidden');
        } else {
            popover.classList.add('custom-popover-hidden');
        }
    });

    btnCloseHelp?.addEventListener('click', () => {
        popover.classList.add('custom-popover-hidden');
    });

    document.addEventListener('click', (e) => {
        if (!popover.contains(e.target) && e.target !== btnHelp) {
            popover.classList.add('custom-popover-hidden');
        }
    });
}