import { BrowserWindow, dialog } from 'electron';
import { findPath } from './paths.js';
import { redisclient } from '../serverJS/history.cjs';

const preloadpath = await findPath('permspopup.cjs', true);

export async function askUserQuestion(window, title, question) {
    const response = await dialog.showMessageBox(window, {
        buttons: ['Yes', 'No'],
        defaultId: 0,
        cancelId: 1,
        title,
        message: question,
    });

    return response.response === 0; // true if 'Yes' was clicked, false if 'No'
}



const perms = ["geolocation", "camera", "microphone", "notifications", "popups"];

export async function promptForPerms(window, origin) {
    return new Promise(async (resolve) => {
        const w = new BrowserWindow({
            height: 600,
            width: 400,
            alwaysOnTop: true,
            autoHideMenuBar: true,
            darkTheme: true,
            modal: true,
            parent: window,
            webPreferences: {
                contextIsolation: true,
                javascript: true,
                allowRunningInsecureContent: false,
                nodeIntegration: true,
                preload: preloadpath
            }
        });
    
        await w.loadFile(await findPath('permspopup.html'), {
            search: `origin=${origin}`
        });
        w.show();
        w.on('close', resolve);
    });
}

/**
 * @param {Electron.IpcMainEvent} e 
 * @param {String} sitehostname 
 * @param {String} id 
 * @param {String} value 
 */
export async function setSitePerms(e, sitehostname, id, value = 'ask', all = false) {
    const client = await redisclient(),
        dataRaw = await client.get(`perms-${sitehostname}`),
        data = dataRaw ? JSON.parse(dataRaw) : null;

    if (all || !data) await client.set(`perms-${sitehostname}`, JSON.stringify(Object.fromEntries(perms.map(p => [p, value]))));
    else {
        data[id] = value;
        await client.set(`perms-${sitehostname}`, JSON.stringify(data));
    }

    if (e?.sender) e.sender.send('site-perms', JSON.stringify(data));
}

/**
 * @param {Electron.IpcMainEvent} e 
 * @param {String} sitehostname 
 */
export async function getSitePerms(e, sitehostname) {
    const client = await redisclient();
    if (!e) return await client.get(`perms-${sitehostname}`);
    else e.sender.send('site-perms', await client.get(`perms-${sitehostname}`));
}
