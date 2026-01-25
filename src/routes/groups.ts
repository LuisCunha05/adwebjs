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
    if (query) {
        ldapService.searchGroups(query)
            .then(groups => {
                res.render('groups/index', { groups, query, user: (req.session as any).user });
            })
            .catch(err => {
                res.render('groups/index', { groups: [], query, error: 'Search failed', user: (req.session as any).user });
            });
    } else {
        res.render('groups/index', { groups: [], query: '', user: (req.session as any).user });
    }
});

router.get('/:id/edit', async (req: Request, res: Response) => {
    const groupName = req.params.id as string;
    try {
        const group = await ldapService.getGroup(groupName);
        res.render('groups/edit', { group, user: (req.session as any).user });
    } catch (err) {
        res.redirect('/groups?error=Group+not+found');
    }
});

router.post('/:id/edit', async (req: Request, res: Response) => {
    const groupName = req.params.id as string; // cn
    const { name, member, description } = req.body;

    const changes: any = {};
    if (name) changes.name = name;
    if (description) changes.description = description;

    // Parse members from textarea (one per line)
    if (member !== undefined) {
        changes.member = member.split('\n').map((m: string) => m.trim()).filter((m: string) => m.length > 0);
    }

    try {
        await ldapService.updateGroup(groupName, changes);
        res.redirect(`/groups?q=${groupName}&success=Group+updated`);
    } catch (err: any) {
        console.error(err);
        res.redirect(`/groups/${groupName}/edit?error=${encodeURIComponent(err.message)}`);
    }
});

export default router;
