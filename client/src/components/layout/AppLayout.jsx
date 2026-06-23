import React, { useState, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import LoadingSpinner from '../ui/LoadingSpinner';
import ChatBox from './ChatBox';

const AppLayout = () => {
    const [collapsed, setCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved !== null ? saved === 'true' : true; // default: collapsed
    });
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleSetCollapsed = (val) => {
        const next = typeof val === 'function' ? val(collapsed) : val;
        setCollapsed(next);
        localStorage.setItem('sidebarCollapsed', String(next));
    };

    return (
        <div className="app-layout">
            <Sidebar
                collapsed={collapsed}
                setCollapsed={handleSetCollapsed}
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
            />

            {/* Mobile overlay */}
            <div
                className={`sidebar-overlay ${mobileOpen ? 'mobile-open' : ''}`}
                onClick={() => setMobileOpen(false)}
            />

            <div className={`main-content${collapsed ? ' sidebar-collapsed' : ''}`}>
                <Header
                    onMenuClick={() => {
                        if (window.innerWidth <= 1024) setMobileOpen(true);
                        else handleSetCollapsed(c => !c);
                    }}
                />
                <main className="page-content">
                    <div className="animate-soft-slide">
                        <Suspense fallback={
                            <div style={{ height: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <LoadingSpinner />
                            </div>
                        }>
                            <Outlet />
                        </Suspense>
                    </div>
                </main>
            </div>
            <ChatBox />
        </div>
    );
};

export default AppLayout;
