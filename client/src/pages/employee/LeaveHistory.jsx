import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useLocation } from 'react-router-dom';
import { Search, Filter, Download, Info, History, XCircle, Users } from 'lucide-react';
import Modal from '../../components/ui/Modal';

const statusColors = { pending_manager: 'badge-pending', pending_hr: 'badge-pending', approved: 'badge-approved', rejected: 'badge-rejected', cancelled: 'badge-cancelled' };
const statusLabels = { all: 'All', pending_manager: 'Pending', pending_hr: 'Pending HR', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' };

const LeaveHistory = () => {
    const location = useLocation();
    const isLeaveStatus = location.pathname.includes('leave-status');
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState(() => {
        if (isLeaveStatus) return 'pending_manager';
        return location.state?.filter || 'all';
    });
    const [handoverModal, setHandoverModal] = useState({ open: false, leave: null });
    const [users, setUsers] = useState([]);
    const [reassigningHandoverId, setReassigningHandoverId] = useState(null);
    const [newAssigneeId, setNewAssigneeId] = useState('');
    const [newTaskDescription, setNewTaskDescription] = useState('');
    const [reassigning, setReassigning] = useState(false);

    useEffect(() => {
        api.get('/users')
            .then(({ data }) => setUsers(Array.isArray(data.data) ? data.data : (data.data?.users || [])))
            .catch(() => {});
    }, []);

    const handleReassign = async (handoverId) => {
        if (!newAssigneeId) {
            toast.error('Please select a colleague');
            return;
        }
        setReassigning(true);
        try {
            await api.put(`/task-handovers/${handoverId}`, {
                assigned_to_id: newAssigneeId,
                task_description: newTaskDescription
            });
            toast.success('Task reassigned successfully!');
            
            // Refresh leaves data
            const params = filter !== 'all' ? { status: filter } : {};
            const { data } = await api.get('/leaves', { params });
            const updatedLeaves = data.data?.leaves || [];
            setLeaves(updatedLeaves);
            
            const updatedLeave = updatedLeaves.find(l => l.id === handoverModal.leave.id);
            if (updatedLeave) {
                setHandoverModal({ open: true, leave: updatedLeave });
            } else {
                setHandoverModal({ open: false, leave: null });
            }
            
            setReassigningHandoverId(null);
            setNewAssigneeId('');
            setNewTaskDescription('');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to reassign task');
        } finally {
            setReassigning(false);
        }
    };

    const fetchLeaves = async () => {
        setLoading(true);
        try {
            const params = filter !== 'all' ? { status: filter } : {};
            const { data } = await api.get('/leaves', { params });
            setLeaves(data.data?.leaves || []);
        } catch { toast.error('Failed to load'); }

        finally { setLoading(false); }
    };

    useEffect(() => {
        if (location.pathname.includes('leave-status')) {
            setFilter('pending_manager');
        } else if (location.state?.filter) {
            setFilter(location.state.filter);
        } else {
            setFilter('all');
        }
    }, [location.pathname, location.state]);

    useEffect(() => { fetchLeaves(); }, [filter]);

    const handleCancel = async (id) => {
        if (!confirm('Cancel this leave request?')) return;
        try { await api.put(`/leaves/${id}/cancel`); toast.success('Leave cancelled'); fetchLeaves(); }
        catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    };

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
            <div className="page-header"><h1>Leave History</h1><p>Track all your leave requests and their status</p></div>

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
                                {isLeaveStatus && <th>S.No</th>}
                                <th>Leave Type</th>
                                <th>From</th>
                                <th>To</th>
                                {!isLeaveStatus && <th>Days</th>}
                                <th>Reason</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? Array(5).fill(0).map((_, i) => <tr key={i}>{Array(isLeaveStatus ? 7 : 9).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" /></td>)}</tr>) :
                                leaves.length === 0 ? <tr><td colSpan={isLeaveStatus ? 7 : 9}><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><History size={48} /></div><h3>No leaves found</h3></div></td></tr> :
                                    leaves.map((l, i) => (
                                        <tr key={l.id}>
                                            {isLeaveStatus && <td>{i + 1}</td>}
                                            <td>
                                                <span 
                                                    style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: (l.handovers && l.handovers.length > 0) ? 'pointer' : 'default' }}
                                                    onClick={(e) => {
                                                        if (l.handovers && l.handovers.length > 0) {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setHandoverModal({ open: true, leave: l });
                                                        }
                                                    }}
                                                    title={l.handovers && l.handovers.length > 0 ? "Click to view task handover details" : ""}
                                                >
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.leaveType?.color || '#ccc' }} />
                                                    <strong style={{ color: (l.handovers && l.handovers.length > 0) ? 'var(--primary-color)' : 'inherit', textDecoration: (l.handovers && l.handovers.length > 0) ? 'underline' : 'none' }}>
                                                        {l.leaveType?.name}
                                                    </strong>
                                                </span>
                                            </td>
                                            <td>{new Date(l.startDate).toLocaleDateString()}</td>
                                            <td>{new Date(l.endDate).toLocaleDateString()}</td>
                                            {!isLeaveStatus && <td><strong>{l.numberOfDays}</strong></td>}
                                            <td style={{ maxWidth: 180 }}><div className="truncate" title={l.reason}>{l.reason}</div></td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                                                    <span className={`badge ${statusColors[l.status] || 'badge-pending'}`}><span className="badge-dot" />{statusLabels[l.status] || l.status}</span>
                                                    {l.handovers && l.handovers.length > 0 && (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                                                            {l.handovers.map(h => (
                                                                <span 
                                                                    key={h.id}
                                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setHandoverModal({ open: true, leave: l }); }}
                                                                    style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: h.status === 'accepted' ? '#D1FAE5' : h.status === 'rejected' ? '#FEE2E2' : '#FEF3C7', color: h.status === 'accepted' ? '#065F46' : h.status === 'rejected' ? '#991B1B' : '#92400E', fontWeight: 600, cursor: 'pointer', border: '1px solid transparent', display: 'inline-block' }}
                                                                    title={`Task Handover to ${h.assigned_to_name}: ${h.status.toUpperCase()}`}
                                                                >
                                                                    {h.assigned_to_name.split(' ')[0]}: {h.status.toUpperCase()}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>


                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    {['pending_manager', 'pending_hr'].includes(l.status) && (
                                                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleCancel(l.id)} title="Cancel"><XCircle size={14} /></button>
                                                    )}
                                                    {l.handovers && l.handovers.length > 0 && (
                                                        <button 
                                                            type="button"
                                                            className="btn btn-secondary btn-sm btn-icon" 
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setHandoverModal({ open: true, leave: l }); }} 
                                                            title="View Handover Details"
                                                        >
                                                            <Info size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Task Handover Status Modal */}
            <Modal isOpen={handoverModal.open} onClose={() => setHandoverModal({ open: false, leave: null })} title="View Task Handover Status" size="md">
                {handoverModal.leave && (
                    <div>
                        <div style={{ background: 'var(--primary-light)', padding: '16px', borderRadius: 'var(--radius)', color: 'var(--primary-dark)', fontSize: 13, lineHeight: '1.5', marginBottom: 20 }}>
                            After submitting a leave request, the employee can view the task handover details and track whether the assigned employees have accepted or rejected the assigned tasks.
                        </div>
                        <h4 style={{ marginBottom: 12, fontSize: 14 }}>Task Handover Assigned To:</h4>
                        <div className="table-container" style={{ margin: 0 }}>
                            <table style={{ margin: 0 }}>
                                <thead>
                                    <tr>
                                        <th>Assignee</th>
                                        <th>Task</th>
                                        <th>Status</th>
                                        <th>Action Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {handoverModal.leave.handovers.map(h => (
                                        reassigningHandoverId === h.id ? (
                                            <tr key={h.id}>
                                                <td colSpan={4} style={{ padding: '12px', background: 'var(--bg-light)' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                        <div style={{ fontWeight: 600, fontSize: 13 }}>Reassign Task Handover</div>
                                                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                                            <div style={{ flex: 1, minWidth: 200 }}>
                                                                <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Select New Colleague</label>
                                                                <select 
                                                                    className="form-control" 
                                                                    style={{ fontSize: 13, padding: '6px 10px' }}
                                                                    value={newAssigneeId}
                                                                    onChange={e => setNewAssigneeId(e.target.value)}
                                                                >
                                                                    <option value="">-- Select Colleague --</option>
                                                                    {users
                                                                        .filter(u => u.id !== handoverModal.leave.employee_id && u.role === 'employee' && !handoverModal.leave.handovers.some(curr => curr.assigned_to_id === u.id))
                                                                        .map(u => (
                                                                            <option key={u.id} value={u.id}>{u.name} ({u.department || 'Employee'})</option>
                                                                        ))
                                                                    }
                                                                </select>
                                                            </div>
                                                            <div style={{ flex: 2, minWidth: 300 }}>
                                                                <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Task Description</label>
                                                                <textarea 
                                                                    className="form-control" 
                                                                    rows={2} 
                                                                    style={{ fontSize: 13, padding: '6px 10px' }}
                                                                    value={newTaskDescription}
                                                                    onChange={e => setNewTaskDescription(e.target.value)}
                                                                    placeholder="Describe task details..."
                                                                />
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                            <button 
                                                                type="button" 
                                                                className="btn btn-secondary btn-sm" 
                                                                disabled={reassigning} 
                                                                onClick={() => setReassigningHandoverId(null)}
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button 
                                                                type="button" 
                                                                className="btn btn-primary btn-sm" 
                                                                disabled={reassigning} 
                                                                onClick={() => handleReassign(h.id)}
                                                            >
                                                                {reassigning ? 'Saving...' : 'Save Reassignment'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            <tr key={h.id}>
                                                <td style={{ fontWeight: 600, minWidth: '120px' }}>{h.assigned_to_name}</td>
                                                <td style={{ maxWidth: '200px', fontSize: 13, lineHeight: '1.4' }}>
                                                    {h.task_description ? h.task_description : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No specific task</span>}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                                                        <span className={`badge ${h.status === 'accepted' ? 'badge-approved' : h.status === 'rejected' ? 'badge-rejected' : 'badge-pending'}`}>
                                                            {h.status === 'pending' ? 'PENDING' : `${h.status.toUpperCase()} BY ${h.assigned_to_name.split(' ')[0]}`}
                                                        </span>
                                                        {['accepted', 'rejected'].includes(h.status) && ['pending_manager', 'pending_hr'].includes(handoverModal.leave.status) && (
                                                            <button 
                                                                type="button" 
                                                                className="btn btn-link btn-sm" 
                                                                style={{ padding: 0, fontSize: 11, color: 'var(--primary-color)', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                                                                onClick={() => {
                                                                    setReassigningHandoverId(h.id);
                                                                    setNewAssigneeId('');
                                                                    setNewTaskDescription(h.task_description || '');
                                                                }}
                                                            >
                                                                Reassign Colleague
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                                    {h.status !== 'pending' && h.updated_at ? new Date(h.updated_at).toLocaleString() : '-'}
                                                </td>
                                            </tr>
                                        )
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="form-actions" style={{ marginTop: 24 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setHandoverModal({ open: false, leave: null })}>Close</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default LeaveHistory;
