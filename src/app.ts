import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
import path from 'path';
import expressLayouts from 'express-ejs-layouts';
import dotenv from 'dotenv';
import authRouter from './routes/auth';
import indexRouter from './routes/index';
import usersRouter from './routes/users';
import groupsRouter from './routes/groups';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// EJS Setup
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.set('layout', 'layout'); // layouts/layout.ejs

// Middleware
app.use(express.static(path.join(__dirname, '../public')));
// Serve Bootstrap from node_modules
app.use('/css', express.static(path.join(__dirname, '../node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, '../node_modules/bootstrap/dist/js')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret',
    resave: false,
    saveUninitialized: true
}));

// Routes
app.use('/', authRouter);
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/groups', groupsRouter);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
