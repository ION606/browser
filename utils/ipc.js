import { BrowserWindow, ipcMain } from 'electron'
import { addHistory, displayHistory, getHistory } from '../serverJS/history.cjs';
import fs from 'fs';
import { findPath } from './paths.js';
import * as tabModule from '../serverJS/tabs_server.js';
import loggermod from '../utils/logger.cjs';
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

    // TODO: add logic here to save/return site perms
    ipcMain.on('set-site-perms', (e, sitehostname) => console.log(sitehostname));
    ipcMain.on('get-site-perms', (e, sitehostname) => {
        console.log(sitehostname);
        e.sender.send('site-perms', { popups: false });
    });
}


const renderer = (fs.readFileSync(await findPath('renderer.js'), 'utf-8')),
    optimize = (fs.readFileSync(await findPath('optimize.js'), 'utf-8'));


/**
 * @param {BrowserWindow} mainWindow
 */
export async function startinject(mainWindow, uid) {
    // execute the script in the renderer process
    mainWindow.webContents.executeJavaScript(renderer);
    mainWindow.webContents.executeJavaScript(optimize);
    // mainWindow.webContents.executeJavaScript(tabs);

    const title = await mainWindow.webContents.executeJavaScript('document.title');
    addHistory(uid, mainWindow.webContents.getURL(), 200, title);
}