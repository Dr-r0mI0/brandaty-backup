import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, User, Lock } from 'lucide-react';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await login(username, password);
            navigate('/');
        } catch {
            setError('Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-base-300 to-base-100 p-4">
            <div className="card w-full max-w-md bg-base-100 shadow-2xl">
                <div className="card-body">
                    {/* Logo */}
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                            <Shield size={32} className="text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold">Brandaty Backup</h1>
                        <p className="text-sm opacity-60">Manager v4.0</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-medium">Username</span>
                            </label>
                            <div className="input-group">
                                <span className="bg-base-200"><User size={18} /></span>
                                <input
                                    type="text"
                                    placeholder="Enter username"
                                    className="input input-bordered w-full"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-control mt-4">
                            <label className="label">
                                <span className="label-text font-medium">Password</span>
                            </label>
                            <div className="input-group">
                                <span className="bg-base-200"><Lock size={18} /></span>
                                <input
                                    type="password"
                                    placeholder="Enter password"
                                    className="input input-bordered w-full"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="alert alert-error mt-4 py-2">
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        <div className="form-control mt-6">
                            <button className="btn btn-primary" disabled={loading}>
                                {loading ? <span className="loading loading-spinner loading-sm"></span> : null}
                                Sign In
                            </button>
                        </div>
                    </form>

                    <div className="divider text-xs opacity-50">SECURE ACCESS</div>

                    <p className="text-center text-xs opacity-50">
                        Protected by enterprise-grade encryption
                    </p>
                </div>
            </div>
        </div>
    );
}
