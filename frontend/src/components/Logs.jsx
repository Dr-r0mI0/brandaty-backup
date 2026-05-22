import { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, FileText, Trash2 } from 'lucide-react';

export default function Logs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/backup/logs');
            setLogs(res.data);
        } catch (e) {
            console.error('Failed to load logs:', e);
            setLogs(['Failed to load logs. Check server connection.']);
        } finally {
            setLoading(false);
        }
    };

    const getLogClass = (log) => {
        if (log.includes('[ERROR]')) return 'text-error';
        if (log.includes('[ACTION]')) return 'text-info';
        if (log.includes('[BACKUP]') || log.includes('[RESTORE]')) return 'text-success';
        return '';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <FileText size={28} /> System Logs
                </h1>
                <button className="btn btn-ghost btn-sm" onClick={fetchLogs} disabled={loading}>
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            <div className="mockup-code bg-neutral text-neutral-content min-h-[500px] max-h-[70vh] overflow-y-auto">
                {loading && (
                    <div className="flex justify-center p-8">
                        <span className="loading loading-dots loading-lg"></span>
                    </div>
                )}
                {!loading && logs.length === 0 && (
                    <pre className="text-center opacity-50 p-4">No logs available yet</pre>
                )}
                {!loading && logs.map((log, i) => (
                    <pre key={i} data-prefix={logs.length - i} className={getLogClass(log)}>
                        <code>{log}</code>
                    </pre>
                ))}
            </div>
        </div>
    );
}
