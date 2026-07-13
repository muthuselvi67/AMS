import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, LogOut, User, Settings, Lock, X, ShieldCheck, ChevronLeft, Sun, Moon, Clock, Calendar, CheckCircle, XCircle, Briefcase, Cake } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api, { getServerUrl } from '../../api/axios';
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
    '/admin/meetings/schedule': { title: 'Meeting Schedule', sub: 'Manage your meetings and appointments' },
    '/hr/meetings/schedule': { title: 'Meeting Schedule', sub: 'Manage your meetings and appointments' },
    '/hr/appraisals': { title: 'Appraisals', sub: 'Manage employee performance appraisals' },
    '/hr/pm-appraisals': { title: 'PM Appraisals', sub: 'Manage project manager appraisals' },
    '/admin/appraisals': { title: 'Appraisals', sub: 'Manage employee performance appraisals' },
    '/admin/pm-appraisals': { title: 'PM Appraisals', sub: 'Manage project manager appraisals' },
    '/employee/dashboard': { title: 'My Dashboard', sub: 'Your leave and attendance overview' },
    '/employee/profile': { title: 'My Profile', sub: 'View and update your information' },
    '/admin/profile': { title: 'My Profile', sub: 'View and update your information' },
    '/hr/profile': { title: 'My Profile', sub: 'View and update your information' },
    '/employee/apply-leave': { title: 'Apply Leave', sub: 'Submit a new leave request' },
    '/employee/leave-history': { title: 'Leave History', sub: 'Track your leave requests' },
    '/employee/assigned-tasks': { title: 'Assigned Task Status', sub: 'Manage handovers' },
    '/employee/wfh-policy': { title: 'WFH Policy', sub: 'Work from home guidelines' },
    '/employee/attendance': { title: 'Attendance', sub: 'View your attendance records' },
    '/employee/notifications': { title: 'Notifications', sub: 'Your latest updates' },
    '/admin/my-attendance': { title: 'My Attendance', sub: 'Log your daily attendance' },
    '/hr/my-attendance': { title: 'My Attendance', sub: 'Log your daily attendance' },
    '/pm/my-attendance': { title: 'My Attendance', sub: 'Log your daily attendance' },
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
        } else if (n.type === 'attendance') {
            navigate(`${prefix}/regularization`);
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
                <div className="header-title">
                    {!location.pathname.endsWith('/dashboard') && (
                        <button className="header-btn" onClick={() => navigate(-1)} title="Go back">
                            <ChevronLeft size={20} />
                        </button>
                    )}
                </div>
                <div className="header-actions">
                    <div style={{ position: 'relative', marginRight: unread > 0 ? '6px' : '0' }}>
                        <button className="header-btn" onClick={() => goNotifications()} title="Notifications"
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

                    {/* Profile Button — navigates directly to My Profile */}
                    <button
                        className="user-avatar-btn"
                        onClick={() => navigate(`/${user?.role?.toLowerCase()}/profile`)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                        title="My Profile"
                    >
                        {user?.avatar ? (
                            <img src={getServerUrl(user.avatar)} alt="Avatar" className="user-avatar" style={{ objectFit: 'cover' }} />
                        ) : (
                            <div className="user-avatar">{initials}</div>
                        )}
                        <div className="user-info">
                            <div className="user-name">{user?.name}</div>
                            <div className="user-role">{user?.role}</div>
                        </div>
                    </button>

                    <button className="header-btn header-logout-btn" onClick={handleLogout} title="Logout" style={{ color: '#EF4444' }}>
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
                                        user?.avatar ? <img src={getServerUrl(user.avatar)} alt="Avatar" className="profile-large-avatar" style={{ objectFit: 'cover' }} /> : <div className="profile-large-avatar">{initials}</div>
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
