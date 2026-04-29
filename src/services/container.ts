import { log } from 'node:console'
import { db } from '../infrastructure/database'
import { AuditRepository } from '../repositories/audit-repository'
import { ScheduleRepository } from '../repositories/schedule-repository'
import { VacationRepository } from '../repositories/vacation-repository'
import { AuditService } from './audit'
import { AuthService } from './auth'
import { VacationScheduleService } from './contracts/vacation-schedule'
import { GroupService } from './group'
import { logger } from './logger'
import { OuService } from './ou'
import { ScheduleService } from './schedule'
import { UserService } from './user'
import { VacationService } from './vacation'

// Singleton instance

// Repositories
export const scheduleRepository = new ScheduleRepository(db)
export const vacationRepository = new VacationRepository(db)
export const auditRepository = new AuditRepository(db)

// Services
export const authService = new AuthService(logger)
export const userService = new UserService(logger)
export const groupService = new GroupService(logger)
export const ouService = new OuService(logger)

export const scheduleService = new ScheduleService(scheduleRepository)
export const vacationService = new VacationService(vacationRepository)
export const vacationScheduleService = new VacationScheduleService(
  logger,
  userService,
  vacationRepository,
  scheduleRepository,
)
export const auditService = new AuditService(auditRepository)
