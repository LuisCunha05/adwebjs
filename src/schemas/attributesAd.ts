import { z } from 'zod'

// Helper to coerce LDAP arrays to a single string
const ldapString = z.preprocess((val) => {
  // 1. Handle "undefined" (missing attribute)
  if (val === undefined || val === null) return ''

  // 2. Handle empty array []
  if (Array.isArray(val) && val.length === 0) return ''

  // 3. Handle array with value ['John']
  if (Array.isArray(val) && val.length > 0) return val[0]

  // 4. Pass through if it's already a string (rare but safe)
  return val
}, z.string())

export const ActiveDirectoryUserSchema = z.object({
  // -----------------------------------------------------------------------
  // MANDATORY ATTRIBUTES (System-Must-Contain & Must-Contain)
  // These attributes MUST be present for the object to exist.
  // -----------------------------------------------------------------------

  /**
   * Common-Name (cn)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  cn: z.string(),

  /**
   * SAM-Account-Name (sAMAccountName)
   * Syntax: Unicode String | Single-Valued: TRUE | Max Length: 20
   * The logon name used to support clients and servers running earlier versions of the OS.
   */
  sAMAccountName: z.string().max(20),

  /**
   * Object-Class (objectClass)
   * Syntax: OID String | Single-Valued: FALSE
   * The list of classes from which this object is derived (e.g., ["top", "person", "organizationalPerson", "user"]).
   */
  objectClass: z.array(z.string()).min(1),

  /**
   * Distinguish Name (dn)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  dn: z.string(),

  /**
   * Object-Sid (objectSid)
   * Syntax: SID (Binary) | Single-Valued: TRUE
   * Uniquely identifies the security principal.
   */
  // objectSid: z.string(), // Treated as string (SDDL format) for Zod validation

  /**
   * Instance-Type (instanceType)
   * Syntax: Integer | Single-Valued: TRUE
   * Bitmask describing the type of instantiation.
   */
  // instanceType: z.number().int(),

  /**
   * Object-Category (objectCategory)
   * Syntax: Distinguished Name | Single-Valued: TRUE
   */
  // objectCategory: z.string(),

  /**
   * NT-Security-Descriptor (nTSecurityDescriptor)
   * Syntax: Security Descriptor | Single-Valued: TRUE
   */
  // nTSecurityDescriptor: z.string(), // Usually base64 encoded string or raw buffer

  // -----------------------------------------------------------------------
  // OPTIONAL ATTRIBUTES (May-Contain & System-May-Contain)
  // These attributes are common but technically optional in the schema.
  // -----------------------------------------------------------------------

  // --- Identity & Naming ---

  /**
   * Given-Name (givenName)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  givenName: ldapString.optional(),

  /**
   * Surname (sn)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  sn: ldapString.optional(),

  /**
   * Display-Name (displayName)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  displayName: ldapString.optional(),

  /**
   * Description (description)
   * Syntax: Unicode String | Single-Valued: FALSE
   * Note: Often treated as single-value in UI, but schema allows multiple.
   */
  description: z.array(z.string()).or(z.string()).optional(),

  /**
   * Initials (initials)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  initials: ldapString.optional(),

  // --- Account Control & Security ---

  /**
   * User-Principal-Name (userPrincipalName)
   * Syntax: Unicode String | Single-Valued: TRUE
   * Format: user@domain.com
   */
  userPrincipalName: z.string().email().or(z.array(z.string())).optional(),

  /**
   * User-Account-Control (userAccountControl)
   * Syntax: Integer | Single-Valued: TRUE
   * Bitmask for flags like ACCOUNTDISABLE, LOCKOUT, etc.
   */
  userAccountControl: z.string().optional(),

  /**
   * Account-Expires (accountExpires)
   * Syntax: Large Integer (Int64) | Single-Valued: TRUE
   * 100-nanosecond intervals since 1601.
   */
  accountExpires: z.union([z.string(), z.number()]).optional(),

  /**
   * Password-Last-Set (pwdLastSet)
   * Syntax: Large Integer (Int64) | Single-Valued: TRUE
   */
  pwdLastSet: z.union([z.string(), z.number()]).optional(),

  /**
   * Last-Logon (lastLogon)
   * Syntax: Large Integer (Int64) | Single-Valued: TRUE
   * Note: Not replicated across DCs.
   */
  lastLogon: z.union([z.string(), z.number()]).optional(),

  /**
   * Bad-Password-Count (badPwdCount)
   * Syntax: Integer | Single-Valued: TRUE
   */
  badPwdCount: z.number().int().or(z.array(z.number())).optional(),

  // --- Contact Information ---

  /**
   * Telephone-Number (telephoneNumber)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  telephoneNumber: ldapString.optional(),

  /**
   * Mail (mail)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  mail: z.string().email().or(z.array(z.string())).optional(),

  /**
   * Proxy-Addresses (proxyAddresses)
   * Syntax: Unicode String | Single-Valued: FALSE
   * Used for Exchange email aliases (e.g.)
   */
  proxyAddresses: z.array(z.string()).optional(),

  /**
   * Mobile (mobile)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  mobile: ldapString.optional(),

  /**
   * Physical-Delivery-Office-Name (physicalDeliveryOfficeName)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  physicalDeliveryOfficeName: ldapString.optional(),

  // --- Organization ---

  /**
   * Title (title)
   * Syntax: Unicode String | Single-Valued: FALSE
   * Schema allows multiple titles, though typically used as single.
   */
  title: z.array(z.string()).or(z.string()).optional(),

  /**
   * Department (department)
   * Syntax: Unicode String | Single-Valued: FALSE
   * Schema allows multiple departments.
   */
  department: z.array(z.string()).or(z.string()).optional(),

  /**
   * Company (company)
   * Syntax: Unicode String | Single-Valued: FALSE
   */
  company: z.array(z.string()).or(z.string()).optional(),

  /**
   * Manager (manager)
   * Syntax: Distinguished Name | Single-Valued: TRUE
   * Link to another object.
   */
  manager: ldapString.optional(),

  /**
   * Employee-ID (employeeID)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  employeeID: ldapString.optional(),

  /**
   * Member-Of (memberOf)
   * Syntax: Distinguished Name | Single-Valued: FALSE
   * Computed attribute (back-link) showing group membership.
   */
  memberOf: z.array(z.string()).or(z.string()).optional(),

  // --- Location ---

  /**
   * Street-Address (streetAddress)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  streetAddress: ldapString.optional(),

  /**
   * City / Locality (l)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  l: ldapString.optional(),

  /**
   * State / Province (st)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  st: ldapString.optional(),

  /**
   * Postal-Code (postalCode)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  postalCode: ldapString.optional(),

  /**
   * Country-Code (c)
   * Syntax: Unicode String | Single-Valued: TRUE
   * 2-character ISO code (e.g., "US").
   */
  c: z.string().length(2).or(z.array(z.string())).optional(),

  // --- Profile & Script ---

  /**
   * Script-Path (scriptPath)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  scriptPath: ldapString.optional(),

  /**
   * Profile-Path (profilePath)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  profilePath: ldapString.optional(),

  /**
   * Home-Directory (homeDirectory)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  homeDirectory: ldapString.optional(),

  /**
   * Home-Drive (homeDrive)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  homeDrive: ldapString.optional(),

  // --- System Metadata ---

  /**
   * When-Created (whenCreated)
   * Syntax: Generalized Time | Single-Valued: TRUE
   */
  whenCreated: ldapString.optional(),

  /**
   * When-Changed (whenChanged)
   * Syntax: Generalized Time | Single-Valued: TRUE
   */
  whenChanged: ldapString.optional(),

  /**
   * Object-GUID (objectGUID)
   * Syntax: Octet String (UUID) | Single-Valued: TRUE
   */
  objectGUID: ldapString.optional(),
  /**
   * wWWHomePage (Home page)
   * Syntax: String (Unicode) | Single-Valued: TRUE
   */
  wWWHomePage: z.string().min(1).max(2048).or(z.array(z.string())).optional(),

  /**
   * ipPhone (telefone Ip)
   * Syntax: String (Unicode) | Single-Valued: TRUE
   */
  ipPhone: ldapString.optional(),
})

export type ActiveDirectoryUser = z.infer<typeof ActiveDirectoryUserSchema>

export const PasswordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')

export const CreateUserFormSchema = z
  .object({
    parentOuDn: z.string().min(1, 'Parent OU DN is required'),
    sAMAccountName: z.string().trim().min(1, 'sAMAccountName is required').max(20),
    password: PasswordSchema,

    // Optional fields with max length validation
    cn: z.string().max(64).optional(),
    givenName: z.string().max(64).optional(),
    sn: z.string().max(64).optional(),
    displayName: z.string().max(256).optional(),
    mail: z.string().max(256).optional(),
    description: z.string().max(1024).optional(),
    title: z.string().max(64).optional(),
    department: z.string().max(64).optional(),
    company: z.string().max(64).optional(),
    physicalDeliveryOfficeName: z.string().max(128).optional(),
    streetAddress: z.string().max(1024).optional(),
    telephoneNumber: z.string().max(64).optional(),
    mobile: z.string().max(64).optional(),
    userPrincipalName: z.string().optional(),
  })
  .transform((data) => {
    const cn = (
      data.cn ||
      data.displayName ||
      `${data.givenName || ''} ${data.sn || ''}`.trim() ||
      data.sAMAccountName
    ).slice(0, 64)

    return {
      ...data,
      cn,
    }
  })

export type CreateUserForm = z.infer<typeof CreateUserFormSchema>

export const AdUserListSchema = z.array(ActiveDirectoryUserSchema)
export type ListAdUser = z.infer<typeof AdUserListSchema>

export const UpdateUserSchema = ActiveDirectoryUserSchema.partial().extend({
  cn: z.string().max(64).optional(),
  givenName: z.string().max(64).optional(),
  sn: z.string().max(64).optional(),
  displayName: z.string().max(256).optional(),
  mail: z.string().max(256).optional(),
  description: z.string().max(1024).optional(),
  title: z.string().max(64).optional(),
  department: z.string().max(64).optional(),
  company: z.string().max(64).optional(),
  physicalDeliveryOfficeName: z.string().max(128).optional(),
  streetAddress: z.string().max(1024).optional(),
  telephoneNumber: z.string().max(64).optional(),
  mobile: z.string().max(64).optional(),
  userPrincipalName: z.string().optional(),
})

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
