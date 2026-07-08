import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Edit, Search, Filter, FileText } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';

const statusColors = { pending_manager: 'badge-pending', pending_hr: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected', cancelled: 'badge-cancelled' };
const statusLabels = { pending_manager: 'Pending', pending_hr: 'Pending HR', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled', all: 'All' };

const LeaveRequests = () => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [reviewModal, setReviewModal] = useState({ open: false, leave: null, action: null });
    const [remark, setRemark] = useState('');
    const [editDates, setEditDates] = useState({ startDate: '', endDate: '' });
    const [saving, setSaving] = useState(false);
    const [leaveTypes, setLeaveTypes] = useState([]);

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            const params = filter !== 'all' ? { status: filter } : {};
            const res = await api.get('/leaves', { params });
            // The API returns { status: true, data: { leaves: [...] } } OR { status: true, data: [...] }
            // To be safe, we check both.
            const rawData = res.data?.data;
            const leavesArray = Array.isArray(rawData) ? rawData : (rawData?.leaves || []);
            setLeaves(leavesArray);

            // Also fetch leave types to calculate total vs taken days
            const ltRes = await api.get('/leave-types');
            setLeaveTypes(ltRes.data?.data || []);
        } catch (err) { 
            console.error(err);
            toast.error('Failed to load leaves'); 
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { 
        if (user) {
            if (location.state?.filter) {
                setFilter(location.state.filter);
            } else if (filter === 'all') {
                const defaultFilter = user?.role === 'pm' ? 'pending_manager' : (['admin', 'hr'].includes(user?.role) ? 'pending_hr' : 'all');
                setFilter(defaultFilter);
            }
        }
    }, [user, location.state]);

    useEffect(() => { 
        if (user) fetchLeaves(); 
    }, [filter, user]);

    const openReview = (leave, action) => {
        setReviewModal({ open: true, leave, action });
        const currentRemark = (user?.role === 'hr') ? (leave.hr_remark || '') : (leave.manager_remark || '');
        setRemark(currentRemark);
        setEditDates({ 
            startDate: leave.startDate?.slice(0, 10) || '', 
            endDate: leave.endDate?.slice(0, 10) || '' 
        });
    };

    const handleReview = async (actionOverride) => {
        const action = actionOverride || reviewModal.action;
        setSaving(true);
        try {
            await api.put(`/leaves/${reviewModal.leave.id}`, {
                status: action,
                remark: remark,
                ...editDates
            });
            toast.success(`Leave ${action}!`);
            setReviewModal({ open: false, leave: null, action: null });
            fetchLeaves();
        } catch (err) { 
            toast.error(err.response?.data?.message || 'Failed to update leave'); 
        } finally { 
            setSaving(false); 
        }
    };

    const initials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
    const filters = ['all', 'pending_manager', 'pending_hr', 'approved', 'rejected', 'cancelled'];

    const STATUS_META = {
        all: { label: 'All', color: 'var(--primary)', rgba: 'rgba(155, 124, 253, 0.12)' },
        pending_manager: { label: 'Pending Manager', color: 'var(--warning)', rgba: 'rgba(245, 158, 11, 0.12)' },
        pending_hr: { label: 'Pending HR', color: 'var(--warning)', rgba: 'rgba(245, 158, 11, 0.12)' },
        approved: { label: 'Approved', color: 'var(--success)', rgba: 'rgba(16, 185, 129, 0.12)' },
        rejected: { label: 'Rejected', color: 'var(--danger)', rgba: 'rgba(239, 68, 68, 0.12)' },
        cancelled: { label: 'Cancelled', color: 'var(--text-muted)', rgba: 'rgba(148, 163, 184, 0.12)' }
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <div>
                    <h1>{user?.role === 'hr' ? 'HRMS: Leave Requests' : 'Leave Requests'}</h1>
                    <p>Review and manage employee leave applications</p>
                </div>
            </div>

            <div className="filter-chips">
                {filters.map(f => {
                    const meta = STATUS_META[f] || { label: f, color: 'var(--text-secondary)', rgba: 'rgba(0,0,0,0.05)' };
                    const isActive = filter === f;
                    return (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className="btn btn-sm"
                            style={{
                                background: isActive ? meta.color : 'var(--bg-card)',
                                color: isActive ? '#fff' : 'var(--text-secondary)',
                                border: `1.5px solid ${isActive ? meta.color : 'var(--border)'}`,
                                fontWeight: isActive ? 700 : 500,
                                transition: 'all 0.2s',
                            }}
                        >
                            {statusLabels[f] || meta.label}
                        </button>
                    );
                })}
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Leave Type</th>
                                <th>Dates</th>
                                <th>Days</th>
                                <th>Reason</th>
                                <th>Coverage</th>
                                <th>Remark</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i}>{Array(8).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" /></td>)}</tr>
                                ))
                            ) : leaves.length === 0 ? (
                                <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><FileText size={48} /></div><h3>No {filter.replace('_', ' ')} requests</h3></div></td></tr>
                            ) : (
                                leaves.map(leave => (
                                    <tr key={leave.id}>
                                        <td>
                                            <div 
                                                className="table-avatar" 
                                                onClick={() => openReview(leave, leave.status)}
                                                style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                                                onMouseOver={(e) => e.currentTarget.style.opacity = 0.8}
                                                onMouseOut={(e) => e.currentTarget.style.opacity = 1}
                                            >
                                                <div className="table-avatar-img">{initials(leave.employee?.name)}</div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{leave.employee?.name || 'Unknown'}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{leave.employee?.department || ''}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: leave.leaveType?.color || '#CBD5E1' }} />
                                                <span style={{ fontSize: 13 }}>{leave.leaveType?.name || 'Leave'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 13, fontWeight: 500 }}>{new Date(leave.startDate).toLocaleDateString()}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>to {new Date(leave.endDate).toLocaleDateString()}</div>
                                        </td>
                                        <td><strong>{leave.numberOfDays || leave.number_of_days}</strong></td>
                                        <td style={{ maxWidth: 150 }}><div className="truncate" title={leave.reason}>{leave.reason}</div></td>
                                        <td>
                                            {leave.handovers && leave.handovers.length > 0 ? (
                                                <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    {leave.handovers.map(h => (
                                                        <div key={h.id} style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 4 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: h.status === 'accepted' ? '#10B981' : h.status === 'rejected' ? '#EF4444' : '#F59E0B', flexShrink: 0 }} />
                                                                <span style={{ fontWeight: 600, fontSize: 12 }}>{h.assigned_to_name} - {h.status.toUpperCase()}</span>
                                                            </div>
                                                            {h.task_description && (
                                                                <div style={{ paddingLeft: 10, fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: 180, wordBreak: 'break-word', lineHeight: 1.2 }}>
                                                                    Task: {h.task_description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>-</span>
                                            )}
                                        </td>
                                        <td style={{ maxWidth: 150 }}>
                                            <div className="truncate" style={{ fontSize: 12, color: 'var(--text-muted)' }} title={leave.hr_remark || leave.manager_remark || ''}>
                                                {leave.hr_remark || leave.manager_remark || '-'}
                                            </div>
                                        </td>
                                        <td><span className={`badge ${statusColors[leave.status] || 'badge-pending'}`}><span className="badge-dot" />{statusLabels[leave.status] || leave.status}</span></td>
                                        <td>
                                            {((leave.status === 'pending_manager' && ['pm', 'admin', 'hr'].includes(user?.role)) || 
                                              (leave.status === 'pending_hr' && ['admin', 'hr'].includes(user?.role))) ? (
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button className="btn btn-success btn-sm btn-icon" onClick={() => openReview(leave, 'approved')} title="Approve"><CheckCircle size={14} /></button>
                                                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => openReview(leave, 'rejected')} title="Reject"><XCircle size={14} /></button>
                                                </div>
                                            ) : (
                                                <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openReview(leave, leave.status)} title="View Detail"><Edit size={14} /></button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Review Modal */}
            <Modal isOpen={reviewModal.open} onClose={() => setReviewModal({ open: false, leave: null, action: null })} title={`Review Leave Request`} size="md">
                {reviewModal.leave && (
                    <form onSubmit={(e) => { e.preventDefault(); handleReview(); }}>
                        <div style={{ background: 'var(--bg-light)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '200px' }}>
                                    <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>{reviewModal.leave.employee?.name}</div>
                                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: 13 }}>
                                        <span><strong>Type:</strong> {reviewModal.leave.leaveType?.name}</span>
                                        <span><strong>Days:</strong> {reviewModal.leave.numberOfDays || reviewModal.leave.number_of_days}</span>
                                    </div>
                                    <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}><strong>Reason:</strong> {reviewModal.leave.reason}</div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '160px', flexShrink: 0 }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Start Date</label>
                                        <input type="date" className="form-control" style={{ padding: '6px 10px', fontSize: 13 }} value={editDates.startDate} onChange={e => setEditDates(d => ({ ...d, startDate: e.target.value }))} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>End Date</label>
                                        <input type="date" className="form-control" style={{ padding: '6px 10px', fontSize: 13 }} value={editDates.endDate} onChange={e => setEditDates(d => ({ ...d, endDate: e.target.value }))} />
                                    </div>
                                </div>
                            </div>

                            {reviewModal.leave.handovers && reviewModal.leave.handovers.length > 0 && (
                                <div style={{ marginTop: 12, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                                    <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: 'var(--text-secondary)' }}>Leave Coverage Details</div>
                                    <div className="table-responsive" style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                                        <table className="table" style={{ margin: 0, fontSize: 13 }}>
                                            <thead style={{ background: 'var(--bg-light)' }}>
                                                <tr>
                                                    <th style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Assigned To</th>
                                                    <th style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Task</th>
                                                    <th style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reviewModal.leave.handovers.map((h) => (
                                                    <tr key={h.id}>
                                                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{h.assigned_to_name}</td>
                                                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{h.task_description || '-'}</td>
                                                        <td style={{ padding: '8px 12px' }}>
                                                            <span style={{ 
                                                                fontSize: 11, fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 12,
                                                                background: h.status === 'accepted' ? '#10B98120' : h.status === 'rejected' ? '#EF444420' : '#F59E0B20',
                                                                color: h.status === 'accepted' ? '#10B981' : h.status === 'rejected' ? '#EF4444' : '#F59E0B'
                                                            }}>
                                                                {h.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            
                            {reviewModal.leave.employee?.leaveBalance && (
                                <div style={{ marginTop: 12, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                                    <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: 'var(--text-secondary)' }}>Employee Leave Balance</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                        {Object.entries(reviewModal.leave.employee.leaveBalance).map(([key, val]) => {
                                            const safeKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
                                            const lt = leaveTypes.find(t => {
                                                if (!t.name) return false;
                                                const safeName = t.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                                                return safeName.includes(safeKey) || safeKey.includes(safeName);
                                            });
                                            
                                            // Fallback map for default days if the leave type name in DB doesn't exactly match the key
                                            const fallbackDays = { 
                                                annual: 12, sick: 12, casual: 12, 
                                                paternity: 15, maternity: 180, unpaid: 30, 
                                                floating: 5, vacation: 6, halfday: 12 
                                            };
                                            
                                            let total = fallbackDays[safeKey] || 0;
                                            if (lt && (lt.default_days || lt.defaultDays)) {
                                                total = parseFloat(lt.default_days || lt.defaultDays);
                                            }
                                            
                                            const taken = Math.max(total - val, 0);
                                            
                                            return (
                                                <div key={key} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                                                    <div style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textAlign: 'center', marginBottom: 6 }}>{key}</div>
                                                    
                                                    <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                                                        <div style={{ textAlign: 'center' }}>
                                                            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Taken</div>
                                                            <div style={{ fontSize: 13, fontWeight: 700, color: taken > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>{taken}<span style={{ fontSize: 9 }}>d</span></div>
                                                        </div>
                                                        <div style={{ width: 1, background: 'var(--border-light)' }} />
                                                        <div style={{ textAlign: 'center' }}>
                                                            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Left</div>
                                                            <div style={{ fontSize: 13, fontWeight: 700, color: val > 0 ? '#10B981' : '#EF4444' }}>{val}<span style={{ fontSize: 9 }}>d</span></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Admin/Manager Remark</label>
                            <textarea className="form-control" rows={3} placeholder="Add a remark for the employee..." value={remark} onChange={e => setRemark(e.target.value)} />
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setReviewModal({ open: false, leave: null, action: null })}>Cancel</button>
                            <button type="button" className="btn btn-danger" disabled={saving} onClick={() => handleReview('rejected')}>Reject</button>
                            <button type="submit" className="btn btn-success" disabled={saving}>
                                {saving ? 'Processing...' : 'Approve'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default LeaveRequests;
