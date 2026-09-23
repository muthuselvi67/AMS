import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Clock, ShieldCheck, UserPlus, FileText, AlertTriangle, CheckCircle, Info, XCircle, CheckCheck, ShieldAlert, Siren, LifeBuoy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const typeIcons = {
    leave_applied: <FileText size={18} color="var(--primary)" />,
    leave_approved: <CheckCircle size={18} color="var(--secondary)" />,
    leave_rejected: <XCircle size={18} color="var(--danger)" />,
    leave_cancelled: <Clock size={18} color="var(--text-muted)" />,
    attendance: <Clock size={18} color="var(--purple)" />,
    allowance_applied: <FileText size={18} color="var(--primary)" />,
    allowance_approved: <CheckCircle size={18} color="var(--secondary)" />,
    allowance_rejected: <XCircle size={18} color="var(--danger)" />,
    safety: <ShieldAlert size={18} color="#F43F5E" />,
    emergency: <Siren size={18} color="#EF4444" />,
    helpdesk: <LifeBuoy size={18} color="#3B82F6" />,
    complaint: <AlertTriangle size={18} color="#F59E0B" />,
    general: <Info size={18} color="var(--text-muted)" />
};
const typeColors = {
    leave_applied: 'var(--primary-light)',
    leave_approved: 'var(--secondary-light)',
    leave_rejected: 'var(--danger-light)',
    leave_cancelled: 'var(--bg-light)',
    attendance: 'var(--purple-light)',
    allowance_applied: 'var(--primary-light)',
    allowance_approved: 'var(--secondary-light)',
    allowance_rejected: 'var(--danger-light)',
    safety: 'rgba(244, 63, 94, 0.15)',
    emergency: 'rgba(239, 68, 68, 0.2)',
    helpdesk: 'rgba(59, 130, 246, 0.15)',
    complaint: 'rgba(245, 158, 11, 0.15)',
    general: 'var(--bg-light)'
};

const NotificationsPage = () => {
    const [notifs, setNotifs] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuth();

    const loadNotifications = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/notifications');
            setNotifs(Array.isArray(data.data?.notifications) ? data.data.notifications : []);
        } catch {
            toast.error('Failed to load notifications');
            setNotifs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadNotifications(); }, []);

    const markRead = async (id) => {
        await api.put(`/notifications/${id}/read`);
        setNotifs(n => n.map(x => x.id === id ? { ...x, isRead: true } : x));
    };

    const markAll = async () => {
        await api.put('/notifications/read-all');
        setNotifs(n => n.map(x => ({ ...x, isRead: true })));
        toast.success('All notifications marked as read');
    };

    const handleNotifClick = (n) => {
        if (!n.isRead) markRead(n.id);
        const role = user?.role?.toLowerCase() || 'admin';
        const rolePrefix = `/${role}`;

        const titleLower = (n.title || '').toLowerCase();
        const msgLower = (n.message || '').toLowerCase();
        const typeLower = (n.type || '').toLowerCase();

        // 1. Emergency / SOS alerts
        if (typeLower === 'emergency' || titleLower.includes('sos') || titleLower.includes('emergency') || msgLower.includes('sos') || msgLower.includes('emergency')) {
            navigate(`${rolePrefix}/women-safety`, { state: { activeTab: 'emergency', id: n.relatedId } });
        }
        // 2. Safety / Workplace complaints / POSH / Environmental
        else if (typeLower === 'safety' || n.relatedModel === 'women_safety' || titleLower.includes('safety') || titleLower.includes('posh') || msgLower.includes('safety complaint') || msgLower.includes('posh')) {
            navigate(`${rolePrefix}/women-safety`, { state: { activeTab: 'reports', reportId: n.relatedId } });
        }
        // 3. Regularization
        else if (titleLower.includes('regularization') || msgLower.includes('regularization') || typeLower.includes('regularization')) {
            navigate(`${rolePrefix}/regularization`);
        }
        // 4. Attendance
        else if (titleLower.includes('check-in') || titleLower.includes('check-out') || msgLower.includes('check-in') || msgLower.includes('check-out') || typeLower === 'attendance') {
            navigate(`${rolePrefix}/attendance`);
        }
        // 5. HelpDesk Support Tickets
        else if (typeLower === 'helpdesk' || typeLower === 'complaint' || n.relatedModel === 'tickets' || titleLower.includes('helpdesk') || titleLower.includes('ticket')) {
            navigate(`${rolePrefix}/helpdesk`, { state: { ticketId: n.relatedId } });
        }
        // 6. Leave Requests
        else if (typeLower === 'leave_applied' || titleLower.includes('leave')) {
            if (role === 'employee') {
                navigate(`${rolePrefix}/leave-history`);
            } else {
                navigate(`${rolePrefix}/leave-requests`);
            }
        }
        // 7. Allowance Requests
        else if (typeLower.includes('allowance') || titleLower.includes('allowance')) {
            if (role === 'employee') {
                navigate(`${rolePrefix}/allowance-history`);
            } else {
                navigate(`${rolePrefix}/allowance-review`);
            }
        }
        // 8. Task Handovers
        else if (n.relatedModel === 'task_handovers' || msgLower.includes('handover') || titleLower.includes('task')) {
            if (role === 'employee') {
                navigate(`${rolePrefix}/assigned-tasks`);
            } else {
                navigate(`${rolePrefix}/tasks`);
            }
        }
    };

    const timeAgo = (d) => {
        const diff = Date.now() - new Date(d);
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'Just now';
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        return Math.floor(h / 24) + 'd ago';
    };

    const unread = notifs.filter(n => !n.isRead).length;

    return (
        <div className="fade-in">
            <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <h1>Notifications {unread > 0 && <span style={{ fontSize: '1rem', background: 'var(--danger)', color: 'white', padding: '2px 10px', borderRadius: 20, marginLeft: 8 }}>{unread}</span>}</h1>
                    <p>Stay updated with important activities</p>
                </div>
                {unread > 0 && (
                    <button className="btn btn-secondary btn-sm" onClick={markAll}><CheckCheck size={14} /> Mark all read</button>
                )}
            </div>

            {loading ? (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Notification Details</th>
                                    <th>Received</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array(5).fill(0).map((_, i) => (
                                    <tr key={i}>
                                        {Array(5).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" /></td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : notifs.length === 0 ? (
                <div className="card">
                    <div className="empty-state" style={{ padding: '60px 20px' }}>
                        <div className="empty-state-icon" style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
                            <Bell size={48} />
                        </div>
                        <h3>No notifications yet</h3>
                        <p>Activity notifications will appear here</p>
                    </div>
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Notification Details</th>
                                    <th>Received</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {notifs.map(n => (
                                    <tr 
                                        key={n.id} 
                                        onClick={() => handleNotifClick(n)}
                                        style={{ 
                                            cursor: 'pointer',
                                            backgroundColor: n.isRead ? 'transparent' : 'rgba(155, 124, 253, 0.05)'
                                        }}
                                    >
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ 
                                                    background: typeColors[n.type] || 'var(--bg-light)', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: '50%',
                                                    flexShrink: 0
                                                }}>
                                                    {typeIcons[n.type] || <Bell size={15} />}
                                                </div>
                                                <span style={{ fontWeight: 600, fontSize: 12.5, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                                                    {n.type ? n.type.replace('_', ' ') : 'general'}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div>
                                                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13.5 }}>{n.title}</div>
                                                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>{n.message}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                {timeAgo(n.createdAt)}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${n.isRead ? 'badge-approved' : 'badge-pending'}`}>
                                                <span className="badge-dot" />
                                                {n.isRead ? 'Read' : 'Unread'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationsPage;
