import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    Video,
    Users,
    ClipboardList,
    Megaphone,
    BarChart3,
    UserCircle,
    Settings,
    LogOut,
    ChevronRight,
    PlusCircle,
    Calendar,
    Radio
} from 'lucide-react';

const StaffSidebar = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const teacherName = user?.name || "Instructor";
    const initials = teacherName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

    const menuGroups = [
        {
            title: 'Main',
            items: [
                { name: 'Dashboard', icon: LayoutDashboard, path: '/staff/dashboard' },
            ]
        },
        {
            title: 'Classes',
            items: [
                { name: 'Create Class', icon: PlusCircle, path: '/staff/class/create' },
                { name: 'My Classes', icon: Calendar, path: '/staff/classes' },
            ]
        },
        {
            title: 'Students',
            items: [
                { name: 'All Students', icon: Users, path: '/staff/students' },
                { name: 'Requests', icon: UserCircle, path: '/staff/enrollment' },
            ]
        },
        {
            title: 'Management',
            items: [
                { name: 'Announcements', icon: Megaphone, path: '/staff/announcements' },
                { name: 'Reports', icon: BarChart3, path: '/staff/reports' },
            ]
        },
        {
            title: 'System',
            items: [
                { name: 'Profile', icon: UserCircle, path: '/staff/profile' },
                { name: 'Settings', icon: Settings, path: '/staff/settings' },
            ]
        }
    ];

    return (
        <aside className="w-64 h-screen flex flex-col fixed left-0 top-0 overflow-y-auto border-r scrollbar-hide"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text)' }}>
            <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-black/20"
                        style={{ backgroundColor: 'var(--accent)' }}>
                        <Video className="text-white w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
                            Gesture<span style={{ color: 'var(--accent)' }}>IQ</span>
                        </h1>
                        <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--accent)' }}>Staff Portal</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 py-6 px-4 space-y-8">
                {menuGroups.map((group, groupIdx) => (
                    <div key={groupIdx}>
                        <h2 className="px-4 text-[10px] font-bold uppercase tracking-widest mb-4 opacity-50"
                            style={{ color: 'var(--text-muted)' }}>
                            {group.title}
                        </h2>
                        <div className="space-y-1">
                            {group.items.map((item, itemIdx) => (
                                <NavLink
                                    key={itemIdx}
                                    to={item.path}
                                    className={({ isActive }) => `
                    flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group
                    ${isActive
                                            ? 'text-white shadow-lg shadow-accent/20'
                                            : 'hover:bg-accent hover:text-white'}
                  `}
                                    style={({ isActive }) => isActive ? { backgroundColor: 'var(--accent)' } : {}}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon size={20} className="transition-transform duration-200 group-hover:scale-110 opacity-70 group-hover:opacity-100" />
                                        <span className="font-medium">{item.name}</span>
                                    </div>
                                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-40 transition-opacity" />
                                </NavLink>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3 px-4 py-3 mb-2 rounded-xl bg-black/5 dark:bg-white/5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white"
                        style={{ backgroundColor: 'var(--accent)' }}>
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: 'var(--text)' }}>{teacherName}</p>
                        <p className="text-[10px] truncate opacity-50" style={{ color: 'var(--text-muted)' }}>Staff Member</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        logout();
                        navigate('/login');
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-all duration-200"
                >
                    <LogOut size={20} />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default StaffSidebar;
