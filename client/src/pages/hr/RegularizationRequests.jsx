import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Calendar, Check, X } from 'lucide-react';

const RegularizationRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Status filter
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        fetchRequests();
    }, [filterStatus]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/regularization?status=${filterStatus}`);
            if (res.data.status || res.data.success) {
                setRequests(res.data.data);
            }
        } catch (error) {
            toast.error('Failed to fetch requests');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, status) => {
        try {
            // Optional: could prompt for a remark here. Hardcoding empty for now.
            const res = await api.put(`/regularization/${id}`, { status, hr_remark: '' });
            if (res.data.status || res.data.success) {
                toast.success(`Request ${status} successfully`);
                fetchRequests();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update request');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'badge-pending',
            approved: 'badge-approved',
            rejected: 'badge-rejected',
            cancelled: 'badge-cancelled'
        };
        const defaultStyle = 'badge-pending';
        return (
            <span className={`badge ${styles[status] || defaultStyle}`}>
                <span className="badge-dot" />
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const filters = ['all', 'pending', 'approved', 'rejected'];
    
    const STATUS_META = {
        all: { label: 'All', color: 'var(--primary)' },
        pending: { label: 'Pending', color: 'var(--warning)' },
        approved: { label: 'Approved', color: 'var(--success)' },
        rejected: { label: 'Rejected', color: 'var(--danger)' }
    };

    return (
        <div className="emp-dashboard-container fade-in">
            <div className="emp-dash-header">
                <div>
                    <h1 className="emp-dash-title">Attendance Regularization Requests</h1>
                    <p className="emp-dash-subtitle">Review and manage employee regularization requests.</p>
                </div>
            </div>

            <div className="filter-chips" style={{ marginBottom: '20px' }}>
                {filters.map(f => {
                    const meta = STATUS_META[f];
                    const isActive = filterStatus === f;
                    return (
                        <button
                            key={f}
                            onClick={() => setFilterStatus(f)}
                            className="btn btn-sm"
                            style={{
                                background: isActive ? meta.color : 'var(--bg-card)',
                                color: isActive ? '#fff' : 'var(--text-secondary)',
                                border: `1.5px solid ${isActive ? meta.color : 'var(--border)'}`,
                                fontWeight: isActive ? 700 : 500,
                                transition: 'all 0.2s',
                            }}
                        >
                            {meta.label}
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : requests.length === 0 ? (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                        <Calendar size={48} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>No requests found</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>There are no regularization requests matching the selected filter.</p>
                </div>
            ) : (
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Date</th>
                                    <th>Requested In</th>
                                    <th>Requested Out</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(request => (
                                    <tr key={request.id}>
                                        <td>
                                            <div className="table-avatar">
                                                <div className="table-avatar-img" style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-dark)', fontWeight: 'bold', fontSize: '12px', flexShrink: 0, overflow: 'hidden' }}>
                                                    {request.employee?.avatar ? (
                                                        <img src={request.employee.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        request.employee?.name?.charAt(0) || 'U'
                                                    )}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{request.employee?.name || 'Unknown'}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{request.employee?.department || ''}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {new Date(request.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td>
                                            {request.check_in_time ? new Date(request.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </td>
                                        <td>
                                            {request.check_out_time ? new Date(request.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </td>
                                        <td title={request.reason}>
                                            <div style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {request.reason}
                                            </div>
                                        </td>
                                        <td>
                                            {getStatusBadge(request.status)}
                                        </td>
                                        <td>
                                            {request.status === 'pending' && (
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button 
                                                        onClick={() => handleAction(request.id, 'approved')}
                                                        style={{ color: 'var(--success)', background: 'var(--success-light)', padding: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex' }}
                                                        title="Approve"
                                                    >
                                                        <Check size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleAction(request.id, 'rejected')}
                                                        style={{ color: 'var(--danger)', background: 'var(--danger-light)', padding: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex' }}
                                                        title="Reject"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            )}
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

export default RegularizationRequests;
