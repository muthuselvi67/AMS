import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { ChevronLeft, ChevronRight, Calendar, Plus, CalendarDays, ExternalLink, Info } from 'lucide-react';
import Modal from '../../components/ui/Modal';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const typeColors = {
    national: '#EF4444',
    regional: '#F59E0B',
    company: '#7C3AED',
    optional: '#9B7CFD',
    government: '#3B82F6',
    bank: '#10B981',
    working_saturday: '#475569',
    floating_leave: '#EC4899',
    birthday: '#F43F5E'
};

const formatType = (type) => {
    if (!type) return '';
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const HolidayCalendar = () => {
    const navigate = useNavigate();
    const [holidays, setHolidays] = useState([]);
    const today = new Date();
    const [current, setCurrent] = useState({ month: today.getMonth(), year: today.getFullYear() });

    // Checkboxes filter state
    const [selectedTypes, setSelectedTypes] = useState({
        national: true,
        regional: true,
        company: true,
        optional: true,
        government: true,
        bank: true,
        working_saturday: true,
        floating_leave: true,
        birthday: true
    });

    const [selectedHoliday, setSelectedHoliday] = useState(null);

    useEffect(() => {
        api.get('/holidays', { params: { year: current.year } })
            .then(({ data }) => setHolidays(data.data || []))
            .catch(err => console.error(err));
    }, [current.year]);

    const prevMonth = () => setCurrent(c => c.month === 0 ? { month: 11, year: c.year - 1 } : { month: c.month - 1, year: c.year });
    const nextMonth = () => setCurrent(c => c.month === 11 ? { month: 0, year: c.year + 1 } : { month: c.month + 1, year: c.year });

    const firstDay = new Date(current.year, current.month, 1).getDay();
    const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();
    const daysInPrev = new Date(current.year, current.month, 0).getDate();

    // Fetch active employees to extract birthdays
    const [employees, setEmployees] = useState([]);

    useEffect(() => {
        api.get('/users')
            .then(({ data }) => setEmployees(data.data || []))
            .catch(err => console.error(err));
    }, []);

    // Filter holidays
    const filteredHolidays = holidays.filter(h => selectedTypes[h.type]);

    // Parse birthday events for the current year
    const birthdayEvents = employees
        .filter(emp => emp.isActive && emp.dateOfBirth)
        .map(emp => {
            const parts = emp.dateOfBirth.split('-');
            if (parts.length < 3) return null;
            const month = parseInt(parts[1], 10) - 1; // 0-indexed month
            const day = parseInt(parts[2], 10);
            const eventDate = new Date(current.year, month, day);
            return {
                id: `bday-${emp.id}`,
                name: `${emp.name}'s Birthday 🎂`,
                date: eventDate,
                type: 'birthday',
                description: `Wish ${emp.name} a very Happy Birthday! 🎉🎂`,
                raw: {
                    name: `${emp.name}'s Birthday 🎂`,
                    type: 'birthday',
                    date: eventDate,
                    description: `Wish ${emp.name} a very Happy Birthday! 🎉`
                }
            };
        })
        .filter(Boolean);

    // Merge holiday events and birthday events
    const holidayDates = filteredHolidays
        .filter(h => new Date(h.date).getMonth() === current.month && new Date(h.date).getFullYear() === current.year)
        .map(h => ({ day: new Date(h.date).getDate(), name: h.name, type: h.type, raw: h }));

    const birthdayDates = selectedTypes.birthday
        ? birthdayEvents
            .filter(b => b.date.getMonth() === current.month)
            .map(b => ({ day: b.date.getDate(), name: b.name, type: b.type, raw: b.raw }))
        : [];

    const allEvents = [...holidayDates, ...birthdayDates];

    const upcomingHolidays = holidays.filter(h => new Date(h.date) >= today).slice(0, 6);

    const cells = [];
    // Prev month days
    for (let i = firstDay - 1; i >= 0; i--) {
        cells.push({ day: daysInPrev - i, current: false, prev: true });
    }
    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
        const dayEvents = allEvents.filter(e => e.day === d);
        const isToday = today.getDate() === d && today.getMonth() === current.month && today.getFullYear() === current.year;
        cells.push({ day: d, current: true, isToday, events: dayEvents });
    }
    // Next month fill
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
        cells.push({ day: d, current: false, next: true });
    }

    // Mini Calendar Component Helper
    const renderMiniCalendar = () => {
        const miniCells = [];
        for (let i = firstDay - 1; i >= 0; i--) miniCells.push({ day: daysInPrev - i, current: false });
        for (let d = 1; d <= daysInMonth; d++) {
            const isToday = today.getDate() === d && today.getMonth() === current.month && today.getFullYear() === current.year;
            miniCells.push({ day: d, current: true, isToday });
        }
        const miniRemaining = 42 - miniCells.length;
        for (let d = 1; d <= miniRemaining; d++) miniCells.push({ day: d, current: false });

        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginTop: '10px' }}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                    <div key={idx} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', paddingBottom: '4px' }}>{d}</div>
                ))}
                {miniCells.map((cell, idx) => (
                    <div key={idx} style={{
                        textAlign: 'center',
                        fontSize: '11px',
                        padding: '4px 0',
                        borderRadius: '50%',
                        fontWeight: cell.isToday ? 700 : 500,
                        background: cell.isToday ? '#1A73E8' : 'transparent',
                        color: cell.isToday ? 'white' : cell.current ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}>
                        {cell.day}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="fade-in">
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <h1>Holiday Calendar</h1>
                <p>View official holidays and events in a Google Calendar layout</p>
            </div>

            <div style={{ display: 'flex', gap: '24px', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'start' }}>

                {/* Left Sidebar */}
                <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '20px', flexShrink: 0 }}>

                    {/* Create Request button - Google style */}
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/employee/apply-leave')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 24px',
                            borderRadius: '24px',
                            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.3), 0 4px 8px 3px rgba(0,0,0,0.15)',
                            background: 'var(--bg-white)',
                            color: 'var(--text-primary)',
                            border: 'none',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'box-shadow 0.15s, background-color 0.15s',
                            width: 'fit-content'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.boxShadow = '0 4px 6px 0 rgba(0,0,0,0.3), 0 8px 12px 6px rgba(0,0,0,0.15)';
                            e.currentTarget.style.backgroundColor = 'var(--bg-light)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0,0,0,0.3), 0 4px 8px 3px rgba(0,0,0,0.15)';
                            e.currentTarget.style.backgroundColor = 'var(--bg-white)';
                        }}
                    >
                        <Plus size={20} color="#1A73E8" style={{ strokeWidth: 3 }} />
                        Create Request
                    </button>

                    {/* Mini Calendar Card */}
                    <div className="card" style={{ padding: '16px', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {MONTHS[current.month]} {current.year}
                            </span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button className="btn btn-ghost btn-sm" onClick={prevMonth} style={{ padding: '2px', height: '22px', width: '22px' }}><ChevronLeft size={14} /></button>
                                <button className="btn btn-ghost btn-sm" onClick={nextMonth} style={{ padding: '2px', height: '22px', width: '22px' }}><ChevronRight size={14} /></button>
                            </div>
                        </div>
                        {renderMiniCalendar()}
                    </div>

                    {/* Filter Checkboxes Card */}
                    <div className="card" style={{ padding: '16px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>
                            My Calendars
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {Object.keys(typeColors).map(type => {
                                const checked = selectedTypes[type];
                                const color = typeColors[type];
                                return (
                                    <label key={type} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', userSelect: 'none' }}>
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => setSelectedTypes(prev => ({ ...prev, [type]: !prev[type] }))}
                                            style={{
                                                accentColor: color,
                                                width: '16px',
                                                height: '16px',
                                                cursor: 'pointer'
                                            }}
                                        />
                                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                                        {formatType(type)}
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Calendar Area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', minWidth: '400px' }}>

                    {/* Main Calendar Card - Google month view style */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--border-light)' }}>

                        {/* Nav header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-white)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setCurrent({ month: today.getMonth(), year: today.getFullYear() })}
                                    style={{
                                        border: '1px solid var(--border)',
                                        background: 'var(--bg-white)',
                                        fontWeight: 600,
                                        color: 'var(--text-primary)',
                                        borderRadius: '4px',
                                        padding: '6px 12px',
                                        fontSize: '13px'
                                    }}
                                >
                                    Today
                                </button>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={prevMonth} style={{ borderRadius: '50%', width: '32px', height: '32px' }}><ChevronLeft size={16} /></button>
                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={nextMonth} style={{ borderRadius: '50%', width: '32px', height: '32px' }}><ChevronRight size={16} /></button>
                                </div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                                    {MONTHS[current.month]} {current.year}
                                </h2>
                            </div>
                            <div>
                                <span style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 600, borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-light)', color: 'var(--text-secondary)' }}>Month</span>
                            </div>
                        </div>

                        {/* Day headers */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-light)' }}>
                            {DAYS.map(d => (
                                <div key={d} style={{
                                    textAlign: 'center',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    color: d === 'Sun' ? '#EF4444' : 'var(--text-muted)',
                                    padding: '10px 4px',
                                    borderRight: d !== 'Sat' ? '1px solid var(--border-light)' : 'none'
                                }}>
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Grid cells */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(110px, 1fr)', background: 'var(--border-light)', gap: '1px' }}>
                            {cells.map((cell, idx) => {
                                const isToday = cell.isToday;
                                const isCurrentMonth = cell.current;

                                return (
                                    <div key={idx}
                                        style={{
                                            background: isCurrentMonth ? 'var(--bg-white)' : 'var(--bg-light)',
                                            padding: '6px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            minHeight: '110px',
                                            position: 'relative'
                                        }}
                                    >
                                        {/* Cell Date Number */}
                                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                                            <div style={isToday ? {
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                background: '#1A73E8',
                                                color: 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '12px',
                                                fontWeight: '700'
                                            } : {
                                                color: isCurrentMonth ? 'var(--text-primary)' : 'var(--text-muted)',
                                                fontSize: '12px',
                                                fontWeight: '500'
                                            }}>
                                                {cell.day}
                                            </div>
                                        </div>

                                        {/* Cell Events list */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
                                            {cell.events && cell.events.map((evt, eIdx) => (
                                                <div
                                                    key={eIdx}
                                                    onClick={() => setSelectedHoliday(evt)}
                                                    title={evt.name}
                                                    style={{
                                                        background: evt.type === 'working_saturday' ? '#E2E8F0' : typeColors[evt.type] || '#EF4444',
                                                        color: evt.type === 'working_saturday' ? '#334155' : 'white',
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '11px',
                                                        fontWeight: '600',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                        transition: 'opacity 0.15s'
                                                    }}
                                                    onMouseOver={(e) => { e.currentTarget.style.opacity = 0.85; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.opacity = 1; }}
                                                >
                                                    {evt.name}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Bottom layout containing lists */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>

                        {/* Upcoming Holidays List Card */}
                        <div className="card" style={{ borderRadius: '12px' }}>
                            <div className="card-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CalendarDays size={18} color="var(--primary)" />
                                Upcoming Holidays
                            </div>
                            {upcomingHolidays.length === 0 ? (
                                <div className="empty-state" style={{ padding: 32 }}>
                                    <div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><Calendar size={48} /></div>
                                    <h3>No upcoming holidays</h3>
                                </div>
                            ) : (
                                upcomingHolidays.map(h => {
                                    const d = new Date(h.date);
                                    const daysLeft = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
                                    return (
                                        <div key={h.id} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                                            <div style={{ minWidth: 48, textAlign: 'center', background: `${typeColors[h.type]}15`, borderRadius: 'var(--radius-sm)', padding: '8px 4px' }}>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: typeColors[h.type], textTransform: 'uppercase' }}>{MONTHS[d.getMonth()].slice(0, 3)}</div>
                                                <div style={{ fontSize: 20, fontWeight: 800, color: typeColors[h.type], lineHeight: 1 }}>{d.getDate()}</div>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>{h.name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatType(h.type)} holiday · {DAYS[d.getDay()]}</div>
                                            </div>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: daysLeft <= 7 ? 'var(--danger)' : 'var(--text-muted)' }}>
                                                {daysLeft === 0 ? ' Today' : daysLeft === 1 ? ' Tomorrow' : `${daysLeft}d away`}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* All Holidays List Card */}
                        <div className="card" style={{ borderRadius: '12px' }}>
                            <div className="card-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Info size={18} color="var(--primary)" />
                                All Holidays in {current.year} ({holidays.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                                {holidays.map(h => {
                                    const d = new Date(h.date);
                                    return (
                                        <div key={h.id} style={{ display: 'flex', gap: 12, padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', alignItems: 'center', background: 'var(--bg-white)' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{h.name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', weekday: 'short' })}</div>
                                            </div>
                                            <span className="badge" style={{ background: `${typeColors[h.type]}15`, color: typeColors[h.type], fontWeight: 600 }}>{formatType(h.type)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                </div>

            </div>

            {/* Google Calendar style Detail Modal */}
            <Modal
                isOpen={!!selectedHoliday}
                onClose={() => setSelectedHoliday(null)}
                title={selectedHoliday?.type === 'birthday' ? "Birthday Celebration 🎉" : "Holiday Details"}
                size="sm"
            >
                {selectedHoliday && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {selectedHoliday.name}
                            </h4>
                            <span className="badge" style={{
                                background: `${typeColors[selectedHoliday.type]}15`,
                                color: typeColors[selectedHoliday.type],
                                fontWeight: 600
                            }}>
                                {formatType(selectedHoliday.type)}
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Date:</span>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {new Date(selectedHoliday.raw ? selectedHoliday.raw.date : selectedHoliday.date || new Date()).toLocaleDateString('en-IN', {
                                        weekday: 'long',
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric'
                                    })}
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', marginTop: '8px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Description:</span>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                    {selectedHoliday.raw?.description || selectedHoliday.description || 'No description provided.'}
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                            <button className="btn btn-secondary" onClick={() => setSelectedHoliday(null)}>Close</button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default HolidayCalendar;
