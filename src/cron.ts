import cron from 'node-cron';
import path from 'path';

console.log('[Cron] Starting scheduler process...');

// Schedule the worker to run every minute
// We point to the worker script. node-cron will spawn a child process to run it.
const workerPath = path.join(__dirname, 'tasks/scheduler-worker.ts');

cron.schedule('0 0 * * *', workerPath);

console.log(`[Cron] Scheduled worker: ${workerPath} (Every day at midnight)`);

// Keep the process alive
//TODO: remove this when migrating  to nextjs
setInterval(() => { }, 1000 * 60 * 60);

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('[Cron] SIGTERM received. Exiting...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('[Cron] SIGINT received. Exiting...');
    process.exit(0);
});
