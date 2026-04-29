import type { Client } from 'ldapts'
import type { UnauthorizedError } from './error'
import type { Result } from './utils'

export type ILdapService = {
  getClient(): Client
  getAdminClient(): Promise<Client>
  getUserClient(userDn: string, password: string): Promise<Result<null, UnauthorizedError>>
}

export interface ConfigFile {
  fetch?: string[]
  edit?: EditAttribute[]
  /** Atributos extras só para fetch (ex.: cpf). Serão incluídos no fetch e em edit em "Outros" com label = nome. */
  extraFetch?: string[]
  /** Atributos customizados para edição (ex.: { name: "cpf", label: "CPF", section: "Documentos" }). */
  extraEdit?: EditAttribute[]
}
export interface EditAttribute {
  name: string
  label: string
  section: string
}
