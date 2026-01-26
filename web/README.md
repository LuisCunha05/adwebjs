# AD Web Manager — Interface Next.js

Interface moderna em Next.js + shadcn/ui para o AD Web Manager.

## Como rodar

1. **API (backend Express)** — na raiz do projeto:
   ```bash
   npm run dev:api
   ```
   Isso sobe o servidor na porta **3001**.

2. **Frontend** — nesta pasta:
   ```bash
   npm run dev
   ```
   Acesse [http://localhost:3000](http://localhost:3000). As chamadas para `/api/*` são encaminhadas para o backend na porta 3001.

## Variáveis de ambiente

O frontend usa:

- `API_URL` — URL do backend (padrão: `http://127.0.0.1:3001`). Só é necessário mudar em ambientes em que a API está em outro host/porta.

As variáveis do backend (LDAP, sessão, etc.) ficam no `.env` na raiz do projeto.
