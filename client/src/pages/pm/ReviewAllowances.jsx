import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Check, X, Eye, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_LABELS = {
    pending_manager: { label: 'Pending',    color: '#F59E0B', bg: '#FEF3C7' },
    pending_hr:      { label: 'Pending HR', color: '#6366F1', bg: '#EEF2FF' },
    approved:        { label: 'Approved',         color: '#10B981', bg: '#D1FAE5' },
    rejected:        { label: 'Rejected',         color: '#EF4444', bg: '#FEE2E2' },
};

const Badge = ({ status }) => {
    const s = STATUS_LABELS[status] || { label: status, color: '#64748B', bg: '#F1F5F9' };
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: s.bg, color: s.color,
            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700
        }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
            {s.label}
        </span>
    );
};

const ReviewAllowances = () => {
    const { user } = useAuth();
    const [allowances, setAllowances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [remark, setRemark] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [actionId, setActionId] = useState(null); // tracks which row is being acted on inline
    const [rejectModal, setRejectModal] = useState({ open: false, id: null, reason: '' });

    const fetchList = async () => {
        try {
            const status = user.role === 'pm' ? 'pending_manager' : 'pending_manager,pending_hr';
            const { data } = await api.get('/allowances', { params: { status } });
            setAllowances(Array.isArray(data.data?.allowances) ? data.data.allowances : []);
        } catch (err) {
            toast.error('Failed to load requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchList(); }, [user.role]);

    const handleReview = async (id, status, remarkOverride) => {
        const finalRemark = remarkOverride ?? remark;
        if (status === 'rejected' && !finalRemark.trim()) {
            // Open the reject modal for quick-reject from table row
            if (remarkOverride !== undefined) {
                setRejectModal({ open: true, id, reason: '' });
                return;
            }
            toast.error('Please provide a reason for rejection');
            return;
        }
        setSubmitting(true);
        setActionId(id);
        try {
            await api.put(`/allowances/${id}/review`, { status, remark: finalRemark });
            const msg = status === 'approved'
                ? (user.role === 'pm' ? 'Forwarded to HR ✓' : 'Approved ✓')
                : 'Rejected ✓';
            toast.success(msg);
            setSelectedRequest(null);
            setRemark('');
            setRejectModal({ open: false, id: null, reason: '' });
            fetchList();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed');
        } finally {
            setSubmitting(false);
            setActionId(null);
        }
    };

    const openDetail = (row, e) => {
        e.stopPropagation();
        setSelectedRequest(row);
        setRemark('');
    };

    if (loading) return <div className="flex-center" style={{ height: 400 }}><LoadingSpinner /></div>;

    const isPM = user.role === 'pm';

    return (
        <div className="fade-in">

            {/* Reject Reason Modal */}
            {rejectModal.open && (
                <div style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(15, 10, 40, 0.65)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999, backdropFilter: 'blur(8px)',
                    animation: 'fadeIn 0.15s ease'
                }}>
                    <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: 20,
                        width: '100%', maxWidth: 460,
                        boxShadow: '0 32px 80px rgba(239,68,68,0.18), 0 8px 32px rgba(0,0,0,0.22)',
                        overflow: 'hidden',
                        animation: 'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)'
                    }}>
                        {/* Gradient Header */}
                        <div style={{
                            background: 'linear-gradient(135deg, #FEF2F2 0%, #FFF0F0 100%)',
                            borderBottom: '1px solid #FECACA',
                            padding: '24px 28px 20px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{
                                    width: 52, height: 52, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                    boxShadow: '0 8px 24px rgba(239,68,68,0.35)'
                                }}>
                                    <X size={24} color="white" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1E1B4B', letterSpacing: '-0.3px' }}>Reject Request</h3>
                                    <p style={{ margin: '3px 0 0', fontSize: 13, color: '#6B7280', lineHeight: 1.4 }}>Please provide a clear reason so the employee understands.</p>
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '24px 28px 28px' }}>
                            <div style={{ marginBottom: 20 }}>
                                <label style={{
                                    display: 'block', fontSize: 12, fontWeight: 700,
                                    color: '#374151', marginBottom: 8,
                                    textTransform: 'uppercase', letterSpacing: '0.06em'
                                }}>
                                    Reason for Rejection <span style={{ color: '#EF4444', fontSize: 14 }}>*</span>
                                </label>
                                <textarea
                                    rows={4}
                                    placeholder="e.g. Amount exceeds policy limit, missing receipt..."
                                    value={rejectModal.reason}
                                    onChange={e => setRejectModal(m => ({ ...m, reason: e.target.value }))}
                                    autoFocus
                                    style={{
                                        width: '100%', boxSizing: 'border-box',
                                        padding: '12px 14px', borderRadius: 10,
                                        border: '2px solid',
                                        borderColor: rejectModal.reason.trim() ? '#F87171' : '#E5E7EB',
                                        background: 'var(--bg-light)',
                                        fontSize: 14, lineHeight: 1.6, resize: 'vertical',
                                        outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
                                        fontFamily: 'inherit', color: 'var(--text-primary)',
                                        boxShadow: rejectModal.reason.trim() ? '0 0 0 4px rgba(239,68,68,0.1)' : 'none'
                                    }}
                                    onFocus={e => { e.target.style.borderColor = '#F87171'; e.target.style.boxShadow = '0 0 0 4px rgba(239,68,68,0.1)'; }}
                                    onBlur={e => { if (!rejectModal.reason.trim()) { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}}
                                />
                                <div style={{ marginTop: 6, fontSize: 11, color: rejectModal.reason.trim() ? '#10B981' : '#9CA3AF' }}>
                                    {rejectModal.reason.trim() ? '✓ Reason provided — ready to submit' : 'This reason will be sent to the employee as a notification'}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 12 }}>
                                <button
                                    onClick={() => setRejectModal({ open: false, id: null, reason: '' })}
                                    disabled={submitting}
                                    style={{
                                        padding: '12px 20px', borderRadius: 10, border: '2px solid #E5E7EB',
                                        background: 'transparent', color: '#6B7280',
                                        fontSize: 14, fontWeight: 600, cursor: 'pointer',
                                        transition: 'all 0.2s', fontFamily: 'inherit'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.background = '#F9FAFB'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = 'transparent'; }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleReview(rejectModal.id, 'rejected', rejectModal.reason)}
                                    disabled={submitting || !rejectModal.reason.trim()}
                                    style={{
                                        padding: '12px 20px', borderRadius: 10, border: 'none',
                                        background: rejectModal.reason.trim()
                                            ? 'linear-gradient(135deg, #EF4444, #DC2626)'
                                            : '#F3F4F6',
                                        color: rejectModal.reason.trim() ? 'white' : '#9CA3AF',
                                        fontSize: 14, fontWeight: 700, cursor: rejectModal.reason.trim() ? 'pointer' : 'not-allowed',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        transition: 'all 0.2s', fontFamily: 'inherit',
                                        boxShadow: rejectModal.reason.trim() ? '0 4px 16px rgba(239,68,68,0.35)' : 'none'
                                    }}
                                    onMouseEnter={e => { if (rejectModal.reason.trim()) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                                >
                                    {submitting ? (
                                        <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Rejecting...</>
                                    ) : (
                                        <><X size={15} strokeWidth={2.5} /> Confirm Reject</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div className="page-header">
                <div>
                    <h1>Review Allowance Requests</h1>
                    <p>Manage pending allowance applications for your team or department</p>
                </div>
                <div style={{
                    background: 'var(--primary-light, #EEF2FF)', color: 'var(--primary)',
                    borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 6
                }}>
                    <Clock size={14} />
                    {allowances.length} Pending Request{allowances.length !== 1 ? 's' : ''}
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: selectedRequest ? '1fr 400px' : '1fr',
                gap: 24, transition: 'all 0.3s'
            }}>
                {/* Table */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {allowances.length === 0 ? (
                        <div className="empty-state" style={{ padding: 64 }}>
                            <Check size={56} style={{ color: '#10B981', marginBottom: 16, opacity: 0.6 }} />
                            <h3>All clear!</h3>
                            <p>No pending allowance requests at this time.</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Category</th>
                                        <th>Amount</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allowances.map(row => {
                                        const isSelected = selectedRequest?.id === row.id;
                                        const isActing = actionId === row.id && submitting;
                                        return (
                                            <tr
                                                key={row.id}
                                                style={{
                                                    background: isSelected ? 'var(--primary-light, #EEF2FF)' : undefined,
                                                    transition: 'background 0.2s'
                                                }}
                                            >
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{
                                                            width: 34, height: 34, borderRadius: '50%',
                                                            background: 'linear-gradient(135deg, var(--primary), var(--secondary, #7c3aed))',
                                                            color: '#fff', display: 'flex', alignItems: 'center',
                                                            justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0
                                                        }}>
                                                            {row.employee?.name?.[0]?.toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{row.employee?.name}</div>
                                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.employee?.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: 13 }}>{row.category?.name}</td>
                                                <td style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 14 }}>
                                                    ₹{Number(row.amount).toLocaleString('en-IN')}
                                                </td>
                                                <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                                    {new Date(row.date).toLocaleDateString('en-IN')}
                                                </td>
                                                <td>
                                                    <Badge status={row.status} />
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                                                        {/* View Detail */}
                                                        <button
                                                            className="btn btn-outline btn-sm"
                                                            title="View Details"
                                                            onClick={e => openDetail(row, e)}
                                                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                                                        >
                                                            <Eye size={13} /> View
                                                        </button>

                                                        {/* Quick Reject */}
                                                        <button
                                                            className="btn btn-sm"
                                                            title="Reject"
                                                            disabled={isActing}
                                                            onClick={e => { e.stopPropagation(); openDetail(row, e); }}
                                                            style={{
                                                                background: '#FEE2E2', color: '#EF4444',
                                                                border: '1px solid #FECACA',
                                                                display: 'flex', alignItems: 'center', gap: 4, fontSize: 12
                                                            }}
                                                        >
                                                            <X size={13} /> Reject
                                                        </button>

                                                        {/* Quick Approve / Forward */}
                                                        <button
                                                            className="btn btn-sm"
                                                            title={isPM ? 'Forward to HR' : 'Approve'}
                                                            disabled={isActing}
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                handleReview(row.id, 'approved', '');
                                                            }}
                                                            style={{
                                                                background: '#D1FAE5', color: '#10B981',
                                                                border: '1px solid #A7F3D0',
                                                                display: 'flex', alignItems: 'center', gap: 4, fontSize: 12
                                                            }}
                                                        >
                                                            {isActing ? '...' : <><Check size={13} /> {isPM ? 'Forward' : 'Approve'}</>}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Detail Panel */}
                {selectedRequest && (
                    <div className="card fade-in" style={{ height: 'fit-content', position: 'sticky', top: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, fontSize: 15 }}>Request Details</h3>
                            <button
                                onClick={() => setSelectedRequest(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Employee Info */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            background: 'var(--bg-light)', borderRadius: 8, padding: '10px 14px', marginBottom: 16
                        }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--primary), var(--secondary, #7c3aed))',
                                color: '#fff', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0
                            }}>
                                {selectedRequest.employee?.name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedRequest.employee?.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedRequest.employee?.email}</div>
                            </div>
                        </div>

                        {/* Info Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Category</div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{selectedRequest.category?.name}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Amount</div>
                                <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 15 }}>
                                    ₹{Number(selectedRequest.amount).toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Date</div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{new Date(selectedRequest.date).toLocaleDateString('en-IN')}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Max Limit</div>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>₹{selectedRequest.category?.maxAmount?.toLocaleString('en-IN') || '—'}</div>
                            </div>
                        </div>

                        {/* Purpose */}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Purpose</div>
                            <div style={{
                                background: 'var(--bg-light)', padding: '10px 12px',
                                borderRadius: 8, fontSize: 13, lineHeight: 1.5
                            }}>{selectedRequest.purpose || '—'}</div>
                        </div>

                        {/* Status */}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Status</div>
                            <Badge status={selectedRequest.status} />
                        </div>

                        {/* Attachments */}
                        {selectedRequest.attachments?.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                                    Attachments ({selectedRequest.attachments.length})
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {selectedRequest.attachments.map((at, i) => (
                                        <a key={i} href={at} target="_blank" rel="noreferrer"
                                            style={{ width: 56, height: 56, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)', display: 'block' }}>
                                            <img src={at} alt="attachment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Remark */}
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 12 }}>
                                Review Remark <span style={{ color: '#EF4444' }}>*required for rejection</span>
                            </label>
                            <textarea
                                className="form-control"
                                rows={3}
                                placeholder={isPM ? 'Add comment for HR...' : 'Add final approval/rejection comment...'}
                                value={remark}
                                onChange={e => setRemark(e.target.value)}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                            <button
                                className="btn btn-danger"
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                onClick={() => handleReview(selectedRequest.id, 'rejected')}
                                disabled={submitting}
                            >
                                <X size={15} /> Reject
                            </button>
                            <button
                                className="btn btn-success"
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                onClick={() => handleReview(selectedRequest.id, 'approved')}
                                disabled={submitting}
                            >
                                <Check size={15} /> {isPM ? 'Forward to HR' : 'Approve'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReviewAllowances;
