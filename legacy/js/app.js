import { initState } from './modules/state.js';
import { initScene, animate } from './modules/scene.js';
import { initUI, populateOpeningsUI } from './modules/ui.js';
import { updateBuilding } from './modules/builder.js';
import { applyUrlConfig, setupQuoteModal } from './modules/export.js';
import { initHelpPopover } from './modules/gallery.js';
import { updateMaterialColors } from './modules/materials.js';


function initCompareFeature() {
	const btnCompare = document.getElementById('btnCompare');
	const overlay = document.getElementById('compare-overlay');
	const grid = document.getElementById('compareGrid');
	const btnClose = document.getElementById('btnCloseCompare');

	if (!btnCompare || !overlay || !grid) return;

	btnCompare.addEventListener('click', () => {
		grid.innerHTML = '';
		const designs = JSON.parse(localStorage.getItem('configurator_designs') || '[]');

		if (designs.length === 0) {
			alert("No saved designs to compare. Please save some designs first!");
			return;
		}

		designs.forEach(d => {
			const col = document.createElement('div');
			col.className = 'compare-column';
			
			let metaHtml = '';
			if (d.state) {
				metaHtml = `
					<ul class="compare-specs">
						<li><b>Width:</b> ${(d.state.w * 3.28084).toFixed(1)} ft (${d.state.w.toFixed(1)} m)</li>
						<li><b>Length:</b> ${(d.state.l * 3.28084).toFixed(1)} ft (${d.state.l.toFixed(1)} m)</li>
						<li><b>Height:</b> ${(d.state.h * 3.28084).toFixed(1)} ft (${d.state.h.toFixed(1)} m)</li>
						<li><b>Roof Type:</b> ${d.state.roofType}</li>
						<li><b>Wainscot:</b> ${d.state.wainscotEn ? 'Enabled' : 'Disabled'}</li>
						<li><b>Mezzanine:</b> ${d.state.mezzEn ? 'Yes' : 'No'}</li>
						<li><b>Crane:</b> ${d.state.craneEn ? 'Yes' : 'No'}</li>
					</ul>
				`;
			}

			col.innerHTML = `
				<div class="compare-card">
					<h5>${d.name}</h5>
					<img src="${d.thumbnail}" class="compare-thumb">
					${metaHtml}
				</div>
			`;
			grid.appendChild(col);
		});

		overlay.style.display = 'block';
	});

	btnClose?.addEventListener('click', () => {
		overlay.style.display = 'none';
	});
}

document.addEventListener('DOMContentLoaded', () => {
	console.log('Application initialization started...');

	const appData = window.ConfiguratorData || {};
	initState(appData);

	const container = document.getElementById('canvas-container');
	if (!container) return;
	
	initScene(container);
	initUI(updateBuilding);
	initCompareFeature();
	initHelpPopover();

	const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
	tooltipTriggerList.map(t => new bootstrap.Tooltip(t));

	const urlParams = new URLSearchParams(window.location.search);
	if (!urlParams.has('config')) {
		const defaultValues = {
			'W': { ft: '60.00', m: '18.288' },
			'L': { ft: '100.00', m: '30.48' },
			'H': { ft: '16.00', m: '4.8768' }
		};

		['W', 'L', 'H'].forEach(suffix => {
			const el = document.getElementById('input' + suffix);
			const valEl = document.getElementById('val' + suffix);
			if (el) {
				el.setAttribute('data-current-m', defaultValues[suffix].m);
				el.value = defaultValues[suffix].ft;
			}
			if (valEl) {
				valEl.value = defaultValues[suffix].ft;
			}
		});

		const pitchEl = document.getElementById('inputPitch'); 
		const pitchValEl = document.getElementById('valPitch');
		if (pitchEl) pitchEl.value = '0.05';
		if (pitchValEl) pitchValEl.value = '0.05';
	}

	const checkTrims = document.getElementById('checkTrims');
	const checkGirts = document.getElementById('checkGirts');
	const checkPurlins = document.getElementById('checkPurlins');
	const checkEWColumns = document.getElementById('checkEWColumns');

	if (checkTrims) checkTrims.addEventListener('change', updateBuilding);
	if (checkGirts) checkGirts.addEventListener('change', updateBuilding);
	if (checkPurlins) checkPurlins.addEventListener('change', updateBuilding);
	if (checkEWColumns) checkEWColumns.addEventListener('change', updateBuilding);

	applyUrlConfig(updateBuilding);
	populateOpeningsUI(updateBuilding);
	setupQuoteModal();

	updateMaterialColors();
	updateBuilding();
	animate();
});

document.addEventListener('click', function(e) {
	const clickedToggle = e.target.closest('.nav-link.dropdown-toggle');
	const clickedMenu = e.target.closest('.dropdown-menu');
	if (!clickedToggle && !clickedMenu) {
		const activeToggles = document.querySelectorAll('.nav-link.dropdown-toggle.active');
		activeToggles.forEach(toggle => {
			toggle.classList.remove('active');
			const menu = toggle.nextElementSibling;
			if (menu && menu.classList.contains('dropdown-menu')) {
				menu.classList.remove('show');
			}
		});
	}
});