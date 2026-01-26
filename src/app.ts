import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import dotenv from 'dotenv';
import apiRouter from './routes/api';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: false,
  })
);

// Redireciona acesso de navegador à porta da API para o frontend (Next.js)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.path.startsWith('/api')) return next();
  const accept = req.get('Accept') || '';
  if (!accept.includes('text/html')) return next();
  const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
  return res.redirect(302, frontend + req.originalUrl);
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
