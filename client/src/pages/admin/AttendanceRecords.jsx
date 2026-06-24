import React, { useEffect, useState, useMemo } from 'react';
import { Search, MapPin, Clock, Home, Calendar } from 'lucide-react';
import api, { getServerUrl } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const AttendanceRecords = () => {
    const { user } = useAuth();
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ startDate: '', endDate: '', status: '', name: '' });

    // HR Attendance Summary Tab states
    const [activeTab, setActiveTab] = useState('logs');
    const [summaryMonth, setSummaryMonth] = useState(new Date().getMonth());
    const [summaryYear, setSummaryYear] = useState(new Date().getFullYear());
    const [employees, setEmployees] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [summaryAttendance, setSummaryAttendance] = useState([]);
    const [summaryLeaves, setSummaryLeaves] = useState([]);
    const [summarySearch, setSummarySearch] = useState('');
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [selfieModal, setSelfieModal] = useState(null); // { src, name, time, type }

    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;
            if (filters.status) params.status = filters.status;
            const { data } = await api.get('/attendance', { params });
            setRecords(data.data);
        } catch { toast.error('Failed to load attendance'); }
        finally { setLoading(false); }
    };

    const fetchSummaryData = async () => {
        setSummaryLoading(true);
        try {
            const startOfMonth = `${summaryYear}-${String(summaryMonth + 1).padStart(2, '0')}-01`;
            const lastDay = new Date(summaryYear, summaryMonth + 1, 0).getDate();
            const endOfMonth = `${summaryYear}-${String(summaryMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

            const [usersRes, holidaysRes, attendanceRes, leavesRes] = await Promise.all([
                api.get('/users'),
                api.get('/holidays', { params: { year: summaryYear } }),
                api.get('/attendance', { params: { startDate: startOfMonth, endDate: endOfMonth } }),
                api.get('/leaves', { params: { status: 'approved' } })
            ]);

            const usersList = usersRes.data.data || [];
            setEmployees(usersList.filter(u => u.role === 'employee'));
            setHolidays(holidaysRes.data.data || []);
            setSummaryAttendance(attendanceRes.data.data || attendanceRes.data || []);
            setSummaryLeaves(leavesRes.data.data?.leaves || leavesRes.data.data || []);
        } catch (err) {
            console.error('Summary fetch error:', err);
            toast.error('Failed to load attendance summary data');
        } finally {
            setSummaryLoading(false);
        }
    };

    useEffect(() => {
        setFilters(f => ({ ...f, startDate: monthStart, endDate: today }));
    }, []);

    useEffect(() => {
        if (filters.startDate || filters.endDate) fetchRecords();
    }, [filters]);

    useEffect(() => {
        if (activeTab === 'summary') {
            fetchSummaryData();
        }
    }, [activeTab, summaryMonth, summaryYear]);

    const initials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
    const fmtTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const fmtShort = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '';

    const statusBadge = { present: 'badge-present', absent: 'badge-absent', late: 'badge-late', 'on-leave': 'badge-on-leave', 'half-day': 'badge-pending' };

    const filteredRecords = records.filter(r => {
        if (filters.wfh === '1') return !!r.work_from_home;
        if (filters.wfh === '0') return !r.work_from_home;
        return true;
    }).filter(r => {
        if (!filters.name) return true;
        return r.employee?.name?.toLowerCase().includes(filters.name.toLowerCase());
    });

    const summaryData = useMemo(() => {
        if (activeTab !== 'summary') return [];

        const lastDay = new Date(summaryYear, summaryMonth + 1, 0).getDate();

        let totalWorkingDays = 0;
        const workingDaysList = [];
        for (let d = 1; d <= lastDay; d++) {
            const dateStr = `${summaryYear}-${String(summaryMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const dateObj = new Date(summaryYear, summaryMonth, d);
            const dayOfWeek = dateObj.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            const isGovtHoliday = holidays.some(h => {
                const hDate = h.date.split(' ')[0].split('T')[0];
                return hDate === dateStr && (h.type === 'government' || h.type === 'national');
            });

            if (!isWeekend && !isGovtHoliday) {
                totalWorkingDays++;
                workingDaysList.push(dateStr);
            }
        }

        if (totalWorkingDays === 0) totalWorkingDays = 1;

        return employees.map(emp => {
            let presentDays = 0;
            let absentDays = 0;
            let leaveDays = 0;

            workingDaysList.forEach(dateStr => {
                const record = summaryAttendance.find(r => {
                    const rDate = r.date.split(' ')[0].split('T')[0];
                    const rEmpId = r.employee_id || r.employee?.id;
                    return rDate === dateStr && Number(rEmpId) === Number(emp.id);
                });

                if (record) {
                    if (record.status === 'present' || record.status === 'late') {
                        presentDays += 1;
                    } else if (record.status === 'half-day') {
                        presentDays += 0.5;
                        absentDays += 0.5;
                    } else if (record.status === 'on-leave') {
                        leaveDays += 1;
                    } else if (record.status === 'absent') {
                        absentDays += 1;
                    }
                } else {
                    const leaveForDay = summaryLeaves.find(l => {
                        const start = (l.startDate || l.start_date || '').split(' ')[0];
                        const end = (l.endDate || l.end_date || '').split(' ')[0];
                        const lEmpId = l.employee_id || l.employee?.id;
                        return Number(lEmpId) === Number(emp.id) && dateStr >= start && dateStr <= end && l.status === 'approved';
                    });

                    if (leaveForDay) {
                        leaveDays += 1;
                    } else {
                        absentDays += 1;
                    }
                }
            });

            const attendancePercentage = ((presentDays / totalWorkingDays) * 100).toFixed(1);

            return {
                employee: emp,
                totalWorkingDays,
                presentDays,
                absentDays,
                leaveDays,
                attendancePercentage
            };
        });
    }, [activeTab, summaryMonth, summaryYear, employees, holidays, summaryAttendance, summaryLeaves]);

    const filteredSummaryData = summaryData.filter(d => {
        if (!summarySearch) return true;
        return d.employee?.name?.toLowerCase().includes(summarySearch.toLowerCase());
    });

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1>{user?.role === 'hr' ? 'HRMS: Attendance' : 'Attendance Records'}</h1>
                <p>{user?.role === 'hr' ? 'Track and monitor employee attendance logs' : 'View and filter all employee check-in/check-out records'}</p>
            </div>

            {user?.role === 'hr' && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid #E5E7EB', paddingBottom: 12 }}>
                    <button
                        className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                        onClick={() => setActiveTab('logs')}
                        style={{ borderRadius: 6 }}
                    >
                        Daily Logs
                    </button>
                    <button
                        className={`btn ${activeTab === 'summary' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                        onClick={() => setActiveTab('summary')}
                        style={{ borderRadius: 6 }}
                    >
                        Attendance Summary
                    </button>
                </div>
            )}

            {activeTab === 'logs' ? (
                <>
                    <div className="filter-bar">
                        <div className="search-input-wrapper">
                            <Search className="search-icon" size={16} />
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search employee..."
                                value={filters.name || ''}
                                onChange={e => setFilters(f => ({ ...f, name: e.target.value }))}
                            />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                            <input type="date" className="form-control" value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} />
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>to</span>
                        <div className="form-group" style={{ margin: 0 }}>
                            <input type="date" className="form-control" value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} />
                        </div>
                        <select className="form-control" style={{ width: 160 }} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                            <option value="">All Status</option>
                            <option value="present">Present</option>
                            <option value="absent">Absent</option>
                            <option value="late">Late</option>
                            <option value="on-leave">On Leave</option>
                        </select>
                        <select className="form-control" style={{ width: 150 }} value={filters.wfh ?? ''} onChange={e => setFilters(f => ({ ...f, wfh: e.target.value }))}>
                            <option value="">All Types</option>
                            <option value="1">WFH Only</option>
                            <option value="0">Office Only</option>
                        </select>
                    </div>

                    <div className="card" style={{ padding: 0 }}>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Employee</th><th>Date</th><th>Check In</th><th>Check Out</th>
                                        <th>Hours</th><th>Type</th><th>Status</th><th>Location</th><th>Selfie</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        Array(8).fill(0).map((_, i) => (
                                            <tr key={i}>{Array(9).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" /></td>)}</tr>
                                        ))
                                    ) : filteredRecords.length === 0 ? (
                                        <tr><td colSpan={9}><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><Clock size={48} /></div><h3>No attendance records found</h3></div></td></tr>
                                    ) : (
                                        filteredRecords.map(r => (
                                            <tr key={r.id}>
                                                <td>
                                                    <div className="table-avatar">
                                                        <div className="table-avatar-img">{initials(r.employee?.name)}</div>
                                                        <div>
                                                            <div style={{ fontWeight: 600 }}>{r.employee?.name}</div>
                                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.employee?.department}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{r.date}</td>
                                                <td style={{ color: 'var(--secondary)', fontWeight: 600 }}>{fmtTime(r.checkIn?.time)}</td>
                                                <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{fmtTime(r.checkOut?.time)}</td>
                                                <td>{r.totalHours > 0 ? <strong>{r.totalHours}h</strong> : ''}</td>
                                                <td>
                                                    {r.work_from_home
                                                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, background: '#EDE9FE', color: '#7C3AED', padding: '3px 10px', borderRadius: 20 }}><Home size={10} /> WFH</span>
                                                        : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, background: '#E6FDF4', color: '#059669', padding: '3px 10px', borderRadius: 20 }}>Office</span>
                                                    }
                                                </td>
                                                <td><span className={`badge ${statusBadge[r.status] || 'badge-pending'} `}><span className="badge-dot" />{r.status}</span></td>
                                                <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 220, lineHeight: 1.4 }}>
                                                    {r.checkIn?.latitude ? (
                                                        <div style={{ marginBottom: r.checkOut?.latitude ? 8 : 0 }}>
                                                            <div style={{ fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <span className="badge badge-present" style={{ padding: '2px 4px', fontSize: 9 }}>IN</span>
                                                                <a
                                                                    href={`https://www.google.com/maps/search/?api=1&query=${r.checkIn.latitude},${r.checkIn.longitude}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{ color: 'var(--primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 2, fontWeight: 700 }}
                                                                    title="View Check-In on Google Maps"
                                                                >
                                                                    <MapPin size={10} />
                                                                    {r.checkIn.latitude.toFixed(4)}, {r.checkIn.longitude.toFixed(4)}
                                                                </a>
                                                            </div>
                                                            <div className="truncate" style={{ fontSize: 10, marginTop: 2, opacity: 0.8 }} title={r.checkIn.address}>
                                                                {r.work_from_home ? (r.checkIn.address || 'Address not available') : (r.checkIn.address || 'LearnLike')}
                                                            </div>
                                                        </div>
                                                    ) : null}

                                                    {r.checkOut?.latitude ? (
                                                        <div>
                                                            <div style={{ fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <span className="badge badge-absent" style={{ padding: '2px 4px', fontSize: 9 }}>OUT</span>
                                                                <a
                                                                    href={`https://www.google.com/maps/search/?api=1&query=${r.checkOut.latitude},${r.checkOut.longitude}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{ color: 'var(--danger)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 2, fontWeight: 700 }}
                                                                    title="View Check-Out on Google Maps"
                                                                >
                                                                    <MapPin size={10} />
                                                                    {r.checkOut.latitude.toFixed(4)}, {r.checkOut.longitude.toFixed(4)}
                                                                </a>
                                                            </div>
                                                            <div className="truncate" style={{ fontSize: 10, marginTop: 2, opacity: 0.8 }} title={r.checkOut.address}>
                                                                {r.work_from_home ? (r.checkOut.address || 'Address not available') : (r.checkOut.address || 'LearnLike')}
                                                            </div>
                                                        </div>
                                                    ) : null}

                                                    {!r.checkIn?.latitude && !r.checkOut?.latitude && (
                                                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No GPS coordinates</span>
                                                    )}
                                                </td>

                                                {/* ── Selfie Column ── */}
                                                <td style={{ textAlign: 'center' }}>
                                                    {r.checkIn?.photo || r.checkOut?.photo ? (
                                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                                                            {r.checkIn?.photo && (
                                                                <button
                                                                    onClick={() => setSelfieModal({
                                                                        src: r.checkIn.photo,
                                                                        name: r.employee?.name,
                                                                        date: fmtShort(r.date),
                                                                        time: fmtTime(r.checkIn.time),
                                                                        type: 'Check-In',
                                                                        latitude: r.checkIn?.latitude || r.check_in_latitude,
                                                                        longitude: r.checkIn?.longitude || r.check_in_longitude,
                                                                        address: r.checkIn?.address || r.check_in_address,
                                                                        workFromHome: r.work_from_home
                                                                    })}
                                                                    title="View Check-In Selfie"
                                                                    style={{
                                                                        border: '2px solid #10B981', borderRadius: 8, padding: 0,
                                                                        cursor: 'pointer', background: 'none', overflow: 'hidden',
                                                                        width: 44, height: 44, flexShrink: 0
                                                                    }}
                                                                >
                                                                    <img src={getServerUrl(r.checkIn.photo)} alt="Check-In"
                                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                        onError={e => {
                                                                            if (!e.target.dataset.error) {
                                                                                e.target.dataset.error = "true";
                                                                                e.target.style.display = 'none';
                                                                                e.target.insertAdjacentHTML('afterend', '<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#F3F4F6;color:#9CA3AF;font-size:10px">N/A</div>');
                                                                            }
                                                                        }}
                                                                    />
                                                                </button>
                                                            )}
                                                            {r.checkOut?.photo && (
                                                                <button
                                                                    onClick={() => setSelfieModal({
                                                                        src: r.checkOut.photo,
                                                                        name: r.employee?.name,
                                                                        date: fmtShort(r.date),
                                                                        time: fmtTime(r.checkOut.time),
                                                                        type: 'Check-Out',
                                                                        latitude: r.checkOut?.latitude || r.check_out_latitude,
                                                                        longitude: r.checkOut?.longitude || r.check_out_longitude,
                                                                        address: r.checkOut?.address || r.check_out_address,
                                                                        workFromHome: r.work_from_home
                                                                    })}
                                                                    title="View Check-Out Selfie"
                                                                    style={{
                                                                        border: '2px solid #EF4444', borderRadius: 8, padding: 0,
                                                                        cursor: 'pointer', background: 'none', overflow: 'hidden',
                                                                        width: 44, height: 44, flexShrink: 0
                                                                    }}
                                                                >
                                                                    <img src={getServerUrl(r.checkOut.photo)} alt="Check-Out"
                                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                                        onError={e => {
                                                                            if (!e.target.dataset.error) {
                                                                                e.target.dataset.error = "true";
                                                                                e.target.style.display = 'none';
                                                                                e.target.insertAdjacentHTML('afterend', '<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#F3F4F6;color:#9CA3AF;font-size:10px">N/A</div>');
                                                                            }
                                                                        }}
                                                                    />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)', fontSize: 11, fontStyle: 'italic' }}>—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="filter-bar">
                        <div className="search-input-wrapper">
                            <Search className="search-icon" size={16} />
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search employee..."
                                value={summarySearch}
                                onChange={e => setSummarySearch(e.target.value)}
                            />
                        </div>
                        <select className="form-control" style={{ width: 160 }} value={summaryMonth} onChange={e => setSummaryMonth(Number(e.target.value))}>
                            {MONTHS.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}
                        </select>
                        <select className="form-control" style={{ width: 120 }} value={summaryYear} onChange={e => setSummaryYear(Number(e.target.value))}>
                            <option value={2025}>2025</option>
                            <option value={2026}>2026</option>
                            <option value={2027}>2027</option>
                        </select>
                    </div>

                    <div className="card" style={{ padding: 0 }}>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Employee</th>
                                        <th>Working Days</th>
                                        <th>Present Days</th>
                                        <th>Absent Days</th>
                                        <th>Leave Days</th>
                                        <th>Attendance Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaryLoading ? (
                                        Array(6).fill(0).map((_, i) => (
                                            <tr key={i}>{Array(6).fill(0).map((_, j) => <td key={j}><div className="skeleton skeleton-text" /></td>)}</tr>
                                        ))
                                    ) : filteredSummaryData.length === 0 ? (
                                        <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><Clock size={48} /></div><h3>No summary records found</h3></div></td></tr>
                                    ) : (
                                        filteredSummaryData.map((row, idx) => (
                                            <tr key={idx}>
                                                <td>
                                                    <div className="table-avatar">
                                                        <div className="table-avatar-img">{initials(row.employee?.name)}</div>
                                                        <div>
                                                            <div style={{ fontWeight: 600 }}>{row.employee?.name}</div>
                                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.employee?.department || 'Employee'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td><strong>{row.totalWorkingDays} days</strong></td>
                                                <td style={{ color: '#059669', fontWeight: 600 }}>{row.presentDays} days</td>
                                                <td style={{ color: '#EF4444', fontWeight: 600 }}>{row.absentDays} days</td>
                                                <td style={{ color: '#7C3AED', fontWeight: 600 }}>{row.leaveDays} days</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div style={{ flex: 1, minWidth: 80, background: '#E5E7EB', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                                                            <div style={{
                                                                width: `${Math.min(row.attendancePercentage, 100)}%`,
                                                                height: '100%',
                                                                background: Number(row.attendancePercentage) >= 90 ? '#10B981' : Number(row.attendancePercentage) >= 75 ? '#F59E0B' : '#EF4444',
                                                                borderRadius: 4
                                                            }} />
                                                        </div>
                                                        <strong style={{ fontSize: 13 }}>{row.attendancePercentage}%</strong>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* ── Selfie Lightbox Modal ── */}
            {selfieModal && (
                <div
                    onClick={() => setSelfieModal(null)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'white', borderRadius: 20, padding: 24,
                            maxWidth: 420, width: '92%', textAlign: 'center',
                            boxShadow: '0 32px 80px rgba(0,0,0,0.5)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 800, fontSize: 16 }}>{selfieModal.name}</div>
                                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                                    <span style={{
                                        fontWeight: 700, fontSize: 11, padding: '2px 8px', borderRadius: 20,
                                        background: selfieModal.type === 'Check-In' ? '#E6FDF4' : '#FEF2F2',
                                        color: selfieModal.type === 'Check-In' ? '#059669' : '#DC2626',
                                        marginRight: 6
                                    }}>{selfieModal.type}</span>
                                    {selfieModal.date ? `${selfieModal.date} · ${selfieModal.time}` : selfieModal.time}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelfieModal(null)}
                                style={{
                                    width: 32, height: 32, borderRadius: '50%', border: 'none',
                                    background: '#F3F4F6', cursor: 'pointer', fontSize: 18,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >✕</button>
                        </div>
                        <div style={{
                            position: 'relative',
                            borderRadius: 14,
                            overflow: 'hidden',
                            minHeight: 240,
                            background: '#F3F4F6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `3px solid ${selfieModal.type === 'Check-In' ? '#10B981' : '#EF4444'}`,
                            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                        }}>
                            <img
                                src={getServerUrl(selfieModal.src)}
                                alt={`${selfieModal.type} Selfie`}
                                style={{
                                    width: '100%',
                                    minHeight: 240,
                                    objectFit: 'cover',
                                    display: 'block'
                                }}
                                onError={(e) => {
                                    if (!e.target.dataset.error) {
                                        e.target.dataset.error = "true";
                                        e.target.style.display = 'none';
                                        e.target.insertAdjacentHTML('afterend', '<div style="color: #9CA3AF; padding: 40px; text-align: center;">Photo not found on server<br/><small style="font-size: 10px;">(Check uploads folder)</small></div>');
                                    }
                                }}
                            />
                            {(selfieModal.latitude || selfieModal.longitude || selfieModal.address) && (
                                <div style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    background: 'rgba(15, 23, 42, 0.75)',
                                    backdropFilter: 'blur(10px)',
                                    WebkitBackdropFilter: 'blur(10px)',
                                    color: 'white',
                                    padding: '12px 14px',
                                    textAlign: 'left',
                                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 4
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                        <MapPin size={14} color={selfieModal.type === 'Check-In' ? '#10B981' : '#EF4444'} style={{ marginTop: 2, flexShrink: 0 }} />
                                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#F8FAFC', lineHeight: 1.3 }}>
                                            {selfieModal.workFromHome 
                                                ? (selfieModal.address || 'WFH Location')
                                                : (selfieModal.address || 'LearnLike Office')}
                                        </span>
                                    </div>
                                    {selfieModal.latitude && selfieModal.longitude && (
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${selfieModal.latitude},${selfieModal.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                fontSize: '10.5px',
                                                color: '#38BDF8',
                                                textDecoration: 'none',
                                                marginLeft: 20,
                                                fontWeight: 700,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 3,
                                                transition: 'color 0.2s'
                                            }}
                                            onMouseOver={e => e.target.style.color = '#7DD3FC'}
                                            onMouseOut={e => e.target.style.color = '#38BDF8'}
                                        >
                                            📍 {selfieModal.latitude.toFixed(6)}, {selfieModal.longitude.toFixed(6)}
                                            <span style={{ fontSize: '9px', textTransform: 'uppercase', opacity: 0.8 }}>(View Map)</span>
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                        <a
                            href={getServerUrl(selfieModal.src)}
                            download={`selfie_${selfieModal.name}_${selfieModal.type}.jpg`}
                            style={{
                                display: 'inline-block', marginTop: 14, padding: '10px 24px',
                                borderRadius: 10, background: 'linear-gradient(135deg,#7C5CFC,#6B46FA)',
                                color: 'white', fontWeight: 700, fontSize: 13, textDecoration: 'none'
                            }}
                        >⬇ Download Photo</a>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceRecords;
