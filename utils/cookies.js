import { session } from 'electron';
import loggermod from '../utils/logger.cjs';
const { logger } = loggermod;


const noflush = ['youtube.com', 'chatgpt.com']; // replace with your domains

async function flushCookies(customSession = session.defaultSession) {
    // session.defaultSession.cookies.flushStore();

    // get all cookies from the default session
    const allCookies = await customSession.cookies.get({});

    // filter out cookies from domains in the noflush array
    const cookiesToDelete = allCookies.filter(cookie => {
        return !noflush.some(domain => cookie.domain.includes(domain));
    });

    // delete each cookie that is not in the noflush list
    for (const cookie of cookiesToDelete) {
        // create the URL that matches the cookie's domain
        const cookieUrl = `http${cookie.secure ? 's' : ''}://${cookie.domain.replace(/^\./, '')}${cookie.path}`;

        try {
            await customSession.cookies.remove(cookieUrl, cookie.name);
            logger.info(`Deleted cookie: ${cookie.name} from ${cookie.domain}`);
        } catch (error) {
            logger.error(`Failed to delete cookie: ${cookie.name} from ${cookie.domain}`, error);
        }
    }
}

export default flushCookies;