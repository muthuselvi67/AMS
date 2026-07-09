import React, { useEffect, useState } from 'react';
import { Users, Calendar, Home, BarChart2, Clock, Hourglass, MapPin, UserCheck, LogIn, CheckCircle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart as RPieChart, Pie, Cell } from 'recharts';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import DashboardCalendar from '../../components/ui/DashboardCalendar';

const AdminDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [allAttendance, setAllAttendance] = useState([]);
    const [allLeaves, setAllLeaves] = useState([]);
    const [activeTab, setActiveTab] = useState('Week'); // Week, Month, Year

    const [todayRecord, setTodayRecord] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [leavesRes, attsRes, todayAttRes] = await Promise.all([
                    api.get('/leaves'),
                    api.get('/attendance'),
                    api.get('/attendance/today').catch(() => ({ data: { data: { attendance: null } } }))
                ]);
                const leaves = leavesRes.data.data?.leaves || leavesRes.data.data || [];
                setAllLeaves(leaves);
                const att = attsRes.data.data || attsRes.data || [];
                setAllAttendance(Array.isArray(att) ? att : []);
                setTodayRecord(todayAttRes.data.data?.attendance || null);
            } catch (err) {
                console.error('Dashboard fetch error:', err);
            }
        };
        fetchAll();
    }, []);

    // Live clock ticker
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);



    // Timezone-safe local today date string (YYYY-MM-DD)
    const localToday = new Date();
    const y = localToday.getFullYear();
    const m = String(localToday.getMonth() + 1).padStart(2, '0');
    const d = String(localToday.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    const presentToday  = allAttendance.filter(a => a.date === todayStr && !a.work_from_home);
    const wfhToday      = allAttendance.filter(a => a.date === todayStr && !!a.work_from_home);

    const leavesToday = allLeaves.filter(l => {
        if (l.status !== 'approved') return false;
        const start = l.startDate || l.start_date;
        const end = l.endDate || l.end_date;
        return start <= todayStr && end >= todayStr;
    });

    // Compute stats helper
    const getStatsForDate = (dateStr) => {
        const atts = allAttendance.filter(a => a.date === dateStr);
        const present = atts.filter(a => !a.work_from_home && a.status !== 'on-leave').length;
        const wfh = atts.filter(a => !!a.work_from_home && a.status !== 'on-leave').length;
        
        const leaves = allLeaves.filter(l => {
            if (l.status !== 'approved') return false;
            const start = l.startDate || l.start_date;
            const end = l.endDate || l.end_date;
            return start <= dateStr && end >= dateStr;
        }).length;
        
        return { present, wfh, leaves };
    };

    // 1. Week View (Last 7 days)
    const getWeekData = () => {
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const temp = new Date();
            temp.setDate(temp.getDate() - i);
            const curY = temp.getFullYear();
            const curM = String(temp.getMonth() + 1).padStart(2, '0');
            const curD = String(temp.getDate()).padStart(2, '0');
            const dateStr = `${curY}-${curM}-${curD}`;
            
            const label = temp.toLocaleDateString([], { weekday: 'short', day: 'numeric' });
            const stats = getStatsForDate(dateStr);
            data.push({
                name: label,
                Present: stats.present,
                WFH: stats.wfh,
                Leave: stats.leaves
            });
        }
        return data;
    };

    // 2. Month View (Last 4 weeks)
    const getMonthData = () => {
        const data = [];
        for (let i = 3; i >= 0; i--) {
            const start = new Date();
            start.setDate(start.getDate() - (i * 7 + 6));
            
            let totalPresent = 0;
            let totalWFH = 0;
            let totalLeaves = 0;
            
            for (let j = 0; j < 7; j++) {
                const cur = new Date(start);
                cur.setDate(cur.getDate() + j);
                const curY = cur.getFullYear();
                const curM = String(cur.getMonth() + 1).padStart(2, '0');
                const curD = String(cur.getDate()).padStart(2, '0');
                const dateStr = `${curY}-${curM}-${curD}`;
                
                const stats = getStatsForDate(dateStr);
                totalPresent += stats.present;
                totalWFH += stats.wfh;
                totalLeaves += stats.leaves;
            }
            
            const label = `Week -${i}`;
            data.push({
                name: i === 0 ? 'This Wk' : label,
                Present: totalPresent,
                WFH: totalWFH,
                Leave: totalLeaves
            });
        }
        return data;
    };

    // 3. Year View (Last 12 months)
    const getYearData = () => {
        const data = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const now = new Date();
        
        for (let i = 11; i >= 0; i--) {
            const temp = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const year = temp.getFullYear();
            const month = temp.getMonth();
            
            let totalPresent = 0;
            let totalWFH = 0;
            let totalLeaves = 0;
            
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const stats = getStatsForDate(dateStr);
                totalPresent += stats.present;
                totalWFH += stats.wfh;
                totalLeaves += stats.leaves;
            }
            
            data.push({
                name: `${monthNames[month]}`,
                Present: totalPresent,
                WFH: totalWFH,
                Leave: totalLeaves
            });
        }
        return data;
    };

    const getChartData = () => {
        if (activeTab === 'Week') return getWeekData();
        if (activeTab === 'Month') return getMonthData();
        return getYearData();
    };

    const chartData = getChartData();

    // ─── Leave Status Donut Data ────────────────────────────────────────────
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

    // ─── Monthly leave trend Data ───────────────────────────────────────────
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

    const formatTime = (timeStr) => {
        if (!timeStr) return '--:--';
        return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatClock = (dateObj) => {
        return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    let hoursWorked = 0;
    let minsWorked = 0;
    let workPercent = 0;

    if (todayRecord) {
        if (todayRecord.totalHours) {
            hoursWorked = Math.floor(todayRecord.totalHours);
            minsWorked = Math.round((todayRecord.totalHours - hoursWorked) * 60);
        } else if (todayRecord.checkIn?.time) {
            const checkInDate = new Date(todayRecord.checkIn.time);
            const diffMs = currentTime - checkInDate;
            const diffHrs = diffMs / (1000 * 60 * 60);
            if (diffHrs > 0) {
                hoursWorked = Math.floor(diffHrs);
                minsWorked = Math.round((diffHrs - hoursWorked) * 60);
            }
        }
    }
    
    let totalFractionalHours = hoursWorked + (minsWorked / 60);
    workPercent = Math.min(Math.round((totalFractionalHours / 9) * 100), 100);

    let remHrs = Math.max(0, 8 - hoursWorked);
    let remMins = 0;
    if (totalFractionalHours < 9) {
        let totalRem = 9 - totalFractionalHours;
        remHrs = Math.floor(totalRem);
        remMins = Math.round((totalRem - remHrs) * 60);
    }

    const checkInText = todayRecord?.checkIn?.time ? formatTime(todayRecord.checkIn.time) : '--:--';
    const statusText = todayRecord ? (todayRecord.status || 'present').replace('-', ' ').toUpperCase() : 'ABSENT';
    const locationText = todayRecord?.is_wfh || todayRecord?.work_from_home ? 'REMOTE' : 'OFFICE';
    const isLate = todayRecord?.status === 'late';
    const todayFormatted = currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="emp-dashboard-container fade-in">
            {/* Page header */}
            <div className="emp-dash-header">
                <div>
                    <h1 className="emp-dash-title">Welcome, {user?.name?.split(' ')[0]}! <span role="img" aria-label="wave">👋</span></h1>
                    <p className="emp-dash-subtitle">Here's your attendance summary for today.</p>
                </div>
                <div className="emp-dash-date-badge">
                    <Calendar size={15} />
                    <span>{todayFormatted}</span>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="emp-metrics-grid">
                <div className="emp-metric-card">
                    <div className="emp-metric-icon bg-blue">
                        <LogIn size={20} color="#3B82F6" />
                    </div>
                    <div className="emp-metric-info">
                        <span className="emp-metric-label">Check-In Time</span>
                        <div className="emp-metric-value">{checkInText}</div>
                        <span className="emp-metric-subtext color-blue">Today</span>
                    </div>
                </div>

                <div className="emp-metric-card">
                    <div className="emp-metric-icon bg-green">
                        <Clock size={20} color="#10B981" />
                    </div>
                    <div className="emp-metric-info">
                        <span className="emp-metric-label">Current Time</span>
                        <div className="emp-metric-value">{formatClock(currentTime)}</div>
                        <span className="emp-metric-subtext color-green">{currentTime.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                </div>

                <div className="emp-metric-card">
                    <div className="emp-metric-icon bg-purple">
                        <Hourglass size={20} color="#8B5CF6" />
                    </div>
                    <div className="emp-metric-info">
                        <span className="emp-metric-label">Hours Worked</span>
                        <div className="emp-metric-value">{String(hoursWorked).padStart(2, '0')}:{String(minsWorked).padStart(2, '0')}</div>
                        <span className="emp-metric-subtext color-purple">{hoursWorked} Hour {minsWorked} Minutes</span>
                    </div>
                </div>

                <div className="emp-metric-card">
                    <div className="emp-metric-icon bg-orange">
                        <Hourglass size={20} color="#F59E0B" style={{ transform: 'rotate(180deg)' }} />
                    </div>
                    <div className="emp-metric-info">
                        <span className="emp-metric-label">Hours Remaining</span>
                        <div className="emp-metric-value">{String(remHrs).padStart(2, '0')}:{String(remMins).padStart(2, '0')}</div>
                        <span className="emp-metric-subtext color-orange">{remHrs} Hours {remMins} Minutes</span>
                    </div>
                </div>

                <div className="emp-metric-card">
                    <div className="emp-metric-icon bg-emerald">
                        <UserCheck size={20} color="#059669" />
                    </div>
                    <div className="emp-metric-info">
                        <span className="emp-metric-label">Status</span>
                        <div className="emp-metric-value" style={{ fontSize: '18px' }}>{statusText}</div>
                        <span className="emp-metric-subtext color-emerald">{isLate ? 'Late Arrival' : (todayRecord ? 'On Time' : 'Not Checked In')}</span>
                    </div>
                </div>

                <div className="emp-metric-card">
                    <div className="emp-metric-icon bg-pink">
                        <MapPin size={20} color="#EC4899" />
                    </div>
                    <div className="emp-metric-info">
                        <span className="emp-metric-label">Work Location</span>
                        <div className="emp-metric-value" style={{ fontSize: '18px' }}>{locationText}</div>
                        <span className="emp-metric-subtext color-pink">{todayRecord?.is_wfh || todayRecord?.work_from_home ? 'Remote Work' : 'Onsite'}</span>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="emp-progress-container">
                <span className="emp-progress-title">Work Progress</span>
                <div className="emp-progress-track">
                    <div className="emp-progress-fill" style={{ width: `${workPercent}%` }}>
                        <div className="emp-progress-tooltip">{workPercent}%</div>
                    </div>
                </div>
                <span className="emp-progress-text">{Math.floor(totalFractionalHours)} of 9 Hours Completed</span>
            </div>

            {/* Bottom 2-Column Layout */}
            <div className="emp-bottom-grid" style={{ marginBottom: '32px' }}>
                <div className="emp-overview-panel">
                    <div className="emp-panel-header">
                        <TrendingUp size={16} color="#8B5CF6" />
                        <h3>Today's Attendance Overview</h3>
                    </div>
                    
                    <div className="emp-overview-list">
                        <div className="emp-list-item">
                            <div className="emp-list-label">
                                <Clock size={16} className="color-gray" /> Office Time
                            </div>
                            <div className="emp-list-value">09:30 AM - 06:30 PM</div>
                        </div>
                        <div className="emp-list-item">
                            <div className="emp-list-label">
                                <LogIn size={16} className="color-green" /> Check-In Time
                            </div>
                            <div className="emp-list-value color-green">{checkInText}</div>
                        </div>
                        <div className="emp-list-item">
                            <div className="emp-list-label">
                                <Clock size={16} className="color-blue" /> Current Time
                            </div>
                            <div className="emp-list-value color-blue">{formatClock(currentTime)}</div>
                        </div>
                        <div className="emp-list-item">
                            <div className="emp-list-label">
                                <Hourglass size={16} className="color-purple" /> Hours Worked
                            </div>
                            <div className="emp-list-value">{String(hoursWorked).padStart(2, '0')}:{String(minsWorked).padStart(2, '0')} ({hoursWorked} Hour)</div>
                        </div>
                        <div className="emp-list-item">
                            <div className="emp-list-label">
                                <Hourglass size={16} className="color-orange" style={{ transform: 'rotate(180deg)' }} /> Hours Remaining
                            </div>
                            <div className="emp-list-value">{String(remHrs).padStart(2, '0')}:{String(remMins).padStart(2, '0')} ({remHrs} Hours)</div>
                        </div>
                        <div className="emp-list-item">
                            <div className="emp-list-label">
                                <UserCheck size={16} className="color-emerald" /> Status
                            </div>
                            <div className="emp-list-value bg-emerald-light">{statusText}</div>
                        </div>
                        <div className="emp-list-item">
                            <div className="emp-list-label">
                                <MapPin size={16} className="color-pink" /> Work Location
                            </div>
                            <div className="emp-list-value bg-pink-light">{locationText}</div>
                        </div>
                    </div>

                    <div className="emp-success-banner">
                        <CheckCircle size={16} color="#059669" />
                        <span>You are all set! Keep up your good work.</span>
                    </div>
                </div>

                <div className="emp-calendar-panel">
                    <DashboardCalendar />
                </div>
            </div>

            {/* Team Overview section */}
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Team Overview</h2>

            {/* Today's Overview + Attendance Graph */}
            <div className="dashboard-top-row">
                {/* Today's Overview (Present & On Leave) */}
                <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div className="card-header" style={{ borderBottom: '1px solid #F0F0F0', paddingBottom: 12 }}>
                        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={18} /> Today's Overview
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{todayStr}</div>
                    </div>
                    
                    <div className="dashboard-overview-grid">

                        {/* Present (Office) Column */}
                        <div style={{ borderRight: '1px solid #F0F0F0', paddingRight: 12, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#166534', background: '#DCFCE7', padding: '2px 8px', borderRadius: 12 }}>
                                    Present ({presentToday.length})
                                </span>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {presentToday.length === 0 ? (
                                    <div style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', padding: '20px 0' }}>No office check-ins</div>
                                ) : presentToday.map((p, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                        <div style={{
                                            width: 22, height: 22, borderRadius: '50%', marginTop: 1,
                                            background: 'linear-gradient(135deg, #1A73E8, #0D47A1)', color: '#fff',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 9, flexShrink: 0
                                        }}>
                                            {p.employee?.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.3 }}>{p.employee?.name}</div>
                                            <div style={{ fontSize: 10, color: '#166534', fontWeight: 700 }}>
                                                {p.checkIn?.time ? new Date(p.checkIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Work From Home Column */}
                        <div style={{ borderRight: '1px solid #F0F0F0', paddingRight: 12, paddingLeft: 4, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#5B21B6', background: '#EDE9FE', padding: '2px 8px', borderRadius: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <Home size={10} /> WFH ({wfhToday.length})
                                </span>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {wfhToday.length === 0 ? (
                                    <div style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', padding: '20px 0' }}>No WFH today</div>
                                ) : wfhToday.map((p, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                        <div style={{
                                            width: 22, height: 22, borderRadius: '50%', marginTop: 1,
                                            background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', color: '#fff',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 9, flexShrink: 0
                                        }}>
                                            {p.employee?.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.3 }}>{p.employee?.name}</div>
                                            <div style={{ fontSize: 10, color: '#5B21B6', fontWeight: 700 }}>
                                                {p.checkIn?.time ? new Date(p.checkIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* On Leave Column */}
                        <div style={{ paddingLeft: 4, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#9A3412', background: '#FFEDD5', padding: '2px 8px', borderRadius: 12 }}>
                                    On Leave ({leavesToday.length})
                                </span>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {leavesToday.length === 0 ? (
                                    <div style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center', padding: '20px 0' }}>Nobody on leave today</div>
                                ) : leavesToday.map((l, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                        <div style={{
                                            width: 22, height: 22, borderRadius: '50%', marginTop: 1,
                                            background: 'linear-gradient(135deg, #AD1457, #6A1B9A)', color: '#fff',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 9, flexShrink: 0
                                        }}>
                                            {(l.employee_name || l.employee?.name || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.3 }}>{l.employee_name || l.employee?.name}</div>
                                            <span style={{ fontSize: 9, background: l.leave_type_color || l.leaveType?.color || '#1565C0', color: 'white', padding: '1px 5px', borderRadius: 4, fontWeight: 600, marginTop: 2, display: 'inline-block' }}>
                                                {l.leave_type_name || l.leaveType?.name || 'Leave'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Attendance Graph replacing Recent Leave Requests */}
                <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F0F0F0', paddingBottom: 12 }}>
                        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <BarChart2 size={18} /> Attendance Overview
                        </div>
                        <div style={{ display: 'flex', gap: 4, background: '#F3F4F6', padding: 2, borderRadius: 8 }}>
                            {['Week', 'Month', 'Year'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    style={{
                                        border: 'none',
                                        background: activeTab === tab ? '#fff' : 'transparent',
                                        color: activeTab === tab ? 'var(--text-color)' : '#6B7280',
                                        padding: '4px 12px',
                                        borderRadius: 6,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div style={{ flex: 1, paddingTop: 16, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <ResponsiveContainer width="100%" height={210}>
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#6B7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12 }} />
                                <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                <Bar dataKey="Present" fill="#10B981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="WFH" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Leave" fill="#EF4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Leave Charts */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 24 }}>
                {/* Donut — Leave Status */}
                <div className="card" style={{ flex: '1 1 300px', padding: '24px', minWidth: 0 }}>
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
                <div className="card" style={{ flex: '1.6 1 300px', padding: '24px', minWidth: 0 }}>
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

export default AdminDashboard;

