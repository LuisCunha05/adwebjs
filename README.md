# AD Web Manager

Aplicação web para gerenciamento de **usuários**, **grupos** e **unidades organizacionais (OUs)** do Active Directory via LDAP/LDAPS. Inclui autenticação por credenciais AD, auditoria, agendamento de férias (desativar/reativar contas automaticamente), atributos configuráveis e modo escuro.

Permite buscar e filtrar usuários por OU e grupo, mover contas entre OUs sem desativar, exportar listas em CSV, agendar férias com execução automática, e restringir a exclusão de usuários a um grupo LDAP opcional. A interface é responsiva e suporta tema claro, escuro e sistema.

### Stack e versões

| Camada | Tecnologia |
|--------|------------|
| Fullstack | Next.js 16 (App Router), React 19 |
| Estilo | Tailwind CSS 4, Radix UI, next-themes |
| Backend / API | Server Actions, Route Handlers, ldapts, jose (JWT) |
| Banco de Dados | SQLite (armazenamento local) |
| Job Runner | Node.js cron (processo isolado) |

---

## Índice

- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Executando a aplicação](#executando-a-aplicação)
- [Docker](#docker-produção)
- [Uso](#uso)
- [Fluxos de uso (passo a passo)](#fluxos-de-uso-passo-a-passo)
- [Atributos do AD (configuráveis)](#atributos-do-ad-configuráveis)
- [Permissões e grupos LDAP](#permissões-e-grupos-ldap)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Dados em disco e agendamentos](#dados-em-disco-e-agendamentos)
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
- Sessão stateless via JWT (assinada com `jose`), armazenada em cookie HTTP-only.
- Acesso à aplicação restrito a membros do grupo configurado em `LDAP_GROUP_REQUIRED`.

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
- O agendamento é processado por um job executado em background (Node.js cron).
- **Exportar férias (CSV)**: arquivo no formato `usuário,data_inicial,data_final`.

### Logs de auditoria
- Histórico de ações (criar/editar/desativar/excluir usuários, mover, redefinir senha, alterar grupos, agendar férias, etc.).
- Armazenado em banco de dados local (SQLite).
- Filtros por período, ação, ator e alvo.

### Interface
- **Modo escuro**: alternância entre claro, escuro e sistema (sidebar).
- Layout responsivo com sidebar fixa e páginas em português.

---

## Arquitetura

- **Fullstack Next.js**: O projeto é uma aplicação **Next.js 16** (App Router) unificada.
- **Server Actions**: A lógica de negócio e as chamadas ao LDAP são executadas no servidor através de Server Actions (`src/actions/`), garantindo segurança e separação de camadas.
- **Persistência (SQLite)**: Agendamentos, logs de auditoria e férias são armazenados em um banco de dados SQLite local (`data/database.sqlite`), gerenciado via `node:sqlite`.
- **Worker de Agendamento**: Um processo separado (`src/tasks/cron.ts`) é responsável por verificar e executar as tarefas agendadas (ativar/desativar usuários em férias).
- **LDAP**: A comunicação com o Active Directory é feita via `ldapts`.

---

## Requisitos

- **Node.js** 20+ (recomendado 24+).
- **Active Directory** acessível por LDAP ou LDAPS.
- **Conta de serviço** no AD com permissões de leitura/gravação nas OUs que serão gerenciadas (`LDAP_ADMIN_DN` / `LDAP_ADMIN_PASSWORD`).
- **Grupo no AD** usado para autorizar acesso à aplicação (ex.: `LDAP_GROUP_REQUIRED`). O admin da aplicação é definido pelo grupo cujo CN contém `ADWEB-Admin`.

---

## Instalação

1. **Clonar o repositório**
   ```bash
   git clone https://github.com/Tiozao-do-Linux/adwebjs.git
   cd adwebjs
   ```

2. **Instalar dependências**
   O projeto utiliza `pnpm`.
   ```bash
   corepack enable
   pnpm install
   ```

3. **Configurar variáveis de ambiente**
   Copie o exemplo e edite conforme o ambiente:
   ```bash
   cp env.example .env
   # Edite o .env com suas URLs, credenciais e grupos
   ```

---

## Configuração

### Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto.

| Variável | Descrição |
|----------|-----------|
| `LDAP_URL` | URL do LDAP/LDAPS, ex.: `ldaps://dc.empresa.com`. |
| `LDAP_BASE_DN` | DN base de busca, ex.: `DC=empresa,DC=com,DC=br`. |
| `LDAP_DOMAIN` | Sufixo do domínio (ex.: `empresa.com.br`) para UPN/fallback. |
| `LDAP_ADMIN_DN` | UPN ou DN da conta de serviço, ex.: `admin@empresa.com.br`. |
| `LDAP_ADMIN_PASSWORD` | Senha da conta de serviço. |
| `LDAP_GROUP_REQUIRED` | DN do grupo cujos membros podem **acessar** a aplicação. |
| `LDAP_GROUP_DELETE` | DN do grupo cujos membros podem **excluir usuários** (opcional). |
| `LDAP_DEBUG` | Se `true`, emite logs detalhados do LDAP no console. |
| `SCHEDULE_DATA_DIR` | Diretório onde o banco de dados SQLite será salvo (padrão: `data/`). |
| `AD_EXTRA_ATTRIBUTES` | Lista de atributos extras do AD para buscar e editar. |
| `JWT_SECRET_KEY` | Chave secreta para assinar o token de sessão (JWT). |
| `SESSION_EXPIRATION_SECONDS` | Duração da sessão em segundos. |
| `SESSION_COOKIE_NAME` | Nome do cookie de sessão (padrão: `session`). |

---

## Executando a aplicação

### Docker (Produção)

A maneira mais fácil de rodar a aplicação em produção é utilizando Docker Compose.

1.  **Configure o ambiente**:
    Crie o arquivo `.env` na raiz (baseado no `env.example`) e configure as variáveis.

2.  **Suba o container**:
    ```bash
    docker compose up -d
    ```
    A aplicação ficará disponível na porta definida em `PORT` no `.env`.

3.  **Ver logs**:
    ```bash
    docker compose logs -f
    ```

### Desenvolvimento

Para rodar a aplicação em modo de desenvolvimento (com hot-reload):

```bash
pnpm dev
```
Acesse `http://localhost:3000`.

### Scripts npm (raiz do projeto)

| Script | Descrição |
|--------|-----------|
| `pnpm dev` | Inicia o servidor de desenvolvimento Next.js. |
| `pnpm build` | Compila a aplicação para produção. |
| `pnpm start` | Inicia o servidor de produção (após o build). |
| `pnpm lint` | Executa o linter (ESLint). |
| `pnpm cron` | Executa o worker de agendamento (cron) manualmente. |

### Build de produção

Para ambiente de produção:

1. **Build**:
   ```bash
   pnpm build
   ```

2. **Start**:
   ```bash
   pnpm start
   ```

> **Nota:** Em produção, certifique-se de que o diretório de dados (`data/`) tenha permissão de escrita e persistência.

---

## Uso

### Login
1. Acesse a aplicação.
2. Informe **usuário** e **senha** do AD.
3. O acesso é liberado apenas para membros do grupo `LDAP_GROUP_REQUIRED`.

### Dashboard, Usuários, Grupos, OUs, Agendamentos
*(Consultar seção Funcionalidades acima)*

---

## Logs de auditoria

Cada ação relevante (criar, editar, excluir, login, agendamento) gera um registro no banco de dados SQLite (`audit_logs`).

| Ação | Descrição |
|------|-----------|
| `user.create`, `user.update` | Criação/Edição de usuário. |
| `user.disable`, `user.enable` | Desativação/Reativação de conta. |
| `user.move` | Movimentação de OU. |
| `user.delete`, `user.unlock` | Exclusão/Desbloqueio. |
| `group.update`, `group.member_*` | Alterações em grupos. |
| `vacation.schedule`, `vacation.execute_*` | Agendamento e execução de férias. |

A dashboard alerta se houverem muitas ações `user.disable` recentes.

---

## Atributos do AD (configuráveis)

Você pode estender os atributos gerenciados através da variável `AD_EXTRA_ATTRIBUTES` no `.env` (ex.: `cpf,matricula`) ou criando um arquivo `ad-user-attributes.json` na pasta de dados para controle total sobre quais campos aparecem na busca e na edição.

---

## Estrutura do projeto

```
adwebjs/
├── src/
│   ├── app/                # Páginas e rotas do Next.js (App Router)
│   ├── actions/            # Server Actions (lógica de negócio chamada pelo front)
│   ├── services/           # Camada de serviços (LDAP, Audit, Schedule, Container)
│   ├── repositories/       # Acesso a dados (SQLite)
│   ├── infrastructure/     # Configuração do Banco de Dados
│   ├── tasks/              # Scripts e Workers (Cron job)
│   ├── components/         # Componentes React (UI)
│   ├── lib/                # Configurações de libs e utilitários
│   └── types/              # Definições de tipos TypeScript
├── data/                   # Banco de dados SQLite e arquivos de config JSON
├── public/                 # Arquivos estáticos
├── .env                    # Variáveis de ambiente
├── next.config.ts          # Configuração do Next.js
└── package.json            # Dependências e scripts
```

---

## Dados em disco e agendamentos

Os dados persistentes da aplicação (agendamentos de férias e logs de auditoria) são armazenados em um banco de dados **SQLite** localizado em `data/database.sqlite` (ou no caminho definido por `SCHEDULE_DATA_DIR`).

O arquivo `ad-user-attributes.json` (opcional) também fica neste diretório e é usado para customizar os atributos do formulário.

---

## Solução de problemas

### “Unwilling To Perform” (LDAP)
Geralmente ocorre ao tentar alterar um atributo restrito ou enviar um formato inválido. Ative `LDAP_DEBUG=true` no .env para ver os logs detalhados do erro vindo do servidor LDAP.

### Erro de permissão no SQLite
Certifique-se de que o usuário que roda a aplicação tem permissão de escrita na pasta `data/`.

---

## Licença

ISC.
