import { Request, Response, NextFunction } from 'express';
import { NODE_ENV } from '../contants/config';

export interface UserSession {
    sAMAccountName: string;
    cn: string;
    mail: string;
    userPrincipalName: string;
    permissions: string[]; // List of permission slugs
}

declare module 'express-session' {
    interface SessionData {
        user: UserSession;
        // Legacy fields, can strictly remove or keep for backward compat if needed temporarily
        isAdmin?: boolean;
    }
}

export const apiEnsureAuth = (req: Request, res: Response, next: NextFunction) => {
    if (req.session && req.session.user) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized', code: 'NOT_LOGGED_IN' });
};

export const requirePermission = (permissionSlug: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.session.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', code: 'NOT_LOGGED_IN' });
        }

        if (NODE_ENV === 'development') {
            return next();
        }

        // Super Admin check is done at login time usually, but we can also double check permissions list
        // If login logic sets permissions correctly (including ALL for super admin), we just check the list.
        if (user.permissions.includes('*') || user.permissions.includes(permissionSlug)) {
            return next();
        }

        return res.status(403).json({ error: 'Forbidden', code: 'INSUFFICIENT_PERMISSIONS', required: permissionSlug });
    };
};
