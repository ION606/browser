import fs from 'fs';
import mhtml2html from 'mhtml2html';
import { BaseWindow, WebContentsView } from 'electron';
import { createWebview } from '../utils/webviewHelpers.js';
import { CACHE_DIRECTORY, getLoadPath, saveTabState } from '../utils/clearCache.js';
import path from 'path';
import { logger } from './imports.js';

const webViewContentsMap = {}; // Memory storage for active tabs


/**
 * returns the focused window, if there is no focused window, returns the first one spawned
 */
const getCurrentWindow = () => {    
    const allWins = BaseWindow.getAllWindows(),
        w = allWins.find((win) => win.isFocused());
    if (!w && allWins.length > 0) return allWins?.at(0);
    else return w;
};
/**
 * @returns {Electron.CrossProcessExports.WebContentsView | undefined}
 */
const getCurrentTab = () => {
    const cw = getCurrentWindow();
    return cw?.currentView;
}

const settabqual = (tabId) => getCurrentTab().webContents.executeJavaScript('setQuality()').catch(err => logger.warn(`setting quality for window ${tabId} failed with reason:\`\`\`${err}\`\`\``));


/**
 * Switch to the specified view by its ID.
 * @param {string | Electron.WebContentsView} tabId 
 */
async function switchToView(tabId) {
    const currentWindow = getCurrentWindow();

    /** @type {WebContentsView} */
    const viewData = (tabId instanceof WebContentsView) ? tabId : webViewContentsMap[tabId];

    if (!viewData || !currentWindow) return;
    else if (viewData.id < 0) return; // Don't modify views with negative IDs

    viewData.webContents.setBackgroundThrottling(false);

    const id = tabId.id || tabId;

    // Save the current active view state

    // find the non-background-playing window
    /** @type {WebContentsView} */
    const oldView = currentWindow.contentView.children.find((view) => view instanceof WebContentsView && (view.id >= 0 && !view.webContents.isCurrentlyAudible()));

    // undo the optimizations
    const undoOptimize = async () => {
        await viewData.webContents.executeJavaScript('revertQuality()');
        viewData.setVisible(true);
    }

    if (oldView) {
        // REMOVEME
        // currentWindow.contentView.removeChildView(oldView);

        console.log(`saving`, JSON.stringify(id));
        // DO NOT AWAIT THIS CALL FFS, INEFFICIENT!!!
        saveTabState(oldView.id, oldView).then(() => console.log(`saved ${id}`));
        currentWindow.contentView.removeChildView(oldView);
        if (viewData.webContents.isCurrentlyAudible()) return undoOptimize();
    }
    else if (viewData?.webContents?.isCurrentlyAudible()) return undoOptimize();

    // Set the new view as active and add it to the window
    // viewData.webContents.setBackgroundThrottling(true);
    currentWindow.contentView.addChildView(viewData);
    await viewData.webContents.loadURL('https://start.duckduckgo.com');

    currentWindow.contentView.children.map(c => c.setVisible((c.id === id) || c.id < 0));
    currentWindow.contentView.children.map(c => console.log(c.id, c.webContents.isCurrentlyAudible()));
    settabqual(tabId);
}


/**
 * moves the tab to the "background" and tries to minimize the footprint
 * @param {Electron.BaseWindow} currentWindow 
 * @param {String} tabId 
 * @param {Electron.WebContentsView} oldView
 */
async function shiftTabToBK(currentWindow, tabId, oldView, customSession) {
    try {
        webViewContentsMap[oldView.id] = oldView;
        // this is currently playing stuff, keep it open
        oldView.webContents.setBackgroundThrottling(false);
        oldView.setVisible(false);

        // TODO: optimize the page more
        settabqual(tabId);
        
        const newView = await createWebview(tabId, currentWindow, customSession);
        webViewContentsMap[tabId] = newView;

        switchToView(newView);
    }
    catch (err) {
        console.error(err);
        return null;
    }
}


/**
 * Add a new tab with caching.
 * @param {string} tabId
 * @param {Electron.Session} customSession
 * @param {string} [url]
 */
async function addTab(event, tabId, customSession, url = 'https://duckduckgo.com', isOpen = false) {
    const currentWindow = getCurrentWindow();
    const tabPath = getLoadPath(tabId),
        currentTab = getCurrentTab();

    if (currentTab?.webContents?.isCurrentlyAudible() && !isOpen) return shiftTabToBK(currentWindow, tabId, currentTab, customSession);
    else if (webViewContentsMap[tabId]?.webContents.isCurrentlyAudible()) return switchToView(tabId);
    const newView = await createWebview(tabId, currentWindow, customSession);
    webViewContentsMap[tabId] = newView;

    if (tabPath && fs.existsSync(tabPath)) newView.webContents.loadFile(tabPath);
    else newView.webContents.loadURL(url);

    switchToView(newView);
}

/**
 * Close a tab and save its state to disk.
 * @param {string} tabId
 */
async function closeTab(event, tabId) {
    const currentWindow = getCurrentWindow();
    const view = webViewContentsMap[tabId];

    if (view && view.id >= 0) {
        await saveTabState(tabId, view.webContents);
        currentWindow.contentView.removeChildView(view);
        view.webContents.destroy();
        delete webViewContentsMap[tabId];
    }
}

/**
 * Open an existing tab by restoring its cached state.
 * @param {string} tabId
 */
function openTab(event, tabId, customSession) {
    addTab(event, tabId, customSession, undefined, true); // Reopen the tab by calling addTab with its ID
}


function organizeTabIds() {
    const tabs = fs.readdirSync(CACHE_DIRECTORY, { withFileTypes: true })
        .filter(o => (o.isFile() && o.name.endsWith('.html')))
        .map(o => o.name);

    const tmpcachepath = 'cache/tmp/tabs';
    fs.mkdirSync(tmpcachepath, { recursive: true });

    for (let i = 0; i < tabs.length; i++) {
        fs.cpSync(`${CACHE_DIRECTORY}/${tabs[i]}`, `${tmpcachepath}/${i}.html`);
    }

    fs.rmSync(CACHE_DIRECTORY, { recursive: true });
    fs.cpSync(tmpcachepath, CACHE_DIRECTORY, { recursive: true });
    fs.rmSync(tmpcachepath, { recursive: true });
}


export { closeTab, addTab, openTab, getCurrentWindow, getCurrentTab, organizeTabIds };
