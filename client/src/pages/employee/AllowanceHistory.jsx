import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { FileText, Clock, CheckCircle, XCircle, Trash2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

const AllowanceHistory = () => {
    const [allowances, setAllowances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);

    const fetchAll = async () => {
        try {
            const [listRes, statsRes] = await Promise.all([
                api.get('/allowances'),
                api.get('/allowances/stats/summary')
            ]);
            setAllowances(Array.isArray(listRes.data.data?.allowances) ? listRes.data.data.allowances : []);
            setStats(statsRes.data.data?.stats || statsRes.data.data);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load allowance history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const handleCancel = async (id) => {
        if (!window.confirm('Are you sure you want to cancel this request?')) return;
        try {
            await api.put(`/allowances/${id}/cancel`);
            toast.success('Request cancelled');
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Cancel failed');
        }
    };

    if (loading) return <div className="flex-center" style={{ height: 400 }}><LoadingSpinner /></div>;

    const statusColors = {
        pending_manager: 'badge-pending',
        pending_hr: 'badge-pending',
        approved: 'badge-approved',
        rejected: 'badge-rejected',
        cancelled: 'badge-cancelled'
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Allowance History</h1>
                <p>Track your submitted allowance requests and their statuses</p>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid" style={{ marginBottom: 24 }}>
                <div className="card stat-card blue">
                    <div className="stat-icon blue"><FileText size={20} /></div>
                    <div className="stat-value">{stats?.total || 0}</div>
                    <div className="stat-label">Total Requests</div>
                </div>
                <div className="card stat-card orange">
                    <div className="stat-icon orange"><Clock size={20} /></div>
                    <div className="stat-value">{stats?.pending || 0}</div>
                    <div className="stat-label">Pending Approval</div>
                </div>
                <div className="card stat-card green">
                    <div className="stat-icon green"><CheckCircle size={20} /></div>
                    <div className="stat-value">₹{stats?.totalAmount || 0}</div>
                    <div className="stat-label">Approved Amount</div>
                </div>
                <div className="card stat-card purple">
                    <div className="stat-icon purple"><XCircle size={20} /></div>
                    <div className="stat-value">{stats?.rejected || 0}</div>
                    <div className="stat-label">Rejected</div>
                </div>
            </div>

            <div className="card">
                <div className="table-container">
                    {allowances.length === 0 ? (
                        <div className="empty-state" style={{ padding: 48 }}>
                            <FileText size={64} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                            <h3>No allowance requests found</h3>
                            <p>You haven't submitted any allowance requests yet.</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Category</th>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Purpose</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allowances.map(row => (
                                    <tr key={row.id}>
                                        <td style={{ fontWeight: 600 }}>{row.category?.name}</td>
                                        <td>{new Date(row.date).toLocaleDateString()}</td>
                                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{row.amount}</td>
                                        <td style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.purpose}</td>
                                        <td>
                                            <span className={`badge ${statusColors[row.status]}`}>
                                                <span className="badge-dot" />
                                                {row.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                {['pending_manager', 'pending_hr'].includes(row.status) && (
                                                    <button 
                                                        className="btn btn-ghost btn-danger btn-sm" 
                                                        onClick={() => handleCancel(row.id)}
                                                        title="Cancel Request"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                                {/* In a real app, I'd show a detail modal here */}
                                                <button className="btn btn-ghost btn-sm" title="View Details"><Eye size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AllowanceHistory;
