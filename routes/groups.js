const express = require('express');
const router = express.Router();
const ldapService = require('../services/ldap');

const ensureAuth = (req, res, next) => {
    if (req.session.user && req.session.isAdmin) {
        next();
    } else {
        res.redirect('/login');
    }
};

router.use(ensureAuth);

router.get('/', (req, res) => {
    const query = req.query.q;
    if (query) {
        ldapService.searchGroups(query)
            .then(groups => {
                res.render('groups/index', { groups, query, user: req.session.user });
            })
            .catch(err => {
                res.render('groups/index', { groups: [], query, error: 'Search failed', user: req.session.user });
            });
    } else {
        res.render('groups/index', { groups: [], query: '', user: req.session.user });
    }
});

router.get('/:id/edit', async (req, res) => {
    const groupName = req.params.id;
    try {
        const group = await ldapService.getGroup(groupName);
        res.render('groups/edit', { group, user: req.session.user });
    } catch (err) {
        res.redirect('/groups?error=Group+not+found');
    }
});

router.post('/:id/edit', async (req, res) => {
    const groupName = req.params.id; // cn
    const { name, member, description } = req.body;

    const changes = {};
    if (name) changes.name = name;
    if (description) changes.description = description;

    // Parse members from textarea (one per line)
    if (member !== undefined) {
        changes.member = member.split('\n').map(m => m.trim()).filter(m => m.length > 0);
    }

    try {
        await ldapService.updateGroup(groupName, changes);
        res.redirect(`/groups?q=${groupName}&success=Group+updated`);
    } catch (err) {
        console.error(err);
        // Re-render with error
        // const group = { cn: groupName, ...changes }; // Keep values
        // Actually, re-fetching or mock-reconstructing might be needed, but for simplicity:
        res.redirect(`/groups/${groupName}/edit?error=${encodeURIComponent(err.message)}`);
    }
});

module.exports = router;
