import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
    Home, Search, ChevronDown, CheckCircle2, AlertCircle,
    Clock, FileText, Users, RefreshCw, Eye, X, Calendar
} from 'lucide-react';

const fmt = (d) => d ? new Date(d.replace(' ', 'T')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';

const WFHPolicyManager = () => {
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedEmp, setSelectedEmp] = useState(null);
    const [empUpdates, setEmpUpdates] = useState([]);
    const [empLoading, setEmpLoading] = useState(false);

    const fetchRecords = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch all attendance for the selected date, filter WFH ones
            const res = await api.get(`/attendance?date=${date}`);
            const all = res.data.data || [];
            // Only show WFH entries
            const wfh = all.filter(r => r.work_from_home == 1 || r.work_from_home === true);
            setRecords(wfh);
        } catch (err) {
            toast.error('Failed to load WFH records');
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => { fetchRecords(); }, [fetchRecords]);

    const openEmployee = async (emp) => {
        setSelectedEmp(emp);
        setEmpLoading(true);
        setEmpUpdates([]);
        try {
            const res = await api.get(`/wfh-updates?date=${date}&employee_id=${emp.employee_id}`);
            setEmpUpdates(res.data.data?.updates || []);
        } catch {
            toast.error('Failed to load WFH updates');
        } finally {
            setEmpLoading(false);
        }
    };

    const filtered = records.filter(r =>
        (r.employee_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.employee_department || '').toLowerCase().includes(search.toLowerCase())
    );

    const totalWFH = records.length;
    const withEOD = records.filter(r => r.has_final_eod).length;
    const noUpdate = records.filter(r => !r.update_count || r.update_count === 0).length;

    return (
        <div className="fade-in">
            {/* Page Header */}
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: 'linear-gradient(135deg, #9B7CFD, #7C5CFC)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Home size={22} color="white" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0 }}>WFH Policy Manager</h1>
                        <p style={{ margin: 0 }}>Monitor employee Work From Home compliance</p>
                    </div>
                </div>
            </div>

            {/* Date Filter & Search */}
            <div className="card" style={{ marginBottom: 20, padding: '16px 22px' }}>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Calendar size={16} color="var(--text-muted)" />
                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Date:</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="form-control"
                            style={{ width: 160 }}
                        />
                    </div>
                    <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            className="form-control"
                            placeholder="Search employee or department..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ paddingLeft: 36 }}
                        />
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={fetchRecords} disabled={loading}>
                        <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 16, marginBottom: 24 }}>
                {[
                    { label: 'WFH Today', value: totalWFH, color: '#9B7CFD', bg: '#F5F3FF', icon: Home },
                    { label: 'EOD Submitted', value: withEOD, color: '#10B981', bg: '#E6FDF4', icon: CheckCircle2 },
                    { label: 'No Updates', value: noUpdate, color: '#EF4444', bg: '#FEF2F2', icon: AlertCircle },
                    { label: 'In Progress', value: totalWFH - withEOD - noUpdate, color: '#F59E0B', bg: '#FFFBEB', icon: Clock },
                ].map(({ label, value, color, bg, icon: Icon }) => (
                    <div key={label} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Icon size={18} color={color} />
                        </div>
                        <div>
                            <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* WFH Records Table */}
            <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Users size={16} color="var(--text-muted)" /> WFH Employees — {fmtDate(date)}
                    </h3>
                    <span style={{ fontSize: 12, fontWeight: 700, background: '#EDE9FE', color: '#7C3AED', padding: '3px 12px', borderRadius: 20 }}>
                        {filtered.length} records
                    </span>
                </div>

                {loading ? (
                    <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                        <RefreshCw size={28} className="spin" style={{ marginBottom: 8 }} />
                        <p>Loading WFH records…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: 56, textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Home size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                        <h3 style={{ margin: '0 0 6px', color: 'var(--text-secondary)' }}>No WFH Records</h3>
                        <p style={{ margin: 0, fontSize: 13 }}>No employees are working from home on {fmtDate(date)}.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Department</th>
                                    <th>Check In</th>
                                    <th>Check Out</th>
                                    <th>Updates</th>
                                    <th>EOD Report</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(r => {
                                    const hasFinal = r.has_final_eod;
                                    const updateCount = parseInt(r.update_count) || 0;
                                    const checkedOut = !!r.check_out_time;

                                    let statusColor = '#F59E0B', statusBg = '#FFFBEB', statusLabel = 'In Progress';
                                    if (hasFinal) { statusColor = '#10B981'; statusBg = '#E6FDF4'; statusLabel = 'Compliant ✓'; }
                                    else if (updateCount === 0) { statusColor = '#EF4444'; statusBg = '#FEF2F2'; statusLabel = 'No Updates'; }

                                    return (
                                        <tr key={r.id}>
                                            <td>
                                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{r.employee_name || 'Unknown'}</div>
                                            </td>
                                            <td>
                                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.employee_department || '—'}</span>
                                            </td>
                                            <td>
                                                <span style={{ fontSize: 13, fontWeight: 600, color: '#059669' }}>{fmt(r.check_in_time)}</span>
                                            </td>
                                            <td>
                                                <span style={{ fontSize: 13, fontWeight: 600, color: checkedOut ? '#DC2626' : 'var(--text-muted)' }}>
                                                    {checkedOut ? fmt(r.check_out_time) : '—'}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{
                                                    fontSize: 12, fontWeight: 700,
                                                    background: updateCount > 0 ? '#EDE9FE' : '#F1F5F9',
                                                    color: updateCount > 0 ? '#7C3AED' : 'var(--text-muted)',
                                                    padding: '3px 10px', borderRadius: 20
                                                }}>
                                                    {updateCount} update{updateCount !== 1 ? 's' : ''}
                                                </span>
                                            </td>
                                            <td>
                                                {hasFinal ? (
                                                    <span style={{ fontSize: 12, fontWeight: 700, background: '#E6FDF4', color: '#059669', padding: '3px 10px', borderRadius: 20 }}>
                                                        ✓ Submitted
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: 12, fontWeight: 700, background: '#FEF2F2', color: '#DC2626', padding: '3px 10px', borderRadius: 20 }}>
                                                        ✗ Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <span style={{
                                                    fontSize: 11, fontWeight: 700, background: statusBg,
                                                    color: statusColor, padding: '3px 10px', borderRadius: 20
                                                }}>
                                                    {statusLabel}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-secondary btn-sm btn-icon"
                                                    onClick={() => openEmployee(r)}
                                                    title="View updates"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Employee Update Detail Modal */}
            {selectedEmp && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                    zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 20, backdropFilter: 'blur(4px)'
                }}>
                    <div className="card" style={{
                        width: '100%', maxWidth: 560, maxHeight: '85vh',
                        overflowY: 'auto', padding: 0, animation: 'slideUp 0.2s ease'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '20px 24px', borderBottom: '1px solid var(--border-light)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: 'linear-gradient(135deg, #9B7CFD10, #7C5CFC05)',
                            borderRadius: 'var(--radius) var(--radius) 0 0'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 42, height: 42, borderRadius: 12,
                                    background: 'linear-gradient(135deg, #9B7CFD, #7C5CFC)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                                    fontWeight: 800, fontSize: 16
                                }}>
                                    {(selectedEmp.employee_name || 'E')[0].toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
                                        {selectedEmp.employee_name}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        WFH Updates · {fmtDate(date)}
                                    </div>
                                </div>
                            </div>
                            <button
                                className="btn btn-ghost btn-sm btn-icon"
                                onClick={() => setSelectedEmp(null)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: 24 }}>
                            {/* Check-in/out summary */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                                <div style={{ background: '#E6FDF4', borderRadius: 10, padding: '12px 16px' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>Check In</div>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: '#065F46' }}>{fmt(selectedEmp.check_in_time)}</div>
                                </div>
                                <div style={{ background: selectedEmp.check_out_time ? '#FEF2F2' : 'var(--bg-light)', borderRadius: 10, padding: '12px 16px' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: selectedEmp.check_out_time ? '#DC2626' : 'var(--text-muted)', textTransform: 'uppercase' }}>Check Out</div>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: selectedEmp.check_out_time ? '#991B1B' : 'var(--text-muted)' }}>
                                        {selectedEmp.check_out_time ? fmt(selectedEmp.check_out_time) : '—'}
                                    </div>
                                </div>
                            </div>

                            {/* Updates */}
                            <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <FileText size={15} color="var(--text-muted)" />
                                Progress Updates
                                <span style={{ marginLeft: 'auto', fontSize: 12, background: '#EDE9FE', color: '#7C3AED', padding: '2px 10px', borderRadius: 20 }}>
                                    {empUpdates.length} submitted
                                </span>
                            </h4>

                            {empLoading ? (
                                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <RefreshCw size={24} className="spin" />
                                </div>
                            ) : empUpdates.length === 0 ? (
                                <div style={{
                                    padding: '28px 20px', textAlign: 'center',
                                    background: '#FEF2F2', borderRadius: 12, border: '1px solid #FCA5A5'
                                }}>
                                    <AlertCircle size={28} color="#DC2626" style={{ marginBottom: 8 }} />
                                    <p style={{ margin: 0, fontSize: 13, color: '#991B1B', fontWeight: 600 }}>
                                        No updates submitted yet.
                                    </p>
                                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#DC2626' }}>
                                        This employee has not provided any progress updates today.
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {empUpdates.map((u, i) => (
                                        <div key={u.id} style={{
                                            borderRadius: 10, padding: '12px 16px',
                                            background: u.is_final ? '#FEF2F2' : 'var(--bg-light)',
                                            border: `1px solid ${u.is_final ? '#FCA5A5' : 'var(--border-light)'}`
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                <span style={{
                                                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                                                    background: u.is_final ? '#EF4444' : '#9B7CFD',
                                                    color: 'white', padding: '2px 8px', borderRadius: 6
                                                }}>
                                                    {u.is_final ? '⚡ EOD Report' : `Update ${i + 1}`}
                                                </span>
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                                    <Clock size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                                                    {fmt(u.submitted_at)}
                                                </span>
                                            </div>
                                            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                                                {u.update_text}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Compliance Status */}
                            {!empLoading && (
                                <div style={{
                                    marginTop: 16, padding: '12px 16px', borderRadius: 10,
                                    background: empUpdates.some(u => u.is_final) ? '#E6FDF4' : '#FFFBEB',
                                    border: `1px solid ${empUpdates.some(u => u.is_final) ? '#A7F3D0' : '#FDE68A'}`,
                                    display: 'flex', alignItems: 'center', gap: 10
                                }}>
                                    {empUpdates.some(u => u.is_final)
                                        ? <CheckCircle2 size={16} color="#059669" />
                                        : <AlertCircle size={16} color="#F59E0B" />
                                    }
                                    <span style={{
                                        fontSize: 13, fontWeight: 600,
                                        color: empUpdates.some(u => u.is_final) ? '#065F46' : '#92400E'
                                    }}>
                                        {empUpdates.some(u => u.is_final)
                                            ? 'Final EOD report submitted — Policy compliant ✓'
                                            : 'Final EOD report not yet submitted'
                                        }
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Policy Reference Card */}
            <div className="card" style={{ marginTop: 20, padding: 24 }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>📋 WFH Policy Reference</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                    {[
                        { icon: '⏱️', title: 'Every 2 Hours', desc: 'Employees must submit a progress update every 2 hours during WFH.' },
                        { icon: '📋', title: 'EOD Window: 5:30–6:00 PM', desc: 'The final End-of-Day report must be submitted in this window.' },
                        { icon: '⚠️', title: 'Miss = Leave', desc: 'If the EOD report is missed, the WFH day is auto-marked as leave.' },
                        { icon: '✅', title: 'Compliant Status', desc: 'An employee is compliant when their final EOD report is submitted.' },
                    ].map(rule => (
                        <div key={rule.title} style={{ background: 'var(--bg-light)', borderRadius: 10, padding: '12px 16px' }}>
                            <div style={{ fontSize: 18, marginBottom: 6 }}>{rule.icon}</div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>{rule.title}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{rule.desc}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WFHPolicyManager;
