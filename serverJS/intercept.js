import { findPath } from "../utils/paths.js";
import blocked from "./adblock.js";
import fs from "fs";
import * as history from "./history.cjs";
const { addHistory } = history;
import { net, shell } from "electron";
import spawnworker from "./spawnworker.js";
import { checkInternetConnectivity } from "../utils/misc.js";
import loggermod from '../utils/logger.cjs';
const { logger } = loggermod;

export const noworker = ['www.youtube.com', 'accounts.youtube.com', 'accounts.google.com', '.*\.googlevideo\.com'];

export const transformduckurl = (u) => {
	try {
		const urlParams = new URLSearchParams(new URL(u).search);
		const actualUrl = decodeURIComponent(urlParams.get('uddg'));
		return actualUrl;
	}
	catch (err) {
		console.warn(err);
		return u;
	}
}


/**
 * @param {GlobalRequest} req
 */
export default async function intercept(request, uid) {
	try {
		const u = new URL(request.url);

		if (u.protocol === 'file:' || u.hostname.startsWith('ion-local')) {
			const filePath = await findPath(u.pathname.split('/')?.at(-1), true);

			if (!filePath || !fs.existsSync(filePath)) return new Response(`file"${filePath}"  not found!`, { status: 404 });

			// read the file from the filesystem
			let fileData = fs.readFileSync(filePath).toString();

			// guess the mime type (e.g., text/html, application/javascript)
			let mimeType = 'text/plain';
			if (filePath.endsWith('.html')) mimeType = 'text/html';
			else if (filePath.endsWith('.js')) mimeType = 'application/javascript';
			else if (filePath.endsWith('.css')) mimeType = 'text/css';

			if (filePath.endsWith('HTML/nointernet.html')) {
				const hascon = await checkInternetConnectivity();
				const rNew = { 'Location': 'https://start.duckduckgo.com', 'Content-Type': 'text/html' };
				if (hascon) return new Response(Buffer.from(`<html><body>Loading...</body></html>`, 'utf-8'), { status: 301, headers: rNew });
			}

			// send the file content along with a mime type
			return new Response(fileData, { headers: { 'Content-Type': mimeType } });
		}
		else {
			if (blocked(request.url)) return new Response('Request Blocked by UBlock Origin', { status: 503, statusText: 'Request Blocked by UBlock Origin' });

			let newURL = request.url;

			// force dark mode and turn off safe search
			if (u.hostname.includes('duckduckgo.com')) newURL += (u.search) ? '&kae=d&kp=-2' : '?kae=d';
			else if (u.hostname.includes('google.com')) newURL += (u.search) ? '&safe=off&&pccc=1' : '?pccc=1';

			// here to avoid `TypeError: Cannot set property url of #<_Request> which has only a getter`
			try { request.url = newURL; }
			catch (_) { }

			const iswebpagereq = request.method?.toUpperCase() === 'GET' && request.headers.get('Accept').includes('text/html');

			// Odd duckduckgo redir thing (I hate it)
			if (request.url.startsWith('https://duckduckgo.com/l/?')) {
				const newURL = transformduckurl(request.url);
				const rNew = {
					'Location': newURL, // Set the redirect location header
					'Content-Type': 'text/html',
				}
				return new Response(Buffer.from(`<html><body>Redirecting to <a href="${newURL}">${newURL}</a>...</body></html>`, 'utf-8'), { status: 301, headers: rNew });
			}

			let r;
			// special case
			if (u.href.match(/https:\/\/accounts\.(google|youtube)\.com\/(.*\/)?(signin\/challenge|ServiceLogin)\/?.*/gm)) {
				// const urlObj = new URL(u.href);

				// // Decode the `continue` parameter and modify it
				// let continueUrl = decodeURIComponent(urlObj.searchParams.get('continue'));

				// // You can modify the `continue` URL to use your custom protocol (myapp://callback)
				// continueUrl = 'iobrowser://callback';

				// // Encode and set the updated `continue` parameter back in the original URL
				// urlObj.searchParams.set('continue', encodeURIComponent(continueUrl));

				// // This is your modified URL that you will use to launch the browser
				// return shell.openExternal(urlObj.href, { logUsage: true, activate: true });

				r = await net.fetch(request);
			}
			// sloppy fix
			else r = await net.fetch(request);
			// else if (iswebpagereq || noworker.find(o => u.hostname.match(o))) r = await net.fetch(request);
			// else r = await spawnworker(request, uid);

			if (request.headers.get('Accept').includes('text/html')) {
				if (u.hostname === 'lite.duckduckgo.com') {
					const params = new URLSearchParams(u.search);
					addHistory(uid, `${u.href}?${body}`, r.status, `DuckDuckGo${params.has('q') ? (' - ' + params.get('q')) : ''}`);
				}
				else {
					// const res = await fetch(u.href, { method: 'HEAD' }).catch(_ => null);
					// logger.info(res);

					// addHistory(uid, u.href, r.status, 'title!');
				}
			}

			return r;

			/*
			REMOVED BECAUSE IT'S TOO EXPENSIVE (SIGKILL-ed)
			// https://accounts.google.com/v3/signin/_/AccountsSignInUi/browserinfo?f.sid=3210847140573431127&bl=boq_identityfrontendauthuiserver_20241015.01_p0&hl=en&_reqid=139420&rt=j
			if (request.url === 'https://www.youtube.com/' || skip.includes(u.hostname)) return net.fetch(request);

			let newURL = request.url;
			if (u.hostname.includes('duckduckgo.com')) newURL += (u.search) ? '&kae=d&kp=-2' : '?kae=d';
			else if (u.hostname.includes('google.com')) newURL += (u.search) ? '&safe=off&&pccc=1' : '?pccc=1';

			const r = await net.fetch(request);

			return r;
			*/
		}
	}
	catch (err) {
		logger.error(request.url, err);
		return new Response('Error', { status: 500 });
	}
}