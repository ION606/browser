import { StaticNetFilteringEngine } from '@gorhill/ubo-core';
import fsPromise from 'fs/promises';
import { checkInternetConnectivity } from '../utils/misc.js';
import loggermod from '../utils/logger.cjs';
const { logger } = loggermod,
    adblockcachepath = 'cache/adblock';


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
    return fetch(url)
        .then(r => r.text())
        .then(raw => ({ raw }))
        .catch(reason => logger.error(reason));
}


const snfe = await StaticNetFilteringEngine.create();

const apiUrl = `https://api.github.com/repos/uBlockOrigin/uAssets/contents/filters`;
const getFilesFromDirectory = async () => {
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        // check if the response data is an array (list of files)
        if (Array.isArray(data)) return data.filter(file => file.type === 'file').map(o => o.download_url);
        else console.log('No files found or the directory path is incorrect.');
    } catch (error) {
        console.error('Error fetching files:', error.message);
    }
};

const pathToSelfie = 'cache/selfie.txt';
if (!(await import('fs')).existsSync(adblockcachepath)) await fsPromise.mkdir(adblockcachepath);

// Up to date serialization data (aka selfie) available?
let selfie;
const ageInDays = await fsPromise.stat(pathToSelfie).then(stat => {
    const fileDate = new Date(stat.mtime);
    return (Date.now() - fileDate.getTime()) / (7 * 24 * 60 * 60);
}).catch(() => Number.MAX_SAFE_INTEGER);

// Use a selfie if available and not older than 7 days
if (ageInDays <= 7) {
    selfie = await fsPromise.readFile(pathToSelfie, { encoding: 'utf8' })
        .then(data => typeof data === 'string' && data !== '' && data)
        .catch(() => { });
    if (typeof selfie === 'string') {
        await snfe.deserialize(selfie);
    }
}

// Fetch filter lists if no up to date selfie available
if (!selfie && (await checkInternetConnectivity())) {
    logger.info(`Fetching lists...`);
    const totalLists = new Set(blocklists.concat(...(await getFilesFromDirectory())));
    await snfe.useLists([...totalLists].map(fetchList).filter(o => o));

    logger.info(`using ${totalLists.size} adblock lists`)

    const selfie = await snfe.serialize();
    fsPromise.mkdir('cache', { recursive: true });
    await fsPromise.writeFile(pathToSelfie, selfie);
}


/**
 * runs ublock origin url safe-checking
 */
const blocked = (url, originURL = undefined, mimeType = undefined) => url ? snfe.matchRequest({ url, originURL, type: mimeType }) : false;
export default blocked;