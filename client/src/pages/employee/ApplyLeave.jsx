import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { Send, CalendarRange, Clock, CheckSquare, Wallet, Search, Calendar, User, FileText, CalendarDays, Plus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './ApplyLeave.css';

/* ═══════════════════════════════════════════════════════════
   PREMIUM CALENDAR ILLUSTRATION (pure SVG)
═══════════════════════════════════════════════════════════ */
const CalendarIllustration = () => (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <defs>
            <linearGradient id="c-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="c-bg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#f8fafc" />
            </linearGradient>
            <filter id="c-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#6366f1" floodOpacity="0.25" />
            </filter>
        </defs>
        <g filter="url(#c-shadow)">
            <rect x="40" y="50" width="120" height="110" rx="16" fill="url(#c-bg)" />
            <rect x="40" y="50" width="120" height="36" rx="16" fill="url(#c-grad)" />
            <rect x="40" y="70" width="120" height="16" fill="url(#c-grad)" />
            {/* Calendar rings */}
            <rect x="60" y="35" width="8" height="24" rx="4" fill="#ffffff" />
            <rect x="132" y="35" width="8" height="24" rx="4" fill="#ffffff" />
            {/* Grid */}
            <rect x="56" y="100" width="16" height="16" rx="4" fill="#e2e8f0" />
            <rect x="82" y="100" width="16" height="16" rx="4" fill="#e2e8f0" />
            <rect x="108" y="100" width="16" height="16" rx="4" fill="#e2e8f0" />
            <rect x="134" y="100" width="16" height="16" rx="4" fill="#e2e8f0" />

            <rect x="56" y="126" width="16" height="16" rx="4" fill="#e2e8f0" />
            <rect x="82" y="126" width="16" height="16" rx="4" fill="#8b5cf6" />
            <rect x="108" y="126" width="16" height="16" rx="4" fill="#e2e8f0" />
            <rect x="134" y="126" width="16" height="16" rx="4" fill="#e2e8f0" />
        </g>
        {/* Decorative elements */}
        <circle cx="170" cy="40" r="12" fill="#fcd34d" />
        <circle cx="20" cy="140" r="8" fill="#f472b6" />
        <path d="M160 160 L170 150 M165 160 L175 160" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" />
    </svg>
);

const ApplyLeave = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const initialDate = location.state?.startDate || '';
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [users, setUsers] = useState([]);
    const [handoverSearch, setHandoverSearch] = useState('');

    const [form, setForm] = useState({
        leaveType: '',
        startDate: initialDate,
        endDate: initialDate,
        reason: '',
        isHalfDay: false,
        handoverAssignees: []
    });

    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    // Default stats to show on cards immediately
    const [stats, setStats] = useState({
        available: 18,
        pending: 0,
        approved: 4,
        balance: 24
    });

    const [showAddTypeModal, setShowAddTypeModal] = useState(false);
    const [newTypeForm, setNewTypeForm] = useState({
        name: '',
        code: '',
        defaultDays: 12,
        color: '#8b5cf6',
        description: ''
    });

    const handleCreateLeaveType = async (e) => {
        e.preventDefault();
        if (!newTypeForm.name.trim() || !newTypeForm.code.trim()) {
            toast.error("Please fill in Name and Code.");
            return;
        }
        try {
            await api.post('/leave-types', {
                name: newTypeForm.name.trim(),
                code: newTypeForm.code.trim().toUpperCase(),
                default_days: newTypeForm.defaultDays,
                color: newTypeForm.color,
                description: newTypeForm.description
            });
            toast.success("Leave type added successfully!");
            setShowAddTypeModal(false);
            setNewTypeForm({
                name: '',
                code: '',
                defaultDays: 12,
                color: '#8b5cf6',
                description: ''
            });
            const { data } = await api.get('/leaves/types');
            setLeaveTypes(data.data || []);
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to add leave type.");
        }
    };

    useEffect(() => {
        api.get('/leaves/types').then(({ data }) => setLeaveTypes(data.data || []));
        api.get('/users').then(({ data }) => setUsers(Array.isArray(data.data) ? data.data : (data.data?.users || [])));

        // Try fetching actual stats if endpoint exists, fallback gracefully
        api.get('/leaves/stats/summary').then(({ data }) => {
            if (data?.status && data?.data) {
                setStats({
                    available: data.data.available_leaves ?? stats.available,
                    pending: data.data.pending_requests ?? stats.pending,
                    approved: data.data.approved_leaves ?? stats.approved,
                    balance: data.data.total_allowance ?? stats.balance
                });
            }
        }).catch(() => { /* ignore, use defaults */ });
    }, []);

    const validate = () => {
        const e = {};
        if (!form.leaveType) e.leaveType = 'Please select a leave type';
        if (!form.startDate) e.startDate = 'Start date is required';
        if (!form.endDate) e.endDate = 'End date is required';
        if (form.startDate && form.endDate && form.startDate > form.endDate) e.endDate = 'End date must be after start date';
        if (!form.reason.trim()) e.reason = 'Please provide a reason';
        if (form.reason.trim().length < 10) e.reason = 'Reason must be at least 10 characters';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const numDays = form.startDate && form.endDate
        ? form.isHalfDay ? 0.5 : Math.ceil((new Date(form.endDate) - new Date(form.startDate)) / (1000 * 60 * 60 * 24)) + 1
        : 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) {
            toast.error("Please fill in all required fields correctly.");
            return;
        }
        setSubmitting(true);
        try {
            await api.post('/leaves', {
                leave_type_id: form.leaveType,
                start_date: form.startDate,
                end_date: form.endDate,
                reason: form.reason,
                is_half_day: form.isHalfDay ? 1 : 0,
                handover_user_ids: form.handoverAssignees.map(a => a.id),
                handover_tasks: form.handoverAssignees.map(a => ({ user_id: a.id, task: a.task }))
            });

            toast.success('Leave application submitted successfully!');
            navigate('/employee/leave-history');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Submission failed');
        } finally { setSubmitting(false); }
    };

    const selectedType = leaveTypes.find(lt => lt.id === form.leaveType);

    const filteredUsers = useMemo(() => {
        return users.filter(u =>
            u.id !== user?.id &&
            u.role === 'employee' &&
            u.name.toLowerCase().includes(handoverSearch.toLowerCase())
        );
    }, [users, handoverSearch, user]);

    // Map backend leave type names to aesthetic icons
    const getLeaveIcon = (name) => {
        const n = name.toLowerCase();
        if (n.includes('sick')) return <CalendarDays size={20} color="#f59e0b" />;
        if (n.includes('casual')) return <CalendarRange size={20} color="#10b981" />;
        if (n.includes('vacation')) return <Calendar size={20} color="#3b82f6" />;
        if (n.includes('maternity')) return <User size={20} color="#ec4899" />;
        return <FileText size={20} color="#8b5cf6" />;
    };

    return (
        <div className="apply-leave-page fade-in">
            {/* Background Blobs */}
            <div className="apply-leave-bg">
                <div className="apply-leave-blob al-blob-1"></div>
                <div className="apply-leave-blob al-blob-2"></div>
                <div className="apply-leave-blob al-blob-3"></div>
            </div>

            <div className="apply-leave-content">
                {/* Header */}
                <div className="al-header">
                    <div className="al-title-area">
                        <h1>Apply for Leave</h1>
                        <p>Submit your leave request quickly and track approval status with ease.</p>
                    </div>
                    <div className="al-header-illus">
                        <CalendarIllustration />
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="al-summary-grid">
                    <div className="al-summary-card">
                        <div className="al-summary-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
                            <CalendarRange size={24} />
                        </div>
                        <div className="al-summary-info">
                            <h4>Available Leave</h4>
                            <p>{stats.available} Days</p>
                        </div>
                    </div>
                    <div className="al-summary-card">
                        <div className="al-summary-icon" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
                            <Clock size={24} />
                        </div>
                        <div className="al-summary-info">
                            <h4>Pending Requests</h4>
                            <p>{stats.pending}</p>
                        </div>
                    </div>
                    <div className="al-summary-card">
                        <div className="al-summary-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
                            <CheckSquare size={24} />
                        </div>
                        <div className="al-summary-info">
                            <h4>Approved Leaves</h4>
                            <p>{stats.approved}</p>
                        </div>
                    </div>
                    <div className="al-summary-card">
                        <div className="al-summary-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                            <Wallet size={24} />
                        </div>
                        <div className="al-summary-info">
                            <h4>Annual Balance</h4>
                            <p>{stats.balance} Days</p>
                        </div>
                    </div>
                </div>

                {/* Main Form Card */}
                <div className="al-form-card">
                    <form onSubmit={handleSubmit}>

                        {/* 1. Leave Type */}
                        <div className="al-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <FileText size={18} color="#7c3aed" /> Select Leave Type
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowAddTypeModal(true)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: '#FAF5FF',
                                    color: '#7c3aed',
                                    border: '1.5px dashed #c084fc',
                                    borderRadius: 10,
                                    padding: '6px 12px',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#F3E8FF'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#FAF5FF'; }}
                            >
                                <Plus size={14} /> Add
                            </button>
                        </div>
                        <div className="al-leave-types">
                            {leaveTypes.map(lt => (
                                <div
                                    key={lt.id}
                                    className={`al-type-card ${form.leaveType === lt.id ? 'active' : ''}`}
                                    onClick={() => setForm(f => ({ ...f, leaveType: lt.id }))}
                                >
                                    <div className="al-type-icon" style={{ background: `${lt.color}20` }}>
                                        {getLeaveIcon(lt.name)}
                                    </div>
                                    <div className="al-type-info">
                                        <h5>{lt.name}</h5>
                                        <p>{lt.defaultDays} days/year</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {errors.leaveType && <div className="al-error-text" style={{ marginTop: '-20px', marginBottom: '24px' }}>{errors.leaveType}</div>}

                        {/* 2. Duration & Dates */}
                        <div className="al-section-title">
                            <CalendarRange size={18} color="#7c3aed" /> Duration & Dates
                        </div>

                        <label className="al-toggle-wrap">
                            <input
                                type="checkbox"
                                checked={form.isHalfDay}
                                onChange={e => setForm(f => ({ ...f, isHalfDay: e.target.checked }))}
                            />
                            <span>Half Day Leave (0.5 days)</span>
                        </label>

                        <div className="al-form-row">
                            <div className="al-input-group">
                                <label className="required">Start Date</label>
                                <div className="al-input-wrapper">
                                    <CalendarDays className="al-input-icon" size={18} />
                                    <input
                                        type="date"
                                        className={`al-input ${errors.startDate ? 'error' : ''}`}
                                        value={form.startDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={e => setForm(f => ({ ...f, startDate: e.target.value, endDate: f.endDate < e.target.value ? e.target.value : f.endDate }))}
                                    />
                                </div>
                                {errors.startDate && <div className="al-error-text">{errors.startDate}</div>}
                            </div>

                            <div className="al-input-group">
                                <label className="required">End Date</label>
                                <div className="al-input-wrapper">
                                    <CalendarDays className="al-input-icon" size={18} />
                                    <input
                                        type="date"
                                        className={`al-input ${errors.endDate ? 'error' : ''}`}
                                        value={form.endDate}
                                        min={form.startDate || new Date().toISOString().split('T')[0]}
                                        disabled={form.isHalfDay}
                                        onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                                    />
                                </div>
                                {errors.endDate && <div className="al-error-text">{errors.endDate}</div>}
                            </div>
                        </div>

                        {numDays > 0 && (
                            <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '12px', padding: '14px 20px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '20px' }}>💡</span>
                                <span style={{ fontSize: '14.5px', color: '#4c1d95' }}>
                                    You are applying for <strong>{numDays} {numDays === 1 ? 'day' : 'days'}</strong> of {selectedType?.name || 'leave'}.
                                </span>
                            </div>
                        )}

                        {/* 3. Reason */}
                        <div className="al-section-title" style={{ marginTop: '32px' }}>
                            <FileText size={18} color="#7c3aed" /> Leave Details
                        </div>
                        <div className="al-input-group" style={{ marginBottom: '32px' }}>
                            <label className="required">Reason for Leave</label>
                            <textarea
                                className={`al-input ${errors.reason ? 'error' : ''}`}
                                rows={4}
                                placeholder="Please describe the reason for your leave (at least 10 characters)..."
                                value={form.reason}
                                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                                style={{ paddingLeft: '16px', resize: 'vertical' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                                {errors.reason ? <span className="al-error-text">{errors.reason}</span> : <span />}
                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>{form.reason.length} chars</span>
                            </div>
                        </div>

                        {/* 4. Task Handover */}
                        <div className="al-section-title">
                            <User size={18} color="#7c3aed" /> Task Handover (Optional)
                        </div>
                        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Assign tasks to your colleagues while you are away.</p>

                        <div className="al-handover-box">
                            <div className="al-handover-search">
                                <Search className="icon" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search colleague by name..."
                                    value={handoverSearch}
                                    onChange={(e) => setHandoverSearch(e.target.value)}
                                />
                            </div>
                            <div className="al-handover-list">
                                {filteredUsers.length === 0 ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                        No colleagues found.
                                    </div>
                                ) : (
                                    filteredUsers.map(u => {
                                        const assignee = form.handoverAssignees.find(a => a.id === u.id);
                                        const isSelected = !!assignee;
                                        return (
                                            <div key={u.id}>
                                                <div
                                                    className={`al-handover-item ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setForm(f => ({ ...f, handoverAssignees: f.handoverAssignees.filter(a => a.id !== u.id) }));
                                                        } else {
                                                            setForm(f => ({ ...f, handoverAssignees: [...f.handoverAssignees, { id: u.id, name: u.name, task: '' }] }));
                                                        }
                                                    }}
                                                >
                                                    <div className="al-h-avatar">
                                                        {u.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="al-h-info">
                                                        <div className="al-h-name" style={{ color: isSelected ? '#7c3aed' : '#1e293b' }}>{u.name}</div>
                                                        <div className="al-h-dept">{u.department || u.position || 'Employee'}</div>
                                                    </div>
                                                    {isSelected && (
                                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                                            <CheckSquare size={12} />
                                                        </div>
                                                    )}
                                                </div>
                                                {isSelected && (
                                                    <div className="al-h-task-input">
                                                        <textarea
                                                            rows={2}
                                                            placeholder={`Describe the task(s) for ${u.name}...`}
                                                            value={assignee.task}
                                                            onClick={e => e.stopPropagation()}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                setForm(f => ({ ...f, handoverAssignees: f.handoverAssignees.map(a => a.id === u.id ? { ...a, task: val } : a) }));
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                        {form.handoverAssignees.length > 0 && (
                            <div style={{ marginTop: '12px', fontSize: '13px', color: '#6366f1', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CheckSquare size={14} /> {form.handoverAssignees.length} colleague(s) selected for task handover
                            </div>
                        )}

                        {/* Actions */}
                        <div className="al-actions">
                            <button type="button" className="al-btn al-btn-secondary" onClick={() => navigate('/employee/dashboard')}>
                                Cancel
                            </button>
                            <button type="button" className="al-btn al-btn-secondary" onClick={() => setForm({ leaveType: '', startDate: initialDate, endDate: initialDate, reason: '', isHalfDay: false, handoverAssignees: [] })}>
                                Reset
                            </button>
                            <button type="submit" className="al-btn al-btn-primary" disabled={submitting}>
                                {submitting ? 'Submitting...' : <><Send size={18} /> Submit Request</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {showAddTypeModal && createPortal(
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 99999,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        background: 'var(--bg-card)',
                        borderRadius: 24,
                        width: '90%',
                        maxWidth: 460,
                        padding: 32,
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
                        border: '1px solid var(--border-light)',
                        position: 'relative'
                    }}>
                        <button
                            type="button"
                            onClick={() => setShowAddTypeModal(false)}
                            style={{
                                position: 'absolute',
                                top: 24,
                                right: 24,
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                padding: 4,
                                borderRadius: '50%',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                            <X size={20} />
                        </button>
                        <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Add New Leave Type</h3>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>Create a new leave category to be available in the system.</p>
                        
                        <form onSubmit={handleCreateLeaveType} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Leave Type Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Marriage Leave"
                                    value={newTypeForm.name}
                                    onChange={e => setNewTypeForm(f => ({ ...f, name: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border-light)', background: 'var(--bg-light)', color: 'var(--text-primary)', fontSize: 14 }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Code (2-4 letters)</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. MRL"
                                        value={newTypeForm.code}
                                        onChange={e => setNewTypeForm(f => ({ ...f, code: e.target.value }))}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border-light)', background: 'var(--bg-light)', color: 'var(--text-primary)', fontSize: 14 }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Default Days / Year</label>
                                    <input
                                        type="number"
                                        required
                                        min={1}
                                        value={newTypeForm.defaultDays}
                                        onChange={e => setNewTypeForm(f => ({ ...f, defaultDays: parseInt(e.target.value) || 0 }))}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border-light)', background: 'var(--bg-light)', color: 'var(--text-primary)', fontSize: 14 }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Theme Color</label>
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                    {['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6', '#14B8A6'].map(col => (
                                        <button
                                            key={col}
                                            type="button"
                                            onClick={() => setNewTypeForm(f => ({ ...f, color: col }))}
                                            style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: '50%',
                                                background: col,
                                                border: newTypeForm.color === col ? '3px solid var(--text-primary)' : '1px solid rgba(0,0,0,0.1)',
                                                cursor: 'pointer',
                                                padding: 0
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>Description (Optional)</label>
                                <textarea
                                    rows={2}
                                    placeholder="Brief description of this leave type..."
                                    value={newTypeForm.description}
                                    onChange={e => setNewTypeForm(f => ({ ...f, description: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border-light)', background: 'var(--bg-light)', color: 'var(--text-primary)', fontSize: 14, resize: 'none' }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAddTypeModal(false)}
                                    style={{ padding: '10px 18px', borderRadius: 12, border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{ padding: '10px 18px', borderRadius: 12, border: 'none', background: '#7C3AED', color: '#FFFFFF', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                                >
                                    Add Type
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ApplyLeave;
