

export interface Permission {
    id: number;
    slug: string;
    name: string;
    description?: string;
}

export interface IPermissionRepository {
    ensurePermissionsInternal(perms: { slug: string; name: string; description?: string; }[]): Promise<void>;
    getAll(): Promise<Permission[]>;
}

