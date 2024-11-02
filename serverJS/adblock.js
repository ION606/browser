import { StaticNetFilteringEngine } from '@gorhill/ubo-core';
import fs from 'fs/promises';
import { checkInternetConnectivity } from '../utils/misc.js';
import loggermod from '../utils/logger.cjs';
const { logger } = loggermod;


const blocklists = [
    "https://ublockorigin.github.io/uAssetsCDN/filters/badlists.txt",
    "https://ublockorigin.github.io/uAssetsCDN/filters/filters.min.txt",
    "https://ublockorigin.github.io/uAssetsCDN/filters/privacy.min.txt",
    "https://ublockorigin.github.io/uAssetsCDN/filters/badware.txt",
    "https://ublockorigin.github.io/uAssetsCDN/filters/quick-fixes.txt",
    "https://ublockorigin.github.io/uAssetsCDN/filters/unbreak.txt",
    "https://ublockorigin.github.io/uAssetsCDN/filters/annoyances.txt",
    "https://ublockorigin.github.io/uAssetsCDN/filters/lan-block.txt",
    "https://ublockorigin.github.io/uAssetsCDN/thirdparties/easylist.txt",
    "https://ublockorigin.github.io/uAssetsCDN/thirdparties/easyprivacy.txt",
    "https://ublockorigin.github.io/uAssetsCDN/thirdparties/easylist-annoyances.txt",
    "https://ublockorigin.github.io/uAssetsCDN/thirdparties/easylist-cookies.txt",
    "https://ublockorigin.github.io/uAssetsCDN/thirdparties/easylist-newsletters.txt",
    "https://ublockorigin.github.io/uAssetsCDN/thirdparties/easylist-notifications.txt",
    "https://ublockorigin.github.io/uAssetsCDN/thirdparties/easylist-social.txt",
    "https://raw.githubusercontent.com/laylavish/uBlockOrigin-HUGE-AI-Blocklist/main/list.txt"
];


async function fetchList(url) {
    return fetch(url).then(r => {
        return r.text();
    }).then(raw => {
        return { raw };
    }).catch(reason => {
        logger.error(reason);
    });
}


const snfe = await StaticNetFilteringEngine.create();

// const rsf = await fetch('https://api.github.com/repos/uBlockOrigin/uAssets/contents/filters'),
//     safeLists = (await rsf.json()).map(o => o.download_url);

const pathToSelfie = 'cache/selfie.txt';

// Up to date serialization data (aka selfie) available?
let selfie;
const ageInDays = await fs.stat(pathToSelfie).then(stat => {
    const fileDate = new Date(stat.mtime);
    return (Date.now() - fileDate.getTime()) / (7 * 24 * 60 * 60);
}).catch(() => Number.MAX_SAFE_INTEGER);

// Use a selfie if available and not older than 7 days
if (ageInDays <= 7) {
    selfie = await fs.readFile(pathToSelfie, { encoding: 'utf8' })
        .then(data => typeof data === 'string' && data !== '' && data)
        .catch(() => { });
    if (typeof selfie === 'string') {
        await snfe.deserialize(selfie);
    }
}

// Fetch filter lists if no up to date selfie available
if (!selfie && (await checkInternetConnectivity())) {
    logger.info(`Fetching lists...`);
    await snfe.useLists(blocklists.map(fetchList).filter(o => o));

    const selfie = await snfe.serialize();
    fs.mkdir('cache', { recursive: true });
    await fs.writeFile(pathToSelfie, selfie);
}


/**
 * runs ublock origin url safe-checking
 */
const blocked = (url, originURL = undefined, mimeType = undefined) => url ? snfe.matchRequest({ url, originURL, type: mimeType }) : false;
export default blocked;