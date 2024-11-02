const { contextBridge, ipcRenderer } = require('electron');


// renderer.js or script loaded in the renderer process
const policy = window.trustedTypes.createPolicy('default', {
	createHTML: (input) => input, // policy allows only sanitized HTML strings
});

process.once("loaded", () => {
	console.info('injecting...');
	contextBridge.exposeInMainWorld('safeHTML', {
		ping: () => console.info('pong'),
		write: (selector, htmlString) => {
			const element = document.querySelector(selector);
			if (element) element.innerHTML += policy.createHTML(htmlString);
		},
		insertBefore: (selector, htmlString) => {
			const element = document.querySelector(selector);
			if (element) element.innerHTML = policy.createHTML(htmlString) + element.innerHTML;
		},
		addScript: (content, src) => {
			// validate and securely add the script to the document's head
			const head = document.head;
			if (!head || (!src && !content)) return;

			// create a script element
			const script = document.createElement('script');

			if (content) script.innerText = content;
			else script.src = src;

			// set script properties securely
			script.async = true;

			// append to head
			head.appendChild(script);
		},
		addStylesheet: (href, inlineContent) => {
			const head = document.head;
			if (!head) return;

			if (href) {
				// if href is provided, use it for external stylesheet
				const link = document.createElement('link');
				link.rel = 'stylesheet';
				link.href = href;
				head.appendChild(link);
			} else if (inlineContent) {
				// create a style element for inline CSS
				const style = document.createElement('style');
				style.textContent = inlineContent;
				head.appendChild(style);
			}
		}
	});
});


// TODO: replaceme
const uid = 1;

contextBridge.exposeInMainWorld('electronAPI', {
	displayHistory: () => ipcRenderer.send('display-history', uid), // send message to main process
	getHistory: () => ipcRenderer.invoke('get-history', uid), // request history data and wait for response
	showHistory: (history) => ipcRenderer.send('show-history', history), // sends data to the main process
	initTabs: () => ipcRenderer.send('init-tabs'),
	addTab: (url) => window.dispatchEvent(new CustomEvent('add-tab', { detail: url })),
	sendToMain: (channel, data) => {
		ipcRenderer.send(channel, data);
	},
	onReceive: (channel, func) => {
		ipcRenderer.on(channel, (event, ...args) => func(...args));
	},
	checkperms: (sitehostname) => ipcRenderer.send('get-site-perms', sitehostname)
});

// ipcRenderer.on('tab-opened', (ev, id) => {
// 	document.querySelector('.open-webview')?.classList.remove('open-webview');
// 	document.querySelector(`#webview-${id}`)?.classList.add('open-webview');
// });

ipcRenderer.on('tab-created', (ev, id, url = 'https://duckduckgo.com') => createWebview(url, id));


contextBridge.exposeInMainWorld('tabAPI', {
	ping: () => console.info('pong'),
	addTab: (url) => ipcRenderer.send('add-tab', url || 'about:blank')
});

const load = () => {
	console.info("PRELOAD LOADED!");

	if (window.location.origin === 'lite.duckduckgo.com') {
		document.body.querySelector('img[src="//duckduckgo.com/t/sl_l"]').remove();
	}

	if (document.body) {
		// document.body.innerHTML = `<webview src="../HTML/tabs.html" style="flex:0 0.5 auto;" nodeintegration preload="../organization/tabs.cjs"></webview>` + document.body.innerHTML;
		ipcRenderer.send('init-tabs');
	}
}

// document.onload = () => load;
document.addEventListener('DOMContentLoaded', load);
