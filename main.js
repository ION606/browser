// main.js
import { app, BaseWindow, BrowserWindow, session, pushNotifications } from 'electron';
import { exec } from 'child_process';
import path from 'path';
import {
    logger, intercept, setUpShortcuts, organizeTabIds,
    getSavedTabs, loadTabs, flushCookies, askUserQuestion,
    ipcinit, checkInternetConnectivity, findPath, createWebview,
    handleWebViewInit, setupRedis, quitRedis
} from './serverJS/imports.js';


await setupRedis();
export const uid = 1,
    partitionName = 'persist:default',
    agent = 'Chrome';

// ensuring the userData directory is set
app.setPath('userData', path.join(app.getPath('home'), '.ion-browser-data'));
app.commandLine.appendSwitch('load-extension');

if (process.defaultApp) {
    if (process.argv.length >= 2) {
        app.setAsDefaultProtocolClient('ionbrowser', process.execPath, [path.resolve(process.argv[1])]);
    }
} else {
    app.setAsDefaultProtocolClient('ionbrowser');
}


async function createWindow(customSession) {
    organizeTabIds();

    const mainWindow = new BaseWindow({
        width: 800,
        height: 600,
        // backgroundColor: 'black',
        darkTheme: true,
        autoHideMenuBar: true,
        nodeIntegrationInWorker: true,
    });

    const tabWebView = await createWebview(-1, mainWindow, customSession, 'tabs.cjs'),
        mainWebView = await createWebview(0, mainWindow, customSession);

    if (!(await checkInternetConnectivity())) return mainWebView.webContents.loadFile(await findPath('nointernet.html'));

    // load existing cookies
    logger.info('flushing cookies...');
    await flushCookies(customSession);
    logger.info('cookies flushed!');

    // need to load the initial window
    await mainWebView.webContents.loadURL('https://start.duckduckgo.com');

    // tab caching stuff
    const tabs = await getSavedTabs();
    if (Object.keys(tabs).length) {
        const r = await askUserQuestion(mainWindow, 'Restore History', `Would you like to restore ${Object.keys(tabs).length} previous tabs?`);
        if (r) loadTabs(customSession, tabs);
    }
    else {
        // mainWebView.webContents('https://duckduckgo.com/?t=h_&hps=1&start=1&q=hi&ia=web');
        mainWebView.webContents.loadURL('https://www.youtube.com/watch?v=aPO5JaShu2U', { userAgent: agent });
        // mainWebView.webContents.loadURL('https://www.youtube.com', { userAgent: agent });
        // mainWebView.webContents.loadURL('https://electronjs.org');
        mainWebView.webContents.setBackgroundThrottling(true);
        mainWindow.currentView = mainWebView;
    }

    tabWebView.webContents.loadFile(await findPath('tabs.html'));
    // tabWebView.webContents.openDevTools({ mode: 'detach' });
}

app.on('open-url', (e, webURL) => {
    e.preventDefault();
    console.log(`attempted to navigate to ${webURL}`);
});

// listen for app ready event to create window
app.whenReady().then(async () => {
    const customSession = session.fromPartition(partitionName);
    customSession.setPermissionRequestHandler((webContents, permission, callback) => {
        // handle third-party cookies
        if (permission === 'media' || permission === 'display-capture' || permission === 'notifications' || permission === 'fullscreen') {
            callback(true);
        }
        else callback(false);
    });

    // session.defaultSession.webRequest.onBeforeRequest((details, cb) => {
    //     if (details.url.startsWith('https://duckduckgo.com/l/?')) cb({ redirectURL: transformduckurl(details.url) });
    //     else cb({ cancel: false });
    // })

    customSession.protocol.handle('file', (r) => intercept(r, uid));
    customSession.protocol.handle('http', (r) => intercept(r, uid));
    customSession.protocol.handle('https', (r) => intercept(r, uid));

    ipcinit(customSession);
    createWindow(customSession);

    // for macOS: recreate a window if the dock icon is clicked and there are no open windows
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});


// app.on('browser-window-created', (_, window) => setUpShortcuts(uid, window));
app.on('web-contents-created', async (e, contents) => {
    // contents.openDevTools({ mode: 'detach' });
    setUpShortcuts(uid);
    const u = await contents.executeJavaScript('window.location.href');
    if (contents.getType() === 'webview') handleWebViewInit(contents);
});

// quit the app when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
    logger.info('all windows closed!');
    if (process.platform !== 'darwin') {
        quitRedis();
        app.quit();
    }
});

app.on('before-quit', async (e) => {
    e.preventDefault();

    logger.info('shutting down...');
    const p = exec('node utils/clearCache.js --ischildproc 1>> logs/log.log 2>> logs/err.log');
    p.unref();

    setTimeout(() => {
        app.quit();
        process.exit(0);
    }, 1500);

    quitRedis();
});


app.commandLine.appendSwitch('ignore-gpu-blacklist');
app.commandLine.appendSwitch('disable-gpu-compositing');
