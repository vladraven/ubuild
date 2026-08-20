export function setupUIModals(runtime) {
    if (!runtime) {
        throw new TypeError('UBuildRuntime is required');
    }

    function refreshOpeningsList() {
        const container = document.querySelector('#openings-list, #openings-container');
        if (!container) return;

        container.innerHTML = '';
        const openings = runtime.model.openings || [];

        openings.forEach((op, index) => {
            const item = document.createElement('div');
            item.className = 'opening-item';
            item.innerHTML = `
                <span><b>${op.type}</b> (${op.side}-Wall, x:${op.x.toFixed(1)}m)</span>
                <button class="btn-delete" data-id="${op.id}">Delete</button>
            `;

            const btnDelete = item.querySelector('.btn-delete');
            btnDelete.addEventListener('click', () => {
                const next = runtime.model.openings.filter(o => o.id !== op.id);
                runtime.update({ ...runtime.model, openings: next });
                refreshOpeningsList();
            });

            container.appendChild(item);
        });
    }

    const btnAddWin = document.querySelector('#btn-add-window');
    if (btnAddWin) {
        btnAddWin.addEventListener('click', () => {
            const newOp = {
                id: `win-${Date.now()}`,
                type: 'Window',
                side: 'F',
                x: 0,
                width: 1.0,
                height: 1.0,
                yOff: 1.0
            };
            runtime.update({
                ...runtime.model,
                openings: [...(runtime.model.openings || []), newOp]
            });
            refreshOpeningsList();
        });
    }

    const btnAddDoor = document.querySelector('#btn-add-door, #btn-add-walk-door');
    if (btnAddDoor) {
        btnAddDoor.addEventListener('click', () => {
            const newOp = {
                id: `door-${Date.now()}`,
                type: 'Walk Door Solid',
                side: 'F',
                x: 0,
                width: 1.0,
                height: 2.1,
                yOff: 0
            };
            runtime.update({
                ...runtime.model,
                openings: [...(runtime.model.openings || []), newOp]
            });
            refreshOpeningsList();
        });
    }

    const btnAddOverhead = document.querySelector('#btn-add-overhead-door');
    if (btnAddOverhead) {
        btnAddOverhead.addEventListener('click', () => {
            const newOp = {
                id: `overhead-${Date.now()}`,
                type: 'Overhead Panel Door',
                side: 'F',
                x: 0,
                width: 3.0,
                height: 3.0,
                yOff: 0
            };
            runtime.update({
                ...runtime.model,
                openings: [...(runtime.model.openings || []), newOp]
            });
            refreshOpeningsList();
        });
    }

    return Object.freeze({
        refreshOpeningsList
    });
}