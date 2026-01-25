import express, { Request, Response } from 'express';
import * as ldapService from '../services/ldap';

const router = express.Router();

router.get('/login', (req: Request, res: Response) => {
    res.render('login', { error: req.query.error, layout: false });
});

router.post('/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;
    try {
        const user = await ldapService.authenticate(username, password);

        // session struct
        (req.session as any).user = user;

        // Check admin group
        const adminGroupCN = 'ADWEB-Admin';
        let isAdmin = false;

        if (user.memberOf) {
            const groups = Array.isArray(user.memberOf) ? user.memberOf : [user.memberOf];
            isAdmin = groups.some((g: string) => g.includes(adminGroupCN));
        }

        (req.session as any).isAdmin = isAdmin;

        res.redirect('/');
    } catch (err: any) {
        res.redirect(`/login?error=${encodeURIComponent(err.message)}`);
    }
});

router.get('/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
        res.redirect('/login');
    });
});

export default router;
