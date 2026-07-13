import React, { useEffect, useState } from 'react';
import { Plus, Clock, CheckCircle, Clock3, Trash2, Edit2, Copy, Info, Check, Coffee, Monitor, Laptop } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import TimePicker from '../../components/ui/TimePicker';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const EmployeeTimesheets = () => {
    const { user } = useAuth();
    const [timesheets, setTimesheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editId, setEditId] = useState(null);
    
    // Default values for new timesheet
    const [form, setForm] = useState({ 
        date: new Date().toISOString().split('T')[0], 
        task: '', 
        time_in: '', 
        time_out: '',
        break_duration: 0,
        lunch_duration: 0 
    });

    const fetchTimesheets = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/timesheets/my');
            setTimesheets(data.data?.timesheets || []);
        } catch { 
            toast.error('Failed to load timesheets'); 
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => {
        fetchTimesheets();
    }, []);

    const calculateTotalHours = (tIn, tOut, breakMins, lunchMins, taskName) => {
        if (!tIn || !tOut) return 0;
        
        const start = new Date(`2000-01-01T${tIn}`);
        const end = new Date(`2000-01-01T${tOut}`);
        
        let diffMs = end - start;
        if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000; // Handle overnight shift
        
        const diffMins = Math.floor(diffMs / 60000);
        
        const lowerTask = (taskName || '').toLowerCase();
        if (lowerTask.includes('break') || lowerTask.includes('lunch')) {
            return Math.max(0, (diffMins / 60).toFixed(2));
        }
        
        const totalWorkedMins = diffMins - (parseInt(breakMins) || 0) - (parseInt(lunchMins) || 0);
        return Math.max(0, (totalWorkedMins / 60).toFixed(2));
    };

    const formatTime = (timeString) => {
        if (!timeString) return '--:--';
        const [h, m] = timeString.split(':');
        let hours = parseInt(h);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours.toString().padStart(2, '0')}:${m} ${ampm}`;
    };

    const formatTotalHours = (decimalHours) => {
        if (!decimalHours) return '0h 00m';
        const totalMinutes = Math.round(parseFloat(decimalHours) * 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${h}h ${m.toString().padStart(2, '0')}m`;
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', background: '#dcfce7', color: '#166534', fontSize: '12px', fontWeight: 600 }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />Approved</span>;
            case 'pending':
                return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', background: '#fef3c7', color: '#92400e', fontSize: '12px', fontWeight: 600 }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706' }} />Pending</span>;
            case 'rejected':
                return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', background: '#fee2e2', color: '#991b1b', fontSize: '12px', fontWeight: 600 }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626' }} />Rejected</span>;
            default:
                return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', background: '#f1f5f9', color: '#475569', fontSize: '12px', fontWeight: 600 }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#64748b' }} />{status}</span>;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.date || !form.task) { 
            toast.error('Date and Task are required'); 
            return; 
        }
        
        const totalHours = calculateTotalHours(form.time_in, form.time_out, form.break_duration, form.lunch_duration, form.task);

        setSaving(true);
        try {
            if (editId) {
                await api.put(`/timesheets/${editId}`, {
                    date: form.date,
                    task: form.task,
                    time_in: form.time_in || null,
                    time_out: form.time_out || null,
                    break_duration: form.break_duration,
                    lunch_duration: form.lunch_duration,
                    total_hours: totalHours
                });
                toast.success('Timesheet entry updated!');
            } else {
                await api.post('/timesheets/create', {
                    date: form.date,
                    task: form.task,
                    time_in: form.time_in || null,
                    time_out: form.time_out || null,
                    break_duration: form.break_duration,
                    lunch_duration: form.lunch_duration,
                    total_hours: totalHours
                });
                toast.success('Timesheet entry added!');
            }
            setModal(false);
            setForm({ date: new Date().toISOString().split('T')[0], task: '', time_in: '', time_out: '', break_duration: 0, lunch_duration: 0 });
            setEditId(null);
            fetchTimesheets();
        } catch (err) { 
            toast.error(err.response?.data?.message || 'Failed to add entry'); 
        } finally { 
            setSaving(false); 
        }
    };

    const handleEdit = (ts) => {
        if (ts.status === 'approved') {
            toast.error('Cannot edit an approved timesheet');
            return;
        }
        setForm({
            date: ts.date.split('T')[0],
            task: ts.task,
            time_in: ts.time_in || '',
            time_out: ts.time_out || '',
            break_duration: ts.break_duration || 0,
            lunch_duration: ts.lunch_duration || 0
        });
        setEditId(ts.id);
        setModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this timesheet entry?')) return;
        try {
            await api.delete(`/timesheets/${id}`);
            toast.success('Timesheet entry deleted!');
            fetchTimesheets();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete entry');
        }
    };

    const handleOpenModal = () => {
        setForm({ date: new Date().toISOString().split('T')[0], task: '', time_in: '', time_out: '', break_duration: 0, lunch_duration: 0 });
        setEditId(null);
        setModal(true);
    };

    const totalHoursLogged = timesheets.reduce((s, t) => {
        const lowerTask = (t.task || '').toLowerCase();
        let displayHours = parseFloat(t.total_hours || 0);
        
        if (lowerTask.includes('break') || lowerTask.includes('lunch')) {
            if (t.time_in && t.time_out) {
                const start = new Date(`2000-01-01T${t.time_in}`);
                const end = new Date(`2000-01-01T${t.time_out}`);
                let diffMs = end - start;
                if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
                displayHours = Math.floor(diffMs / 60000) / 60;
            }
        }
        return s + displayHours;
    }, 0);

    const actualWorkHours = timesheets.reduce((s, t) => {
        const lowerTask = (t.task || '').toLowerCase();
        if (lowerTask.includes('break') || lowerTask.includes('lunch')) return s;
        return s + parseFloat(t.total_hours || 0);
    }, 0);

    const totalBreakHours = timesheets.reduce((s, t) => {
        const lowerTask = (t.task || '').toLowerCase();
        let displayHours = 0;
        if (lowerTask.includes('break') || lowerTask.includes('lunch')) {
            if (t.time_in && t.time_out) {
                const start = new Date(`2000-01-01T${t.time_in}`);
                const end = new Date(`2000-01-01T${t.time_out}`);
                let diffMs = end - start;
                if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
                displayHours = Math.floor(diffMs / 60000) / 60;
            }
        } else {
            const breakMins = parseInt(t.break_duration) || 0;
            const lunchMins = parseInt(t.lunch_duration) || 0;
            displayHours = (breakMins + lunchMins) / 60;
        }
        return s + displayHours;
    }, 0);

    const getTaskIconAndBadge = (taskName, index) => {
        const lowerTask = taskName.toLowerCase();
        if (lowerTask.includes('break') || lowerTask.includes('lunch')) {
            return {
                icon: <Coffee size={20} color="#8B5CF6" />,
                bg: '#F5F3FF',
                badgeText: 'Break',
                badgeColor: '#8B5CF6',
                badgeBg: '#EDE9FE'
            };
        }
        
        if (index % 2 !== 0) {
            return {
                icon: <Monitor size={20} color="#10B981" />,
                bg: '#ECFDF5',
                badgeText: 'Work',
                badgeColor: '#10B981',
                badgeBg: '#D1FAE5'
            };
        }
        
        return {
            icon: <Laptop size={20} color="#3B82F6" />,
            bg: '#EFF6FF',
            badgeText: 'Work',
            badgeColor: '#3B82F6',
            badgeBg: '#DBEAFE'
        };
    };

    const getTotalHoursBadge = (decimalHours, taskName, index, timeIn, timeOut) => {
        const lowerTask = taskName.toLowerCase();
        
        let displayHours = decimalHours;
        if (lowerTask.includes('break') || lowerTask.includes('lunch')) {
            if (timeIn && timeOut) {
                const start = new Date(`2000-01-01T${timeIn}`);
                const end = new Date(`2000-01-01T${timeOut}`);
                let diffMs = end - start;
                if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
                displayHours = (Math.floor(diffMs / 60000) / 60).toFixed(2);
            }
        }

        const formatted = formatTotalHours(displayHours);
        let color = '#3B82F6';
        let bg = '#EFF6FF';
        
        if (lowerTask.includes('break') || lowerTask.includes('lunch')) {
            color = '#8B5CF6';
            bg = '#F5F3FF';
        } else if (index % 2 !== 0) {
            color = '#10B981';
            bg = '#ECFDF5';
        }

        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 12px', borderRadius: '8px', background: bg, color: color, fontSize: '13px', fontWeight: 600 }}>
                {formatted}
            </span>
        );
    };

    return (
        <div className="fade-in">
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.5px' }}>My Timesheets</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Log your daily tasks, hours, breaks, and lunches</p>
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '24px' }}>
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px 32px', flex: '1 1 300px', boxShadow: 'var(--shadow-sm)', borderRadius: '12px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B5CF6' }}>
                        <Clock size={28} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Working Hours</span>
                        <span style={{ fontSize: '26px', fontWeight: 700, color: '#8B5CF6', lineHeight: 1 }}>{formatTotalHours(actualWorkHours)}</span>
                    </div>
                </div>
                
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px 32px', flex: '1 1 300px', boxShadow: 'var(--shadow-sm)', borderRadius: '12px', background: '#FFFAF5' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#FFF3E0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F97316' }}>
                        <Clock size={28} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Entries Today</span>
                        <span style={{ fontSize: '26px', fontWeight: 700, color: '#F97316', lineHeight: 1 }}>{timesheets.length}</span>
                    </div>
                </div>

                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '24px 32px', flex: '1 1 300px', boxShadow: 'var(--shadow-sm)', borderRadius: '12px', background: '#FDF2F8' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#FCE7F3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EC4899' }}>
                        <Coffee size={28} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Break Time</span>
                        <span style={{ fontSize: '26px', fontWeight: 700, color: '#EC4899', lineHeight: 1 }}>{formatTotalHours(totalBreakHours)}</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
                <button className="btn btn-primary" onClick={handleOpenModal} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '8px', fontWeight: 600 }}>
                    <Plus size={18} /> Add Timesheet Entry
                </button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
                <div className="table-container">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#F8F9FB', borderBottom: '1px solid var(--border-light)' }}>
                                <th style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '12px', padding: '16px 24px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Task Description</th>
                                <th style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '12px', padding: '16px 24px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time In</th>
                                <th style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '12px', padding: '16px 24px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time Out</th>
                                <th style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '12px', padding: '16px 24px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Hours</th>
                                <th style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '12px', padding: '16px 24px', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? Array(3).fill(0).map((_, i) => <tr key={i}>{Array(5).fill(0).map((_, j) => <td key={j} style={{ padding: '24px' }}><div className="skeleton skeleton-text" /></td>)}</tr>) :
                                timesheets.length === 0 ? <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><Clock size={48} /></div><h3>No timesheets yet</h3><p>Start logging your work hours</p></div></td></tr> :
                                    timesheets.map((ts, idx) => {
                                        const ui = getTaskIconAndBadge(ts.task, idx);
                                        return (
                                            <tr key={ts.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                                <td style={{ padding: '20px 24px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: ui.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            {ui.icon}
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{ts.task}</span>
                                                            <span style={{ fontSize: '11px', fontWeight: 700, background: ui.badgeBg, color: ui.badgeColor, padding: '2px 8px', borderRadius: '12px', width: 'fit-content' }}>{ui.badgeText}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: '14px', color: 'var(--text-secondary)', padding: '20px 24px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Clock size={14} color="#8B5CF6" /> {formatTime(ts.time_in)}
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: '14px', color: 'var(--text-secondary)', padding: '20px 24px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Clock size={14} color="#8B5CF6" /> {formatTime(ts.time_out)}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '20px 24px' }}>
                                                    {getTotalHoursBadge(ts.total_hours, ts.task, idx, ts.time_in, ts.time_out)}
                                                </td>
                                                <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                        <button onClick={() => handleEdit(ts)} style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E5E1F9', borderRadius: '8px', background: 'transparent', color: '#8B5CF6', cursor: 'pointer', transition: 'all 0.2s' }}>
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button onClick={() => handleDelete(ts.id)} style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #FEE2E2', borderRadius: '8px', background: 'transparent', color: '#EF4444', cursor: 'pointer', transition: 'all 0.2s' }}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                        </tbody>
                        {timesheets.length > 0 && !loading && (
                            <tfoot>
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'right', fontWeight: 700, padding: '24px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                        Total Working Hours:
                                    </td>
                                    <td style={{ padding: '24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Clock size={20} color="#8B5CF6" />
                                            <span style={{ fontWeight: 800, fontSize: '18px', color: '#8B5CF6' }}>{formatTotalHours(totalHoursLogged)}</span>
                                        </div>
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            <Modal isOpen={modal} onClose={() => setModal(false)} title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', background: 'var(--primary-light)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                        <Clock size={24} strokeWidth={2.5} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{editId ? "Edit Timesheet Entry" : "Add Timesheet Entry"}</span>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>Log your working hours</span>
                    </div>
                </div>
            } size="md">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label required">Date</label>
                        <input className="form-control" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label required">Task Description</label>
                        <textarea className="form-control" rows={3} value={form.task} onChange={e => setForm(f => ({ ...f, task: e.target.value }))} placeholder="Describe the tasks done..." required />
                    </div>

                    <div className="form-row" style={{ marginTop: '24px' }}>
                        <div className="form-group" style={{ position: 'relative', zIndex: 3 }}>
                            <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Time In</label>
                            <TimePicker value={form.time_in} onChange={val => setForm(f => ({ ...f, time_in: val }))} />
                        </div>
                        <div className="form-group" style={{ position: 'relative', zIndex: 2 }}>
                            <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Time Out</label>
                            <TimePicker value={form.time_out} onChange={val => setForm(f => ({ ...f, time_out: val }))} />
                        </div>
                    </div>
                    
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Break Duration (mins)</label>
                            <input className="form-control" type="number" min="0" value={form.break_duration} onChange={e => setForm(f => ({ ...f, break_duration: e.target.value }))} style={{ fontSize: '14px', padding: '10px 14px' }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Lunch Duration (mins)</label>
                            <input className="form-control" type="number" min="0" value={form.lunch_duration} onChange={e => setForm(f => ({ ...f, lunch_duration: e.target.value }))} style={{ fontSize: '14px', padding: '10px 14px' }} />
                        </div>
                    </div>

                    <div className="form-actions" style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setModal(false)} style={{ background: '#fff', border: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 600, padding: '10px 20px', borderRadius: '8px' }}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, padding: '10px 20px', borderRadius: '8px' }}>
                            {saving ? 'Saving...' : <><Check size={18} /> Save Timesheet</>}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default EmployeeTimesheets;
