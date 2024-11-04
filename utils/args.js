import fs from 'fs';
import { finalTabCleanup } from "./clearCache.js";

export async function handleArgs() {
    console.log(process.argv);
    for (const arg of process.argv) {
        console.log(arg);
        if (arg === '--clear-cache') {
            await finalTabCleanup();
            fs.rmSync(`${import.meta.dirname}/cache`, { recursive: true });
        }
        else if (arg === '--no-cache') {
            console.error('TODO: RUN WITH NEW SESSION/PARTITION');
        }
    }
}