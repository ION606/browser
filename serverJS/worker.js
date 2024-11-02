import { parentPort, workerData } from 'worker_threads';

import fs from 'fs';
import mhtml2html from "mhtml2html";
import { JSDOM } from 'jsdom';


function MHTMLtoHTML(savePath, tabId) {
    return new Promise((resolve) => {
        // read the MHTML file content
        const mhtmlContent = fs.readFileSync(savePath, 'utf8');

        /** @type {JSDOM} */
        const parsedResult = mhtml2html.convert(mhtmlContent, { parseDOM: (html) => new JSDOM(html) });

        // save the extracted HTML file
        const htmlPath = savePath.replace('.mhtml', '.html');
        fs.writeFile(htmlPath, parsedResult.serialize(), (err) => {
            if (err) {
                logger.error(`error saving ${tabId}`);
                return resolve(false);
            }
            fs.rmSync(savePath);
            resolve(true)
        });
    });
}

// a function to process the request data
const processRequest = async (data) => {
    try {
        const { fn, args } = data;
        let result;

        switch (fn) {
            case 'convertpage': result = await MHTMLtoHTML(...args);
                break;

            default: console.log(`unknown function "${fn}(${args})`);
        }

        return result;
    } catch (err) {
        console.error(err);
        // handle and report any errors
        return { success: false, error: err.message };
    }
};

// read input from the workerData passed from the main thread and process it
(async () => {
    const result = await processRequest(workerData);
    // send the response to the main process
    parentPort.postMessage(result);
    process.exit(0);
})();
