import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, Info } from 'lucide-react';
import Modal from '../../components/ui/Modal';

const AssignedTasks = () => {
    const [handovers, setHandovers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);

    const fetchHandovers = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/task-handovers');
            setHandovers(data.data?.handovers || []);
        } catch (err) {
            toast.error('Failed to load assigned tasks');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHandovers();
    }, []);

    const updateStatus = async (id, status) => {
        try {
            await api.put(`/task-handovers/${id}`, { status });
            toast.success(`Task handover ${status} successfully!`);
            fetchHandovers();
        } catch (err) {
            toast.error(err.response?.data?.message || `Failed to ${status} task handover`);
        }
    };

    const statusColors = {
        pending: 'badge-pending',
        accepted: 'badge-approved',
        rejected: 'badge-rejected'
    };

    const statusIcons = {
        pending: <Clock size={14} />,
        accepted: <CheckCircle size={14} />,
        rejected: <XCircle size={14} />
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Assigned Task Status</h1>
                <p>Manage task handovers assigned to you by colleagues on leave</p>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Requested By</th>
                                <th>Leave Dates</th>
                                <th>Task Description</th>
                                <th>Assigned On</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i}>{Array(6).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" /></td>)}</tr>
                                ))
                            ) : handovers.length === 0 ? (
                                <tr>
                                    <td colSpan={6}>
                                        <div className="empty-state">
                                            <h3>No task handovers assigned to you</h3>
                                            <p style={{ color: 'var(--text-muted)' }}>When colleagues go on leave and assign tasks to you, they will appear here.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                handovers.map((h) => (
                                    <tr key={h.id}>
                                        <td>
                                            <strong 
                                                style={{ cursor: 'pointer', color: 'var(--primary-color)', textDecoration: 'underline' }} 
                                                onClick={() => setSelectedTask(h)}
                                                title="View Task Details"
                                            >
                                                {h.requested_by_name}
                                            </strong>
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 13, fontWeight: 500 }}>{new Date(h.start_date).toLocaleDateString()}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>to {new Date(h.end_date).toLocaleDateString()}</div>
                                        </td>
                                        <td style={{ maxWidth: 220 }}>
                                            {h.task_description ? (
                                                <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>{h.task_description}</div>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>No specific task assigned</span>
                                            )}
                                        </td>
                                        <td>{new Date(h.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <span className={`badge ${statusColors[h.status] || 'badge-secondary'}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                {statusIcons[h.status]}
                                                {h.status.charAt(0).toUpperCase() + h.status.slice(1)}
                                            </span>
                                        </td>
                                        <td>
                                            {h.status === 'pending' ? (
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button className="btn btn-success btn-sm" onClick={() => updateStatus(h.id, 'accepted')}>
                                                        Accept
                                                    </button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => updateStatus(h.id, 'rejected')}>
                                                        Reject
                                                    </button>
                                                </div>
                                            ) : (
                                                <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setSelectedTask(h)} title="View Details">
                                                    <Info size={14} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Task Details Modal */}
            <Modal isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} title="Task Handover Details" size="md">
                {selectedTask && (
                    <div>
                        <div className="table-container" style={{ margin: 0 }}>
                            <table style={{ margin: 0 }}>
                                <tbody>
                                    <tr>
                                        <td style={{ width: '35%', fontWeight: 600, color: 'var(--text-muted)' }}>Requested By</td>
                                        <td><strong>{selectedTask.requested_by_name}</strong></td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Task Description</td>
                                        <td>{selectedTask.task_description || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No specific task assigned</span>}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Current Status</td>
                                        <td>
                                            <span className={`badge ${statusColors[selectedTask.status] || 'badge-secondary'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                {statusIcons[selectedTask.status]}
                                                {selectedTask.status.toUpperCase()}
                                            </span>
                                        </td>
                                    </tr>
                                    {selectedTask.status !== 'pending' && (
                                        <>
                                            <tr>
                                                <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{selectedTask.status === 'accepted' ? 'Accepted By' : 'Rejected By'}</td>
                                                <td style={{ fontWeight: 600 }}>You</td>
                                            </tr>
                                            <tr>
                                                <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Date & Time</td>
                                                <td>{new Date(selectedTask.updated_at).toLocaleString()}</td>
                                            </tr>
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="form-actions" style={{ marginTop: 24 }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setSelectedTask(null)}>Close</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AssignedTasks;
