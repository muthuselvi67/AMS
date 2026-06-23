import React, { useEffect, useState } from 'react';
import { FileText, Calendar } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import DashboardCalendar from '../../components/ui/DashboardCalendar';

const EmployeeDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [recentLeaves, setRecentLeaves] = useState([]);
    const [allAttendance, setAllAttendance] = useState([]);
    const [allLeaves, setAllLeaves] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [leavesRes, attsRes] = await Promise.all([
                    api.get('/leaves'),
                    api.get('/attendance')
                ]);
                const leaves = leavesRes.data.data?.leaves || leavesRes.data.data || [];
                setRecentLeaves(leaves.slice(0, 5));
                setAllLeaves(leaves);
                setAllAttendance(attsRes.data.data || []);
            } catch (err) { console.error('Dashboard fetch error:', err); }
            finally { setLoading(false); }
        };
        fetchAll();
    }, []);

    if (loading) return <div className="flex-center" style={{ height: 400 }}><LoadingSpinner /></div>;

    const statusColors = { pending_manager: 'badge-pending', pending_hr: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected', cancelled: 'badge-cancelled' };

    // Timezone-safe local today date string (YYYY-MM-DD)
    const localToday = new Date();
    const y = localToday.getFullYear();
    const m = String(localToday.getMonth() + 1).padStart(2, '0');
    const d = String(localToday.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    const presentToday = allAttendance.filter(a => a.date === todayStr);

    const leavesToday = allLeaves.filter(l => {
        if (l.status !== 'approved') return false;
        const start = l.startDate || l.start_date;
        const end = l.endDate || l.end_date;
        return start <= todayStr && end >= todayStr;
    });

    return (
        <div className="fade-in">
            <div className="page-header" style={{ marginBottom: 24 }}>
                <h1>Welcome, {user?.name?.split(' ')[0]}! </h1>
                <p>Here's your leave and attendance overview</p>
            </div>

            {/* Full-width Google Calendar */}
            <div style={{ marginBottom: 24 }}>
                <DashboardCalendar />
            </div>

            {/* Today's Overview + Recent Leaves side-by-side */}
            <div className="dashboard-top-row">
                
                {/* Today's Overview (Present & On Leave) */}
                <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div className="card-header" style={{ borderBottom: '1px solid #F0F0F0', paddingBottom: 12 }}>
                        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={18} /> Today's Overview
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{todayStr}</div>
                    </div>
                    
                    <div className="dashboard-overview-grid cols-2">
                        {/* Present Column */}
                        <div style={{ borderRight: '1px solid #F0F0F0', paddingRight: 16, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#166534', background: '#DCFCE7', padding: '2px 8px', borderRadius: 12 }}>
                                    Present ({presentToday.length})
                                </span>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {presentToday.length === 0 ? (
                                    <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>Nobody checked in yet</div>
                                ) : presentToday.map((p, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                                        <div style={{
                                            width: 24, height: 24, borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #1A73E8, #0D47A1)', color: '#fff',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10
                                        }}>
                                            {p.employee?.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                                            {p.employee?.name}
                                        </div>
                                        <span style={{ fontSize: 11, color: '#166534', fontWeight: 700 }}>
                                            {p.checkIn?.time ? new Date(p.checkIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Leave Column */}
                        <div style={{ paddingLeft: 8, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#9A3412', background: '#FFEDD5', padding: '2px 8px', borderRadius: 12 }}>
                                    On Leave ({leavesToday.length})
                                </span>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {leavesToday.length === 0 ? (
                                    <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>Nobody on leave today</div>
                                ) : leavesToday.map((l, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                                        <div style={{
                                            width: 24, height: 24, borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #AD1457, #6A1B9A)', color: '#fff',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 10
                                        }}>
                                            {(l.employee_name || l.employee?.name || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                                            {l.employee_name || l.employee?.name}
                                        </div>
                                        <span style={{ fontSize: 10, background: l.leave_type_color || l.leaveType?.color || '#1565C0', color: 'white', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                                            {l.leave_type_name || l.leaveType?.name || 'Leave'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Leave Requests */}
                <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div className="card-header">
                        <div className="card-title">Recent Leave Requests</div>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/employee/leave-history')}>View All</button>
                    </div>
                    <div style={{ flex: 1 }}>
                        {recentLeaves.length === 0 ? (
                            <div className="empty-state" style={{ padding: '24px' }}>
                                <div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><FileText size={48} /></div>
                                <h3>No leave requests yet</h3>
                                <p>Apply for your first leave below</p>
                                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/employee/apply-leave')}>Apply for Leave</button>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table>
                                    <thead><tr><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th></tr></thead>
                                    <tbody>
                                        {recentLeaves.map(l => (
                                            <tr key={l.id}>
                                                <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.leaveType?.color || '#ccc', flexShrink: 0 }} />
                                                    {l.leaveType?.name}
                                                </td>
                                                <td>{new Date(l.startDate).toLocaleDateString()}</td>
                                                <td>{new Date(l.endDate).toLocaleDateString()}</td>
                                                <td><strong>{l.numberOfDays}</strong></td>
                                                <td><span className={`badge ${statusColors[l.status]}`}><span className="badge-dot" />{l.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDashboard;
