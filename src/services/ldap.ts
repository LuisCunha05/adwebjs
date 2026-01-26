import { Client, Attribute, Change } from 'ldapts';
import dotenv from 'dotenv';
import { getFetchAttributes } from './ad-user-attributes';

dotenv.config();

const LDAP_URL = process.env.LDAP_URL as string;
const BASE_DN = process.env.LDAP_BASE_DN as string;
const LDAP_ADMIN_DN = process.env.LDAP_ADMIN_DN as string;
const LDAP_ADMIN_PASSWORD = process.env.LDAP_ADMIN_PASSWORD as string;
const MOCK_LDAP = process.env.MOCK_LDAP === 'true';
const LDAP_DEBUG = process.env.LDAP_DEBUG === 'true';
const LDAP_GROUP_REQUIRED = process.env.LDAP_GROUP_REQUIRED as string;

// Mock data for development
interface MockUser {
    sAMAccountName: string;
    userPrincipalName?: string;
    pwdLastSet?: string;
    userAccountControl?: string;
    memberOf?: string[];
    [key: string]: any;
}

const MOCK_USERS: MockUser[] = [
    { sAMAccountName: 'admin', userPrincipalName: 'admin@example.com', pwdLastSet: '133000000000000000', userAccountControl: '66048', memberOf: ['CN=ADWEB-Admin,OU=Groups,DC=example,DC=com'] },
    { sAMAccountName: 'jdoe', userPrincipalName: 'jdoe@example.com', pwdLastSet: '133000000000000000', userAccountControl: '512', memberOf: [] }
];

export const logDebug = (msg: string) => {
    if (LDAP_DEBUG) {
        console.log(`[${new Date().toISOString()}] ${msg}`);
    }
};

const logError = (msg: string, err: any) => {
    console.error(`[${new Date().toISOString()}] ${msg}`, err);
};

function createClient(): Client {
    return new Client({
        url: LDAP_URL,
        tlsOptions: {
            rejectUnauthorized: false
        }
    });
}

function parseEntry(entry: any): any {
    // ldapts search returns POJOs mostly, but let's keep robust handling if needed
    // Actually ldapts returns SearchEntry[] which has .object property with attributes
    // But usually we treat the result struct.
    // Let's assume standard ldapts behavior: returns attributes as key-value
    return entry;
}

async function getAdminClient(): Promise<Client> {
    const client = cClient();
    if (!LDAP_ADMIN_DN || !LDAP_ADMIN_PASSWORD) {
        throw new Error('LDAP_ADMIN_DN or LDAP_ADMIN_PASSWORD not configured');
    }
    await client.bind(LDAP_ADMIN_DN, LDAP_ADMIN_PASSWORD);
    return client;
}

// Helper to create bound client
const cClient = () => {
    return new Client({
        url: LDAP_URL,
        tlsOptions: { rejectUnauthorized: false }
    });
};

export const authenticate = async (username: string, password: string): Promise<any> => {
    logDebug(`LDAP Debug - Authenticating user: ${username}`);

    if (MOCK_LDAP || LDAP_URL.includes('localhost')) {
        console.log('MOCK AUTH used for:', username);
        if (password === 'password') {
            const user = MOCK_USERS.find(u => u.userPrincipalName === username || u.sAMAccountName === username);
            if (user) {
                if (LDAP_GROUP_REQUIRED) {
                    const groups = Array.isArray(user.memberOf) ? user.memberOf : (user.memberOf ? [user.memberOf] : []);
                    const isMember = groups.some(g => g === LDAP_GROUP_REQUIRED || g.includes(LDAP_GROUP_REQUIRED));
                    if (!isMember) throw new Error(`Unauthorized: User is not a member of the required group: ${LDAP_GROUP_REQUIRED}`);
                }
                return user;
            }
            return { sAMAccountName: username, memberOf: ['CN=ADWEB-Admin'] };
        }
        if (username === 'admin') return { sAMAccountName: 'admin', memberOf: ['CN=ADWEB-Admin'] };
    }

    // 1. Admin Bind
    const navClient = cClient();
    try {
        if (!LDAP_ADMIN_DN || !LDAP_ADMIN_PASSWORD) throw new Error("Missing Admin Credentials");
        await navClient.bind(LDAP_ADMIN_DN, LDAP_ADMIN_PASSWORD);

        // 2. Search User
        const searchFilter = `(|(sAMAccountName=${username})(userPrincipalName=${username}))`;
        const result = await navClient.search(BASE_DN, {
            filter: searchFilter,
            scope: 'sub',
            attributes: ['dn', 'sAMAccountName', 'userPrincipalName', 'memberOf', 'cn']
        });

        if (result.searchEntries.length === 0) {
            throw new Error('User not found');
        }

        const userEntry = result.searchEntries[0]; // ldapts returns nice objects
        const userDn = userEntry.dn;

        // 3. User Bind
        const userClient = cClient();
        try {
            await userClient.bind(userDn, password);
            userClient.unbind(); // Authenticated!
            logDebug(`LDAP Debug - User authenticated successfully: ${username}`);

            // Check required group membership
            if (LDAP_GROUP_REQUIRED) {
                const groups = Array.isArray(userEntry.memberOf) ? userEntry.memberOf : (userEntry.memberOf ? [userEntry.memberOf] : []);
                const isMember = groups.some((g: any) => g === LDAP_GROUP_REQUIRED || String(g).includes(LDAP_GROUP_REQUIRED));

                if (!isMember) {
                    logDebug(`LDAP Debug - User ${username} is NOT a member of required group: ${LDAP_GROUP_REQUIRED}`);
                    throw new Error('Unauthorized: Member of required group is missing');
                }
                logDebug(`LDAP Debug - User ${username} group check passed for: ${LDAP_GROUP_REQUIRED}`);
            }

            // Return user attributes
            return userEntry;
        } catch (err: any) {
            if (err.message === 'Unauthorized') throw err;
            logError('LDAP Debug - Authentication bind failed:', err);
            throw new Error('Invalid credentials');
        } finally {
            userClient.unbind();
        }

    } catch (err: any) {
        logError('LDAP Search/Auth Error:', err);
        throw err;
    } finally {
        navClient.unbind();
    }
};

export interface SearchUsersOptions {
    /** DN da OU onde buscar (base da busca). Se omitido, usa BASE_DN. */
    ou?: string;
    /** DN do grupo: apenas usuários que são membros (memberOf). */
    memberOf?: string;
    /** Se true, apenas contas desativadas (userAccountControl bit 2). */
    disabledOnly?: boolean;
}

function escapeLdapFilter(val: string): string {
    return val
        .replace(/\\/g, '\\5c')
        .replace(/\*/g, '\\2a')
        .replace(/\(/g, '\\28')
        .replace(/\)/g, '\\29')
        .replace(/\x00/g, '\\00');
}

export const searchUsers = async (query: string, searchBy: string, options?: SearchUsersOptions): Promise<any[]> => {
    if (MOCK_LDAP || LDAP_URL.includes('localhost')) {
        logDebug(`LDAP Debug - MOCK Searching users. Query: ${query}, By: ${searchBy}`);
        let out = MOCK_USERS.filter(u => u[searchBy] && (u[searchBy] as string).toString().toLowerCase().includes(query.toLowerCase()))
            .map(u => ({ ...u, dn: (u as any).dn || `CN=${u.sAMAccountName},OU=Users,DC=example,DC=com` }));
        if (options?.disabledOnly) {
            out = out.filter(u => (Number((u as any).userAccountControl) || 0) & 2);
        }
        return out;
    }

    const client = await getAdminClient();
    try {
        logDebug(`LDAP Debug - Searching users. Query: ${query}, By: ${searchBy}`);
        const parts: string[] = [
            '(objectClass=user)',
            '(objectCategory=person)',
        ];
        if (query.trim()) {
            parts.push(`(${searchBy}=*${escapeLdapFilter(query.trim())}*)`);
        } else {
            parts.push(`(${searchBy}=*)`);
        }
        if (options?.memberOf?.trim()) {
            parts.push(`(memberOf=${options.memberOf.trim()})`);
        }
        if (options?.disabledOnly) {
            parts.push('(userAccountControl:1.2.840.113556.1.4.803:=2)');
        }
        const searchFilter = '(&' + parts.join('') + ')';
        const baseDn = (options?.ou?.trim() || BASE_DN);

        const result = await client.search(baseDn, {
            filter: searchFilter,
            scope: 'sub',
            attributes: ['dn', 'sAMAccountName', 'userPrincipalName', 'cn', 'mail', 'memberOf', 'userAccountControl', 'pwdLastSet'],
        });

        return result.searchEntries || [];
    } catch (err) {
        logError('LDAP Search Error:', err);
        throw err;
    } finally {
        client.unbind();
    }
};

export const getUser = async (id: string): Promise<any> => {
    if (MOCK_LDAP || LDAP_URL.includes('localhost')) {
        const user = MOCK_USERS.find(u => u.sAMAccountName === id);
        if (user) return user;
        throw new Error('User not found');
    }

    const client = await getAdminClient();
    try {
        logDebug(`LDAP Debug - Getting user details for: ${id}`);
        const result = await client.search(BASE_DN, {
            filter: `(sAMAccountName=${id})`,
            scope: 'sub',
            attributes: getFetchAttributes()
        });

        if (result.searchEntries.length === 0) throw new Error('User not found');
        return result.searchEntries[0];
    } catch (err) {
        logError('LDAP GetUser Error:', err);
        throw err;
    } finally {
        client.unbind();
    }
};

/** Codifica senha para unicodePwd (AD): "password" em UTF-16LE. */
function encodeUnicodePwd(password: string): Buffer {
    return Buffer.from('"' + password.replace(/"/g, '') + '"', 'utf16le');
}

/** Escapa valor para uso em RDN (CN=..., etc.). */
function escapeRdn(val: string): string {
    return val.replace(/\\/g, '\\5C').replace(/"/g, '\\22').replace(/^(\s)|(\s)$/g, (_, a, b) => (a ? '\\20' : '\\20')).replace(/#/g, '\\23').replace(/\+/g, '\\2B').replace(/;/g, '\\3B').replace(/</g, '\\3C').replace(/=/g, '\\3D').replace(/>/g, '\\3E').replace(/,/g, '\\2C');
}

export interface CreateUserInput {
    parentOuDn: string;
    sAMAccountName: string;
    password: string;
    userPrincipalName?: string;
    cn?: string;
    givenName?: string;
    sn?: string;
    displayName?: string;
    mail?: string;
    description?: string;
    title?: string;
    department?: string;
    company?: string;
    [key: string]: any;
}

export const createUser = async (input: CreateUserInput): Promise<any> => {
    const { parentOuDn, sAMAccountName, password } = input;
    if (!parentOuDn?.trim() || !sAMAccountName?.trim() || !password) {
        throw new Error('parentOuDn, sAMAccountName e password são obrigatórios');
    }
    if (MOCK_LDAP || LDAP_URL.includes('localhost')) {
        const nu = {
            sAMAccountName,
            userPrincipalName: input.userPrincipalName || `${sAMAccountName}@example.com`,
            userAccountControl: '512',
            memberOf: [],
            ...input,
        };
        (MOCK_USERS as any[]).push(nu);
        return nu;
    }
    const cn = (input.cn || input.displayName || `${(input.givenName || '')} ${(input.sn || '')}`.trim() || sAMAccountName).slice(0, 64);
    const rdn = 'CN=' + escapeRdn(cn);
    const dn = `${rdn},${parentOuDn.replace(/^\s+|\s+$/g, '')}`;
    const domain = process.env.LDAP_DOMAIN || (BASE_DN.match(/DC=([^,]+)/gi) || []).map((x: string) => x.replace(/^DC=/i, '')).join('.') || 'local';
    const upn = input.userPrincipalName || `${sAMAccountName}@${domain}`;
    const attrs: Array<{ type: string; values: (string | Buffer)[] }> = [
        { type: 'objectClass', values: ['top', 'person', 'organizationalPerson', 'user'] },
        { type: 'sAMAccountName', values: [sAMAccountName.slice(0, 20)] },
        { type: 'userPrincipalName', values: [upn] },
        { type: 'cn', values: [cn] },
        { type: 'unicodePwd', values: [encodeUnicodePwd(password)] },
    ];
    const opts: Record<string, string> = {
        givenName: (input.givenName || '').slice(0, 64),
        sn: (input.sn || cn).slice(0, 64),
        displayName: (input.displayName || cn).slice(0, 256),
        mail: (input.mail || '').slice(0, 256),
        description: (input.description || '').slice(0, 1024),
        title: (input.title || '').slice(0, 64),
        department: (input.department || '').slice(0, 64),
        company: (input.company || '').slice(0, 64),
        physicalDeliveryOfficeName: (input.physicalDeliveryOfficeName || '').slice(0, 128),
        streetAddress: (input.streetAddress || '').slice(0, 1024),
        telephoneNumber: (input.telephoneNumber || '').slice(0, 64),
        mobile: (input.mobile || '').slice(0, 64),
    };
    for (const [k, v] of Object.entries(opts)) {
        if (v) attrs.push({ type: k, values: [v] });
    }
    const client = await getAdminClient();
    try {
        const addAttrs = attrs.map((a) => new Attribute({ type: a.type, values: a.values as string[] & Buffer[] }));
        await client.add(dn, addAttrs);
        logDebug(`LDAP Debug - User created: ${sAMAccountName}`);
        return getUser(sAMAccountName);
    } catch (err) {
        logError('LDAP CreateUser Error', err);
        throw err;
    } finally {
        client.unbind();
    }
};

export const deleteUser = async (id: string): Promise<void> => {
    if (MOCK_LDAP || LDAP_URL.includes('localhost')) {
        const i = MOCK_USERS.findIndex(u => u.sAMAccountName === id);
        if (i >= 0) MOCK_USERS.splice(i, 1);
        return;
    }
    const user = await getUser(id);
    const dn = user.dn;
    if (!dn) throw new Error('User has no DN');
    const client = await getAdminClient();
    try {
        await client.del(dn);
        logDebug(`LDAP Debug - User deleted: ${id}`);
    } finally {
        client.unbind();
    }
};

export const setPassword = async (id: string, newPassword: string): Promise<void> => {
    if (!newPassword || newPassword.length < 1) throw new Error('Nova senha é obrigatória');
    if (MOCK_LDAP || LDAP_URL.includes('localhost')) {
        logDebug(`LDAP Debug - MOCK setPassword ${id}`);
        return;
    }
    const user = await getUser(id);
    const client = await getAdminClient();
    try {
        await client.modify(user.dn, [
            new Change({
                operation: 'replace',
                modification: new Attribute({ type: 'unicodePwd', values: [encodeUnicodePwd(newPassword)] })
            })
        ]);
        logDebug(`LDAP Debug - Password set for: ${id}`);
    } finally {
        client.unbind();
    }
};

export const updateUser = async (id: string, changes: any): Promise<any> => {
    if (MOCK_LDAP || LDAP_URL.includes('localhost')) {
        // Mock update...
        const userIndex = MOCK_USERS.findIndex(u => u.sAMAccountName === id);
        if (userIndex > -1) {
            MOCK_USERS[userIndex] = { ...MOCK_USERS[userIndex], ...changes };
            return MOCK_USERS[userIndex];
        }
        throw new Error('User not found');
    }

    logDebug(`LDAP Debug - Updating user: ${id}`);
    const user = await getUser(id);
    const dn = user.dn;

    const client = await getAdminClient();
    try {
        // Build replacements
        const modifications: Change[] = [];
        logDebug(`LDAP Debug - UpdateUser Changes: ${JSON.stringify(changes)}`);

        const MAX_LEN: Record<string, number> = {
            sn: 64, givenName: 64, displayName: 256, title: 64, department: 64, company: 64,
            physicalDeliveryOfficeName: 128, streetAddress: 1024, description: 1024,
            telephoneNumber: 64, mobile: 64, mail: 256, l: 128, st: 128, co: 128, postalCode: 40,
            employeeID: 64, employeeNumber: 64, ipPhone: 64, wWWHomePage: 256, cn: 64,
        };
        for (const [key, value] of Object.entries(changes)) {
            if (key === 'dn' || key === 'sAMAccountName' || key === 'memberOf' || key === 'unicodePwd' || key === 'objectClass') continue;

            const newValue = value;
            const currentValue = user[key];

            let values: string[] = [];
            let op: 'add' | 'delete' | 'replace' = 'replace';

            if (newValue === '' || newValue === null || newValue === undefined) {
                if (!currentValue) continue;
                if (key === 'userAccountControl') continue;
                op = 'delete';
                values = [];
            } else {
                let processedValue = newValue;
                if (typeof processedValue === 'string' && MAX_LEN[key]) {
                    processedValue = (processedValue as string).substring(0, MAX_LEN[key]);
                } else if (typeof processedValue === 'string') {
                    if (key === 'sn') processedValue = (processedValue as string).substring(0, 64);
                    if (key === 'givenName') processedValue = (processedValue as string).substring(0, 64);
                    if (key === 'displayName') processedValue = (processedValue as string).substring(0, 256);
                }
                values = Array.isArray(processedValue) ? (processedValue as any[]).map(String) : [String(processedValue)];
                const curVals = Array.isArray(currentValue) ? currentValue.map(String) : (currentValue ? [String(currentValue)] : []);
                if (JSON.stringify([...values].sort()) === JSON.stringify([...curVals].sort())) continue;
            }

            modifications.push(new Change({
                operation: op,
                modification: new Attribute({
                    type: key,
                    values: values
                })
            }));
        }

        if (modifications.length === 0) {
            logDebug(`LDAP Debug - No changes detected for user: ${id}`);
            return user;
        }

        await client.modify(dn, modifications);
        logDebug(`LDAP Debug - User updated successfully: ${id}`);
        return { ...user, ...changes };
    } catch (err) {
        logError('LDAP Update Error', err);
        throw err;
    } finally {
        client.unbind();
    }
};

export const searchGroups = async (query: string): Promise<any[]> => {
    if (MOCK_LDAP || LDAP_URL.includes('localhost')) {
        // Mock...
        return [];
    }
    const client = await getAdminClient();
    try {
        logDebug(`LDAP Debug - Searching groups: ${query}`);
        const result = await client.search(BASE_DN, {
            filter: `(&(cn=*${query}*)(objectClass=group))`,
            scope: 'sub',
            attributes: ['dn', 'cn', 'description', 'member']
        });
        return result.searchEntries;
    } catch (err) {
        logError('LDAP Group Search Error', err);
        throw err;
    } finally {
        client.unbind();
    }
};

export const getGroup = async (id: string): Promise<any> => {
    if (MOCK_LDAP || LDAP_URL.includes('localhost')) {
        // Mock...
        return { cn: id, member: [] };
    }
    const client = await getAdminClient();
    try {
        logDebug(`LDAP Debug - Getting group details: ${id}`);
        const result = await client.search(BASE_DN, {
            filter: `(&(cn=${id})(objectClass=group))`,
            scope: 'sub',
            attributes: ['dn', 'cn', 'description', 'member']
        });
        if (result.searchEntries.length === 0) throw new Error('Group not found');
        return result.searchEntries[0];
    } catch (err) {
        logError('LDAP GetGroup Error', err);
        throw err;
    } finally {
        client.unbind();
    }
};

export const updateGroup = async (id: string, changes: any): Promise<any> => {
    if (MOCK_LDAP || LDAP_URL.includes('localhost')) {
        return { cn: id, ...changes };
    }

    logDebug(`LDAP Debug - Updating group: ${id}`);
    const group = await getGroup(id);
    const dn = group.dn;

    const client = await getAdminClient();
    try {
        const modifications: Change[] = [];
        logDebug(`LDAP Debug - UpdateGroup Changes: ${JSON.stringify(changes)}`);

        for (const [key, value] of Object.entries(changes)) {
            if (key === 'dn' || key === 'cn') continue;

            const newValue = value;
            const currentValue = group[key];

            let values: string[] = [];
            let op: 'add' | 'delete' | 'replace' = 'replace';

            if (newValue === '' || newValue === null || newValue === undefined || (Array.isArray(newValue) && newValue.length === 0)) {
                if (!currentValue || (Array.isArray(currentValue) && currentValue.length === 0)) continue;
                op = 'delete';
                values = [];
            } else {
                const rawValues = Array.isArray(newValue) ? newValue.map(String) : [String(newValue)];
                values = [...new Set(rawValues)]; // Deduplicate

                const curVals = Array.isArray(currentValue) ? currentValue.map(String) : (currentValue ? [String(currentValue)] : []);
                if (JSON.stringify(values.sort()) === JSON.stringify(curVals.sort())) continue;
            }

            modifications.push(new Change({
                operation: op,
                modification: new Attribute({
                    type: key,
                    values: values
                })
            }));
        }

        if (modifications.length === 0) {
            logDebug(`LDAP Debug - No changes detected for group: ${id}`);
            return group;
        }

        await client.modify(dn, modifications);
        logDebug(`LDAP Debug - Group updated successfully: ${id}`);
        return { ...group, ...changes };

    } catch (err) {
        logError('LDAP Group Update Error', err);
        throw err;
    } finally {
        client.unbind();
    }
};

const UAC_ACCOUNTDISABLE = 2;
const UAC_NORMAL = 512;

/** Move user to another OU. targetOuDn = full DN of the target OU (e.g. OU=Disabled,DC=corp,DC=local). */
export const moveUserToOu = async (id: string, targetOuDn: string): Promise<void> => {
    if (MOCK_LDAP || LDAP_URL.includes('localhost')) {
        logDebug(`LDAP Debug - MOCK moveUserToOu ${id} -> ${targetOuDn}`);
        return;
    }
    const user = await getUser(id);
    const dn = (user.dn || '').trim();
    if (!dn) throw new Error('User has no DN');
    const rdn = dn.split(',')[0];
    if (!rdn) throw new Error('Invalid user DN');
    const newDn = `${rdn},${targetOuDn.replace(/^\s+|\s+$/g, '')}`;
    const client = await getAdminClient();
    try {
        await client.modifyDN(dn, newDn);
        logDebug(`LDAP Debug - User moved: ${id} -> ${newDn}`);
    } finally {
        client.unbind();
    }
};

export interface DisableUserOptions {
    /** DN da OU de destino (ex.: OU=Desativados,DC=corp,DC=local). Se omitido, o usuário permanece na OU atual. */
    targetOu?: string;
}

export const disableUser = async (id: string, options?: DisableUserOptions): Promise<void> => {
    if (options?.targetOu?.trim()) {
        await moveUserToOu(id, options.targetOu.trim());
    }
    const user = await getUser(id);
    const current = Number(user.userAccountControl) || UAC_NORMAL;
    await updateUser(id, { userAccountControl: current | UAC_ACCOUNTDISABLE });
};

export const enableUser = async (id: string): Promise<void> => {
    const user = await getUser(id);
    const current = Number(user.userAccountControl) || UAC_NORMAL;
    await updateUser(id, { userAccountControl: current & ~UAC_ACCOUNTDISABLE });
};

export const unlockUser = async (id: string): Promise<void> => {
    if (MOCK_LDAP || LDAP_URL.includes('localhost')) return;
    const user = await getUser(id);
    const client = await getAdminClient();
    try {
        await client.modify(user.dn, [
            new Change({ operation: 'replace', modification: new Attribute({ type: 'lockoutTime', values: ['0'] }) })
        ]);
        logDebug(`LDAP Debug - User unlocked: ${id}`);
    } finally {
        client.unbind();
    }
};

export const listOUs = async (): Promise<any[]> => {
    if (MOCK_LDAP || LDAP_URL.includes('localhost')) {
        return [{ dn: 'OU=Users,DC=example,DC=com', ou: 'Users', name: 'Users' }, { dn: 'OU=Groups,DC=example,DC=com', ou: 'Groups', name: 'Groups' }];
    }
    try {
        const client = await getAdminClient();
        try {
            const result = await client.search(BASE_DN, {
                filter: '(objectClass=organizationalUnit)',
                scope: 'sub',
                attributes: ['dn', 'ou', 'name', 'description']
            });
            return result.searchEntries || [];
        } finally {
            client.unbind();
        }
    } catch (err) {
        logError('LDAP List OUs Error', err);
        return [];
    }
};

export const addMemberToGroup = async (groupCn: string, memberDn: string): Promise<void> => {
    if (MOCK_LDAP || LDAP_URL.includes('localhost')) {
        logDebug(`LDAP Debug - MOCK addMemberToGroup ${groupCn} ${memberDn}`);
        return;
    }
    const group = await getGroup(groupCn);
    const client = await getAdminClient();
    try {
        const current = Array.isArray(group.member) ? group.member : (group.member ? [group.member] : []);
        if (current.map((m: string) => m.toLowerCase()).includes(memberDn.toLowerCase())) {
            logDebug(`LDAP Debug - Member already in group: ${memberDn}`);
            return;
        }
        await client.modify(group.dn, [
            new Change({ operation: 'add', modification: new Attribute({ type: 'member', values: [memberDn] }) })
        ]);
        logDebug(`LDAP Debug - Added member to group ${groupCn}: ${memberDn}`);
    } finally {
        client.unbind();
    }
};

export const removeMemberFromGroup = async (groupCn: string, memberDn: string): Promise<void> => {
    if (MOCK_LDAP || LDAP_URL.includes('localhost')) {
        logDebug(`LDAP Debug - MOCK removeMemberFromGroup ${groupCn} ${memberDn}`);
        return;
    }
    const group = await getGroup(groupCn);
    const client = await getAdminClient();
    try {
        await client.modify(group.dn, [
            new Change({ operation: 'delete', modification: new Attribute({ type: 'member', values: [memberDn] }) })
        ]);
        logDebug(`LDAP Debug - Removed member from group ${groupCn}: ${memberDn}`);
    } finally {
        client.unbind();
    }
};

export const resolveMemberDns = async (dns: string[]): Promise<{ dn: string; displayName?: string; cn?: string; sAMAccountName?: string }[]> => {
    if (!dns || dns.length === 0) return [];
    if (MOCK_LDAP || LDAP_URL.includes('localhost')) {
        return dns.map(dn => ({ dn, cn: dn.replace(/^CN=([^,]+).*$/i, '$1'), displayName: dn }));
    }
    const client = await getAdminClient();
    const out: { dn: string; displayName?: string; cn?: string; sAMAccountName?: string }[] = [];
    try {
        for (const dn of dns) {
            try {
                const res = await client.search(dn, { scope: 'base', attributes: ['dn', 'cn', 'sAMAccountName', 'displayName'] });
                if (res.searchEntries.length > 0) {
                    const e = res.searchEntries[0];
                    out.push({
                        dn: e.dn || dn,
                        displayName: e.displayName ?? e.cn,
                        cn: e.cn,
                        sAMAccountName: e.sAMAccountName
                    });
                } else {
                    out.push({ dn });
                }
            } catch {
                out.push({ dn });
            }
        }
        return out;
    } finally {
        client.unbind();
    }
};

export const getStats = async (): Promise<{ usersCount: number; disabledCount: number; groupsCount: number }> => {
    if (MOCK_LDAP || LDAP_URL.includes('localhost')) {
        const users = MOCK_USERS.length;
        const disabled = MOCK_USERS.filter(u => Number(u.userAccountControl) & UAC_ACCOUNTDISABLE).length;
        return { usersCount: users, disabledCount: disabled, groupsCount: 2 };
    }
    let usersCount = 0;
    let disabledCount = 0;
    let groupsCount = 0;
    try {
        const client = await getAdminClient();
        try {
            try {
                const usersRes = await client.search(BASE_DN, { filter: '(&(objectClass=user)(objectCategory=person))', scope: 'sub', attributes: ['dn'], sizeLimit: 10000 });
                usersCount = (usersRes.searchEntries || []).length;
            } catch (e) {
                logError('LDAP GetStats users', e);
            }
            try {
                const disabledRes = await client.search(BASE_DN, { filter: '(&(objectClass=user)(objectCategory=person)(userAccountControl:1.2.840.113556.1.4.803:=2))', scope: 'sub', attributes: ['dn'], sizeLimit: 10000 });
                disabledCount = (disabledRes.searchEntries || []).length;
            } catch (e) {
                logError('LDAP GetStats disabled', e);
            }
            try {
                const groupsRes = await client.search(BASE_DN, { filter: '(objectClass=group)', scope: 'sub', attributes: ['dn'], sizeLimit: 10000 });
                groupsCount = (groupsRes.searchEntries || []).length;
            } catch (e) {
                logError('LDAP GetStats groups', e);
            }
        } finally {
            client.unbind();
        }
    } catch (err) {
        logError('LDAP GetStats Error', err);
    }
    return { usersCount, disabledCount, groupsCount };
};
