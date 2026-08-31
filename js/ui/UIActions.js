import * as THREE from 'three';
import { serializeModelToURL } from '../integration/URLSerializer.js';
import { submitToGravityForms } from '../integration/GravityFormsAdapter.js';
import { getBuildingModelDefaults } from '../model/buildingModel.js';

const SAVED_DESIGNS_KEY =
    'ubuild_saved_designs';

export function createUIActions({
    runtime,
    updateInputsFromModel,
    toDisplay
}) {
    if (!runtime) {
        throw new TypeError(
            'UBuildRuntime instance is required for UIActions'
        );
    }

    let savedOutsidePosition =
        null;

    let savedOutsideTarget =
        null;

    function getSavedDesigns() {
        try {
            const data =
                JSON.parse(
                    localStorage.getItem(
                        SAVED_DESIGNS_KEY
                    ) || '[]'
                );

            return Array.isArray(
                data
            )
                ? data
                : [];
        } catch {
            return [];
        }
    }

    function setSavedDesigns(
        designs
    ) {
        localStorage.setItem(
            SAVED_DESIGNS_KEY,
            JSON.stringify(
                designs
            )
        );
    }

    function showMessage(
        message
    ) {
        let el =
            document.getElementById(
                'ubuild-ui-message'
            );

        if (!el) {
            el =
                document.createElement(
                    'div'
                );

            el.id =
                'ubuild-ui-message';

            el.style.cssText =
                'position:fixed;right:20px;bottom:20px;z-index:1000000;background:#198754;color:#fff;padding:10px 16px;border-radius:4px;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,.2);';

            document.body.appendChild(
                el
            );
        }

        el.textContent =
            message;

        el.style.display =
            'block';

        clearTimeout(
            el._timer
        );

        el._timer =
            setTimeout(
                () =>
                    el.style.display =
                        'none',
                2500
            );
    }

    function createDesignSnapshot(
        name
    ) {
        const model =
            JSON.parse(
                JSON.stringify(
                    runtime.model
                )
            );

        let image =
            null;

        try {
            runtime.render();

            if (
                runtime.renderer?.domElement
            ) {
                image =
                    runtime.renderer
                        .domElement
                        .toDataURL(
                            'image/jpeg',
                            0.85
                        );
            }
        } catch (
            error
        ) {
            console.warn(
                'Unable to create design preview:',
                error
            );
        }

        return {
            id:
                `design-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name,
            createdAt:
                new Date().toISOString(),
            model,
            image
        };
    }

    function saveDesign() {
        const designs =
            getSavedDesigns();

        let name =
            window.prompt(
                'Enter a unique name for this design:',
                'My Design'
            );

        if (
            name === null
        ) {
            return;
        }

        name =
            name.trim();

        if (!name) {
            showMessage(
                'Design name is required.'
            );

            return;
        }

        if (
            designs.some(
                design =>
                    String(
                        design.name ||
                        ''
                    )
                        .trim()
                        .toLowerCase() ===
                    name.toLowerCase()
            )
        ) {
            showMessage(
                'A design with this name already exists.'
            );

            return;
        }

        designs.unshift(
            createDesignSnapshot(
                name
            )
        );

        setSavedDesigns(
            designs.slice(
                0,
                50
            )
        );

        showMessage(
            `Design "${name}" saved.`
        );
    }

    function closeOverlay(
        id
    ) {
        const overlay =
            document.getElementById(
                id
            );

        if (overlay) {
            overlay.remove();
        }
    }

    function loadDesign(
        design
    ) {
        if (
            !design?.model
        ) {
            return;
        }

        runtime.update(
            design.model
        );

        updateInputsFromModel();

        runtime.autoFrame?.();

        closeOverlay(
            'ubuild-gallery-overlay'
        );

        closeOverlay(
            'ubuild-compare-overlay'
        );
    }

    function deleteDesign(
        id
    ) {
        setSavedDesigns(
            getSavedDesigns().filter(
                design =>
                    design.id !== id
            )
        );

        renderGallery();
    }

    function createOverlay(
        id,
        title
    ) {
        let overlay =
            document.getElementById(
                id
            );

        if (!overlay) {
            overlay =
                document.createElement(
                    'div'
                );

            overlay.id =
                id;

            overlay.style.cssText =
                'position:fixed;inset:0;background:rgba(15,23,42,.96);z-index:999999;overflow:auto;padding:30px;display:none;box-sizing:border-box;';

            overlay.innerHTML =
                `<div style="max-width:1200px;margin:0 auto;color:#fff;"><div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #475569;padding-bottom:15px;margin-bottom:20px;"><h3 style="margin:0;">${title}</h3><button type="button" data-close-overlay="${id}" class="btn btn-outline-light btn-sm">Close</button></div><div data-overlay-content></div></div>`;

            document.body.appendChild(
                overlay
            );

            overlay.addEventListener(
                'click',
                e => {
                    const close =
                        e.target.closest(
                            '[data-close-overlay]'
                        );

                    if (close) {
                        closeOverlay(
                            close.getAttribute(
                                'data-close-overlay'
                            )
                        );
                    }
                }
            );
        }

        return overlay;
    }

    function renderGallery() {
        const overlay =
            createOverlay(
                'ubuild-gallery-overlay',
                'Saved Designs'
            );

        const content =
            overlay.querySelector(
                '[data-overlay-content]'
            );

        const designs =
            getSavedDesigns();

        content.innerHTML =
            '';

        if (!designs.length) {
            content.innerHTML =
                '<div class="alert alert-secondary">No saved designs.</div>';
        } else {
            const grid =
                document.createElement(
                    'div'
                );

            grid.style.cssText =
                'display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px;';

            designs.forEach(
                design => {
                    const card =
                        document.createElement(
                            'div'
                        );

                    card.style.cssText =
                        'background:#fff;color:#111;border-radius:6px;overflow:hidden;';

                    const img =
                        design.image
                            ? `<img src="${design.image}" style="width:100%;height:160px;object-fit:cover;">`
                            : '<div style="height:160px;background:#e2e8f0;display:flex;align-items:center;justify-content:center;color:#64748b;">No preview</div>';

                    const dimensions =
                        design.model?.dimensions ||
                        {};

                    const roof =
                        design.model?.roof ||
                        {};

                    card.innerHTML =
                        `${img}<div style="padding:15px;"><div style="font-size:18px;font-weight:700;">${design.name || 'Unnamed Design'}</div><div style="margin-top:6px;">${toDisplay(dimensions.width)} × ${toDisplay(dimensions.length)} × ${toDisplay(dimensions.height)} ${runtime.ui?.isImperial ? 'ft' : 'm'}</div><div style="color:#64748b;margin-top:5px;">${roof.type || 'gabled'} · ${(Number(roof.pitchRatio || 0) * 12).toFixed(1)}:12</div><div style="color:#94a3b8;font-size:12px;margin-top:5px;">${design.createdAt ? new Date(design.createdAt).toLocaleString() : ''}</div><div style="display:flex;gap:8px;margin-top:12px;"><button type="button" class="btn btn-primary btn-sm" data-load-design="${design.id}">Load</button><button type="button" class="btn btn-danger btn-sm" data-delete-design="${design.id}">Delete</button></div></div>`;

                    card.addEventListener(
                        'click',
                        e => {
                            const load =
                                e.target.closest(
                                    '[data-load-design]'
                                );

                            const del =
                                e.target.closest(
                                    '[data-delete-design]'
                                );

                            if (load) {
                                loadDesign(
                                    designs.find(
                                        item =>
                                            item.id ===
                                            load.getAttribute(
                                                'data-load-design'
                                            )
                                    )
                                );
                            }

                            if (del) {
                                deleteDesign(
                                    del.getAttribute(
                                        'data-delete-design'
                                    )
                                );
                            }
                        }
                    );

                    grid.appendChild(
                        card
                    );
                }
            );

            content.appendChild(
                grid
            );
        }

        overlay.style.display =
            'block';
    }

    function renderCompare() {
        const overlay =
            createOverlay(
                'ubuild-compare-overlay',
                'Compare Saved Designs'
            );

        const content =
            overlay.querySelector(
                '[data-overlay-content]'
            );

        const designs =
            getSavedDesigns();

        content.innerHTML =
            '';

        if (
            designs.length < 2
        ) {
            content.innerHTML =
                '<div class="alert alert-warning">Save at least two designs to compare them.</div>';

            overlay.style.display =
                'block';

            return;
        }

        const grid =
            document.createElement(
                'div'
            );

        grid.style.cssText =
            'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;';

        designs
            .slice(
                0,
                2
            )
            .forEach(
                (
                    design,
                    index
                ) => {
                    const card =
                        document.createElement(
                            'div'
                        );

                    card.style.cssText =
                        'background:#fff;color:#111;border-radius:6px;padding:15px;';

                    const dimensions =
                        design.model?.dimensions ||
                        {};

                    const roof =
                        design.model?.roof ||
                        {};

                    const panels =
                        design.model?.panels ||
                        {};

                    const colors =
                        design.model?.colors ||
                        {};

                    card.innerHTML =
                        `${design.image ? `<img src="${design.image}" style="width:100%;height:260px;object-fit:cover;border-radius:4px;">` : ''}<h4 style="margin-top:15px;">${design.name || `Design ${index + 1}`}</h4><table class="table table-sm"><tr><td>Width</td><td>${toDisplay(dimensions.width)} ${runtime.ui?.isImperial ? 'ft' : 'm'}</td></tr><tr><td>Length</td><td>${toDisplay(dimensions.length)} ${runtime.ui?.isImperial ? 'ft' : 'm'}</td></tr><tr><td>Height</td><td>${toDisplay(dimensions.height)} ${runtime.ui?.isImperial ? 'ft' : 'm'}</td></tr><tr><td>Roof</td><td>${roof.type || 'gabled'}</td></tr><tr><td>Pitch</td><td>${(Number(roof.pitchRatio || 0) * 12).toFixed(1)}:12</td></tr><tr><td>Roof Profile</td><td>${roof.profile || '—'}</td></tr><tr><td>Wall Profile</td><td>${panels.profile || '—'}</td></tr><tr><td>Wall Color</td><td>${colors.wall || '—'}</td></tr><tr><td>Roof Color</td><td>${colors.roof || '—'}</td></tr></table><button type="button" class="btn btn-primary btn-sm" data-load-design="${design.id}">Load Design</button>`;

                    card.addEventListener(
                        'click',
                        e => {
                            const load =
                                e.target.closest(
                                    '[data-load-design]'
                                );

                            if (load) {
                                loadDesign(
                                    designs.find(
                                        item =>
                                            item.id ===
                                            load.getAttribute(
                                                'data-load-design'
                                            )
                                    )
                                );
                            }
                        }
                    );

                    grid.appendChild(
                        card
                    );
                }
            );

        content.appendChild(
            grid
        );

        overlay.style.display =
            'block';
    }

    function bindInsideView() {
        const toggle =
            document.getElementById(
                'viewInsideToggle'
            );

        if (!toggle) {
            return;
        }

        toggle.addEventListener(
            'change',
            () => {
                const camera =
                    runtime.camera;

                const controls =
                    runtime.controls;

                if (
                    !camera ||
                    !controls
                ) {
                    return;
                }

                if (
                    toggle.checked
                ) {
                    savedOutsidePosition =
                        camera.position.clone();

                    savedOutsideTarget =
                        controls.target.clone();

                    const height =
                        Number(
                            runtime.model.dimensions?.height ||
                            4.88
                        );

                    const length =
                        Number(
                            runtime.model.dimensions?.length ||
                            24
                        );

                    const eyeHeight =
                        Math.min(
                            1.7,
                            height * 0.4
                        );

                    const depth =
                        Math.max(
                            0.5,
                            Math.min(
                                2,
                                length * 0.08
                            )
                        );

                    const position =
                        new THREE.Vector3(
                            0,
                            eyeHeight,
                            depth
                        );

                    const target =
                        new THREE.Vector3(
                            0,
                            eyeHeight,
                            depth +
                            Math.max(
                                4,
                                length * 0.35
                            )
                        );

                    controls.setInsideView(
                        true,
                        position,
                        target,
                        runtime.geometry?.bounds ||
                        null
                    );
                } else {
                    const position =
                        savedOutsidePosition;

                    const target =
                        savedOutsideTarget;

                    if (
                        position &&
                        target
                    ) {
                        controls.setInsideView(
                            false,
                            position,
                            target
                        );
                    }

                    savedOutsidePosition =
                        null;

                    savedOutsideTarget =
                        null;
                }

                runtime.render();
            }
        );
    }

    function bindTools() {
        const save =
            document.getElementById(
                'btnSaveDesign'
            );

        if (save) {
            save.addEventListener(
                'click',
                e => {
                    e.preventDefault();

                    saveDesign();
                }
            );
        }

        const gallery =
            document.getElementById(
                'btnGallery'
            );

        if (gallery) {
            gallery.addEventListener(
                'click',
                e => {
                    e.preventDefault();

                    renderGallery();
                }
            );
        }

        const share =
            document.getElementById(
                'btnShare'
            );

        if (share) {
            share.addEventListener(
                'click',
                async e => {
                    e.preventDefault();

                    const config =
                        serializeModelToURL(
                            runtime.model
                        );

                    const url =
                        `${window.location.origin}${window.location.pathname}?config=${config}`;

                    try {
                        if (
                            navigator.clipboard &&
                            window.isSecureContext
                        ) {
                            await navigator.clipboard.writeText(
                                url
                            );

                            showMessage(
                                'Link copied to clipboard.'
                            );
                        } else {
                            const textarea =
                                document.createElement(
                                    'textarea'
                                );

                            textarea.value =
                                url;

                            textarea.style.position =
                                'fixed';

                            textarea.style.opacity =
                                '0';

                            document.body.appendChild(
                                textarea
                            );

                            textarea.select();

                            document.execCommand(
                                'copy'
                            );

                            textarea.remove();

                            showMessage(
                                'Link copied to clipboard.'
                            );
                        }
                    } catch (
                        error
                    ) {
                        window.prompt(
                            'Copy configuration link:',
                            url
                        );
                    }
                }
            );
        }

        const help =
            document.getElementById(
                'btnHelp'
            );

        if (help) {
            help.addEventListener(
                'click',
                e => {
                    e.preventDefault();

                    const popover =
                        document.getElementById(
                            'custom-help-popover'
                        );

                    if (!popover) {
                        return;
                    }

                    popover.classList.toggle(
                        'custom-popover-hidden'
                    );

                    popover.style.display =
                        popover.classList.contains(
                            'custom-popover-hidden'
                        )
                            ? 'none'
                            : 'block';
                }
            );
        }

        const closeHelp =
            document.getElementById(
                'btnCloseHelp'
            );

        if (closeHelp) {
            closeHelp.addEventListener(
                'click',
                e => {
                    e.preventDefault();

                    const popover =
                        document.getElementById(
                            'custom-help-popover'
                        );

                    if (!popover) {
                        return;
                    }

                    popover.classList.add(
                        'custom-popover-hidden'
                    );

                    popover.style.display =
                        'none';
                }
            );
        }

        const compare =
            document.getElementById(
                'btnCompare'
            );

        if (compare) {
            compare.addEventListener(
                'click',
                e => {
                    e.preventDefault();

                    renderCompare();
                }
            );
        }

        const reset =
            document.getElementById(
                'btnReset'
            );

        if (reset) {
            reset.addEventListener(
                'click',
                e => {
                    e.preventDefault();

                    if (
                        !window.confirm(
                            'Are you sure you want to reset the current design?'
                        )
                    ) {
                        return;
                    }

                    const toggle =
                        document.getElementById(
                            'viewInsideToggle'
                        );

                    if (toggle) {
                        toggle.checked =
                            false;
                    }

                    savedOutsidePosition =
                        null;

                    savedOutsideTarget =
                        null;

                    document
                        .querySelectorAll(
                            '.ref-model-checkbox'
                        )
                        .forEach(
                            checkbox => {
                                checkbox.checked =
                                    false;
                            }
                        );

                    if (
                        runtime.referenceModels
                    ) {
                        runtime.referenceModels.clearAll();
                    }

                    runtime.update(
                        getBuildingModelDefaults()
                    );

                    updateInputsFromModel();

                    runtime.autoFrame();
                }
            );
        }
    }

    function bindInformationNotice() {
        const information =
            document.getElementById(
                'information'
            );

        if (!information) {
            return;
        }

        const alert =
            information.querySelector(
                '.alert'
            );

        if (!alert) {
            return;
        }

        setTimeout(
            () => {
                alert.style.transition =
                    'opacity .5s ease';

                alert.style.opacity =
                    '0';

                setTimeout(
                    () =>
                        information.remove(),
                    500
                );
            },
            3000
        );
    }

    function bindQuote() {
        const quote =
            document.querySelector(
                '#custom-gform-submit,#btn-quote-submit'
            );

        if (quote) {
            quote.addEventListener(
                'click',
                e => {
                    e.preventDefault();

                    const shareUrl =
                        `${window.location.origin}${window.location.pathname}?config=${serializeModelToURL(runtime.model)}`;

                    submitToGravityForms({
                        formId:
                            4,

                        snapshotFieldId:
                            15,

                        specFieldId:
                            16,

                        model:
                            runtime.model,

                        geometry:
                            runtime.geometry,

                        renderer:
                            runtime.renderer,

                        fieldMap: {
                            widthFieldId:
                                13,

                            lengthFieldId:
                                14,

                            heightFieldId:
                                12,

                            urlFieldId:
                                10,

                            shareUrl
                        }
                    });
                }
            );
        }

        const quoteModal =
            document.getElementById(
                'quoteModal'
            );

        if (quoteModal) {
            quoteModal.addEventListener(
                'show.bs.modal',
                () => {
                    const thumbImg =
                        document.getElementById(
                            'summary-building-thumb'
                        );

                    const fallbackIcon =
                        document.getElementById(
                            'summary-building-fallback'
                        );

                    if (
                        thumbImg &&
                        runtime.renderer &&
                        runtime.scene &&
                        runtime.camera
                    ) {
                        runtime.renderer.render(
                            runtime.scene,
                            runtime.camera
                        );

                        thumbImg.src =
                            runtime.renderer
                                .domElement
                                .toDataURL(
                                    'image/jpeg',
                                    0.85
                                );

                        thumbImg.style.display =
                            'block';

                        if (
                            fallbackIcon
                        ) {
                            fallbackIcon.style.display =
                                'none';
                        }
                    }
                }
            );
        }
    }

    function init() {
        bindTools();
        bindInsideView();
        bindInformationNotice();
        bindQuote();
    }

    return Object.freeze({
        init,
        saveDesign,
        renderGallery,
        renderCompare,
        loadDesign,
        deleteDesign
    });
}