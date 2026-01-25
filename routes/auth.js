const express = require('express');
const router = express.Router();
const ldapService = require('../services/ldap');

router.get('/login', (req, res) => {
    res.render('login', { error: null, layout: false });
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await ldapService.authenticate(username, password);

        // Group Check: "ADWEB-Admin"
        // memberOf might be a string (single group) or array (multiple)
        const groups = Array.isArray(user.memberOf) ? user.memberOf : [user.memberOf];
        const isAdmin = groups.some(g => g && g.includes('ADWEB-Admin'));

        if (!isAdmin) {
            return res.render('login', { error: 'Access Denied: You are not a member of ADWEB-Admin.', layout: false });
        }

        req.session.user = user;
        req.session.isAdmin = true;
        res.redirect('/');

    } catch (err) {
        console.error('Login error:', err);
        res.render('login', { error: 'Invalid credentials or LDAP error.', layout: false });
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;
