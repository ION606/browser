function checkAdBlock(url, target, features, originalWindowOpen) {
    console.log('A new window is attempting to open:');
    console.log('URL:', url);
    console.log('Target:', target);
    console.log('Features:', features);

    // call the original window.open function if you want the popup to proceed
    return originalWindowOpen.call(window, url, target, features);
}


// needs to be inside the function or it'll get assigned twice
async function setupAdBlock(perms) {
    // attach listeners to the document body for each event type
    ['click', 'mousedown', 'mouseup', 'dblclick', 'keydown', 'keyup', 'submit'].forEach((eventType) => {
        document.body.addEventListener(eventType, (e) => {
            console.log(`Event ${e.type} triggered by:`, e.target);
        }, true); // use capture phase
    });

    const originalWindowOpen = window.open,
        isValidURL = (u) => { try { return new URL(u); } catch (_) { return false; } }

    window.open = (url, target, features) => {
        if (!perms['popup']) return window.electronAPI.promptperms();

        checkAdBlock(url, target, features, originalWindowOpen);
    }

    const linkels = Array.from(document.links),
        imgs = Array.from(document.querySelectorAll('img')),
        allLinks = new Set(linkels.map(el => el.href).filter(isValidURL)),
        imgsrcs = new Set(imgs.map(o => o.src));

    await fetch(`https://ion-adblock.${window.location.hostname}`, {
        body: JSON.stringify([...allLinks]), //['https://pagead2.googlesyndication.com/tag/js/gpt.js']
        headers: { 'Content-Type': 'application/json' },
        method: 'POST'
    })
        .then(r => r.json()).then(rj => {
            const resjson = rj.filter(el => el[1]),
                obj = Object.fromEntries(resjson);

            linkels.forEach(async (el) => {
                if (obj[el.href]) el.remove();
            });
        });


    await fetch(`https://ion-adblock.${window.location.hostname}`, {
        body: JSON.stringify([...imgsrcs]), //['https://pagead2.googlesyndication.com/tag/js/gpt.js']
        headers: { 'Content-Type': 'application/json' },
        method: 'POST'
    })
        .then(r => r.json()).then(rj => {
            const resjson = rj.filter(el => el[1]),
                obj = Object.fromEntries(resjson);

            console.log(obj);
            imgs.forEach(async (el) => {
                if (obj[el.src]) el.remove();
            });
        });

    sessionStorage.setItem('ran-adblock', 1);
    console.log('adblock injected!');
}

// if (document.readyState === 'complete' && !sessionStorage.getItem('ran-adblock')) setupAdBlock();
// else window.addEventListener('DOMContentLoaded', setupAdBlock);