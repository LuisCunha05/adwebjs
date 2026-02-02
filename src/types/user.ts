import { Group } from './group';

export interface LocalUser {
    id: number;
    username: string; // LDAP sAMAccountName
    name: string;
    groups?: Group[];
}

export interface IUserRepository {
    create(username: string, name: string): Promise<LocalUser>;
    delete(userId: number): Promise<void>;
    getByUsername(username: string): Promise<LocalUser | null>;
    getAll(): Promise<LocalUser[]>;

    // Assignments
    assignGroup(userId: number, groupId: number): Promise<void>;
    removeGroup(userId: number, groupId: number): Promise<void>;

    // Core Permissions Check
    getUserPermissionSlugs(username: string): Promise<string[]>;
}

