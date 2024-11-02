import { Agent, CredentialSession } from '@atproto/api';
import { CronJob } from 'cron';
import json from '../secrets/config.json' with { type: 'json' };
const { uname, upass } = json.bluesky;

// Create a Bluesky Agent
const session = new CredentialSession(new URL('https://bsky.social'));

const agent = new Agent(session);

async function main() {
    await session.login({ identifier: uname, password: upass });
    const { data: accountData } = await agent.getProfile({ actor: session.did });
    console.log(accountData);
}

main();