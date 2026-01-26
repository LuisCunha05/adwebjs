# AD Web Manager

Aplicação web para gerenciamento de **usuários**, **grupos** e **unidades organizacionais (OUs)** do Active Directory via LDAP/LDAPS. Inclui autenticação por credenciais AD, auditoria, agendamento de férias (desativar/reativar contas automaticamente), atributos configuráveis e modo escuro.

Permite buscar e filtrar usuários por OU e grupo, mover contas entre OUs sem desativar, exportar listas em CSV, agendar férias com execução automática, e restringir a exclusão de usuários a um grupo LDAP opcional. A interface é responsiva e suporta tema claro, escuro e sistema.

### Stack e versões

| Camada | Tecnologia |
|--------|------------|
| Backend | Node.js 18+, Express 5, TypeScript, ldapts |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, Radix UI, next-themes |
| Persistência | Arquivos JSON em disco (agendamentos, auditoria, atributos) |

---

## Índice

- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Executando a aplicação](#executando-a-aplicação)
- [Uso](#uso)
- [Fluxos de uso (passo a passo)](#fluxos-de-uso-passo-a-passo)
- [Atributos do AD (configuráveis)](#atributos-do-ad-configuráveis)
- [Permissões e grupos LDAP](#permissões-e-grupos-ldap)
- [Referência da API](#referência-da-api)
- [Exemplos de requisições (cURL)](#exemplos-de-requisições-curl)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Estrutura do frontend](#estrutura-do-frontend)
- [Dados em disco e agendamentos](#dados-em-disco-e-agendamentos)
- [Formato dos arquivos de dados](#formato-dos-arquivos-de-dados)
- [Auditoria](#auditoria)
- [Exportação CSV](#exportação-csv)
- [Alertas na dashboard](#alertas-na-dashboard)
- [Modo escuro](#modo-escuro)
- [Solução de problemas](#solução-de-problemas)
- [Perguntas frequentes (FAQ)](#perguntas-frequentes-faq)
- [Segurança](#segurança)
- [Licença](#licença)

---

## Funcionalidades

### Autenticação
- Login com credenciais do Active Directory (usuário e senha).
- Fluxo: bind do serviço → busca do usuário → bind do usuário para validar senha.
- Acesso à aplicação restrito a membros do grupo configurado em `LDAP_GROUP_REQUIRED`.
- Sessão em cookie HTTP-only; logout encerra a sessão.

### Dashboard (Início)
- Cards com totais: **usuários**, **contas desativadas** e **grupos** no diretório.
- **Alertas**: quando vários usuários forem desativados em pouco tempo (nas últimas 24h), um aviso é exibido com link para os logs de auditoria.
- Atalhos para Usuários, Grupos e OUs.

### Usuários
- **Pesquisa avançada**: termo + tipo (usuário, e-mail, matrícula, nome, sobrenome).
- **Filtros**: por OU, por grupo (memberOf) e “apenas desativados”.
- **Exportar CSV**: download da lista de resultados (usuário, nome, e-mail, status).
- **Criar usuário**: apenas OU de destino, nome de logon (sAMAccountName) e senha inicial; demais atributos são preenchidos na edição.
- **Editar usuário**: formulário dinâmico por seção, conforme atributos configurados (identidade, contato, organização, endereço, etc.).
- **Unidade organizacional**: exibe a OU atual e permite **mover o usuário** para outra OU (sem desativar).
- **Ações**: ativar / desativar conta, desbloquear, redefinir senha, excluir (quando permitido).
- **Excluir usuário**: permitido somente para quem pertence ao grupo em `LDAP_GROUP_DELETE` (opcional).
- **Grupos do usuário**: lista de grupos dos quais é membro, com opção de remover.

### Grupos
- Pesquisa e listagem de grupos.
- Edição de nome, descrição e lista de membros (DNs).
- Resolução de DNs para exibir nome/usuário quando possível.
- Adicionar e remover membros.

### OUs (Unidades organizacionais)
- Listagem de OUs do domínio (DN, nome).
- Utilizada como base para criação de usuários, movimentação entre OUs e filtros de busca.

### Agendamentos (férias)
- Agendar **férias**: informar usuário e datas de ida/volta; a conta é **desativada** na data de ida e **reativada** na data de volta.
- Lista de agendamentos futuros com opção de cancelar.
- **Exportar férias (CSV)**: arquivo no formato `usuário,data_inicial,data_final`.

### Logs de auditoria
- Histórico de ações (criar/editar/desativar/excluir usuários, mover, redefinir senha, alterar grupos, agendar férias, etc.).
- Filtros por período, ação, ator e alvo.
- Limite de 50.000 entradas; as mais antigas são descartadas.

### Interface
- **Modo escuro**: alternância entre claro, escuro e sistema (sidebar).
- Layout responsivo com sidebar fixa e páginas em português.

---

## Arquitetura

- **Backend**: API REST em **Node.js** com **Express** e **TypeScript**, montada em `src/`. Sessão via `express-session` (cookie); CORS configurado para `FRONTEND_URL`; redirecionamento de acessos HTML à porta da API para o frontend.
- **Frontend**: aplicação **Next.js 16** (App Router) em `web/`, com React 19, Tailwind CSS e componentes Radix UI. Cliente da API em `src/lib/api.ts`; chamadas são feitas para `/api/*` no mesmo origem do navegador.
- **Comunicação**: o navegador acessa apenas o Next.js. O Next encaminha todas as requisições `/api/*` para a API (via rota de proxy em `app/api/[[...path]]/route.ts` e `API_URL`). Cookies de sessão são enviados com `credentials: 'include'`.
- **Persistência**: arquivos JSON em disco para agendamentos, auditoria e, opcionalmente, configuração de atributos do AD (diretório definido por `SCHEDULE_DATA_DIR` ou `data/`).
- **Job de agendamento**: na subida da API, `scheduleService.startRunner(60_000)` inicia um setInterval de 60s que processa ações vencidas em `scheduled-actions.json`, chama o LDAP (disable/enable) e registra em auditoria.

---

## Requisitos

- **Node.js** 18+ (recomendado 20+).
- **Active Directory** acessível por LDAP ou LDAPS.
- **Conta de serviço** no AD com permissões de leitura/gravação nas OUs que serão gerenciadas (`LDAP_ADMIN_DN` / `LDAP_ADMIN_PASSWORD`).
- **Grupo no AD** usado para autorizar acesso à aplicação (ex.: `LDAP_GROUP_REQUIRED`). O admin da aplicação é definido pelo grupo cujo CN contém `ADWEB-Admin` (configurado no código da rota de login).

---

## Instalação

1. **Clonar o repositório**
   ```bash
   git clone https://github.com/Tiozao-do-Linux/adwebjs.git
   cd adwebjs
   ```

2. **Dependências da API (raiz)**
   ```bash
   npm install
   ```

3. **Dependências do frontend**
   ```bash
   cd web && npm install && cd ..
   ```

4. **Variáveis de ambiente**  
   Copiar o exemplo e editar conforme o ambiente:
   ```bash
   cp env.example .env
   # editar .env com suas URLs, credenciais e grupos
   ```

---

## Configuração

### Variáveis de ambiente

Crie um arquivo `.env` na **raiz do projeto** (onde está `package.json`). Use o `env.example` como base.

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `PORT` | Não | Porta da API (padrão: `3000`). Em dev costuma-se usar `3001`. |
| `FRONTEND_PORT` | Não | Porta do Next.js em dev (padrão: `3000`). |
| `API_URL` | Sim (front) | URL da API usada pelo proxy do Next, ex.: `http://127.0.0.1:3001`. |
| `FRONTEND_URL` | Não | URL do frontend; usada em redirects e CORS (ex.: `http://127.0.0.1:3000`). |
| `SESSION_SECRET` | Sim | Chave para assinatura da sessão; use um valor longo e aleatório. |
| `LDAP_URL` | Sim | URL do LDAP/LDAPS, ex.: `ldaps://dc.empresa.com`. |
| `LDAP_BASE_DN` | Sim | DN base de busca, ex.: `DC=empresa,DC=com,DC=br`. |
| `LDAP_DOMAIN` | Não | Sufixo do domínio (ex.: `empresa.com.br`) para UPN/fallback. |
| `LDAP_ADMIN_DN` | Sim | UPN ou DN da conta de serviço, ex.: `admin@empresa.com.br`. |
| `LDAP_ADMIN_PASSWORD` | Sim | Senha da conta de serviço. |
| `LDAP_GROUP_REQUIRED` | Sim | DN do grupo cujos membros podem **acessar** a aplicação (ex.: `CN=ADWEB-Admin,CN=Users,DC=empresa,DC=com,DC=br`). |
| `LDAP_GROUP_DELETE` | Não | DN do grupo cujos membros podem **excluir usuários**. Se não definido, ninguém pode excluir. |
| `LDAP_DEBUG` | Não | Se `true`, emite logs “LDAP Debug” no console (útil para troubleshooting). |
| `SCHEDULE_DATA_DIR` | Não | Pasta dos JSONs de agendamento, auditoria e atributos. Caminho absoluto ou relativo ao cwd. Padrão: `data/`. |
| `AD_EXTRA_ATTRIBUTES` | Não | Lista de atributos extras do AD (ex.: `cpf,outro`) para buscar e editar; entram na lista padrão. |

### Pasta de dados

Por padrão são usados o diretório `data/` na raiz e, dentro dele:

- `scheduled-actions.json` — agendamentos de férias
- `audit-log.json` — log de auditoria
- `ad-user-attributes.json` — (opcional) configuração de atributos do AD

Para mudar o diretório, defina `SCHEDULE_DATA_DIR` no `.env` (ex.: `SCHEDULE_DATA_DIR=/var/lib/adweb` ou `SCHEDULE_DATA_DIR=data`).

---

## Executando a aplicação

### Desenvolvimento (API + frontend)

Na raiz do projeto:

```bash
npm run dev
```

- API: porta em `PORT` (ex.: 3001).
- Frontend: porta em `FRONTEND_PORT` (ex.: 3000).

Acesse o frontend em `http://localhost:3000` (ou a URL definida em `FRONTEND_URL`). O Next encaminha `/api/*` para a API. O comando `npm run dev` usa `env-cmd -f .env` e repassa `API_URL` e `FRONTEND_PORT` ao processo do Next.

### Apenas a API

```bash
npm start
# ou
npm run dev:api
```

A API usa a porta definida em `PORT`. O frontend precisa ser iniciado à parte (`cd web && npm run dev`) com `API_URL` apontando para essa porta.

### Build de produção

**API**
```bash
npm run build
npm run serve
# ou, com tsx: npm start
```

**Frontend**
```bash
cd web
npm run build
npm run start
```

Em produção, o frontend deve ser servido por um reverse proxy (nginx, Caddy, etc.) que:
- sirva o Next em um host/porta;
- encaminhe `/api` para a API (ou use o proxy do Next, apontando `API_URL` para a API).

**Checklist de deploy:** use **HTTPS** e **LDAPS**; defina `SESSION_SECRET` forte e único; deixe `SCHEDULE_DATA_DIR` em um volume persistente; restrinja acesso à API (firewall ou VPN); não exponha o `.env`.

### Scripts npm (raiz do projeto)

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Sobe API e frontend juntos (concurrently); usa `env-cmd -f .env`. |
| `npm run dev:api` | Só a API com tsx (hot reload implícito pelo tsx). |
| `npm run dev:web` | Só o Next.js; usa `PORT`/`FRONTEND_PORT` e `API_URL` do ambiente. |
| `npm start` | Sobe apenas a API (`tsx src/app.ts`). |
| `npm run build` | Compila TypeScript da API para `dist/`. |
| `npm run serve` | Roda a API compilada (`node dist/app.js`). |

---

## Uso

### Login
1. Acesse a URL do frontend.
2. Informe **usuário** e **senha** do AD (UPN ou sAMAccountName).
3. Quem não for membro do grupo em `LDAP_GROUP_REQUIRED` não consegue acessar.
4. Quem for considerado “admin” (grupo com `ADWEB-Admin` no CN) vê o menu completo (Usuários, Grupos, OUs, Agendamentos, Logs).

### Dashboard
- Mostra totais de usuários, desativados e grupos.
- Exibe alerta quando várias contas forem desativadas nas últimas 24h, com link para os logs de auditoria.

### Usuários
- **Busca**: digite um termo, escolha “buscar por” (usuário, e-mail, matrícula, etc.) e use os filtros opcionais (OU, grupo, “apenas desativados”).
- **Exportar CSV**: com resultados na tela, use o botão para baixar a lista em CSV.
- **Novo usuário**: informe OU, nome de logon e senha; depois edite o usuário para preencher os demais atributos.
- **Editar**: altere atributos nas seções exibidas; use “Mover para outra OU” quando necessário; ative/desative, desbloqueie, redefina senha. O botão “Excluir” só aparece para quem pertence ao grupo em `LDAP_GROUP_DELETE`.

### Grupos
- Pesquise o grupo, abra para editar e altere nome, descrição ou lista de membros (DNs). Dá para adicionar/remover membros pela interface.

### OUs
- Apenas listagem; usada como referência em usuários (criação, mover) e filtros.

### Agendamentos
- Informe o usuário e as datas de ida e volta para criar um agendamento de férias (desativa na ida, reativa na volta).
- Cancele agendamentos pela lista.
- Use “Exportar férias (CSV)” para obter o arquivo `usuário,data_inicial,data_final`.

### Logs de auditoria
- Consulte o histórico por período, tipo de ação, ator e alvo.
- Use os alertas da dashboard para ir direto aos eventos de desativação em massa.

---

## Fluxos de uso (passo a passo)

### Criar um usuário
1. **Usuários** → **Novo usuário**.
2. Selecione a **OU de destino** (obrigatório).
3. Informe **nome de logon** (sAMAccountName) e **senha inicial**.
4. Opcional: preencha outros campos (nome, e-mail, etc.) se o formulário de criação permitir.
5. Salve. O usuário é criado no AD.
6. Abra o usuário em **Editar** para preencher demais atributos (identidade, contato, organização, endereço, etc.).

### Mover usuário de OU (sem desativar)
1. **Usuários** → busque o usuário → **Editar**.
2. No card **Unidade organizacional**, veja a OU atual.
3. Clique em **Mover para outra OU**, escolha a **OU de destino** e confirme.
4. O usuário passa a pertencer à nova OU; a ação é registrada em auditoria como `user.move`.

### Desativar conta (opcional: mover para outra OU)
1. Na edição do usuário, use **Desativar conta**.
2. Se a interface oferecer, você pode informar uma **OU de destino** para onde o usuário será movido ao desativar (depende da implementação no backend).

### Agendar férias
1. **Agendamentos** → preencha **usuário** (sAMAccountName ou identificador usado pela busca), **data de ida** e **data de volta**.
2. Confirme. São criadas duas ações: desativar na data de ida e reativar na data de volta.
3. O job da API (a cada 60 segundos) executa as ações vencidas e registra `vacation.execute_disable` e `vacation.execute_enable` em auditoria.
4. Para cancelar, use a opção de remover o agendamento na lista.

### Excluir usuário
1. Só é permitido se você pertence ao grupo em `LDAP_GROUP_DELETE` e é admin.
2. Na edição do usuário, o botão **Excluir usuário** só aparece nesse caso.
3. A exclusão é definitiva no AD e registrada como `user.delete`.

---

## Atributos do AD (configuráveis)

Os atributos que a aplicação **busca** e **edita** nos usuários podem ser ampliados ou customizados de duas formas.

### 1. Variável `AD_EXTRA_ATTRIBUTES`

No `.env`:

```env
AD_EXTRA_ATTRIBUTES=cpf,outro
```

Esses nomes são acrescentados à lista padrão de atributos na busca e no formulário de edição (seção “Outros”, com label igual ao nome do atributo).

### 2. Arquivo `ad-user-attributes.json`

Coloque o arquivo no diretório de dados (ex.: `data/ad-user-attributes.json` ou no caminho de `SCHEDULE_DATA_DIR`). Ele aceita:

- **`extraFetch`**: array de nomes de atributos extras a buscar no AD.
- **`extraEdit`**: array de `{ "name": "atributo", "label": "Rótulo", "section": "Nome da seção" }` para o formulário de edição.

Exemplo (copie de `data/ad-user-attributes.example.json`):

```json
{
  "extraFetch": ["cpf"],
  "extraEdit": [
    { "name": "cpf", "label": "CPF", "section": "Documentos" }
  ]
}
```

Também é possível substituir totalmente as listas com **`fetch`** e **`edit`** no mesmo JSON. A API `GET /api/config/user-attributes` (admin) retorna a configuração efetiva (`fetch` e `edit`) usada pelo frontend.

Os atributos padrão de **busca** incluem, entre outros: `dn`, `sAMAccountName`, `userPrincipalName`, `cn`, `mail`, `memberOf`, `userAccountControl`, `givenName`, `sn`, `displayName`, `title`, `department`, `company`, `physicalDeliveryOfficeName`, `streetAddress`, `l`, `st`, `co`, `postalCode`, `manager`, `employeeID`, `employeeNumber`, `telephoneNumber`, `mobile`, `ipPhone`, `wWWHomePage`, `pwdLastSet`, `whenCreated`, `whenChanged`. Os padrão de **edição** estão organizados em seções como Identidade, Contato, Organização, Endereço e Outros.

---

## Permissões e grupos LDAP

- **Acesso à aplicação**: apenas usuários que pertencem ao grupo cujo DN está em `LDAP_GROUP_REQUIRED` conseguem fazer login e usar o sistema.
- **Admin (menu completo)**: determinado no código pelo grupo cujo CN contém `ADWEB-Admin`. Esse grupo costuma ser o mesmo de `LDAP_GROUP_REQUIRED` ou um subgrupo.
- **Excluir usuário**: só é permitido para quem é **admin** e pertence ao grupo em `LDAP_GROUP_DELETE`. Se `LDAP_GROUP_DELETE` não for definido, ninguém pode excluir usuários.

Resumo:
- `LDAP_GROUP_REQUIRED` → quem pode acessar.
- Grupo com `ADWEB-Admin` no CN → quem é admin.
- `LDAP_GROUP_DELETE` → quem pode excluir usuários (além de ser admin).

---

## Referência da API

Todas as rotas abaixo estão sob o prefixo **`/api`**. Ex.: `POST /api/auth/login`.  
Exceto login/logout e `GET /auth/me`, as rotas exigem autenticação; a maioria exige **admin**.

### Autenticação
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/login` | Login com `username` e `password` (body JSON). |
| POST | `/auth/logout` | Encerra a sessão. |
| GET | `/auth/me` | Retorna usuário da sessão, `isAdmin` e `canDelete`. |

### Configuração (admin)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/config/user-attributes` | Retorna `{ fetch, edit }` dos atributos do AD. |

### Usuários (admin)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/users` | Pesquisa: `q`, `searchBy`, `ou`, `memberOf`, `disabledOnly` (query). |
| POST | `/users` | Cria usuário: `parentOuDn`, `sAMAccountName`, `password` (body). |
| GET | `/users/:id` | Detalhes do usuário. |
| PATCH | `/users/:id` | Atualiza atributos (body). |
| POST | `/users/:id/move` | Move usuário para outra OU: body `{ targetOuDn }`. |
| POST | `/users/:id/disable` | Desativa; opcional body `{ targetOu }` para mover. |
| POST | `/users/:id/enable` | Ativa conta. |
| POST | `/users/:id/unlock` | Desbloqueia conta. |
| POST | `/users/:id/reset-password` | body `{ newPassword }`. |
| DELETE | `/users/:id` | Exclui usuário (requer `canDelete`). |

### Estatísticas e OUs (admin)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/stats` | `{ usersCount, disabledCount, groupsCount }`. |
| GET | `/ous` | Lista de OUs. |

### Agendamentos (admin)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/schedule` | Lista de agendamentos futuros. |
| POST | `/schedule/vacation` | Cria férias: body `{ userId, startDate, endDate }`. |
| DELETE | `/schedule/:id` | Remove um agendamento. |

### Grupos (admin)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/groups` | Pesquisa: `q` (query). |
| GET | `/groups/:id` | Detalhes do grupo. |
| PATCH | `/groups/:id` | Atualiza `name`, `description`, `member` (body). |
| GET | `/groups/:id/members/resolved` | Membros com DNs resolvidos. |
| POST | `/groups/:id/members/add` | body `{ dn }`. |
| POST | `/groups/:id/members/remove` | body `{ dn }`. |

### Auditoria (admin)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/audit-logs` | Query: `since`, `until`, `action`, `actor`, `target`, `limit`. |

#### Parâmetros de query e body (resumo)

- **GET /users**: `q` (string), `searchBy` (ex.: `sAMAccountName`, `mail`, `employeeID`, `givenName`, `sn`), `ou` (DN da OU), `memberOf` (DN do grupo), `disabledOnly` (`true`/`1` para só desativados).
- **POST /users**: body `{ parentOuDn, sAMAccountName, password }`; opcionais: `userPrincipalName`, `cn`, `givenName`, `sn`, `displayName`, `mail`, etc.
- **POST /users/:id/move**: body `{ targetOuDn }` (DN da OU de destino).
- **POST /users/:id/disable**: body opcional `{ targetOu }` para mover ao desativar.
- **POST /users/:id/reset-password**: body `{ newPassword }`.
- **GET /audit-logs**: `since`, `until` (ISO 8601), `action`, `actor`, `target`, `limit` (número).
- **POST /schedule/vacation**: body `{ userId, startDate, endDate }` (datas em ISO ou `YYYY-MM-DD`).

---

## Exemplos de requisições (cURL)

Substitua `BASE` pela URL da API (ex.: `http://127.0.0.1:3001`) e use `-c cookies.txt -b cookies.txt` para manter sessão entre chamadas.

**Login**
```bash
curl -c cookies.txt -X POST "$BASE/api/auth/login" -H "Content-Type: application/json" \
  -d '{"username":"seu.usuario","password":"sua_senha"}'
# Resposta: { "user": { ... }, "isAdmin": true, "canDelete": false }
```

**Quem está logado**
```bash
curl -b cookies.txt "$BASE/api/auth/me"
```

**Pesquisar usuários** (com filtros)
```bash
curl -b cookies.txt "$BASE/api/users?q=joao&searchBy=sAMAccountName&ou=OU=TI,DC=empresa,DC=local&disabledOnly=false"
```

**Mover usuário para outra OU**
```bash
curl -b cookies.txt -X POST "$BASE/api/users/joao.silva/move" -H "Content-Type: application/json" \
  -d '{"targetOuDn":"OU=Ex-Funcionarios,DC=empresa,DC=local"}'
```

**Criar agendamento de férias**
```bash
curl -b cookies.txt -X POST "$BASE/api/schedule/vacation" -H "Content-Type: application/json" \
  -d '{"userId":"maria","startDate":"2026-02-01","endDate":"2026-02-15"}'
# Resposta: { "ok": true, "disableId": "...", "enableId": "..." }
```

**Listar logs de auditoria** (desativações nas últimas 24h)
```bash
since=$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S.000Z 2>/dev/null || date -u -v-24H +%Y-%m-%dT%H:%M:%S.000Z)
curl -b cookies.txt "$BASE/api/audit-logs?action=user.disable&since=$since&limit=200"
```

---

## Estrutura do projeto

```
adwebjs/
├── .env                    # Variáveis de ambiente (não versionado)
├── env.example             # Exemplo de .env
├── package.json            # Scripts e deps da API
├── tsconfig.json
├── src/
│   ├── app.ts              # Express, sessão, CORS, montagem das rotas
│   ├── routes/
│   │   └── api.ts          # Rotas REST sob /api
│   └── services/
│       ├── ldap.ts         # LDAP (auth, users, groups, OUs, move)
│       ├── audit.ts        # Log de auditoria em JSON
│       ├── schedule.ts     # Agendamentos de férias em JSON
│       └── ad-user-attributes.ts  # Config de atributos do AD
├── data/                   # Dir. de dados (ou SCHEDULE_DATA_DIR)
│   ├── scheduled-actions.json
│   ├── audit-log.json
│   ├── ad-user-attributes.json    # opcional
│   └── ad-user-attributes.example.json
└── web/                    # Frontend Next.js
    ├── package.json
    ├── next.config.ts
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── login/
        │   ├── (app)/      # Rotas após login (dashboard, users, groups, etc.)
        │   └── api/        # Proxy e rota explícita /api/users/[id]/move
        ├── components/     # Auth, theme, ui
        └── lib/
            └── api.ts     # Cliente HTTP da API
```

---

## Estrutura do frontend

O frontend fica em `web/` e usa o App Router do Next.js.

| Pasta / arquivo | Descrição |
|-----------------|-----------|
| `src/app/layout.tsx` | Layout raiz; ThemeProvider e AuthProvider. |
| `src/app/login/page.tsx` | Página de login. |
| `src/app/(app)/layout.tsx` | Layout após login: sidebar, tema, menu (Usuários, Grupos, OUs, Agendamentos, Logs). |
| `src/app/(app)/page.tsx` | Dashboard: totais, alertas de desativações recentes, atalhos. |
| `src/app/(app)/users/page.tsx` | Lista de usuários: busca, filtros (OU, grupo, desativados), exportar CSV. |
| `src/app/(app)/users/new/page.tsx` | Criação de usuário. |
| `src/app/(app)/users/[id]/edit/page.tsx` | Edição: atributos, mover OU, ativar/desativar, excluir (se canDelete). |
| `src/app/(app)/groups/page.tsx` | Grupos: busca e lista. |
| `src/app/(app)/groups/[id]/edit/page.tsx` | Edição de grupo (nome, descrição, membros). |
| `src/app/(app)/ous/page.tsx` | Lista de OUs. |
| `src/app/(app)/schedule/page.tsx` | Agendamentos de férias; exportar férias em CSV. |
| `src/app/(app)/audit/page.tsx` | Logs de auditoria com filtros. |
| `src/app/api/[[...path]]/route.ts` | Proxy de `/api/*` para a API (com cookies). |
| `src/app/api/users/[id]/move/route.ts` | Rota explícita para `POST /api/users/:id/move` (evita 404). |
| `src/components/` | auth-provider, theme-provider, login-form, ui (Radix + Tailwind). |
| `src/lib/api.ts` | Cliente HTTP: auth, users, groups, ous, schedule, stats, audit. |

---

## Dados em disco e agendamentos

- **`scheduled-actions.json`**: lista de ações futuras (desativar/ativar por usuário e data). O serviço de agendamento verifica periodicamente (ex.: a cada 60s) e executa as ações vencidas, chamando o LDAP e registrando em auditoria.
- **`audit-log.json`**: append de eventos de auditoria; mantidos apenas os últimos 50.000.
- **`ad-user-attributes.json`**: lido na inicialização e nas chamadas de atributos; não é obrigatório.

O diretório é criado automaticamente se não existir. Em ambientes multi-instância, use `SCHEDULE_DATA_DIR` em um volume compartilhado ou garanta que apenas uma instância escreva nesses arquivos.

---

## Formato dos arquivos de dados

### scheduled-actions.json

Lista de ações agendadas. Cada item:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string | Identificador único (ex.: `disable-v-usuario-2026-02-01-2026-02-15-...`). |
| `type` | `"disable"` \| `"enable"` | Desativar ou reativar a conta. |
| `userId` | string | sAMAccountName (ou identificador do usuário). |
| `runAt` | string | Data/hora de execução em ISO 8601. |
| `createdAt` | string | Data de criação em ISO 8601. |
| `meta` | objeto | Opcional: `vacationId`, `startDate`, `endDate`, `description`. |

Exemplo:
```json
[
  {
    "id": "disable-v-joao-2026-02-01-2026-02-15-1737890123456",
    "type": "disable",
    "userId": "joao",
    "runAt": "2026-02-01T00:00:00.000Z",
    "createdAt": "2026-01-26T12:00:00.000Z",
    "meta": { "vacationId": "v-joao-2026-02-01-2026-02-15-...", "startDate": "2026-02-01", "endDate": "2026-02-15", "description": "Férias joao" }
  }
]
```

### audit-log.json

Array de eventos de auditoria. Cada entrada:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | string | Ex.: `audit-1769458569231-9sdc6h1t`. |
| `at` | string | Data/hora em ISO 8601. |
| `action` | string | Nome da ação (ver tabela abaixo). |
| `actor` | string | sAMAccountName de quem executou ou `"system"`. |
| `target` | string | Alvo (usuário, grupo, etc.). |
| `details` | objeto | Dados adicionais (opcional). |
| `success` | boolean | Se a operação teve sucesso. |
| `error` | string | Mensagem de erro quando `success === false`. |

---

## Auditoria

Cada ação relevante gera um registro com: `id`, `at`, `action`, `actor`, `target`, `details`, `success`, `error` (em caso de falha).

### Tabela de ações registradas

| Ação | Descrição |
|------|-----------|
| `user.create` | Criação de usuário no AD. |
| `user.update` | Atualização de atributos. |
| `user.disable` | Conta desativada. |
| `user.enable` | Conta reativada. |
| `user.move` | Usuário movido para outra OU. |
| `user.reset_password` | Senha redefinida. |
| `user.delete` | Usuário excluído do AD. |
| `user.unlock` | Conta desbloqueada. |
| `group.update` | Grupo alterado (nome, descrição, etc.). |
| `group.member_add` | Membro adicionado ao grupo. |
| `group.member_remove` | Membro removido do grupo. |
| `vacation.schedule` | Agendamento de férias criado. |
| `vacation.cancel` | Agendamento de férias cancelado. |
| `vacation.execute_disable` | Execução automática: conta desativada (férias). |
| `vacation.execute_enable` | Execução automática: conta reativada (férias). |

A dashboard usa o log para detectar “vários usuários desativados recentemente” (ações `user.disable` nas últimas 24h ≥ 5) e exibir o alerta com link para `/audit`.

---

## Exportação CSV

- **Usuários**: na tela de usuários, após uma busca, o botão “Exportar CSV” gera um arquivo com colunas `usuário`, `nome_completo`, `email`, `status` (encoding UTF-8 com BOM).
- **Férias**: em Agendamentos, o botão “Exportar férias (CSV)” gera um arquivo no formato `usuário,data_inicial,data_final`, uma linha por agendamento de férias.

---

## Alertas na dashboard

- O sistema verifica no log de auditoria quantas ações **user.disable** ocorreram nas **últimas 24 horas**.
- Se o número for **≥ 5**, é exibido um alerta: “Vários usuários desativados recentemente” e um link para a página de logs de auditoria.

Não há alerta baseado no total de contas desativadas no AD, apenas no volume de desativações recentes.

---

## Modo escuro

- Na barra lateral (sidebar), acima do nome do usuário, há um botão que alterna entre **Claro**, **Escuro** e **Sistema**.
- A preferência é persistida pelo `next-themes` e o tema do sistema é respeitado quando “Sistema” está ativo.
- O frontend usa classes `dark:` do Tailwind e variáveis CSS em `globals.css` para os temas claro e escuro.

---

## Solução de problemas

### “Unwilling To Perform” (LDAP)
- Atributo restrito ou valor inválido (ex.: `cn`, `sAMAccountName` em alteração indevida, ou valor vazio em atributo obrigatório). Confira os logs com `LDAP_DEBUG=true`.

### “User not found” ou login falha
- Verifique `LDAP_BASE_DN`, `LDAP_ADMIN_DN` e `LDAP_ADMIN_PASSWORD`. A aplicação usa a conta de serviço para localizar o usuário e depois valida a senha com bind do usuário.

### 404 em `/api/users/:id/move`
- O frontend usa a rota explícita `web/src/app/api/users/[id]/move/route.ts` e o proxy. Confirme que a API está no ar em `API_URL` e que não há outra rota interceptando o pedido.

### Sessão perdida ou redirect para login
- Verifique `SESSION_SECRET`, `FRONTEND_URL` e se os cookies estão sendo enviados (mesmo domínio ou CORS/credenciais corretos). Em dev, API e front na mesma máquina costumam usar `API_URL`/`FRONTEND_URL` em localhost.

### Nenhuma OU ou grupo na lista
- Confirme permissões da conta `LDAP_ADMIN_DN` no AD e o `LDAP_BASE_DN`. O filtro de OUs e grupos segue os objetos expostos pelo LDAP nessa base.

### Porta já em uso (EADDRINUSE)
- A API encerra com mensagem da porta. Use outra porta em `PORT` ou finalize o processo que está usando a porta.

### Proxy / API_URL no Next.js
- Em dev, o script `npm run dev` injeta `API_URL` no processo do Next. Se subir o front sozinho (`cd web && npm run dev`), defina `API_URL` no ambiente (ex.: `API_URL=http://127.0.0.1:3001`).
- O proxy está em `web/src/app/api/[[...path]]/route.ts`; chamadas a `/api/*` do navegador vão para essa rota, que repassa para a API com cookies.

---

## Perguntas frequentes (FAQ)

**Quem pode acessar a aplicação?**  
Apenas usuários que pertencem ao grupo cujo DN está em `LDAP_GROUP_REQUIRED`.

**Como virar “admin”?**  
É admin quem pertence a um grupo cujo **CN** contém a string `ADWEB-Admin` (definido no código da rota de login). Normalmente esse é o mesmo grupo de `LDAP_GROUP_REQUIRED` ou um subgrupo.

**Por que o botão “Excluir usuário” não aparece?**  
Exclusão é permitida só para quem é admin **e** pertence ao grupo em `LDAP_GROUP_DELETE`. Se `LDAP_GROUP_DELETE` não estiver definido no `.env`, ninguém pode excluir.

**Como alterar o limite de 50.000 entradas no log de auditoria?**  
O valor está em `src/services/audit.ts` (`MAX_ENTRIES`). Altere e recompile.

**Qual a frequência do job de agendamento de férias?**  
O runner executa a cada 60 segundos (configurado em `src/app.ts`: `scheduleService.startRunner(60_000)`).

**Posso usar só a API sem o frontend?**  
Sim. Suba a API com `npm start` e consuma as rotas com qualquer cliente HTTP; para login, envie `username` e `password` em `POST /api/auth/login` e use o cookie de sessão nas demais requisições.

**Os dados de agendamento e auditoria ficam no banco?**  
Não. Ficam em arquivos JSON no disco (`scheduled-actions.json`, `audit-log.json`), na pasta definida por `SCHEDULE_DATA_DIR` ou em `data/`.

---

## Segurança

- Use **LDAPS** em produção e evite expor a API na internet sem proteção.
- `SESSION_SECRET` deve ser forte e único por ambiente.
- Nunca versione o `.env`; use `env.example` só como modelo.
- A conta de serviço (`LDAP_ADMIN_DN`) deve ter o mínimo de permissões necessárias nas OUs gerenciadas.
- Excluir usuário é restrito a quem está em `LDAP_GROUP_DELETE`; avalie bem quem entra nesse grupo.

---

## Licença

ISC (conforme `package.json`).
