import { submitToGravityForms } from '../integration/GravityFormsAdapter.js';

export function setupUIModals(runtime) {
    if (!runtime) {
        throw new TypeError('UBuildRuntime instance is required for UIModals');
    }

    // 1. Quote Modal Setup
    const btnRequestQuote = document.getElementById('btnRequestQuote');
    const quoteModal = document.getElementById('quoteModal');
    const btnSubmitQuote = document.getElementById('btnSubmitQuote');

    if (btnRequestQuote && quoteModal) {
        btnRequestQuote.addEventListener('click', () => {
            quoteModal.style.display = 'block';
            quoteModal.classList.add('show');
        });

        const closeBtns = quoteModal.querySelectorAll('.btn-close, .modal-close');
        closeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                quoteModal.style.display = 'none';
                quoteModal.classList.remove('show');
            });
        });
    }

    if (btnSubmitQuote) {
        btnSubmitQuote.addEventListener('click', (e) => {
            e.preventDefault();
            const success = submitToGravityForms({
                formId: 4,
                snapshotFieldId: 10,
                specFieldId: 11,
                model: runtime.model,
                geometry: runtime.geometry,
                renderer: runtime.renderer
            });

            if (success) {
                alert('Quote request sent successfully.');
                if (quoteModal) {
                    quoteModal.style.display = 'none';
                    quoteModal.classList.remove('show');
                }
            } else {
                alert('Gravity Forms integration error. Please check form ID.');
            }
        });
    }

    // 2. Openings Editor Modal Setup
    const openingsContainer = document.getElementById('openingsListContainer');
    const btnAddOpening = document.getElementById('btnAddOpening');

    function refreshOpeningsList() {
        if (!openingsContainer) return;
        openingsContainer.innerHTML = '';

        runtime.model.openings.forEach(op => {
            const row = document.createElement('div');
            row.className = 'opening-row d-flex justify-content-between align-items-center mb-2';
            row.innerHTML = `
                <span><b>${op.type}</b> (${op.side}) - W:${(op.width * 3.28084).toFixed(1)}ft</span>
                <button class="btn btn-sm btn-danger btn-delete-op" data-id="${op.id}">×</button>
            `;
            openingsContainer.appendChild(row);
        });

        openingsContainer.querySelectorAll('.btn-delete-op').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const nextOpenings = runtime.model.openings.filter(op => op.id !== id);
                runtime.update({
                    ...runtime.model,
                    openings: nextOpenings
                });
                refreshOpeningsList();
            });
        });
    }

    if (btnAddOpening) {
        btnAddOpening.addEventListener('click', () => {
            const selectType = document.getElementById('selectOpeningType')?.value || 'Walk Door Solid';
            const selectSide = document.getElementById('selectOpeningSide')?.value || 'F';
            const newOp = {
                id: `op_${Date.now()}`,
                type: selectType,
                side: selectSide,
                x: 0,
                yOff: selectType === 'Window' ? 1.0 : 0,
                width: selectType === 'Window' ? 1.2 : 1.0,
                height: selectType === 'Window' ? 1.2 : 2.1
            };

            runtime.update({
                ...runtime.model,
                openings: [...runtime.model.openings, newOp]
            });
            refreshOpeningsList();
        });
    }

    return Object.freeze({
        refreshOpeningsList
    });
}