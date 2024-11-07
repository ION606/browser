import { BrowserWindow } from 'electron';
import fs from 'fs';
import dns from 'dns';
import path from 'path';

const history = (fs.readFileSync(path.resolve(import.meta.dirname, '../CSS', 'history.css')).toString()),
    tabs = (fs.readFileSync(path.resolve(import.meta.dirname, '../CSS', 'tabs.css')).toString());

export const isValidURL = (u) => {
    try { return new URL(u); }
    catch (err) { return false; }
}


/**
 * 
 * @param {BrowserWindow} window 
 * @param {String} hostname 
 */
export async function addEl(window, hostname) {
    let src = '';
    switch (hostname) {
        case 'lite.duckduckgo.com': src = 'duckduckgo.css';
            break;

        case 'www.youtube.com': src = 'youtube.css';
            break;

        default: //logger.info(origin);
    }

    const p = path.resolve(import.meta.dirname, '../CSS', src);

    if (src && fs.existsSync(p)) {
        const srccontent = fs.readFileSync(p).toString();
        window.webContents.insertCSS(srccontent);
        // window.webContents.executeJavaScript(`window.safeHTML.addStylesheet(undefined, \`${srccontent}\`)`);
    }

    window.webContents.insertCSS(history);
    window.webContents.insertCSS(tabs);

    // window.safdocument.addEventListener('')eHTML.addStylesheet(srccontent, `https://ion-local.${window.location.hostname}/${src}`);
    // window.safeHTML.addStylesheet(history, `https://ion-local.${window.location.hostname}/history.css`);

    // window.webContents.executeJavaScript(`window.safeHTML.addStylesheet(undefined, \`${history}\`)`);
    // window.webContents.executeJavaScript(`window.safeHTML.addStylesheet(undefined, \`${tabs}\`)`);
}


export function checkInternetConnectivity() {
    return new Promise((resolve) => {
        // Check if a known domain can be resolved (e.g., Google DNS).
        dns.lookup('8.8.8.8', async (err) => {
            if (err && err.code === 'ENOTFOUND') {
                resolve(false); // Domain couldn't be resolved
            } else {
                try {
                    resolve((await fetch('https://www.google.com')).ok);
                }
                catch (err) {
                    resolve(false);
                }
            }
        });
    });
}