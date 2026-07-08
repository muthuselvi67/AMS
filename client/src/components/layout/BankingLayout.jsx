import React, { Suspense, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Bell, Moon, Sun, LogOut, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';
import '../../BankingTheme.css';

const BankingLayout = () => {
    const { user } = useAuth();
    const [theme, setTheme] = React.useState('light');
    const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');
    const navigate = useNavigate();

    // Import the CSS dynamically or just rely on the import above
    useEffect(() => {
        // Add banking class to body for global scoping if needed, 
        // but we'll use a container class
        document.body.classList.add('banking-mode');
        return () => document.body.classList.remove('banking-mode');
    }, []);

    const handleLogout = () => {
        window.dispatchEvent(new Event('auth:logout'));
    };

    return (
        <div className="banking-layout">
            <header className="banking-header">
                <div className="banking-brand" onClick={() => navigate('/banking-dashboard')} style={{ cursor: 'pointer' }}>
                    <div className="brand-icon">
                        <Wallet size={20} />
                    </div>
                    FinBank AI
                </div>

                <div className="banking-header-actions">
                    <button className="banking-icon-btn" title="Notifications">
                        <Bell size={20} />
                        <span style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, background: 'var(--bank-danger)', borderRadius: '50%' }}></span>
                    </button>
                    
                    <button className="banking-icon-btn" onClick={toggleTheme} title="Toggle Dark Mode">
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    <button className="banking-icon-btn" onClick={handleLogout} title="Logout" style={{ color: 'var(--bank-danger)' }}>
                        <LogOut size={20} />
                    </button>

                    <div style={{ width: 1, height: 24, background: 'var(--bank-border)', margin: '0 8px' }}></div>

                    <img 
                        src={user?.avatar ? user.avatar : "https://ui-avatars.com/api/?name=" + (user?.name || "User") + "&background=3B82F6&color=fff"} 
                        alt="Profile" 
                        className="banking-avatar"
                    />
                </div>
            </header>

            <main className="banking-main fade-in">
                <Suspense fallback={<div style={{ height: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner /></div>}>
                    <Outlet />
                </Suspense>
            </main>
        </div>
    );
};

export default BankingLayout;
