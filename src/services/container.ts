import { LdapService } from './ldap';
import { ILdapService } from '../types/ldap';
import { ScheduleService } from './schedule';
import { VacationService } from './vacation';
import { VacationScheduleService } from './contracts/vacation-schedule';
import { SqliteDatabase } from '../infrastructure/database';
import { ScheduleRepository } from '../repositories/schedule-repository';
import { VacationRepository } from '../repositories/vacation-repository';
import { AuditRepository } from '../repositories/audit-repository';

import { SqlitePermissionRepository } from '../repositories/permission-repository';
import { SqliteGroupRepository } from '../repositories/group-repository';
import { SqliteUserRepository } from '../repositories/user-repository';

import { AuditService } from './audit';
import { PermissionService } from './permission';
import { GroupService } from './group';
import { UserService } from './user';

// Singleton instance
const ldapService: ILdapService = new LdapService();

const db = new SqliteDatabase();
db.init();

const scheduleRepository = new ScheduleRepository(db);
const vacationRepository = new VacationRepository(db);
const auditRepository = new AuditRepository(db);

const permissionRepository = new SqlitePermissionRepository(db);
const groupRepository = new SqliteGroupRepository(db);
const userRepository = new SqliteUserRepository(db);

const scheduleService = new ScheduleService(scheduleRepository);
const vacationService = new VacationService(vacationRepository);
const vacationScheduleService = new VacationScheduleService(db, vacationRepository, scheduleRepository);
const auditService = new AuditService(auditRepository);

const permissionService = new PermissionService(permissionRepository);
const groupService = new GroupService(groupRepository);
const userService = new UserService(userRepository);

// Initialize Permissions
permissionService.init().catch(err => console.error('Failed to init Permissions:', err));

export {
    ldapService,
    scheduleService,
    vacationService,
    vacationScheduleService,
    auditService,
    permissionService,
    groupService,
    userService,
    scheduleRepository,
    vacationRepository,
    auditRepository,
    permissionRepository,
    groupRepository,
    userRepository
};
