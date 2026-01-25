import express, { Request, Response, NextFunction } from 'express';

const router = express.Router();

const ensureAuth = (req: Request, res: Response, next: NextFunction) => {
    if ((req.session as any).user) {
        next();
    } else {
        res.redirect('/login');
    }
};

router.use(ensureAuth);

router.get('/', (req: Request, res: Response) => {
    res.render('dashboard', { user: (req.session as any).user });
});

export default router;
