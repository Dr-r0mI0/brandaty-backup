import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { Trash2, Download, Upload, RefreshCw, Database, X } from 'lucide-react';

const socket = io();

export default function Backups() {
    const [backups, setBackups] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [restoreModal, setRestoreModal] = useState(null);
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreProgress, setRestoreProgress] = useState(0);
    const [restoreLogs, setRestoreLogs] = useState([]);
    const logsEndRef = useRef(null);

    useEffect(() => {
        loadBackups();

        // Listen for restore/backup logs
        socket.on('log', (msg) => {
            if (isRestoring || restoreModal) {
                setRestoreLogs(prev => [...prev, msg].slice(-50));

                // Parse progress from [X/Y] format
                const match = msg.match(/\[(\d+)\/(\d+)\]/);
                if (match) {
                    const pct = Math.round((parseInt(match[1]) / parseInt(match[2])) * 100);
                    setRestoreProgress(pct);
                }
            }
        });

        socket.on('backup_done', (success) => {
            setIsRestoring(false);
            setRestoreProgress(100);
            loadBackups();
            setRestoreLogs(prev => [...prev, success ? '✅ Operation Complete!' : '❌ Operation Failed']);
            setTimeout(() => setRestoreProgress(0), 3000);
        });

        return () => {
            socket.off('log');
            socket.off('backup_done');
        };
    }, [isRestoring, restoreModal]);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [restoreLogs]);

    const loadBackups = async () => {
        try {
            const res = await axios.get('/api/backup');
            setBackups(res.data);
        } catch (e) {
            console.error('Failed to load backups:', e);
        }
    };

    const handleDelete = async (name) => {
        if (!confirm('Are you sure you want to delete this backup?')) return;
        try {
            await axios.delete(`/api/backup/${name}`);
            loadBackups();
        } catch {
            alert('Failed to delete');
        }
    };

    const openRestoreModal = (backup) => {
        setRestoreModal(backup);
        setRestoreLogs([]);
        setRestoreProgress(0);
    };

    const handleRestore = async (backupName, serviceId) => {
        setIsRestoring(true);
        setRestoreLogs([`🔄 Starting restore of ${serviceId}...`]);
        setRestoreProgress(5);

        try {
            await axios.post(`/api/backup/restore/${backupName}/${serviceId}`);
        } catch {
            setRestoreLogs(prev => [...prev, '❌ Failed to start restore']);
            setIsRestoring(false);
        }
    };

    const handleDownload = (name) => {
        window.open(`/api/backup/download/${name}`, '_blank');
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        try {
            await axios.post('/api/backup/import', formData);
            loadBackups();
            alert('Backup imported successfully!');
        } catch {
            alert('Upload failed');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Backup Archives</h1>
                <div className="flex gap-2">
                    <input
                        type="file"
                        id="upload"
                        className="hidden"
                        accept=".zip"
                        onChange={handleUpload}
                    />
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => document.getElementById('upload').click()}
                        disabled={uploading}
                    >
                        {uploading ? <span className="loading loading-spinner loading-sm"></span> : <Upload size={16} />}
                        Import Zip
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={loadBackups}>
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto bg-base-100 shadow-xl rounded-box">
                <table className="table table-zebra">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Name</th>
                            <th>Size</th>
                            <th>Services</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {backups.length === 0 && (
                            <tr><td colSpan="5" className="text-center p-8 opacity-50">No backups found</td></tr>
                        )}
                        {backups.map((backup) => (
                            <tr key={backup.name}>
                                <td className="whitespace-nowrap">{new Date(backup.date).toLocaleString()}</td>
                                <td className="font-mono text-xs">{backup.name}</td>
                                <td><span className="badge badge-neutral">{backup.size}</span></td>
                                <td>
                                    <div className="flex gap-1 flex-wrap">
                                        {backup.services?.map(s => (
                                            <span key={s.id} className="badge badge-outline badge-sm">{s.icon} {s.name}</span>
                                        ))}
                                    </div>
                                </td>
                                <td>
                                    <div className="flex justify-end gap-1">
                                        <div className="tooltip" data-tip="Restore">
                                            <button className="btn btn-warning btn-xs" onClick={() => openRestoreModal(backup)}>
                                                <Database size={14} />
                                            </button>
                                        </div>
                                        <div className="tooltip" data-tip="Download">
                                            <button className="btn btn-primary btn-xs" onClick={() => handleDownload(backup.name)}>
                                                <Download size={14} />
                                            </button>
                                        </div>
                                        <div className="tooltip" data-tip="Delete">
                                            <button className="btn btn-ghost btn-xs text-error" onClick={() => handleDelete(backup.name)}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Restore Modal with Progress */}
            {restoreModal && (
                <dialog open className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => { setRestoreModal(null); setIsRestoring(false); }}>
                            <X size={16} />
                        </button>
                        <h3 className="font-bold text-lg mb-4">Restore from {restoreModal.name}</h3>

                        {!isRestoring ? (
                            <>
                                <p className="text-sm opacity-70 mb-4">Select a service to restore. This will overwrite current data.</p>

                                <div className="grid grid-cols-1 gap-2">
                                    {/* All services option */}
                                    <button
                                        className="btn btn-primary justify-start gap-2"
                                        onClick={() => handleRestore(restoreModal.name, 'all')}
                                    >
                                        <span className="text-xl">🔄</span>
                                        Restore All Services
                                    </button>

                                    <div className="divider my-1 text-xs">Or select individual service</div>

                                    {/* Individual service buttons */}
                                    {restoreModal.services?.map(service => (
                                        <button
                                            key={service.id}
                                            className="btn btn-outline justify-start gap-2"
                                            onClick={() => handleRestore(restoreModal.name, service.id)}
                                        >
                                            <span className="text-xl">{service.icon}</span>
                                            {service.name}
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Progress Bar */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="font-medium">Restoring...</span>
                                        <span className="font-bold">{restoreProgress}%</span>
                                    </div>
                                    <progress
                                        className={`progress w-full h-3 ${restoreProgress === 100 ? 'progress-success' : 'progress-warning'}`}
                                        value={restoreProgress}
                                        max="100"
                                    ></progress>
                                </div>

                                {/* Live Console */}
                                <div className="mockup-code bg-neutral text-neutral-content h-48 overflow-y-auto text-xs">
                                    {restoreLogs.map((log, i) => (
                                        <pre
                                            key={i}
                                            data-prefix=">"
                                            className={
                                                log.includes('ERROR') ? 'text-error' :
                                                    log.includes('✅') || log.includes('Successfully') ? 'text-success' :
                                                        log.includes('WARN') ? 'text-warning' : ''
                                            }
                                        >
                                            <code>{log}</code>
                                        </pre>
                                    ))}
                                    <div ref={logsEndRef} />
                                </div>

                                {restoreProgress === 100 && (
                                    <div className="modal-action">
                                        <button className="btn btn-primary" onClick={() => { setRestoreModal(null); setIsRestoring(false); }}>
                                            Done
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button onClick={() => { setRestoreModal(null); setIsRestoring(false); }}>close</button>
                    </form>
                </dialog>
            )}
        </div>
    );
}
