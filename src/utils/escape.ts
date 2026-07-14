/**
 * Escapes a string for use as a value in an LDAP Distinguished Name (DN).
 * Strictly follows RFC 4514 escaping rules.
 *
 * @param value The raw string to escape (e.g., "Doe, John")
 * @returns The safely escaped string (e.g., "Doe\, John")
 */
export function escapeDN(value: string): string {
  if (!value) return value

  // 1. Escape NUL bytes (Security precaution against byte poisoning)
  // NUL must be hex-escaped in LDAP.
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Function to escape DN in ldap
  let escaped = value.replace(/\x00/g, '\\00')

  // 2. Escape standard RFC 4514 special characters: , + " \ < > ; =
  escaped = escaped.replace(/([,+"\\<>;=])/g, '\\$1')

  // 3. Escape leading space or hash (#)
  // ^ targets the absolute start of the string.
  escaped = escaped.replace(/^([ #])/g, '\\$1')

  // 4. Escape trailing space
  // $ targets the absolute end of the string.
  escaped = escaped.replace(/ $/g, '\\ ')

  return escaped
}

export function encodeUnicodePwd(password: string): Buffer {
  // Wrap the password in double quotes and encode as UTF-16LE
  const quotedPassword = `"${password}"`
  return Buffer.from(quotedPassword, 'utf16le')
}
