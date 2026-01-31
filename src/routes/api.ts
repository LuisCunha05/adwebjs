import express, { Request, Response, NextFunction } from 'express';
import { ldapService } from '../services/container';
import * as scheduleService from '../services/schedule';
import * as auditService from '../services/audit';
import { getFetchAttributes, getEditConfig } from '../services/ad-user-attributes';

const router = express.Router();

const LDAP_GROUP_DELETE = (process.env.LDAP_GROUP_DELETE || '').trim();

function auditActor(req: Request): string {
    return (req.session as any).user?.sAMAccountName ?? 'unknown';
}

function memberOfGroup(memberOf: unknown, groupDn: string): boolean {
    if (!groupDn) return false;
    const groups = Array.isArray(memberOf) ? memberOf : (memberOf ? [memberOf] : []);
    const gdn = String(groupDn).toLowerCase().trim();
    return groups.some((g: string) => String(g).toLowerCase().trim() === gdn);
}

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
        const canDelete = isAdmin && LDAP_GROUP_DELETE && memberOfGroup(user.memberOf, LDAP_GROUP_DELETE);
        (req.session as any).canDelete = canDelete;
        return res.json({ user: { sAMAccountName: user.sAMAccountName, cn: user.cn, mail: user.mail, userPrincipalName: user.userPrincipalName }, isAdmin, canDelete: !!canDelete });
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
    const canDelete = (req.session as any).canDelete;
    if (!user) return res.status(401).json({ error: 'Not logged in' });
    return res.json({ user: { sAMAccountName: user.sAMAccountName, cn: user.cn, mail: user.mail, userPrincipalName: user.userPrincipalName }, isAdmin: !!isAdmin, canDelete: !!canDelete });
});

// --- Config (admin only) ---
router.get('/config/user-attributes', apiEnsureAuth, apiEnsureAdmin, (_req: Request, res: Response) => {
    try {
        return res.json({ fetch: getFetchAttributes(), edit: getEditConfig() });
    } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Config failed', fetch: [], edit: [] });
    }
});

// --- Users (admin only) ---
router.get('/users', apiEnsureAuth, apiEnsureAdmin, async (req: Request, res: Response) => {
    const query = (req.query.q as string) || '';
    const searchBy = (req.query.searchBy as string) || 'sAMAccountName';
    const ou = (req.query.ou as string)?.trim() || undefined;
    const memberOf = (req.query.memberOf as string)?.trim() || undefined;
    const disabledOnly = (req.query.disabledOnly as string) === 'true' || (req.query.disabledOnly as string) === '1';
    const hasFilters = !!(ou || memberOf || disabledOnly);
    if (!query.trim() && !hasFilters) {
        return res.json({ users: [] });
    }
    try {
        const users = await ldapService.searchUsers(query, searchBy, { ou, memberOf, disabledOnly });
        return res.json({ users });
    } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Search failed', users: [] });
    }
});

router.post('/users', apiEnsureAuth, apiEnsureAdmin, async (req: Request, res: Response) => {
    const body = req.body || {};
    const { parentOuDn, sAMAccountName, password } = body;
    if (!parentOuDn || !sAMAccountName || !password) {
        return res.status(400).json({ error: 'parentOuDn, sAMAccountName e password são obrigatórios' });
    }
    try {
        const user = await ldapService.createUser(body);
        auditService.log({
            action: 'user.create',
            actor: auditActor(req),
            target: sAMAccountName,
            details: { parentOuDn },
            success: true,
        });
        return res.status(201).json(user);
    } catch (err: any) {
        auditService.log({
            action: 'user.create',
            actor: auditActor(req),
            target: String(sAMAccountName),
            success: false,
            error: err.message,
        });
        return res.status(400).json({ error: err.message || 'Create user failed' });
    }
});

// Rotas /users/:id/... precisam vir antes de /users/:id para o Express fazer match correto
router.post('/users/:id/move', apiEnsureAuth, apiEnsureAdmin, async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const targetOuDn = (req.body && typeof req.body === 'object' && req.body.targetOuDn) ? String(req.body.targetOuDn).trim() : undefined;
    if (!targetOuDn) {
        return res.status(400).json({ error: 'targetOuDn é obrigatório' });
    }
    try {
        await ldapService.moveUserToOu(id, targetOuDn);
        auditService.log({ action: 'user.move', actor: auditActor(req), target: id, details: { targetOuDn }, success: true });
        return res.json({ ok: true });
    } catch (err: any) {
        auditService.log({ action: 'user.move', actor: auditActor(req), target: id, details: { targetOuDn }, success: false, error: err.message });
        return res.status(400).json({ error: err.message || 'Move failed' });
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
        auditService.log({ action: 'user.update', actor: auditActor(req), target: id, details: { fields: Object.keys(req.body) }, success: true });
        return res.json(updated);
    } catch (err: any) {
        auditService.log({ action: 'user.update', actor: auditActor(req), target: id, success: false, error: err.message });
        return res.status(400).json({ error: err.message || 'Update failed' });
    }
});

router.post('/users/:id/disable', apiEnsureAuth, apiEnsureAdmin, async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const targetOu = (req.body && typeof req.body === 'object' && req.body.targetOu) ? String(req.body.targetOu).trim() || undefined : undefined;
    try {
        await ldapService.disableUser(id, targetOu ? { targetOu } : undefined);
        auditService.log({
            action: 'user.disable',
            actor: auditActor(req),
            target: id,
            details: targetOu ? { targetOu } : undefined,
            success: true,
        });
        return res.json({ ok: true });
    } catch (err: any) {
        auditService.log({ action: 'user.disable', actor: auditActor(req), target: id, success: false, error: err.message });
        return res.status(400).json({ error: err.message || 'Disable failed' });
    }
});

router.post('/users/:id/enable', apiEnsureAuth, apiEnsureAdmin, async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
        await ldapService.enableUser(id);
        auditService.log({ action: 'user.enable', actor: auditActor(req), target: id, success: true });
        return res.json({ ok: true });
    } catch (err: any) {
        auditService.log({ action: 'user.enable', actor: auditActor(req), target: id, success: false, error: err.message });
        return res.status(400).json({ error: err.message || 'Enable failed' });
    }
});

router.post('/users/:id/unlock', apiEnsureAuth, apiEnsureAdmin, async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
        await ldapService.unlockUser(id);
        auditService.log({ action: 'user.unlock', actor: auditActor(req), target: id, success: true });
        return res.json({ ok: true });
    } catch (err: any) {
        auditService.log({ action: 'user.unlock', actor: auditActor(req), target: id, success: false, error: err.message });
        return res.status(400).json({ error: err.message || 'Unlock failed' });
    }
});

router.post('/users/:id/reset-password', apiEnsureAuth, apiEnsureAdmin, async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const newPassword = req.body?.newPassword ?? req.body?.password;
    if (!newPassword || typeof newPassword !== 'string') {
        return res.status(400).json({ error: 'newPassword é obrigatório' });
    }
    try {
        await ldapService.setPassword(id, newPassword);
        auditService.log({ action: 'user.reset_password', actor: auditActor(req), target: id, success: true });
        return res.json({ ok: true });
    } catch (err: any) {
        auditService.log({ action: 'user.reset_password', actor: auditActor(req), target: id, success: false, error: err.message });
        return res.status(400).json({ error: err.message || 'Reset password failed' });
    }
});

router.delete('/users/:id', apiEnsureAuth, apiEnsureAdmin, (req: Request, res: Response, next: NextFunction) => {
    if (!(req.session as any).canDelete) {
        return res.status(403).json({ error: 'Sem permissão para excluir usuários. É necessário pertencer ao grupo configurado em LDAP_GROUP_DELETE.', code: 'REQUIRES_DELETE_GROUP' });
    }
    next();
}, async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
        await ldapService.deleteUser(id);
        auditService.log({ action: 'user.delete', actor: auditActor(req), target: id, success: true });
        return res.json({ ok: true });
    } catch (err: any) {
        auditService.log({ action: 'user.delete', actor: auditActor(req), target: id, success: false, error: err.message });
        return res.status(400).json({ error: err.message || 'Delete failed' });
    }
});

// --- Stats ---
router.get('/stats', apiEnsureAuth, apiEnsureAdmin, async (req: Request, res: Response) => {
    try {
        const stats = await ldapService.getStats();
        return res.json(stats);
    } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Stats failed', usersCount: 0, disabledCount: 0, groupsCount: 0 });
    }
});

// --- OUs ---
router.get('/ous', apiEnsureAuth, apiEnsureAdmin, async (req: Request, res: Response) => {
    try {
        const ous = await ldapService.listOUs();
        return res.json({ ous: ous || [] });
    } catch (err: any) {
        return res.status(200).json({ ous: [] });
    }
});

// --- Schedule (vacation, etc.) ---
router.get('/schedule', apiEnsureAuth, apiEnsureAdmin, async (req: Request, res: Response) => {
    try {
        const actions = scheduleService.list();
        return res.json({ actions });
    } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Schedule list failed', actions: [] });
    }
});

router.post('/schedule/vacation', apiEnsureAuth, apiEnsureAdmin, async (req: Request, res: Response) => {
    const { userId, startDate, endDate } = req.body || {};
    if (!userId || !startDate || !endDate) {
        return res.status(400).json({ error: 'userId, startDate and endDate required' });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        return res.status(400).json({ error: 'Invalid dates: end must be after start' });
    }
    try {
        const { disableId, enableId } = scheduleService.addVacation(String(userId), startDate, endDate);
        auditService.log({
            action: 'vacation.schedule',
            actor: auditActor(req),
            target: String(userId),
            details: { startDate, endDate, disableId, enableId },
            success: true,
        });
        return res.json({ ok: true, disableId, enableId });
    } catch (err: any) {
        auditService.log({
            action: 'vacation.schedule',
            actor: auditActor(req),
            target: String(userId),
            details: { startDate, endDate },
            success: false,
            error: err.message,
        });
        return res.status(400).json({ error: err.message || 'Schedule vacation failed' });
    }
});

router.delete('/schedule/:id', apiEnsureAuth, apiEnsureAdmin, async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
        const removed = scheduleService.remove(id);
        if (!removed) return res.status(404).json({ error: 'Scheduled action not found' });
        return res.json({ ok: true });
    } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Cancel failed' });
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

// Rotas mais específicas primeiro (/:id/members/* antes de /:id)
router.get('/groups/:id/members/resolved', apiEnsureAuth, apiEnsureAdmin, async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
        const group = await ldapService.getGroup(id);
        const raw = group.member;
        const members = Array.isArray(raw) ? raw : (raw != null ? [String(raw)] : []);
        if (members.length === 0) return res.json({ members: [] });
        try {
            const resolved = await ldapService.resolveMemberDns(members);
            return res.json({ members: resolved });
        } catch {
            return res.json({ members: members.map((dn: string) => ({ dn })) });
        }
    } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Group not found', members: [] });
    }
});

router.post('/groups/:id/members/add', apiEnsureAuth, apiEnsureAdmin, async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { dn } = req.body;
    if (!dn || typeof dn !== 'string') return res.status(400).json({ error: 'dn required' });
    try {
        await ldapService.addMemberToGroup(id, dn.trim());
        auditService.log({ action: 'group.member_add', actor: auditActor(req), target: id, details: { memberDn: dn }, success: true });
        return res.json({ ok: true });
    } catch (err: any) {
        auditService.log({ action: 'group.member_add', actor: auditActor(req), target: id, details: { memberDn: dn }, success: false, error: err.message });
        return res.status(400).json({ error: err.message || 'Add member failed' });
    }
});

router.post('/groups/:id/members/remove', apiEnsureAuth, apiEnsureAdmin, async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { dn } = req.body;
    if (!dn || typeof dn !== 'string') return res.status(400).json({ error: 'dn required' });
    try {
        await ldapService.removeMemberFromGroup(id, dn.trim());
        auditService.log({ action: 'group.member_remove', actor: auditActor(req), target: id, details: { memberDn: dn }, success: true });
        return res.json({ ok: true });
    } catch (err: any) {
        auditService.log({ action: 'group.member_remove', actor: auditActor(req), target: id, details: { memberDn: dn }, success: false, error: err.message });
        return res.status(400).json({ error: err.message || 'Remove member failed' });
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
        auditService.log({ action: 'group.update', actor: auditActor(req), target: id, details: { fields: Object.keys(changes) }, success: true });
        return res.json(updated);
    } catch (err: any) {
        auditService.log({ action: 'group.update', actor: auditActor(req), target: id, success: false, error: err.message });
        return res.status(400).json({ error: err.message || 'Update failed' });
    }
});

// --- Audit Logs (admin only) ---
router.get('/audit-logs', apiEnsureAuth, apiEnsureAdmin, async (req: Request, res: Response) => {
    try {
        const since = req.query.since as string | undefined;
        const until = req.query.until as string | undefined;
        const action = req.query.action as string | undefined;
        const actor = req.query.actor as string | undefined;
        const target = req.query.target as string | undefined;
        const limit = req.query.limit ? Math.min(Number(req.query.limit), 2000) : 500;
        const entries = auditService.list({ since, until, action, actor, target, limit });
        return res.json({ entries });
    } catch (err: any) {
        return res.status(500).json({ error: err.message || 'Audit list failed', entries: [] });
    }
});

export default router;
