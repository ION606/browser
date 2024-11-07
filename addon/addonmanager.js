import { isValidURL } from "../utils/misc.js";
import { findPath } from "../utils/paths.js";


import fs from 'fs';
const youtube = fs.readFileSync(await findPath('youtubeutils.js'));

/**
 * @param {Electron.WebContents} contents
 */
const youtubeinject = (contents) => {
    const f = () => contents.executeJavaScript(youtube).then(() => contents.executeJavaScript('injectDislike()'));
    contents.addListener('did-finish-load', f);
    contents.addListener('did-navigate', async (_) => {
        const hostname = await contents.executeJavaScript('window.location.hostname');
        if (hostname !== 'www.youtube.com') return contents.removeListener('did-navigate', f);
        else f();
    })
}


/**
 * @param {Electron.WebContents} contents
 */
export default async function addonManager(contents) {
    try {
        const hostname = await contents.executeJavaScript('window.location.hostname');

        if (hostname === 'www.youtube.com') return youtubeinject(contents);
        
        return {};
    }
    catch (err) {
        console.error(err);
        return {};
    }
}