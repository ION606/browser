import { BrowserWindow, ipcMain } from 'electron'
import { addHistory, displayHistory, getHistory } from '../serverJS/history.cjs';
import fs from 'fs';
import { findPath } from './paths.js';
import * as tabModule from '../serverJS/tabs_server.js';
import loggermod from '../utils/logger.cjs';
import { getSitePerms, promptForPerms, setSitePerms } from './dialogue.js';
const { logger } = loggermod;


/**
 * 
 * @param {Electron.Session} customSession 
 */
export default function init(customSession) {
    logger.info('ipc initiated');
    ipcMain.on('ping', (event) => {
        logger.info(`server recieved ping from ${event.sender.id}`);
        event.sender.send('pong');
    });

    ipcMain.on('display-history', (event, uid) => displayHistory(uid, event.sender));
    ipcMain.handle('get-history', async (_, uid) => getHistory(uid));
    ipcMain.on('tab-open', (e, id) => tabModule.openTab(e, id, customSession));
    ipcMain.on('tab-close', (e, id) => tabModule.closeTab(e, id, customSession));
    ipcMain.on('tab-new', (e, id, url) => tabModule.addTab(e, id, customSession, url));
    ipcMain.on('add-tab-external', (e, url) => tabModule.addTabExternal(url, customSession));

    ipcMain.on('set-site-perms', (e, sitehostname, id, value) => setSitePerms(e, sitehostname, id, value));
    ipcMain.on('set-site-perms-all', (e, sitehostname, id, value) => setSitePerms(e, sitehostname, id, value, true));
    ipcMain.on('get-site-perms', getSitePerms);
    ipcMain.on('prompt-terms', (e, sitehostname) => promptForPerms(tabModule.getCurrentWindow(), sitehostname));

    // TODO: make an actual settings page
    ipcMain.on('open-settings', async (e) => promptForPerms(tabModule.getCurrentWindow(), await tabModule.getCurrentTab()?.webContents.executeJavaScript('window.location.hostname')));
}


const renderer = (fs.readFileSync(await findPath('renderer.js'), 'utf-8')),
    optimize = (fs.readFileSync(await findPath('optimize.js'), 'utf-8')),
    adblock = (fs.readFileSync(await findPath('clientAdBlock.js'), 'utf-8'))


/**
 * @param {BrowserWindow} mainWindow
 */
export async function startinject(mainWindow, uid) {
    // execute the script in the renderer process
    await mainWindow.webContents.executeJavaScript(renderer);
    await mainWindow.webContents.executeJavaScript(optimize);
    await mainWindow.webContents.executeJavaScript(adblock);
    const perms = (await getSitePerms(null, mainWindow.webContents.getURL())) || {};
    await mainWindow.webContents.executeJavaScript(`setupAdBlock(${JSON.stringify(perms)})`);

    const title = await mainWindow.webContents.executeJavaScript('document.title');
    addHistory(uid, mainWindow.webContents.getURL(), 200, title);
}