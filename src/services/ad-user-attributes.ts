import fs from 'fs';
import path from 'path';

import { SCHEDULE_DATA_DIR, AD_EXTRA_ATTRIBUTES } from '../config';

const DATA_DIR = SCHEDULE_DATA_DIR;
const CONFIG_PATH = path.join(DATA_DIR, 'ad-user-attributes.json');

export interface EditAttribute {
    name: string;
    label: string;
    section: string;
}

const DEFAULT_FETCH = [
    'dn', 'sAMAccountName', 'userPrincipalName', 'cn', 'mail', 'memberOf', 'telephoneNumber', 'mobile',
    'description', 'givenName', 'sn', 'displayName', 'userAccountControl', 'title', 'department', 'company',
    'physicalDeliveryOfficeName', 'streetAddress', 'l', 'st', 'co', 'postalCode', 'manager', 'employeeID',
    'employeeNumber', 'ipPhone', 'wWWHomePage', 'pwdLastSet', 'whenCreated', 'whenChanged',
];

const DEFAULT_EDIT: EditAttribute[] = [
    { name: 'cn', label: 'Nome comum (cn)', section: 'Identidade' },
    { name: 'givenName', label: 'Nome (givenName)', section: 'Identidade' },
    { name: 'sn', label: 'Sobrenome (sn)', section: 'Identidade' },
    { name: 'displayName', label: 'Nome de exibição', section: 'Identidade' },
    { name: 'mail', label: 'E-mail', section: 'Contato' },
    { name: 'telephoneNumber', label: 'Telefone', section: 'Contato' },
    { name: 'mobile', label: 'Celular', section: 'Contato' },
    { name: 'description', label: 'Descrição', section: 'Contato' },
    { name: 'title', label: 'Cargo (title)', section: 'Organização' },
    { name: 'department', label: 'Departamento', section: 'Organização' },
    { name: 'company', label: 'Empresa (company)', section: 'Organização' },
    { name: 'physicalDeliveryOfficeName', label: 'Escritório / Local', section: 'Endereço' },
    { name: 'streetAddress', label: 'Endereço', section: 'Endereço' },
    { name: 'l', label: 'Cidade (l)', section: 'Endereço' },
    { name: 'st', label: 'Estado (st)', section: 'Endereço' },
    { name: 'co', label: 'País (co)', section: 'Endereço' },
    { name: 'postalCode', label: 'CEP', section: 'Endereço' },
    { name: 'employeeID', label: 'Matrícula (employeeID)', section: 'Outros' },
    { name: 'employeeNumber', label: 'Número do funcionário', section: 'Outros' },
    { name: 'ipPhone', label: 'Telefone IP', section: 'Outros' },
    { name: 'wWWHomePage', label: 'Página inicial (URL)', section: 'Outros' },
];

/** Atributos adicionais do .env: AD_EXTRA_ATTRIBUTES=cpf,outro */
function extraFromEnv(): string[] {
    const s = AD_EXTRA_ATTRIBUTES;
    return s.split(',').map((x) => x.trim()).filter(Boolean);
}

interface ConfigFile {
    fetch?: string[];
    edit?: EditAttribute[];
    /** Atributos extras só para fetch (ex.: cpf). Serão incluídos no fetch e em edit em "Outros" com label = nome. */
    extraFetch?: string[];
    /** Atributos customizados para edição (ex.: { name: "cpf", label: "CPF", section: "Documentos" }). */
    extraEdit?: EditAttribute[];
}

function loadConfig(): ConfigFile | null {
    if (!fs.existsSync(CONFIG_PATH)) return null;
    try {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        return JSON.parse(raw || '{}') as ConfigFile;
    } catch {
        return null;
    }
}

/** Lista de atributos a solicitar no getUser (LDAP). */
export function getFetchAttributes(): string[] {
    const cfg = loadConfig();
    const extra = extraFromEnv();
    if (cfg?.fetch && Array.isArray(cfg.fetch)) {
        const set = new Set([...cfg.fetch, ...extra]);
        return Array.from(set);
    }
    const extraFromFile = cfg?.extraFetch && Array.isArray(cfg.extraFetch) ? cfg.extraFetch : [];
    const set = new Set([...DEFAULT_FETCH, ...extra, ...extraFromFile]);
    return Array.from(set);
}

/** Lista de atributos editáveis com label e seção para o formulário. */
export function getEditConfig(): EditAttribute[] {
    const cfg = loadConfig();
    const extra = extraFromEnv();
    let edit: EditAttribute[] = [];
    if (cfg?.edit && Array.isArray(cfg.edit)) {
        edit = [...cfg.edit];
    } else {
        edit = [...DEFAULT_EDIT];
        if (cfg?.extraEdit && Array.isArray(cfg.extraEdit)) {
            edit = edit.concat(cfg.extraEdit);
        }
    }
    const names = new Set(edit.map((e) => e.name));
    for (const name of extra) {
        if (!names.has(name)) {
            edit.push({ name, label: name, section: 'Outros' });
            names.add(name);
        }
    }
    return edit;
}

/** Caminho do arquivo de config (para documentação ou UI). */
export function getConfigPath(): string {
    return CONFIG_PATH;
}
