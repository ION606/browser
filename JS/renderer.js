function runinit() {
    console.info("added renderer script!");
    sessionStorage.setItem('ran-renderer', 1);
    forceDarkMode();
}


var removehbar = removehbar || function (e) {
    const hbar = document.querySelector('#historybar');
    if (!hbar || hbar.contains(e?.target)) return;

    // slide out by setting margin-left to -100%
    hbar.style.marginLeft = '-100%';
    setTimeout(() => hbar.remove(), 500);

    document.removeEventListener('click', removehbar);
}


function showHistory(...h) {
    if (Array.isArray(h[0])) h = h.flat(1);
    const hbar = document.querySelector('#historybar');
    if (hbar) return removehbar();

    setTimeout(() => document.addEventListener('click', removehbar), 1000);

    const sidebar = document.createElement('div');
    sidebar.id = 'historybar';
    sidebar.style.marginLeft = '-100%'; // start off-screen

    const t = document.createElement('table'),
        tbody = document.createElement('tbody');

    t.appendChild(tbody);

    h.forEach(iraw => {
        const i = (typeof iraw === 'string') ? JSON.parse(iraw) : iraw,
            el = document.createElement('tr'),
            el2 = document.createElement('td'),
            a = document.createElement('a');

        a.textContent = i.title;
        a.href = i.query;
        a.style.width = '100%';
        a.style.height = '100%';

        el2.appendChild(a);
        el.appendChild(el2);
        tbody.appendChild(el);
    });

    sidebar.appendChild(t);
    document.body.appendChild(sidebar);

    // force reflow to apply the transition correctly
    window.getComputedStyle(sidebar).marginLeft;

    // slide in by setting margin-left to 0
    sidebar.style.marginLeft = '0';
}


function forceDarkMode() {
    document.querySelector('[value="night"]')?.click();  // wikipedia

    // manual
    // function to convert rgb values to a hex string
    const rgbToHex = (r, g, b) => {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    // function to get the computed background and text color of the body
    const checkColors = () => {
        const body = document.querySelector('body') || document.querySelector('main') // select the body element
        const bgColor = window.getComputedStyle(body).backgroundColor // get background color
        const textColor = window.getComputedStyle(body).color // get text color

        // parse the rgb values from the background and text color
        const bgMatch = bgColor.match(/\d+/g)
        const textMatch = textColor.match(/\d+/g)

        // if both colors are in rgb format
        if (bgMatch && textMatch) {
            const bgHex = rgbToHex(parseInt(bgMatch[0]), parseInt(bgMatch[1]), parseInt(bgMatch[2]))
            const textHex = rgbToHex(parseInt(textMatch[0]), parseInt(textMatch[1]), parseInt(textMatch[2]))

            // check if background is white (#FFFFFF) and text is dark (let's assume below #777777 as dark)
            if (bgHex === "#FFFFFF" && textHex <= "#777777") {
                // swap the background to dark and text to light
                body.style.backgroundColor = "#000000" // set background to black
                body.style.color = "#FFFFFF" // set text color to white
            }
        }
    }
    checkColors();
}


document.addEventListener('DOMContentLoaded', runinit);
if (document.readyState === 'complete' && !sessionStorage.getItem('ran-renderer')) runinit();