
import { Permission } from './permission';

export interface Group {
    id: number;
    name: string;
    description?: string;
    permissions?: Permission[];
}

export interface IGroupRepository {
    create(name: string, description?: string): Promise<Group>;
    updatePermissions(groupId: number, permissionIds: number[]): Promise<void>;
    delete(groupId: number): Promise<void>;
    getAll(): Promise<Group[]>;
    getById(id: number): Promise<Group | null>;
    getByName(name: string): Promise<Group | null>;
}

