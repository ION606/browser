function convertToNumber(text) {
    const trimmedText = text.trim().toUpperCase();
    const suffixMultipliers = {
        K: 1_000,
        M: 1_000_000,
        B: 1_000_000_000,
        T: 1_000_000_000_000
    };
    const regex = /^(\d+(?:\.\d+)?)([KMBT]?)$/;
    const match = trimmedText.match(regex);

    if (!match) {
        throw new Error('Invalid format');
    }

    const [, numberPart, suffix] = match;
    const num = parseFloat(numberPart);

    return num * (suffix ? suffixMultipliers[suffix] : 1);
}



async function waitForEl(selector) {
    return new Promise(resolve => {
        const i = setInterval(() => {
            if (document.querySelector(selector)) {
                clearInterval(i);
                resolve(true);
            }
        }, 500)
    });
}



async function injectDislike() {
    try {
        const vid = new URLSearchParams(window.location.search)?.get('v');

        if (!vid) return console.info('VID not found!')
        const r = await fetch(`https://returnyoutubedislikeapi.com/votes?videoId=${vid}`, {
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            },
            method: 'GET'
        });

        const data = await r.json(),
            { dateCreated, dislikes, likes, viewCount } = data;

        // document.querySelector('like-button-view-model')
        //     ?.querySelector('.yt-spec-button-shape-next__button-text-content')
        //     ?.textContent

        const dislikelstr = 'dislike-button-view-model yt-touch-feedback-shape';
        await waitForEl(dislikelstr);

        const dislikel = document.querySelector(dislikelstr);
        dislikel?.querySelectorAll('.yt-spec-button-shape-next__button-text-content')?.forEach(el => el?.remove());

        window.safeHTML.write(dislikelstr, `<div class="yt-spec-button-shape-next__button-text-content">${dislikes}</div>`);
    }
    catch (err) {
        console.error(err);
        return { dislikes: -1 };
    }
}


window.addEventListener('DOMContentLoaded', injectDislike);