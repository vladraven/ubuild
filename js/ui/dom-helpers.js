// Small, framework-free DOM helpers shared by every controller in js/ui/.
// Extracted verbatim from the old monolithic UIAdapter.js so behaviour is
// unchanged - only the location moved.

export function setElementVal(selectors, val) {
    for (const s of selectors) {
        const el = document.querySelector(s);
        if (!el) continue;

        el.value = val;

        if (el.tagName === 'SPAN' || el.tagName === 'B') {
            el.textContent = val;
        }
    }
}

export function setElementChecked(selectors, checked) {
    for (const s of selectors) {
        const el = document.querySelector(s);
        if (el && el.type === 'checkbox') {
            el.checked = checked;
        }
    }
}
