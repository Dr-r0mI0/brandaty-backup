import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Lock } from 'lucide-react';

export default function Settings() {
    const [settings, setSettings] = useState({
        retention_days: 7,
        cron_hour: '4',
        cron_days: [0, 1, 2, 3, 4, 5, 6] // 0=Sun, 6=Sat
    });

    // Auth UI state
    const [password, setPassword] = useState('');
    const [msg, setMsg] = useState('');
    const [pwdMsg, setPwdMsg] = useState('');

    useEffect(() => {
        axios.get('/api/settings').then(res => {
            const cronParts = (res.data.cron_schedule || '0 4 * * *').split(' ');
            // Parse simplified Cron: MIN HOUR DOM MONTH DOW
            // We assume MIN is always 0 for UI simplicity
            const hour = cronParts[1] || '4';
            const dow = cronParts[4] || '*';

            let days = [0, 1, 2, 3, 4, 5, 6];
            if (dow !== '*') {
                days = dow.split(',').map(Number);
            }

            setSettings({
                retention_days: res.data.retention_days || 7,
                cron_hour: hour,
                cron_days: days
            });
        });
    }, []);

    const handleSave = async () => {
        const cron = `0 ${settings.cron_hour} * * ${settings.cron_days.length === 7 ? '*' : settings.cron_days.join(',')}`;

        try {
            await axios.post('/api/settings', {
                retention_days: settings.retention_days,
                cron_schedule: cron
            });
            setMsg('Settings saved successfully!');
        } catch {
            setMsg('Error saving settings.');
        }
    };

    const toggleDay = (day) => {
        if (settings.cron_days.includes(day)) {
            setSettings({ ...settings, cron_days: settings.cron_days.filter(d => d !== day) });
        } else {
            setSettings({ ...settings, cron_days: [...settings.cron_days, day].sort() });
        }
    };

    const handleChangePassword = async () => {
        try {
            await axios.post('/api/auth/change-password', { newPassword: password });
            setPwdMsg('Password updated!');
            setPassword('');
        } catch {
            setPwdMsg('Failed to update password');
        }
    };

    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* General Settings */}
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <h2 className="card-title mb-6">Backup Configuration</h2>

                    <div className="form-control w-full">
                        <label className="label"><span className="label-text">Retention Policy (Days)</span></label>
                        <input
                            type="number"
                            className="input input-bordered w-full"
                            value={settings.retention_days}
                            onChange={e => setSettings({ ...settings, retention_days: e.target.value })}
                        />
                    </div>

                    <div className="divider">Schedule</div>

                    <div className="form-control w-full">
                        <label className="label"><span className="label-text">Run at Hour (24h)</span></label>
                        <select
                            className="select select-bordered"
                            value={settings.cron_hour}
                            onChange={e => setSettings({ ...settings, cron_hour: e.target.value })}
                        >
                            {[...Array(24).keys()].map(h => <option key={h} value={h}>{h}:00</option>)}
                        </select>
                    </div>

                    <div className="form-control w-full mt-4">
                        <label className="label"><span className="label-text">Days of Week</span></label>
                        <div className="flex gap-2 flex-wrap">
                            {DAYS.map((d, i) => (
                                <button
                                    key={d}
                                    className={`btn btn-sm ${settings.cron_days.includes(i) ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => toggleDay(i)}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>

                    {msg && <div className="alert alert-success mt-4 p-2"><span>{msg}</span></div>}

                    <div className="card-actions justify-end mt-6">
                        <button className="btn btn-primary" onClick={handleSave}>
                            <Save size={16} /> Save Changes
                        </button>
                    </div>
                </div>
            </div>

            {/* Security Settings */}
            <div className="card bg-base-100 shadow-xl h-fit">
                <div className="card-body">
                    <h2 className="card-title mb-6">Security</h2>

                    <div className="form-control w-full">
                        <label className="label"><span className="label-text">New Admin Password</span></label>
                        <div className="join">
                            <input
                                type="password"
                                className="input input-bordered join-item w-full"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter new password"
                            />
                            <button className="btn btn-secondary join-item" onClick={handleChangePassword}>
                                <Lock size={16} /> Update
                            </button>
                        </div>
                    </div>
                    {pwdMsg && <div className="alert alert-info mt-4 p-2"><span>{pwdMsg}</span></div>}
                </div>
            </div>
        </div>
    );
}
