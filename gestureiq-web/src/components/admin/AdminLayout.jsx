import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout({ children }) {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };

    return (
        <div className="min-h-screen flex transition-colors duration-500" style={{ backgroundColor: 'var(--bg)' }}>
            <AdminSidebar
                isCollapsed={isCollapsed}
                toggleCollapse={() => setIsCollapsed(!isCollapsed)}
                onLogout={handleLogout}
            />
            <main className={`flex-1 transition-all duration-500 pt-8 px-8 pb-12`}
                style={{ marginLeft: isCollapsed ? '80px' : '280px' }}>
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
