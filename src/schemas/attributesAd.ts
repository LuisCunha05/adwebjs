import { z } from 'zod'

const ldapMultiValue = z
  .string()
  .array()
  .or(z.string())
  .transform((val) => {
    if (typeof val === 'string') return [val]
    return val
  })

export const ldapSingleValue = z.any().transform((val) => {
  if (val === undefined || val === null) return undefined
  if (Array.isArray(val)) {
    if (val.length === 0) return undefined
    const first = val[0]
    if (Buffer.isBuffer(first)) return first.toString()
    return String(first)
  }
  if (Buffer.isBuffer(val)) return val.toString()
  return String(val)
})

export const ldapResponseSchema = z.record(z.string(), z.string().or(z.string().array()).optional())

export type LdapResponse = z.infer<typeof ldapResponseSchema>

export const GroupSchema = z.object({
  dn: z.string(),
  cn: ldapSingleValue,
  description: ldapSingleValue,
  member: ldapMultiValue.optional(),
})

export const OuSchema = z.object({
  dn: z.string(),
  ou: ldapSingleValue,
  name: ldapSingleValue,
  description: ldapSingleValue,
})

export const MemberResolveSchema = z.object({
  dn: z.string(),
  displayName: ldapSingleValue,
  cn: ldapSingleValue,
  sAMAccountName: ldapSingleValue,
})

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
  objectClass: ldapMultiValue,

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
  givenName: z.string().optional(),

  /**
   * Surname (sn)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  sn: z.string().optional(),

  /**
   * Display-Name (displayName)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  displayName: z.string().optional(),

  /**
   * Description (description)
   * Syntax: Unicode String | Single-Valued: FALSE
   * Note: Often treated as single-value in UI, but schema allows multiple.
   */
  description: ldapMultiValue.optional(),

  /**
   * Initials (initials)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  initials: z.string().optional(),

  // --- Account Control & Security ---

  /**
   * User-Principal-Name (userPrincipalName)
   * Syntax: Unicode String | Single-Valued: TRUE
   * Format: user@domain.com
   */
  userPrincipalName: z.string().email().optional(),

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
  accountExpires: z.string().optional(),

  /**
   * Password-Last-Set (pwdLastSet)
   * Syntax: Large Integer (Int64) | Single-Valued: TRUE
   */
  pwdLastSet: z.string().optional(),

  /**
   * Last-Logon (lastLogon)
   * Syntax: Large Integer (Int64) | Single-Valued: TRUE
   * Note: Not replicated across DCs.
   */
  lastLogon: z.string().optional(),

  /**
   * Bad-Password-Count (badPwdCount)
   * Syntax: Integer | Single-Valued: TRUE
   */
  badPwdCount: z.string().optional(),

  // --- Contact Information ---

  /**
   * Telephone-Number (telephoneNumber)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  telephoneNumber: z.string().optional(),

  /**
   * Mail (mail)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  mail: ldapMultiValue.optional(),

  /**
   * Proxy-Addresses (proxyAddresses)
   * Syntax: Unicode String | Single-Valued: FALSE
   * Used for Exchange email aliases (e.g.)
   */
  proxyAddresses: ldapMultiValue.optional(),

  /**
   * Mobile (mobile)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  mobile: z.string().optional(),

  /**
   * Physical-Delivery-Office-Name (physicalDeliveryOfficeName)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  physicalDeliveryOfficeName: z.string().optional(),

  // --- Organization ---

  /**
   * Title (title)
   * Syntax: Unicode String | Single-Valued: FALSE
   * Schema allows multiple titles, though typically used as single.
   */
  title: ldapMultiValue.optional(),

  /**
   * Department (department)
   * Syntax: Unicode String | Single-Valued: FALSE
   * Schema allows multiple departments.
   */
  department: ldapMultiValue.optional(),

  /**
   * Company (company)
   * Syntax: Unicode String | Single-Valued: FALSE
   */
  company: ldapMultiValue.optional(),

  /**
   * Manager (manager)
   * Syntax: Distinguished Name | Single-Valued: TRUE
   * Link to another object.
   */
  manager: z.string().optional(),

  /**
   * Employee-ID (employeeID)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  employeeID: z.string().optional(),

  /**
   * Member-Of (memberOf)
   * Syntax: Distinguished Name | Single-Valued: FALSE
   * Computed attribute (back-link) showing group membership.
   */
  memberOf: ldapMultiValue.optional(),

  // --- Location ---

  /**
   * Street-Address (streetAddress)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  streetAddress: z.string().optional(),

  /**
   * City / Locality (l)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  l: z.string().optional(),

  /**
   * State / Province (st)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  st: z.string().optional(),

  /**
   * Postal-Code (postalCode)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  postalCode: z.string().optional(),

  /**
   * Country-Code (c)
   * Syntax: Unicode String | Single-Valued: TRUE
   * 2-character ISO code (e.g., "US").
   */
  c: ldapMultiValue.optional(),

  // --- Profile & Script ---

  /**
   * Script-Path (scriptPath)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  scriptPath: z.string().optional(),

  /**
   * Profile-Path (profilePath)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  profilePath: z.string().optional(),

  /**
   * Home-Directory (homeDirectory)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  homeDirectory: z.string().optional(),

  /**
   * Home-Drive (homeDrive)
   * Syntax: Unicode String | Single-Valued: TRUE
   */
  homeDrive: z.string().optional(),

  // --- System Metadata ---

  /**
   * When-Created (whenCreated)
   * Syntax: Generalized Time | Single-Valued: TRUE
   */
  whenCreated: z.string().optional(),

  /**
   * When-Changed (whenChanged)
   * Syntax: Generalized Time | Single-Valued: TRUE
   */
  whenChanged: z.string().optional(),

  /**
   * Object-GUID (objectGUID)
   * Syntax: Octet String (UUID) | Single-Valued: TRUE
   */
  objectGUID: z.string().optional(),
  /**
   * wWWHomePage (Home page)
   * Syntax: String (Unicode) | Single-Valued: TRUE
   */
  wWWHomePage: ldapMultiValue.optional(),

  /**
   * ipPhone (telefone Ip)
   * Syntax: String (Unicode) | Single-Valued: TRUE
   */
  ipPhone: z.string().optional(),
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
