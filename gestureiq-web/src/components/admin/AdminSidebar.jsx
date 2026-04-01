import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
    LayoutDashboard,
    Image as ImageIcon,
    Users,
    GraduationCap,
    Video,
    Award,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronLeft,
    ChevronRight,
    Gamepad
} from 'lucide-react';

const Lotus = () => (
    <svg width="24" height="24" viewBox="0 0 100 100" fill="none">
        <ellipse cx="50" cy="70" rx="12" ry="20" fill="var(--accent)" opacity="0.7" transform="rotate(-30 50 70)" />
        <ellipse cx="50" cy="70" rx="12" ry="20" fill="var(--accent)" opacity="0.7" transform="rotate(30 50 70)" />
        <ellipse cx="50" cy="60" rx="10" ry="24" fill="var(--accent)" />
    </svg>
);

export default function AdminSidebar({ isCollapsed, toggleCollapse, onLogout }) {
    const location = useLocation();
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        fetchPendingCount();
    }, []);

    const fetchPendingCount = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/admin/staff/pending', {
                headers: { 'x-auth-token': token }
            });
            setPendingCount(res.data.length || 0);
        } catch (err) {
            console.error('Failed to fetch pending count', err);
        }
    };

    const navItems = [
        { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/admin/mudra-content', icon: ImageIcon, label: 'Mudra Content' },
        { to: '/admin/staff-approvals', icon: Users, label: 'Staff Approvals', badge: pendingCount },
        { to: '/admin/students', icon: GraduationCap, label: 'Students' },
        { to: '/admin/live-classes', icon: Video, label: 'Live Classes' },
        { to: '/admin/certificates', icon: Award, label: 'Certificates' },
        { to: '/admin/settings', icon: Settings, label: 'Settings' }
    ];

    return (
        <aside className={`fixed top-0 left-0 h-full z-50 transition-all duration-500 border-r flex flex-col`}
            style={{
                width: isCollapsed ? '80px' : '280px',
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border)'
            }}>

            {/* Header */}
            <div className="p-6 flex items-center justify-between border-b overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                {!isCollapsed && (
                    <div className="flex items-center gap-3 animate-fadeIn">
                        <Lotus />
                        <div>
                            <span className="text-sm font-bold tracking-widest block" style={{ color: 'var(--accent)' }}>Admin</span>
                            <span className="text-[9px] tracking-[4px] uppercase opacity-50 block" style={{ color: 'var(--text-muted)' }}>GestureIQ</span>
                        </div>
                    </div>
                )}
                {isCollapsed && <div className="mx-auto"><Lotus /></div>}
            </div>

            {/* Navigation */}
            <div className="flex-1 py-10 px-4 space-y-2 overflow-y-auto overflow-x-hidden">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.to;
                    return (
                        <Link key={item.to} to={item.to}
                            className={`flex items-center gap-4 p-4 rounded-xl transition-all relative group`}
                            style={{
                                backgroundColor: isActive ? 'var(--bg-card2)' : 'transparent',
                                color: isActive ? 'var(--accent)' : 'var(--text-muted)'
                            }}>
                            <item.icon size={20} className={`shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />

                            {!isCollapsed && (
                                <span className="text-xs font-bold tracking-widest uppercase truncate animate-fadeIn">
                                    {item.label}
                                </span>
                            )}

                            {/* Badge */}
                            {item.badge > 0 && (
                                <div className={`absolute ${isCollapsed ? 'top-2 right-2' : 'right-4 top-1/2 -translate-y-1/2'} flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-600 text-white text-[10px] font-bold px-1`}>
                                    {item.badge}
                                </div>
                            )}

                            {/* Tooltip for collapsed mode */}
                            {isCollapsed && (
                                <div className="absolute left-20 bg-black text-white text-[10px] px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-[60]">
                                    {item.label}
                                </div>
                            )}

                            {isActive && (
                                <div className="absolute left-0 w-1 h-1/2 bg-accent rounded-r-full top-1/4"></div>
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* Footer / Logout */}
            <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <button onClick={onLogout}
                    className="flex items-center gap-4 w-full p-4 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all group overflow-hidden">
                    <LogOut size={20} className="shrink-0 group-hover:-translate-x-1 transition-transform" />
                    {!isCollapsed && (
                        <span className="text-xs font-bold tracking-widest uppercase truncate animate-fadeIn">
                            Logout System
                        </span>
                    )}
                </button>
            </div>

            {/* Collapse Toggle Button */}
            <button onClick={toggleCollapse}
                className="absolute -right-3 top-20 w-6 h-6 rounded-full border flex items-center justify-center transition-all hover:scale-110 z-[60]"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </button>
        </aside>
    );
}
