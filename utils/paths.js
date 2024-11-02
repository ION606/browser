import { join } from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import loggermod from '../utils/logger.cjs';
const { logger } = loggermod;


// was import.meta.dirname but was changed to better suit the app
export const __dirname = process.cwd();


/**
 * returns the full path and performs cursory validation
 * @returns {Promise<String>} the full pth
 * @param {String} fname 
 */
export const findPath = (fname, absolute = false) => {
    try {
        return new Promise((resolve, reject) => {
            // use the find command to search for the file
            exec(`find -type f -name "${fname}"`, (error, stdout, stderr) => {
                if (error) {
                    return reject(`Error: ${stderr || error.message}`)
                }

                // clean up the output and resolve with the first result, or null if not found
                const relativePath = stdout.trim().split('\n').filter(Boolean)[0] || null;

                if (!relativePath) return;

                const p = (absolute) ? join(__dirname, relativePath) : relativePath;
                resolve(p);
            });
        });
    }
    catch (err) {
        return logger.error(err);
    }
}


/**
 * returns the full path and performs cursory validation
 * @returns {String} the full pth
 * @param {String} fname 
 */
const findPathOld = (fname, absolute = false) => {
    try {
        const ext = fname.match(/[^.]+$/)?.at(0);
        const base = (absolute) ? __dirname : '';

        switch (ext) {
            case 'mhtml':
            case 'html': {
                let p = join(base, 'HTML', fname);
                if (!fs.existsSync(p)) p = join(base, 'cache', 'tabCache', fname);
                return p;
            }

            case 'scss':
            case 'css': return join(base, 'CSS', fname);

            case 'cjs':
            case 'js': {
                let p = join(base, 'JS', fname);
                if (!fs.existsSync(p)) p = join(base, 'serverJS', fname);
                if (!fs.existsSync(p)) p = join(base, 'utils', fname);
                if (!fs.existsSync(p)) p = join(base, 'organization', fname);
                if (fs.existsSync(p)) return p;
            }
                break;

            default: return null;
        }
    }
    catch (err) {
        return logger.error(err);
    }
}
