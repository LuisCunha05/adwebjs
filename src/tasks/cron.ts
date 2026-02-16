import path from 'node:path'
import cron from 'node-cron'

console.log('[Cron] Starting scheduler process...')

// We point to the worker script. node-cron will spawn a child process to run it.
const schedulePath = path.join(__dirname, 'scheduler-worker.ts')

cron.schedule('0 0 * * *', schedulePath)

console.log(`[Cron] Scheduled worker: ${schedulePath} (Every day at midnight)`)

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Cron] SIGTERM received. Exiting...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('[Cron] SIGINT received. Exiting...')
  process.exit(0)
})
