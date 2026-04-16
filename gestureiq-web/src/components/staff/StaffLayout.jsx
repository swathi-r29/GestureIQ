import React from 'react';
import StaffSidebar from './StaffSidebar';
import { useLayout } from '../../context/LayoutContext';

const StaffLayout = ({ children }) => {
    const { sidebarHidden } = useLayout();

    return (
        <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
            {!sidebarHidden && <StaffSidebar />}
            <main className={`flex-1 transition-all duration-500 min-h-screen relative ${sidebarHidden ? 'ml-0 p-0' : 'ml-64 p-8'}`}>
                <div className={`${sidebarHidden ? 'max-w-full' : 'max-w-7xl mx-auto'} relative`}>
                    {children}
                </div>
            </main>
        </div>
    );
};

export default StaffLayout;
