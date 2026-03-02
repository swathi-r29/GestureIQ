// src/components/Navbar.jsx

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const Lotus = () => (
    <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
        <ellipse cx="50" cy="70" rx="12" ry="20" fill="var(--accent)" opacity="0.7" transform="rotate(-30 50 70)" />
        <ellipse cx="50" cy="70" rx="12" ry="20" fill="var(--accent)" opacity="0.7" transform="rotate(30 50 70)" />
        <ellipse cx="50" cy="60" rx="10" ry="24" fill="var(--accent)" />
        <circle cx="50" cy="72" r="8" fill="var(--accent)" />
        <circle cx="50" cy="72" r="4" fill="var(--bg)" opacity="0.6" />
    </svg>
);

export default function Navbar() {
    const { user, logout } = useAuth();
    const { theme, toggle } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();

    const baseLinks = [
        { to: '/', label: 'Home' },
        { to: '/about', label: 'About' },
    ];

    const studentLinks = [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/detect', label: 'Detect' },
        { to: '/learn', label: 'Learn' },
        { to: '/live-classes', label: 'Live Classes' },
    ];

    const staffLinks = [
        { to: '/staff/live-classes', label: 'Live Classes' },
    ];

    const adminLinks = [
        { to: '/admin/dashboard', label: 'Command Center' },
    ];

    let links = [...baseLinks];
    if (user) {
        if (user.role === 'admin') {
            links = [...links, ...adminLinks];
        } else if (user.role === 'staff') {
            links = [...links, ...staffLinks];
        } else if (user.role === 'student' || !user.role) {
            links = [...links, ...studentLinks];
        }
    }

    return (
        <nav className="sticky top-0 z-50 backdrop-blur-sm border-b transition-colors duration-300"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-3">
                    <Lotus />
                    <div>
                        <div className="text-base font-bold tracking-widest" style={{ color: 'var(--accent)' }}>
                            GestureIQ
                        </div>
                        <div className="text-[9px] tracking-[4px] uppercase -mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            Mudra Detection
                        </div>
                    </div>
                </Link>

                <div className="flex items-center gap-1">
                    {links.map(link => (
                        <Link key={link.to} to={link.to}
                            className="px-4 py-1.5 text-xs tracking-widest uppercase transition-all rounded"
                            style={{
                                backgroundColor: location.pathname === link.to ? 'var(--accent)' : 'transparent',
                                color: location.pathname === link.to ? '#FAF6F0' : 'var(--text-muted)',
                            }}>
                            {link.label}
                        </Link>
                    ))}

                    {/* Theme toggle */}
                    <button onClick={toggle}
                        className="ml-2 p-2 rounded-full transition-all"
                        style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--text-muted)' }}>
                        {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                    </button>

                    {user ? (
                        <div className="flex items-center gap-3 ml-3 pl-3 border-l" style={{ borderColor: 'var(--border)' }}>
                            <span className="text-xs tracking-widest" style={{ color: 'var(--text-muted)' }}>
                                {user.name}
                            </span>
                            <button onClick={() => { logout(); navigate('/login'); }}
                                className="px-3 py-1.5 text-xs tracking-widest uppercase border rounded transition-all"
                                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                                Logout
                            </button>
                        </div>
                    ) : (
                        <Link to="/login"
                            className="ml-3 px-4 py-1.5 text-xs tracking-widest uppercase rounded transition-all"
                            style={{ backgroundColor: 'var(--accent)', color: '#FAF6F0' }}>
                            Login
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
}