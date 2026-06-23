import React, { useEffect, useState } from 'react';
import { Users, Calendar, Home, BarChart2, Star, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import DashboardCalendar from '../../components/ui/DashboardCalendar';

const CRITERIA = ['performance', 'communication', 'teamwork', 'leadership', 'innovation'];
const CRITERIA_LABELS = { performance: 'Performance', communication: 'Communication', teamwork: 'Teamwork', leadership: 'Leadership', innovation: 'Innovation' };
const CRITERIA_COLORS = { performance: '#6366F1', communication: '#3B82F6', teamwork: '#10B981', leadership: '#F59E0B', innovation: '#EC4899' };

const AdminDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [allAttendance, setAllAttendance] = useState([]);
    const [allLeaves, setAllLeaves] = useState([]);
    const [appraisals, setAppraisals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Week'); // Week, Month, Year

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [leavesRes, attsRes, appraisalsRes] = await Promise.all([
                    api.get('/leaves'),
                    api.get('/attendance'),
                    api.get('/appraisals').catch(() => ({ data: { data: { appraisals: [] } } }))
                ]);
                const leaves = leavesRes.data.data?.leaves || leavesRes.data.data || [];
                setAllLeaves(leaves);
                setAllAttendance(attsRes.data.data || []);
                setAppraisals(appraisalsRes.data.data?.appraisals || []);
            } catch (err) {
                console.error('Dashboard fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    if (loading) return <div className="flex-center" style={{ height: 400 }}><LoadingSpinner /></div>;

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

    return (
        <div className="fade-in">
            {/* Page header */}
            <div className="page-header" style={{ marginBottom: 24 }}>
                <h1>Welcome, {user?.name?.split(' ')[0]}!</h1>
                <p>Here's your leave and attendance overview</p>
            </div>

            {/* Full-width Google Calendar */}
            <div style={{ marginBottom: 24 }}>
                <DashboardCalendar />
            </div>

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

            {/* Performance Ratings Card */}
            {(() => {
                if (appraisals.length === 0) return null;

                // Compute average per criterion across all appraisals
                const criteriaAvg = {};
                CRITERIA.forEach(c => {
                    const vals = appraisals.map(a => a.ratings?.[c] || 0).filter(v => v > 0);
                    criteriaAvg[c] = vals.length ? parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : 0;
                });
                const overallAvg = parseFloat((Object.values(criteriaAvg).reduce((a, b) => a + b, 0) / CRITERIA.length).toFixed(2));

                // Top performers (by avgRating)
                const sorted = [...appraisals]
                    .filter(a => a.avgRating)
                    .sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0))
                    .slice(0, 5);

                const radarData = CRITERIA.map(c => ({
                    subject: CRITERIA_LABELS[c],
                    value: criteriaAvg[c],
                    fullMark: 5
                }));

                const ratingLabel = overallAvg >= 4.5 ? 'Excellent' : overallAvg >= 3.5 ? 'Good' : overallAvg >= 2.5 ? 'Average' : 'Needs Improvement';
                const ratingColor = overallAvg >= 4.5 ? '#10B981' : overallAvg >= 3.5 ? '#6366F1' : overallAvg >= 2.5 ? '#F59E0B' : '#EF4444';

                return (
                    <div className="card" style={{ marginBottom: 24 }}>
                        {/* Card Header */}
                        <div className="card-header" style={{ borderBottom: '1px solid #F0F0F0', paddingBottom: 14 }}>
                            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <TrendingUp size={18} color="#6366F1" />
                                Performance Ratings Overview
                            </div>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => navigate('/admin/appraisals')}
                                style={{ color: '#6366F1', fontWeight: 600 }}
                            >
                                View All →
                            </button>
                        </div>

                        <div className="performance-grid">

                            {/* Left: Criteria breakdown bars */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Criteria Breakdown</div>
                                {CRITERIA.map(c => {
                                    const val = criteriaAvg[c];
                                    const pct = (val / 5) * 100;
                                    return (
                                        <div key={c}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{CRITERIA_LABELS[c]}</span>
                                                <span style={{ fontSize: 12, fontWeight: 700, color: CRITERIA_COLORS[c] }}>{val}/5</span>
                                            </div>
                                            <div style={{ height: 8, background: '#F3F4F6', borderRadius: 6, overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${pct}%`,
                                                    height: '100%',
                                                    borderRadius: 6,
                                                    background: `linear-gradient(90deg, ${CRITERIA_COLORS[c]}99, ${CRITERIA_COLORS[c]})`,
                                                    transition: 'width 0.8s ease'
                                                }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Middle: Radar chart */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, alignSelf: 'flex-start' }}>Skill Radar</div>
                                <ResponsiveContainer width="100%" height={180}>
                                    <RadarChart data={radarData}>
                                        <PolarGrid stroke="#E5E7EB" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#6B7280' }} />
                                        <Radar name="Avg" dataKey="value" stroke="#6366F1" fill="#6366F1" fillOpacity={0.25} strokeWidth={2} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Right: Overall score + top performers */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {/* Overall score */}
                                <div style={{ background: 'linear-gradient(135deg, #6366F111, #6366F122)', borderRadius: 12, padding: '16px 20px', textAlign: 'center', border: '1px solid #6366F130' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Overall Avg Rating</div>
                                    <div style={{ fontSize: 40, fontWeight: 800, color: ratingColor, lineHeight: 1 }}>{overallAvg}</div>
                                    <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>out of 5</div>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginBottom: 6 }}>
                                        {[1,2,3,4,5].map(n => (
                                            <Star key={n} size={14}
                                                fill={n <= Math.round(overallAvg) ? '#F59E0B' : 'none'}
                                                color={n <= Math.round(overallAvg) ? '#F59E0B' : '#D1D5DB'}
                                            />
                                        ))}
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: ratingColor, background: `${ratingColor}15`, padding: '3px 10px', borderRadius: 20 }}>{ratingLabel}</span>
                                </div>

                                {/* Top performers */}
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Top Performers</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {sorted.map((a, i) => (
                                            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{
                                                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                                                    background: ['#6366F1','#3B82F6','#10B981','#F59E0B','#EC4899'][i],
                                                    color: '#fff', display: 'flex', alignItems: 'center',
                                                    justifyContent: 'center', fontSize: 9, fontWeight: 700
                                                }}>
                                                    {(a.employee?.name || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {a.employee?.name || 'Unknown'}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: '#9CA3AF' }}>{a.period}</div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                                                    <Star size={11} fill="#F59E0B" color="#F59E0B" />
                                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B' }}>{Number(a.avgRating).toFixed(1)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default AdminDashboard;

