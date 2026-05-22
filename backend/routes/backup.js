const express = require('express');
const router = express.Router();
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const archiver = require('archiver');
const logger = require('../logger');
const { discoverServices, getDockerContainers } = require('../services');

const BACKUP_ROOT = '/backup/docker';
const SCRIPT_PATH = '/root/scripts/backup.sh';
const RESTORE_SCRIPT_PATH = '/root/scripts/restore.sh';

const upload = multer({ dest: '/tmp/uploads' });

// Get dynamically detected services
router.get('/services', async (req, res) => {
    try {
        const services = await discoverServices();
        res.json(services);
    } catch (e) {
        console.error('Service discovery failed:', e);
        res.json([]);
    }
});

// Get all Docker containers (for debugging/status)
router.get('/containers', async (req, res) => {
    try {
        const containers = await getDockerContainers();
        res.json(containers);
    } catch (e) {
        res.json([]);
    }
});

// List Backups with Real Size
router.get('/', (req, res) => {
    exec(`du -sh ${BACKUP_ROOT}/* 2>/dev/null`, (error, stdout) => {
        const sizes = {};
        if (!error && stdout) {
            stdout.split('\n').forEach(line => {
                const parts = line.split('\t');
                if (parts.length === 2) {
                    sizes[path.basename(parts[1])] = parts[0];
                }
            });
        }

        fs.readdir(BACKUP_ROOT, (err, files) => {
            if (err) return res.json([]);
            const backups = files.filter(f => f.match(/^\d{4}-\d{2}-\d{2}/)).map(f => {
                let date = new Date();
                try { date = fs.statSync(path.join(BACKUP_ROOT, f)).mtime; } catch (e) { }

                // Detect which services are in this backup
                const backupPath = path.join(BACKUP_ROOT, f);
                const services = [];
                if (fs.existsSync(path.join(backupPath, 'magento/db.sql'))) services.push({ id: 'magento', name: 'Magento', icon: '🛒' });
                if (fs.existsSync(path.join(backupPath, 'prestashop_old/db.sql'))) services.push({ id: 'prestashop', name: 'PrestaShop Old', icon: '🏪' });
                if (fs.existsSync(path.join(backupPath, 'prestashop_new/db.sql'))) services.push({ id: 'presta9', name: 'PrestaShop New', icon: '🏬' });
                if (fs.existsSync(path.join(backupPath, 'odoo/dump.sql'))) services.push({ id: 'odoo', name: 'Odoo', icon: '📊' });
                if (fs.existsSync(path.join(backupPath, 'npm/data.tar.gz'))) services.push({ id: 'npm', name: 'NPM', icon: '🌐' });

                return {
                    name: f,
                    date: date,
                    size: sizes[f] || 'N/A',
                    services: services
                };
            }).sort((a, b) => new Date(b.date) - new Date(a.date));
            res.json(backups);
        });
    });
});

// Get System Logs
router.get('/logs', (req, res) => {
    const logs = logger.readLogs(200);
    res.json(logs);
});

// Trigger Backup (with optional service selection)
router.post('/run', (req, res) => {
    const io = req.io;
    const services = req.body.services || []; // Array of service IDs

    const serviceArgs = services.length > 0 ? services.join(' ') : '';
    logger.append(`Backup Triggered for: ${serviceArgs || 'all services'}`, 'ACTION');
    io.emit('log', `--- Starting Backup (${serviceArgs || 'All Services'}) ---`);

    const proc = spawn(SCRIPT_PATH, services, { shell: true });

    proc.stdout.on('data', (data) => {
        const msg = data.toString().trim();
        logger.append(msg, 'BACKUP');
        io.emit('log', msg);
    });

    proc.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        logger.append(msg, 'ERROR');
        io.emit('log', `ERROR: ${msg}`);
    });

    proc.on('close', (code) => {
        const status = code === 0 ? 'Success' : 'Failed';
        logger.append(`Backup Finished. Status: ${status}`, 'INFO');
        io.emit('log', `--- Backup Finished (${status}) ---`);
        io.emit('backup_done', code === 0);
    });

    res.json({ status: 'started', services: services.length > 0 ? services : ['all'] });
});

// Trigger Restore (Per Service)
router.post('/restore/:name/:service', (req, res) => {
    const io = req.io;
    const { name, service } = req.params;

    logger.append(`Restore Triggered: ${name} → ${service}`, 'ACTION');
    io.emit('log', `--- Starting Restore: ${name} (${service}) ---`);

    const proc = spawn(RESTORE_SCRIPT_PATH, [name, service], { shell: true });

    proc.stdout.on('data', (data) => {
        const msg = data.toString().trim();
        logger.append(msg, 'RESTORE');
        io.emit('log', msg);
    });

    proc.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        logger.append(msg, 'ERROR');
        io.emit('log', `ERROR: ${msg}`);
    });

    proc.on('close', (code) => {
        logger.append(`Restore Finished: ${name} (${service})`, 'INFO');
        io.emit('log', `--- Restore Finished (${code === 0 ? 'Success' : 'Failed'}) ---`);
        io.emit('backup_done', code === 0);
    });

    res.json({ status: 'started' });
});

// Download Backup
router.get('/download/:name', (req, res) => {
    const backupName = req.params.name;
    const dirPath = path.join(BACKUP_ROOT, backupName);
    if (!fs.existsSync(dirPath)) return res.status(404).send('Backup not found');

    logger.append(`Download: ${backupName}`, 'ACTION');
    res.attachment(`${backupName}.zip`);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);
    archive.directory(dirPath, false);
    archive.finalize();
});

// Import Backup
router.post('/import', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded');
    const zipPath = req.file.path;
    const destName = path.basename(req.file.originalname, '.zip');
    const destPath = path.join(BACKUP_ROOT, destName);

    logger.append(`Import: ${destName}`, 'ACTION');
    exec(`mkdir -p "${destPath}" && unzip -o "${zipPath}" -d "${destPath}"`, (err) => {
        fs.unlinkSync(zipPath);
        if (err) {
            logger.append(`Import Failed: ${destName}`, 'ERROR');
            return res.status(500).json({ error: 'Failed to extract' });
        }
        logger.append(`Import Success: ${destName}`, 'INFO');
        res.json({ success: true });
    });
});

// Delete Backup
router.delete('/:name', (req, res) => {
    const folder = path.join(BACKUP_ROOT, req.params.name);
    if (!folder.startsWith(BACKUP_ROOT)) return res.status(403).send();

    logger.append(`Delete: ${req.params.name}`, 'ACTION');
    fs.rm(folder, { recursive: true, force: true }, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

module.exports = router;
