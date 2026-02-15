import path from 'path';

// LDAP Connection
export const LDAP_URL = process.env.LDAP_URL as string;
export const LDAP_BASE_DN = process.env.LDAP_BASE_DN as string;
export const LDAP_ADMIN_DN = process.env.LDAP_ADMIN_DN as string;
export const LDAP_ADMIN_PASSWORD = process.env.LDAP_ADMIN_PASSWORD as string;
export const LDAP_DEBUG = process.env.LDAP_DEBUG === 'true';
export const LDAP_GROUP_REQUIRED = process.env.LDAP_GROUP_REQUIRED as string;
export const LDAP_GROUP_DELETE = (process.env.LDAP_GROUP_DELETE || '').trim();

// Session
export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'adweb_session';
export const SESSION_EXPIRATION_SECONDS = Number(process.env.SESSION_EXPIRATION_SECONDS) || 3600;

// Domain suffix for binding (fallback logic)
export const LDAP_DOMAIN = process.env.LDAP_DOMAIN ||
    ((LDAP_BASE_DN || '').match(/DC=([^,]+)/gi) || [])
        .map((x: string) => x.replace(/^DC=/i, ''))
        .join('.') || 'local';

// Scheduled Data Directory
export const SCHEDULE_DATA_DIR = process.env.SCHEDULE_DATA_DIR
    ? path.isAbsolute(process.env.SCHEDULE_DATA_DIR)
        ? process.env.SCHEDULE_DATA_DIR
        : path.join(process.cwd(), process.env.SCHEDULE_DATA_DIR)
    : path.join(process.cwd(), 'data'); // Default to 'data' if undefined, similar to previous logic implied by audit.ts logs/context

// Extra Attributes
export const AD_EXTRA_ATTRIBUTES = process.env.AD_EXTRA_ATTRIBUTES || '';
