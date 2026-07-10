import React, { useEffect, useState } from 'react';
import { Plus, Clock, CheckCircle, Clock3, Trash2, Edit2, Copy } from 'lucide-react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
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

    const calculateTotalHours = (tIn, tOut, breakMins, lunchMins) => {
        if (!tIn || !tOut) return 0;
        
        const start = new Date(`2000-01-01T${tIn}`);
        const end = new Date(`2000-01-01T${tOut}`);
        
        let diffMs = end - start;
        if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000; // Handle overnight shift
        
        const diffMins = Math.floor(diffMs / 60000);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.date || !form.task) { 
            toast.error('Date and Task are required'); 
            return; 
        }
        
        const totalHours = calculateTotalHours(form.time_in, form.time_out, form.break_duration, form.lunch_duration);

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

    const totalHoursLogged = timesheets.reduce((s, t) => s + parseFloat(t.total_hours || 0), 0);
    const pendingCount = timesheets.filter(t => t.status === 'pending').length;

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>My Timesheets</h1>
                <p>Log your daily tasks, hours, breaks, and lunches</p>
            </div>

            <div className="stats-grid" style={{ marginBottom: 20 }}>
                <div className="card stat-card">
                    <div className="stat-icon" style={{ background: '#EFF6FF', color: '#3B82F6' }}><Clock size={20} /></div>
                    <div className="stat-value">{totalHoursLogged.toFixed(2)}h</div>
                    <div className="stat-label">Total Hours Logged</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon" style={{ background: '#FEF3C7', color: '#D97706' }}><Clock3 size={20} /></div>
                    <div className="stat-value">{pendingCount}</div>
                    <div className="stat-label">Pending Approval</div>
                </div>
            </div>

            <div className="filter-bar">
                <div style={{ flex: 1 }} />
                <button className="btn btn-primary btn-sm" onClick={handleOpenModal}>
                    <Plus size={14} /> Add Timesheet Entry
                </button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Task Description</th>
                                <th style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Time In</th>
                                <th style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Time Out</th>
                                <th style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Total Hours</th>
                                <th style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Status</th>
                                <th style={{ fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>
                                    Actions <Copy size={16} style={{ marginLeft: 12, cursor: 'pointer', color: 'var(--text-muted)' }} />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? Array(3).fill(0).map((_, i) => <tr key={i}>{Array(6).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" /></td>)}</tr>) :
                                timesheets.length === 0 ? <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><Clock size={48} /></div><h3>No timesheets yet</h3><p>Start logging your work hours</p></div></td></tr> :
                                    timesheets.map(ts => (
                                        <tr key={ts.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                            <td style={{ fontSize: 13, color: 'var(--text-primary)', padding: '16px 12px' }}>{ts.task}</td>
                                            <td style={{ fontSize: 13, color: 'var(--text-primary)', padding: '16px 12px' }}>{formatTime(ts.time_in)}</td>
                                            <td style={{ fontSize: 13, color: 'var(--text-primary)', padding: '16px 12px' }}>{formatTime(ts.time_out)}</td>
                                            <td style={{ fontSize: 13, color: 'var(--text-primary)', padding: '16px 12px' }}>{formatTotalHours(ts.total_hours)}</td>
                                            <td style={{ fontSize: 13, color: 'var(--text-primary)', padding: '16px 12px' }}>
                                                {ts.status === 'pending' ? 'Pending' : ts.status === 'approved' ? 'Submitted' : 'Rejected'}
                                            </td>
                                            <td style={{ textAlign: 'right', padding: '16px 12px' }}>
                                                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', color: 'var(--text-muted)' }}>
                                                    <Edit2 size={16} onClick={() => handleEdit(ts)} style={{ cursor: 'pointer', color: '#F97316' }} />
                                                    <Trash2 size={16} onClick={() => handleDelete(ts.id)} style={{ cursor: 'pointer', color: '#94A3B8' }} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={modal} onClose={() => setModal(false)} title={editId ? "Edit Timesheet Entry" : "Add Timesheet Entry"} size="md">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label required">Date</label>
                        <input className="form-control" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label required">Task Description</label>
                        <textarea className="form-control" rows={3} value={form.task} onChange={e => setForm(f => ({ ...f, task: e.target.value }))} placeholder="Describe the tasks done..." required />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Time In</label>
                            <input className="form-control" type="time" value={form.time_in} onChange={e => setForm(f => ({ ...f, time_in: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Time Out</label>
                            <input className="form-control" type="time" value={form.time_out} onChange={e => setForm(f => ({ ...f, time_out: e.target.value }))} />
                        </div>
                    </div>
                    
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Break Duration (mins)</label>
                            <input className="form-control" type="number" min="0" value={form.break_duration} onChange={e => setForm(f => ({ ...f, break_duration: e.target.value }))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Lunch Duration (mins)</label>
                            <input className="form-control" type="number" min="0" value={form.lunch_duration} onChange={e => setForm(f => ({ ...f, lunch_duration: e.target.value }))} />
                        </div>
                    </div>

                    <div className="form-actions" style={{ marginTop: 24 }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Timesheet'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default EmployeeTimesheets;
