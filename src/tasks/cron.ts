import { scheduleVacation } from './scheduler-worker'

// All tasks function should be called inside runAllTasks to simplify setup
export const runAllTasks = () => {
  scheduleVacation()
}
