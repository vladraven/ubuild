import { buildPrintLayout } from '../pdfGenerator.js?v=20260731';

function generateFileName() {
    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const randomStr = Math.random().toString(36).substring(2, 8);

    return `Blueprint_${randomStr}_${dayName}_${monthName}_${day}_${year}_${hours}_${minutes}_${seconds}.pdf`;
}

export async function processAndUploadPDF(context) {
    console.log('Invoking native layout generator...');

    const printLayout = buildPrintLayout(context);
    
    if (!printLayout) {
        throw new Error('Native layout builder failed to return content.');
    }

    // Удаляем элементы ввода, чтобы они не забивали POST
    const inputs = printLayout.querySelectorAll('input, select, textarea');
    inputs.forEach(el => el.remove());

    const layoutHtml = printLayout.innerHTML;

    if (printLayout && printLayout.parentNode) {
        printLayout.parentNode.removeChild(printLayout);
    }

    // Передаем action и nonce прямо в строку URL, чтобы admin-ajax.php 
    // гарантированно перенаправил запрос в нужную PHP функцию до парсинга тяжелого тела POST
    const uploadUrl = wpApiSettings.root.replace('wp-json/', 'wp-admin/admin-ajax.php') + 
                      `?action=westman_upload_pdf&_ajax_nonce=${wpApiSettings.nonce}`;

    const formData = new FormData();
    formData.append('layout_html', layoutHtml); 

    console.log('Sending compiled HTML payload to mPDF backend engine...');

    const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error('Server raw error output:', errText);
        throw new Error(`Server returned status ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success && result.data?.html_url) {
        const pdfInput = document.getElementById('pdf-file');
        if (pdfInput) {
            pdfInput.value = result.data.html_url;
        }
        console.log('HTML Generated and Saved successfully:', result.data.html_url);
        return result.data.html_url;
    } else {
        throw new Error(result.data?.message || 'mPDF layout rendering error');
    }
}

/**
 * ГЛОБАЛЬНЫЕ ФУНКЦИИ
 */

// 1. Загрузка истории проектов в выпадающий список
window.loadHistory = async function(activeIndex = null) {
    const historySelect = document.getElementById('saved-projects-dropdown');
    if (!historySelect) return;
    try {
        const res = await fetch(wpApiSettings.root + 'configurator/v1/history', {
            method: 'GET',
            headers: { 'X-WP-Nonce': wpApiSettings.nonce }
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.history)) {
            historySelect.innerHTML = ''; 
            if (data.history.length === 0) {
                historySelect.innerHTML = '<option value="">No saved projects</option>';
                return;
            }
            data.history.forEach((project, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${project.name}${project.date ? ` (${project.date})` : ''}`;
                if (activeIndex !== null && parseInt(activeIndex) === index) option.selected = true;
                historySelect.appendChild(option);
            });
        }
    } catch (e) { console.error('History load error:', e); }
};

// 2. Генерация текстового резюме проекта
window.generateProjectSummary = function() {
    const p = window.params; 
    const getVal = (id) => document.getElementById(id)?.selectedOptions[0]?.text || 'N/A';
    let s = `WESTMAN STEEL - 3D PROJECT CONFIGURATION\n========================================\n\n`;
    s += `--- DIMENSIONS ---\nModel: ${getVal('building-model-type')}\nWidth: ${p.width}'\nDepth: ${p.depth}'\nHeight: ${p.height}'\nPitch: ${p.pitch}/12\n\n`;
    s += `--- MATERIALS ---\nRoof: ${getVal('roof-panel-model')} (${getVal('roof-color')})\nWall: ${getVal('wall-panel-model')} (${getVal('wall-color')})\nTrim: ${getVal('trim-color')}\n\n`;
    s += `--- DOORS & WINDOWS ---\n`;
    let ops = [];
    Object.keys(p.openings).forEach(w => p.openings[w].forEach(o => ops.push(`${w.toUpperCase()}: ${o.isDoor ? 'Door' : 'Window'} (${o.w}'x${o.h}')`)));
    return s + (ops.length ? ops.join('\n') : `No openings added.`);
};

/**
 * ИНИЦИАЛИЗАЦИЯ
 */
document.addEventListener('DOMContentLoaded', () => {
    // Определяем общие элементы в начале, чтобы избежать ReferenceError
    const historySelect = document.getElementById('saved-projects-dropdown');
    const btnSubmit = document.getElementById('btn-submit-request');
    const btnDelete = document.getElementById('btn-delete-project');
    const btnLogout = document.getElementById('btn-logout');

    window.loadHistory();

    // Автозагрузка проекта из URL
    const urlParams = new URLSearchParams(window.location.search);
    const autoLoadId = urlParams.get('load_project');
    if (autoLoadId !== null && typeof window.loadProjectData === 'function') {
        window.loadProjectData(autoLoadId);
    }

    // --- Логика Submit Request (Прямая отправка в GF через API) ---
    if (btnSubmit) {
        btnSubmit.addEventListener('click', async () => {
            const fName = document.getElementById('req-first-name')?.value || "";
            const lName = document.getElementById('req-last-name')?.value || "";
            const email = document.getElementById('req-email')?.value || "";
            const phone = document.getElementById('req-phone')?.value || "";
            const comments = document.getElementById('ui-project-comments')?.value || "";
            
            const recipientEmail = document.getElementById('req-recepient')?.value || "";
            const contactCode = document.getElementById('req-contact')?.value || "";
            
            const currentIndex = historySelect ? historySelect.value : '';

            // Извлекаем значение ссылки на сгенерированный HTML из скрытого поля id="pdf-file"
            const generatedHtmlUrl = document.getElementById('pdf-file')?.value || "";

            const payload = {
                name: `${fName} ${lName}`.trim(),
                email: email,
                phone: phone, 
                summary: window.generateProjectSummary(),
                url: `${window.location.origin}${window.location.pathname}?load_project=${currentIndex}`,
                recipient: recipientEmail,
                contact_code: contactCode,
                comments: comments,
                pdf_link: generatedHtmlUrl // Значение передается в payload бэкенда, который пишет в input_12 формы Gravity Forms
            };

            const originalHtml = btnSubmit.innerHTML;
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Sending...';

            try {
                const res = await fetch(wpApiSettings.root + 'configurator/v1/submit-request', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WP-Nonce': wpApiSettings.nonce
                    },
                    body: JSON.stringify(payload)
                });

                const result = await res.json();

                if (res.ok && result.success) {
                    if (window.Analytics) {
                        window.Analytics.track('submission_completed', { entry_id: result.entry_id });
                    }

                    alert('Project submitted successfully! Entry ID: ' + result.entry_id);
                    const modalEl = document.getElementById('requestModal');
                    const modalInstance = bootstrap.Modal.getInstance(modalEl);
                    if (modalInstance) modalInstance.hide();
                } else {
                    throw new Error(result.message || 'Submission failed');
                }
            } catch (err) {
                console.error('Submit error:', err);
                alert('Error: ' + err.message);
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = originalHtml;
            }
        });
    }

    // ---  Удаление (Модалка) ---
    if (btnDelete && historySelect) {
        btnDelete.addEventListener('click', () => {
            const index = historySelect.value;
            if (index === '') return alert('Please select a project');
            
            const modalId = 'del-modal';
            const oldModal = document.getElementById(modalId);
            if (oldModal) oldModal.remove();

            const modalHtml = `
                <div class="modal fade" id="${modalId}" tabindex="-1">
                    <div class="modal-dialog modal-dialog-centered text-dark">
                        <div class="modal-content">
                            <div class="modal-header bg-dark text-white">
                                <h5 class="modal-title">Confirm Deletion</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">Are you sure you want to delete this project?</div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" id="confirm-del" class="btn btn-danger">Delete</button>
                            </div>
                        </div>
                    </div>
                </div>`;
            
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const mEl = document.getElementById(modalId);
            const bsM = new bootstrap.Modal(mEl);
            bsM.show();

            document.getElementById('confirm-del').onclick = async function() {
                this.disabled = true;
                await fetch(wpApiSettings.root + 'configurator/v1/delete', { 
                    method: 'POST', 
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WP-Nonce': wpApiSettings.nonce
                    }, 
                    body: JSON.stringify({index})
                });
                bsM.hide();
                window.loadHistory();
            };
            mEl.addEventListener('hidden.bs.modal', () => mEl.remove());
        });
    }

    // --- Logout & Time ---
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            btnLogout.disabled = true;

            if (window.Analytics) {
                window.Analytics.track('logout');
            }

            await fetch(wpApiSettings.root + 'configurator/v1/logout', { 
                method: 'POST', 
                headers: {'X-WP-Nonce': wpApiSettings.nonce}
            });
            window.location.href = window.location.pathname;
        });
    }

    const updateTime = () => {
        const el = document.getElementById('ui-local-time');
        if (el) el.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    setInterval(updateTime, 1000); 
    updateTime();
    
    document.addEventListener('click', (e) => {
        if (e.target && (e.target.id === 'terms' || e.target.closest('#terms'))) {
            e.preventDefault();
            const termsModalEl = document.getElementById('termsModal');
            if (termsModalEl) {
                const modal = new bootstrap.Modal(termsModalEl);
                modal.show();
            }
        }
    }); 
});

// --- Логика Bottom Banner Terms Gate ---
const termsBanner = document.getElementById('terms-bottom-banner');
const termsBlocker = document.getElementById('terms-click-blocker');
const btnAcceptTerms = document.getElementById('btn-accept-terms');
const btnDeclineTerms = document.getElementById('btn-decline-terms');

const isLoginPage = document.getElementById('auth-overlay') !== null;

if (termsBanner && !isLoginPage) {
    const hasAcceptedTerms = localStorage.getItem('westman_terms_accepted');

    if (!hasAcceptedTerms) {
        termsBanner.style.display = 'flex';
        termsBlocker.style.display = 'block';
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            termsBanner.classList.add('show-banner');
        }, 50);
    }

    btnAcceptTerms.addEventListener('click', () => {
        localStorage.setItem('westman_terms_accepted', 'true');
        
        if (window.Analytics) {
            window.Analytics.track('terms_accepted');
        }

        termsBanner.classList.remove('show-banner');
        
        setTimeout(() => {
            termsBanner.style.display = 'none';
            termsBlocker.style.display = 'none';
            document.body.style.overflow = '';
        }, 400);
    });

    btnDeclineTerms.addEventListener('click', () => {
        if (window.Analytics) {
            window.Analytics.track('terms_declined');
        }
        window.location.href = 'https://westmansteel.com'; 
    });
}