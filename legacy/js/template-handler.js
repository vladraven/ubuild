//template-handler
document.addEventListener('DOMContentLoaded', function () {
    const selects = document.querySelectorAll('.gform_wrapper select');
    selects.forEach(select => {
        select.classList.add('form-select', 'rounded-0');
    });

    // ИСПРАВЛЕННЫЙ БЛОК: Плавное скрытие алерта
    const informationWrapper = document.getElementById("information");
    if (informationWrapper) {
        const alertBox = informationWrapper.querySelector('.alert');
        if (alertBox) {
            setTimeout(() => {
                alertBox.style.transition = "opacity 1.5s ease-out";
                alertBox.classList.remove('show'); // Снимаем класс Bootstrap
                alertBox.style.opacity = "0";

                setTimeout(() => {
                    informationWrapper.remove(); // Полностью удаляем элемент из DOM
                }, 1500);
            }, 5000);
        }
    }

    const inputs = document.querySelectorAll('.gform_wrapper input[type="text"], .gform_wrapper input[type="email"], .gform_wrapper input[type="tel"], .gform_wrapper input[type="number"], .gform_wrapper input[type="url"], .gform_wrapper textarea');
    inputs.forEach(input => {
        input.classList.add('form-control', 'rounded-0');
    });

    const headers = document.querySelectorAll('.custom-accordion-header');
    headers.forEach(header => {
        header.addEventListener('click', function () {
            const item = this.parentElement;
            item.classList.toggle('active');
        });
    });

    const nativeFileInput = document.getElementById('input_4_15');
    const customDropzone = document.getElementById('custom-dropzone');
    const btnCustomBrowse = document.getElementById('btn-custom-browse');
    const selectedFileName = document.getElementById('selected-file-name');
    const dropzoneText = document.getElementById('dropzone-text');
    const customSubmitBtn = document.getElementById('custom-gform-submit');

    if (btnCustomBrowse && nativeFileInput) {
        btnCustomBrowse.addEventListener('click', (e) => {
            e.stopPropagation();
            nativeFileInput.click();
        });
    }
    if (customDropzone && nativeFileInput) {
        customDropzone.addEventListener('click', () => {
            nativeFileInput.click();
        });
    }

    if (nativeFileInput) {
        nativeFileInput.addEventListener('change', function () {
            if (this.files && this.files.length > 0) {
                const fileName = this.files[0].name;
                if (selectedFileName) {
                    selectedFileName.innerText = `Selected: ${fileName}`;
                    selectedFileName.style.display = 'block';
                }
                if (dropzoneText) dropzoneText.innerText = "File Attached Successfully";
            }
        });
    }

    if (customDropzone && nativeFileInput) {
        customDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            customDropzone.style.backgroundColor = '#f1f5f9';
        });

        customDropzone.addEventListener('dragleave', () => {
            customDropzone.style.backgroundColor = '#ffffff';
        });

        customDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            customDropzone.style.backgroundColor = '#ffffff';
            
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                nativeFileInput.files = e.dataTransfer.files;
                const fileName = e.dataTransfer.files[0].name;
                if (selectedFileName) {
                    selectedFileName.innerText = `Selected: ${fileName}`;
                    selectedFileName.style.display = 'block';
                }
                if (dropzoneText) dropzoneText.innerText = "File Attached Successfully";
                
                if (typeof gformValidateFileSize === 'function') {
                    gformValidateFileSize(nativeFileInput, 268435456);
                }
            }
        });
    }

    if (customSubmitBtn) {
        customSubmitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const formElement = document.getElementById('gform_4');
            if (formElement) {
                if (typeof jQuery !== 'undefined') {
                    jQuery(formElement).trigger('submit');
                } else {
                    formElement.submit();
                }
            }
        });
    }

    runCustomFormFixes();
});

function runCustomFormFixes() {
    restrictDateDropdown();
    addRequiredAsterisk();
    removeAsterisksFromLegends();
    wrapLabelText();
    populateUTMFields();
}

const observer = new MutationObserver((mutations) => {
    let shouldUpdate = false;
    
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
                if (node.classList.contains('required-asterisk') || node.classList.contains('label-text-wrapper')) return;
                
                shouldUpdate = true;

                const selects = node.querySelectorAll ? node.querySelectorAll('select') : [];
                const inputs = node.querySelectorAll ? node.querySelectorAll('input[type="text"], input[type="number"], input[type="email"], input[type="tel"], textarea') : [];
                
                if (node.tagName === 'SELECT') applyClasses(node, 'form-select');
                if (['INPUT', 'TEXTAREA'].includes(node.tagName) && !['checkbox', 'radio', 'hidden'].includes(node.type)) applyClasses(node, 'form-control');

                selects.forEach(s => applyClasses(s, 'form-select'));
                inputs.forEach(i => applyClasses(i, 'form-control'));
            }
        });
    });

    if (shouldUpdate) {
        observer.disconnect();
        runCustomFormFixes();
        startObserver();
    }
});

function applyClasses(el, className) {
    if (!el.classList.contains(className)) {
        el.classList.add(className, 'rounded-0');
    }
}

function startObserver() {
    const formWrapper = document.querySelector('.gform_wrapper');
    if (formWrapper) {
        observer.observe(formWrapper, { childList: true, subtree: true });
    }
}

const formWrapper = document.querySelector('.gform_wrapper');
if (formWrapper) {
    startObserver();
    formWrapper.querySelectorAll('select').forEach(s => applyClasses(s, 'form-select'));
    formWrapper.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea').forEach(i => applyClasses(i, 'form-control'));
}

function restrictDateDropdown() {
    const yearSelect = document.getElementById('input_4_16_3');
    if (!yearSelect) return;

    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 5;
    const options = Array.from(yearSelect.options);
    
    options.forEach(option => {
        const year = parseInt(option.value);
        if (option.value === "") return;

        if (year < currentYear || year > maxYear) {
            option.remove();
        }
    });

    if (!yearSelect.value) {
        yearSelect.value = currentYear;
    }
}

function addRequiredAsterisk() {
    const targetInputs = ['input_4_1_3', 'input_4_5_1', 'input_4_1_6', 'input_4_5_3', 'input_4_5_4', 'input_4_5_5', 'input_4_5_6'];

    targetInputs.forEach(inputId => {
        const label = document.querySelector(`label[for="${inputId}"]`);
        if (label && !label.querySelector('.required-asterisk')) {
            const originalText = label.innerHTML;
            label.innerHTML = `${originalText} <span class="required-asterisk" style="color: red; margin-left: 2px;">*</span>`;
        }
    });
}

function removeAsterisksFromLegends() {
    const legends = document.querySelectorAll('.gform_wrapper legend');
    const asteriskRegex = /\s*\*\s*/g;

    legends.forEach(legend => {
        if (asteriskRegex.test(legend.innerHTML)) {
            legend.innerHTML = legend.innerHTML.replace(asteriskRegex, '');
        }
    });
}

function wrapLabelText() {
    const targetText = "Desired Project Start Date";
    const labels = document.querySelectorAll('legend');

    labels.forEach(label => {
        if (label.querySelector('.label-text-wrapper')) return;

        label.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.includes(targetText)) {
                const text = node.textContent;
                const span = document.createElement('span');
                span.className = 'd-block small specs';
                span.textContent = targetText;

                const parts = text.split(targetText);
                const beforeText = document.createTextNode(parts[0]);
                const afterText = document.createTextNode(parts[1]);

                label.replaceChild(beforeText, node);
                label.insertBefore(span, beforeText.nextSibling);
                label.insertBefore(afterText, span.nextSibling);
            }
        });
    });
}

function populateUTMFields() {
    const urlParams = new URLSearchParams(window.location.search);
    const utmMap = {
        'utm_campaign': 'input_4_17',
        'utm_source': 'input_4_18',
        'utm_medium': 'input_4_19',
        'utm_content': 'input_4_20'
    };

    for (const [utmParam, inputId] of Object.entries(utmMap)) {
        if (urlParams.has(utmParam)) {
            const inputEl = document.getElementById(inputId);
            if (inputEl) {
                inputEl.value = urlParams.get(utmParam);
            }
        }
    }
}

if (typeof jQuery !== 'undefined') {
    jQuery(document).on('gform_confirmation_loaded', function(event, formId) {
        if (formId == 4) { 
            const sidebar = document.getElementById('summary-sidebar');
            if (sidebar) {
                sidebar.style.display = 'none';
            }
        }
    });
}