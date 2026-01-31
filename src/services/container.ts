import { LdapService } from './ldap';
import { ILdapService } from './ldap-interface';

// Singleton instance
const ldapService: ILdapService = new LdapService();

export { ldapService };
