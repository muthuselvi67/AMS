import React, { useEffect, useState } from 'react';
import { Calendar, Home, BarChart2 } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import DashboardCalendar from '../../components/ui/DashboardCalendar';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
    PieChart as RPieChart, Pie, Cell,
    AreaChart, Area
} from 'recharts';

const HRDashboard = () => {
    const { user } = useAuth();
    const [allAttendance, setAllAttendance] = useState([]);
    const [allLeaves, setAllLeaves] = useState([]);
    const [attendanceRange, setAttendanceRange] = useState('Week'); // Week | Month | Year

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [leavesRes, attsRes] = await Promise.all([
                    api.get('/leaves'),
                    api.get('/attendance')
                ]);
                const leaves = leavesRes.data.data?.leaves || leavesRes.data.data || [];
                setAllLeaves(leaves);
                const att = attsRes.data.data || attsRes.data || [];
                setAllAttendance(Array.isArray(att) ? att : []);
            } catch (err) { console.error('Dashboard fetch error:', err); }
        };
        fetchAll();
    }, []);




    // Today string
    const localToday = new Date();
    const y = localToday.getFullYear();
    const mo = String(localToday.getMonth() + 1).padStart(2, '0');
    const d = String(localToday.getDate()).padStart(2, '0');
    const todayStr = `${y}-${mo}-${d}`;

    const presentToday = allAttendance.filter(a => a.date === todayStr && !a.work_from_home);
    const wfhToday     = allAttendance.filter(a => a.date === todayStr && !!a.work_from_home);
    const leavesToday  = allLeaves.filter(l => {
        if (l.status !== 'approved') return false;
        const start = l.startDate || l.start_date;
        const end   = l.endDate   || l.end_date;
        return start <= todayStr && end >= todayStr;
    });

    // ─── Build Attendance Chart Data ───────────────────────────────────
    const buildAttendanceData = () => {
        const slots = [];

        if (attendanceRange === 'Week') {
            // Last 7 days, labelled Sun/Mon…
            for (let i = 6; i >= 0; i--) {
                const dt = new Date();
                dt.setDate(dt.getDate() - i);
                const dateStr = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
                const label = `${dt.getDate()} ${dt.toLocaleString('default', { weekday: 'short' })}`;
                slots.push({ label, dateStr });
            }
        } else if (attendanceRange === 'Month') {
            // Last 30 days grouped by week number
            const weeks = {};
            for (let i = 29; i >= 0; i--) {
                const dt = new Date();
                dt.setDate(dt.getDate() - i);
                const weekNum = Math.ceil(dt.getDate() / 7);
                const key = `W${weekNum} ${dt.toLocaleString('default', { month: 'short' })}`;
                if (!weeks[key]) weeks[key] = [];
                const dateStr = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
                weeks[key].push(dateStr);
            }
            return Object.entries(weeks).map(([label, dates]) => ({
                label,
                Present: allAttendance.filter(a => dates.includes(a.date) && !a.work_from_home).length,
                WFH:     allAttendance.filter(a => dates.includes(a.date) && !!a.work_from_home).length,
                Leave:   allLeaves.filter(l => l.status === 'approved' && dates.some(dt => {
                    const s = l.startDate || l.start_date;
                    const e = l.endDate   || l.end_date;
                    return s <= dt && e >= dt;
                })).length,
            }));
        } else {
            // Year — last 12 months
            for (let i = 11; i >= 0; i--) {
                const dt = new Date();
                dt.setMonth(dt.getMonth() - i);
                const label = dt.toLocaleString('default', { month: 'short' });
                const mStr  = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`;
                const present = allAttendance.filter(a => a.date?.startsWith(mStr) && !a.work_from_home).length;
                const wfh     = allAttendance.filter(a => a.date?.startsWith(mStr) && !!a.work_from_home).length;
                const leave   = allLeaves.filter(l => l.status === 'approved' && (l.startDate || l.start_date)?.startsWith(mStr)).length;
                slots.push({ label, Present: present, WFH: wfh, Leave: leave });
            }
            return slots;
        }

        return slots.map(({ label, dateStr }) => ({
            label,
            Present: allAttendance.filter(a => a.date === dateStr && !a.work_from_home).length,
            WFH:     allAttendance.filter(a => a.date === dateStr && !!a.work_from_home).length,
            Leave:   allLeaves.filter(l => {
                if (l.status !== 'approved') return false;
                const s = l.startDate || l.start_date;
                const e = l.endDate   || l.end_date;
                return s <= dateStr && e >= dateStr;
            }).length,
        }));
    };

    const attendanceData = buildAttendanceData();

    // ─── Leave Status Donut ────────────────────────────────────────────
    const approved  = allLeaves.filter(l => l.status === 'approved').length;
    const pending   = allLeaves.filter(l => l.status?.startsWith('pending')).length;
    const rejected  = allLeaves.filter(l => l.status === 'rejected').length;
    const cancelled = allLeaves.filter(l => l.status === 'cancelled').length;
    const pieData = [
        { name: 'Approved',  value: approved,  color: '#10B981' },
        { name: 'Pending',   value: pending,   color: '#F59E0B' },
        { name: 'Rejected',  value: rejected,  color: '#EF4444' },
        { name: 'Cancelled', value: cancelled, color: '#94A3B8' },
    ].filter(e => e.value > 0);

    const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        if (percent < 0.06) return null;
        const R = Math.PI / 180;
        const r = innerRadius + (outerRadius - innerRadius) * 0.6;
        return (
            <text x={cx + r * Math.cos(-midAngle * R)} y={cy + r * Math.sin(-midAngle * R)}
                fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    // ─── Monthly leave trend ───────────────────────────────────────────
    const monthlyMap = {};
    allLeaves.forEach(l => {
        const date = l.startDate || l.start_date;
        if (!date) return;
        const month = new Date(date).toLocaleString('default', { month: 'short', year: '2-digit' });
        if (!monthlyMap[month]) monthlyMap[month] = { month, Approved: 0, Pending: 0, Rejected: 0 };
        if (l.status === 'approved') monthlyMap[month].Approved++;
        else if (l.status?.startsWith('pending')) monthlyMap[month].Pending++;
        else if (l.status === 'rejected') monthlyMap[month].Rejected++;
    });
    const barData = Object.values(monthlyMap).slice(-6);

    const tooltipStyle = {
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        boxShadow: 'var(--shadow-md)',
        fontSize: 12,
    };

    return (
        <div className="fade-in">
            {/* Page header */}
            <div className="page-header" style={{ marginBottom: 24 }}>
                <h1>Welcome, {user?.name?.split(' ')[0]}!</h1>
                <p>Here's your leave and attendance overview</p>
            </div>

            {/* Calendar */}
            <div style={{ marginBottom: 24 }}>
                <DashboardCalendar />
            </div>

            {/* ── TOP ROW: Today's Overview  +  Attendance Overview Chart ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24, marginBottom: 24 }}>

                {/* Today's Overview */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="card-header" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 12, marginBottom: 16 }}>
                        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={17} /> Today's Overview
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{todayStr}</div>
                    </div>

                    <div className="dashboard-overview-grid">
                        {/* Present */}
                        <div style={{ borderRight: '1px solid var(--border-light)', paddingRight: 12, display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#166534', background: '#DCFCE7', padding: '2px 8px', borderRadius: 12, marginBottom: 12, display: 'inline-block' }}>
                                Present ({presentToday.length})
                            </span>
                            <div style={{ overflowY: 'auto', maxHeight: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {presentToday.length === 0
                                    ? <div style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', padding: '20px 0' }}>No office check-ins</div>
                                    : presentToday.map((p, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#1A73E8,#0D47A1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 9, flexShrink: 0 }}>
                                                {p.employee?.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{p.employee?.name}</div>
                                            <span style={{ fontSize: 10, color: '#166534', fontWeight: 700, flexShrink: 0 }}>
                                                {p.checkIn?.time ? new Date(p.checkIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                            </span>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>

                        {/* WFH */}
                        <div style={{ borderRight: '1px solid var(--border-light)', paddingRight: 12, paddingLeft: 4, display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#5B21B6', background: '#EDE9FE', padding: '2px 8px', borderRadius: 12, marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Home size={10} /> WFH ({wfhToday.length})
                            </span>
                            <div style={{ overflowY: 'auto', maxHeight: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {wfhToday.length === 0
                                    ? <div style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', padding: '20px 0' }}>No WFH today</div>
                                    : wfhToday.map((p, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 9, flexShrink: 0 }}>
                                                {p.employee?.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{p.employee?.name}</div>
                                            <span style={{ fontSize: 10, color: '#5B21B6', fontWeight: 700, flexShrink: 0 }}>
                                                {p.checkIn?.time ? new Date(p.checkIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                            </span>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>

                        {/* On Leave */}
                        <div style={{ paddingLeft: 4, display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#9A3412', background: '#FFEDD5', padding: '2px 8px', borderRadius: 12, marginBottom: 12, display: 'inline-block' }}>
                                On Leave ({leavesToday.length})
                            </span>
                            <div style={{ overflowY: 'auto', maxHeight: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {leavesToday.length === 0
                                    ? <div style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', padding: '20px 0' }}>Nobody on leave today</div>
                                    : leavesToday.map((l, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#AD1457,#6A1B9A)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 9, flexShrink: 0 }}>
                                                {(l.employee_name || l.employee?.name || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{l.employee_name || l.employee?.name}</div>
                                            <span style={{ fontSize: 9, background: l.leave_type_color || l.leaveType?.color || '#1565C0', color: 'white', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>
                                                {l.leave_type_name || l.leaveType?.name || 'Leave'}
                                            </span>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                </div>

                {/* Attendance Overview Chart */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="card-header" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 12, marginBottom: 16 }}>
                        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BarChart2 size={17} style={{ color: 'var(--primary)' }} />
                            Attendance Overview
                        </div>
                        {/* Week / Month / Year tabs */}
                        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-light)', borderRadius: 8, padding: 3 }}>
                            {['Week', 'Month', 'Year'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setAttendanceRange(tab)}
                                    style={{
                                        padding: '4px 12px',
                                        borderRadius: 6,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: attendanceRange === tab ? 'var(--bg-white)' : 'transparent',
                                        color: attendanceRange === tab ? 'var(--primary)' : 'var(--text-muted)',
                                        boxShadow: attendanceRange === tab ? 'var(--shadow-sm)' : 'none',
                                    }}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={attendanceData} barSize={14} barCategoryGap="35%" margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                            <Tooltip
                                cursor={{ fill: 'var(--primary-light)', opacity: 0.5 }}
                                contentStyle={tooltipStyle}
                            />
                            <Legend
                                iconType="circle"
                                iconSize={8}
                                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                            />
                            <Bar dataKey="Present" fill="#10B981" radius={[5, 5, 0, 0]} />
                            <Bar dataKey="WFH"     fill="#9B7CFD" radius={[5, 5, 0, 0]} />
                            <Bar dataKey="Leave"   fill="#EF4444" radius={[5, 5, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── SECOND ROW: Leave Status Donut  +  Monthly Leave Trends ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 24, marginBottom: 24 }}>

                {/* Donut — Leave Status */}
                <div className="card" style={{ padding: '24px' }}>
                    <div className="card-header" style={{ marginBottom: 12 }}>
                        <div className="card-title">Leave Status Distribution</div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>All time</span>
                    </div>
                    {pieData.length === 0
                        ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: 13 }}>No leave data yet</div>
                        : <>
                            <ResponsiveContainer width="100%" height={220}>
                                <RPieChart>
                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                                        paddingAngle={3} dataKey="value" labelLine={false} label={renderPieLabel} stroke="none">
                                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Pie>
                                    <Tooltip formatter={(v, n) => [`${v} requests`, n]} contentStyle={tooltipStyle} />
                                    <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
                                </RPieChart>
                            </ResponsiveContainer>
                            <div style={{ textAlign: 'center', marginTop: -4 }}>
                                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{allLeaves.length}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Total Requests</div>
                            </div>
                        </>
                    }
                </div>

                {/* Bar — Monthly Leave Trends */}
                <div className="card" style={{ padding: '24px' }}>
                    <div className="card-header" style={{ marginBottom: 12 }}>
                        <div className="card-title">Monthly Leave Trends</div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Last 6 months</span>
                    </div>
                    {barData.length === 0
                        ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: 13 }}>No leave data yet</div>
                        : <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={barData} barSize={16} barCategoryGap="35%">
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: 'var(--primary-light)', opacity: 0.5 }} contentStyle={tooltipStyle} />
                                <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                                <Bar dataKey="Approved" fill="#10B981" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="Pending"  fill="#F59E0B" radius={[6, 6, 0, 0]} />
                                <Bar dataKey="Rejected" fill="#EF4444" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    }
                </div>
            </div>

        </div>
    );
};

export default HRDashboard;
