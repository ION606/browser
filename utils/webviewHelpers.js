import { WebContentsView } from "electron";
import { partitionName, agent, uid } from "../main.js";
import { findPath } from "./paths.js";
import { addEl, isValidURL } from "./misc.js";
import { startinject } from "./ipc.js";
import intercept, { noworker } from "../serverJS/intercept.js";
import loggermod from '../utils/logger.cjs';
const { logger } = loggermod;


/**
 * @param {Electron.WebContents} contents 
 */
export async function handleWebViewInit(contents) {

}

/**
 * @param {*} tabId 
 * @param {Electron.BaseWindow} currentWindow 
 */
export async function createWebview(tabId, currentWindow, customSession, preloadFname = 'preload.cjs') {
	const preloadPath = await findPath(preloadFname, true);
	logger.info(preloadFname, preloadPath);

	const view = new WebContentsView({
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: true,  // allow access to Node.js in renderer
			javascript: true,
			plugins: true,
			// enableBlinkFeatures: "WebContentsForceDark",
			partition: partitionName,
			preload: preloadPath,
			nodeIntegrationInWorker: true
		}
	});
	view.id = tabId;

	// set initial size
	const resizeWebView = () => {
		const { width: w, height: h } = currentWindow.getBounds();
		if (tabId === -1) view.setBounds({ x: 0, y: 0, width: w, height: 35 });
		else view.setBounds({ x: 0, y: 35, width: w, height: h - 35 });
	};

	// add the web view as a child of the window's content view
	currentWindow.contentView.addChildView(view);

	// update bounds on window resize
	currentWindow.on('resize', resizeWebView);

	view.webContents.setUserAgent(agent);
	const { width: w, height: h } = currentWindow.getBounds();
	view.setBounds({ x: 0, y: 0, width: w, height: h });

	view.webContents.on('did-start-navigation', (e, newU) => {
		const u = isValidURL(newU);
		if (noworker.find(o => u.hostname.match(o)) && customSession.protocol.isProtocolHandled('https')) customSession.protocol.unhandle('https');
		else if (!customSession.protocol.isProtocolHandled('https')) customSession.protocol.handle('https', (r) => intercept(r, uid));
	});

	view.webContents.on('did-navigate', (e, newU) => {
		const u = isValidURL(newU);
		addEl(view, u?.hostname);
		startinject(view, uid);
	});

	view.webContents.setBackgroundThrottling(true);
	resizeWebView();
	return view;
}