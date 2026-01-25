const ldap = require('ldapjs');
require('dotenv').config();

const LDAP_URL = process.env.LDAP_URL;
const BASE_DN = process.env.LDAP_BASE_DN;

// Mock data for development
const MOCK_USERS = [
    { sAMAccountName: 'admin', userPrincipalName: 'admin@example.com', pwdLastSet: '133000000000000000', userAccountControl: '66048', memberOf: ['CN=ADWEB-Admin,OU=Groups,DC=example,DC=com'] },
    { sAMAccountName: 'jdoe', userPrincipalName: 'jdoe@example.com', pwdLastSet: '133000000000000000', userAccountControl: '512', memberOf: [] }
];

function createClient() {
    return ldap.createClient({
        url: LDAP_URL,
        tlsOptions: {
            rejectUnauthorized: false
        }
    });
}

function parseEntry(entry) {
    if (entry.object) {
        return entry.object;
    }
    const obj = {
        dn: entry.dn ? entry.dn.toString() : null
    };
    if (entry.attributes && Array.isArray(entry.attributes)) {
        entry.attributes.forEach(attr => {
            const key = attr.type;
            const values = attr.values || attr.vals || []; // Support both variations
            if (values && values.length > 0) {
                if (values.length === 1) {
                    obj[key] = values[0];
                } else {
                    obj[key] = values;
                }
            }
        });
    }
    return obj;
}

function getAdminClient() {
    return new Promise((resolve, reject) => {
        const client = createClient();
        const adminDN = process.env.LDAP_ADMIN_DN;
        const adminPwd = process.env.LDAP_ADMIN_PASSWORD;

        if (!adminDN || !adminPwd) {
            client.unbind();
            return reject(new Error('LDAP_ADMIN_DN or LDAP_ADMIN_PASSWORD not configured'));
        }

        client.bind(adminDN, adminPwd, (err) => {
            if (err) {
                client.unbind();
                return reject(new Error('Admin bind failed: ' + err.message));
            }
            resolve(client);
        });
    });
}

const authenticate = (username, password) => {
    console.log(`LDAP Debug - Authenticating user: ${username}`);
    return new Promise((resolve, reject) => {
        // MOCK AUTHENTICATION
        if (process.env.MOCK_LDAP === 'true' || LDAP_URL.includes('localhost')) {
            console.log('MOCK AUTH used for:', username);
            if (password === 'password') {
                const user = MOCK_USERS.find(u => u.userPrincipalName === username || u.sAMAccountName === username);
                if (user) return resolve(user);
                return resolve({ sAMAccountName: username, memberOf: ['CN=ADWEB-Admin'] });
            }
            if (username === 'admin') return resolve({ sAMAccountName: 'admin', memberOf: ['CN=ADWEB-Admin'] });
        }

        const client = createClient();
        const navClient = createClient(); // Client for Admin Bind/Search

        // 1. Bind as Admin to search for the user
        const adminDN = process.env.LDAP_ADMIN_DN;
        const adminPwd = process.env.LDAP_ADMIN_PASSWORD;

        if (!adminDN || !adminPwd) {
            return reject(new Error('LDAP_ADMIN_DN or LDAP_ADMIN_PASSWORD not configured'));
        }

        navClient.bind(adminDN, adminPwd, (err) => {
            if (err) {
                navClient.unbind();
                return reject(new Error('Admin bind failed: ' + err.message));
            }

            // 2. Search for the user to get their real DN
            // We search by sAMAccountName OR userPrincipalName to be flexible
            const searchFilter = `(|(sAMAccountName=${username})(userPrincipalName=${username}))`;

            const opts = {
                filter: searchFilter,
                scope: 'sub',
                attributes: ['dn', 'sAMAccountName', 'userPrincipalName', 'memberOf', 'cn']
            };

            navClient.search(BASE_DN, opts, (err, res) => {
                if (err) {
                    console.error('LDAP Search Error:', err);
                    navClient.unbind();
                    return reject(err);
                }

                let userEntry = null;

                res.on('searchEntry', (entry) => {
                    try {
                        userEntry = parseEntry(entry);
                    } catch (e) {
                        console.error('LDAP Error processing entry:', e);
                    }
                });

                res.on('end', (result) => {
                    navClient.unbind();

                    if (!userEntry) {
                        return reject(new Error('User not found'));
                    }

                    // 3. User found, now bind as the user to verify password
                    client.bind(userEntry.dn, password, (err) => {
                        if (err) {
                            client.unbind();
                            console.error('LDAP Debug - Authentication bind failed:', err);
                            return reject(new Error('Invalid credentials'));
                        }

                        // Password verified
                        client.unbind();
                        console.log(`LDAP Debug - User authenticated successfully: ${username}`);
                        resolve(userEntry);
                    });
                });

                res.on('error', (err) => {
                    navClient.unbind();
                    reject(err);
                });
            });
        });
    });
};

// ... existing authenticate ...

const searchUsers = (query, searchBy) => {
    return new Promise((resolve, reject) => {
        if (process.env.MOCK_LDAP === 'true' || LDAP_URL.includes('localhost')) {
            console.log(`MOCK Search Users: ${query} by ${searchBy}`);
            const users = MOCK_USERS.filter(u => u[searchBy] && u[searchBy].includes(query));
            return resolve(users);
        }

        getAdminClient().then(client => {
            console.log(`LDAP Debug - Searching users. Query: ${query}, By: ${searchBy}`);
            // Wildcard search for the query provided
            // Filter example: (&(sAMAccountName=*john*)(objectClass=user)(objectCategory=person))
            const searchFilter = `(&(${searchBy}=*${query}*)(objectClass=user)(objectCategory=person))`;
            const opts = {
                filter: searchFilter,
                scope: 'sub',
                attributes: ['dn', 'sAMAccountName', 'userPrincipalName', 'cn', 'mail', 'memberOf']
            };

            client.search(BASE_DN, opts, (err, res) => {
                if (err) {
                    client.unbind();
                    return reject(err);
                }

                const users = [];

                res.on('searchEntry', (entry) => {
                    users.push(parseEntry(entry));
                });

                res.on('end', (result) => {
                    client.unbind();
                    resolve(users);
                });

                res.on('error', (err) => {
                    client.unbind();
                    reject(err);
                });
            });
        }).catch(reject);
    });
};

const getUser = (id) => {
    return new Promise((resolve, reject) => {
        if (process.env.MOCK_LDAP === 'true' || LDAP_URL.includes('localhost')) {
            const user = MOCK_USERS.find(u => u.sAMAccountName === id);
            if (user) return resolve(user);
            return reject(new Error('User not found'));
        }

        getAdminClient().then(client => {
            console.log(`LDAP Debug - Getting user details for: ${id}`);
            const searchFilter = `(sAMAccountName=${id})`;
            const opts = {
                filter: searchFilter,
                scope: 'sub',
                attributes: ['dn', 'sAMAccountName', 'userPrincipalName', 'cn', 'mail', 'memberOf', 'telephoneNumber', 'description', 'givenName', 'sn', 'displayName']
            };

            client.search(BASE_DN, opts, (err, res) => {
                if (err) {
                    client.unbind();
                    return reject(err);
                }

                let user = null;

                res.on('searchEntry', (entry) => {
                    user = parseEntry(entry);
                });

                res.on('end', (result) => {
                    client.unbind();
                    if (user) resolve(user);
                    else reject(new Error('User not found'));
                });

                res.on('error', (err) => {
                    client.unbind();
                    reject(err);
                });
            });
        }).catch(reject);
    });
};

const updateUser = (id, changes) => {
    return new Promise((resolve, reject) => {
        if (process.env.MOCK_LDAP === 'true' || LDAP_URL.includes('localhost')) {
            const userIndex = MOCK_USERS.findIndex(u => u.sAMAccountName === id);
            if (userIndex > -1) {
                MOCK_USERS[userIndex] = { ...MOCK_USERS[userIndex], ...changes };
                return resolve(MOCK_USERS[userIndex]);
            }
            return reject(new Error('User not found'));
        }

        // 1. Get User DN first
        console.log(`LDAP Debug - Updating user: ${id}`);
        getUser(id).then(user => {
            const dn = user.dn;

            getAdminClient().then(client => {
                const changesList = [];

                console.log('LDAP Debug - UpdateUser Changes:', changes);

                // Convert simple object changes to LDAP Change objects
                for (const [key, value] of Object.entries(changes)) {
                    // Skip immutable or unsafe fields if necessary. 
                    // 'cn' requires specific rename operations (modifyDN) usually, so let's skip it for simple updates to avoid "Unwilling To Perform"
                    if (key === 'dn' || key === 'sAMAccountName' || key === 'memberOf' || key === 'cn') continue;

                    // Create modification
                    // If value is empty, maybe 'delete'? For now, assume 'replace'
                    if (value === '' || value === null || value === undefined) {
                        // CRITICAL: Do NOT try to delete mandatory attributes
                        if (key === 'userAccountControl') continue;

                        changesList.push(new ldap.Change({
                            operation: 'delete',
                            modification: {
                                type: key,
                                values: []
                            }
                        }));
                    } else {
                        // Ensure value is a string or array of strings
                        const strValue = Array.isArray(value) ? value.map(v => String(v)) : [String(value)];

                        changesList.push(new ldap.Change({
                            operation: 'replace',
                            modification: {
                                type: key,
                                values: strValue
                            }
                        }));
                    }
                }

                if (changesList.length === 0) {
                    client.unbind();
                    return resolve(user); // No changes
                }

                client.modify(dn, changesList, (err) => {
                    client.unbind();
                    if (err) {
                        console.error('LDAP Debug - Update failed:', err);
                        return reject(err);
                    }
                    console.log(`LDAP Debug - User updated successfully: ${id}`);
                    resolve({ ...user, ...changes });
                });
            }).catch(reject);
        }).catch(reject);
    });
};

const searchGroups = (query) => {
    return new Promise((resolve, reject) => {
        if (process.env.MOCK_LDAP === 'true' || LDAP_URL.includes('localhost')) {
            // Mock groups
            const groups = [
                { cn: 'ADWEB-Admin', name: 'ADWeb Admins', member: ['CN=admin,OU=Users...'] },
                { cn: 'Developers', name: 'Developers Team', member: ['CN=jdoe,OU=Users...', 'CN=bob,OU=Users...'] }
            ].filter(g => g.cn.includes(query) || g.name.includes(query));
            return resolve(groups);
        }

        getAdminClient().then(client => {
            console.log(`LDAP Debug - Searching groups: ${query}`);
            const searchFilter = `(&(cn=*${query}*)(objectClass=group))`;
            const opts = {
                filter: searchFilter,
                scope: 'sub',
                attributes: ['dn', 'cn', 'description', 'member']
            };

            client.search(BASE_DN, opts, (err, res) => {
                if (err) {
                    client.unbind();
                    return reject(err);
                }

                const groups = [];

                res.on('searchEntry', (entry) => {
                    groups.push(parseEntry(entry));
                });

                res.on('end', (result) => {
                    client.unbind();
                    resolve(groups);
                });

                res.on('error', (err) => {
                    client.unbind();
                    reject(err);
                });
            });
        }).catch(reject);
    });
};

const updateGroup = (id, changes) => {
    return new Promise((resolve, reject) => {
        if (process.env.MOCK_LDAP === 'true' || LDAP_URL.includes('localhost')) {
            // Mock update
            return resolve({ cn: id, ...changes });
        }

        console.log(`LDAP Debug - Updating group: ${id}`);

        getGroup(id).then(group => {
            const dn = group.dn;

            getAdminClient().then(client => {
                const changesList = [];
                console.log('LDAP Debug - UpdateGroup Changes:', changes);

                for (const [key, value] of Object.entries(changes)) {
                    // Skip immutable or unsafe fields
                    if (key === 'dn' || key === 'cn') continue;

                    // Handle deletion (empty string, null, or empty array)
                    if (value === '' || value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
                        changesList.push(new ldap.Change({
                            operation: 'delete',
                            modification: {
                                type: key,
                                values: []
                            }
                        }));
                    } else {
                        // Ensure values are strings
                        const strValues = Array.isArray(value) ? value.map(v => String(v)) : [String(value)];

                        changesList.push(new ldap.Change({
                            operation: 'replace',
                            modification: {
                                type: key,
                                values: strValues
                            }
                        }));
                    }
                }

                if (changesList.length === 0) {
                    client.unbind();
                    return resolve(group);
                }

                client.modify(dn, changesList, (err) => {
                    client.unbind();
                    if (err) {
                        console.error('LDAP Debug - Group Update failed:', err);
                        return reject(err);
                    }
                    console.log(`LDAP Debug - Group updated successfully: ${id}`);
                    resolve({ ...group, ...changes });
                });
            }).catch(reject);
        }).catch(reject);
    });
};

const getGroup = (id) => {
    return new Promise((resolve, reject) => {
        if (process.env.MOCK_LDAP === 'true' || LDAP_URL.includes('localhost')) {
            const groups = [
                { cn: 'ADWEB-Admin', name: 'ADWeb Admins', member: ['CN=admin,OU=Users...'] },
                { cn: 'Developers', name: 'Developers Team', member: ['CN=jdoe,OU=Users...', 'CN=bob,OU=Users...'] }
            ];
            const group = groups.find(g => g.cn === id);
            if (group) return resolve(group);
            return reject(new Error('Group not found'));
        }

        getAdminClient().then(client => {
            console.log(`LDAP Debug - Getting group details: ${id}`);
            const searchFilter = `(&(cn=${id})(objectClass=group))`;
            const opts = {
                filter: searchFilter,
                scope: 'sub',
                attributes: ['dn', 'cn', 'description', 'member']
            };

            client.search(BASE_DN, opts, (err, res) => {
                if (err) {
                    client.unbind();
                    return reject(err);
                }

                let group = null;

                res.on('searchEntry', (entry) => {
                    group = parseEntry(entry);
                });

                res.on('end', (result) => {
                    client.unbind();
                    if (group) resolve(group);
                    else reject(new Error('Group not found'));
                });

                res.on('error', (err) => {
                    client.unbind();
                    reject(err);
                });
            });
        }).catch(reject);
    });
};

module.exports = {
    authenticate,
    searchUsers,
    getUser,
    updateUser,
    searchGroups,
    getGroup,
    updateGroup
};
