const express = require('express');
const router = express.Router();
const { db } = require('../db');
const cron = require('node-cron');
const { spawn } = require('child_process');

let currentTask = null;
const SCRIPT_PATH = '/root/scripts/backup.sh';

// Helper to schedule job
const scheduleJob = (schedule) => {
    if (currentTask) currentTask.stop();
    if (cron.validate(schedule)) {
        currentTask = cron.schedule(schedule, () => {
            console.log('--- Triggering Scheduled Backup ---');
            spawn(SCRIPT_PATH, [], { shell: true });
        });
        console.log(`Scheduled backup with: ${schedule}`);
    } else {
        console.log('Invalid Cron Schedule');
    }
};

// Initialize Schedule on Startup
db.get("SELECT value FROM settings WHERE key = 'cron_schedule'", (err, row) => {
    if (row && row.value) {
        scheduleJob(row.value);
    }
});

router.get('/', (req, res) => {
    db.all("SELECT * FROM settings", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);
        res.json(settings);
    });
});

router.post('/', (req, res) => {
    const { retention_days, cron_schedule } = req.body;

    // Update DB
    const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    stmt.run('retention_days', retention_days);
    stmt.run('cron_schedule', cron_schedule);
    stmt.finalize();

    // Update Scheduler
    if (cron_schedule) {
        scheduleJob(cron_schedule);
    }

    // Note: We also need to pass RETENTION_DAYS to the script. 
    // Ideally the script reads from ENV or DB, or we replace the var in the script.
    // For simplicity, we can export it as ENV when spawning.

    res.json({ success: true });
});

module.exports = router;
