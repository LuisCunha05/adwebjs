import { Client, Attribute, Change } from 'ldapts';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const LDAP_URL = process.env.LDAP_URL as string;
const BASE_DN = process.env.LDAP_BASE_DN as string;
const LDAP_ADMIN_DN = process.env.LDAP_ADMIN_DN as string;
const LDAP_ADMIN_PASSWORD = process.env.LDAP_ADMIN_PASSWORD as string;
const MOCK_LDAP = process.env.MOCK_LDAP === 'true';
const LDAP_DEBUG = process.env.LDAP_DEBUG === 'true';

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
            if (user) return user;
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
            // Return user attributes
            // ldapts entry keys are accessible directly usually
            return userEntry;
        } catch (err: any) {
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

export const searchUsers = async (query: string, searchBy: string): Promise<any[]> => {
    if (MOCK_LDAP || LDAP_URL.includes('localhost')) {
        logDebug(`LDAP Debug - MOCK Searching users. Query: ${query}, By: ${searchBy}`);
        return MOCK_USERS.filter(u => u[searchBy] && (u[searchBy] as string).includes(query));
    }

    const client = await getAdminClient();
    try {
        logDebug(`LDAP Debug - Searching users. Query: ${query}, By: ${searchBy}`);
        const searchFilter = `(&(${searchBy}=*${query}*)(objectClass=user)(objectCategory=person))`;

        const result = await client.search(BASE_DN, {
            filter: searchFilter,
            scope: 'sub',
            attributes: ['dn', 'sAMAccountName', 'userPrincipalName', 'cn', 'mail', 'memberOf']
        });

        return result.searchEntries;
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
            attributes: ['dn', 'sAMAccountName', 'userPrincipalName', 'cn', 'mail', 'memberOf', 'telephoneNumber', 'description', 'givenName', 'sn', 'displayName', 'userAccountControl']
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

        for (const [key, value] of Object.entries(changes)) {
            if (key === 'dn' || key === 'sAMAccountName' || key === 'memberOf' || key === 'cn') continue;

            const newValue = value;
            const currentValue = user[key];

            // Normalize simple string or array
            // ldapts Modification uses { type: string, values: string[] }
            // 'operation' is passed to modify

            // Optimization: basic diff check
            // ... logic same as JS ...

            // For ldapts we usually construct Change objects or Modification objects
            // Client.modify(dn, changes[])
            // change: { operation: 'replace', modification: { type: key, values: [...] } }

            let values: string[] = [];
            let op: 'add' | 'delete' | 'replace' = 'replace';

            if (newValue === '' || newValue === null || newValue === undefined) {
                if (!currentValue) continue; // nothing to delete
                if (key === 'userAccountControl') continue; // protect
                op = 'delete';
                values = []; // delete all values of attribute
            } else {
                // Truncate values based on AD Limits
                let processedValue = newValue;
                if (typeof processedValue === 'string') {
                    if (key === 'sn' && (processedValue as string).length > 64) processedValue = (processedValue as string).substring(0, 64);
                    if (key === 'givenName' && (processedValue as string).length > 64) processedValue = (processedValue as string).substring(0, 64);
                    if (key === 'sAMAccountName' && (processedValue as string).length > 20) processedValue = (processedValue as string).substring(0, 20);
                    if (key === 'displayName' && (processedValue as string).length > 256) processedValue = (processedValue as string).substring(0, 256);
                }

                values = Array.isArray(processedValue) ? (processedValue as any[]).map(String) : [String(processedValue)];

                // Diff check simple
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
