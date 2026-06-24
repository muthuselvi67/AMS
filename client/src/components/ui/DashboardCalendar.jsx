import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Clock, FileText, X, Users, CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const typeColors = {
    national: '#D32F2F',
    regional: '#F57C00',
    company: '#7C3AED',
    optional: '#6A1B9A',
    government: '#1E3A8A',
    bank: '#10B981',
    working_saturday: '#15803D', // Green
    floating_leave: '#EC4899',
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_FULL = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const parseYYYYMMDD = (str) => {
    if (!str) return null;
    const clean = str.split(' ')[0].split('T')[0];
    const parts = clean.split('-');
    if (parts.length < 3) return null;
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
};

const fmt = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function DashboardCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [holidays, setHolidays] = useState([]);
    const [leaves, setLeaves] = useState([]);

    /* ── leave-on-date modal state ── */
    const [modal, setModal] = useState(null);   // { date: Date, dateStr: 'YYYY-MM-DD' }
    const [dayLeaves, setDayLeaves] = useState([]);
    const [leaveLoading, setLeaveLoading] = useState(false);

    const today = new Date();
    const navigate = useNavigate();
    const { user } = useAuth();

    /* ── role-aware quick-action paths ── */
    const role = user?.role || 'employee';
    const attendancePath = role === 'admin' ? '/admin/attendance'
        : role === 'hr' ? '/hr/attendance'
            : '/employee/attendance';
    const leavePath = role === 'admin' ? '/admin/leave-requests'
        : role === 'hr' ? '/hr/leave-requests'
            : '/employee/apply-leave';

    /* ── role-aware button labels ── */
    const attendanceLabel = role === 'employee' ? 'Add Attendance' : 'View Attendance';
    const leaveLabel = role === 'employee' ? 'Apply Leave' : 'View Requests';

    useEffect(() => {
        api.get('/holidays', { params: { year: currentDate.getFullYear() } })
            .then(({ data }) => setHolidays(data.data || []))
            .catch(console.error);

        api.get('/leaves', { params: { status: 'approved' } })
            .then(({ data }) => {
                const list = data.data?.leaves || data.data || [];
                setLeaves(list);
            })
            .catch(console.error);
    }, [currentDate.getFullYear(), currentDate.getMonth()]);

    /* ── open modal: fetch leaves for clicked date ── */
    const openDayModal = useCallback((cell) => {
        if (!cell.current) return;
        const dateStr = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
        const date = new Date(yr, mo, cell.day);
        setModal({ date, dateStr });
        setDayLeaves([]);
        setLeaveLoading(true);
        api.get('/leaves', { params: { date: dateStr } })
            .then(({ data }) => {
                const list = data.data?.leaves || data.data || [];
                setDayLeaves(list);
            })
            .catch(console.error)
            .finally(() => setLeaveLoading(false));
    }, []);   // yr/mo captured at call-site via closure — see usage below

    /* ── navigation ── */
    const goPrev = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    const goNext = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    const goToday = () => setCurrentDate(new Date());

    /* ── calendar math ── */
    const yr = currentDate.getFullYear();
    const mo = currentDate.getMonth();
    const firstDay = new Date(yr, mo, 1).getDay();
    const totalDays = new Date(yr, mo + 1, 0).getDate();
    const prevTotal = new Date(yr, mo, 0).getDate();

    /* holidays this month keyed by day-of-month */
    const holidayMap = {};
    holidays.forEach(h => {
        const d = parseYYYYMMDD(h.date);
        if (d && d.getFullYear() === yr && d.getMonth() === mo) {
            holidayMap[d.getDate()] = holidayMap[d.getDate()] || [];
            holidayMap[d.getDate()].push(h);
        }
    });

    /* approved leaves this month keyed by day-of-month */
    const leaveMap = {};
    leaves.forEach(l => {
        const start = parseYYYYMMDD(l.startDate || l.start_date);
        const end = parseYYYYMMDD(l.endDate || l.end_date);
        if (!start || !end) return;

        let current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());

        while (current <= last) {
            if (current.getFullYear() === yr && current.getMonth() === mo) {
                const dayNum = current.getDate();
                leaveMap[dayNum] = leaveMap[dayNum] || [];
                const empId = l.employee_id || l.employee?.id;
                if (!leaveMap[dayNum].some(existing => (existing.employee_id || existing.employee?.id) === empId)) {
                    leaveMap[dayNum].push(l);
                }
            }
            current.setDate(current.getDate() + 1);
        }
    });

    /* build cells — 35 (5 rows) or 42 (6 rows) depending on overflow */
    const totalCells = firstDay + totalDays > 35 ? 42 : 35;
    const cells = [];
    for (let i = 0; i < totalCells; i++) {
        const offset = i - firstDay;
        const isSunday = i % 7 === 0;
        if (offset < 0) {
            cells.push({ day: prevTotal + offset + 1, current: false, isSunday });
        } else if (offset < totalDays) {
            const dayNum = offset + 1;
            const isToday =
                dayNum === today.getDate() &&
                mo === today.getMonth() &&
                yr === today.getFullYear();
            cells.push({
                day: dayNum,
                current: true,
                isToday,
                isSunday,
                holidays: holidayMap[dayNum] || [],
                leaves: leaveMap[dayNum] || []
            });
        } else {
            cells.push({ day: offset - totalDays + 1, current: false, isSunday });
        }
    }

    /* ── styles ── */
    const headerStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-white)',
        borderRadius: '12px 12px 0 0',
    };

    const dayHeaderStyle = (idx) => ({
        textAlign: 'center',
        fontSize: '12px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: idx === 0 ? 'var(--danger)' : 'var(--text-secondary)',
        padding: '10px 0',
        borderRight: idx < 6 ? '1px solid var(--border)' : 'none',
        background: 'var(--bg-white)',
    });

    const cellStyle = (cell) => ({
        minHeight: '110px',
        padding: '6px 8px',
        background: cell.current ? 'var(--bg-white)' : 'var(--bg-light)',
        borderRight: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        overflow: 'hidden',
        position: 'relative',
        cursor: cell.current ? 'pointer' : 'default',
        transition: 'background 0.12s',
    });

    const dayNumStyle = (cell) => ({
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: 26,
        height: 26,
        borderRadius: '50%',
        fontSize: '13px',
        fontWeight: cell.isToday ? 700 : 500,
        color: cell.isToday
            ? '#fff'
            : !cell.current
                ? 'var(--text-muted)'
                : cell.isSunday ? 'var(--danger)' : 'var(--text-primary)',
        background: cell.isToday ? 'var(--primary)' : 'transparent',
        marginBottom: 4,
        flexShrink: 0,
        alignSelf: 'flex-start',
    });

    const pillStyle = (color) => ({
        background: color,
        color: '#fff',
        fontSize: '11px',
        fontWeight: 600,
        padding: '3px 8px',
        borderRadius: '6px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        cursor: 'pointer',
        lineHeight: '1.5',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
    });

    /* Government holiday pill — elevated, flag-accented */
    const pillStyleGovt = {
        background: '#1E3A8A',
        color: '#fff',
        fontSize: '11px',
        fontWeight: 700,
        padding: '3px 8px',
        borderRadius: '6px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        cursor: 'pointer',
        lineHeight: '1.5',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
    };

    /* Saturday Off style */
    const pillStyleSaturdayOff = {
        background: '#DB2777', // Pink/Magenta
        color: '#fff',
        fontSize: '11px',
        fontWeight: 600,
        padding: '3px 8px',
        borderRadius: '6px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        cursor: 'pointer',
        lineHeight: '1.4',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginTop: '2px',
    };

    /* Working Saturday style */
    const pillStyleSaturdayWorking = {
        background: '#15803D', // Green
        color: '#fff',
        fontSize: '11px',
        fontWeight: 600,
        padding: '3px 8px',
        borderRadius: '6px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        cursor: 'pointer',
        lineHeight: '1.4',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginTop: '2px',
    };

    /* Employee Leave pill style */
    const pillStyleLeave = {
        background: '#F0FDF4',
        color: '#15803D',
        fontSize: '11px',
        fontWeight: 600,
        padding: '3px 8px',
        borderRadius: '6px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        cursor: 'pointer',
        lineHeight: '1.4',
        borderLeft: '3px solid #22C55E',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginTop: '2px',
    };

    /* ── leave-type badge ── */
    const leaveBadge = (leave) => {
        const color = leave.leave_type_color || leave.leaveType?.color || '#1565C0';
        return (
            <span style={{
                background: color,
                color: '#fff',
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 20,
                whiteSpace: 'nowrap',
            }}>
                {leave.leave_type_name || leave.leaveType?.name || 'Leave'}
            </span>
        );
    };

    /* avatar initials */
    const initials = (name = '') =>
        name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

    const avatarColors = ['#1A73E8', '#0D47A1', '#2E7D32', '#AD1457', '#6A1B9A', '#E65100', '#558B2F'];
    const avatarColor = (name = '') =>
        avatarColors[name.charCodeAt(0) % avatarColors.length];

    /* ── modal date display ── */
    const modalDateLabel = modal
        ? modal.date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : '';

    return (
        <>
            <div style={{ background: 'var(--bg-white)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>

                {/* ── Header ── */}
                <div className="calendar-header" style={{ ...headerStyle, flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    {/* Left: Today + nav + month title */}
                    <div className="calendar-header-left" style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                        <button
                            onClick={goToday}
                            style={{
                                padding: '8px 16px',
                                fontSize: '14px',
                                fontWeight: 600,
                                border: '1px solid var(--border)',
                                borderRadius: 8,
                                background: 'var(--bg-white)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                transition: 'background 0.15s',
                            }}
                            onMouseOver={e => e.currentTarget.style.background = 'var(--bg-light)'}
                            onMouseOut={e => e.currentTarget.style.background = 'var(--bg-white)'}
                        >
                            Today
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button
                                onClick={goPrev}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
                                onMouseOver={e => e.currentTarget.style.background = 'var(--bg-light)'}
                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={goNext}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
                                onMouseOver={e => e.currentTarget.style.background = 'var(--bg-light)'}
                                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        <h2 className="calendar-month-title" style={{ margin: 0, fontSize: '22px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
                            {MONTHS[mo]} {yr}
                        </h2>
                    </div>

                    {/* Right: Quick-action buttons */}
                    <div className="calendar-header-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                            onClick={() => navigate(attendancePath)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '8px 16px',
                                fontSize: '14px',
                                fontWeight: 600,
                                border: '1px solid var(--primary)',
                                borderRadius: 8,
                                background: 'var(--bg-white)',
                                color: 'var(--primary)',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                whiteSpace: 'nowrap',
                            }}
                            onMouseOver={e => { e.currentTarget.style.background = 'var(--primary-light)'; }}
                            onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-white)'; }}
                        >
                            <Clock size={16} />
                            {attendanceLabel}
                        </button>

                        <button
                            onClick={() => navigate(leavePath)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '8px 16px',
                                fontSize: '14px',
                                fontWeight: 600,
                                border: 'none',
                                borderRadius: 8,
                                background: 'var(--primary)',
                                color: '#fff',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                                whiteSpace: 'nowrap',
                            }}
                            onMouseOver={e => { e.currentTarget.style.background = 'var(--primary-dark)'; }}
                            onMouseOut={e => { e.currentTarget.style.background = 'var(--primary)'; }}
                        >
                            <FileText size={16} />
                            {leaveLabel}
                        </button>
                    </div>
                </div>

                {/* ── Day-name column headers ── */}
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <div style={{ minWidth: 768 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid var(--border)' }}>
                            {DAY_FULL.map((d, idx) => (
                                <div key={d} style={dayHeaderStyle(idx)}>{d}</div>
                            ))}
                        </div>

                {/* ── Month grid ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
                    {cells.map((cell, idx) => (
                        <div
                            key={idx}
                            className="calendar-day-cell"
                            style={{
                                ...cellStyle(cell),
                                borderRight: (idx + 1) % 7 === 0 ? 'none' : '1px solid var(--border)',
                                borderBottom: idx >= cells.length - 7 ? 'none' : '1px solid var(--border)',
                            }}
                            onClick={() => cell.current && openDayModal(cell)}
                            onMouseOver={e => { if (cell.current) e.currentTarget.style.background = 'var(--primary-light)'; }}
                            onMouseOut={e => { if (cell.current) e.currentTarget.style.background = 'var(--bg-white)'; }}
                        >
                            <div style={dayNumStyle(cell)}>{cell.day}</div>

                            {cell.current && idx % 7 === 6 && (() => {
                                const satIndex = Math.ceil(cell.day / 7);
                                const hasHoliday = cell.holidays && cell.holidays.length > 0;
                                if (hasHoliday) return null; // If Saturday falls on a holiday, office is closed, show only the holiday pill.
                                const isWorking = satIndex === 2 || satIndex === 4;
                                return isWorking ? (
                                    <div
                                        key="sat-label"
                                        className="calendar-pill"
                                        style={pillStyleSaturdayWorking}
                                        title={`${satIndex}${satIndex === 2 ? 'nd' : 'th'} Saturday: Working Office`}
                                        onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
                                        onMouseOut={e => e.currentTarget.style.opacity = '1'}
                                    >
                                        <span className="calendar-pill-icon">💼</span>
                                        <span className="calendar-pill-text" style={{ marginLeft: 4 }}>Working Sat ({satIndex === 2 ? '2nd' : '4th'})</span>
                                    </div>
                                ) : (
                                    <div
                                        key="sat-label"
                                        className="calendar-pill"
                                        style={pillStyleSaturdayOff}
                                        title={`${satIndex}${satIndex === 1 ? 'st' : satIndex === 3 ? 'rd' : 'th'} Saturday: Office Leave`}
                                        onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
                                        onMouseOut={e => e.currentTarget.style.opacity = '1'}
                                    >
                                        <span className="calendar-pill-icon">🏡</span>
                                        <span className="calendar-pill-text" style={{ marginLeft: 4 }}>Office Leave ({satIndex === 1 ? '1st' : satIndex === 3 ? '3rd' : '5th'})</span>
                                    </div>
                                );
                            })()}

                            {cell.current && cell.holidays && cell.holidays.map((h, hi) => {
                                const type = h.type;
                                const isGovt = type === 'government' || type === 'national';
                                const isWorkingSat = type === 'working_saturday';

                                let style = pillStyle(typeColors[type] || '#1E3A8A');

                                const icon = type === 'government' || type === 'national' ? '🏛'
                                    : type === 'working_saturday' ? '💼'
                                        : type === 'company' ? '🏢'
                                            : type === 'bank' ? '🏦'
                                                : type === 'floating_leave' ? '🌸'
                                                    : type === 'regional' ? '🍁'
                                                        : type === 'optional' ? '🍂'
                                                            : '🎉';

                                if (isGovt) {
                                    style = pillStyleGovt;
                                } else if (isWorkingSat) {
                                    style = pillStyleSaturdayWorking;
                                } else if (type === 'company') {
                                    style = { ...style, background: '#7C3AED' };
                                } else if (type === 'bank') {
                                    style = { ...style, background: '#10B981' };
                                } else if (type === 'floating_leave') {
                                    style = { ...style, background: '#EC4899' };
                                }

                                return (
                                    <div
                                        key={hi}
                                        className="calendar-pill"
                                        style={style}
                                        title={h.name}
                                        onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
                                        onMouseOut={e => e.currentTarget.style.opacity = '1'}
                                    >
                                        <span className="calendar-pill-icon">{icon}</span>
                                        <span className="calendar-pill-text" style={{ marginLeft: 4 }}>{h.name}</span>
                                    </div>
                                );
                            })}

                            {cell.current && cell.leaves && cell.leaves.map((l, li) => {
                                const name = l.employee_name || l.employee?.name || 'Unknown';
                                return (
                                    <div
                                        key={`leave-${li}`}
                                        className="calendar-pill"
                                        style={pillStyleLeave}
                                        title={`${name} is on Leave`}
                                        onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
                                        onMouseOut={e => e.currentTarget.style.opacity = '1'}
                                    >
                                        <span className="calendar-pill-icon">✈️</span>
                                        <span className="calendar-pill-text" style={{ marginLeft: 4 }}>{name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>

                {/* ── Legend ── */}
                <div className="calendar-legend" style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '6px 16px',
                    padding: '12px 16px',
                    borderTop: '1px solid var(--border-light)',
                    background: 'var(--bg-card)',
                    borderRadius: '0 0 12px 12px',
                }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: 4 }}>Legend:</span>
                    {[
                        { type: 'government', label: 'Govt. Holiday', color: '#1E3A8A', icon: '🏛' },
                        { type: 'company', label: 'Company', color: '#7C3AED' },
                        { type: 'bank', label: 'Bank', color: '#10B981' },
                        { type: 'floating_leave', label: 'Floating Leave', color: '#EC4899' },
                        { type: 'saturday_leave', label: 'Office Leave (1st/3rd/5th Sat)', color: '#DB2777', icon: '🏡' },
                        { type: 'working_saturday', label: 'Working Sat (2nd/4th Sat)', color: '#15803D', icon: '💼' },
                        { type: 'employee_leave', label: 'Employee Leave', color: '#16A34A', icon: '✈️' },
                    ].map(item => (
                        <div key={item.type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{
                                width: 10,
                                height: 10,
                                borderRadius: 2,
                                background: item.color,
                                flexShrink: 0,
                            }} />
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: item.type === 'government' ? 700 : 500 }}>
                                {item.icon ? `${item.icon} ` : ''}{item.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ══════════════════════════════════════════════
            Leave-on-Date Modal
        ══════════════════════════════════════════════ */}
            {modal && (
                <div
                    onClick={() => setModal(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        backdropFilter: 'blur(3px)',
                        animation: 'fadeIn 0.15s ease',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#fff',
                            borderRadius: 16,
                            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                            width: 'calc(100% - 32px)',
                            maxWidth: 520,
                            maxHeight: '80vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            animation: 'slideUp 0.2s ease',
                        }}
                    >
                        {/* Modal Header */}
                        <div style={{
                            padding: '20px 24px 16px',
                            borderBottom: '1px solid #F0F0F0',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12,
                        }}>
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: 'linear-gradient(135deg, #1A73E8, #0D47A1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <CalendarDays size={20} color="#fff" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 17, fontWeight: 700, color: '#1A1A2E' }}>
                                    Employees on Leave
                                </div>
                                <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                                    {modalDateLabel}
                                </div>
                            </div>
                            <button
                                onClick={() => setModal(null)}
                                style={{
                                    border: 'none',
                                    background: '#F3F4F6',
                                    borderRadius: '50%',
                                    width: 32,
                                    height: 32,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: '#6B7280',
                                    flexShrink: 0,
                                    transition: 'background 0.15s',
                                }}
                                onMouseOver={e => e.currentTarget.style.background = '#E5E7EB'}
                                onMouseOut={e => e.currentTarget.style.background = '#F3F4F6'}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 24px 24px' }}>
                            {leaveLoading ? (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>
                                    <div style={{
                                        width: 32, height: 32, border: '3px solid #E5E7EB',
                                        borderTopColor: '#1A73E8', borderRadius: '50%',
                                        animation: 'spin 0.7s linear infinite',
                                        margin: '0 auto 12px',
                                    }} />
                                    Loading…
                                </div>
                            ) : dayLeaves.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '48px 0', color: '#9CA3AF' }}>
                                    <Users size={48} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                                    <div style={{ fontSize: 15, fontWeight: 600, color: '#6B7280' }}>No approved leaves</div>
                                    <div style={{ fontSize: 13, marginTop: 4 }}>Everyone is at work on this day!</div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                                    {/* Count pill */}
                                    <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600, marginBottom: 2 }}>
                                        {dayLeaves.length} employee{dayLeaves.length !== 1 ? 's' : ''} on leave
                                    </div>

                                    {dayLeaves.map((leave, i) => {
                                        const name = leave.employee_name || leave.employee?.name || 'Unknown';
                                        const days = leave.number_of_days || leave.numberOfDays || '?';
                                        const start = fmt(leave.start_date || leave.startDate);
                                        const end = fmt(leave.end_date || leave.endDate);
                                        const isHalf = leave.is_half_day == 1;

                                        return (
                                            <div key={i} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                padding: '12px 14px',
                                                borderRadius: 10,
                                                border: '1px solid #F0F0F0',
                                                background: '#FAFAFA',
                                                transition: 'box-shadow 0.15s',
                                            }}
                                                onMouseOver={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)'}
                                                onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}
                                            >
                                                {/* Avatar */}
                                                <div style={{
                                                    width: 38,
                                                    height: 38,
                                                    borderRadius: '50%',
                                                    background: avatarColor(name),
                                                    color: '#fff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 13,
                                                    fontWeight: 700,
                                                    flexShrink: 0,
                                                }}>
                                                    {initials(name)}
                                                </div>

                                                {/* Info */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1A1A2E', marginBottom: 3 }}>
                                                        {name}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: '#6B7280' }}>
                                                        {start} → {end}
                                                    </div>
                                                </div>

                                                {/* Badge + days */}
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                                                    {leaveBadge(leave)}
                                                    <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>
                                                        {isHalf ? '0.5 day' : `${days} day${days != 1 ? 's' : ''}`}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer with Apply Leave option */}
                        {(role === 'employee' || role === 'hr') && (
                            <div style={{
                                padding: '14px 24px',
                                borderTop: '1px solid #F0F0F0',
                                background: '#FAFAFA',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: 12,
                            }}>
                                <button
                                    onClick={() => setModal(null)}
                                    style={{
                                        padding: '7px 16px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        border: '1px solid #DADCE0',
                                        borderRadius: 6,
                                        background: '#fff',
                                        color: '#3C4043',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        setModal(null);
                                        navigate(leavePath, { state: { startDate: modal.dateStr } });
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '7px 16px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        border: 'none',
                                        borderRadius: 6,
                                        background: 'linear-gradient(135deg, #1A73E8, #0D47A1)',
                                        color: '#fff',
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 6px rgba(26,115,232,0.3)',
                                    }}
                                >
                                    Apply Leave for this Date
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── keyframe animations ── */}
            <style>{`
            @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
            @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
            @keyframes spin    { to { transform: rotate(360deg) } }
        `}</style>
        </>
    );
}
