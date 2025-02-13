const { createClient } = require('redis');
const { exec } = require('child_process');
const fs = require('fs');
const loggermod = require('../utils/logger.cjs');
const { logger } = loggermod;


/** @type {import('redis').RedisClientType} */
let client;


async function addHistory(uid, query, code, title) {
    // logger.info(uid, query);
    return await client.lPush(`searchHistory:${uid}`, JSON.stringify({ title, query, timestamp: new Date(), code }));
}


async function getHistory(uid) {
    return await client.lRange(`searchHistory:${uid}`, 0, -1);
}


/**
 * @param {Electron.WebContents} webContents 
 */
async function displayHistory(uid, webContents) {
    const history = JSON.stringify(await getHistory(uid));
    webContents.executeJavaScript(`showHistory(${history})`);
}


const quitRedis = () => client.quit().then(() => logger.info('redis quit')).catch(_ => null);

async function setupRedis() {
    await new Promise((resolve, reject) => {
        if (!fs.existsSync('../cache/redis.conf')) {
            fs.writeFileSync('../cache/redis.conf', `dir ./\ndbfilename dump.rdb`);
        }

        const p = exec('redis-server ../cache/redis.conf', (err, stdout, stderr) => {
            if (err) return reject(err);
        });
        p.on('message', logger.info);
        p.on('error', logger.error);
        p.on('spawn', resolve);
    });

    client = await createClient()
        .on('error', err => {
            logger.info('Redis Client Error', err);
        })
        .connect();

    // clear history on browser boot
    let cursor = 0;

    do {
        const result = await client.scan(cursor, { MATCH: `searchHistory:*`, COUNT: 100 });
        cursor = result.cursor || 0;
        const keys = result.keys;
        if (keys.length > 0) await client.del(...keys);
    } while (cursor !== 0);

    // await client.flushDb();

    logger.info('Redis Client Connected!');
}


/**
 * 
 * @returns {Promise<import('redis').RedisClientType>}
 */
const getClient = () => {
    return new Promise(resolve => {
        const intid = setInterval(() => {
            if (!client) return;
            resolve(client);
            clearInterval(intid);
        }, 100);
    })
}

module.exports = { setupRedis, redisclient: getClient, getHistory, addHistory, displayHistory, quitRedis };
