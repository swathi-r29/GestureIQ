// src/components/Navbar.jsx

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Download } from 'lucide-react';

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
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

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

                    <div className="h-4 w-px mx-2 opacity-20 bg-current" style={{ color: 'var(--text-muted)' }} />

                    <button
                        onClick={handleInstallClick}
                        className={`flex items-center gap-2 px-3 py-1.5 text-[10px] tracking-[2px] uppercase font-bold rounded-lg border-2 border-dashed transition-all group ${!deferredPrompt ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:bg-accent hover:text-white'}`}
                        style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
                        title={deferredPrompt ? 'Install App' : 'App already installed or not supported by browser'}
                    >
                        <Download size={14} className={deferredPrompt ? "group-hover:animate-bounce" : ""} />
                        Download App
                    </button>

                    {/* Theme toggle */}
                    <button onClick={toggle}
                        className="ml-2 p-2 rounded-full transition-all"
                        style={{ backgroundColor: 'var(--bg-card2)', color: 'var(--text-muted)' }}>
                        {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                    </button>

                    {user ? (
                        <div className="flex items-center gap-3 ml-3 pl-3 border-l" style={{ borderColor: 'var(--border)' }}>
                            <Link
                                to="/profile"
                                className="text-xs tracking-widest font-black uppercase hover:text-accent transition-colors"
                                style={{ color: location.pathname === '/profile' ? 'var(--accent)' : 'var(--text-muted)' }}
                            >
                                {user.name}
                            </Link>
                            <button onClick={() => { logout(); navigate('/login'); }}
                                className="px-3 py-1.5 text-xs tracking-widest uppercase border rounded transition-all hover:bg-red-500 hover:text-white hover:border-red-500"
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
