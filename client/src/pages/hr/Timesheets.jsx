import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, XCircle, Search } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const HRTimesheets = () => {
    const { user } = useAuth();
    const [timesheets, setTimesheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchTimesheets = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/timesheets/all');
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

    const handleStatusUpdate = async (id, status) => {
        try {
            await api.put(`/timesheets/status/${id}`, { status });
            toast.success(`Timesheet ${status} successfully`);
            fetchTimesheets();
        } catch {
            toast.error('Failed to update status');
        }
    };

    const filtered = timesheets.filter(ts => 
        (ts.employee_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ts.task || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const pendingCount = timesheets.filter(t => t.status === 'pending').length;

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>Team Timesheets</h1>
                <p>Review and approve employee daily timesheets</p>
            </div>

            <div className="stats-grid" style={{ marginBottom: 20 }}>
                <div className="card stat-card">
                    <div className="stat-icon" style={{ background: '#EFF6FF', color: '#3B82F6' }}><Clock size={20} /></div>
                    <div className="stat-value">{timesheets.length}</div>
                    <div className="stat-label">Total Submissions</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon" style={{ background: '#FEF3C7', color: '#D97706' }}><Clock size={20} /></div>
                    <div className="stat-value">{pendingCount}</div>
                    <div className="stat-label">Pending Approval</div>
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
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? Array(5).fill(0).map((_, i) => <tr key={i}>{Array(10).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" /></td>)}</tr>) :
                                filtered.length === 0 ? <tr><td colSpan={10}><div className="empty-state"><h3>No timesheets found</h3></div></td></tr> :
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
                                            <td style={{ fontWeight: 700, fontSize: 13 }}>{parseFloat(ts.total_hours).toFixed(2)}h</td>
                                            <td>
                                                {ts.status === 'approved' ? <span className="badge badge-approved"><span className="badge-dot" />Approved</span> :
                                                 ts.status === 'rejected' ? <span className="badge badge-rejected"><span className="badge-dot" />Rejected</span> :
                                                 <span className="badge badge-pending"><span className="badge-dot" />Pending</span>}
                                            </td>
                                            <td>
                                                {ts.status === 'pending' && (
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button className="btn btn-primary btn-sm btn-icon" onClick={() => handleStatusUpdate(ts.id, 'approved')} title="Approve">
                                                            <CheckCircle size={14} />
                                                        </button>
                                                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleStatusUpdate(ts.id, 'rejected')} title="Reject">
                                                            <XCircle size={14} />
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
        </div>
    );
};

export default HRTimesheets;
