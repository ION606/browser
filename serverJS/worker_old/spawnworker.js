import { spawn } from 'child_process';
import { findPath } from '../utils/paths.js';
import loggermod from '../utils/logger.cjs';
const { logger } = loggermod;

export default function spawnworker(request, uid) {
    return new Promise(async (resolve, reject) => {
        const child = spawn('node', [await findPath('worker.js')]);

        const requestObject = {
            method: request.method,
            headers: Object.fromEntries(Array.from(request.headers)),
            url: request.url,
            body: await request.text(),
            params: request.params,
            query: request.query,
        };

        // send the request data to the child process
        child.stdin.write(JSON.stringify(requestObject) + '\n');

        // Accumulate data from child process stdout
        let accumulatedData = '';

        // handle response from the child process
        child.stdout.on('data', (data) => {
            accumulatedData += data.toString();

            // Check if accumulatedData contains a complete JSON object
            if (accumulatedData.trim().endsWith('}')) {
                let response;
                try {
                    response = JSON.parse(accumulatedData);
                } catch (err) {
                    logger.error('Failed to parse response from child process:', err);
                    child.kill(1);
                    resolve({ status: 500 });
                    return;
                }

                // If JSON is parsed successfully, resolve the promise
                try {
                    // Decode the base64 data back to a buffer
                    if (response.data) response.data = Buffer.from(response.data, 'base64');
                    resolve(new Response(response.data || response, {
                        headers: response.headers,
                        status: response.status || 200,
                    }));
                } catch (err) {
                    logger.error('Error creating response:', err);
                    resolve(response);
                }
                child.kill(0);

                // Reset accumulatedData for the next potential message
                accumulatedData = '';
            }
        });

        // handle errors from the child process
        child.stderr.on('data', (error) => {
            logger.error(`Child process stderr: ${error}`);
            resolve({ status: 500 });
        });

        // handle if the child process exits unexpectedly
        child.on('close', (code) => {
            // not 0 or null
            if (!!code) {
                logger.error(`Child process exited with code ${code}`);
                resolve({ status: 500 });
            }
        });
    });
}
