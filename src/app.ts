import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import apiRouter from './routes/api';
import { PORT, SESSION_SECRET, FRONTEND_URL } from './contants/config';

const app = express();

app.set('trust proxy', 1);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// CORS: permite chamadas do front (ex.: FRONTEND_URL) com credentials
const frontendOrigin = FRONTEND_URL;
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('Origin');
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', frontendOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

// Redireciona acesso de navegador à porta da API para o frontend (Next.js)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.path.startsWith('/api')) return next();
  const accept = req.get('Accept') || '';
  if (!accept.includes('text/html')) return next();
  return res.redirect(302, frontendOrigin + req.originalUrl);
});

app.use('/api', apiRouter);

const server = app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  console.error('Erro no servidor:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`Porta ${PORT} já está em uso. Mate o processo ou use outra porta.`);
  }
  process.exit(1);
});
