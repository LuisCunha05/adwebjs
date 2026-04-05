import { Cron } from 'croner'

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { runAllTasks } = await import('./tasks/cron')
  // Run a job every hour
  new Cron('0 */1 * * *', () => {
    runAllTasks()
  })
}
