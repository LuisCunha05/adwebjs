import fs from 'fs'
import path from 'path'

import { AD_EXTRA_ATTRIBUTES, SCHEDULE_DATA_DIR } from '../constants/config'
import { DEFAULT_EDIT, DEFAULT_FETCH } from '../constants/ldap'
import type { ConfigFile, EditAttribute } from '../types/ldap'

const DATA_DIR = SCHEDULE_DATA_DIR
const CONFIG_PATH = path.join(DATA_DIR, 'ad-user-attributes.json')

/** Atributos adicionais do .env: AD_EXTRA_ATTRIBUTES=cpf,outro */
function extraFromEnv(): string[] {
  const s = AD_EXTRA_ATTRIBUTES
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

function loadConfig(): ConfigFile | null {
  if (!fs.existsSync(CONFIG_PATH)) return null
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
    return JSON.parse(raw || '{}') as ConfigFile
  } catch {
    return null
  }
}

/** Lista de atributos a solicitar no getUser (LDAP). */
export function getFetchAttributes(): string[] {
  const cfg = loadConfig()
  const extra = extraFromEnv()
  if (cfg?.fetch && Array.isArray(cfg.fetch)) {
    const set = new Set([...cfg.fetch, ...extra])
    return Array.from(set)
  }
  const extraFromFile = cfg?.extraFetch && Array.isArray(cfg.extraFetch) ? cfg.extraFetch : []
  const set = new Set([...DEFAULT_FETCH, ...extra, ...extraFromFile])
  return Array.from(set)
}

/** Lista de atributos editáveis com label e seção para o formulário. */
export function getEditConfig(): EditAttribute[] {
  const cfg = loadConfig()
  const extra = extraFromEnv()
  let edit: EditAttribute[] = []
  if (cfg?.edit && Array.isArray(cfg.edit)) {
    edit = [...cfg.edit]
  } else {
    edit = [...DEFAULT_EDIT]
    if (cfg?.extraEdit && Array.isArray(cfg.extraEdit)) {
      edit = edit.concat(cfg.extraEdit)
    }
  }
  const names = new Set(edit.map((e) => e.name))
  for (const name of extra) {
    if (!names.has(name)) {
      edit.push({ name, label: name, section: 'Outros' })
      names.add(name)
    }
  }
  return edit
}

/** Caminho do arquivo de config (para documentação ou UI). */
export function getConfigPath(): string {
  return CONFIG_PATH
}
