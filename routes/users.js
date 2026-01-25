const express = require('express');
const router = express.Router();
const ldapService = require('../services/ldap');

// Middleware to ensure authentication and admin status
const ensureAuth = (req, res, next) => {
    if (req.session.user && req.session.isAdmin) {
        next();
    } else {
        res.redirect('/login');
    }
};

router.use(ensureAuth);

// List/Search Users
router.get('/', (req, res) => {
    // If query params exist, perform search. Otherwise show search form/empty list
    const query = req.query.q;
    const searchBy = req.query.by || 'sAMAccountName'; // Default search by username

    if (query) {
        // TODO: Implement LDAP search logic in service
        // For now, render with empty results
        ldapService.searchUsers(query, searchBy)
            .then(users => {
                res.render('users/index', { users, query, searchBy, user: req.session.user });
            })
            .catch(err => {
                console.error(err);
                res.render('users/index', { users: [], query, searchBy, error: 'Search failed', user: req.session.user });
            });
    } else {
        res.render('users/index', { users: [], query: '', searchBy: '', user: req.session.user });
    }
});

// Edit User Form
router.get('/:id/edit', async (req, res) => {
    const userId = req.params.id; // This will be the username (sAMAccountName)
    try {
        const userToEdit = await ldapService.getUser(userId);
        res.render('users/edit', { userToEdit, user: req.session.user });
    } catch (err) {
        res.redirect('/users?error=User+not+found');
    }
});

// Update User Action
router.post('/:id/edit', async (req, res) => {
    const userId = req.params.id;
    const changes = req.body;
    try {
        await ldapService.updateUser(userId, changes);
        res.redirect(`/users?q=${userId}&by=sAMAccountName&success=User+updated`);
    } catch (err) {
        console.error(err);
        // Re-render form with error and keep values
        res.render('users/edit', { userToEdit: { ...changes, sAMAccountName: userId }, error: 'Update failed: ' + err.message, user: req.session.user });
    }
});

module.exports = router;
