const { ipcRenderer } = require("electron");

ipcRenderer.on('conf', (e, id) => {
    document.querySelector(id).style.borderColor = 'green';
})

window.onbeforeunload = () => window.close();

document.addEventListener('DOMContentLoaded', () => {
    const title = new URLSearchParams(window.location.search).get('origin');
    document.querySelector('#sitename').textContent = title;

    ipcRenderer.send('get-site-perms', title);
    ipcRenderer.on('site-perms', (e, permsRaw) => {
        const perms = JSON.parse(permsRaw);
        if (!perms) return ipcRenderer.send('set-site-perms-all', title, 'ask');

        document.querySelector('#loading').style.display = 'none';

        for (const key in perms) {
            const el = document.querySelector(`#${key}`);
            if (el.value === perms[key]) el.style.border = 'solid green 1px';
            el.value = perms[key];
        }
    });

    document.querySelectorAll('select').forEach((el) => {
        el.addEventListener('change', (e) => {
            e.preventDefault();
            e.target.style.border = 'none';
            document.querySelector('#loading').style.display = 'flex';
            const { id, value } = e.target;
            ipcRenderer.send('set-site-perms', title, id, value);
        });
    });

});