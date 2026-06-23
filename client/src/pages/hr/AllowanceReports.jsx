import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Download, Search, FileText, CheckCircle, Clock, XCircle, User, ClipboardCheck, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AllowanceReports = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

const STATUS_LABELS = {
    pending_manager: 'Pending',
    pending_hr:      'Pending HR',
    approved:        'Approved',
    rejected:        'Rejected',
};
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ status: '', employeeId: '', startDate: '', endDate: '' });
    const [nameSearch, setNameSearch] = useState('');
    const [exporting, setExporting] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [actionId, setActionId] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [rejectModal, setRejectModal] = useState({ open: false, id: null, reason: '' });

    // Fetch all employees for the dropdown
    useEffect(() => {
        api.get('/users').then(res => {
            const list = res.data?.data || res.data || [];
            setEmployees(list);
        }).catch(() => {});
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/reports/allowances', { params: filter });
            setRecords(data.data);
        } catch (err) {
            toast.error('Failed to load report data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, []);

    const handleExport = async () => {
        setExporting(true);
        try {
            const response = await api.get('/reports/allowances', {
                params: { ...filter, format: 'excel' },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `allowance_report_${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Report downloaded successfully');
        } catch (err) {
            toast.error('Export failed');
        } finally {
            setExporting(false);
        }
    };

    if (loading && records.length === 0) return <div className="flex-center" style={{ height: 400 }}><LoadingSpinner /></div>;

    // Selected employee info
    const selectedEmployee = filter.employeeId
        ? employees.find(e => String(e.id) === String(filter.employeeId))
        : null;

    // Apply client-side name search on top of server-filtered records
    const displayRecords = nameSearch.trim()
        ? records.filter(r =>
            (r['Employee Name'] || '').toLowerCase().includes(nameSearch.trim().toLowerCase())
          )
        : records;

    // Calculate stats based on current filtered records
    const totalRequests = displayRecords.length;
    const totalAmount = displayRecords.reduce((sum, r) => sum + (Number(r['Amount']) || 0), 0);

    const approvedAmount = displayRecords
        .filter(r => r['Status'] === 'approved')
        .reduce((sum, r) => sum + (Number(r['Amount']) || 0), 0);

    const pendingAmount = displayRecords
        .filter(r => r['Status'] === 'pending_manager' || r['Status'] === 'pending_hr')
        .reduce((sum, r) => sum + (Number(r['Amount']) || 0), 0);

    const rejectedAmount = displayRecords
        .filter(r => r['Status'] === 'rejected')
        .reduce((sum, r) => sum + (Number(r['Amount']) || 0), 0);

    const reviewPath = user?.role === 'admin' 
        ? '/admin/allowance-review' 
        : (user?.role === 'hr' ? '/hr/allowance-review' : '/pm/allowance-review');

    const isPM = user?.role === 'pm';

    const handleReview = async (id, status, remark = '') => {
        if (!id) {
            toast.error('Cannot identify this request. Please try from the Review page.');
            return;
        }
        if (status === 'rejected' && !remark.trim()) {
            setRejectModal({ open: true, id, reason: '' });
            return;
        }
        setSubmitting(true);
        setActionId(id);
        try {
            await api.put(`/allowances/${id}/review`, { status, remark });
            const msg = status === 'approved'
                ? (isPM ? 'Forwarded to HR ✓' : 'Approved ✓')
                : 'Rejected ✓';
            toast.success(msg);
            setRejectModal({ open: false, id: null, reason: '' });
            fetchRecords();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed');
        } finally {
            setSubmitting(false);
            setActionId(null);
        }
    };

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
                                <div style={{ marginTop: 6, fontSize: 11, color: rejectModal.reason.trim() ? '#10B981' : '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
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
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Allowance Reports & Audits</h1>
                    <p>Audit employee claims and export monthly usage reports</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-primary" onClick={() => navigate(reviewPath)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ClipboardCheck size={18} /> Review Pending Requests
                    </button>
                    <button className="btn btn-success" onClick={handleExport} disabled={exporting} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {exporting ? 'Generating...' : <><Download size={18} /> Export Excel/CSV</>}
                    </button>
                </div>
            </div>

            {/* Employee Banner (when one employee is selected) */}
            {selectedEmployee && (
                <div style={{
                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary, #7c3aed) 100%)',
                    borderRadius: 'var(--radius)',
                    padding: '14px 20px',
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    color: '#fff',
                    boxShadow: '0 4px 16px rgba(99,102,241,0.18)'
                }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, fontWeight: 700, flexShrink: 0
                    }}>
                        {selectedEmployee.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedEmployee.name}</div>
                        <div style={{ fontSize: 12, opacity: 0.85 }}>
                            {selectedEmployee.employeeId || selectedEmployee.employee_id || ''}{selectedEmployee.department ? ` · ${selectedEmployee.department}` : ''}{selectedEmployee.position ? ` · ${selectedEmployee.position}` : ''}
                        </div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: 13, opacity: 0.85 }}>
                        Showing results for this employee only
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="stats-grid" style={{ marginBottom: 24 }}>
                <div className="card stat-card blue">
                    <div className="stat-icon blue"><FileText size={20} /></div>
                    <div className="stat-value">₹{totalAmount.toLocaleString('en-IN')}</div>
                    <div className="stat-label">
                        Total Claimed ({totalRequests} requests)
                        {selectedEmployee && <div style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>{selectedEmployee.name}</div>}
                    </div>
                </div>
                <div className="card stat-card green">
                    <div className="stat-icon green"><CheckCircle size={20} /></div>
                    <div className="stat-value">₹{approvedAmount.toLocaleString('en-IN')}</div>
                    <div className="stat-label">
                        Approved Claims
                        {selectedEmployee && <div style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>{selectedEmployee.name}</div>}
                    </div>
                </div>
                <div className="card stat-card orange">
                    <div className="stat-icon orange"><Clock size={20} /></div>
                    <div className="stat-value">₹{pendingAmount.toLocaleString('en-IN')}</div>
                    <div className="stat-label">
                        Pending Approval
                        {selectedEmployee && <div style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>{selectedEmployee.name}</div>}
                    </div>
                </div>
                <div className="card stat-card purple">
                    <div className="stat-icon purple"><XCircle size={20} /></div>
                    <div className="stat-value">₹{rejectedAmount.toLocaleString('en-IN')}</div>
                    <div className="stat-label">
                        Rejected Claims
                        {selectedEmployee && <div style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>{selectedEmployee.name}</div>}
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
                {/* Name Search Row */}
                <div style={{ marginBottom: 14 }}>
                    <label className="form-label" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                        <Search size={13} /> Search by Name
                    </label>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{
                            position: 'absolute', left: 12, top: '50%',
                            transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none'
                        }} />
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Type employee name to filter..."
                            value={nameSearch}
                            onChange={e => setNameSearch(e.target.value)}
                            style={{ paddingLeft: 38 }}
                        />
                        {nameSearch && (
                            <button
                                onClick={() => setNameSearch('')}
                                style={{
                                    position: 'absolute', right: 10, top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--text-muted)', fontSize: 16, lineHeight: 1, padding: 2
                                }}
                                title="Clear"
                            >✕</button>
                        )}
                    </div>
                    {nameSearch && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                            Showing {displayRecords.length} of {records.length} records matching "{nameSearch}"
                        </div>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, alignItems: 'end' }}>

                    {/* Employee Dropdown */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <User size={13} /> Employee
                        </label>
                        <select
                            className="form-control"
                            value={filter.employeeId}
                            onChange={e => setFilter(f => ({ ...f, employeeId: e.target.value }))}
                        >
                            <option value="">All Employees</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.name}{emp.employeeId ? ` (${emp.employeeId})` : emp.employee_id ? ` (${emp.employee_id})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 12 }}>Status</label>
                        <select className="form-control" value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
                            <option value="">All Statuses</option>
                            <option value="pending_manager">Pending Manager</option>
                            <option value="pending_hr">Pending HR</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 12 }}>Start Date</label>
                        <input type="date" className="form-control" value={filter.startDate} onChange={e => setFilter(f => ({ ...f, startDate: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 12 }}>End Date</label>
                        <input type="date" className="form-control" value={filter.endDate} onChange={e => setFilter(f => ({ ...f, endDate: e.target.value }))} />
                    </div>
                    <button className="btn btn-primary" onClick={fetchRecords} style={{ height: 42 }}>
                        <Search size={18} style={{ marginRight: 8 }} /> Filter
                    </button>
                </div>
            </div>

            <div className="card">
                <div className="table-container">
                    {displayRecords.length === 0 ? (
                        <div className="empty-state" style={{ padding: 48 }}>
                            <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                            <h3>{nameSearch ? `No results for "${nameSearch}"` : 'No records found'}</h3>
                            <p>Try adjusting your filters or date range.</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Category</th>
                                    <th>Amount</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Applied On</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayRecords.map((row, i) => (
                                    <tr key={i}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{row['Employee Name']}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row['Employee ID']} | {row['Department']}</div>
                                        </td>
                                        <td>{row['Category']}</td>
                                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>₹{row['Amount']}</td>
                                        <td>{row['Date']}</td>
                                        <td>
                                            <span className={`badge ${row['Status'] === 'approved' ? 'badge-approved' : row['Status'] === 'rejected' ? 'badge-rejected' : 'badge-pending'}`}>
                                                {STATUS_LABELS[row['Status']] || row['Status']}
                                            </span>
                                        </td>
                                        <td>{row['Applied On']}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            {['pending_manager', 'pending_hr'].includes(row['Status']) ? (
                                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                                                    <button
                                                        className="btn btn-sm"
                                                        title="Reject"
                                                        disabled={submitting && actionId === row['ID']}
                                                        onClick={() => handleReview(row['ID'], 'rejected')}
                                                        style={{
                                                            background: '#FEE2E2', color: '#EF4444',
                                                            border: '1px solid #FECACA',
                                                            display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                                                            padding: '4px 10px', borderRadius: 6, cursor: 'pointer'
                                                        }}
                                                    >
                                                        {submitting && actionId === row['ID'] ? '...' : <><X size={13} /> Reject</>}
                                                    </button>
                                                    <button
                                                        className="btn btn-sm"
                                                        title={isPM ? 'Forward to HR' : 'Approve'}
                                                        disabled={submitting && actionId === row['ID']}
                                                        onClick={() => handleReview(row['ID'], 'approved')}
                                                        style={{
                                                            background: '#D1FAE5', color: '#10B981',
                                                            border: '1px solid #A7F3D0',
                                                            display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                                                            padding: '4px 10px', borderRadius: 6, cursor: 'pointer'
                                                        }}
                                                    >
                                                        {submitting && actionId === row['ID'] ? '...' : <><Check size={13} /> {isPM ? 'Forward' : 'Approve'}</>}
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                                            )}
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

export default AllowanceReports;
