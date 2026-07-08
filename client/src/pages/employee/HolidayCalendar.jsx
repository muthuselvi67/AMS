import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { Calendar, CalendarDays, Info } from 'lucide-react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const typeColors = {
    government: '#3B82F6',
};

const formatType = (type) => {
    if (!type) return '';
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const HolidayCalendar = () => {
    const [holidays, setHolidays] = useState([]);
    const today = new Date();
    const currentYear = today.getFullYear();

    useEffect(() => {
        api.get('/holidays', { params: { year: currentYear } })
            .then(({ data }) => setHolidays(data.data || []))
            .catch(err => console.error(err));
    }, [currentYear]);

    // Parse today date string safely without timezones
    const todayStr = today.toISOString().split('T')[0];
    const upcomingHolidays = holidays
        .filter(h => h.date >= todayStr)
        .slice(0, 6);

    return (
        <div className="fade-in">
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <h1>Holiday Calendar</h1>
                <p>View upcoming and official company holidays</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', alignItems: 'start', boxSizing: 'border-box', paddingRight: '20px' }}>
                {/* 1. Upcoming Holidays List Card */}
                <div className="card" style={{ borderRadius: '12px', padding: '24px' }}>
                    <div className="card-title" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CalendarDays size={18} color="var(--primary)" />
                        Upcoming Holidays
                    </div>
                    {upcomingHolidays.length === 0 ? (
                        <div className="empty-state" style={{ padding: 32 }}>
                            <div className="empty-state-icon" style={{ color: 'var(--text-muted)' }}><Calendar size={48} /></div>
                            <h3>No upcoming holidays</h3>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {upcomingHolidays.map(h => {
                                const d = new Date(h.date);
                                const daysLeft = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
                                return (
                                    <div key={h.id} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                                        <div style={{ minWidth: 48, textAlign: 'center', background: `${typeColors[h.type] || '#3B82F6'}15`, borderRadius: 'var(--radius-sm)', padding: '8px 4px', flexShrink: 0 }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: typeColors[h.type] || '#3B82F6', textTransform: 'uppercase' }}>{MONTHS[d.getMonth()].slice(0, 3)}</div>
                                            <div style={{ fontSize: 20, fontWeight: 800, color: typeColors[h.type] || '#3B82F6', lineHeight: 1 }}>{d.getDate()}</div>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatType(h.type)} holiday · {DAYS[d.getDay()]}</div>
                                        </div>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: daysLeft <= 7 ? 'var(--danger)' : 'var(--text-muted)', flexShrink: 0 }}>
                                            {daysLeft === 0 ? ' Today' : daysLeft === 1 ? ' Tomorrow' : `${daysLeft}d away`}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* 2. All Holidays List Card */}
                <div className="card" style={{ borderRadius: '12px', padding: '24px' }}>
                    <div className="card-title" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Info size={18} color="var(--primary)" />
                        All Holidays in {currentYear} ({holidays.length})
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, maxHeight: '320px', overflowY: 'auto', paddingRight: '12px' }}>
                        {holidays.map(h => {
                            const d = new Date(h.date);
                            return (
                                <div key={h.id} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', alignItems: 'center', background: 'var(--bg-white)' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{h.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', weekday: 'short' })}</div>
                                    </div>
                                    <span className="badge" style={{ background: `${typeColors[h.type] || '#3B82F6'}15`, color: typeColors[h.type] || '#3B82F6', fontWeight: 600 }}>{formatType(h.type)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HolidayCalendar;
