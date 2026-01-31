import { Client, Attribute, Change } from 'ldapts';
import { getFetchAttributes, LdapUserAttributes } from './ad-user-attributes';
import { ILdapService, SearchUsersOptions, CreateUserInput, DisableUserOptions } from './ldap-interface';

import {
    LDAP_URL,
    LDAP_BASE_DN as BASE_DN,
    LDAP_ADMIN_DN,
    LDAP_ADMIN_PASSWORD,
    LDAP_DEBUG,
    LDAP_GROUP_REQUIRED,
    LDAP_DOMAIN
} from '../config';

const logDebug = (msg: string) => {
    if (LDAP_DEBUG) {
        console.log(`[${new Date().toISOString()}] ${msg}`);
    }
};

const logError = (msg: string, err: any) => {
    console.error(`[${new Date().toISOString()}] ${msg}`, err);
};

// Helper helpers
function escapeLdapFilter(val: string): string {
    return val
        .replace(/\\/g, '\\5c')
        .replace(/\*/g, '\\2a')
        .replace(/\(/g, '\\28')
        .replace(/\)/g, '\\29')
        .replace(/\x00/g, '\\00');
}

function encodeUnicodePwd(password: string): Buffer {
    return Buffer.from('"' + password.replace(/"/g, '') + '"', 'utf16le');
}

function escapeRdn(val: string): string {
    return val.replace(/\\/g, '\\5C').replace(/"/g, '\\22').replace(/^(\s)|(\s)$/g, (_, a, b) => (a ? '\\20' : '\\20')).replace(/#/g, '\\23').replace(/\+/g, '\\2B').replace(/;/g, '\\3B').replace(/</g, '\\3C').replace(/=/g, '\\3D').replace(/>/g, '\\3E').replace(/,/g, '\\2C');
}

const UAC_ACCOUNTDISABLE = 2;
const UAC_NORMAL = 512;

function getSingleValue(val: string | string[] | Buffer | Buffer[] | undefined): string | undefined {
    if (val === undefined || val === null) return undefined;
    if (Array.isArray(val)) {
        if (val.length === 0) return undefined;
        const first = val[0];
        if (Buffer.isBuffer(first)) return first.toString();
        return String(first);
    }
    if (Buffer.isBuffer(val)) return val.toString();
    return String(val);
}

export class LdapService implements ILdapService {

    private createClient(): Client {
        return new Client({
            url: LDAP_URL,
            tlsOptions: { rejectUnauthorized: false }
        });
    }

    private async getAdminClient(): Promise<Client> {
        const client = this.createClient();
        if (!LDAP_ADMIN_DN || !LDAP_ADMIN_PASSWORD) {
            throw new Error('LDAP_ADMIN_DN or LDAP_ADMIN_PASSWORD not configured');
        }
        await client.bind(LDAP_ADMIN_DN, LDAP_ADMIN_PASSWORD);
        return client;
    }

    async authenticate(username: string, password: string): Promise<LdapUserAttributes> {
        logDebug(`LDAP Debug - Authenticating user: ${username}`);

        // 1. Admin Bind to search for user DN
        const navClient = this.createClient();
        try {
            if (!LDAP_ADMIN_DN || !LDAP_ADMIN_PASSWORD) throw new Error("Missing Admin Credentials");
            await navClient.bind(LDAP_ADMIN_DN, LDAP_ADMIN_PASSWORD);

            // 2. Search User
            const searchFilter = `(|(sAMAccountName=${username})(userPrincipalName=${username}))`;
            const result = await navClient.search(BASE_DN, {
                filter: searchFilter,
                scope: 'sub',
                attributes: ['dn', 'sAMAccountName', 'userPrincipalName', 'memberOf', 'cn', 'mail']
            });

            if (result.searchEntries.length === 0) {
                throw new Error('User not found');
            }

            const userEntry = result.searchEntries[0];
            const userDn = userEntry.dn;

            // 3. User Bind (Auth check)
            const userClient = this.createClient();
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

                return userEntry as LdapUserAttributes;
            } catch (err: any) {
                if (err.message === 'Unauthorized') throw err;
                logError('LDAP Debug - Authentication bind failed:', err);
                throw new Error('Invalid credentials');
            } finally {
                try { userClient.unbind(); } catch { }
            }

        } catch (err: any) {
            logError('LDAP Search/Auth Error:', err);
            throw err;
        } finally {
            try { navClient.unbind(); } catch { }
        }
    }

    async searchUsers(query: string, searchBy: string, options?: SearchUsersOptions): Promise<LdapUserAttributes[]> {
        const client = await this.getAdminClient();
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

            return (result.searchEntries || []) as LdapUserAttributes[];
        } catch (err) {
            logError('LDAP Search Error:', err);
            throw err;
        } finally {
            client.unbind();
        }
    }

    async getUser(id: string): Promise<LdapUserAttributes> {
        const client = await this.getAdminClient();
        try {
            logDebug(`LDAP Debug - Getting user details for: ${id}`);
            const result = await client.search(BASE_DN, {
                filter: `(sAMAccountName=${id})`,
                scope: 'sub',
                attributes: getFetchAttributes()
            });

            if (result.searchEntries.length === 0) throw new Error('User not found');
            return result.searchEntries[0] as LdapUserAttributes;
        } catch (err) {
            logError('LDAP GetUser Error:', err);
            throw err;
        } finally {
            client.unbind();
        }
    }

    async createUser(input: CreateUserInput): Promise<LdapUserAttributes> {
        const { parentOuDn, sAMAccountName, password } = input;
        if (!parentOuDn?.trim() || !sAMAccountName?.trim() || !password) {
            throw new Error('parentOuDn, sAMAccountName e password são obrigatórios');
        }

        const cn = (input.cn || input.displayName || `${(input.givenName || '')} ${(input.sn || '')}`.trim() || sAMAccountName).slice(0, 64);
        const rdn = 'CN=' + escapeRdn(cn);
        const dn = `${rdn},${parentOuDn.replace(/^\s+|\s+$/g, '')}`;
        const domain = LDAP_DOMAIN;
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

        const client = await this.getAdminClient();
        try {
            const addAttrs = attrs.map((a) => new Attribute({ type: a.type, values: a.values as string[] & Buffer[] }));
            await client.add(dn, addAttrs);
            logDebug(`LDAP Debug - User created: ${sAMAccountName}`);
            return this.getUser(sAMAccountName);
        } catch (err) {
            logError('LDAP CreateUser Error', err);
            throw err;
        } finally {
            client.unbind();
        }
    }

    async deleteUser(id: string): Promise<void> {
        const user = await this.getUser(id);
        const dn = getSingleValue(user.dn);
        if (!dn) throw new Error('User has no DN');

        const client = await this.getAdminClient();
        try {
            await client.del(dn);
            logDebug(`LDAP Debug - User deleted: ${id}`);
        } finally {
            client.unbind();
        }
    }

    async setPassword(id: string, newPassword: string): Promise<void> {
        if (!newPassword || newPassword.length < 1) throw new Error('Nova senha é obrigatória');

        const user = await this.getUser(id);
        const dn = getSingleValue(user.dn);
        if (!dn) throw new Error('User has no DN');

        const client = await this.getAdminClient();
        try {
            await client.modify(dn, [
                new Change({
                    operation: 'replace',
                    modification: new Attribute({ type: 'unicodePwd', values: [encodeUnicodePwd(newPassword)] })
                })
            ]);
            logDebug(`LDAP Debug - Password set for: ${id}`);
        } finally {
            client.unbind();
        }
    }

    async updateUser(id: string, changes: any): Promise<LdapUserAttributes> {
        logDebug(`LDAP Debug - Updating user: ${id}`);
        const user = await this.getUser(id);
        const dn = getSingleValue(user.dn);
        if (!dn) throw new Error('User has no DN');

        const client = await this.getAdminClient();
        try {
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
            return { ...user, ...changes } as LdapUserAttributes;
        } catch (err) {
            logError('LDAP Update Error', err);
            throw err;
        } finally {
            client.unbind();
        }
    }

    async searchGroups(query: string): Promise<any[]> {
        const client = await this.getAdminClient();
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
    }

    async getGroup(id: string): Promise<any> {
        const client = await this.getAdminClient();
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
    }

    async updateGroup(id: string, changes: any): Promise<any> {
        logDebug(`LDAP Debug - Updating group: ${id}`);
        const group = await this.getGroup(id);
        const dn = group.dn;

        const client = await this.getAdminClient();
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
    }

    async moveUserToOu(id: string, targetOuDn: string): Promise<void> {
        const user = await this.getUser(id);
        const rawDn = getSingleValue(user.dn);
        const dn = (rawDn || '').trim();
        if (!dn) throw new Error('User has no DN');

        const rdn = dn.split(',')[0];
        if (!rdn) throw new Error('Invalid user DN');

        const newDn = `${rdn},${targetOuDn.replace(/^\s+|\s+$/g, '')}`;
        const client = await this.getAdminClient();
        try {
            await client.modifyDN(dn, newDn);
            logDebug(`LDAP Debug - User moved: ${id} -> ${newDn}`);
        } finally {
            client.unbind();
        }
    }

    async disableUser(id: string, options?: DisableUserOptions): Promise<void> {
        if (options?.targetOu?.trim()) {
            await this.moveUserToOu(id, options.targetOu.trim());
        }
        const user = await this.getUser(id);
        const current = Number(user.userAccountControl) || UAC_NORMAL;
        await this.updateUser(id, { userAccountControl: current | UAC_ACCOUNTDISABLE });
    }

    async enableUser(id: string): Promise<void> {
        const user = await this.getUser(id);
        const current = Number(user.userAccountControl) || UAC_NORMAL;
        await this.updateUser(id, { userAccountControl: current & ~UAC_ACCOUNTDISABLE });
    }

    async unlockUser(id: string): Promise<void> {
        const user = await this.getUser(id);
        const dn = getSingleValue(user.dn);
        if (!dn) throw new Error('User has no DN');

        const client = await this.getAdminClient();
        try {
            await client.modify(dn, [
                new Change({ operation: 'replace', modification: new Attribute({ type: 'lockoutTime', values: ['0'] }) })
            ]);
            logDebug(`LDAP Debug - User unlocked: ${id}`);
        } finally {
            client.unbind();
        }
    }

    async listOUs(): Promise<any[]> {
        try {
            const client = await this.getAdminClient();
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
    }

    async addMemberToGroup(groupCn: string, memberDn: string): Promise<void> {
        const group = await this.getGroup(groupCn);
        const client = await this.getAdminClient();
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
    }

    async removeMemberFromGroup(groupCn: string, memberDn: string): Promise<void> {
        const group = await this.getGroup(groupCn);
        const client = await this.getAdminClient();
        try {
            await client.modify(group.dn, [
                new Change({ operation: 'delete', modification: new Attribute({ type: 'member', values: [memberDn] }) })
            ]);
            logDebug(`LDAP Debug - Removed member from group ${groupCn}: ${memberDn}`);
        } finally {
            client.unbind();
        }
    }

    async resolveMemberDns(dns: string[]): Promise<{ dn: string; displayName?: string; cn?: string; sAMAccountName?: string }[]> {
        if (!dns || dns.length === 0) return [];
        const client = await this.getAdminClient();
        const out: { dn: string; displayName?: string; cn?: string; sAMAccountName?: string }[] = [];
        try {
            for (const dn of dns) {
                try {
                    const res = await client.search(dn, { scope: 'base', attributes: ['dn', 'cn', 'sAMAccountName', 'displayName'] });
                    if (res.searchEntries.length > 0) {
                        const e = res.searchEntries[0];
                        out.push({
                            dn: e.dn || dn,
                            displayName: getSingleValue(e.displayName) ?? getSingleValue(e.cn),
                            cn: getSingleValue(e.cn),
                            sAMAccountName: getSingleValue(e.sAMAccountName)
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
    }

    async getStats(): Promise<{ usersCount: number; disabledCount: number; groupsCount: number }> {
        let usersCount = 0;
        let disabledCount = 0;
        let groupsCount = 0;
        try {
            const client = await this.getAdminClient();
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
    }
}
