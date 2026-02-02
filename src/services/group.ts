import { IGroupRepository } from '../types/group';

export class GroupService {
    private repo: IGroupRepository;

    constructor(repo: IGroupRepository) {
        this.repo = repo;
    }

    // Pass-through methods for now, but good place for validation
    async create(name: string, description?: string) {
        if (!name) throw new Error("Name required");
        return this.repo.create(name, description);
    }

    async updatePermissions(groupId: number, permissionIds: number[]) {
        return this.repo.updatePermissions(groupId, permissionIds);
    }

    async delete(groupId: number) {
        return this.repo.delete(groupId);
    }

    async getAll() {
        return this.repo.getAll();
    }

    async getById(id: number) {
        return this.repo.getById(id);
    }

    async getByName(name: string) {
        return this.repo.getByName(name);
    }
}
