import { buildPrintLayout } from './pdfGenerator.js?v=20260731';

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