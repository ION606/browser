import loggermod from '../utils/logger.cjs';
import intercept from '../serverJS/intercept.js';
import setUpShortcuts from '../serverJS/shortcuts.js';
import { organizeTabIds } from '../serverJS/tabs_server.js';
import { getSavedTabs, loadTabs } from '../utils/clearCache.js';
import flushCookies from '../utils/cookies.js';
import { askUserQuestion } from '../utils/dialogue.js';
import ipcinit from '../utils/ipc.js';
import { checkInternetConnectivity } from '../utils/misc.js';
import { findPath } from '../utils/paths.js';
import { createWebview, handleWebViewInit } from '../utils/webviewHelpers.js';

const { setupRedis, quitRedis } = await import('../serverJS/history.cjs');
const { logger } = loggermod;

export {
    logger,
    intercept,
    setUpShortcuts,
    organizeTabIds,
    getSavedTabs,
    loadTabs,
    flushCookies,
    askUserQuestion,
    ipcinit,
    checkInternetConnectivity,
    findPath,
    createWebview,
    handleWebViewInit,
    setupRedis,
    quitRedis
};
