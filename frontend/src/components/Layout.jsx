import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Settings, HardDrive, LogOut, FileText, Moon, Sun } from 'lucide-react';

export default function Layout() {
    const { logout, user } = useAuth();
    const location = useLocation();
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'corporate');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(theme === 'corporate' ? 'dark' : 'corporate');
    };

    return (
        <div className="drawer lg:drawer-open">
            <input id="my-drawer-2" type="checkbox" className="drawer-toggle" />
            <div className="drawer-content flex flex-col items-center bg-base-200 min-h-screen p-4 md:p-8">
                <div className="w-full max-w-7xl">
                    <div className="flex justify-between items-center lg:hidden mb-4">
                        <label htmlFor="my-drawer-2" className="btn btn-primary drawer-button">Menu</label>
                        <button className="btn btn-ghost btn-circle" onClick={toggleTheme}>
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                    </div>
                    <Outlet />
                </div>
            </div>
            <div className="drawer-side">
                <label htmlFor="my-drawer-2" className="drawer-overlay"></label>
                <div className="menu p-4 w-72 min-h-full bg-base-100 text-base-content border-r border-base-300 flex flex-col">
                    {/* Logo */}
                    <div className="mb-6 p-4 rounded-box" style={{ color: 'var(--color-logo)' }}>
                        <div className="text-3xl font-bold"> Brandaty </div>
                        <div className="text-3xl font-bold"> Backup</div>
                        <div className="text-xs opacity-80">Manager v4.0</div>
                    </div>

                    {/* User Info */}
                    <div className="mb-4 px-4 py-2 bg-base-200 rounded-lg">
                        <div className="text-sm font-medium">{user?.username || 'Admin'}</div>
                        <div className="text-xs opacity-60">Administrator</div>
                    </div>

                    {/* Navigation */}
                    <ul className="flex-1">
                        <li>
                            <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
                                <LayoutDashboard size={18} /> Dashboard
                            </Link>
                        </li>
                        <li>
                            <Link to="/backups" className={location.pathname === '/backups' ? 'active' : ''}>
                                <HardDrive size={18} /> Backups
                            </Link>
                        </li>
                        <li>
                            <Link to="/logs" className={location.pathname === '/logs' ? 'active' : ''}>
                                <FileText size={18} /> System Logs
                            </Link>
                        </li>
                        <li>
                            <Link to="/settings" className={location.pathname === '/settings' ? 'active' : ''}>
                                <Settings size={18} /> Settings
                            </Link>
                        </li>
                    </ul>

                    {/* Footer */}
                    <div className="divider my-2"></div>
                    <ul>
                        <li>
                            <button onClick={toggleTheme} className="flex items-center gap-2">
                                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                            </button>
                        </li>
                        <li>
                            <a onClick={logout} className="text-error cursor-pointer">
                                <LogOut size={18} /> Logout
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
