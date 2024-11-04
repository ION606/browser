const { contextBridge, ipcRenderer } = require('electron');

const tabClick = (tab, tabsContainer) => {
    tab.addEventListener('click', () => {
        if (tab.classList.contains('active')) return;

        const tabs = tabsContainer.querySelectorAll('.tab');
        tabs.forEach(t => t.classList.remove('active'));

        tab.classList.add('active');
        ipcRenderer.send('tab-open', Number(tab.dataset.tab));
    });
}


function setup() {
    ipcRenderer.send('ping');

    const tabsContainer = document.querySelector('.browser-tabs'),
        tabs = document.querySelectorAll('.tab'),
        addTabButton = document.querySelector('#addtabbtn'),
        settingsbtn = document.querySelector('#settingsbtn');

    tabs.forEach(tab => tabClick(tab, tabsContainer));

    addTabButton.addEventListener('click', () => {
        // create a new tab element
        const newTab = document.createElement('button');
        newTab.classList.add('tab');
        newTab.dataset.tab = `${tabsContainer.children.length}`;
        newTab.textContent = `Tab ${tabsContainer.children.length}`;
        tabsContainer.appendChild(newTab);
        newTab.scrollIntoView({ behavior: 'smooth' });

        ipcRenderer.send('tab-new', tabsContainer.children.length - 1);

        // add click event listener to the new tab
        newTab.addEventListener('click', () => tabClick(newTab, tabsContainer));
    });

    settingsbtn.addEventListener('click', () => ipcRenderer.send('open-settings'))
}



process.once("loaded", () => {
    contextBridge.exposeInMainWorld('tabapi', {
        ping: () => ipcRenderer.send('ping'),
        click: () => ipcRenderer.invoke('tab-open'),
        close: () => ipcRenderer.invoke('tab-close'),
        newtab: () => ipcRenderer.invoke('tab-new')
    });

    if (document.readyState === 'complete') setup();
    else document.addEventListener('DOMContentLoaded', () => setup());


    ipcRenderer.on('pong', () => console.info('the server replied with pong'));
});

// document.addEventListener('click', () => ipcRenderer.send('ping'));