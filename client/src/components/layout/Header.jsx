import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, LogOut, User, Settings, Lock, X, ShieldCheck, ChevronLeft, Sun, Moon, Clock, Calendar, CheckCircle, XCircle, Briefcase, Cake } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const pageTitles = {
    '/admin/dashboard': { title: 'Dashboard', sub: 'Welcome back, here\'s what\'s happening' },
    '/admin/employees': { title: 'Employees', sub: 'Manage your team members' },
    '/admin/leave-requests': { title: 'Leave Requests', sub: 'Review and manage leave applications' },
    '/admin/leave-types': { title: 'Leave Types & Policies', sub: 'Configure leave policies' },
    '/admin/attendance': { title: 'Attendance Records', sub: 'Track employee attendance' },
    '/admin/holidays': { title: 'Company Holidays', sub: 'Manage holiday calendar' },
    '/admin/reports': { title: 'Reports & Analytics', sub: 'Export and analyze data' },
    '/admin/notifications': { title: 'Notifications', sub: 'Stay updated' },
    '/hr/dashboard': { title: 'HR Dashboard', sub: 'HR portal overview and activity' },
    '/hr/employees': { title: 'Employee Management', sub: 'Manage employees and their profiles' },
    '/hr/leave-requests': { title: 'Leave Requests', sub: 'Review and manage leave applications' },
    '/hr/leave-types': { title: 'Leave Types & Policies', sub: 'Configure leave policies' },
    '/hr/attendance': { title: 'Attendance Records', sub: 'Track employee attendance' },
    '/hr/holidays': { title: 'Company Holidays', sub: 'Manage holiday calendar' },
    '/hr/reports': { title: 'Reports & Analytics', sub: 'Export and analyze data' },
    '/hr/payroll': { title: 'Payroll & Payslips', sub: 'Manage employee payroll' },
    '/hr/notifications': { title: 'Notifications', sub: 'Stay updated' },
    '/hr/appraisals': { title: 'Appraisals', sub: 'Manage employee performance appraisals' },
    '/hr/pm-appraisals': { title: 'PM Appraisals', sub: 'Manage project manager appraisals' },
    '/admin/appraisals': { title: 'Appraisals', sub: 'Manage employee performance appraisals' },
    '/admin/pm-appraisals': { title: 'PM Appraisals', sub: 'Manage project manager appraisals' },
    '/employee/dashboard': { title: 'My Dashboard', sub: 'Your leave and attendance overview' },
    '/employee/profile': { title: 'My Profile', sub: 'View and update your information' },
    '/employee/apply-leave': { title: 'Apply Leave', sub: 'Submit a new leave request' },
    '/employee/leave-history': { title: 'Leave History', sub: 'Track your leave requests' },
    '/employee/assigned-tasks': { title: 'Assigned Task Status', sub: 'Manage handovers' },
    '/employee/wfh-policy': { title: 'WFH Policy', sub: 'Work from home guidelines' },
    '/employee/attendance': { title: 'Attendance', sub: 'View your attendance records' },
    '/employee/notifications': { title: 'Notifications', sub: 'Your latest updates' },
};


const Header = ({ onMenuClick }) => {
    const { user, logout, updateUser } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [unread, setUnread] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

    // Modals
    const [profileOpen, setProfileOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);

    // Profile Edit States
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileName, setProfileName] = useState('');
    const [profileDept, setProfileDept] = useState('');
    const [profilePos, setProfilePos] = useState('');
    const [profileAvatar, setProfileAvatar] = useState(null);
    const [updatingProfile, setUpdatingProfile] = useState(false);

    // Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [loadingPassword, setLoadingPassword] = useState(false);

    // Settings State
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
    const [emailAlerts, setEmailAlerts] = useState(true);
    const [pushNotifs, setPushNotifs] = useState(true);

    const pageInfo = pageTitles[location.pathname] || { title: 'Learnlike', sub: '' };
    const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

    useEffect(() => {
        if (profileOpen && user) {
            setProfileName(user.name || '');
            setProfileDept(user.department || '');
            setProfilePos(user.position || '');
            setProfileAvatar(user.avatar || null);
            setIsEditingProfile(false);
        }
    }, [profileOpen, user]);

    useEffect(() => {
        const fetchUnread = async () => {
            try {
                const { data } = await api.get('/notifications');
                const notifs = data.data?.notifications || [];
                setNotifications(notifs);
                const count = notifs.filter(n => !n.isRead).length;
                setUnread(count);
            } catch { }
        };
        fetchUnread();
        const interval = setInterval(fetchUnread, 30000); // Poll every 30 seconds
        return () => clearInterval(interval);
    }, [location.pathname]); // Refresh when navigating pages

    const markRead = async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(n => n.map(x => x.id === id ? { ...x, isRead: true } : x));
            setUnread(prev => Math.max(0, prev - 1));
        } catch (err) {}
    };

    const handleNotifClick = (n) => {
        if (!n.isRead) markRead(n.id);
        setNotifDropdownOpen(false);
        const prefix = `/${user?.role?.toLowerCase() || 'employee'}`;
        
        if (n.type === 'leave_applied') {
            navigate(`${prefix}/leave-requests`);
        } else if (n.type === 'allowance_applied') {
            navigate(`${prefix}/allowance-review`);
        } else if (n.type === 'leave_approved' || n.type === 'leave_rejected' || n.type === 'leave_cancelled') {
            navigate(`${prefix}/leave-history`);
        } else if (n.type === 'allowance_approved' || n.type === 'allowance_rejected') {
            navigate(`${prefix}/allowance-history`);
        } else if (n.relatedModel === 'task_handovers' || n.message?.toLowerCase().includes('handover')) {
            if (n.message?.toLowerCase().includes('assigned tasks') || n.title?.toLowerCase().includes('task handover')) {
                // If it's an assignment (they got assigned a task) -> go to assigned-tasks
                // Note: The message for requester also says "Task Handover Accepted/Rejected", so we check for 'assigned tasks' or route by role
                if (n.message?.toLowerCase().includes('assigned tasks')) {
                    navigate(`${prefix}/assigned-tasks`);
                } else {
                    navigate(`${prefix}/leave-history`);
                }
            } else {
                navigate(`${prefix}/leave-history`);
            }
        } else if (n.type === 'birthday') {
            const role = user?.role?.toLowerCase();
            if (role === 'admin' || role === 'hr') {
                navigate(`/${role}/employees`);
            } else {
                navigate(`/employee/directory`);
            }
        }
    };

    const handleThemeChange = (newTheme) => {
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        toast.success(`${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} theme applied!`);
    };

    // Apply saved theme on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }, []);

    const handleLogout = () => { logout(); navigate('/login'); };
    const goNotifications = () => navigate(`/${user?.role?.toLowerCase()}/notifications`);

    const handleSaveProfile = async () => {
        if (!profileName.trim()) {
            toast.error('Name cannot be empty');
            return;
        }

        setUpdatingProfile(true);
        try {
            const { data } = await api.put(`/users/${user.id}/profile`, {
                name: profileName,
                department: profileDept,
                position: profilePos,
                phone: user.phone || '',
                phoneSecondary: user.phoneSecondary || '',
                avatar: profileAvatar
            });
            if (data.success || data.status) {
                toast.success('Profile updated successfully');
                updateUser(data.data.user);
                setIsEditingProfile(false);
            } else {
                toast.error(data.message || 'Failed to update profile');
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Error updating profile';
            toast.error(errorMsg);
        } finally {
            setUpdatingProfile(false);
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { toast.error('Image must be less than 2MB'); return; }
            const reader = new FileReader();
            reader.onloadend = () => setProfileAvatar(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error('All fields are required');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters long');
            return;
        }

        setLoadingPassword(true);
        try {
            const { data } = await api.put('/users/change-password', {
                currentPassword,
                newPassword
            });
            if (data.success || data.status) {
                toast.success('Password changed successfully');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setPasswordOpen(false);
            } else {
                toast.error(data.message || 'Failed to update password');
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Error updating password';
            toast.error(errorMsg);
        } finally {
            setLoadingPassword(false);
        }
    };

    return (
        <>
            <header className="header">
                <button className="header-btn" onClick={onMenuClick} title="Toggle sidebar">
                    <Menu size={20} />
                </button>
                <div className="header-title" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {pageInfo.title !== 'Learnlike' && (
                        <>
                            <div>
                                <h2>{pageInfo.title}</h2>
                                <p>{pageInfo.sub}</p>
                            </div>
                        </>
                    )}
                </div>
                <div className="header-actions">
                    <div style={{ position: 'relative' }}>
                        <button className="header-btn" onClick={() => { setNotifDropdownOpen(!notifDropdownOpen); setDropdownOpen(false); }} title="Notifications"
                            style={{ position: 'relative' }}
                        >
                            <Bell size={20} />
                            {unread > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: '-6px',
                                    right: '-6px',
                                    background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                                    color: 'white',
                                    fontSize: unread > 9 ? '9px' : '10px',
                                    fontWeight: 800,
                                    minWidth: '18px',
                                    height: '18px',
                                    borderRadius: '999px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0 4px',
                                    boxShadow: '0 2px 8px rgba(239,68,68,0.5)',
                                    border: '2px solid var(--bg-card)',
                                    lineHeight: 1,
                                    animation: 'pulse 2s infinite'
                                }}>
                                    {unread > 99 ? '99+' : unread}
                                </span>
                            )}
                        </button>
                        
                        {notifDropdownOpen && (
                            <div
                                style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                                onClick={() => setNotifDropdownOpen(false)}
                            />
                        )}

                        {notifDropdownOpen && (
                            <div className="profile-dropdown-menu" style={{ 
                                width: '380px', right: -10, padding: 0, overflow: 'hidden', borderRadius: '24px', 
                                boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid var(--border-light)', 
                                transformOrigin: 'top right', animation: 'fadeInDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}>
                                <div style={{ 
                                    padding: '18px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)', 
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                    background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-light) 100%)' 
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 8, height: 24, borderRadius: 4, background: 'linear-gradient(135deg, var(--primary), #818CF8)' }} />
                                        <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Notifications</span>
                                    </div>
                                    {unread > 0 && <span style={{ fontSize: '11px', background: 'linear-gradient(135deg, #EF4444, #F87171)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontWeight: 800, boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)' }}>{unread} New</span>}
                                </div>
                                <div style={{ maxHeight: '400px', overflowY: 'auto', background: 'var(--bg-card)' }}>
                                    {notifications.length === 0 ? (
                                        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Bell size={32} opacity={0.4} />
                                            </div>
                                            <span style={{ fontWeight: 600 }}>You're all caught up!</span>
                                        </div>
                                    ) : (
                                        notifications.slice(0, 6).map(n => {
                                            const lowerTitle = (n.title || '').toLowerCase();
                                            let IconComp = Bell;
                                            let iconColor = 'var(--primary)';
                                            let iconBg = 'var(--primary-light)';
                                            
                                            if (lowerTitle.includes('approved')) { IconComp = CheckCircle; iconColor = '#10B981'; iconBg = '#D1FAE5'; }
                                            else if (lowerTitle.includes('rejected')) { IconComp = XCircle; iconColor = '#EF4444'; iconBg = '#FEE2E2'; }
                                            else if (lowerTitle.includes('leave')) { IconComp = Calendar; iconColor = '#8B5CF6'; iconBg = '#EDE9FE'; }
                                            else if (lowerTitle.includes('handover') || lowerTitle.includes('task')) { IconComp = Briefcase; iconColor = '#F59E0B'; iconBg = '#FEF3C7'; }
                                            else if (n.type === 'birthday' || lowerTitle.includes('birthday')) { IconComp = Cake; iconColor = '#EC4899'; iconBg = 'rgba(236, 72, 153, 0.15)'; }

                                            return (
                                                <div key={n.id} 
                                                    onClick={() => handleNotifClick(n)}
                                                    onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-light)'; e.currentTarget.style.transform = 'scale(1.01)'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.04)'; e.currentTarget.style.transform = 'scale(1)'; }}
                                                    style={{ 
                                                        padding: '16px 24px', 
                                                        borderBottom: '1px solid var(--border-light)', 
                                                        background: n.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.04)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                                                        display: 'flex',
                                                        gap: '16px',
                                                        position: 'relative'
                                                    }}>
                                                    {!n.isRead && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', height: '60%', width: '4px', background: 'var(--primary)', borderRadius: '0 4px 4px 0' }} />}
                                                    <div style={{ width: 42, height: 42, borderRadius: '12px', background: n.isRead ? 'var(--bg-light)' : iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(0,0,0,0.03)', boxShadow: n.isRead ? 'none' : '0 4px 12px rgba(0,0,0,0.06)', transition: 'background 0.3s' }}>
                                                        <IconComp size={18} color={n.isRead ? 'var(--text-muted)' : iconColor} strokeWidth={2.5} />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 800, fontSize: '13.5px', color: n.isRead ? 'var(--text-secondary)' : 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.2px' }}>{n.title}</div>
                                                        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{n.message}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, opacity: 0.8 }}>
                                                            <Clock size={12} strokeWidth={2.5} />
                                                            {new Date(n.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                                <div style={{ padding: '16px 24px', background: 'var(--bg-light)', borderTop: '1px solid var(--border-light)' }}>
                                    <button 
                                        onClick={() => { setNotifDropdownOpen(false); goNotifications(); }}
                                        style={{ 
                                            width: '100%', 
                                            padding: '14px', 
                                            background: 'var(--text-primary)', 
                                            border: 'none', 
                                            color: 'var(--bg-card)', 
                                            fontSize: '14px', 
                                            fontWeight: 800, 
                                            borderRadius: '12px',
                                            cursor: 'pointer', 
                                            textAlign: 'center',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                            letterSpacing: '0.3px'
                                        }}
                                        onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; }}
                                    >
                                        View All Notifications
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <button
                        className="header-btn"
                        onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
                        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        style={{
                            position: 'relative',
                            color: theme === 'dark' ? '#F59E0B' : '#6366F1',
                            transition: 'color 0.3s ease, transform 0.3s ease',
                        }}
                    >
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>

                    {/* Dropdown Container */}
                    <div style={{ position: 'relative' }}>
                        <button className="user-avatar-btn" onClick={() => setDropdownOpen(!dropdownOpen)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                            {user?.avatar ? (
                                <img src={user.avatar} alt="Avatar" className="user-avatar" style={{ objectFit: 'cover' }} />
                            ) : (
                                <div className="user-avatar">{initials}</div>
                            )}
                            <div className="user-info">
                                <div className="user-name">{user?.name}</div>
                                <div className="user-role">{user?.role}</div>
                            </div>
                        </button>

                        {/* Dropdown Overlay / Click-outside Listener */}
                        {dropdownOpen && (
                            <div
                                style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                                onClick={() => setDropdownOpen(false)}
                            />
                        )}

                        {/* Premium Dropdown Menu */}
                        {dropdownOpen && (
                            <div className="profile-dropdown-menu">
                                <div className="dropdown-user-header">
                                    {user?.avatar ? (
                                        <img src={user.avatar} alt="Avatar" className="dropdown-user-avatar" style={{ objectFit: 'cover' }} />
                                    ) : (
                                        <div className="dropdown-user-avatar">{initials}</div>
                                    )}
                                    <div className="dropdown-user-details">
                                        <div className="dropdown-user-name">{user?.name}</div>
                                        <div className="dropdown-user-role">{user?.role}</div>
                                    </div>
                                </div>
                                <div className="dropdown-divider" />
                                <button className="dropdown-item" onClick={() => { setProfileOpen(true); setDropdownOpen(false); }}>
                                    <User size={16} />
                                    <span>My Profile</span>
                                </button>
                                <button className="dropdown-item" onClick={() => { setSettingsOpen(true); setDropdownOpen(false); }}>
                                    <Settings size={16} />
                                    <span>Settings</span>
                                </button>
                                <button className="dropdown-item" onClick={() => { setPasswordOpen(true); setDropdownOpen(false); }}>
                                    <Lock size={16} />
                                    <span>Change Password</span>
                                </button>
                                <div className="dropdown-divider" />
                                <button className="dropdown-item logout-item" onClick={handleLogout}>
                                    <LogOut size={16} />
                                    <span>Logout</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {!location.pathname.endsWith('/dashboard') && (
                        <button
                            className="header-btn"
                            onClick={() => navigate(-1)}
                            title="Go back"
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: '8px', padding: '5px 10px', height: '38px', width: 'auto', background: 'transparent' }}
                        >
                            <ChevronLeft size={16} />
                            <span style={{ fontSize: '13px' }}>Back</span>
                        </button>
                    )}

                    <button className="header-btn" onClick={handleLogout} title="Logout" style={{ color: '#EF4444' }}>
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* Profile Modal */}
            {profileOpen && (
                <div className="custom-modal-overlay" onClick={() => setProfileOpen(false)}>
                    <div className="custom-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="custom-modal-header">
                            <h3>My Profile</h3>
                            <button className="close-modal-btn" onClick={() => setProfileOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="custom-modal-body">
                            <div className="profile-hero">
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                    {isEditingProfile ? (
                                        profileAvatar ? <img src={profileAvatar} alt="Avatar" className="profile-large-avatar" style={{ objectFit: 'cover' }} /> : <div className="profile-large-avatar">{initials}</div>
                                    ) : (
                                        user?.avatar ? <img src={user.avatar} alt="Avatar" className="profile-large-avatar" style={{ objectFit: 'cover' }} /> : <div className="profile-large-avatar">{initials}</div>
                                    )}
                                    {isEditingProfile && (
                                        <label style={{
                                            position: 'absolute', bottom: 5, right: 0, background: 'var(--primary)',
                                            color: 'white', width: 32, height: 32, borderRadius: '50%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', boxShadow: 'var(--shadow-md)', border: '2px solid white'
                                        }} title="Upload Photo">
                                            <span style={{ fontSize: '18px' }}>+</span>
                                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                                        </label>
                                    )}
                                </div>
                                {isEditingProfile ? (
                                    <div style={{ width: '100%', maxWidth: '280px', margin: '0 auto 10px' }}>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={profileName}
                                            onChange={e => setProfileName(e.target.value)}
                                            placeholder="Your Name"
                                            style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px' }}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <h4>{user?.name}</h4>
                                        <span className="profile-role-badge">{user?.role}</span>
                                    </>
                                )}
                            </div>
                            <div className="profile-details-grid">
                                <div className="detail-item">
                                    <span className="detail-label">Email Address</span>
                                    <span className="detail-value">{user?.email || 'N/A'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Employee ID</span>
                                    <span className="detail-value">{user?.employeeId || 'EMP-' + String(user?.id).padStart(4, '0')}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Department</span>
                                    {isEditingProfile ? (
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={profileDept}
                                            onChange={e => setProfileDept(e.target.value)}
                                            placeholder="Department"
                                            style={{ fontSize: '13px', padding: '6px 10px', marginTop: '4px' }}
                                        />
                                    ) : (
                                        <span className="detail-value">{user?.department || 'Administration'}</span>
                                    )}
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Position</span>
                                    {isEditingProfile ? (
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={profilePos}
                                            onChange={e => setProfilePos(e.target.value)}
                                            placeholder="Position"
                                            style={{ fontSize: '13px', padding: '6px 10px', marginTop: '4px' }}
                                        />
                                    ) : (
                                        <span className="detail-value">{user?.position || 'System Administrator'}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="custom-modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '16px 24px' }}>
                            {!isEditingProfile ? (
                                <button
                                    type="button"
                                    className="btn-submit"
                                    onClick={() => setIsEditingProfile(true)}
                                    style={{ padding: '8px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}
                                >
                                    Edit Profile
                                </button>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        className="btn-cancel"
                                        onClick={() => setIsEditingProfile(false)}
                                        disabled={updatingProfile}
                                        style={{ padding: '8px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-submit"
                                        onClick={handleSaveProfile}
                                        disabled={updatingProfile}
                                        style={{ padding: '8px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}
                                    >
                                        {updatingProfile ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {settingsOpen && (
                <div className="custom-modal-overlay" onClick={() => setSettingsOpen(false)}>
                    <div className="custom-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="custom-modal-header">
                            <h3>Settings & Preferences</h3>
                            <button className="close-modal-btn" onClick={() => setSettingsOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="custom-modal-body">
                            <div className="settings-section">
                                <h5>Appearance</h5>
                                <div className="theme-toggle-group">
                                    <button className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => handleThemeChange('light')}>
                                        ☀️ Light Theme
                                    </button>
                                    <button className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => handleThemeChange('dark')}>
                                        🌙 Dark Theme
                                    </button>
                                </div>
                            </div>
                            <div className="settings-section">
                                <h5>Notifications</h5>
                                <div className="setting-toggle-item">
                                    <span>Email Notifications</span>
                                    <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} />
                                </div>
                                <div className="setting-toggle-item">
                                    <span>Push Notifications</span>
                                    <input type="checkbox" checked={pushNotifs} onChange={(e) => setPushNotifs(e.target.checked)} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Password Modal */}
            {passwordOpen && (
                <div className="custom-modal-overlay" onClick={() => setPasswordOpen(false)}>
                    <div className="custom-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="custom-modal-header">
                            <h3>Change Password</h3>
                            <button className="close-modal-btn" onClick={() => setPasswordOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handlePasswordChange}>
                            <div className="custom-modal-body">
                                <div className="form-group">
                                    <label>Current Password</label>
                                    <input
                                        type={showPasswords ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        placeholder="Enter current password"
                                        required
                                        className="form-control"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>New Password</label>
                                    <input
                                        type={showPasswords ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Min 6 characters"
                                        required
                                        className="form-control"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Confirm New Password</label>
                                    <input
                                        type={showPasswords ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="Repeat new password"
                                        required
                                        className="form-control"
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                                    <input
                                        type="checkbox"
                                        id="showPass"
                                        checked={showPasswords}
                                        onChange={e => setShowPasswords(e.target.checked)}
                                    />
                                    <label htmlFor="showPass" style={{ fontSize: '13px', cursor: 'pointer', color: 'var(--text-secondary)' }}>Show Passwords</label>
                                </div>
                            </div>
                            <div className="custom-modal-footer">
                                <button type="button" className="btn-cancel" onClick={() => setPasswordOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-submit" disabled={loadingPassword}>
                                    {loadingPassword ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default Header;
