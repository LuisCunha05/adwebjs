import { LdapService } from './ldap';
import { ILdapService } from '../types/ldap';
import { ScheduleService } from './schedule';
import { VacationService } from './vacation';
import { VacationScheduleService } from './contracts/vacation-schedule';
import { SqliteDatabase } from '../infrastructure/database';
import { ScheduleRepository } from '../repositories/schedule-repository';
import { VacationRepository } from '../repositories/vacation-repository';

// Singleton instance
const ldapService: ILdapService = new LdapService();

const db = new SqliteDatabase();
db.init();

const scheduleRepository = new ScheduleRepository(db);
const vacationRepository = new VacationRepository(db);

const scheduleService = new ScheduleService(scheduleRepository);
const vacationService = new VacationService(vacationRepository);
const vacationScheduleService = new VacationScheduleService(db, vacationRepository, scheduleRepository);

export {
    ldapService,
    scheduleService,
    vacationService,
    vacationScheduleService,
    scheduleRepository,
    vacationRepository
};
