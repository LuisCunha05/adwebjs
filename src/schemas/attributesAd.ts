import { z } from 'zod'

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
  description: z.array(z.string()).optional(),

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
  userAccountControl: z.number().int().optional(),

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
  badPwdCount: z.number().int().optional(),

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
  mail: z.string().email().optional(),

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
  title: z.array(z.string()).optional(),

  /**
   * Department (department)
   * Syntax: Unicode String | Single-Valued: FALSE
   * Schema allows multiple departments.
   */
  department: z.array(z.string()).optional(),

  /**
   * Company (company)
   * Syntax: Unicode String | Single-Valued: FALSE
   */
  company: z.array(z.string()).optional(),

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
  memberOf: z.array(z.string()).optional(),

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
  c: z.string().length(2).optional(),

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
  wWWHomePage: z.string().min(1).max(2048).optional(),
  
  /**
   * ipPhone (telefone Ip)
   * Syntax: String (Unicode) | Single-Valued: TRUE
   */
  ipPhone: z.string().optional()
})

export type ActiveDirectoryUser = z.infer<typeof ActiveDirectoryUserSchema>
