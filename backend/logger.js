const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join('/data', 'app.log');

const getTimestamp = () => new Date().toISOString().replace('T', ' ').split('.')[0];

const append = (message, type = 'INFO') => {
    const line = `[${getTimestamp()}] [${type}] ${message}\n`;
    fs.appendFile(LOG_FILE, line, (err) => {
        if (err) console.error("Failed to write log:", err);
    });
    return line.trim();
};

const readLogs = (limit = 100) => {
    if (!fs.existsSync(LOG_FILE)) return [];
    try {
        const data = fs.readFileSync(LOG_FILE, 'utf8');
        const lines = data.split('\n').filter(l => l);
        return lines.slice(-limit).reverse(); // Return last N lines, newest first
    } catch (e) {
        return [`Error reading logs: ${e.message}`];
    }
};

module.exports = { append, readLogs };
