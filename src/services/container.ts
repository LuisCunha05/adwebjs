import { SqliteDatabase } from '../infrastructure/database'
import { AuditRepository } from '../repositories/audit-repository'
import { ScheduleRepository } from '../repositories/schedule-repository'
import { VacationRepository } from '../repositories/vacation-repository'
import type { ILdapService } from '../types/ldap'
import { AuditService } from './audit'
import { VacationScheduleService } from './contracts/vacation-schedule'
import { LdapService } from './ldap'
import { ScheduleService } from './schedule'
import { VacationService } from './vacation'

// Singleton instance
const ldapService: ILdapService = new LdapService()

const db = new SqliteDatabase()
// db.init() is now lazy

const scheduleRepository = new ScheduleRepository(db)
const vacationRepository = new VacationRepository(db)
const auditRepository = new AuditRepository(db)

const scheduleService = new ScheduleService(scheduleRepository)
const vacationService = new VacationService(vacationRepository)
const vacationScheduleService = new VacationScheduleService(
  db,
  vacationRepository,
  scheduleRepository,
)
const auditService = new AuditService(auditRepository)

export {
  ldapService,
  scheduleService,
  vacationService,
  vacationScheduleService,
  auditService,
  scheduleRepository,
  vacationRepository,
}
