const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { db } = require('../db');

const SECRET_KEY = process.env.JWT_SECRET || 'super_secret_key';

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], async (err, user) => {
        if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, user: { username: user.username } });
    });
});

router.get('/me', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).send();
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        res.json(decoded);
    } catch {
        res.status(401).send();
    }
});

router.post('/change-password', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).send();

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const { newPassword } = req.body;

        bcrypt.hash(newPassword, 10, (err, hash) => {
            db.run("UPDATE users SET password = ? WHERE id = ?", [hash, decoded.id], (err) => {
                if (err) return res.status(500).json({ error: 'Failed' });
                res.json({ success: true });
            });
        });
    } catch {
        res.status(401).send();
    }
});

module.exports = router;
