import express, { Request, Response, NextFunction } from 'express';
import * as ldapService from '../services/ldap';

const router = express.Router();

const ensureAuth = (req: Request, res: Response, next: NextFunction) => {
    if ((req.session as any).user && (req.session as any).isAdmin) {
        next();
    } else {
        res.redirect('/login');
    }
};

router.use(ensureAuth);

router.get('/', (req: Request, res: Response) => {
    const query = req.query.q as string;
    const searchBy = (req.query.searchBy as string) || 'sAMAccountName'; // Default search by username

    if (query) {
        ldapService.searchUsers(query, searchBy)
            .then(users => {
                res.render('users/index', { users, query, searchBy, user: (req.session as any).user });
            })
            .catch(err => {
                res.render('users/index', { users: [], query, searchBy, error: 'Search failed', user: (req.session as any).user });
            });
    } else {
        res.render('users/index', { users: [], query: '', searchBy, user: (req.session as any).user });
    }
});

router.get('/:id/edit', async (req: Request, res: Response) => {
    const username = req.params.id as string;
    try {
        const userToEdit = await ldapService.getUser(username);
        res.render('users/edit', { userToEdit, user: (req.session as any).user });
    } catch (err) {
        res.redirect('/users?error=User+not+found');
    }
});

router.post('/:id/edit', async (req: Request, res: Response) => {
    const username = req.params.id as string;
    const changes = req.body;

    // Filter out empty standard fields usually handled by express.body if not careful, 
    // but ldapService handles diffing now.

    try {
        await ldapService.updateUser(username, changes);
        res.redirect(`/users?q=${username}&success=User+updated`);
    } catch (err: any) {
        console.error(err);
        // To re-render with error, we'd need to fetch user again or pass back details. 
        // For now, redirect with error param is simplest
        res.redirect(`/users/${username}/edit?error=${encodeURIComponent(err.message)}`);
    }
});

export default router;
