import NodeCache from "node-cache";
import fs from 'fs';
import fsp from 'fs/promises';
import path from "path";
import { addTab } from "../serverJS/tabs_server.js";
import loggermod from '../utils/logger.cjs';
import spawnWorker from "../serverJS/spawnworker.js";
const { logger } = loggermod;

// go through all saved web pages and save them as a JSON object with ID: URL to load on browser start
// delete the tabCache directory

// Path to the directory where cached tab data will be saved
export const CACHE_DIRECTORY = path.join(process.cwd(), 'cache', 'tabCache');
if (!fs.existsSync(CACHE_DIRECTORY)) fs.mkdirSync(CACHE_DIRECTORY);

const cache = new NodeCache({
    checkperiod: 1,
    deleteOnExpire: true,
    errorOnMissing: false,
    useClones: false
});

export async function updateTabUrl(tabId, view) {
    try {
        const url = await view.webContents.executeJavaScript('window.location.href');
        const fpath = path.join(CACHE_DIRECTORY, 'tabs.json');

        let tabs = {};
        try {
            const fileData = await fsp.readFile(fpath, 'utf-8');
            tabs = JSON.parse(fileData);
        } catch (err) {
            if (err.code !== 'ENOENT') return logger.info(err);
        }

        tabs[tabId] = tabs[tabId] || url;
        await fsp.writeFile(fpath, JSON.stringify(tabs), 'utf-8');
        logger.info(`Updated URL for tab ${tabId}`);
    } catch (err) {
        logger.error(`Error updating tab URL: ${err.message}`);
    }
}

async function readPartOfFile(filePath, start = 0, length = 200) {
    // open the file in read-only mode
    const fileHandle = await fsp.open(filePath, 'r');

    try {
        const buffer = Buffer.alloc(length);
        const { bytesRead } = await fileHandle.read(buffer, 0, length, start);
        const s = buffer.subarray(0, bytesRead).toString('utf8');

        // regex to match the URL inside the HTML comment
        const commentRegex = /<!--\s*saved from url=\(\d+\)((https?|file):\/\/[^\s]+)\s*-->/i
        const match = s.match(commentRegex);

        return (match && match[1]) ? match[1] : null;

    } finally {
        await fileHandle.close();
        return null;
    }
}


export async function finalTabCleanup() {
    const jsonfile = `${CACHE_DIRECTORY}/tabs.json`,
        fnames = fs.readdirSync(`${CACHE_DIRECTORY}`, { withFileTypes: true })
            .filter(o => o.isFile() && !o.name.endsWith('.json'));

    const jsonconf = (fs.existsSync(jsonfile)) ? JSON.parse(fs.readFileSync(jsonfile, 'utf-8')) : {};

    const jsonconfnew = await Promise.all(fnames.map(async ({ name }) => {
        const fpath = `${CACHE_DIRECTORY}/${name}`,
            tabid = name.replace('.html', '');
        if (jsonconf[tabid]) return [tabid, jsonconf[tabid]];

        const flink = await readPartOfFile(fpath);
        return [tabid, flink];
    }));

    const o = Object.fromEntries(jsonconfnew);
    logger.info(o);

    if (!fs.existsSync(`${process.cwd()}/cache/tabs.json`)) fs.writeFile(`${process.cwd()}/cache/tabs.json`, JSON.stringify(o), (err) => {
        if (err) logger.error(err);
    });
    fs.rmSync(CACHE_DIRECTORY, { recursive: true });
}


// Save tab state to disk when switching or closing a tab
/**
 * @param {*} tabId 
 * @param {Electron.WebContentsView} view 
 */
export async function saveTabState(tabId, view) {
    return new Promise(async (resolve) => {
        const savePath = path.join(CACHE_DIRECTORY, `${tabId}.mhtml`);
        if (fs.existsSync(savePath)) {
            // fs.rmSync(`${CACHE_DIRECTORY}/${tabId}_files`, { recursive: true });
            fs.rmSync(savePath);
        }

        try {
            view.webContents.savePage(savePath, 'MHTML').then(() => {
                spawnWorker('convertpage', [savePath, tabId]);
                updateTabUrl(tabId, view).then(() => resolve(true));
            });
        } catch (err) {
            logger.error(err);
            resolve(false);
        }
    })
}


export function getSavedTabs() {
    try {
        const tabpath = `${process.cwd()}/cache/tabs.json`;
        if (fs.existsSync(tabpath)) {
            const tabs = fs.readFileSync(tabpath, 'utf-8');
            // fs.rmSync(tabpath);
            return JSON.parse(tabs);
        }
        else return {};
    }
    catch (err) {
        logger.error(err);
        return {};
    }
}


export async function loadTabs(customSession, tabs) {
    try {
        for (const key in tabs) {
            await addTab(null, key, customSession, tabs[key]);
        }
    }
    catch (err) {
        logger.error(err);
    }
}


export function removeTabData(tabId) {
    const savePath = path.join(CACHE_DIRECTORY, `${tabId}.mhtml`);
    if (fs.existsSync(savePath)) {
        fs.rmSync(`${CACHE_DIRECTORY}/${tabId}_files`, { recursive: true });
        fs.rmSync(savePath);
    }

    const fpath = `${CACHE_DIRECTORY}/tabs.json`,
        tabs = (fs.existsSync(fpath)) ? JSON.parse(fs.readFileSync(fpath, 'utf-8')) : {};
    if (tabs[tabId]) delete tabs[tabId];
    fs.writeFileSync(fpath, JSON.stringify(tabs), 'utf-8');
}


export const getLoadPath = (tabId) => path.join(CACHE_DIRECTORY, `${tabId}.html`);


if (process.argv?.at(2)?.trim() === '--ischildproc') finalTabCleanup();