const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = process.env.DB_PATH || '/data/database.sqlite';
const db = new sqlite3.Database(dbPath);

const init = () => {
    return new Promise((resolve, reject) => {
        db.serialize(async () => {
            // Users Table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT
            )`);

            // Settings Table
            db.run(`CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )`);

            // Backups Table (Metadata)
            db.run(`CREATE TABLE IF NOT EXISTS backups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT,
                path TEXT,
                date TEXT,
                size TEXT,
                status TEXT
            )`);

            // Create Default Admin if not exists
            const adminExists = await new Promise(res => {
                db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => res(!!row));
            });

            if (!adminExists) {
                const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
                const hash = await bcrypt.hash(defaultPassword, 10);
                db.run("INSERT INTO users (username, password) VALUES (?, ?)", ['admin', hash]);
                console.log(`Default admin user created: admin/${defaultPassword}`);
            }

            // Default Settings
            db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('retention_days', '7')");
            db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('cron_schedule', '0 4 * * *')");

            resolve();
        });
    });
};

module.exports = { db, init };
