const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Service type detection patterns
const SERVICE_PATTERNS = {
    magento: {
        patterns: ['magento', 'mage'],
        icon: '🛒',
        color: '#f46f25',
        dbType: 'mysql'
    },
    prestashop: {
        patterns: ['prestashop', 'presta'],
        icon: '🏪',
        color: '#df0067',
        dbType: 'mysql'
    },
    odoo: {
        patterns: ['odoo'],
        icon: '📊',
        color: '#714b67',
        dbType: 'postgres'
    },
    wordpress: {
        patterns: ['wordpress', 'wp'],
        icon: '📝',
        color: '#21759b',
        dbType: 'mysql'
    },
    woocommerce: {
        patterns: ['woocommerce', 'woo'],
        icon: '🛍️',
        color: '#96588a',
        dbType: 'mysql'
    },
    laravel: {
        patterns: ['laravel'],
        icon: '🔺',
        color: '#ff2d20',
        dbType: 'mysql'
    },
    nodejs: {
        patterns: ['node', 'express', 'nextjs', 'nuxt'],
        icon: '🟢',
        color: '#339933',
        dbType: null
    },
    nginx: {
        patterns: ['nginx', 'proxy'],
        icon: '🌐',
        color: '#009639',
        dbType: null
    },
    mysql: {
        patterns: ['mysql', 'mariadb'],
        icon: '🗄️',
        color: '#4479a1',
        dbType: 'mysql',
        isDatabase: true
    },
    postgres: {
        patterns: ['postgres', 'psql', 'postgresql'],
        icon: '🐘',
        color: '#336791',
        dbType: 'postgres',
        isDatabase: true
    },
    mongodb: {
        patterns: ['mongo'],
        icon: '🍃',
        color: '#47a248',
        dbType: 'mongo',
        isDatabase: true
    },
    redis: {
        patterns: ['redis'],
        icon: '⚡',
        color: '#dc382d',
        dbType: 'redis',
        isDatabase: true
    }
};

// Detect service type from container name
const detectServiceType = (containerName) => {
    const nameLower = containerName.toLowerCase();
    for (const [type, config] of Object.entries(SERVICE_PATTERNS)) {
        if (config.patterns.some(p => nameLower.includes(p))) {
            return { type, ...config };
        }
    }
    return { type: 'unknown', icon: '📦', color: '#6b7280', dbType: null };
};

// Get all running Docker containers
const getDockerContainers = async () => {
    try {
        const { stdout } = await execAsync(
            'docker ps --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}" 2>/dev/null'
        );

        const containers = stdout.trim().split('\n').filter(l => l).map(line => {
            const [id, name, image, status, ports] = line.split('|');
            const isRunning = status.toLowerCase().includes('up');
            const serviceInfo = detectServiceType(name);

            return {
                id,
                name,
                image,
                status,
                isRunning,
                ports,
                ...serviceInfo
            };
        });

        return containers;
    } catch (e) {
        console.error('Failed to get Docker containers:', e);
        return [];
    }
};

// Group containers into logical services
const discoverServices = async () => {
    const containers = await getDockerContainers();
    const services = {};

    // First pass: identify database containers
    const dbContainers = containers.filter(c => c.isDatabase);

    // Second pass: group app containers with their databases
    for (const container of containers) {
        if (container.isDatabase) continue;

        // Extract service prefix (e.g., "magento" from "magento-app-1")
        const prefix = container.name.split('-')[0].toLowerCase();

        if (!services[prefix]) {
            services[prefix] = {
                id: prefix,
                name: prefix.charAt(0).toUpperCase() + prefix.slice(1),
                type: container.type,
                icon: container.icon,
                color: container.color,
                containers: [],
                database: null,
                isRunning: true,
                hasBackup: true
            };
        }

        services[prefix].containers.push({
            id: container.id,
            name: container.name,
            role: container.isDatabase ? 'database' : 'app',
            isRunning: container.isRunning
        });

        // Update service running status
        if (!container.isRunning) {
            services[prefix].isRunning = false;
        }
    }

    // Match databases to services
    for (const db of dbContainers) {
        const prefix = db.name.split('-')[0].toLowerCase();
        if (services[prefix]) {
            services[prefix].database = {
                id: db.id,
                name: db.name,
                type: db.dbType,
                isRunning: db.isRunning
            };
            services[prefix].containers.push({
                id: db.id,
                name: db.name,
                role: 'database',
                isRunning: db.isRunning
            });
        } else {
            // Standalone database
            services[prefix] = {
                id: prefix,
                name: db.name,
                type: db.type,
                icon: db.icon,
                color: db.color,
                containers: [{ id: db.id, name: db.name, role: 'database', isRunning: db.isRunning }],
                database: { id: db.id, name: db.name, type: db.dbType, isRunning: db.isRunning },
                isRunning: db.isRunning,
                hasBackup: true
            };
        }
    }

    // Filter out non-backupable services (nginx, portainer, etc)
    const backupableServices = Object.values(services).filter(s =>
        s.database || ['magento', 'prestashop', 'odoo', 'wordpress', 'woocommerce', 'laravel'].includes(s.type)
    );

    return backupableServices;
};

// Get container details including volumes
const getContainerVolumes = async (containerName) => {
    try {
        const { stdout } = await execAsync(
            `docker inspect ${containerName} --format '{{range .Mounts}}{{.Source}}:{{.Destination}}|{{end}}' 2>/dev/null`
        );

        return stdout.trim().split('|').filter(v => v).map(v => {
            const [source, dest] = v.split(':');
            return { source, destination: dest };
        });
    } catch (e) {
        return [];
    }
};

module.exports = { discoverServices, getContainerVolumes, getDockerContainers };
