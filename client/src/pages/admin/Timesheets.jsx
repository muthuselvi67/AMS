import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, XCircle, Search } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const AdminTimesheets = () => {
    const { user } = useAuth();
    const [timesheets, setTimesheets] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [timesheetsRes, usersRes] = await Promise.all([
                api.get('/timesheets/all'),
                api.get('/users')
            ]);
            setTimesheets(timesheetsRes.data.data?.timesheets || []);
            setEmployees(usersRes.data.data || []);
        } catch { 
            toast.error('Failed to load data'); 
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleStatusUpdate = async (id, status) => {
        try {
            await api.put(`/timesheets/status/${id}`, { status });
            toast.success(`Timesheet ${status} successfully`);
            fetchData();
        } catch {
            toast.error('Failed to update status');
        }
    };

    const getFormattedTotal = (ts) => {
        let displayHours = parseFloat(ts.total_hours || 0);
        const lowerTask = (ts.task || '').toLowerCase();
        if (lowerTask.includes('break') || lowerTask.includes('lunch')) {
            if (ts.time_in && ts.time_out) {
                const start = new Date(`2000-01-01T${ts.time_in}`);
                const end = new Date(`2000-01-01T${ts.time_out}`);
                let diffMs = end - start;
                if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
                displayHours = Math.floor(diffMs / 60000) / 60;
            }
        }
        const totalMinutes = Math.round(displayHours * 60);
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${h}h ${m.toString().padStart(2, '0')}m`;
    };

    const filtered = timesheets.filter(ts => 
        (ts.employee_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ts.task || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const pendingCount = timesheets.filter(t => t.status === 'pending').length;

    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const todaysTimesheets = timesheets.filter(ts => ts.date && ts.date.startsWith(todayStr));
    const submittedUserIdsString = new Set(todaysTimesheets.map(ts => String(ts.user_id)));

    const activeEmployees = employees.filter(e => (Number(e.isActive) === 1 || e.isActive === true || e.isActive === '1') && (e.role || '').toLowerCase() === 'employee');
    const submittedList = activeEmployees.filter(e => submittedUserIdsString.has(String(e.id)));
    const notSubmittedList = activeEmployees.filter(e => !submittedUserIdsString.has(String(e.id)));

    const getEmployeeTotalHours = (empId) => {
        const empTimesheets = todaysTimesheets.filter(ts => String(ts.user_id) === String(empId));
        let totalMins = 0;
        empTimesheets.forEach(ts => {
            let displayHours = parseFloat(ts.total_hours || 0);
            const lowerTask = (ts.task || '').toLowerCase();
            if (lowerTask.includes('break') || lowerTask.includes('lunch')) {
                if (ts.time_in && ts.time_out) {
                    const start = new Date(`2000-01-01T${ts.time_in}`);
                    const end = new Date(`2000-01-01T${ts.time_out}`);
                    let diffMs = end - start;
                    if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
                    displayHours = Math.floor(diffMs / 60000) / 60;
                }
            }
            totalMins += Math.round(displayHours * 60);
        });
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        return `${h}h ${m.toString().padStart(2, '0')}m`;
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Team Timesheets</h1>
                <p>Review and approve employee daily timesheets</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div className="card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></span>
                        Submitted Today ({submittedList.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto', paddingRight: '8px' }}>
                        {submittedList.length === 0 ? (
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No submissions yet today.</div>
                        ) : (
                            submittedList.map(emp => (
                                <div key={emp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#F8F9FB', borderRadius: '8px' }}>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {emp.name} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal', fontSize: '12px', marginLeft: '4px' }}>({getEmployeeTotalHours(emp.id)})</span>
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.department || 'Employee'}</div>
                                    </div>
                                    <CheckCircle size={16} color="#10B981" />
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }}></span>
                        Pending Submission ({notSubmittedList.length})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto', paddingRight: '8px' }}>
                        {notSubmittedList.length === 0 ? (
                            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Everyone has submitted today!</div>
                        ) : (
                            notSubmittedList.map(emp => (
                                <div key={emp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#FFFBEB', borderRadius: '8px', border: '1px solid #FEF3C7' }}>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#92400E' }}>{emp.name}</div>
                                        <div style={{ fontSize: '11px', color: '#B45309' }}>{emp.department || 'Employee'}</div>
                                    </div>
                                    <Clock size={16} color="#F59E0B" />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="filter-bar" style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div className="search-input" style={{ flex: 1, maxWidth: 300, position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }} />
                    <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Search by employee or task..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: 36 }}
                    />
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Employee</th>
                                <th>Task Description</th>
                                <th>Time In</th>
                                <th>Time Out</th>
                                <th>Break</th>
                                <th>Lunch</th>
                                <th>Total Hrs</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? Array(5).fill(0).map((_, i) => <tr key={i}>{Array(8).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" /></td>)}</tr>) :
                                filtered.length === 0 ? <tr><td colSpan={8}><div className="empty-state"><h3>No timesheets found</h3></div></td></tr> :
                                    filtered.map(ts => (
                                        <tr key={ts.id}>
                                            <td style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{new Date(ts.date).toLocaleDateString('en-IN')}</td>
                                            <td style={{ fontSize: 13, fontWeight: 500 }}>
                                                {ts.employee_name}
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{ts.department}</div>
                                            </td>
                                            <td style={{ fontSize: 13, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ts.task}>{ts.task}</td>
                                            <td style={{ fontSize: 13 }}>{ts.time_in ? ts.time_in.substring(0,5) : '--:--'}</td>
                                            <td style={{ fontSize: 13 }}>{ts.time_out ? ts.time_out.substring(0,5) : '--:--'}</td>
                                            <td style={{ fontSize: 13 }}>{ts.break_duration}m</td>
                                            <td style={{ fontSize: 13 }}>{ts.lunch_duration}m</td>
                                            <td style={{ fontWeight: 700, fontSize: 13 }}>{getFormattedTotal(ts)}</td>
                                        </tr>
                                    ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminTimesheets;
