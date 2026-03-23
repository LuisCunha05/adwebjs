import path from 'node:path'
import { z } from 'zod'

const configSchema = z.object({
  // LDAP Connection
  LDAP_URL: z.string().trim().min(1, 'LDAP_URL is required'),
  LDAP_BASE_DN: z.string().trim().min(1, 'LDAP_BASE_DN is required'),
  LDAP_ADMIN_DN: z.string().trim().min(1, 'LDAP_ADMIN_DN is required'),
  LDAP_ADMIN_PASSWORD: z.string().trim().min(1, 'LDAP_ADMIN_PASSWORD is required'),
  LDAP_DEBUG: z
    .string()
    .trim()
    .transform((val) => val === 'true')
    .optional(),
  LDAP_GROUP_REQUIRED: z.string().trim().optional(),
  LDAP_GROUP_DELETE: z.string().trim().optional(),

  // Session
  JWT_SECRET_KEY: z.string().trim().min(20),
  SESSION_COOKIE_NAME: z.string().trim().optional().default('adweb_session'),
  SESSION_EXPIRATION_SECONDS: z.coerce.number().optional().default(3600),

  // Domain suffix for binding (fallback logic handled after parse if missing)
  LDAP_DOMAIN: z.string().trim().optional(),

  // Scheduled Data Directory
  SCHEDULE_DATA_DIR: z.string().trim().optional(),

  // Extra Attributes
  AD_EXTRA_ATTRIBUTES: z.string().trim().default(''),

  // Database Connection
  DB_USER: z.string().trim().min(1, 'DB_USER is required'),
  DB_PASSWORD: z.string().trim().min(1, 'DB_PASSWORD is required'),
  DB_HOST: z.string().trim().min(1, 'DB_HOST is required'),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().trim().min(1, 'DB_NAME is required'),
})

// Parse and validate environment variables
const parsed = configSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format())
  throw new Error('Invalid environment variables')
}

const env = parsed.data

export const LDAP_URL = env.LDAP_URL
export const LDAP_BASE_DN = env.LDAP_BASE_DN
export const LDAP_ADMIN_DN = env.LDAP_ADMIN_DN
export const LDAP_ADMIN_PASSWORD = env.LDAP_ADMIN_PASSWORD
export const LDAP_DEBUG = env.LDAP_DEBUG
export const LDAP_GROUP_REQUIRED = env.LDAP_GROUP_REQUIRED
export const LDAP_GROUP_DELETE = env.LDAP_GROUP_DELETE

export const SESSION_COOKIE_NAME = env.SESSION_COOKIE_NAME
export const SESSION_EXPIRATION_SECONDS = env.SESSION_EXPIRATION_SECONDS

export const AD_EXTRA_ATTRIBUTES = env.AD_EXTRA_ATTRIBUTES

// Derived values with fallback logic

export const LDAP_DOMAIN =
  env.LDAP_DOMAIN ||
  (LDAP_BASE_DN.match(/DC=([^,]+)/gi) || []).map((x: string) => x.replace(/^DC=/i, '')).join('.') ||
  'local'

export const SCHEDULE_DATA_DIR = env.SCHEDULE_DATA_DIR
  ? path.isAbsolute(env.SCHEDULE_DATA_DIR)
    ? env.SCHEDULE_DATA_DIR
    : path.join(process.cwd(), env.SCHEDULE_DATA_DIR)
  : path.join(process.cwd(), 'data')

export const DB_USER = env.DB_USER
export const DB_PASSWORD = env.DB_PASSWORD
export const DB_HOST = env.DB_HOST
export const DB_PORT = env.DB_PORT
export const DB_NAME = env.DB_NAME

export const DATABASE_URL = `postgresql://${DB_USER}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public`
