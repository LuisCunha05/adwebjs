import { IPermissionRepository } from '../types/permission';

export const PERMISSIONS = {
    // Users
    USER_CREATE: 'user.create',
    USER_READ: 'user.read',
    USER_UPDATE: 'user.update',
    USER_DELETE: 'user.delete',
    USER_MOVE: 'user.move',
    USER_ENABLE_DISABLE: 'user.enable_disable',
    USER_UNLOCK: 'user.unlock',
    USER_RESET_PASSWORD: 'user.reset_password',

    // Groups
    GROUP_READ: 'group.read',
    GROUP_UPDATE: 'group.update',
    GROUP_MANAGE_MEMBERS: 'group.manage_members',

    // Schedule/Vacation
    VACATION_READ: 'vacation.read',
    VACATION_MANAGE: 'vacation.manage',

    // Audit
    AUDIT_READ: 'audit.read',
};

export class PermissionService {
    private repo: IPermissionRepository;

    constructor(repo: IPermissionRepository) {
        this.repo = repo;
    }

    async init() {
        const perms = Object.entries(PERMISSIONS).map(([_name, slug]) => ({
            slug,
            name: slug.split('.').join(' ').toUpperCase(), // Simple automated name
            description: `Permission to ${slug}`
        }));
        await this.repo.ensurePermissionsInternal(perms);
    }

    async getAll() {
        return this.repo.getAll();
    }
}
