import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { Play, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const socket = io();

export default function Dashboard() {
    const [services, setServices] = useState([]);
    const [backups, setBackups] = useState([]);
    const [selectedServices, setSelectedServices] = useState([]);
    const [logs, setLogs] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState('');
    const [showBackupModal, setShowBackupModal] = useState(false);
    const logsEndRef = useRef(null);

    useEffect(() => {
        fetchServices();
        fetchBackups();

        socket.on('log', (msg) => {
            setLogs(prev => [...prev, msg].slice(-100));
            setIsRunning(true);

            // Parse progress from log messages like "[1/5]" or "[2/5]"
            const match = msg.match(/\[(\d+)\/(\d+)\]/);
            if (match) {
                const current = parseInt(match[1]);
                const total = parseInt(match[2]);
                const pct = Math.round((current / total) * 100);
                setProgress(pct);
                setProgressText(`Step ${current} of ${total}`);
            }

            // Check for completion messages
            if (msg.includes('Finished Successfully') || msg.includes('✅')) {
                setProgress(100);
                setProgressText('Complete!');
            }
        });

        socket.on('backup_done', (success) => {
            setIsRunning(false);
            setProgress(100);
            setProgressText(success ? 'Complete!' : 'Failed');
            fetchBackups();
            setLogs(prev => [...prev, success ? '✅ Operation Complete!' : '❌ Operation Failed']);

            // Reset progress after 3 seconds
            setTimeout(() => {
                setProgress(0);
                setProgressText('');
            }, 3000);
        });

        return () => {
            socket.off('log');
            socket.off('backup_done');
        };
    }, []);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const fetchServices = async () => {
        try {
            const res = await axios.get('/api/backup/services');
            setServices(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchBackups = async () => {
        try {
            const res = await axios.get('/api/backup');
            setBackups(res.data);
        } catch (e) { console.error(e); }
    };

    const toggleService = (serviceId) => {
        if (selectedServices.includes(serviceId)) {
            setSelectedServices(prev => prev.filter(s => s !== serviceId));
        } else {
            setSelectedServices(prev => [...prev, serviceId]);
        }
    };

    const selectAll = () => {
        if (selectedServices.length === services.length) {
            setSelectedServices([]);
        } else {
            setSelectedServices(services.map(s => s.id));
        }
    };

    const runBackup = async () => {
        try {
            setLogs([]);
            setProgress(5);
            setProgressText('Starting...');
            setShowBackupModal(false);
            await axios.post('/api/backup/run', { services: selectedServices });
            setLogs([`🚀 Backup started for: ${selectedServices.length > 0 ? selectedServices.join(', ') : 'All Services'}`]);
            setIsRunning(true);
        } catch (e) {
            alert('Failed to start backup');
            setProgress(0);
            setProgressText('');
        }
    };

    // Calculate stats
    const totalSize = backups.reduce((sum, b) => {
        const match = b.size?.match(/^([\d.]+)([KMGT]?)/);
        if (!match) return sum;
        const num = parseFloat(match[1]);
        const unit = match[2];
        const multipliers = { '': 1, 'K': 1024, 'M': 1024 ** 2, 'G': 1024 ** 3 };
        return sum + (num * (multipliers[unit] || 1));
    }, 0);

    const formatSize = (bytes) => {
        if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(1) + ' GB';
        if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(1) + ' MB';
        return (bytes / 1024).toFixed(1) + ' KB';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Dashboard</h1>
                <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={() => { fetchServices(); fetchBackups(); }}>
                        <RefreshCw size={16} />
                    </button>
                    <button
                        className={`btn btn-primary ${isRunning ? 'btn-disabled' : ''}`}
                        onClick={() => setShowBackupModal(true)}
                        disabled={isRunning}
                    >
                        {isRunning ? <span className="loading loading-spinner loading-sm"></span> : <Play size={16} />}
                        New Backup
                    </button>
                </div>
            </div>

            {/* Service Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {services.map(service => (
                    <div key={service.id} className="card bg-base-100 shadow-lg border-l-4" style={{ borderLeftColor: service.color }}>
                        <div className="card-body p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">{service.icon}</span>
                                    <div>
                                        <h3 className="font-semibold">{service.name}</h3>
                                        <span className="text-xs opacity-60">{service.containers?.length || 0} containers</span>
                                    </div>
                                </div>
                                {service.isRunning ? (
                                    <div className="badge badge-success gap-1"><CheckCircle size={12} /> Running</div>
                                ) : (
                                    <div className="badge badge-error gap-1"><XCircle size={12} /> Stopped</div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {services.length === 0 && (
                    <div className="col-span-full text-center p-8 opacity-50">
                        <AlertCircle size={32} className="mx-auto mb-2" />
                        <p>No services detected. Make sure Docker containers are running.</p>
                    </div>
                )}
            </div>

            {/* Stats Row */}
            <div className="stats shadow bg-base-100 w-full">
                <div className="stat">
                    <div className="stat-title">Total Backups</div>
                    <div className="stat-value text-primary">{backups.length}</div>
                </div>
                <div className="stat">
                    <div className="stat-title">Storage Used</div>
                    <div className="stat-value text-secondary">{formatSize(totalSize)}</div>
                </div>
                <div className="stat">
                    <div className="stat-title">Services</div>
                    <div className="stat-value text-accent">{services.length}</div>
                </div>
                <div className="stat">
                    <div className="stat-title">Last Backup</div>
                    <div className="stat-value text-sm">{backups[0] ? new Date(backups[0].date).toLocaleDateString() : 'Never'}</div>
                </div>
            </div>

            {/* Progress Bar */}
            {progress > 0 && (
                <div className="bg-base-100 p-4 rounded-box shadow">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">{progressText || 'Processing...'}</span>
                        <span className="font-bold">{progress}%</span>
                    </div>
                    <progress
                        className={`progress w-full h-3 ${progress === 100 ? 'progress-success' : 'progress-primary'}`}
                        value={progress}
                        max="100"
                    ></progress>
                </div>
            )}

            {/* Live Console */}
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body p-4">
                    <h2 className="card-title text-lg mb-2">Live Console</h2>
                    <div className="mockup-code bg-neutral text-neutral-content h-64 overflow-y-auto text-sm">
                        {logs.length === 0 && <pre className="text-center opacity-50 p-4">Waiting for activity...</pre>}
                        {logs.map((log, i) => (
                            <pre
                                key={i}
                                data-prefix=">"
                                className={
                                    log.includes('ERROR') ? 'text-error' :
                                        log.includes('✅') || log.includes('Success') ? 'text-success' :
                                            log.includes('WARN') ? 'text-warning' : ''
                                }
                            >
                                <code>{log}</code>
                            </pre>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                </div>
            </div>

            {/* Backup Service Selector Modal */}
            {showBackupModal && (
                <dialog open className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4">Select Services to Backup</h3>

                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm opacity-70">{selectedServices.length} selected</span>
                            <button className="btn btn-ghost btn-sm" onClick={selectAll}>
                                {selectedServices.length === services.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                            {services.map(service => (
                                <label
                                    key={service.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedServices.includes(service.id) ? 'border-primary bg-primary/10' : 'border-base-300 hover:border-primary/50'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-primary"
                                        checked={selectedServices.includes(service.id)}
                                        onChange={() => toggleService(service.id)}
                                    />
                                    <span className="text-xl">{service.icon}</span>
                                    <div className="flex-1">
                                        <div className="font-medium">{service.name}</div>
                                        <div className="text-xs opacity-60">{service.database ? `DB: ${service.database.name}` : 'No database'}</div>
                                    </div>
                                    {service.isRunning ? (
                                        <span className="badge badge-success badge-sm">Online</span>
                                    ) : (
                                        <span className="badge badge-error badge-sm">Offline</span>
                                    )}
                                </label>
                            ))}
                        </div>

                        <div className="modal-action">
                            <button className="btn btn-ghost" onClick={() => setShowBackupModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={runBackup}>
                                <Play size={16} /> Start Backup
                            </button>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button onClick={() => setShowBackupModal(false)}>close</button>
                    </form>
                </dialog>
            )}
        </div>
    );
}
