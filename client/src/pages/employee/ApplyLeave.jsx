import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ApplyLeave = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [users, setUsers] = useState([]);
    const initialDate = location.state?.startDate || '';
    const [form, setForm] = useState({ leaveType: '', startDate: initialDate, endDate: initialDate, reason: '', isHalfDay: false, handoverAssignees: [] });
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        api.get('/leaves/types').then(({ data }) => setLeaveTypes(data.data || []));
        api.get('/users').then(({ data }) => setUsers(Array.isArray(data.data) ? data.data : (data.data?.users || [])));
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
        if (!validate()) return;
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

            toast.success(' Leave application submitted successfully!');
            navigate('/employee/leave-history');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Submission failed');
        } finally { setSubmitting(false); }
    };

    const selectedType = leaveTypes.find(lt => lt.id === form.leaveType);

    return (
        <div className="fade-in" style={{ maxWidth: 640, margin: '0 auto' }}>
            <div className="page-header">
                <h1>Apply for Leave</h1>
                <p>Submit a new leave request for approval</p>
            </div>

            <div className="card">
                <form onSubmit={handleSubmit}>
                    {/* Leave Type */}
                    <div className="form-group">
                        <label className="form-label required">Leave Type</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10, marginBottom: errors.leaveType ? 8 : 0 }}>
                            {leaveTypes.map(lt => (
                                <div key={lt.id}
                                    onClick={() => setForm(f => ({ ...f, leaveType: lt.id }))}
                                    style={{
                                        padding: '12px', border: `2px solid ${form.leaveType === lt.id ? lt.color : 'var(--border)'}`,
                                        borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all 0.2s',
                                        background: form.leaveType === lt.id ? `${lt.color}15` : 'var(--bg-white)',
                                        display: 'flex', alignItems: 'center', gap: 8
                                    }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: lt.color, flexShrink: 0 }} />
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{lt.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{lt.defaultDays} days/yr</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {errors.leaveType && <div className="form-error">{errors.leaveType}</div>}
                    </div>

                    {/* Half Day Toggle */}
                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                            <input type="checkbox" checked={form.isHalfDay} onChange={e => setForm(f => ({ ...f, isHalfDay: e.target.checked }))} style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
                            <span><strong>Half Day Leave</strong> (0.5 days)</span>
                        </label>
                    </div>

                    {/* Date Range */}
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Start Date</label>
                            <input
                                type="date"
                                className={`form-control ${errors.startDate ? 'error' : ''}`}
                                value={form.startDate}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={e => setForm(f => ({ ...f, startDate: e.target.value, endDate: f.endDate < e.target.value ? e.target.value : f.endDate }))}
                            />
                            {errors.startDate && <div className="form-error">{errors.startDate}</div>}
                        </div>
                        <div className="form-group">
                            <label className="form-label required">End Date</label>
                            <input
                                type="date"
                                className={`form-control ${errors.endDate ? 'error' : ''}`}
                                value={form.endDate}
                                min={form.startDate || new Date().toISOString().split('T')[0]}
                                disabled={form.isHalfDay}
                                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                            />
                            {errors.endDate && <div className="form-error">{errors.endDate}</div>}
                        </div>
                    </div>

                    {/* Days Preview */}
                    {numDays > 0 && (
                        <div style={{ background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)', padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}></span>
                            <span style={{ fontSize: 14, color: 'var(--primary-dark)' }}>
                                <strong>{numDays} {numDays === 1 ? 'day' : 'days'}</strong> of {selectedType?.name || 'leave'} will be applied
                            </span>
                        </div>
                    )}

                    {/* Task Handover */}
                    <div className="form-group">
                        <label className="form-label">Task Handover (Optional)</label>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Click on a colleague's name to assign them a task while you are on leave.</div>
                        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', maxHeight: 300, overflowY: 'auto' }}>
                            {users.filter(u => u.id !== user?.id && u.role === 'employee').map((u, idx, arr) => {
                                const assignee = form.handoverAssignees.find(a => a.id === u.id);
                                const isSelected = !!assignee;
                                return (
                                    <div key={u.id} style={{ borderBottom: idx < arr.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                                        {/* Name row - clickable */}
                                        <div
                                            onClick={() => {
                                                if (isSelected) {
                                                    setForm(f => ({ ...f, handoverAssignees: f.handoverAssignees.filter(a => a.id !== u.id) }));
                                                } else {
                                                    setForm(f => ({ ...f, handoverAssignees: [...f.handoverAssignees, { id: u.id, name: u.name, task: '' }] }));
                                                }
                                            }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                                                cursor: 'pointer', background: isSelected ? 'var(--primary-light)' : 'transparent',
                                                transition: 'background 0.15s'
                                            }}
                                        >
                                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: isSelected ? 'var(--primary)' : 'linear-gradient(135deg, #a78bfa, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}>
                                                <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>{u.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</span>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }}>{u.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.department || u.position || 'Employee'}</div>
                                            </div>
                                            {isSelected && <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, display: 'inline-block' }} />}
                                        </div>
                                        {/* Task input - only visible when selected */}
                                        {isSelected && (
                                            <div style={{ padding: '8px 14px 12px 56px', background: 'var(--primary-light)' }}>
                                                <textarea
                                                    rows={2}
                                                    placeholder={`Describe the task(s) for ${u.name}...`}
                                                    value={assignee.task}
                                                    onClick={e => e.stopPropagation()}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        setForm(f => ({ ...f, handoverAssignees: f.handoverAssignees.map(a => a.id === u.id ? { ...a, task: val } : a) }));
                                                    }}
                                                    style={{
                                                        width: '100%', fontSize: 12, padding: '8px 10px', borderRadius: 6,
                                                        border: '1px solid var(--primary)', resize: 'vertical',
                                                        fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                                                        background: 'var(--bg-white)', color: 'var(--text-primary)'
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {form.handoverAssignees.length > 0 && (
                            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>
                                ✅ {form.handoverAssignees.length} colleague(s) selected for task handover
                            </div>
                        )}
                    </div>

                    {/* Reason */}
                    <div className="form-group">
                        <label className="form-label required">Reason for Leave</label>
                        <textarea
                            className={`form-control${errors.reason ? ' error' : ''}`} rows={4}
                            placeholder="Please describe the reason for your leave (at least 10 characters)..."
                            value={form.reason}
                            onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            {errors.reason ? <div className="form-error">{errors.reason}</div> : <span />}
                            <span className="form-hint">{form.reason.length} chars</span>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => navigate('/employee/dashboard')}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? 'Submitting...' : <><Send size={15} /> Submit Leave Request</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ApplyLeave;
