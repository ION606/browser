
const findLink = (el) => {
    if (el.href) return el.href;
    else if (el.parentElement && el.parentElement !== document.body) return findLink(el.parentElement);
    else return null;
}


function showContextMenu(e) {
    document.querySelectorAll('.context-menu').forEach(el => el.remove());

    const contextMenuActions = {
        'open in new tab': (url) => window.tabAPI.newTab(url),
        'test': () => console.log('test')
    }
    
    // create the main context menu container
    const contextMenu = document.createElement('div');
    contextMenu.classList.add('context-menu');
    contextMenu.id = 'contextMenu';

    // loop through menu options and create each item
    const l = findLink(e.target);

    for (const key in contextMenuActions) {
        if (!l && key === 'open in new tab') continue;
        
        const menuItem = document.createElement('div');
        menuItem.classList.add('context-menu-item');
        menuItem.textContent = key;

        menuItem.onclick = (_) => {
            if (l && key === 'open in new tab') contextMenuActions[key](l);
            else contextMenuActions[key](e.target);
        }
        contextMenu.appendChild(menuItem);
    }

    // window.safeHTML.write('body', contextMenu.outerHTML);
    document.body.appendChild(contextMenu);

    // position the menu at the cursor position
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;

    // event listener to hide the context menu on click
    document.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target)) contextMenu.remove();
    });
}


document.removeEventListener('contextmenu', showContextMenu);
document.addEventListener('contextmenu', showContextMenu);