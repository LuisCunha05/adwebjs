import path from "path";
import { z } from "zod";

const configSchema = z.object({
  // LDAP Connection
  LDAP_URL: z.string().min(1, "LDAP_URL is required"),
  LDAP_BASE_DN: z.string().min(1, "LDAP_BASE_DN is required"),
  LDAP_ADMIN_DN: z.string().min(1, "LDAP_ADMIN_DN is required"),
  LDAP_ADMIN_PASSWORD: z.string().min(1, "LDAP_ADMIN_PASSWORD is required"),
  LDAP_DEBUG: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  LDAP_GROUP_REQUIRED: z.string().optional(),
  LDAP_GROUP_DELETE: z
    .string()
    .transform((val) => (val || "").trim())
    .default(""),

  // Session
  SESSION_COOKIE_NAME: z.string().default("adweb_session"),
  SESSION_EXPIRATION_SECONDS: z.coerce.number().default(3600),

  // Domain suffix for binding (fallback logic handled after parse if missing)
  LDAP_DOMAIN: z.string().optional(),

  // Scheduled Data Directory
  SCHEDULE_DATA_DIR: z.string().optional(),

  // Extra Attributes
  AD_EXTRA_ATTRIBUTES: z.string().default(""),
});

// Parse and validate environment variables
const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.format());
  throw new Error("Invalid environment variables");
}

const env = parsed.data;

export const LDAP_URL = env.LDAP_URL;
export const LDAP_BASE_DN = env.LDAP_BASE_DN;
export const LDAP_ADMIN_DN = env.LDAP_ADMIN_DN;
export const LDAP_ADMIN_PASSWORD = env.LDAP_ADMIN_PASSWORD;
export const LDAP_DEBUG = env.LDAP_DEBUG;
export const LDAP_GROUP_REQUIRED = env.LDAP_GROUP_REQUIRED;
export const LDAP_GROUP_DELETE = env.LDAP_GROUP_DELETE;

export const SESSION_COOKIE_NAME = env.SESSION_COOKIE_NAME;
export const SESSION_EXPIRATION_SECONDS = env.SESSION_EXPIRATION_SECONDS;

export const AD_EXTRA_ATTRIBUTES = env.AD_EXTRA_ATTRIBUTES;

// Derived values with fallback logic

export const LDAP_DOMAIN =
  env.LDAP_DOMAIN ||
  (LDAP_BASE_DN.match(/DC=([^,]+)/gi) || []).map((x: string) => x.replace(/^DC=/i, "")).join(".") ||
  "local";

export const SCHEDULE_DATA_DIR = env.SCHEDULE_DATA_DIR
  ? path.isAbsolute(env.SCHEDULE_DATA_DIR)
    ? env.SCHEDULE_DATA_DIR
    : path.join(process.cwd(), env.SCHEDULE_DATA_DIR)
  : path.join(process.cwd(), "data");
