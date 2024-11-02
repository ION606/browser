import { Worker } from 'worker_threads';
import { findPath } from '../utils/paths.js';
import loggermod from '../utils/logger.cjs';
const { logger } = loggermod;

// need to find something for this to do, as it breaks a lot of stuff if used for requests

/**
 * runs the given function with the given args in a Nodejs Worker
 * @param {Function} fn 
 * @param {any[]} args 
 * @returns 
 */
export default function spawnWorker(fn, args) {
    return new Promise(async (resolve, reject) => {
        // find path to worker.js
        const workerScriptPath = await findPath('worker.js');

        // create a new worker with request data
        const worker = new Worker(workerScriptPath, {
            workerData: { fn: fn.toString(), args },
            // workerData: request,
        });

        logger.info(`spawning worker for ${fn}(${args})`);

        worker.on('online', () => logger.info(`started worker for ${fn}(${args})`));

        // handle messages from the worker
        worker.on('message', (msg) => {
            try {
              resolve(msg);
            } catch (err) {
                logger.error('Error creating response:', err);
                resolve(msg);
            }
            // terminate the worker when done (removed bc it results in interrupts)
            // worker.terminate().then(c => console.log(`${request.url} - ${c}`));
        });

        // handle errors from the worker
        worker.on('error', (error) => {
            logger.error('Worker error:', error);
            resolve({ status: 500 });
        });

        // handle worker exiting unexpectedly
        worker.on('exit', (code) => {
            if (code !== 0) {
                logger.warn(`Worker exited with code ${code} for ${request.url}`);
                resolve({ status: 500 });
            }
        });
    });
}
