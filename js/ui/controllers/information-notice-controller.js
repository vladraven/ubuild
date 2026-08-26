export function createInformationNoticeController() {
    function bind() {
        const information = document.getElementById('information');
        if (!information) return;

        const alert = information.querySelector('.alert');
        if (!alert) return;

        setTimeout(() => {
            alert.style.transition = 'opacity .5s ease';
            alert.style.opacity = '0';
            setTimeout(() => information.remove(), 500);
        }, 3000);
    }

    return Object.freeze({ bind });
}
