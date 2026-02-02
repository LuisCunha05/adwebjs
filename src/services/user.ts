import { SUPER_ADMIN_USER } from '../contants/config';
import { IUserRepository } from '../types/user';

export class UserService {
    private repo: IUserRepository;
    private superAdminUser: string;

    constructor(repo: IUserRepository) {
        this.repo = repo;
        this.superAdminUser = SUPER_ADMIN_USER;
    }

    async checkAccess(sAMAccountName: string): Promise<boolean> {
        if (this.superAdminUser && sAMAccountName === this.superAdminUser) {
            return true;
        }
        const user = await this.repo.getByUsername(sAMAccountName);
        return !!user;
    }

    async getPermissionsForUser(sAMAccountName: string): Promise<string[]> {
        if (this.superAdminUser && sAMAccountName === this.superAdminUser) {
            return ['*']; // Super Admin wildcard
        }
        return this.repo.getUserPermissionSlugs(sAMAccountName);
    }

    async create(username: string, name: string) {
        return this.repo.create(username, name);
    }

    async delete(userId: number) {
        return this.repo.delete(userId);
    }

    async getAll() {
        return this.repo.getAll();
    }

    async assignGroup(userId: number, groupId: number) {
        return this.repo.assignGroup(userId, groupId);
    }

    async removeGroup(userId: number, groupId: number) {
        return this.repo.removeGroup(userId, groupId);
    }
}
