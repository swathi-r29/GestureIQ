import React from 'react';
import StaffSidebar from './StaffSidebar';

const StaffLayout = ({ children }) => {
    return (
        <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
            <StaffSidebar />
            <main className="flex-1 ml-64 p-8 min-h-screen relative">
                <div className="max-w-7xl mx-auto relative">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default StaffLayout;
