import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Clock, ShieldCheck, UserPlus, FileText, AlertTriangle, CheckCircle, Info, XCircle, CheckCheck } from 'lucide-react';
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
        const rolePrefix = `/${user?.role?.toLowerCase() || 'admin'}`;
        if (n.type === 'leave_applied') {
            navigate(`${rolePrefix}/leave-requests`);
        } else if (n.type === 'allowance_applied') {
            navigate(`${rolePrefix}/allowance-review`);
        } else if (n.relatedModel === 'task_handovers' || n.message?.toLowerCase().includes('handover')) {
            navigate(`${rolePrefix}/assigned-tasks`);
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
