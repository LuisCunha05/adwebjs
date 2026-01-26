import express, { Request, Response, NextFunction } from 'express';
import * as ldapService from '../services/ldap';

const router = express.Router();

const apiEnsureAuth = (req: Request, res: Response, next: NextFunction) => {
    if ((req.session as any).user) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized', code: 'NOT_LOGGED_IN' });
    }
};

const apiEnsureAdmin = (req: Request, res: Response, next: NextFunction) => {
    if ((req.session as any).user && (req.session as any).isAdmin) {
        next();
    } else {
        res.status(403).json({ error: 'Forbidden', code: 'REQUIRES_ADMIN' });
    }
};

// --- Auth ---
router.post('/auth/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    try {
        const user = await ldapService.authenticate(username, password);
        (req.session as any).user = user;
        const adminGroupCN = 'ADWEB-Admin';
        let isAdmin = false;
        if (user.memberOf) {
            const groups = Array.isArray(user.memberOf) ? user.memberOf : [user.memberOf];
            isAdmin = groups.some((g: string) => g.includes(adminGroupCN));
        }
        (req.session as any).isAdmin = isAdmin;
        return res.json({ user: { sAMAccountName: user.sAMAccountName, cn: user.cn, mail: user.mail, userPrincipalName: user.userPrincipalName }, isAdmin });
    } catch (err: any) {
        return res.status(401).json({ error: err.message || 'Authentication failed' });
    }
});

router.post('/auth/logout', (req: Request, res: Response) => {
    req.session.destroy(() => {
        res.json({ ok: true });
    });
});

router.get('/auth/me', (req: Request, res: Response) => {
    const user = (req.session as any).user;
    const isAdmin = (req.session as any).isAdmin;
    if (!user) return res.status(401).json({ error: 'Not logged in' });
    return res.json({ user: { sAMAccountName: user.sAMAccountName, cn: user.cn, mail: user.mail, userPrincipalName: user.userPrincipalName }, isAdmin: !!isAdmin });
});

// --- Users (admin only) ---
router.get('/users', apiEnsureAuth, apiEnsureAdmin, async (req: Request, res: Response) => {
    const query = (req.query.q as string) || '';
    const searchBy = (req.query.searchBy as string) || 'sAMAccountName';
    if (!query.trim()) {
        return res.json({ users: [] });
    }
    try {
        const users = await ldapService.searchUsers(query, searchBy);
        return res.json({ users });
    } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Search failed', users: [] });
    }
});

router.get('/users/:id', apiEnsureAuth, apiEnsureAdmin, async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
        const user = await ldapService.getUser(id);
        return res.json(user);
    } catch (err: any) {
        return res.status(404).json({ error: err.message || 'User not found' });
    }
});

router.patch('/users/:id', apiEnsureAuth, apiEnsureAdmin, async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
        const updated = await ldapService.updateUser(id, req.body);
        return res.json(updated);
    } catch (err: any) {
        return res.status(400).json({ error: err.message || 'Update failed' });
    }
});

// --- Groups (admin only) ---
router.get('/groups', apiEnsureAuth, apiEnsureAdmin, async (req: Request, res: Response) => {
    const query = (req.query.q as string) || '';
    if (!query.trim()) {
        return res.json({ groups: [] });
    }
    try {
        const groups = await ldapService.searchGroups(query);
        return res.json({ groups });
    } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Search failed', groups: [] });
    }
});

router.get('/groups/:id', apiEnsureAuth, apiEnsureAdmin, async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
        const group = await ldapService.getGroup(id);
        return res.json(group);
    } catch (err: any) {
        return res.status(404).json({ error: err.message || 'Group not found' });
    }
});

router.patch('/groups/:id', apiEnsureAuth, apiEnsureAdmin, async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { name, description, member } = req.body;
    const changes: any = {};
    if (name !== undefined) changes.name = name;
    if (description !== undefined) changes.description = description;
    if (member !== undefined) {
        changes.member = Array.isArray(member) ? member : String(member).split('\n').map((m: string) => m.trim()).filter((m: string) => m.length > 0);
    }
    try {
        const updated = await ldapService.updateGroup(id, changes);
        return res.json(updated);
    } catch (err: any) {
        return res.status(400).json({ error: err.message || 'Update failed' });
    }
});

export default router;
